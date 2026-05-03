import json
import boto3
import joblib
from datetime import datetime
from decimal import Decimal
import io
import traceback
import os

s3 = boto3.client("s3")
dynamodb = boto3.resource("dynamodb")

UPLOADS_BUCKET = os.environ.get("UPLOADS_BUCKET", "honey-pot-uploads1")
MODELS_BUCKET = os.environ.get("MODELS_BUCKET", "honey-pot-models1")
PREDICTIONS_TABLE = os.environ.get("PREDICTIONS_TABLE", "attack-detection-predictions")

MODEL_CACHE = {}

def lambda_handler(event, context):
    print("========== LAMBDA START ==========")
    print("RAW EVENT:", json.dumps(event, default=str))

    try:
        # Parse body from API Gateway or direct invocation
        body = {}
        
        # Handle string input
        if isinstance(event, str):
            body = json.loads(event)
        # Handle API Gateway format
        elif isinstance(event, dict):
            if "body" in event and event["body"]:
                body_content = event["body"]
                if isinstance(body_content, str):
                    try:
                        body = json.loads(body_content)
                    except json.JSONDecodeError:
                        body = body_content
                else:
                    body = body_content
            else:
                # Direct dict without body wrapper
                body = event
        
        # Ensure body is a dict
        if not isinstance(body, dict):
            body = {}
        
        print("PARSED BODY:", json.dumps(body, default=str))
        operation = body.get("operation")
        print(f"OPERATION: {operation} (type: {type(operation).__name__})")

        if operation == "get_metrics":
            model_name = body.get("model_name")
            time_range = body.get("time_range", "all")  # 'all', 'today', 'week'
            
            metrics = get_metrics_from_db(model_name=model_name, time_range=time_range)
            
            return response(200, {
                "status": "success",
                "metrics": metrics
            })

        elif operation == "store_predictions_batch":
            predictions = body.get("predictions", [])
            model_name = body.get("model_name", "unknown")
            upload_id = body.get("uploadId", f"api_{datetime.utcnow().isoformat()}")

            # Validate predictions structure
            if not isinstance(predictions, list) or len(predictions) == 0:
                return response(400, {
                    "status": "error",
                    "error": "predictions must be a non-empty list"
                })

            # Validate each prediction has required fields
            for pred in predictions:
                if not isinstance(pred, dict):
                    return response(400, {
                        "status": "error",
                        "error": "each prediction must be a dictionary"
                    })
                required_fields = ["actual_label", "predicted_label", "confidence"]
                for field in required_fields:
                    if field not in pred:
                        return response(400, {
                            "status": "error",
                            "error": f"missing required field: {field}"
                        })

            normalized_predictions = []
            for idx, pred in enumerate(predictions):
                normalized_predictions.append({
                    "row": idx,
                    "actual_label": pred.get("actual_label"),
                    "predicted_label": pred.get("predicted_label"),
                    "confidence": pred.get("confidence", 0)
                })

            stored, skipped = store_predictions_to_db(
                predictions=normalized_predictions,
                model_name=model_name,
                upload_id=upload_id
            )

            return response(200, {
                "status": "success",
                "message": "Batch predictions stored successfully",
                "stored": stored,
                "skipped": skipped
            })

        return response(400, {
            "status": "error",
            "error": f"Unsupported operation: {operation}"
        })

    except json.JSONDecodeError as e:
        print("JSON parsing error:", str(e))
        return response(400, {
            "status": "error",
            "error": f"Invalid JSON: {str(e)}"
        })
    except Exception as e:
        print("Lambda error:", str(e))
        traceback.print_exc()
        return response(500, {
            "status": "error",
            "error": str(e)
        })


def response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "OPTIONS,POST"
        },
        "body": json.dumps(body)
    }

def load_model(model_name):
    if model_name not in MODEL_CACHE:
        print(f"Loading model from S3: {model_name}.pkl")

        response = s3.get_object(
            Bucket=MODELS_BUCKET,
            Key=f"{model_name}.pkl"
        )

        model_data = response["Body"].read()
        MODEL_CACHE[model_name] = joblib.load(io.BytesIO(model_data))

        print(f"Model loaded successfully: {model_name}")

    return MODEL_CACHE[model_name]


def encode_value(value):
    if value is None or value == "":
        return 0.0

    value = str(value).strip().lower()

    categorical_map = {
        "tcp": 1.0,
        "udp": 2.0,
        "icmp": 3.0
    }

    if value in categorical_map:
        return categorical_map[value]

    try:
        return float(value)
    except ValueError:
        return 0.0


def run_predictions(rows, model_obj):
    predictions = []

    if not rows:
        return predictions

    label_cols = ["label", "actual_label", "actual", "true_label", "target"]
    all_cols = list(rows[0].keys())
    feature_cols = [col for col in all_cols if col not in label_cols]

    print("Feature columns:", feature_cols)

    for idx, row in enumerate(rows):
        try:
            features = [encode_value(row.get(col)) for col in feature_cols]

            pred = model_obj.predict([features])[0]
            prediction_label = "Attack" if int(pred) == 1 else "Normal"

            confidence = 0.5

            if hasattr(model_obj, "predict_proba"):
                proba = model_obj.predict_proba([features])[0]
                confidence = float(max(proba))

            actual_label = None

            for col in label_cols:
                if col in row:
                    actual_label = str(row[col])
                    break

            predictions.append({
                "row": idx,
                "actual_label": actual_label,
                "predicted_label": prediction_label,
                "confidence": confidence
            })

        except Exception as e:
            print(f"Error processing row {idx}:", str(e))
            continue

    return predictions


def normalize_actual_label(actual_label):
    if actual_label is None:
        return None

    label = str(actual_label).strip().lower()

    if label in ["attack", "1"]:
        return "Attack"

    if label in ["normal", "0"]:
        return "Normal"

    if "attack" in label or "anom" in label:
        return "Attack"

    return None


def get_metrics_from_db(model_name=None, time_range="all"):
    """Query DynamoDB and calculate metrics from predictions"""
    try:
        table = dynamodb.Table(PREDICTIONS_TABLE)
        
        # Scan all predictions (in production, use GSI with proper filtering)
        response = table.scan()
        predictions = response.get('Items', [])
        
        # Filter by model if specified
        if model_name:
            predictions = [p for p in predictions if p.get('model_name') == model_name]
        
        # Filter by time range if needed
        if time_range in ["today", "week"]:
            from datetime import timedelta
            now = datetime.utcnow()
            if time_range == "today":
                cutoff = now.replace(hour=0, minute=0, second=0, microsecond=0)
            else:  # week
                cutoff = now - timedelta(days=7)
            
            predictions = [p for p in predictions if datetime.fromisoformat(p.get('timestamp', '')) >= cutoff]
        
        if not predictions:
            return {
                "total_predictions": 0,
                "accuracy": 0,
                "precision": 0,
                "recall": 0,
                "f1_score": 0,
                "true_positives": 0,
                "true_negatives": 0,
                "false_positives": 0,
                "false_negatives": 0,
                "total_attacks": 0,
                "total_normal": 0
            }
        
        # Calculate metrics
        total = len(predictions)
        correct = sum(1 for p in predictions if p.get('is_correct', False))
        
        # Confusion matrix
        tp = sum(1 for p in predictions if p.get('predicted_label') == 'Attack' and p.get('actual_label') == 'Attack')
        tn = sum(1 for p in predictions if p.get('predicted_label') == 'Normal' and p.get('actual_label') == 'Normal')
        fp = sum(1 for p in predictions if p.get('predicted_label') == 'Attack' and p.get('actual_label') == 'Normal')
        fn = sum(1 for p in predictions if p.get('predicted_label') == 'Normal' and p.get('actual_label') == 'Attack')
        
        accuracy = correct / total if total > 0 else 0
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0
        f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0
        
        total_attacks = sum(1 for p in predictions if p.get('actual_label') == 'Attack')
        total_normal = sum(1 for p in predictions if p.get('actual_label') == 'Normal')
        
        return {
            "total_predictions": total,
            "accuracy": round(float(accuracy), 4),
            "precision": round(float(precision), 4),
            "recall": round(float(recall), 4),
            "f1_score": round(float(f1), 4),
            "true_positives": tp,
            "true_negatives": tn,
            "false_positives": fp,
            "false_negatives": fn,
            "total_attacks": total_attacks,
            "total_normal": total_normal
        }
    
    except Exception as e:
        print("Error calculating metrics:", str(e))
        traceback.print_exc()
        raise


def store_predictions_to_db(predictions, model_name, upload_id=""):
    try:
        table = dynamodb.Table(PREDICTIONS_TABLE)

        stored_count = 0
        skipped_count = 0

        with table.batch_writer() as batch:
            for pred in predictions:
                actual_label = normalize_actual_label(pred.get("actual_label"))
                predicted_label = pred.get("predicted_label")
                
                # Convert confidence to float and ensure it's valid
                try:
                    confidence = float(pred.get("confidence", 0) or 0)
                except (ValueError, TypeError):
                    confidence = 0.0

                if not actual_label:
                    skipped_count += 1
                    continue

                if predicted_label not in ["Attack", "Normal"]:
                    skipped_count += 1
                    continue

                row_number = pred.get("row", skipped_count + stored_count)
                now = datetime.utcnow().isoformat()

                item = {
                    "timestamp": now,
                    "prediction_id": f"batch_{upload_id}_{row_number}",
                    "model_name": model_name,
                    "actual_label": actual_label,
                    "predicted_label": predicted_label,
                    "confidence": Decimal(str(round(confidence, 4))),
                    "is_correct": actual_label == predicted_label,
                    "uploadId": upload_id
                }

                batch.put_item(Item=item)
                stored_count += 1

        print(f"Stored {stored_count} predictions, skipped {skipped_count}")
        return stored_count, skipped_count

    except Exception as e:
        print("Error storing predictions:", str(e))
        traceback.print_exc()
        raise
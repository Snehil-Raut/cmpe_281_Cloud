"""
Lambda function to process batch prediction requests from SQS queue.
- Takes messages from SQS with upload_id and S3 CSV key
- Downloads CSV from S3
- Runs batch predictions using models from S3
- Stores results to DynamoDB with upload_id
"""

import boto3
import json
import pandas as pd
import numpy as np
import joblib
import io
from decimal import Decimal
from datetime import datetime

# AWS clients
s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
cloudwatch = boto3.client('cloudwatch')

# Configuration
MODELS_BUCKET = 'honey-pot-models1'
UPLOADS_BUCKET = 'honey-pot-uploads1'
PREDICTIONS_TABLE = 'attack-detection-predictions'
UPLOAD_HISTORY_TABLE = 'upload-history'

# Model cache
model_cache = {}


def load_model(model_name):
    """Download and cache ML model from S3"""
    if model_name in model_cache:
        return model_cache[model_name]
    
    try:
        response = s3.get_object(Bucket=MODELS_BUCKET, Key=f'{model_name}.pkl')
        model_data = response['Body'].read()
        model = joblib.load(io.BytesIO(model_data))
        model_cache[model_name] = model
        print(f"Model {model_name} loaded successfully")
        return model
    except Exception as e:
        print(f"Error loading model {model_name}: {e}")
        return None


def preprocess_features(df):
    """Preprocess dataframe for prediction"""
    # Convert numeric columns
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    for col in df.columns:
        if col not in ['protocol_type', 'service', 'flag']:
            df[col] = pd.to_numeric(df[col], errors='coerce')
    
    # Fill NaN with 0
    df = df.fillna(0)
    
    # Handle categorical columns - one-hot encoding
    categorical_cols = ['protocol_type', 'service', 'flag']
    existing_categorical = [col for col in categorical_cols if col in df.columns]
    if existing_categorical:
        df = pd.get_dummies(df, columns=existing_categorical, drop_first=False)
    
    return df


def store_predictions_to_db(predictions, model_name, upload_id=''):
    """
    Batch store predictions to DynamoDB.
    predictions: list of dicts with 'row_number', 'prediction', 'confidence', 'is_correct'
    """
    table = dynamodb.Table(PREDICTIONS_TABLE)
    
    try:
        with table.batch_writer(batch_size=25) as batch:
            for pred in predictions:
                item = {
                    'upload_id': upload_id,
                    'row_number': str(pred['row_number']),  # Sort key
                    'model_name': model_name,
                    'predicted_label': pred['prediction'],
                    'confidence': Decimal(str(round(float(pred['confidence']), 4))),
                    'timestamp': datetime.utcnow().isoformat(),
                    'is_correct': pred.get('is_correct', 'Unknown')
                }
                
                # Add actual label if available
                if 'actual_label' in pred:
                    item['actual_label'] = str(pred['actual_label'])
                
                batch.put_item(Item=item)
        
        print(f"Stored {len(predictions)} predictions to DynamoDB for upload_id: {upload_id}")
        return True
    except Exception as e:
        print(f"Error storing predictions to DynamoDB: {e}")
        return False


def update_upload_status(upload_id, status, message=''):
    """Update upload status in DynamoDB"""
    table = dynamodb.Table(UPLOAD_HISTORY_TABLE)
    
    try:
        table.update_item(
            Key={'upload_id': upload_id},
            UpdateExpression='SET #status = :status, updated_at = :timestamp',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': status,
                ':timestamp': datetime.utcnow().isoformat()
            }
        )
        print(f"Updated upload {upload_id} status to {status}")
    except Exception as e:
        print(f"Error updating upload status: {e}")


def lambda_handler(event, context):
    """
    Handle SQS batch prediction requests.
    Expected SQS message format:
    {
        'upload_id': 'unique-upload-id',
        'filename': 'original-filename.csv',
        's3_key': 'upload_id/filename.csv',
        'model_name': 'random_forest',
        'row_count': 1000,
        'timestamp': 'iso-timestamp'
    }
    """
    print(f"Received event: {json.dumps(event)}")
    
    results = {
        'successful': 0,
        'failed': 0,
        'errors': []
    }
    
    # Process each SQS message
    for record in event.get('Records', []):
        try:
            # Parse SQS message
            message_body = json.loads(record['body'])
            upload_id = message_body.get('upload_id')
            filename = message_body.get('filename')
            s3_key = message_body.get('s3_key')
            model_name = message_body.get('model_name', 'random_forest')
            
            print(f"Processing upload_id: {upload_id}, file: {filename}, model: {model_name}")
            
            # Download CSV from S3
            response = s3.get_object(Bucket=UPLOADS_BUCKET, Key=s3_key)
            csv_data = response['Body'].read().decode('utf-8')
            df = pd.read_csv(io.StringIO(csv_data))
            
            print(f"Downloaded CSV with {len(df)} rows")
            
            # Extract actual labels if present (for is_correct calculation)
            actual_labels = None
            for label_col in ['label', 'actual_label', 'actual', 'true_label', 'target']:
                if label_col in df.columns:
                    actual_labels = df[label_col].tolist()
                    df = df.drop(columns=[label_col])
                    break
            
            # Load model
            model = load_model(model_name)
            if model is None:
                raise Exception(f"Failed to load model: {model_name}")
            
            # Preprocess data
            df_processed = preprocess_features(df.copy())
            
            # Align columns with model expectations
            if hasattr(model, 'feature_names_in_'):
                feature_order = list(model.feature_names_in_)
                for col in feature_order:
                    if col not in df_processed.columns:
                        df_processed[col] = 0
                df_processed = df_processed.reindex(columns=feature_order, fill_value=0)
            
            # Make predictions
            predictions_labels = model.predict(df_processed.values)
            
            # Get confidence scores
            confidences = [0.5] * len(predictions_labels)
            if hasattr(model, 'predict_proba'):
                proba = model.predict_proba(df_processed.values)
                confidences = [float(max(row)) for row in proba]
            
            # Format predictions with is_correct flag
            predictions_to_store = []
            for idx, pred in enumerate(predictions_labels):
                pred_label = 'Attack' if pred == 1 else 'Normal'
                
                # Calculate is_correct if we have actual labels
                is_correct = 'Unknown'
                if actual_labels and idx < len(actual_labels):
                    actual = str(actual_labels[idx]).strip().lower()
                    # Normalize label comparison
                    if actual in ['0', 'normal', 'normal.', 'benign']:
                        actual_normalized = 'Normal'
                    elif actual in ['1', 'attack', 'anom', 'anomaly']:
                        actual_normalized = 'Attack'
                    else:
                        actual_normalized = actual
                    
                    is_correct = 'Correct' if pred_label == actual_normalized else 'Incorrect'
                
                predictions_to_store.append({
                    'row_number': idx,
                    'prediction': pred_label,
                    'confidence': confidences[idx],
                    'is_correct': is_correct,
                    'actual_label': str(actual_labels[idx]) if actual_labels and idx < len(actual_labels) else None
                })
            
            # Store predictions to DynamoDB
            if store_predictions_to_db(predictions_to_store, model_name, upload_id):
                results['successful'] += 1
                print(f"Successfully processed upload_id: {upload_id}")
                
                # Update status to complete
                update_upload_status(upload_id, 'complete')
            else:
                results['failed'] += 1
                error_msg = f"Failed to store predictions for upload_id: {upload_id}"
                results['errors'].append(error_msg)
                update_upload_status(upload_id, 'failed', error_msg)
        
        except Exception as e:
            results['failed'] += 1
            error_msg = f"Error processing SQS record: {str(e)}"
            results['errors'].append(error_msg)
            print(f"Error: {error_msg}")
            
            # Try to update status if we have upload_id
            try:
                if 'message_body' in locals():
                    upload_id = json.loads(record['body']).get('upload_id')
                    update_upload_status(upload_id, 'failed', error_msg)
            except:
                pass
    
    print(f"Lambda execution results: {results}")
    return {
        'statusCode': 200,
        'body': json.dumps(results)
    }
import json
import boto3
import pandas as pd
import joblib
from datetime import datetime
from decimal import Decimal
import io

s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')

UPLOADS_BUCKET = 'honey-pot-uploads1'
MODELS_BUCKET = 'honey-pot-models1'
PREDICTIONS_TABLE = 'attack-detection-predictions'
MODEL_CACHE = {}

def lambda_handler(event, context):
    """Process batch predictions from SQS queue"""
    try:
        print(f"Received SQS event: {json.dumps(event)}")
        
        # Process each SQS message
        for record in event.get('Records', []):
            try:
                # Parse SQS message
                body = json.loads(record['Body'])
                
                filename = body.get('filename')
                model = body.get('model', 'random_forest')
                bucket = body.get('bucket', UPLOADS_BUCKET)
                upload_id = body.get('uploadId', '')
                
                print(f"Processing: {filename} with model: {model}, uploadId: {upload_id}")
                
                # Download CSV from S3
                csv_content = s3.get_object(Bucket=bucket, Key=filename)['Body'].read().decode('utf-8')
                
                # Read CSV into DataFrame
                df = pd.read_csv(io.StringIO(csv_content))
                
                # Get model
                model_obj = load_model(model)
                
                # Run predictions
                predictions = []
                for idx, row in df.iterrows():
                    try:
                        # Extract features (all columns except label columns)
                        label_cols = ['label', 'actual_label', 'actual', 'true_label', 'target']
                        feature_cols = [col for col in df.columns if col not in label_cols]
                        features = row[feature_cols].values.reshape(1, -1)
                        
                        # Get prediction
                        pred = model_obj.predict(features)[0]
                        prediction_label = 'Attack' if pred == 1 else 'Normal'
                        
                        # Get confidence if available
                        confidence = 0.5
                        if hasattr(model_obj, 'predict_proba'):
                            proba = model_obj.predict_proba(features)[0]
                            confidence = max(proba)
                        
                        # Get actual label if available
                        actual_label = None
                        for col in label_cols:
                            if col in row.index:
                                actual_label = str(row[col])
                                break
                        
                        predictions.append({
                            'row': idx,
                            'actual_label': actual_label,
                            'predicted_label': prediction_label,
                            'confidence': confidence
                        })
                    except Exception as e:
                        print(f"Error processing row {idx}: {e}")
                        continue
                
                # Store all predictions to DynamoDB
                store_predictions_to_db(predictions, model, upload_id)
                
                print(f"Successfully processed {len(predictions)} predictions from {filename}")
                
            except Exception as e:
                print(f"Error processing record: {e}")
                import traceback
                traceback.print_exc()
                continue
        
        return {
            'statusCode': 200,
            'body': json.dumps({
                'message': 'Batch processing completed',
                'status': 'success'
            })
        }
        
    except Exception as e:
        print(f"Lambda error: {e}")
        import traceback
        traceback.print_exc()
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

def load_model(model_name):
    """Load model from S3 cache or download if not cached"""
    if model_name not in MODEL_CACHE:
        try:
            print(f"Downloading model: {model_name}")
            response = s3.get_object(Bucket=MODELS_BUCKET, Key=f'{model_name}.pkl')
            model_data = response['Body'].read()
            MODEL_CACHE[model_name] = joblib.load(io.BytesIO(model_data))
        except Exception as e:
            print(f"Error loading model {model_name}: {e}")
            raise
    
    return MODEL_CACHE[model_name]

def store_predictions_to_db(predictions, model_name, upload_id=''):
    """Store all predictions to DynamoDB in batch"""
    try:
        table = dynamodb.Table(PREDICTIONS_TABLE)
        
        stored_count = 0
        skipped_count = 0
        
        # Use batch writer for efficiency
        with table.batch_writer(batch_size=25) as batch:
            for pred in predictions:
                actual_label = pred.get('actual_label')
                predicted_label = pred.get('predicted_label')
                confidence = float(pred.get('confidence', 0))
                
                # Only store if we have both actual and predicted labels
                if not actual_label or actual_label == 'Unknown':
                    skipped_count += 1
                    continue
                
                # Normalize actual label
                actual_label_normalized = str(actual_label).strip().lower()
                if actual_label_normalized not in ['attack', 'normal']:
                    if 'attack' in actual_label_normalized or 'anom' in actual_label_normalized or actual_label_normalized == '1':
                        actual_label_normalized = 'Attack'
                    elif 'normal' in actual_label_normalized or actual_label_normalized == '0':
                        actual_label_normalized = 'Normal'
                    else:
                        skipped_count += 1
                        continue
                else:
                    actual_label_normalized = actual_label_normalized.capitalize()
                
                # Add to batch
                batch.put_item(
                    Item={
                        'timestamp': datetime.utcnow().isoformat(),
                        'prediction_id': f"batch_{datetime.utcnow().timestamp()}_{pred.get('row')}",
                        'model_name': model_name,
                        'actual_label': actual_label_normalized,
                        'predicted_label': predicted_label,
                        'confidence': Decimal(str(confidence)),
                        'is_correct': actual_label_normalized == predicted_label,
                        'uploadId': upload_id
                    }
                )
                stored_count += 1
        
        print(f"Stored {stored_count} predictions, skipped {skipped_count}")
        
    except Exception as e:
        print(f"Error storing predictions: {e}")
        raise

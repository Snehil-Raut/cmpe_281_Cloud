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
import joblib
import io
import os
import numpy as np
from decimal import Decimal
from datetime import datetime, timezone

# Configuration
MODELS_BUCKET = 'honey-pot-models1'
UPLOADS_BUCKET = 'honey-pot-uploads1'
PREDICTIONS_TABLE = 'attack-detection-predictions'
UPLOAD_HISTORY_TABLE = 'upload-history'

# Model cache
model_cache = {}

# Expected raw NSL-KDD schema including label and difficulty level.
RAW_COLUMNS_WITH_LABEL = [
    'duration', 'protocol_type', 'service', 'flag',
    'src_bytes', 'dst_bytes', 'land', 'wrong_fragment', 'urgent',
    'hot', 'num_failed_logins', 'logged_in', 'num_compromised',
    'root_shell', 'su_attempted', 'num_root', 'num_file_creations',
    'num_shells', 'num_access_files', 'num_outbound_cmds',
    'is_host_login', 'is_guest_login', 'count', 'srv_count',
    'serror_rate', 'srv_serror_rate', 'rerror_rate', 'srv_rerror_rate',
    'same_srv_rate', 'diff_srv_rate', 'srv_diff_host_rate',
    'dst_host_count', 'dst_host_srv_count', 'dst_host_same_srv_rate',
    'dst_host_diff_srv_rate', 'dst_host_same_src_port_rate',
    'dst_host_srv_diff_host_rate', 'dst_host_serror_rate',
    'dst_host_srv_serror_rate', 'dst_host_rerror_rate',
    'dst_host_srv_rerror_rate', 'label', 'difficulty_level'
]


def utc_now_iso():
    return datetime.now(timezone.utc).isoformat()


# AWS clients
s3 = boto3.client('s3')
dynamodb = boto3.resource('dynamodb')
cloudwatch = boto3.client('cloudwatch')


def load_model(model_name):
    """Download and cache ML model plus optional preprocessing artifacts from S3."""
    if model_name in model_cache:
        return model_cache[model_name]
    
    try:
        response = s3.get_object(Bucket=MODELS_BUCKET, Key=f'{model_name}.pkl')
        model_data = response['Body'].read()
        model = joblib.load(io.BytesIO(model_data))

        artifacts = {
            'model': model,
            'scaler': None,
            'feature_columns': None,
        }

        # Optional companion artifacts for models trained outside a pipeline.
        try:
            scaler_obj = s3.get_object(Bucket=MODELS_BUCKET, Key=f'{model_name}_scaler.pkl')
            artifacts['scaler'] = joblib.load(io.BytesIO(scaler_obj['Body'].read()))
        except Exception:
            pass

        try:
            feature_obj = s3.get_object(Bucket=MODELS_BUCKET, Key=f'{model_name}_features.json')
            feature_data = json.loads(feature_obj['Body'].read().decode('utf-8'))
            if isinstance(feature_data, list):
                artifacts['feature_columns'] = feature_data
        
        except Exception:
            pass

        model_cache[model_name] = artifacts
        return artifacts
    except Exception as e:
        return None


def preprocess_features(df):
    """Preprocess dataframe for prediction"""
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


def align_features_to_model(df_processed, model_artifacts):
    """Align feature frame to model expectations, including fallback for models without named features."""
    model = model_artifacts['model']
    feature_columns = model_artifacts.get('feature_columns')

    if feature_columns:
        return df_processed.reindex(columns=feature_columns, fill_value=0).copy()

    if hasattr(model, 'feature_names_in_'):
        feature_order = list(model.feature_names_in_)
        return df_processed.reindex(columns=feature_order, fill_value=0).copy()

    if hasattr(model, 'n_features_in_'):
        expected_count = int(model.n_features_in_)
        current_count = df_processed.shape[1]

        if current_count < expected_count:
            missing_count = expected_count - current_count
            for idx in range(missing_count):
                df_processed[f'__pad_feature_{idx}'] = 0
        elif current_count > expected_count:
            df_processed = df_processed.iloc[:, :expected_count].copy()

    return df_processed


def prepare_inference_matrix(df_processed, model_artifacts):
    """Prepare final inference matrix, applying scaler when available."""
    scaler = model_artifacts.get('scaler')

    if scaler is None:
        return df_processed

    transformed = scaler.transform(df_processed)
    if isinstance(transformed, np.ndarray):
        return transformed

    return np.asarray(transformed)


def read_batch_csv(csv_data):
    """Read uploaded CSV, supporting both headered files and raw NSL-KDD rows."""
    df = pd.read_csv(io.StringIO(csv_data))

    required_columns = {'duration', 'protocol_type', 'service', 'flag'}
    if not required_columns.issubset(df.columns) and df.shape[1] == len(RAW_COLUMNS_WITH_LABEL):
        df.columns = RAW_COLUMNS_WITH_LABEL

    return df


def normalize_actual_label_for_comparison(label_value):
    """Normalize raw dataset labels into binary Attack/Normal for correctness checks."""
    if label_value is None:
        return None

    label = str(label_value).strip().lower()
    if label in ['', 'none', 'null', 'nan', 'unknown', 'n/a']:
        return None

    if label in ['0', 'normal', 'normal.', 'benign']:
        return 'Normal'

    if label in ['1', 'attack', 'anom', 'anomaly']:
        return 'Attack'

    # NSL-KDD attack family labels (e.g., neptune, smurf, saint, mscan) map to Attack.
    return 'Attack'


def store_predictions_to_db(predictions, model_name, upload_id=''):
    """
    Batch store predictions to DynamoDB.
    predictions: list of dicts with 'row_number', 'prediction', 'confidence', 'is_correct'
    """
    table = dynamodb.Table(PREDICTIONS_TABLE)
    
    try:
        with table.batch_writer() as batch:
            for pred in predictions:
                row_number = str(pred['row_number'])
                item = {
                    'prediction_id': f'batch_{upload_id}_{row_number}',
                    'timestamp': utc_now_iso(),
                    'uploadId': upload_id,
                    'row_number': row_number,
                    'model_name': model_name,
                    'predicted_label': pred['prediction'],
                    'confidence': Decimal(str(round(float(pred['confidence']), 4))),
                    'is_correct': pred.get('is_correct', 'Unknown')
                }
                
                # Add actual label if available
                if 'actual_label' in pred:
                    item['actual_label'] = str(pred['actual_label'])
                
                batch.put_item(Item=item)
        
        return True
    except Exception as e:
        return False


def update_upload_status(upload_id, status, _message=''):
    """Update upload status in DynamoDB"""
    table = dynamodb.Table(UPLOAD_HISTORY_TABLE)
    
    try:
        table.update_item(
            Key={'uploadId': upload_id},
            UpdateExpression='SET #status = :status, updated_at = :timestamp',
            ExpressionAttributeNames={'#status': 'status'},
            ExpressionAttributeValues={
                ':status': status,
                ':timestamp': utc_now_iso()
            }
        )
    except Exception as e:
        pass


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
            
            # Download CSV from S3
            response = s3.get_object(Bucket=UPLOADS_BUCKET, Key=s3_key)
            csv_data = response['Body'].read().decode('utf-8')
            df = read_batch_csv(csv_data)
            
            # Extract actual labels if present (for is_correct calculation)
            actual_labels = None
            for label_col in ['label', 'actual_label', 'actual', 'true_label', 'target']:
                if label_col in df.columns:
                    actual_labels = df[label_col].tolist()
                    df = df.drop(columns=[label_col])
                    break
            
            # Load model
            model_artifacts = load_model(model_name)
            if model_artifacts is None:
                raise RuntimeError(f"Failed to load model: {model_name}")
            model = model_artifacts['model']
            
            # Preprocess data
            df_processed = preprocess_features(df.copy())
            
            # Align columns with model expectations (including fallback for unnamed feature sets)
            df_processed = align_features_to_model(df_processed, model_artifacts)
            inference_matrix = prepare_inference_matrix(df_processed, model_artifacts)
            
            # Make predictions
            predictions_labels = model.predict(inference_matrix)
            
            # Get confidence scores
            confidences = [0.5] * len(predictions_labels)
            if hasattr(model, 'predict_proba'):
                proba = model.predict_proba(inference_matrix)
                confidences = [float(max(row)) for row in proba]
            
            # Format predictions with is_correct flag
            predictions_to_store = []
            for idx, pred in enumerate(predictions_labels):
                pred_label = 'Attack' if pred == 1 else 'Normal'
                
                # Calculate is_correct if we have actual labels
                is_correct = 'Unknown'
                if actual_labels and idx < len(actual_labels):
                    actual_normalized = normalize_actual_label_for_comparison(actual_labels[idx])
                    if actual_normalized is not None:
                        is_correct = 'Correct' if pred_label == actual_normalized else 'Incorrect'
                
                predictions_to_store.append({
                    'row_number': idx,
                    'prediction': pred_label,
                    'confidence': confidences[idx],
                    'is_correct': is_correct
                })

                if actual_labels and idx < len(actual_labels) and actual_labels[idx] is not None:
                    predictions_to_store[-1]['actual_label'] = str(actual_labels[idx])
            
            # Store predictions to DynamoDB
            if store_predictions_to_db(predictions_to_store, model_name, upload_id):
                results['successful'] += 1
                
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
            
            # Try to update status if we have upload_id
            try:
                if 'message_body' in locals():
                    upload_id = json.loads(record['body']).get('upload_id')
                    update_upload_status(upload_id, 'failed', error_msg)
            except Exception:
                pass
    
    return {
        'statusCode': 200,
        'body': json.dumps(results)
    }

from flask import Flask, request, jsonify
from flask_cors import CORS
import boto3
import pickle
import joblib
import os
import pandas as pd
import numpy as np
import warnings
import io
import json
from decimal import Decimal

# Suppress warnings
warnings.filterwarnings('ignore')

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# AWS S3 Configuration
s3 = boto3.client('s3')
sqs = boto3.client('sqs')
dynamodb = boto3.resource('dynamodb')

MODELS_BUCKET = 'honey-pot-models1'
DATA_BUCKET = 'honey-pot-data1'
UPLOADS_BUCKET = 'honey-pot-uploads1'
SQS_QUEUE_URL = 'https://sqs.us-east-1.amazonaws.com/795938553374/batch-predictions-queue'
UPLOAD_HISTORY_TABLE = 'upload-history'
PREDICTIONS_TABLE = 'attack-detection-predictions'

# Model cache
models = {}

# Expected column schema for raw KDD training data (with label + difficulty_level)
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

def download_model_from_s3(model_name):
    """Download model from S3 and cache it"""
    if model_name not in models:
        try:
            # Download model from S3
            response = s3.get_object(Bucket=MODELS_BUCKET, Key=f'{model_name}.pkl')
            model_data = response['Body'].read()
            
            # Load using joblib (more reliable for scikit-learn models)
            model_bytes = io.BytesIO(model_data)
            models[model_name] = joblib.load(model_bytes)
            
            print(f"Model {model_name} loaded successfully")
        except Exception as e:
            print(f"Error loading model {model_name}: {e}")
            return None
    return models[model_name]

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'EC2 ML Prediction API',
        'models_loaded': list(models.keys())
    })

@app.route('/predict', methods=['POST'])
def predict():
    """ML prediction endpoint"""
    try:
        data = request.get_json()
        features = data.get('features', {})
        model_name = data.get('model', 'random_forest')
        
        # Download and load model
        model = download_model_from_s3(model_name)
        if model is None:
            return jsonify({'error': f'Could not load model: {model_name}'}), 500
        
        # Preprocess features
        processed_features = preprocess_features(features, model=model)
        
        # Make prediction
        prediction = model.predict([processed_features])[0]
        
        # Calculate confidence score (if available)
        confidence = 0.95
        if hasattr(model, 'predict_proba'):
            probabilities = model.predict_proba([processed_features])[0]
            confidence = max(probabilities)
        
        return jsonify({
            'prediction': 'Attack' if prediction == 1 else 'Normal',
            'confidence': confidence,
            'model_used': model_name,
            'status': 'success'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/batch_predict', methods=['POST'])
# def batch_predict():
#     """Batch prediction endpoint for CSV files"""
#     try:
#         data = request.get_json()
#         csv_data = data.get('csv_data', '')
#         model_name = data.get('model', 'random_forest')
        
#         # Parse CSV data
#         df = pd.read_csv(io.StringIO(csv_data))
#         if not set(['duration', 'protocol_type', 'service', 'flag']).issubset(df.columns):
#             if df.shape[1] == len(RAW_COLUMNS_WITH_LABEL):
#                 df.columns = RAW_COLUMNS_WITH_LABEL
        
#         # Drop any label/difficulty columns if present
#         for drop_col in ['label', 'difficulty_level']:
#             if drop_col in df.columns:
#                 df = df.drop(columns=[drop_col])
        
#         # Download and load model
#         model = download_model_from_s3(model_name)
#         if model is None:
#             return jsonify({'error': f'Could not load model: {model_name}'}), 500
        
#         # Preprocess all rows at once for batch prediction
#         # Convert all columns to numeric where possible
#         for col in df.columns:
#             if col not in ['protocol_type', 'service', 'flag']:
#                 df[col] = pd.to_numeric(df[col], errors='coerce')
        
#         # Fill NaN with 0
#         df = df.fillna(0)
        
#         # Handle categorical columns
#         categorical_cols = ['protocol_type', 'service', 'flag']
#         existing_categorical = [col for col in categorical_cols if col in df.columns]
#         if existing_categorical:
#             df = pd.get_dummies(df, columns=existing_categorical, drop_first=False)
        
#         # Reorder and pad columns to match the model
#         if hasattr(model, 'feature_names_in_'):
#             feature_order = list(model.feature_names_in_)
#             for col in feature_order:
#                 if col not in df.columns:
#                     df[col] = 0
#             df = df.reindex(columns=feature_order, fill_value=0)
        
#         # Make batch predictions
#         predictions = model.predict(df.values)
        
#         # Format results
#         results = []
#         for index, prediction in enumerate(predictions):
#             results.append({
#                 'row': index,
#                 'prediction': 'Attack' if prediction == 1 else 'Normal'
#             })
        
#         return jsonify({
#             'results': results,
#             'total_processed': len(results),
#             'model_used': model_name,
#             'status': 'success'
#         })
        
#     except Exception as e:
#         return jsonify({'error': str(e)}), 500

def batch_predict():
    """Batch prediction endpoint for CSV files"""
    try:
        data = request.get_json()
        csv_data = data.get('csv_data', '')
        model_name = data.get('model', 'random_forest')
        
        # Parse CSV data
        df = pd.read_csv(io.StringIO(csv_data))
        if not set(['duration', 'protocol_type', 'service', 'flag']).issubset(df.columns):
            if df.shape[1] == len(RAW_COLUMNS_WITH_LABEL):
                df.columns = RAW_COLUMNS_WITH_LABEL
        
        # Save actual labels before dropping them (for metrics)
        actual_labels = None
        label_col = None
        for drop_col in ['label', 'difficulty_level']:
            if drop_col in df.columns:
                if drop_col == 'label':
                    actual_labels = df[drop_col].tolist()
                    label_col = drop_col
                df = df.drop(columns=[drop_col])
        
        # Download and load model
        model = download_model_from_s3(model_name)
        if model is None:
            return jsonify({'error': f'Could not load model: {model_name}'}), 500
        
        # Convert all non-categorical columns to numeric
        for col in df.columns:
            if col not in ['protocol_type', 'service', 'flag']:
                df[col] = pd.to_numeric(df[col], errors='coerce')
        
        # Fill NaN with 0
        df = df.fillna(0)
        
        # Handle categorical columns
        categorical_cols = ['protocol_type', 'service', 'flag']
        existing_categorical = [col for col in categorical_cols if col in df.columns]
        if existing_categorical:
            df = pd.get_dummies(df, columns=existing_categorical, drop_first=False)
        
        # Align columns to what the model was trained on
        if hasattr(model, 'feature_names_in_'):
            feature_order = list(model.feature_names_in_)
            for col in feature_order:
                if col not in df.columns:
                    df[col] = 0  # Fill missing dummy columns (unseen categories)
            df = df.reindex(columns=feature_order, fill_value=0)
        elif hasattr(model, 'n_features_in_'):
            # Model was fitted on a numpy array — pad or trim to expected feature count
            expected_n = model.n_features_in_
            current_n = df.shape[1]
            if current_n < expected_n:
                for i in range(expected_n - current_n):
                    df[f'_pad_{i}'] = 0
            elif current_n > expected_n:
                df = df.iloc[:, :expected_n]
        
        # Make batch predictions (pass DataFrame to preserve column alignment)
        predictions = model.predict(df)
        
        # Get confidence scores if available
        confidences = None
        if hasattr(model, 'predict_proba'):
            proba = model.predict_proba(df)
            confidences = [float(max(row)) for row in proba]
        
        # Format results
        results = []
        for index, prediction in enumerate(predictions):
            result_item = {
                'row': index,
                'prediction': 'Attack' if prediction == 1 else 'Normal',
                'confidence': confidences[index] if confidences else 0.5
            }
            # Add actual label if we have it
            if actual_labels and index < len(actual_labels):
                result_item['actual_label'] = str(actual_labels[index])
            results.append(result_item)
        
        return jsonify({
            'results': results,
            'total_processed': len(results),
            'model_used': model_name,
            'status': 'success'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
@app.route('/models', methods=['GET'])
def list_models():
    """List available models"""
    try:
        response = s3.list_objects_v2(Bucket=MODELS_BUCKET)
        models_list = [obj['Key'].replace('.pkl', '') for obj in response.get('Contents', [])]
        return jsonify({
            'models': models_list,
            'status': 'success'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/upload_csv', methods=['POST'])
def upload_csv():
    """Upload CSV to S3 (delegates to Lambda for simple operations)"""
    try:
        data = request.get_json()
        csv_data = data.get('csv_data', '')
        filename = data.get('filename', 'upload.csv')
        
        # Upload to S3
        s3.put_object(
            Bucket='honey-pot-uploads1',
            Key=filename,
            Body=csv_data,
            ContentType='text/csv'
        )
        
        return jsonify({
            'message': 'File uploaded successfully',
            'filename': filename,
            'status': 'success'
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/batch_predict_async', methods=['OPTIONS', 'POST'])
def batch_predict_async():
    """Handle CORS preflight and async batch prediction via S3 + SQS"""
    if request.method == 'OPTIONS':
        response = jsonify({'status': 'ok'})
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Methods', 'POST, OPTIONS')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        return response, 200
    
    try:
        data = request.get_json()
        csv_data = data.get('csv_data', '')
        filename = data.get('filename', 'upload.csv')
        model_name = data.get('model', 'random_forest')
        upload_id = data.get('upload_id', f"{filename}_{int(pd.Timestamp.now().timestamp())}")
        
        # Parse CSV to get row count
        df = pd.read_csv(io.StringIO(csv_data))
        row_count = len(df)
        
        # Upload CSV to S3 with upload_id as key
        s3_key = f"{upload_id}/{filename}"
        s3.put_object(
            Bucket=UPLOADS_BUCKET,
            Key=s3_key,
            Body=csv_data,
            ContentType='text/csv'
        )
        
        # Send message to SQS queue (Lambda will process)
        message = {
            'upload_id': upload_id,
            'filename': filename,
            's3_key': s3_key,
            'model_name': model_name,
            'row_count': row_count,
            'timestamp': pd.Timestamp.now().isoformat()
        }
        
        sqs.send_message(
            QueueUrl=SQS_QUEUE_URL,
            MessageBody=json.dumps(message)
        )
        
        return jsonify({
            'upload_id': upload_id,
            'filename': filename,
            'row_count': row_count,
            'status': 'queued',
            'message': 'File uploaded and batch prediction queued for processing'
        }), 202
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/store_upload_history', methods=['POST'])
def store_upload_history():
    """Store upload metadata to DynamoDB"""
    try:
        data = request.get_json()
        upload_id = data.get('upload_id')
        filename = data.get('filename')
        row_count = data.get('row_count')
        model_name = data.get('model_name', 'random_forest')
        
        table = dynamodb.Table(UPLOAD_HISTORY_TABLE)
        
        table.put_item(
            Item={
                'upload_id': upload_id,
                'filename': filename,
                'model': model_name,
                'row_count': row_count,
                'timestamp': pd.Timestamp.now().isoformat(),
                'status': 'processing'
            }
        )
        
        return jsonify({
            'status': 'success',
            'message': 'Upload history stored'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/get_upload_history', methods=['GET'])
def get_upload_history():
    """Fetch recent upload history from DynamoDB"""
    try:
        table = dynamodb.Table(UPLOAD_HISTORY_TABLE)
        
        # Scan with limit and sort by timestamp descending
        response = table.scan(Limit=50)
        items = response.get('Items', [])
        
        # Sort by timestamp descending
        items = sorted(items, key=lambda x: x.get('timestamp', ''), reverse=True)
        
        return jsonify({
            'status': 'success',
            'uploads': items,
            'count': len(items)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/get_batch_predictions/<upload_id>', methods=['GET'])
def get_batch_predictions(upload_id):
    """Fetch batch predictions by upload_id from DynamoDB"""
    try:
        table = dynamodb.Table(PREDICTIONS_TABLE)
        
        # Query all predictions for this upload_id
        response = table.query(
            KeyConditionExpression='upload_id = :upload_id',
            ExpressionAttributeValues={
                ':upload_id': upload_id
            },
            Limit=1000
        )
        
        predictions = response.get('Items', [])
        
        # Sort by row number
        predictions = sorted(predictions, key=lambda x: int(x.get('row_number', 0)))
        
        return jsonify({
            'status': 'success',
            'predictions': predictions,
            'count': len(predictions),
            'upload_id': upload_id
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("Starting EC2 ML API Server...")
    print("Models will be loaded on first request to save memory.")
    
    # Run Flask app - try port 5000, fall back to 5001 if in use
    port = 5000
    import socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    result = sock.connect_ex(('127.0.0.1', port))
    sock.close()
    
    if result == 0:
        print(f"\nPort {port} is in use, using port 5001 instead")
        port = 5001
    
    print(f"Starting Flask app on http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=False)

from flask import Flask, request, jsonify
import boto3
import pickle
import os
import pandas as pd
import numpy as np

app = Flask(__name__)

# AWS S3 Configuration
s3 = boto3.client('s3')
MODELS_BUCKET = 'honey-pot-models'
DATA_BUCKET = 'honey-pot-data'

# Model cache
models = {}

def download_model_from_s3(model_name):
    """Download model from S3 and cache it"""
    if model_name not in models:
        try:
            # Download model from S3
            response = s3.get_object(Bucket=MODELS_BUCKET, Key=f'{model_name}.pkl')
            models[model_name] = pickle.loads(response['Body'].read())
            print(f"Model {model_name} loaded successfully")
        except Exception as e:
            print(f"Error loading model {model_name}: {e}")
            return None
    return models[model_name]

def preprocess_features(features):
    """Preprocess features for ML model"""
    # Convert to DataFrame for processing
    df = pd.DataFrame([features])
    
    # Handle categorical variables (simplified)
    categorical_cols = ['protocol_type', 'service', 'flag']
    for col in categorical_cols:
        if col in df.columns:
            df[col] = pd.Categorical(df[col]).codes
    
    # Fill missing values
    df = df.fillna(0)
    
    return df.values[0]

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
        processed_features = preprocess_features(features)
        
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
def batch_predict():
    """Batch prediction endpoint for CSV files"""
    try:
        data = request.get_json()
        csv_data = data.get('csv_data', '')
        model_name = data.get('model', 'random_forest')
        
        # Parse CSV data
        df = pd.read_csv(pd.io.common.StringIO(csv_data))
        
        # Download and load model
        model = download_model_from_s3(model_name)
        if model is None:
            return jsonify({'error': f'Could not load model: {model_name}'}), 500
        
        # Process each row
        results = []
        for index, row in df.iterrows():
            features = row.to_dict()
            processed_features = preprocess_features(features)
            prediction = model.predict([processed_features])[0]
            results.append({
                'row': index,
                'prediction': 'Attack' if prediction == 1 else 'Normal'
            })
        
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
            Bucket='honey-pot-uploads',
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

if __name__ == '__main__':
    # Load models on startup
    print("Starting EC2 ML API Server...")
    print("Loading models from S3...")
    for model_name in ['random_forest', 'decision_tree', 'logistic_regression']:
        download_model_from_s3(model_name)
    print(f"Models loaded: {list(models.keys())}")
    
    # Run Flask app
    app.run(host='0.0.0.0', port=5000, debug=True)

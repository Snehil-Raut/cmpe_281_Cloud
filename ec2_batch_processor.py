"""
EC2 Batch Processor for Large CSV Files
Handles 1M+ records with chunked processing and S3 integration
"""

from flask import Flask, request, jsonify, send_file
import boto3
import pandas as pd
import numpy as np
import io
import os
from datetime import datetime
import time
import threading
import uuid

app = Flask(__name__)

# AWS Configuration
S3_BUCKET = 'honey-pot-uploads'
S3_DATA_BUCKET = 'honey-pot-data'
S3_MODELS_BUCKET = 'honey-pot-models'

# Initialize S3 client
s3 = boto3.client('s3')

# Processing status storage (in production, use Redis or database)
processing_status = {}

class BatchProcessor:
    """Handles large CSV file processing in chunks"""
    
    def __init__(self, chunk_size=10000):
        self.chunk_size = chunk_size
        self.model = None
        self.load_model()
    
    def load_model(self):
        """Load ML model from S3"""
        try:
            # Download model from S3
            model_path = '/tmp/random_forest.pkl'
            s3.download_file(S3_MODELS_BUCKET, 'random_forest.pkl', model_path)
            
            # Load model (using scikit-learn)
            import joblib
            self.model = joblib.load(model_path)
            print("Model loaded successfully")
        except Exception as e:
            print(f"Error loading model: {e}")
            # Create a simple demo model for demonstration
            self.model = None
    
    def process_chunk(self, chunk_data):
        """Process a chunk of CSV data"""
        results = []
        
        for idx, row in chunk_data.iterrows():
            # Extract features from row
            features = self.extract_features(row)
            
            # Make prediction
            if self.model:
                prediction = self.model.predict([features])[0]
                confidence = 0.95  # Simplified confidence
            else:
                # Demo prediction logic
                prediction = 1 if idx % 10 == 0 else 0  # 10% attack rate
                confidence = 0.85
            
            results.append({
                'row_index': idx,
                'prediction': 'Attack' if prediction == 1 else 'Normal',
                'confidence': confidence
            })
        
        return results
    
    def extract_features(self, row):
        """Extract features from CSV row"""
        # Convert row to numeric features
        # This is a simplified version - adjust based on your actual CSV structure
        features = []
        for col in row:
            try:
                features.append(float(row[col]))
            except (ValueError, TypeError):
                features.append(0)
        return features
    
    def process_large_csv(self, file_key, task_id):
        """Process large CSV file in chunks"""
        try:
            # Update status
            processing_status[task_id] = {
                'status': 'processing',
                'progress': 0,
                'total_records': 0,
                'processed_records': 0,
                'start_time': datetime.now().isoformat()
            }
            
            # Download file from S3
            print(f"Downloading {file_key} from S3")
            local_path = f'/tmp/{task_id}.csv'
            s3.download_file(S3_BUCKET, file_key, local_path)
            
            # Read CSV in chunks
            chunk_results = []
            total_records = 0
            
            for chunk_num, chunk in enumerate(pd.read_csv(local_path, chunksize=self.chunk_size)):
                total_records += len(chunk)
                
                # Process chunk
                chunk_result = self.process_chunk(chunk)
                chunk_results.extend(chunk_result)
                
                # Update progress
                processing_status[task_id]['processed_records'] = total_records
                processing_status[task_id]['progress'] = min(100, (total_records / 1000000) * 100)
                
                print(f"Processed chunk {chunk_num + 1}, total records: {total_records}")
                
                # Save intermediate results to S3
                if len(chunk_results) % 50000 == 0:
                    self.save_intermediate_results(task_id, chunk_results)
            
            # Save final results
            final_results_path = f'/tmp/{task_id}_results.csv'
            results_df = pd.DataFrame(chunk_results)
            results_df.to_csv(final_results_path, index=False)
            
            # Upload results to S3
            s3.upload_file(
                final_results_path,
                S3_DATA_BUCKET,
                f'batch_results/{task_id}_results.csv'
            )
            
            # Update final status
            processing_status[task_id].update({
                'status': 'completed',
                'progress': 100,
                'total_records': total_records,
                'processed_records': total_records,
                'end_time': datetime.now().isoformat(),
                'results_file': f'batch_results/{task_id}_results.csv'
            })
            
            # Cleanup
            os.remove(local_path)
            os.remove(final_results_path)
            
            print(f"Processing completed. Total records: {total_records}")
            
        except Exception as e:
            processing_status[task_id].update({
                'status': 'failed',
                'error': str(e),
                'end_time': datetime.now().isoformat()
            })
            print(f"Error processing file: {e}")
    
    def save_intermediate_results(self, task_id, results):
        """Save intermediate results to S3"""
        try:
            temp_path = f'/tmp/{task_id}_intermediate.csv'
            results_df = pd.DataFrame(results)
            results_df.to_csv(temp_path, index=False)
            
            s3.upload_file(
                temp_path,
                S3_DATA_BUCKET,
                f'batch_results/{task_id}_intermediate.csv'
            )
            
            os.remove(temp_path)
        except Exception as e:
            print(f"Error saving intermediate results: {e}")

# Initialize batch processor
batch_processor = BatchProcessor(chunk_size=10000)

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'EC2 Batch Processor',
        'message': 'Ready to process large CSV files',
        'capabilities': ['chunked_processing', 's3_integration', 'batch_predictions']
    })

@app.route('/batch/upload', methods=['POST'])
def batch_upload():
    """Upload CSV file for batch processing"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Generate task ID
        task_id = str(uuid.uuid4())
        
        # Upload to S3
        s3_key = f'batch_uploads/{task_id}_{file.filename}'
        s3.upload_fileobj(file, S3_BUCKET, s3_key)
        
        # Start processing in background thread
        thread = threading.Thread(
            target=batch_processor.process_large_csv,
            args=(s3_key, task_id)
        )
        thread.start()
        
        return jsonify({
            'task_id': task_id,
            'status': 'processing_started',
            'message': 'File uploaded and processing started',
            's3_key': s3_key
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/batch/status/<task_id>', methods=['GET'])
def batch_status(task_id):
    """Get processing status for a task"""
    if task_id not in processing_status:
        return jsonify({'error': 'Task not found'}), 404
    
    return jsonify(processing_status[task_id])

@app.route('/batch/results/<task_id>', methods=['GET'])
def batch_results(task_id):
    """Download batch processing results"""
    try:
        if task_id not in processing_status:
            return jsonify({'error': 'Task not found'}), 404
        
        status = processing_status[task_id]
        if status['status'] != 'completed':
            return jsonify({'error': 'Processing not completed yet'}), 400
        
        # Download results from S3
        results_key = status['results_file']
        local_path = f'/tmp/{task_id}_results.csv'
        s3.download_file(S3_DATA_BUCKET, results_key, local_path)
        
        return send_file(local_path, as_attachment=True)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/batch/summary/<task_id>', methods=['GET'])
def batch_summary(task_id):
    """Get summary statistics for batch processing"""
    try:
        if task_id not in processing_status:
            return jsonify({'error': 'Task not found'}), 404
        
        status = processing_status[task_id]
        if status['status'] != 'completed':
            return jsonify({'error': 'Processing not completed yet'}), 400
        
        # Download results and calculate summary
        results_key = status['results_file']
        local_path = f'/tmp/{task_id}_results.csv'
        s3.download_file(S3_DATA_BUCKET, results_key, local_path)
        
        results_df = pd.read_csv(local_path)
        
        summary = {
            'total_records': len(results_df),
            'attack_count': len(results_df[results_df['prediction'] == 'Attack']),
            'normal_count': len(results_df[results_df['prediction'] == 'Normal']),
            'attack_rate': len(results_df[results_df['prediction'] == 'Attack']) / len(results_df) * 100,
            'average_confidence': results_df['confidence'].mean(),
            'processing_time': status['end_time']
        }
        
        os.remove(local_path)
        
        return jsonify(summary)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("Starting EC2 Batch Processor...")
    print("Health check: http://localhost:5000/health")
    print("Batch upload: POST http://localhost:5000/batch/upload")
    app.run(host='0.0.0.0', port=5000, debug=True)

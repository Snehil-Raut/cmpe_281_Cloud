import json
import boto3
import csv
import io

s3 = boto3.client('s3')
UPLOAD_BUCKET = 'honey-pot-uploads'
DATA_BUCKET = 'honey-pot-data'

def lambda_handler(event, context):
    """Lambda handler for file operations"""
    try:
        # Parse input data
        body = json.loads(event['body']) if isinstance(event['body'], str) else event['body']
        operation = body.get('operation')
        
        if operation == 'upload_csv':
            return handle_csv_upload(body)
        elif operation == 'get_file_list':
            return handle_file_list()
        elif operation == 'demo_prediction':
            return handle_demo_prediction(body)
        else:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'Invalid operation'})
            }
            
    except Exception as e:
        print(f"Lambda error: {e}")
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }

def handle_csv_upload(body):
    """Handle CSV file upload to S3"""
    try:
        csv_data = body.get('csv_data')
        filename = body.get('filename', 'upload.csv')
        
        # Convert CSV data to file-like object
        csv_file = io.StringIO(csv_data)
        
        # Upload to S3
        s3.put_object(
            Bucket=UPLOAD_BUCKET,
            Key=filename,
            Body=csv_file.getvalue(),
            ContentType='text/csv'
        )
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'message': 'File uploaded successfully', 'filename': filename})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': f'Upload failed: {str(e)}'})
        }

def handle_file_list():
    """List files in S3 bucket"""
    try:
        response = s3.list_objects_v2(Bucket=DATA_BUCKET)
        files = [obj['Key'] for obj in response.get('Contents', [])]
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'files': files})
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': f'Failed to list files: {str(e)}'})
        }

def handle_demo_prediction(body):
    """Handle demo prediction without ML model"""
    try:
        features = body.get('features', {})
        
        # Simple demo prediction logic
        score = 0
        score += float(features.get('serror_rate', 0)) * 40
        score += float(features.get('rerror_rate', 0)) * 30
        score += 15 if float(features.get('count', 0)) > 100 else 0
        score += 15 if features.get('flag') == "REJ" else 0
        
        score = min(100, max(1, int(score)))
        
        risk_level = "Low" if score <= 35 else "Moderate" if score <= 60 else "High"
        prediction = "Attack" if risk_level == "High" else "Normal"
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'prediction': prediction,
                'risk': risk_level,
                'score': score
            })
        }
    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': f'Prediction failed: {str(e)}'})
        }

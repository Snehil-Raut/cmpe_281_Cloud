#!/bin/bash

# EC2 User Data Script for Automated Flask API Deployment
# This runs automatically when the instance starts

# Update system
yum update -y

# Install Python 3 and pip
yum install -y python3 python3-pip

# Install dependencies
pip3 install flask boto3 pandas numpy scikit-learn gunicorn

# Create application directory
mkdir -p /home/ec2-user/flask_app
cd /home/ec2-user/flask_app

# Download Flask API from S3 (you need to upload ec2_api.py to S3 first)
# aws s3 cp s3://honey-pot-uploads/ec2_api.py ./ec2_api.py

# Create a simple Flask API for demonstration if ec2_api.py is not available
cat > ec2_api.py << 'EOF'
from flask import Flask, request, jsonify
import boto3

app = Flask(__name__)
s3 = boto3.client('s3')

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'healthy', 'service': 'EC2 Flask API', 'message': 'EC2 is running and accessible'})

@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    return jsonify({'prediction': 'Normal', 'confidence': 0.95, 'model': 'demo', 'message': 'EC2 API working'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
EOF

# Create systemd service file
cat > /etc/systemd/system/flask-app.service << EOF
[Unit]
Description=Flask API Service
After=network.target

[Service]
User=ec2-user
WorkingDirectory=/home/ec2-user/flask_app
ExecStart=/usr/bin/python3 ec2_api.py
Restart=always

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
systemctl daemon-reload
systemctl enable flask-app.service
systemctl start flask-app.service

echo "Flask API deployment complete - EC2 is now running Flask API on port 5000"

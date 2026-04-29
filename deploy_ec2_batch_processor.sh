#!/bin/bash

# EC2 Batch Processor Deployment Script
# Deploys Flask API for large CSV file processing

echo "Deploying EC2 Batch Processor for Large File Processing..."

# Install dependencies
sudo yum update -y
sudo yum install -y python3 python3-pip git

# Install Python packages
pip3 install flask boto3 pandas numpy scikit-learn joblib gunicorn

# Create application directory
mkdir -p /home/ec2-user/batch_processor
cd /home/ec2-user/batch_processor

# Download batch processor from S3 (you need to upload it first)
# aws s3 cp s3://honey-pot-uploads/ec2_batch_processor.py ./ec2_batch_processor.py

# Create systemd service file
sudo cat > /etc/systemd/system/batch-processor.service << 'EOF'
[Unit]
Description=EC2 Batch Processor Service
After=network.target

[Service]
User=ec2-user
WorkingDirectory=/home/ec2-user/batch_processor
ExecStart=/usr/bin/python3 ec2_batch_processor.py
Restart=always
Environment=PYTHONUNBUFFERED=1

[Install]
WantedBy=multi-user.target
EOF

# Enable and start the service
sudo systemctl daemon-reload
sudo systemctl enable batch-processor.service
sudo systemctl start batch-processor.service

# Check service status
sudo systemctl status batch-processor.service

echo "EC2 Batch Processor deployed successfully!"
echo "Service is running on port 5000"
echo "Health check: curl http://localhost:5000/health"

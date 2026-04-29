#!/bin/bash

# EC2 Flask API Deployment Script
# This script sets up the Flask API on EC2 instance

# Update system
yum update -y

# Install Python 3 and pip
yum install -y python3 python3-pip

# Install dependencies
pip3 install flask boto3 pandas numpy scikit-learn gunicorn

# Create application directory
mkdir -p /home/ec2-user/flask_app
cd /home/ec2-user/flask_app

# Create Flask API file (this will be uploaded separately)
# The actual ec2_api.py file needs to be uploaded to this location

# Create log directory
mkdir -p /var/log/flask_app

# Set permissions
chown -R ec2-user:ec2-user /home/ec2-user/flask_app

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

echo "Flask API deployment complete"

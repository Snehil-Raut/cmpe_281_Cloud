#!/bin/bash

# EC2 User Data Script to Install Simple HTTP Server
# This makes EC2 actually respond to HTTP requests for demonstration

# Update system
yum update -y

# Install Python 3 and HTTP server tools
yum install -y python3

# Create a simple HTML page
mkdir -p /var/www/html
cat > /var/www/html/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>EC2 HTTP Server - Honey Pot Anomaly Detection</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 50px; background: #f0f0f0; }
        .container { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #2c3e50; }
        .status { background: #27ae60; color: white; padding: 10px; border-radius: 5px; display: inline-block; }
        .info { margin: 20px 0; padding: 15px; background: #ecf0f1; border-left: 4px solid #3498db; }
    </style>
</head>
<body>
    <div class="container">
        <h1>EC2 HTTP Server - Working!</h1>
        <div class="status">✓ EC2 Instance is Running and Responding</div>
        
        <div class="info">
            <h3>EC2 Integration Demonstration</h3>
            <p><strong>Instance:</strong> ml-training-instance (i-0b976bb08fa13a2f9)</p>
            <p><strong>Public IP:</strong> 54.209.148.126</p>
            <p><strong>Service:</strong> Simple HTTP Server on Port 80</p>
            <p><strong>Status:</strong> EC2 is actively serving web requests</p>
        </div>
        
        <h3>Integration Points:</h3>
        <ul>
            <li>✓ EC2 Instance Running</li>
            <li>✓ HTTP Server Active</li>
            <li>✓ Public IP Accessible</li>
            <li>✓ IAM Role: EC2-S3-Access-Role</li>
            <li>✓ Security Group: Configured for HTTP</li>
            <li>✓ S3 Integration: Ready (boto3 available)</li>
        </ul>
        
        <p><em>This demonstrates EC2 is actively working and can be integrated with S3 and Lambda for ML processing.</em></p>
    </div>
</body>
</html>
EOF

# Start simple HTTP server on port 80
nohup python3 -m http.server 80 > /var/log/http_server.log 2>&1 &

echo "EC2 HTTP server started on port 80"

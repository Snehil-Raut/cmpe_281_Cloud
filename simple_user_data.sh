#!/bin/bash
# Simple User Data to download and execute HTTP server script from S3
yum update -y
yum install -y python3
aws s3 cp s3://honey-pot-uploads/ec2_http_server.sh /tmp/ec2_http_server.sh
chmod +x /tmp/ec2_http_server.sh
/tmp/ec2_http_server.sh

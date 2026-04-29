#!/bin/bash

# Grafana Setup for AWS Infrastructure Monitoring
# This script sets up Grafana to monitor EC2, Lambda, and S3

echo "Setting up Grafana for AWS CloudWatch monitoring..."

# Option 1: Use AWS Managed Grafana (Recommended for production)
# Requires AWS CLI and proper permissions

# Create CloudWatch data source configuration
cat > grafana_cloudwatch_datasource.json << 'EOF'
{
  "name": "CloudWatch",
  "type": "cloudwatch",
  "url": "https://monitoring.us-east-1.amazonaws.com",
  "access": "proxy",
  "jsonData": {
    "authType": "default",
    "defaultRegion": "us-east-1"
  }
}
EOF

# Create dashboard configuration for EC2, Lambda, and S3
cat > grafana_dashboard.json << 'EOF'
{
  "dashboard": {
    "title": "Honey Pot Anomaly Detection - AWS Infrastructure",
    "panels": [
      {
        "title": "EC2 CPU Utilization",
        "targets": [
          {
            "namespace": "AWS/EC2",
            "metricName": "CPUUtilization",
            "dimensions": {
              "InstanceId": "i-0b976bb08fa13a2f9"
            },
            "stat": "Average",
            "period": 300
          }
        ]
      },
      {
        "title": "Lambda Invocations",
        "targets": [
          {
            "namespace": "AWS/Lambda",
            "metricName": "Invocations",
            "dimensions": {
              "FunctionName": "honey-pot-lambda"
            },
            "stat": "Sum",
            "period": 300
          }
        ]
      },
      {
        "title": "S3 Bucket Size",
        "targets": [
          {
            "namespace": "AWS/S3",
            "metricName": "BucketSizeBytes",
            "dimensions": {
              "BucketName": "honey-pot-uploads"
            },
            "stat": "Average",
            "period": 86400
          }
        ]
      }
    ]
  }
}
EOF

echo "Grafana configuration files created."
echo "Next steps:"
echo "1. Deploy Grafana (AWS Managed Grafana or self-hosted)"
echo "2. Configure CloudWatch as data source"
echo "3. Import dashboard configuration"
echo "4. View real-time metrics for EC2, Lambda, and S3"

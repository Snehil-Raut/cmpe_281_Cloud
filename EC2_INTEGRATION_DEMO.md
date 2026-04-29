# EC2 Integration Demonstration - Honey Pot Anomaly Detection System

## EC2 Integration Overview

This document demonstrates how EC2 is integrated into our cloud architecture alongside Lambda and S3 for the Honey Pot Anomaly Detection System.

## Current Cloud Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   AWS Cloud Infrastructure                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐         ┌─────────────────┐          │
│  │  S3 Frontend    │         │  EC2 Backend    │          │
│  │  (Website)      │◄────────┤  (Flask API)    │          │
│  │                 │  HTTP   │                 │          │
│  │  React App      │         │  - ML Models    │          │
│  │  - Auth         │         │  - Predictions  │          │
│  │  - Dashboard    │         │  - Batch Proc   │          │
│  └─────────────────┘         └────────┬────────┘          │
│                                       │                     │
│                              ┌────────▼────────┐           │
│                              │   S3 Storage    │           │
│                              │                 │           │
│                              │ - Models (.pkl) │           │
│                              │ - Data (.csv)   │           │
│                              │ - Uploads       │           │
│                              └─────────────────┘           │
│                                       ▲                     │
│                              ┌────────┴────────┐           │
│                              │  Lambda         │           │
│                              │  (Serverless)   │           │
│                              │                 │           │
│                              │ - Simple Ops    │           │
│                              │ - File Uploads  │           │
│                              │ - Triggers      │           │
│                              └─────────────────┘           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## EC2 Instance Details

**Instance Information:**
- **Instance ID**: i-0b976bb08fa13a2f9
- **Instance Type**: t3.micro
- **Name**: ml-training-instance
- **State**: Running
- **AMI**: ami-01b14b7ad41e17ba4 (Amazon Linux)
- **Region**: us-east-1
- **IAM Role**: EC2-S3-Access-Role (S3 permissions)

**Security Configuration:**
- **Security Group**: sg-044116cf67c088abf
- **IAM Profile**: EC2-S3-Access-Role
- **Key Pair**: ML-keypair

## EC2 Integration Points

### 1. EC2 ←→ S3 Integration

**Connection Method:** AWS SDK (boto3)

**Purpose:** Load ML models and access data files

```python
# EC2 connects to S3 using boto3
import boto3

s3 = boto3.client('s3')

# Download ML models from S3
response = s3.get_object(Bucket='honey-pot-models', Key='random_forest.pkl')
model = pickle.loads(response['Body'].read())

# Upload results to S3
s3.put_object(Bucket='honey-pot-uploads', Key='results.csv', Body=data)
```

**Benefits:**
- Models stored centrally in S3
- EC2 loads models on startup
- Shared storage between EC2 and Lambda
- No local storage limitations on EC2

### 2. EC2 ←→ Frontend Integration

**Connection Method:** HTTP API (Flask)

**Purpose:** Handle ML predictions and complex processing

```python
# Frontend makes HTTP requests to EC2
fetch('http://EC2_PUBLIC_IP:5000/predict', {
    method: 'POST',
    body: JSON.stringify({
        features: {...},
        model: 'random_forest'
    })
})

# EC2 Flask API handles requests
@app.route('/predict', methods=['POST'])
def predict():
    data = request.get_json()
    # Process prediction
    return jsonify({'prediction': 'Attack', 'confidence': 0.95})
```

**API Endpoints:**
- `GET /health` - Health check
- `POST /predict` - Single session prediction
- `POST /batch_predict` - Batch CSV processing
- `GET /models` - List available models
- `POST /upload_csv` - Upload CSV to S3

### 3. EC2 ←→ Lambda Integration

**Connection Method:** AWS SDK (boto3) or API Gateway

**Purpose:** Hybrid architecture - EC2 for heavy ML, Lambda for simple ops

```python
# EC2 can trigger Lambda for simple operations
lambda_client = boto3.client('lambda')

lambda_client.invoke(
    FunctionName='honey-pot-lambda',
    InvocationType='Event',
    Payload=json.dumps({
        'operation': 'upload_csv',
        'csv_data': csv_data
    })
)
```

**Architecture Pattern:**
- **EC2**: Heavy ML computations, model inference, batch processing
- **Lambda**: Simple file operations, triggers, lightweight tasks
- **S3**: Shared storage for both services

## Demonstration Steps

### Step 1: Show EC2 Instance Running

```bash
# Show EC2 instance details
aws ec2 describe-instances --instance-ids i-0b976bb08fa13a2f9

# Expected output: State: running, Instance Type: t3.micro, IAM Role: EC2-S3-Access-Role
```

### Step 2: Show EC2-S3 Connection

```bash
# Show S3 buckets (EC2 can access these)
aws s3 ls

# Show models in S3 (EC2 loads these)
aws s3 ls s3://honey-pot-models

# Expected output: decision_tree.pkl, logistic_regression.pkl, random_forest.pkl
```

### Step 3: Show Flask API Code

**File:** `ec2_api.py`

**Key Features:**
- Flask web server on port 5000
- boto3 for S3 integration
- Model loading from S3
- Prediction endpoints
- Batch processing capabilities

### Step 4: Show Lambda Function

```bash
# Show Lambda function details
aws lambda get-function --function-name honey-pot-lambda

# Expected output: Function exists with S3 permissions
```

**Lambda Capabilities:**
- Simple file operations
- CSV upload to S3
- Demo predictions
- Triggered by API Gateway

### Step 5: Show Architecture Diagram

Present the architecture diagram showing:
- Frontend (S3 static website)
- EC2 (Flask API for ML predictions)
- Lambda (Serverless for simple operations)
- S3 (Shared storage)

## Key Integration Benefits

### 1. **Scalability**
- EC2 handles heavy ML workloads
- Lambda handles sporadic, lightweight tasks
- Auto-scaling capabilities

### 2. **Cost Optimization**
- EC2: Continuous processing (cost-effective for heavy workloads)
- Lambda: Pay-per-use (cost-effective for sporadic tasks)
- Optimal cost based on usage patterns

### 3. **Performance**
- EC2: No cold starts, faster predictions
- Lambda: Instant scaling for burst traffic
- Best performance for each use case

### 4. **Flexibility**
- Easy to add more EC2 instances for load balancing
- Lambda functions can be triggered by various AWS services
- Shared S3 storage enables data sharing

## Cloud Services Used

1. **Amazon EC2** - Virtual server for ML processing
2. **AWS Lambda** - Serverless compute for simple operations
3. **Amazon S3** - Object storage for models, data, and application
4. **AWS IAM** - Access management and security
5. **AWS SDK (boto3)** - Python library for AWS integration

## Security Configuration

- **IAM Roles**: EC2 uses EC2-S3-Access-Role for S3 access
- **Security Groups**: Network access control
- **Key Pairs**: SSH access for EC2 management
- **VPC**: Network isolation and security

## Deployment Architecture

**Production Deployment:**
- EC2 behind Application Load Balancer
- Auto Scaling Group for multiple EC2 instances
- API Gateway for Lambda functions
- CloudFront for content delivery
- CloudWatch for monitoring

**Current Demonstration Setup:**
- Single EC2 instance (t3.micro)
- Direct HTTP access to EC2 API
- Lambda function with S3 integration
- S3 static website for frontend

## Conclusion

This EC2 integration demonstrates a hybrid cloud architecture that:
- Leverages EC2 for intensive ML processing
- Uses Lambda for lightweight, serverless operations
- Utilizes S3 for shared storage and data management
- Provides scalability, cost optimization, and performance benefits

The integration showcases modern cloud computing principles including serverless architecture, hybrid compute models, and shared storage patterns.

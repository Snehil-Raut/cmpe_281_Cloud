# Network Attack Detection System (Honey Pot)

A comprehensive cloud-based machine learning system for detecting network intrusions and cyberattacks in real-time. Built with AWS services and trained on the NSL-KDD dataset.

## 📋 Features

### 🔍 Real-time Predictions
- **Single Record Prediction**: Analyze individual network connections for attack patterns
- **Batch Processing**: Process multiple records asynchronously via SQS queues
- **Multiple ML Models**: Choose between Decision Tree, Logistic Regression, and Random Forest
- **Confidence Scoring**: Get probability estimates for prediction confidence

### 📊 Analytics & Monitoring
- **Metrics Dashboard**: View attack detection statistics and trends
- **Time-based Filtering**: Analyze metrics for all-time, today, or last week
- **Model Performance**: Track accuracy and performance metrics for each ML model
- **Prediction History**: View detailed logs of all predictions with timestamps

### 📤 Data Management
- **CSV Upload**: Upload network traffic datasets for batch analysis
- **Upload History**: Track all uploaded files with metadata
- **S3 Storage**: Secure cloud storage for datasets and models
- **Data Processing**: Automatic feature engineering and preprocessing

### 🤖 Model Management
- **Multiple Algorithms**: Decision Tree, Logistic Regression, Random Forest
- **Automatic Retraining**: Periodic model retraining with latest NSL-KDD data
- **Model Versioning**: Store and manage multiple model versions in S3
- **Feature Encoding**: Automatic categorical encoding for protocol types, services, and flags

### 🔐 Security & Authentication
- **User Authentication**: AWS Amplify-based login system
- **CORS Support**: Secure cross-origin requests
- **Error Handling**: Comprehensive error handling and logging
- **Input Validation**: Sanitize and validate all input data

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Amplify)               │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │  Login   │  │Dashboard │  │ Upload   │  │ Predict  │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
│  ┌──────────┐  ┌──────────┐                                     │
│  │ Metrics  │  │ Navbar   │                                     │
│  └──────────┘  └──────────┘                                     │
└─────────────────────────────────────────────────────────────────┘
                          ↕ HTTP/REST
┌─────────────────────────────────────────────────────────────────┐
│                  AWS CLOUD INFRASTRUCTURE                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │        EC2 Instance (Flask API Server)                  │   │
│  │                                                          │   │
│  │  ┌──────────────────────────────────────────────────┐   │   │
│  │  │  /predict - Real-time prediction endpoint        │   │   │
│  │  │  /metrics - Get performance metrics              │   │   │
│  │  │  /health  - Health check endpoint                │   │   │
│  │  │  /upload  - Handle CSV uploads                   │   │   │
│  │  │  /history - Get upload history                   │   │   │
│  │  └──────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                              ↕                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐   │
│  │     S3       │  │   DynamoDB   │  │   SQS Queue         │   │
│  │ - Models     │  │ - Predictions│  │ - Batch Jobs        │   │
│  │ - Datasets   │  │ - Upload Log │  │                     │   │
│  │              │  │              │  │                     │   │
│  └──────────────┘  └──────────────┘  └─────────────────────┘   │
│                              ↕                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │        AWS Lambda Functions                             │   │
│  │                                                          │   │
│  │  ┌────────────────────────────────────────────────────┐ │   │
│  │  │  Batch Processor Lambda                            │ │   │
│  │  │  - Consumes SQS messages from queue               │ │   │
│  │  │  - Downloads CSV from S3                          │ │   │
│  │  │  - Runs batch predictions                         │ │   │
│  │  │  - Stores results to DynamoDB                     │ │   │
│  │  └────────────────────────────────────────────────────┘ │   │
│  │                                                          │   │
│  │  ┌────────────────────────────────────────────────────┐ │   │
│  │  │  Retraining Lambda                                 │ │   │
│  │  │  - Fetches NSL-KDD dataset                        │ │   │
│  │  │  - Preprocesses network data                      │ │   │
│  │  │  - Retrains ML models                             │ │   │
│  │  │  - Uploads new models to S3                       │ │   │
│  │  └────────────────────────────────────────────────────┘ │   │
│  │                                                          │   │
│  │  ┌────────────────────────────────────────────────────┐ │   │
│  │  │  Metrics Lambda                                    │ │   │
│  │  │  - Aggregates DynamoDB predictions                │ │   │
│  │  │  - Calculates statistics                          │ │   │
│  │  │  - Returns time-filtered metrics                  │ │   │
│  │  └────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Workflow Diagram

```
User Journey - Attack Detection Pipeline

[User Login] 
     ↓
     → [Authenticate via AWS Amplify]
     ↓
[Main Dashboard]
     ↓
     ├─→ [View Metrics]
     │     ↓
     │     → [Select Time Range]
     │     ↓
     │     → [Query Lambda Function]
     │     ↓
     │     → [DynamoDB Analysis]
     │     ↓
     │     → [Display Charts & Stats]
     │
     ├─→ [Real-time Prediction]
     │     ↓
     │     → [Input Network Features]
     │     ↓
     │     → [Select ML Model]
     │     ↓
     │     → [Send to EC2 API /predict]
     │     ↓
     │     → [Model Inference]
     │     ↓
     │     → [Return Prediction + Confidence]
     │
     └─→ [Batch Upload]
           ↓
           → [Upload CSV File]
           ↓
           → [Store in S3]
           ↓
           → [Create SQS Message]
           ↓
           → [Lambda Batch Processor Consumes]
           ↓
           → [Download CSV from S3]
           ↓
           → [Preprocess Features]
           ↓
           → [Batch Predictions]
           ↓
           → [Store to DynamoDB]
           ↓
           → [Update Upload History]
           ↓
           → [User Views Results]
```

## 🗄️ Data Model

### Network Features (NSL-KDD Dataset)
```
Connection Record:
├── Duration: Connection length in seconds
├── Protocol Type: tcp, udp, icmp
├── Service: http, smtp, ftp, etc.
├── Flags: Connection state (SF, S1, REJ, etc.)
├── Source Bytes: Bytes from source to destination
├── Destination Bytes: Bytes from destination to source
├── Network Statistics
│   ├── Wrong Fragment Count
│   ├── Urgent Packets
│   ├── Failed Logins
│   └── Root Shell Attempts
├── Host Statistics
│   ├── Count of connections to same host
│   ├── Service error rate
│   └── Destination host features
└── Label: normal or attack
    └── Attack Types: dos, probe, r2l, u2r
```

### Prediction Output
```json
{
  "prediction": 0 or 1,        // 0=normal, 1=attack
  "confidence": 0.95,           // Probability score
  "model_name": "random_forest",
  "timestamp": "2026-05-02T...",
  "upload_id": "upload_xyz",
  "status": "success"
}
```

### Metrics Output
```json
{
  "model_name": "random_forest",
  "total_predictions": 1500,
  "attack_detected": 250,
  "normal": 1250,
  "accuracy": 0.94,
  "time_range": "week",
  "timestamp_range": {
    "start": "2026-04-25T...",
    "end": "2026-05-02T..."
  }
}
```

## 🛠️ Technology Stack

### Frontend
- **React 19.2.5**: Modern UI framework
- **AWS Amplify**: Authentication and cloud services integration
- **Chart.js**: Data visualization
- **Papa Parse**: CSV parsing for file uploads

### Backend - EC2 API Server
- **Python 3.12**: Core language
- **Flask**: REST API framework
- **Flask-CORS**: Cross-origin request handling
- **scikit-learn**: Machine learning models
- **joblib**: Model serialization
- **pandas & numpy**: Data processing

### AWS Services
- **EC2**: Runs Flask APIs for real-time predictions
- **Lambda**: Batch processing and model retraining
- **S3**: Stores models and datasets
- **DynamoDB**: Stores predictions and upload history
- **SQS**: Async job queue for batch processing
- **Amplify**: User authentication

### Machine Learning Models
- **Decision Tree**: Fast, interpretable predictions
- **Logistic Regression**: Probability-based classification
- **Random Forest**: Ensemble method for high accuracy

## 📁 Project Structure

```
cmpe_281_Cloud/
├── README.md (this file)
├── frontend/                          # React Frontend
│   ├── package.json
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── App.js                     # Main app component
│       ├── App.css                    # Global styles
│       ├── index.js                   # Entry point
│       ├── components/
│       │   ├── Login.js               # Auth component
│       │   ├── Dashboard.js           # Main dashboard
│       │   ├── Predict.js             # Real-time prediction
│       │   ├── Upload.js              # CSV upload
│       │   ├── Metrics.js             # Analytics dashboard
│       │   ├── Navbar.js              # Navigation
│       │   └── index.js
│       └── styles.js                  # Styled components
│
├── cmpe_281_backend/                  # Python Backend
│   ├── lambda_function.py             # Main Lambda handler
│   ├── batch_processor_lambda.py      # Batch processing Lambda
│   ├── ec2_api.py                     # Flask API server
│   ├── retrain_logistic_pipeline.py   # ML retraining
│   └── venv312/                       # Python virtual environment
│
├── models/                            # ML Model directory
│   ├── decision_tree.pkl
│   ├── logistic_regression.pkl
│   └── random_forest.pkl
│
└── notebooks/                         # Jupyter training notebooks
    ├── train_decision_tree.py
    ├── train_logistic_regression.py
    └── train_random_forest.py
```

## 🚀 Quick Start

### Prerequisites
- Python 3.12+
- Node.js 18+
- AWS Account with credentials configured
- Git

### Setup Backend

```bash
# Navigate to backend directory
cd cmpe_281_backend

# Create and activate virtual environment
python3 -m venv venv312
source venv312/bin/activate  # On Windows: venv312\Scripts\activate

# Install dependencies
pip install flask flask-cors boto3 scikit-learn pandas numpy joblib

# Set environment variables
export MODELS_BUCKET=honey-pot-models1
export UPLOADS_BUCKET=honey-pot-uploads1
export PREDICTIONS_TABLE=attack-detection-predictions

# Run Flask server
python ec2_api.py
```

### Setup Frontend

```bash
# Navigate to frontend directory
cd cmpe_281_Cloud/frontend

# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

## 📊 API Endpoints

### EC2 Flask API

#### Health Check
```
GET /health
Response: { "status": "healthy", "service": "EC2 ML Prediction API", "models_loaded": [...] }
```

#### Real-time Prediction
```
POST /predict
Body: {
  "features": { /* network features */ },
  "model": "random_forest"
}
Response: {
  "prediction": 1,
  "confidence": 0.95,
  "timestamp": "2026-05-02T..."
}
```

#### Get Metrics
```
POST /metrics
Body: {
  "model_name": "random_forest",
  "time_range": "week"  // 'all', 'today', 'week'
}
Response: {
  "total_predictions": 1500,
  "attack_detected": 250,
  "accuracy": 0.94
}
```

#### Upload CSV
```
POST /upload
Body: FormData with CSV file
Response: { "upload_id": "...", "status": "queued" }
```

#### Get Upload History
```
GET /history
Response: [{ "upload_id": "...", "timestamp": "...", "status": "completed" }, ...]
```

### Lambda Functions (Async)
- **Batch Processor**: Consumes SQS messages, processes CSVs
- **Metrics Aggregator**: Aggregates prediction statistics
- **Model Retrainer**: Retrains models with new data

## 📈 Attack Detection Models

### Decision Tree
- **Accuracy**: ~92%
- **Advantages**: Fast, interpretable, no preprocessing needed
- **Best for**: Real-time predictions with low latency

### Logistic Regression
- **Accuracy**: ~87%
- **Advantages**: Probability-based, good for benchmarking
- **Best for**: Baseline comparisons

### Random Forest
- **Accuracy**: ~96%
- **Advantages**: High accuracy, handles non-linear patterns
- **Best for**: Production deployments where accuracy is critical

## 🔄 Model Training

Models are trained on NSL-KDD dataset:
- **41 features** from network traffic
- **Binary classification**: Normal vs Attack
- **Attack types**: DoS, Probe, R2L, U2R

Training pipeline:
1. Download NSL-KDD dataset
2. Feature engineering (categorical encoding)
3. Train/test split (80/20)
4. Model training and hyperparameter tuning
5. Save to S3 for deployment

## 📊 Performance Metrics

Models are evaluated on:
- **Accuracy**: Percentage of correct predictions
- **Precision**: True positives / (TP + FP)
- **Recall**: True positives / (TP + FN)
- **F1-Score**: Harmonic mean of precision and recall
- **Confusion Matrix**: TP, TN, FP, FN breakdown

## 🔒 Security Considerations

- ✅ AWS IAM roles for service authentication
- ✅ CORS enabled for frontend communication
- ✅ Input validation for all API endpoints
- ✅ Error handling to prevent information leakage
- ✅ DynamoDB encryption at rest
- ✅ S3 bucket versioning and encryption

## 🐛 Troubleshooting

### Models not loading
```bash
# Check S3 bucket access
aws s3 ls s3://honey-pot-models1/

# Verify IAM permissions for EC2 instance
```

### SQS queue not processing
```bash
# Check queue messages
aws sqs get-queue-attributes --queue-url [QUEUE_URL] --attribute-names All

# Check Lambda CloudWatch logs
aws logs tail /aws/lambda/batch-processor --follow
```

### DynamoDB errors
```bash
# Check table status
aws dynamodb describe-table --table-name attack-detection-predictions

# Verify write capacity
```

## 📝 Configuration

### Environment Variables
```bash
MODELS_BUCKET=honey-pot-models1
UPLOADS_BUCKET=honey-pot-uploads1
PREDICTIONS_TABLE=attack-detection-predictions
UPLOAD_HISTORY_TABLE=upload-history
SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/.../batch-predictions-queue
DATA_BUCKET=honey-pot-data1
```

### AWS Resources Required
```
S3 Buckets:
- honey-pot-models1      (Models storage)
- honey-pot-uploads1     (User uploads)
- honey-pot-data1        (Raw datasets)

DynamoDB Tables:
- attack-detection-predictions  (Predictions)
- upload-history                (Upload logs)

SQS Queues:
- batch-predictions-queue       (Batch jobs)

Lambda Functions:
- batch-processor-lambda        (Batch processing)
- metrics-lambda                (Aggregation)
- retraining-lambda             (Model training)

EC2 Instance:
- t3.medium or larger
- Python 3.12
- Flask running on :5000
```

## 📚 References

- [NSL-KDD Dataset](https://www.unb.ca/cic/datasets/nsl-kdd.html)
- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [Flask Documentation](https://flask.palletsprojects.com/)
- [scikit-learn](https://scikit-learn.org/)
- [React Documentation](https://react.dev/)

## 👥 Team & Contributions

**Course**: CMPE 281 - Cloud Computing  
**Semester**: Spring 2026  
**Institution**: San Jose State University

## 📄 License

This project is part of the CMPE 281 Cloud Computing course.

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review AWS CloudWatch logs
3. Check application health endpoints
4. Verify AWS credentials and permissions

---

**Last Updated**: May 2, 2026

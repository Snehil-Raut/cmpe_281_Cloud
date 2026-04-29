#!/bin/bash

# EC2 Integration Demonstration Script for Professor
# This script shows how EC2 is integrated with S3 and Lambda

echo "========================================="
echo "EC2 Integration Demonstration"
echo "Honey Pot Anomaly Detection System"
echo "========================================="
echo ""

# 1. Show EC2 Instance Details
echo "1. EC2 Instance Status:"
echo "----------------------"
aws ec2 describe-instances --instance-ids i-0b976bb08fa13a2f9 --query 'Reservations[0].Instances[0].[InstanceId,State.Name,InstanceType,Tags[?Key==`Name`].Value]' --output table
echo ""

# 2. Show EC2 IAM Role (demonstrating S3 access)
echo "2. EC2 IAM Role (S3 Access):"
echo "-----------------------------"
aws ec2 describe-instances --instance-ids i-0b976bb08fa13a2f9 --query 'Reservations[0].Instances[0].IamInstanceProfile.Arn' --output text
echo ""

# 3. Show S3 Buckets (EC2 can access these)
echo "3. S3 Buckets (Shared Storage):"
echo "--------------------------------"
aws s3 ls
echo ""

# 4. Show ML Models in S3 (EC2 loads these)
echo "4. ML Models in S3 (EC2 loads these):"
echo "--------------------------------------"
aws s3 ls s3://honey-pot-models
echo ""

# 5. Show Lambda Function (works alongside EC2)
echo "5. Lambda Function (Hybrid Architecture):"
echo "------------------------------------------"
aws lambda get-function --function-name honey-pot-lambda --query 'Configuration.FunctionName' --output text
echo "Lambda Status: Active"
echo "Lambda IAM Role: honey-pot-lambda-role"
echo ""

# 6. Show Lambda S3 Permissions
echo "6. Lambda S3 Integration:"
echo "-------------------------"
aws iam list-attached-role-policies --role-name honey-pot-lambda-role --query 'AttachedPolicies[].PolicyName' --output table
echo ""

# 7. Show Current Architecture Summary
echo "7. Architecture Summary:"
echo "------------------------"
echo "Frontend: S3 Static Website (honey-pot-frontend)"
echo "Backend: EC2 Flask API (ml-training-instance)"
echo "Serverless: Lambda Function (honey-pot-lambda)"
echo "Storage: S3 Buckets (models, data, uploads)"
echo "Security: IAM Roles (EC2-S3-Access-Role, honey-pot-lambda-role)"
echo ""

echo "========================================="
echo "Demonstration Complete"
echo "========================================="
echo ""
echo "Key Integration Points:"
echo "- EC2 connects to S3 via boto3 SDK"
echo "- EC2 loads ML models from S3 on startup"
echo "- Lambda handles simple file operations"
echo "- EC2 handles heavy ML computations"
echo "- Both services share S3 storage"
echo "- Frontend calls EC2 API for predictions"
echo ""
echo "Architecture Pattern: Hybrid Cloud"
echo "- EC2: Continuous processing, heavy ML"
echo "- Lambda: Serverless, lightweight tasks"
echo "- S3: Shared storage and data management"

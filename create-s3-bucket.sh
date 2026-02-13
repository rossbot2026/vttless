#!/bin/bash

# Script to create S3 bucket in LocalStack

BUCKET_NAME="vttless-dev"

echo "Creating S3 bucket '$BUCKET_NAME' in LocalStack..."

# Wait for LocalStack to be ready
until docker-compose exec localstack awslocal s3 ls > /dev/null 2>&1; do
    echo "Waiting for LocalStack to be ready..."
    sleep 2
done

# Create bucket
docker-compose exec localstack awslocal s3 mb "s3://$BUCKET_NAME" || echo "Bucket may already exist"

# Verify bucket was created
echo "Verifying bucket creation..."
docker-compose exec localstack awslocal s3 ls

echo "✅ S3 bucket '$BUCKET_NAME' is ready for use"
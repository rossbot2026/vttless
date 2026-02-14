#!/bin/bash

# Local development environment setup script for VTTless

set -e

echo "🚀 Setting up VTTless local development environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start the services
echo "🐳 Starting Docker containers..."
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if MongoDB is ready
echo "📊 Checking MongoDB connection..."
until docker-compose exec mongo mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; do
    echo "Waiting for MongoDB to be ready..."
    sleep 2
done

echo "✅ MongoDB is ready"

# Check if LocalStack is ready
echo "☁️ Checking LocalStack connection..."
until docker-compose exec localstack awslocal s3 ls > /dev/null 2>&1; do
    echo "Waiting for LocalStack to be ready..."
    sleep 2
done

echo "✅ LocalStack is ready"

# Create S3 bucket
echo "🪣 Creating S3 bucket..."
BUCKET_NAME="vttless-dev"
docker-compose exec localstack awslocal s3 mb "s3://$BUCKET_NAME" || true
echo "✅ S3 bucket '$BUCKET_NAME' is ready"

# Show status
echo ""
echo "🎉 Local development environment is ready!"
echo ""
echo "📍 Service URLs:"
echo "   • MongoDB: mongodb://localhost:27017/vttless"
echo "   • LocalStack: http://localhost:4566"
echo "   • LocalStack UI: http://localhost:8080"
echo "   • Redis: redis://localhost:6379"
echo ""
echo "🚀 To start the application:"
echo "   • npm run backend  # Start backend on port 5000"
echo "   • npm run client   # Start client on port 3000"
echo "   • npm run eventserver  # Start event server on port 3001"
echo "   • npm run dev      # Start all services"
echo ""
echo "💡 To stop the environment: docker-compose down"
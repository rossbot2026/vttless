#!/bin/bash

echo "=== VTTless API Testing Script ==="
echo "Testing basic API endpoints without database..."
echo

# Check if backend is running
echo "1. Testing health endpoint..."
curl -s http://localhost:3001/health | jq . || echo "Backend not running or health endpoint not available"
echo

echo "2. Testing system status..."
curl -s http://localhost:3001/api/status | jq . || echo "Status endpoint not available"
echo

echo "3. Testing metrics endpoint..."
curl -s http://localhost:3001/metrics | jq . || echo "Metrics endpoint not available"
echo

echo "4. Testing authentication error handling..."
curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}' | jq .
echo

echo "5. Testing registration error handling..."
curl -s -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com","password":"weak"}' | jq .
echo

echo "=== API Testing Complete ==="
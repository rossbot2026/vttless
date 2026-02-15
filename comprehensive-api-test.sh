#!/bin/bash

echo "=== VTTless Comprehensive API Testing Report ==="
echo "Generated: $(date)"
echo

# Check server status
echo "🔍 Server Status Check:"
curl -s http://localhost:3001/health | jq '.status, .service, .timestamp' || echo "❌ Server not responding"
echo

# Test all basic endpoints
echo "📊 Basic Endpoints Test:"
echo "Health Endpoint:"
curl -s http://localhost:3001/health | jq .
echo

echo "System Status:"
curl -s http://localhost:3001/api/status | jq '.status, .timestamp, .memory' || echo "❌ Status endpoint failed"
echo

echo "Metrics:"
curl -s http://localhost:3001/metrics | jq '.memory, .cpu, .uptime' || echo "❌ Metrics endpoint failed"
echo

# Test authentication endpoints
echo "🔐 Authentication Testing:"
echo "Login (should fail):"
curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}' | jq .
echo

echo "Login with missing fields (should fail):"
curl -s -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{}' | jq .
echo

echo "Registration (should succeed):"
curl -s -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"SecurePassword123!","firstName":"Test","lastName":"User"}' | jq .
echo

echo "Registration with weak password (should fail):"
curl -s -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test2","email":"test2@example.com","password":"weak"}' | jq .
echo

# Test protected endpoint
echo "🛡️ Protected Endpoint Testing:"
echo "Access without token (should fail):"
curl -s http://localhost:3001/auth/me | jq .
echo

echo "Access with invalid token (should fail):"
curl -s -H "Authorization: Bearer invalid-token" http://localhost:3001/auth/me | jq .
echo

echo "Access with valid token (should succeed):"
curl -s -H "Authorization: Bearer valid-token" http://localhost:3001/auth/me | jq .
echo

# Test error handling
echo "🚨 Error Handling Testing:"
echo "404 Not Found:"
curl -s http://localhost:3001/nonexistent-route | jq .
echo

# Test rate limiting
echo "⚡ Rate Limiting Test:"
echo "Making 5 rapid requests to login endpoint:"
for i in {1..5}; do
  curl -s -X POST http://localhost:3001/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"test"}' | jq -r '.status // .error'
done
echo

echo "=== API Testing Complete ==="
echo "Server uptime: $(curl -s http://localhost:3001/health | jq -r '.uptime') seconds"
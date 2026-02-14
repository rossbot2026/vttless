#!/bin/bash

# Test script for VTTless local development environment

echo "🧪 Testing VTTless Local Development Environment"
echo "=============================================="

# Test backend
echo ""
echo "1. Testing Backend API..."
BACKEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health 2>/dev/null || echo "000")
if [ "$BACKEND_STATUS" = "200" ]; then
    echo "   ✅ Backend is responding (HTTP $BACKEND_STATUS)"
    
    # Test user login
    LOGIN_RESPONSE=$(curl -s -X POST http://localhost:5000/auth/login \
        -H "Content-Type: application/json" \
        -d '{"email":"test3@example.com", "password":"SecurePassword123!@#"}' 2>/dev/null)
    
    if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
        echo "   ✅ User authentication working"
        TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
        if [ -n "$TOKEN" ]; then
            echo "   🔑 Got JWT token"
            
            # Test asset upload endpoint
            ASSET_RESPONSE=$(curl -s -X POST http://localhost:5000/assets/upload-url \
                -H "Content-Type: application/json" \
                -H "Authorization: Bearer $TOKEN" \
                -d '{"fileName":"test.jpg", "fileType":"image/jpeg", "assetType":"token", "campaignId":"507f1f77bcf86cd799439011"}' 2>/dev/null)
            
            if echo "$ASSET_RESPONSE" | grep -q "uploadUrl"; then
                echo "   ✅ Asset upload endpoint working"
            else
                echo "   ❌ Asset upload endpoint failed"
            fi
        else
            echo "   ❌ No JWT token returned"
        fi
    else
        echo "   ❌ User authentication failed"
    fi
else
    echo "   ❌ Backend not responding (HTTP $BACKEND_STATUS)"
fi

# Test event server
echo ""
echo "2. Testing Event Server..."
EVENT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4001/health 2>/dev/null || echo "000")
if [ "$EVENT_STATUS" = "200" ]; then
    echo "   ✅ Event server is responding (HTTP $EVENT_STATUS)"
else
    echo "   ❌ Event server not responding (HTTP $EVENT_STATUS)"
fi

# Test client
echo ""
echo "3. Testing React Client..."
CLIENT_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "000")
if [ "$CLIENT_STATUS" = "200" ]; then
    echo "   ✅ React client is responding (HTTP $CLIENT_STATUS)"
else
    echo "   ❌ React client not responding (HTTP $CLIENT_STATUS)"
fi

# Test environment variables
echo ""
echo "4. Testing Environment Configuration..."
if [ -f "/home/openclaw/.openclaw/workspace/vttless/backend/.env" ]; then
    echo "   ✅ Backend .env exists"
    if grep -q "RESEND_API_KEY" /home/openclaw/.openclaw/workspace/vttless/backend/.env; then
        echo "   ✅ Resend API key configured"
    fi
else
    echo "   ❌ Backend .env missing"
fi

if [ -f "/home/openclaw/.openclaw/workspace/vttless/client/.env" ]; then
    echo "   ✅ Client .env exists"
else
    echo "   ❌ Client .env missing"
fi

# Test database
echo ""
echo "5. Testing Database..."
if mongod --version >/dev/null 2>&1; then
    echo "   ✅ MongoDB is installed"
else
    echo "   ⚠️  MongoDB not installed (using Memory Server in test)"
fi

# Test Docker setup
echo ""
echo "6. Testing Docker Configuration..."
if [ -f "/home/openclaw/.openclaw/workspace/vttless/docker-compose.yml" ]; then
    echo "   ✅ Docker Compose configuration exists"
    echo "   🐳 Services defined:"
    grep "container_name:" /home/openclaw/.openclaw/workspace/vttless/docker-compose.yml | sed 's/.*container_name: /      - /'
else
    echo "   ❌ Docker Compose configuration missing"
fi

# Summary
echo ""
echo "📊 Test Summary"
echo "==============="
echo "🎯 Local development environment is ready for testing!"
echo "📍 Services:"
echo "   - Backend API: http://localhost:5000"
echo "   - Event Server: http://localhost:4001"
echo "   - React Client: http://localhost:3000"
echo ""
echo "🔧 Next steps:"
echo "   1. Fix JWT authentication middleware (passport strategy)"
echo "   2. Start LocalStack for S3 testing"
echo "   3. Test asset upload functionality"
echo "   4. Test real-time features with Socket.io"
echo ""
echo "📚 Documentation created:"
echo "   - DEV_SETUP.md: Complete setup guide"
echo "   - dev-setup.sh: One-click setup script"
echo "   - create-s3-bucket.sh: S3 bucket setup"
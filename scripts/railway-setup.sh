#!/bin/bash
# Railway Setup Script for vttless
# This script guides you through setting up Railway for production deployment

set -e

echo "=========================================="
echo "VTTless Railway Production Setup"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo -e "${YELLOW}Railway CLI not found. Installing...${NC}"
    npm install -g @railway/cli
fi

# Check login status
echo "Checking Railway login status..."
if ! railway whoami &> /dev/null; then
    echo -e "${YELLOW}Please login to Railway:${NC}"
    railway login
fi

echo -e "${GREEN}✓ Railway CLI authenticated${NC}"
echo ""

# Initialize project
echo "=========================================="
echo "Step 1: Initialize Railway Project"
echo "=========================================="
echo ""

if [ ! -f ".railway/config.json" ]; then
    echo "Creating new Railway project..."
    railway init
else
    echo -e "${GREEN}✓ Railway project already initialized${NC}"
    railway status
fi

echo ""
echo "=========================================="
echo "Step 2: Create Services"
echo "=========================================="
echo ""

echo "You'll need to create 3 services in Railway dashboard:"
echo "  1. vttless-backend (API server)"
echo "  2. vttless-client (React frontend)"
echo "  3. vttless-eventserver (WebSocket server)"
echo ""
echo -e "${YELLOW}Opening Railway dashboard...${NC}"
echo ""
echo "Instructions:"
echo "  1. Click 'New Service' for each service"
echo "  2. Select 'Empty Service' for each"
echo "  3. Name them: vttless-backend, vttless-client, vttless-eventserver"
echo ""

read -p "Press Enter to open Railway dashboard..."
railway open

echo ""
echo "=========================================="
echo "Step 3: Add MongoDB Database"
echo "=========================================="
echo ""

echo "In Railway dashboard:"
echo "  1. Click 'New' → 'Database' → 'Add MongoDB'"
echo "  2. Copy the MongoDB connection string"
echo "  3. Add it as MONGODB_URI in backend environment variables"
echo ""
echo -e "${YELLOW}Note: Railway will auto-generate the connection string${NC}"
echo ""

# Generate secure secrets
echo "=========================================="
echo "Step 4: Generate Secure Secrets"
echo "=========================================="
echo ""

echo "Generating secure JWT secrets for production..."
echo ""

JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
JWT_REFRESH_SECRET=$(openssl rand -base64 64 | tr -d '\n')
SESSION_SECRET=$(openssl rand -base64 32 | tr -d '\n')

echo -e "${GREEN}Generated secrets (save these for Railway dashboard):${NC}"
echo ""
echo "JWT_SECRET_KEY:"
echo "$JWT_SECRET"
echo ""
echo "JWT_REFRESH_SECRET_KEY:"
echo "$JWT_REFRESH_SECRET"
echo ""
echo "MONGO_SESSION_SECRET:"
echo "$SESSION_SECRET"
echo ""

echo "=========================================="
echo "Step 5: Set Environment Variables"
echo "=========================================="
echo ""

echo "Go to Railway dashboard for each service and set:"
echo ""

echo -e "${GREEN}vttless-backend:${NC}"
echo "  Required:"
echo "    NODE_ENV=production"
echo "    MONGODB_URI=<from MongoDB service>"
echo "    JWT_SECRET_KEY=<generated above>"
echo "    JWT_REFRESH_SECRET_KEY=<generated above>"
echo "    JWT_ISSUER=vttless"
echo "    JWT_AUDIENCE=vttless-app"
echo "    JWT_EXPIRATION_MS=86400000"
echo "    JWT_REFRESH_EXPIRATION_MS=604800000"
echo "    MONGO_SESSION_SECRET=<generated above>"
echo "    AWS_ACCESS_KEY_ID=<your aws key>"
echo "    AWS_SECRET_ACCESS_KEY=<your aws secret>"
echo "    AWS_REGION=us-east-1"
echo "    S3_BUCKET_NAME=<your bucket>"
echo "    CLIENT_URL=<will be vttless-client URL>"
echo ""

echo -e "${GREEN}vttless-client:${NC}"
echo "  Build Command Arguments:"
echo "    REACT_APP_BACKEND_BASE_URL=<vttless-backend URL>"
echo "    REACT_APP_SOCKET_URL=<vttless-eventserver URL>"
echo ""

echo -e "${GREEN}vttless-eventserver:${NC}"
echo "  Required:"
echo "    PORT=3001"
echo "    CLIENT_URL=<vttless-client URL>"
echo ""

# GitHub token setup
echo "=========================================="
echo "Step 6: GitHub Actions Setup"
echo "=========================================="
echo ""

echo "Create Railway token for GitHub Actions:"
echo "  1. Go to Railway dashboard → Account → Tokens"
echo "  2. Create new token with 'Deploy' permissions"
echo "  3. Copy the token"
echo ""
echo "Add token to GitHub Secrets:"
echo "  1. Go to GitHub repo → Settings → Secrets → Actions"
echo "  2. Click 'New repository secret'"
echo "  3. Name: RAILWAY_TOKEN"
echo "  4. Value: <your railway token>"
echo ""

echo "Also add health check URLs (after first deploy):"
echo "  - BACKEND_HEALTH_URL: https://your-backend-url.railway.app"
echo "  - EVENTSERVER_HEALTH_URL: https://your-eventserver-url.railway.app"
echo ""

read -p "Press Enter to open GitHub settings..."
open "https://github.com/rossbot2026/vttless/settings/secrets/actions" 2>/dev/null || xdg-open "https://github.com/rossbot2026/vttless/settings/secrets/actions" 2>/dev/null || echo "Please open: https://github.com/rossbot2026/vttless/settings/secrets/actions"

echo ""
echo "=========================================="
echo "Step 7: Deploy"
echo "=========================================="
echo ""

echo "Once environment variables are set:"
echo "  1. Push to master/main branch to trigger deployment"
echo "  2. Or deploy manually:"
echo ""
echo "     railway up -s vttless-backend"
echo "     railway up -s vttless-client"
echo "     railway up -s vttless-eventserver"
echo ""

echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "  1. Configure environment variables in Railway"
echo "  2. Add RAILWAY_TOKEN to GitHub Secrets"
echo "  3. Push to master to trigger deployment"
echo "  4. Update CLIENT_URL after first deployment"
echo "  5. Update REACT_APP_* URLs in client build args"
echo ""
echo "For troubleshooting, see docs/DEPLOYMENT.md"
echo ""

# Railway Environment Variables Setup Guide

This document describes all environment variables required for VTTless services running on Railway and how to configure them.

## Table of Contents

1. [Overview](#overview)
2. [Backend Service Variables](#backend-service-variables)
3. [Client Service Variables](#client-service-variables)
4. [EventServer Service Variables](#eventserver-service-variables)
5. [Step-by-Step Setup](#step-by-step-setup)
6. [Generating Secure Secrets](#generating-secure-secrets)
7. [Troubleshooting](#troubleshooting)

---

## Overview

Railway uses environment variables to configure each service. These are set in the Railway dashboard and are injected into the running containers at runtime.

**Important**: Never commit sensitive values to your repository. Use Railway's dashboard to manage all secrets.

### Service Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Client      │────▶│     Backend     │────▶│    MongoDB      │
│   (React App)   │     │   (API Server)  │     │   (Database)    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │   EventServer   │
                        │  (WebSocket)    │
                        └─────────────────┘
```

---

## Backend Service Variables

### Required Variables

These must be set for the backend to function properly:

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `NODE_ENV` | String | Environment mode | `production` |
| `MONGODB_URI` | String | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/vttless` |
| `JWT_SECRET_KEY` | Secret | JWT signing key (64+ chars) | Generate with `openssl rand -base64 64` |
| `JWT_REFRESH_SECRET_KEY` | Secret | JWT refresh token signing key | Generate with `openssl rand -base64 64` |
| `JWT_ISSUER` | String | JWT issuer claim | `vttless` |
| `JWT_AUDIENCE` | String | JWT audience claim | `vttless-app` |
| `JWT_EXPIRATION_MS` | Number | Access token expiry (ms) | `86400000` (24 hours) |
| `JWT_REFRESH_EXPIRATION_MS` | Number | Refresh token expiry (ms) | `604800000` (7 days) |
| `MONGO_SESSION_SECRET` | Secret | Session cookie secret | Generate with `openssl rand -base64 32` |
| `AWS_ACCESS_KEY_ID` | Secret | AWS IAM access key | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | Secret | AWS IAM secret key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_REGION` | String | AWS region | `us-east-1` |
| `S3_BUCKET_NAME` | String | S3 bucket for uploads | `vttless-production-uploads` |
| `CLIENT_URL` | String | Frontend URL for CORS | `https://vttless-client-production.up.railway.app` |
| `COOKIE_DOMAIN` | String | Cookie domain scope | `.railway.app` |

### Optional Variables

| Variable | Type | Description | Default |
|----------|------|-------------|---------|
| `PORT` | Number | Server port | Auto-set by Railway |
| `LOG_LEVEL` | String | Logging verbosity | `info` |
| `GOOGLE_CLIENT_ID` | Secret | Google OAuth client ID | - |
| `GOOGLE_CLIENT_SECRET` | Secret | Google OAuth client secret | - |
| `FACEBOOK_APP_ID` | Secret | Facebook OAuth app ID | - |
| `FACEBOOK_APP_SECRET` | Secret | Facebook OAuth app secret | - |
| `GITHUB_CLIENT_ID` | Secret | GitHub OAuth client ID | - |
| `GITHUB_CLIENT_SECRET` | Secret | GitHub OAuth client secret | - |

### Backend Variable Quick Setup

Copy-paste ready for Railway dashboard:

```
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/vttless?retryWrites=true&w=majority
JWT_SECRET_KEY=[GENERATE_64_CHAR]
JWT_REFRESH_SECRET_KEY=[GENERATE_64_CHAR]
JWT_ISSUER=vttless
JWT_AUDIENCE=vttless-app
JWT_EXPIRATION_MS=86400000
JWT_REFRESH_EXPIRATION_MS=604800000
MONGO_SESSION_SECRET=[GENERATE_32_CHAR]
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
S3_BUCKET_NAME=vttless-production-uploads
CLIENT_URL=https://vttless-client-production.up.railway.app
COOKIE_DOMAIN=.railway.app
```

---

## Client Service Variables

### Build Arguments (Required)

These are used during the Docker build process:

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `REACT_APP_BACKEND_BASE_URL` | String | Backend API URL | `https://vttless-backend-production.up.railway.app` |
| `REACT_APP_SOCKET_URL` | String | EventServer WebSocket URL | `https://vttless-eventserver-production.up.railway.app` |

### Runtime Variables

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `NODE_ENV` | String | Environment mode | `production` |
| `PORT` | Number | Server port | Auto-set by Railway |

### Client Variable Quick Setup

```
REACT_APP_BACKEND_BASE_URL=https://vttless-backend-production.up.railway.app
REACT_APP_SOCKET_URL=https://vttless-eventserver-production.up.railway.app
NODE_ENV=production
```

**Note**: The `REACT_APP_*` variables must also be set in GitHub Secrets for the Docker build process. See [GITHUB_SECRETS.md](./GITHUB_SECRETS.md).

---

## EventServer Service Variables

### Required Variables

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `NODE_ENV` | String | Environment mode | `production` |
| `CLIENT_URL` | String | Allowed CORS origin | `https://vttless-client-production.up.railway.app` |
| `EVENTSERVER_PORT` | Number | WebSocket server port | `3001` |

### Optional Variables

| Variable | Type | Description | Default |
|----------|------|-------------|---------|
| `PORT` | Number | Server port | Auto-set by Railway |
| `LOG_LEVEL` | String | Logging verbosity | `info` |

### EventServer Variable Quick Setup

```
NODE_ENV=production
CLIENT_URL=https://vttless-client-production.up.railway.app
EVENTSERVER_PORT=3001
```

---

## Step-by-Step Setup

### Step 1: Access Railway Dashboard

1. Go to https://railway.app/dashboard
2. Select the **vttless** project (or create it)
3. You should see three services:
   - `vttless-backend`
   - `vttless-client`
   - `vttless-eventserver`

### Step 2: Set Up MongoDB

You have two options for MongoDB:

#### Option A: Railway Managed MongoDB (Recommended)

1. Click **New** → **Database** → **Add MongoDB**
2. Railway will automatically:
   - Create a MongoDB instance
   - Add the `MONGODB_URI` to your services
   - Configure networking

#### Option B: MongoDB Atlas (External)

1. Go to https://cloud.mongodb.com
2. Create a new cluster
3. Get your connection string:
   ```
   mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/vttless?retryWrites=true&w=majority
   ```
4. Whitelist Railway IPs in Atlas Network Access

### Step 3: Configure Backend Service

1. Click on **vttless-backend** service
2. Go to **Variables** tab
3. Add variables from [Backend Service Variables](#backend-service-variables) section

**Quick Add** (copy-paste all at once):

```bash
# In Railway dashboard, click "Raw Editor" and paste:
NODE_ENV=production
JWT_ISSUER=vttless
JWT_AUDIENCE=vttless-app
JWT_EXPIRATION_MS=86400000
JWT_REFRESH_EXPIRATION_MS=604800000
AWS_REGION=us-east-1
S3_BUCKET_NAME=vttless-production-uploads
CLIENT_URL=https://vttless-client-production.up.railway.app
COOKIE_DOMAIN=.railway.app
```

Then add secrets individually:
- `MONGODB_URI`
- `JWT_SECRET_KEY`
- `JWT_REFRESH_SECRET_KEY`
- `MONGO_SESSION_SECRET`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

### Step 4: Configure Client Service

1. Click on **vttless-client** service
2. Go to **Variables** tab
3. Add:

```
NODE_ENV=production
REACT_APP_BACKEND_BASE_URL=https://vttless-backend-production.up.railway.app
REACT_APP_SOCKET_URL=https://vttless-eventserver-production.up.railway.app
```

**Important**: Also add these to GitHub Secrets for the build process!

### Step 5: Configure EventServer Service

1. Click on **vttless-eventserver** service
2. Go to **Variables** tab
3. Add:

```
NODE_ENV=production
CLIENT_URL=https://vttless-client-production.up.railway.app
EVENTSERVER_PORT=3001
```

### Step 6: Deploy

1. After setting all variables, Railway will auto-deploy
2. Monitor deployment logs in the **Deployments** tab
3. Check health endpoints:
   ```bash
   curl https://vttless-backend-production.up.railway.app/health
   curl https://vttless-eventserver-production.up.railway.app/health
   ```

---

## Generating Secure Secrets

### JWT Secrets (64 characters)

```bash
# Generate a 64-character base64-encoded secret
openssl rand -base64 64

# Example output:
# aBcD1234eFgH5678iJkL9012mNoP3456qRsT7890uVwX1234yZaBcD5678eFgH9012iJkL3456=
```

### Session Secret (32 characters)

```bash
# Generate a 32-character base64-encoded secret
openssl rand -base64 32

# Example output:
# mNoP3456qRsT7890uVwX1234yZaBcD56
```

### Generate All Secrets at Once

Run this script to generate all required secrets:

```bash
#!/bin/bash
echo "=== VTTless Railway Secrets ==="
echo ""
echo "JWT_SECRET_KEY:"
openssl rand -base64 64
echo ""
echo "JWT_REFRESH_SECRET_KEY:"
openssl rand -base64 64
echo ""
echo "MONGO_SESSION_SECRET:"
openssl rand -base64 32
echo ""
echo "=== Copy these values to Railway dashboard ==="
```

---

## AWS S3 Setup

### Creating an IAM User for VTTless

1. Go to AWS Console → IAM → Users → Add User
2. User name: `vttless-production`
3. Access type: **Programmatic access**
4. Attach policies: **AmazonS3FullAccess** (or create custom policy)
5. Save the Access Key ID and Secret Access Key

### Creating the S3 Bucket

1. Go to AWS Console → S3 → Create Bucket
2. Bucket name: `vttless-production-uploads` (must be globally unique)
3. Region: Same as your AWS_REGION variable
4. Block all public access: **No** (needed for image serving)
5. Enable CORS:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
       "AllowedOrigins": ["https://vttless-client-production.up.railway.app"],
       "ExposeHeaders": []
     }
   ]
   ```

---

## Troubleshooting

### Issue: "Cannot connect to MongoDB"

**Symptoms**: Backend fails to start with MongoDB connection errors

**Solutions**:
1. Verify `MONGODB_URI` is set correctly
2. Check MongoDB Atlas IP whitelist includes Railway IPs
3. Ensure credentials in the URI are correct
4. Verify the database user has proper permissions

---

### Issue: "JWT verification failed"

**Symptoms**: Users can't authenticate, JWT errors in logs

**Solutions**:
1. Verify `JWT_SECRET_KEY` and `JWT_REFRESH_SECRET_KEY` are set
2. Ensure secrets are at least 32 characters
3. Check `JWT_ISSUER` and `JWT_AUDIENCE` match the client
4. Verify system time is synchronized (JWT is time-sensitive)

---

### Issue: "CORS errors in browser"

**Symptoms**: Frontend can't connect to backend, CORS errors in console

**Solutions**:
1. Verify `CLIENT_URL` matches the actual client URL exactly
2. Check `COOKIE_DOMAIN` is set correctly (`.railway.app` for Railway domains)
3. Ensure no trailing slashes in URLs
4. Verify CORS is configured in the backend code

---

### Issue: "File uploads fail"

**Symptoms**: Cannot upload images/maps

**Solutions**:
1. Verify AWS credentials are correct
2. Check S3 bucket exists and is in the right region
3. Ensure S3 CORS allows the client domain
4. Verify the IAM user has S3 permissions
5. Check `S3_BUCKET_NAME` is set correctly

---

### Issue: "WebSocket connection fails"

**Symptoms**: Real-time features not working

**Solutions**:
1. Verify `REACT_APP_SOCKET_URL` points to EventServer
2. Check `CLIENT_URL` in EventServer matches the client domain
3. Ensure WebSocket is not blocked by firewall
4. Verify EventServer is running and healthy

---

### Issue: "Session not persisting"

**Symptoms**: Users logged out after refresh

**Solutions**:
1. Verify `MONGO_SESSION_SECRET` is set
2. Check `COOKIE_DOMAIN` matches your domain
3. Ensure cookies are being set with `secure: true` in production
4. Verify the client is sending cookies with requests

---

## Environment-Specific Configurations

### Staging Environment

For a staging environment, use these different values:

```
NODE_ENV=staging
S3_BUCKET_NAME=vttless-staging-uploads
CLIENT_URL=https://vttless-client-staging.up.railway.app
```

Use different secrets for staging vs production!

### Local Development

For local development, create a `.env` file:

```
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/vttless
JWT_SECRET_KEY=dev-secret-not-for-production
JWT_REFRESH_SECRET_KEY=dev-refresh-secret
MONGO_SESSION_SECRET=dev-session-secret
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_REGION=us-east-1
S3_BUCKET_NAME=vttless-dev
CLIENT_URL=http://localhost:3000
COOKIE_DOMAIN=localhost
```

---

## Security Checklist

Before going live, verify:

```
☐ JWT_SECRET_KEY is unique and 64+ characters
☐ JWT_REFRESH_SECRET_KEY is different from JWT_SECRET_KEY
☐ MONGO_SESSION_SECRET is unique and 32+ characters
☐ AWS credentials have minimal required permissions
☐ S3 bucket is not publicly writable (only readable for assets)
☐ MongoDB is not exposed to the internet (use Railway private networking)
☐ All secrets are set in Railway (not in code)
☐ No .env files committed to Git
☐ COOKIE_DOMAIN is set correctly for production
☐ CORS is configured to allow only your client domain
```

---

## Related Documentation

- [GitHub Secrets Setup](./GITHUB_SECRETS.md) - CI/CD secrets configuration
- [Deployment Guide](./DEPLOYMENT.md) - Full deployment procedures
- [Railway Documentation](https://docs.railway.app/)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)

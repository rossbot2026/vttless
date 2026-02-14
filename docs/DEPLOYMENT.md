# Deployment Guide

This document describes the deployment pipeline and procedures for vttless.

## Table of Contents

1. [Overview](#overview)
2. [Railway Deployment Pipeline](#railway-deployment-pipeline)
3. [Environment Variables](#environment-variables)
4. [Manual Deployment](#manual-deployment)
5. [Rollback Procedures](#rollback-procedures)
6. [Monitoring & Health Checks](#monitoring--health-checks)
7. [Troubleshooting](#troubleshooting)

---

## Overview

VTTless uses a continuous deployment pipeline with Railway as the hosting platform. The deployment process is fully automated through GitHub Actions.

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     GitHub Repository                        │
│                   (rossbot2026/vttless)                      │
└────────────────────┬────────────────────────────────────────┘
                     │
           Push to master/main
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Actions                            │
│  ┌──────────┐   ┌──────────────┐   ┌─────────────────────┐  │
│  │   Test   │──▶│ Build Docker │──▶│   Deploy Services   │  │
│  │   Job    │   │     Images   │   │                     │  │
│  └──────────┘   └──────────────┘   └─────────────────────┘  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                      Railway Platform                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ vttless-     │  │ vttless-     │  │ vttless-     │       │
│  │ backend      │  │ eventserver  │  │ client       │       │
│  │ (API Server) │  │ (WebSocket)  │  │ (Frontend)   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### Service URLs (Production)

- Backend API: `https://vttless-backend-production.up.railway.app`
- Event Server: `https://vttless-eventserver-production.up.railway.app`
- Client App: `https://vttless-client-production.up.railway.app`

---

## Railway Deployment Pipeline

### Automatic Deployment

Deployments are triggered automatically when code is pushed to `master` or `main` branches:

1. **Test Phase**: Jest tests run (unit, integration, API tests)
2. **Build Phase**: Docker images are built for all services
3. **Deploy Phase**: Services are deployed to Railway in order:
   - Backend → Client → EventServer

### Deployment Flow

```yaml
Push to main
    │
    ▼
┌─────────────┐
│  Test Job   │  ← Runs on every push/PR
│  (Jest)     │
└──────┬──────┘
       │ Pass?
       ▼
┌─────────────┐
│ Build Docker│  ← Validates Dockerfiles
│ Images      │
└──────┬──────┘
       │ Pass?
       ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Deploy    │────▶│   Deploy    │────▶│   Deploy    │
│   Backend   │     │   Client    │     │ Eventserver │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       └───────────────────┴───────────────────┘
                           │
                           ▼
                ┌─────────────────┐
                │  Health Check   │
                │  Post-Deploy    │
                └─────────────────┘
```

### Environment Protection

- **Production Environment**: Deployments require passing all tests
- **GitHub Environment**: Configured with protection rules (optional approval)
- **Secrets Management**: All secrets stored in GitHub Secrets, not in repo

---

## Environment Variables

### Production Variables (Set in Railway Dashboard)

These variables must be configured in the Railway dashboard for each service:

#### Backend Service

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://...` |
| `JWT_SECRET_KEY` | JWT signing secret | Generate with `openssl rand -base64 64` |
| `JWT_REFRESH_SECRET_KEY` | JWT refresh token secret | Generate with `openssl rand -base64 64` |
| `JWT_ISSUER` | JWT issuer claim | `vttless` |
| `JWT_AUDIENCE` | JWT audience claim | `vttless-app` |
| `JWT_EXPIRATION_MS` | Access token expiry | `86400000` (24h) |
| `JWT_REFRESH_EXPIRATION_MS` | Refresh token expiry | `604800000` (7d) |
| `MONGO_SESSION_SECRET` | Session cookie secret | Generate with `openssl rand -base64 32` |
| `AWS_ACCESS_KEY_ID` | AWS S3 access key | `AKIA...` |
| `AWS_SECRET_ACCESS_KEY` | AWS S3 secret key | `...` |
| `AWS_REGION` | AWS region | `us-east-1` |
| `S3_BUCKET_NAME` | S3 bucket for uploads | `vttless-uploads` |
| `CLIENT_URL` | Frontend URL | `https://vttless-client...railway.app` |
| `PORT` | Server port | `5000` (auto-set) |
| `COOKIE_DOMAIN` | Cookie domain | `.railway.app` |

#### Client Service (Build Args)

| Variable | Description |
|----------|-------------|
| `REACT_APP_BACKEND_BASE_URL` | Backend API URL |
| `REACT_APP_SOCKET_URL` | EventServer WebSocket URL |

#### EventServer Service

| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `3001` (auto-set) |
| `CLIENT_URL` | Allowed CORS origin | `https://vttless-client...railway.app` |

### GitHub Secrets Required

Configure these in GitHub → Settings → Secrets → Actions:

| Secret | Description |
|--------|-------------|
| `RAILWAY_TOKEN` | Railway CLI token for deployment |
| `BACKEND_HEALTH_URL` | Backend health check URL |
| `EVENTSERVER_HEALTH_URL` | EventServer health check URL |

---

## Manual Deployment

### Prerequisites

1. Install Railway CLI: `npm install -g @railway/cli`
2. Login: `railway login`
3. Ensure you have access to the vttless Railway project

### Deploy Individual Services

```bash
# Deploy backend
cd /path/to/vttless
railway up -s vttless-backend

# Deploy client
railway up -s vttless-client

# Deploy eventserver
railway up -s vttless-eventserver
```

### Deploy All Services

```bash
# Deploy all services sequentially
cd /path/to/vttless

# Backend first (API dependency)
railway up -s vttless-backend

# Then client and eventserver (can be parallel)
railway up -s vttless-client &
railway up -s vttless-eventserver &
wait
```

### View Logs

```bash
# Backend logs
railway logs -s vttless-backend

# Client logs
railway logs -s vttless-client

# EventServer logs
railway logs -s vttless-eventserver

# Follow logs
railway logs -s vttless-backend -f
```

---

## Rollback Procedures

### Automatic Rollback

Railway automatically rolls back failed deployments when health checks fail:

1. Deployment is marked unhealthy if `/health` returns non-200
2. Railway reverts to previous successful deployment
3. Logs available in Railway dashboard

### Manual Rollback

If automatic rollback fails or you need to revert manually:

```bash
# List deployments
railway deployments -s vttless-backend

# Rollback to specific deployment
railway rollback -s vttless-backend <deployment-id>
```

### Emergency Rollback via Git

```bash
# Revert last commit
git revert HEAD

# Push to trigger new deployment with old code
git push origin main

# Or rollback to specific commit
git reset --hard <commit-hash>
git push origin main --force  # ⚠️ Use with caution
```

### Database Rollback

⚠️ **WARNING**: Database migrations are not automatically rolled back.

Before rolling back:
1. Check if database schema changes were made
2. Manually revert migrations if necessary
3. Backup production database before major releases

---

## Monitoring & Health Checks

### Health Check Endpoints

| Service | Endpoint | Expected Response |
|---------|----------|-------------------|
| Backend | `GET /health` | `{"status":"ok","service":"backend"}` |
| EventServer | `GET /health` | `{"status":"ok","service":"eventserver"}` |

### Post-Deploy Checks

After deployment, the pipeline automatically checks:

1. Backend responds to health check
2. EventServer responds to health check
3. Client static assets are served

### Monitoring Tools

- **Railway Dashboard**: https://railway.app/dashboard
  - View logs, metrics, and deployment status
- **GitHub Actions**: Check workflow runs in repo
- **Health Status**: GitHub commit status (green checkmark on PRs)

### Setting Up Alerts (Optional)

1. Go to Railway dashboard
2. Select service → Settings → Notifications
3. Configure webhook or email alerts for:
   - Deployment failures
   - Health check failures
   - High resource usage

---

## Troubleshooting

### Common Issues

#### 1. CORS Errors

**Symptoms**: Frontend can't connect to backend

**Solution**:
```javascript
// Check backend CORS settings
// Should match CLIENT_URL environment variable
app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true
}));
```

#### 2. WebSocket Connection Fails

**Symptoms**: Real-time features not working

**Solution**:
- Verify `REACT_APP_SOCKET_URL` points to EventServer
- Check EventServer CORS allows client domain
- Ensure WebSocket is supported (Railway supports WS/WSS)

#### 3. File Upload Fails

**Symptoms**: Cannot upload maps/images

**Solution**:
- Verify AWS credentials in Railway environment variables
- Check S3 bucket CORS settings
- Ensure bucket exists and is accessible

#### 4. JWT Authentication Fails

**Symptoms**: Users can't log in after deployment

**Solution**:
- Check `JWT_SECRET_KEY` is set (not using default)
- Verify `JWT_ISSUER` and `JWT_AUDIENCE` match
- Ensure cookies are set with correct domain

#### 5. Build Failures

**Symptoms**: Docker build fails in pipeline

**Solutions**:
```bash
# Test build locally
docker build -f Dockerfile.backend -t vttless-backend .
docker build -f Dockerfile.client -t vttless-client .
docker build -f Dockerfile.eventserver -t vttless-eventserver .

# Check Dockerfile paths
# Verify node_modules are not copied (.dockerignore)
```

### Getting Help

1. **Check GitHub Actions logs** for build/test errors
2. **Check Railway logs** with `railway logs -s <service>`
3. **Verify environment variables** in Railway dashboard
4. **Review health check endpoints** manually:
   ```bash
   curl https://vttless-backend-production.up.railway.app/health
   ```

---

## Security Notes

### Secrets Management

- ✅ **DO**: Store secrets in Railway dashboard
- ✅ **DO**: Store tokens in GitHub Secrets
- ❌ **DON'T**: Commit secrets to GitHub
- ❌ **DON'T**: Include .env files in Docker images

### Production JWT Secrets

Generate and rotate regularly:

```bash
# Generate new JWT secret
openssl rand -base64 64

# Update in Railway dashboard for each service
```

### Database Security

- Use Railway's managed MongoDB for production
- Enable MongoDB authentication
- Restrict network access to Railway IPs only
- Regular backups enabled

---

## Cost Estimation

**Monthly costs for production deployment:**

| Resource | Estimated Cost |
|----------|---------------|
| 3 Services (backend, client, eventserver) | ~$15-25/month |
| Managed MongoDB | ~$5-10/month |
| S3 Storage (variable) | ~$0-5/month |
| **Total Estimated** | **~$20-40/month** |

Costs vary based on usage and can be monitored in Railway dashboard.

---

## Related Documentation

- [Railway Documentation](https://docs.railway.app/)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Project Testing Guide](../TESTING_INFRASTRUCTURE.md)
- [JWT Security Implementation](../JWT_SECURITY_IMPLEMENTATION.md)

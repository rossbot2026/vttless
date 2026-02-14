# VTTLESS Deployment Guide

This document describes the deployment pipeline and procedures for the VTTLESS application.

## Architecture Overview

VTTLESS is deployed as three separate services on Railway:

| Service | Description | Port | Docker Image |
|---------|-------------|------|--------------|
| `vttless-backend` | Express API server | 3001 | `Dockerfile.backend` |
| `vttless-client` | React SPA (nginx) | 80 | `Dockerfile.client` |
| `vttless-eventserver` | Socket.io WebSocket server | 4001 | `Dockerfile.eventserver` |

## Deployment Pipeline

### GitHub Actions Workflow

The deployment pipeline is defined in `.github/workflows/deploy.yml`:

```
Push/PR to main
       │
       ▼
┌──────────────┐
│  Run Tests   │ ← Unit, Integration, API tests
│   (Matrix)   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ Build Docker │ ← Build all 3 service images
│    Images    │
└──────┬───────┘
       │
       ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Deploy     │────▶│   Deploy     │────▶│   Deploy     │
│   Backend    │     │   Client     │     │ EventServer  │
└──────┬───────┘     └──────────────┘     └──────────────┘
       │
       ▼
┌──────────────┐
│ Health Check │ ← Verify all services respond
└──────────────┘
```

### Environment Protection

Production deployments require:
1. All tests must pass
2. Docker images must build successfully
3. Manual approval for each service deployment (configured in GitHub Environments)

## Railway Configuration

### Project Structure

```
Railway Project: vttless
├── Environment: production
│   ├── Service: vttless-backend
│   ├── Service: vttless-client
│   └── Service: vttless-eventserver
```

### Required Environment Variables

#### Backend Service (`vttless-backend`)

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | ✅ |
| `JWT_SECRET_KEY` | JWT signing secret | ✅ |
| `JWT_REFRESH_SECRET_KEY` | JWT refresh token secret | ✅ |
| `JWT_ISSUER` | JWT issuer claim | ✅ |
| `JWT_AUDIENCE` | JWT audience claim | ✅ |
| `JWT_EXPIRATION_MS` | Access token expiry (ms) | ✅ |
| `JWT_REFRESH_EXPIRATION_MS` | Refresh token expiry (ms) | ✅ |
| `AWS_ACCESS_KEY_ID` | AWS credentials | ✅ |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials | ✅ |
| `AWS_REGION` | AWS S3 region | ✅ |
| `S3_BUCKET_NAME` | S3 bucket for assets | ✅ |
| `CLIENT_URL` | Frontend URL (CORS) | ✅ |
| `NODE_ENV` | Set to `production` | ✅ |
| `GOOGLE_CLIENT_ID` | OAuth (optional) | ❌ |
| `GOOGLE_CLIENT_SECRET` | OAuth (optional) | ❌ |
| `FACEBOOK_APP_ID` | OAuth (optional) | ❌ |
| `FACEBOOK_APP_SECRET` | OAuth (optional) | ❌ |
| `GITHUB_CLIENT_ID` | OAuth (optional) | ❌ |
| `GITHUB_CLIENT_SECRET` | OAuth (optional) | ❌ |

#### Client Service (`vttless-client`)

| Variable | Description | Required |
|----------|-------------|----------|
| `REACT_APP_BACKEND_BASE_URL` | Backend API URL | ✅ |
| `REACT_APP_SOCKET_URL` | WebSocket server URL | ✅ |

#### EventServer Service (`vttless-eventserver`)

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (usually auto-set by Railway) | ✅ |
| `CLIENT_URL` | Frontend URL (CORS) | ✅ |
| `NODE_ENV` | Set to `production` | ✅ |

## Manual Deployment

### Using Railway CLI

1. **Login to Railway:**
   ```bash
   railway login
   ```

2. **Link to project:**
   ```bash
   railway link
   ```

3. **Deploy a specific service:**
   ```bash
   railway up --service=vttless-backend
   railway up --service=vttless-client
   railway up --service=vttless-eventserver
   ```

### Environment Variables Management

```bash
# Set environment variable for a service
railway variables --service=vttless-backend --set "KEY=value"

# View environment variables
railway variables --service=vttless-backend
```

## Health Checks

Each service exposes a health endpoint:

- Backend: `GET /health` → `{ "status": "ok", "service": "backend" }`
- EventServer: `GET /health` → `{ "status": "ok", "service": "eventserver" }`
- Client: HTTP 200 on root path

## Troubleshooting

### Deployment Failures

1. **Check Railway logs:**
   ```bash
   railway logs --service=vttless-backend
   ```

2. **Verify environment variables** are set in Railway dashboard

3. **Check GitHub Actions logs** for build/test failures

### Common Issues

| Issue | Solution |
|-------|----------|
| CORS errors | Verify `CLIENT_URL` env var is correct |
| MongoDB connection failures | Check `MONGODB_URI` format and whitelist Railway IPs |
| JWT errors | Ensure JWT secrets are set and match |
| 502 Bad Gateway | Service may be crashing; check logs |

## Security Considerations

- All secrets are stored in GitHub Secrets and Railway Environment Variables
- Never commit `.env` files or secrets to the repository
- Production JWT secrets should be strong random strings
- MongoDB should use authentication and IP whitelisting

## Related Documentation

- [Railway Documentation](https://docs.railway.app/)
- [Testing Infrastructure](./TESTING_INFRASTRUCTURE.md)
- [API Endpoints](./API_ENDPOINTS.md)

# Railway Environment Variables

This document describes all environment variables required for vttless services running on Railway.

## Backend Service Variables

### Core Configuration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | Yes | Environment mode | `production` |
| `PORT` | Auto | Server port (set by Railway) | `5000` |

### Database

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `MONGODB_URI` | Yes | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/vttless?retryWrites=true&w=majority` |

**Note:** Use Railway's managed MongoDB or MongoDB Atlas for production.

### JWT Security

| Variable | Required | Description | Generate Command |
|----------|----------|-------------|------------------|
| `JWT_SECRET_KEY` | Yes | JWT signing secret | `openssl rand -base64 64` |
| `JWT_REFRESH_SECRET_KEY` | Yes | JWT refresh token secret | `openssl rand -base64 64` |
| `JWT_ISSUER` | Yes | JWT issuer claim | `vttless` |
| `JWT_AUDIENCE` | Yes | JWT audience claim | `vttless-app` |
| `JWT_EXPIRATION_MS` | Yes | Access token expiry (ms) | `86400000` (24h) |
| `JWT_REFRESH_EXPIRATION_MS` | Yes | Refresh token expiry (ms) | `604800000` (7d) |

### Session

| Variable | Required | Description | Generate Command |
|----------|----------|-------------|------------------|
| `MONGO_SESSION_SECRET` | Yes | Session cookie secret | `openssl rand -base64 32` |
| `COOKIE_DOMAIN` | Yes | Cookie domain for cross-service auth | `.railway.app` |

### AWS S3 Configuration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `AWS_ACCESS_KEY_ID` | Yes | AWS IAM access key | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_SECRET_ACCESS_KEY` | Yes | AWS IAM secret key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_REGION` | Yes | S3 bucket region | `us-east-1` |
| `S3_BUCKET_NAME` | Yes | S3 bucket for uploads | `vttless-uploads` |

### CORS / Client Integration

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `CLIENT_URL` | Yes | Frontend URL for CORS | `https://vttless-client-production.up.railway.app` |

## Client Service Variables

The client service uses **build arguments** (not runtime environment variables):

| Build Arg | Required | Description | Example |
|-----------|----------|-------------|---------|
| `REACT_APP_BACKEND_BASE_URL` | Yes | Backend API URL | `https://vttless-backend-production.up.railway.app` |
| `REACT_APP_SOCKET_URL` | Yes | EventServer WebSocket URL | `https://vttless-eventserver-production.up.railway.app` |

**Note:** These are set in GitHub Actions during the Docker build process.

## EventServer Service Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NODE_ENV` | Yes | Environment mode | `production` |
| `PORT` | Auto | Server port (set by Railway) | `3001` |
| `CLIENT_URL` | Yes | Allowed CORS origin | `https://vttless-client-production.up.railway.app` |

## Environment Setup Script

Use this script to generate secure values:

```bash
#!/bin/bash
# generate-secrets.sh

echo "=== JWT Secrets ==="
echo "JWT_SECRET_KEY=$(openssl rand -base64 64)"
echo "JWT_REFRESH_SECRET_KEY=$(openssl rand -base64 64)"
echo ""
echo "=== Session Secret ==="
echo "MONGO_SESSION_SECRET=$(openssl rand -base64 32)"
```

## Railway Dashboard Setup

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Select the vttless project
3. Click on each service:
   - **vttless-backend**: Add all backend variables
   - **vttless-eventserver**: Add eventserver variables
   - **vttless-client**: No runtime variables needed (build args only)

### Variable Inheritance

Railway supports variable sharing between services:

```
# In vttless-backend variables
${{ shared.CLIENT_URL }}  # References shared variable
```

## Staging vs Production

### Staging Environment Variables

| Variable | Staging Value |
|----------|---------------|
| `NODE_ENV` | `staging` |
| `CLIENT_URL` | `https://vttless-client-staging.up.railway.app` |
| `JWT_ISSUER` | `vttless-staging` |
| `JWT_AUDIENCE` | `vttless-staging-app` |

### Production Environment Variables

| Variable | Production Value |
|----------|------------------|
| `NODE_ENV` | `production` |
| `CLIENT_URL` | `https://vttless-client-production.up.railway.app` |
| `JWT_ISSUER` | `vttless` |
| `JWT_AUDIENCE` | `vttless-app` |

## Variable Validation Checklist

Before first deployment:

### Backend Service
- [ ] `NODE_ENV=production`
- [ ] `MONGODB_URI` - Valid MongoDB connection string
- [ ] `JWT_SECRET_KEY` - Generated with `openssl rand -base64 64`
- [ ] `JWT_REFRESH_SECRET_KEY` - Generated with `openssl rand -base64 64`
- [ ] `JWT_ISSUER` - Set to `vttless`
- [ ] `JWT_AUDIENCE` - Set to `vttless-app`
- [ ] `JWT_EXPIRATION_MS` - Set (e.g., `86400000`)
- [ ] `JWT_REFRESH_EXPIRATION_MS` - Set (e.g., `604800000`)
- [ ] `MONGO_SESSION_SECRET` - Generated with `openssl rand -base64 32`
- [ ] `COOKIE_DOMAIN` - Set to `.railway.app`
- [ ] `AWS_ACCESS_KEY_ID` - Valid AWS key
- [ ] `AWS_SECRET_ACCESS_KEY` - Valid AWS secret
- [ ] `AWS_REGION` - Set (e.g., `us-east-1`)
- [ ] `S3_BUCKET_NAME` - Valid bucket name
- [ ] `CLIENT_URL` - Matches client service URL

### EventServer Service
- [ ] `NODE_ENV=production`
- [ ] `CLIENT_URL` - Matches client service URL

## Troubleshooting

### "JWT signature invalid" errors

**Cause:** JWT secrets don't match between services or aren't set

**Solution:**
1. Verify `JWT_SECRET_KEY` is set (not empty)
2. Ensure same secret across backend deployments
3. Check `JWT_ISSUER` and `JWT_AUDIENCE` match token claims

### "CORS policy" errors

**Cause:** `CLIENT_URL` doesn't match actual client origin

**Solution:**
1. Check Railway dashboard for actual client service URL
2. Update `CLIENT_URL` to match exactly (include `https://`)
3. Redeploy backend service

### "Cannot connect to MongoDB" errors

**Cause:** Invalid `MONGODB_URI` or network restrictions

**Solution:**
1. Verify connection string format
2. Check MongoDB Atlas IP whitelist includes Railway IPs
3. Test connection string locally with `mongosh`

### S3 upload failures

**Cause:** AWS credentials or bucket permissions

**Solution:**
1. Verify AWS credentials are valid
2. Check S3 bucket CORS settings allow Railway domain
3. Ensure IAM user has `s3:PutObject` permission

## Related Documentation

- [GitHub Secrets](./GITHUB_SECRETS.md) - CI/CD pipeline secrets
- [Deployment Guide](./DEPLOYMENT.md) - Full deployment pipeline
- [Railway Docs: Variables](https://docs.railway.app/guides/variables)

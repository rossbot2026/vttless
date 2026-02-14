# GitHub Secrets Setup Guide

This document describes all GitHub Secrets required for the VTTless CI/CD pipeline and how to configure them.

## Table of Contents

1. [Overview](#overview)
2. [Required Secrets](#required-secrets)
3. [Step-by-Step Setup](#step-by-step-setup)
4. [Secret Rotation](#secret-rotation)
5. [Troubleshooting](#troubleshooting)

---

## Overview

GitHub Secrets are encrypted environment variables stored at the repository level. They are used by GitHub Actions workflows to:

- Authenticate with Railway for deployments
- Pass build-time configuration to Docker images
- Configure health check endpoints
- Secure sensitive data (never exposed in logs)

**Important**: Secrets are NOT passed to workflows triggered by pull requests from forks for security reasons.

---

## Required Secrets

### Core Deployment Secrets

| Secret Name | Required | Description | Example Value |
|-------------|----------|-------------|---------------|
| `RAILWAY_TOKEN` | ✅ Yes | Railway CLI authentication token | `1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p` |

### Build Configuration Secrets (Client Service)

| Secret Name | Required | Description | Example Value |
|-------------|----------|-------------|---------------|
| `REACT_APP_BACKEND_BASE_URL` | ✅ Yes | Production backend API URL | `https://vttless-backend-production.up.railway.app` |
| `REACT_APP_SOCKET_URL` | ✅ Yes | Production EventServer WebSocket URL | `https://vttless-eventserver-production.up.railway.app` |

### Health Check Secrets

| Secret Name | Required | Description | Example Value |
|-------------|----------|-------------|---------------|
| `BACKEND_HEALTH_URL` | ✅ Yes | Backend health check endpoint | `https://vttless-backend-production.up.railway.app` |
| `EVENTSERVER_HEALTH_URL` | ✅ Yes | EventServer health check endpoint | `https://vttless-eventserver-production.up.railway.app` |
| `CLIENT_URL` | ✅ Yes | Client app URL for health check | `https://vttless-client-production.up.railway.app` |

---

## Step-by-Step Setup

### Step 1: Generate Railway Token

The `RAILWAY_TOKEN` is required for GitHub Actions to deploy to Railway.

1. **Install Railway CLI** (if not already installed):
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**:
   ```bash
   railway login
   ```

3. **Generate a new token**:
   ```bash
   railway token
   ```
   
   This will output a token like:
   ```
   1a2b3c4d-5e6f-7g8h-9i0j-1k2l3m4n5o6p
   ```

4. **Copy the token** - you'll need it for the next step.

**Alternative: Generate via Railway Dashboard**

1. Go to https://railway.app/dashboard
2. Click your profile picture → **Account Settings**
3. Navigate to **Tokens** tab
4. Click **New Token**
5. Name it `GitHub Actions Deployment`
6. Copy the generated token

---

### Step 2: Add Secrets to GitHub

1. **Navigate to Repository Settings**:
   - Go to your GitHub repository: `https://github.com/rossbot2026/vttless`
   - Click **Settings** tab
   - In the left sidebar, click **Secrets and variables** → **Actions**

2. **Add Each Secret**:
   - Click **New repository secret**
   - Enter the secret name (e.g., `RAILWAY_TOKEN`)
   - Enter the secret value
   - Click **Add secret**

3. **Repeat for all required secrets**:

#### Required Secrets Checklist:

```
☐ RAILWAY_TOKEN              - From railway token command
☐ REACT_APP_BACKEND_BASE_URL - https://vttless-backend-production.up.railway.app
☐ REACT_APP_SOCKET_URL       - https://vttless-eventserver-production.up.railway.app
☐ BACKEND_HEALTH_URL         - https://vttless-backend-production.up.railway.app
☐ EVENTSERVER_HEALTH_URL     - https://vttless-eventserver-production.up.railway.app
☐ CLIENT_URL                 - https://vttless-client-production.up.railway.app
```

---

### Step 3: Verify Service URLs

**Important**: The URLs above assume the default Railway service names. If you used different names when creating services, update the URLs accordingly.

To find your actual service URLs:

1. Go to https://railway.app/dashboard
2. Select your project
3. Click on each service to see its public domain
4. Update the GitHub secrets with the correct URLs

**Service URL Format**:
```
https://[service-name]-[project-name].up.railway.app
```

---

### Step 4: Test the Setup

1. **Create a test branch**:
   ```bash
   git checkout -b test/github-secrets
   ```

2. **Make a small change** (e.g., update README.md)

3. **Push to GitHub**:
   ```bash
   git push origin test/github-secrets
   ```

4. **Create a Pull Request** to `main`

5. **Check GitHub Actions**:
   - Go to **Actions** tab in your repository
   - You should see the test workflow running
   - Check that it completes successfully

6. **Verify deployment** (if pushing to main):
   - Check Railway dashboard for new deployment
   - Verify health checks pass

---

## Secret Rotation

### When to Rotate Secrets

- **Railway Token**: Every 90 days or when team members leave
- **Service URLs**: Only when services are recreated with new names
- **Immediately**: If you suspect a secret has been compromised

### How to Rotate Railway Token

1. **Revoke old token**:
   ```bash
   railway logout
   ```
   Or via Railway Dashboard → Account Settings → Tokens → Delete

2. **Generate new token**:
   ```bash
   railway token
   ```

3. **Update in GitHub**:
   - Go to Settings → Secrets and variables → Actions
   - Find `RAILWAY_TOKEN`
   - Click **Update**
   - Enter the new token value

4. **Test deployment**:
   - Trigger a deployment by pushing to main
   - Verify it succeeds

---

## Troubleshooting

### Issue: "RAILWAY_TOKEN not found"

**Symptoms**: GitHub Actions fails with:
```
Error: Input required and not supplied: railway_token
```

**Solution**:
1. Verify `RAILWAY_TOKEN` is set in GitHub Secrets
2. Check the secret name matches exactly (case-sensitive)
3. Ensure you're looking at **Repository secrets**, not Environment secrets
4. Re-add the secret if necessary

---

### Issue: "Authentication failed"

**Symptoms**: Deployment fails with authentication error

**Solution**:
1. Verify the Railway token is valid:
   ```bash
   railway whoami
   ```
2. Check that the token has access to the project
3. Generate a new token if the old one was revoked
4. Ensure the GitHub secret was updated with the new token

---

### Issue: Health check fails after deployment

**Symptoms**: Deployment succeeds but health check fails

**Solution**:
1. Verify the health check URLs are correct:
   ```bash
   curl https://your-backend-url.up.railway.app/health
   ```
2. Check that services are actually running in Railway dashboard
3. Verify the `BACKEND_HEALTH_URL` and `EVENTSERVER_HEALTH_URL` secrets don't include trailing slashes
4. Check service logs in Railway for startup errors

---

### Issue: Client build fails

**Symptoms**: Client Docker build fails during GitHub Actions

**Solution**:
1. Verify `REACT_APP_BACKEND_BASE_URL` and `REACT_APP_SOCKET_URL` are set
2. Check URLs are valid and don't have trailing slashes
3. Ensure URLs use `https://` (not `http://`)
4. Verify the services are publicly accessible

---

### Issue: Secrets not available in workflow

**Symptoms**: `${{ secrets.SECRET_NAME }}` evaluates to empty

**Solution**:
1. Secrets are NOT available to workflows triggered by PRs from forks
2. For testing, push branches directly to the repository
3. Ensure you're using the correct syntax: `${{ secrets.SECRET_NAME }}`
4. Check that the workflow file is in `.github/workflows/` directory

---

## Security Best Practices

1. **Never commit secrets to Git**:
   ```bash
   # Add to .gitignore
   .env
   .env.local
   .env.production
   ```

2. **Use different tokens for different environments**:
   - `RAILWAY_TOKEN_STAGING` for staging
   - `RAILWAY_TOKEN_PRODUCTION` for production

3. **Limit token scope**: Generate tokens with minimal required permissions

4. **Rotate tokens regularly**: Set a calendar reminder every 90 days

5. **Monitor usage**: Check Railway dashboard for unexpected deployments

6. **Revoke immediately** if a secret is compromised:
   - Delete from GitHub Secrets
   - Revoke in Railway dashboard
   - Generate new token
   - Update GitHub Secrets

---

## Environment Secrets (Optional)

For additional security, you can use GitHub **Environment Secrets** instead of repository secrets:

1. Go to Settings → Environments
2. Click **New environment**
3. Name it `production`
4. Add protection rules (e.g., require approval)
5. Add secrets specific to that environment

Benefits:
- Secrets are scoped to specific environments
- Can require manual approval before deployment
- Better audit trail

---

## Related Documentation

- [Railway Variables Setup](./RAILWAY_VARIABLES.md) - Environment variables for Railway services
- [Deployment Guide](./DEPLOYMENT.md) - Full deployment procedures
- [Railway CLI Documentation](https://docs.railway.app/reference/cli-api)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/using-secrets-in-github-actions)

# GitHub Secrets Configuration

This document describes all GitHub Secrets required for the vttless deployment pipeline.

## Required Secrets

Configure these in **GitHub → Settings → Secrets → Actions**.

### Railway Deployment Token

| Secret | Description | How to Obtain |
|--------|-------------|---------------|
| `RAILWAY_TOKEN` | Railway CLI token for automated deployment | Railway Dashboard → Tokens → New Token |

**How to generate:**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Or generate token from Railway dashboard:
# 1. Go to https://railway.app/dashboard
# 2. Click your profile → Account Settings
# 3. Go to "Tokens" tab
# 4. Click "New Token"
# 5. Copy the token value (shown only once!)
```

### Frontend Build Arguments

| Secret | Description | Example |
|--------|-------------|---------|
| `REACT_APP_BACKEND_BASE_URL` | Production backend API URL | `https://vttless-backend-production.up.railway.app` |
| `REACT_APP_SOCKET_URL` | Production WebSocket/EventServer URL | `https://vttless-eventserver-production.up.railway.app` |

**Note:** These are used as Docker build arguments for the client service.

### Health Check URLs

| Secret | Description | Example |
|--------|-------------|---------|
| `BACKEND_HEALTH_URL` | Backend health check endpoint | `https://vttless-backend-production.up.railway.app` |
| `EVENTSERVER_HEALTH_URL` | EventServer health check endpoint | `https://vttless-eventserver-production.up.railway.app` |
| `CLIENT_URL` | Client app URL for smoke test | `https://vttless-client-production.up.railway.app` |

**Note:** Health checks run after deployment to verify services are responding.

## Optional Secrets

### Notification Webhooks (Optional)

| Secret | Description | Example |
|--------|-------------|---------|
| `DISCORD_WEBHOOK_URL` | Discord webhook for deployment notifications | `https://discord.com/api/webhooks/...` |
| `SLACK_WEBHOOK_URL` | Slack webhook for deployment notifications | `https://hooks.slack.com/services/...` |

## Secrets Checklist

Before first deployment, verify:

- [ ] `RAILWAY_TOKEN` - Railway authentication token
- [ ] `REACT_APP_BACKEND_BASE_URL` - Backend service URL
- [ ] `REACT_APP_SOCKET_URL` - EventServer service URL
- [ ] `BACKEND_HEALTH_URL` - Backend health endpoint
- [ ] `EVENTSERVER_HEALTH_URL` - EventServer health endpoint
- [ ] `CLIENT_URL` - Client app URL

## Security Notes

⚠️ **IMPORTANT:**

1. **Never commit secrets to the repository** - Use GitHub Secrets only
2. **Rotate tokens regularly** - Especially if team members leave
3. **Use environment-specific tokens** - Different tokens for staging vs production
4. **Limit token scope** - Railway tokens should have minimal required permissions
5. **Monitor usage** - Check Railway dashboard for unexpected deployments

## Troubleshooting

### "Authentication failed" error

```
Error: Railway authentication failed
```

**Solution:**
1. Verify `RAILWAY_TOKEN` is set in GitHub Secrets
2. Check token hasn't expired (Railway tokens don't expire by default)
3. Ensure token has access to the vttless project

### "Service not found" error

```
Error: Service vttless-backend not found
```

**Solution:**
1. Verify services exist in Railway dashboard
2. Check service names match exactly (case-sensitive)
3. Ensure token has access to the specific project

## Related Documentation

- [Railway Variables](./RAILWAY_VARIABLES.md) - Environment variables for Railway services
- [Deployment Guide](./DEPLOYMENT.md) - Full deployment pipeline documentation
- [Railway Docs: Tokens](https://docs.railway.app/guides/public-api#authentication)

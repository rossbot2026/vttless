# Environment Variables

This document describes the environment variables used in VTTLess.

## Required Variables

### Database
- `MONGODB_URI` - MongoDB connection string
- `MONGO_SESSION_SECRET` - Secret for session storage

### JWT
- `JWT_SECRET` - Secret for JWT token generation

### AWS S3 Configuration
- `AWS_ACCESS_KEY_ID` - AWS access key
- `AWS_SECRET_ACCESS_KEY` - AWS secret key
- `AWS_REGION` - AWS region (e.g., us-east-1)
- `S3_BUCKET_NAME` - S3 bucket for file uploads

### Server Configuration
- `PORT` - Backend server port (default: 5000)
- `EVENTSERVER_PORT` - Events server port (default: 3001)
- `CLIENT_URL` - Client application URL

### OAuth (Optional)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Google OAuth
- `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` - Facebook OAuth
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` - GitHub OAuth

### AI Battle Map Generation
- `OPENROUTER_API_KEY` - API service key for OpenRouter

## Railway Deployment

When deploying to Railway, add the following environment variables in the Railway dashboard:

- `MONGODB_URI`
- `MONGO_SESSION_SECRET`
- `JWT_SECRET`
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `S3_BUCKET_NAME`
- `OPENROUTER_API_KEY`

## Getting OpenRouter API Key

1. Go to [OpenRouter](https://openrouter.ai/)
2. Create an account or sign in
3. Navigate to API Keys
4. Create a new API key
5. Add the key to your environment variables

## Development

Copy `.env.example` to `.env` and fill in the values for local development.

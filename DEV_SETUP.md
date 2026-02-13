# Local Development Environment

This guide explains how to set up and run the VTTless application locally for development.

## Prerequisites

- Docker and Docker Compose installed and running
- Node.js (v14 or higher)
- npm or yarn

## Quick Start

1. **Start the development environment:**
   ```bash
   ./dev-setup.sh
   ```

2. **Start the application services:**
   ```bash
   npm run dev
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - Event Server: http://localhost:3001

## Services

The local development environment includes the following services:

### MongoDB
- **Port:** 27017
- **Database:** vttless
- **Connection:** mongodb://localhost:27017/vttless
- **Authentication:** admin/password

### LocalStack (AWS Services)
- **Port:** 4566
- **Web UI:** http://localhost:8080
- **S3 Bucket:** vttless-dev
- **AWS Endpoint:** http://localhost:4566

### Redis
- **Port:** 6379
- **Use Case:** Session storage (optional but recommended)

## Environment Variables

### Backend (.env)
```env
# Database
MONGODB_URI=mongodb://admin:password@mongo:27017/vttless?authSource=admin
MONGO_SESSION_SECRET=your-session-secret-here

# JWT Configuration
JWT_SECRET_KEY=your-jwt-secret-key-here-change-in-production
JWT_REFRESH_SECRET_KEY=your-jwt-refresh-secret-key-here-change-in-production
JWT_ISSUER=vttless
JWT_AUDIENCE=vttless-app

# AWS S3 Configuration (LocalStack)
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_REGION=us-east-1
S3_ENDPOINT_URL=http://localhost:4566
S3_BUCKET_NAME=vttless-dev

# Email (Resend)
RESEND_API_KEY=your-resend-api-key
EMAIL_FROM=noreply@vttless.com

# Server Configuration
PORT=5000
CLIENT_URL=http://localhost:3000
```

### Client (.env)
```env
REACT_APP_BACKEND_BASE_URL=http://localhost:5000
REACT_APP_SOCKET_URL=http://localhost:3001
REACT_APP_CLIENT_URL=http://localhost:3000
```

### Event Server (.env)
```env
PORT=3001
MONGODB_URI=mongodb://admin:password@mongo:27017/vttless?authSource=admin
NODE_ENV=development
```

## Manual Setup

If you prefer to set up the environment manually:

1. **Start the services:**
   ```bash
   docker-compose up -d
   ```

2. **Wait for services to be ready:**
   ```bash
   # Wait for MongoDB
   until docker-compose exec mongo mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; do
     echo "Waiting for MongoDB..."
     sleep 2
   done
   
   # Wait for LocalStack
   until docker-compose exec localstack awslocal s3 ls > /dev/null 2>&1; do
     echo "Waiting for LocalStack..."
     sleep 2
   done
   ```

3. **Create S3 bucket:**
   ```bash
   docker-compose exec localstack awslocal s3 mb s3://vttless-dev
   ```

4. **Install dependencies:**
   ```bash
   npm install
   cd backend && npm install
   cd ../client && npm install
   cd ../eventserver && npm install
   ```

5. **Start the application:**
   ```bash
   # From the root directory
   npm run dev
   ```

## Email Testing

The application is configured to use Resend for sending password reset emails. The API key is already configured in the backend `.env` file.

To test the password reset flow:
1. Start the backend: `npm run backend`
2. Send a POST request to `http://localhost:5000/auth/forgot-password` with an email address
3. Check the console output for the email sending status

## Troubleshooting

### Docker Issues
- Ensure Docker is running: `docker info`
- Check if ports are available: `netstat -tlnp | grep -E '27017|4566|6379'`
- Restart Docker if needed

### MongoDB Connection Issues
- Check if MongoDB container is running: `docker-compose ps`
- View logs: `docker-compose logs mongo`
- Wait a few seconds after starting for MongoDB to initialize

### LocalStack Issues
- Check if LocalStack container is running: `docker-compose ps`
- View logs: `docker-compose logs localstack`
- Access the LocalStack UI at http://localhost:8080 for debugging

### S3 Issues
- Verify bucket exists: `docker-compose exec localstack awslocal s3 ls`
- Check S3 endpoint configuration in backend `.env`

## Useful Commands

```bash
# View container logs
docker-compose logs -f [service-name]

# Restart a specific service
docker-compose restart [service-name]

# Stop all services
docker-compose down

# Remove volumes (reset database)
docker-compose down -v

# View resource usage
docker-compose stats

# Enter a container shell
docker-compose exec [service-name] sh
```

## Development Workflow

1. Make changes to your code
2. Restart the relevant service(s)
3. Test changes in the browser
4. Use browser developer tools for debugging
5. Check server logs for backend/eventserver issues

## Testing

Run tests for each service:
```bash
# Backend tests
cd backend && npm test

# Client tests
cd client && npm test

# All tests (from root)
npm test
```
# Testing Infrastructure

This document describes the testing infrastructure for vttless, including how to set up and run tests in different environments.

## Current Setup

The project now uses **Testcontainers** for MongoDB instances during testing. This provides a more production-like testing environment with isolated MongoDB containers for each test run.

## Testcontainers Migration (Completed ✅)

✅ **Migration Complete**: We have successfully migrated from `mongodb-memory-server` to Testcontainers for more production-like testing environments.

**Benefits of Testcontainers:**
- More realistic testing environment
- Better production fidelity
- Isolated containers for each test run
- Docker-based infrastructure

**Docker is now available** in the test environment, so no additional setup is required.

### Current Implementation

The migration has been successfully completed. Here's how it works:

1. **Testcontainers Setup**: Uses `GenericContainer('mongo')` to create isolated MongoDB containers
2. **Port Mapping**: Automatically maps container ports to host ports
3. **Connection Management**: Properly handles container lifecycle in test hooks
4. **Environment Variables**: Sets `MONGO_URI` for backend to use the test database

### Example Current Implementation

```javascript
const { GenericContainer } = require('testcontainers');

let mongoContainer;

beforeAll(async () => {
  mongoContainer = await new GenericContainer('mongo:latest')
    .withExposedPorts(27017)
    .start();
  
  const mongoPort = mongoContainer.getMappedPort(27017);
  const mongoUri = `mongodb://localhost:${mongoPort}/vttless-test`;
  
  // Set environment variable for backend
  process.env.MONGO_URI = mongoUri;
  
  // Connect mongoose
  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoContainer.stop();
});
```

## Running Tests

### Running Tests

Now that Testcontainers is fully implemented, you can run tests normally:

```bash
# Run all tests
npm test

# Run specific test suite
npm test -- tests/api/auth.test.js

# Run with coverage
npm run test:coverage

# Run API tests only
npm run test:api
```

**Docker Requirements:**
- Docker must be installed and running
- User must have permission to access Docker daemon
- These requirements are now met in the current environment

## Troubleshooting

### Troubleshooting

The Testcontainers migration is now complete and working. If you encounter any issues:

1. **Verify Docker is running**: `docker --version`
2. **Check container logs**: `docker ps` and `docker logs <container-id>`
3. **Test database connection**: The tests will log the MongoDB connection URI

### Docker Permission Issues (Resolved)

✅ **Docker permissions are now properly configured** in the current environment. No additional setup is required.

### Testcontainers Runtime (Working)

✅ **Testcontainers is working correctly** with the current Docker installation. Tests can run without additional configuration.

### Fallback to mongodb-memory-server

If Docker is not available in your environment, you can continue using the current `mongodb-memory-server` setup. The tests will work but with the following limitations:

- Slightly different behavior than production MongoDB
- No persistent storage between test runs
- Limited to in-memory operations

## CI/CD Considerations

For CI environments, ensure:

1. **Docker is available** in the CI runner
2. **Proper permissions** are set for the CI user
3. **Resource limits** are appropriate for containerized MongoDB
4. **Cleanup** is handled properly between test runs

## Performance Comparison

| Approach | Startup Time | Memory Usage | Production Fidelity |
|----------|--------------|--------------|---------------------|
| mongodb-memory-server | Fast (~1s) | Low (~50MB) | Medium |
| Testcontainers | Medium (~5-10s) | High (~200MB) | High |

## Future Enhancements

1. **Parallel test execution** with isolated containers
2. **Custom MongoDB versions** for compatibility testing
3. **Replica set support** for advanced MongoDB features
4. **Performance benchmarking** with different configurations

## References

- [Testcontainers Documentation](https://www.testcontainers.org/)
- [MongoDB Testcontainers Module](https://www.testcontainers.org/modules/databases/mongodb/)
- [Docker Installation Guide](https://docs.docker.com/engine/install/)
- [Docker Post-install Steps](https://docs.docker.com/engine/install/linux-postinstall/)
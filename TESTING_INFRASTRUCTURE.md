# VTTless Testing Infrastructure

## Testing Philosophy
- **Test-Driven Development**: Write tests before implementing features
- **Comprehensive Coverage**: Cover all critical functionality and security aspects
- **Automated Testing**: Automated CI/CD integration
- **Environment Testing**: Test across development, staging, and production

## Test Structure
```
tests/
├── unit/                  # Unit tests
│   ├── backend/          # Backend service tests
│   │   ├── auth/
│   │   │   ├── jwtSecurity.test.js
│   │   │   ├── passport.test.js
│   │   │   └── authController.test.js
│   │   ├── models/
│   │   ├── middleware/
│   │   └── utils/
│   └── frontend/         # Frontend component tests
│       ├── components/
│       ├── services/
│       ├── utils/
│       └── hooks/
├── integration/          # Integration tests
│   ├── auth/
│   ├── api/
│   ├── websocket/
│   └── file-upload/
├── e2e/                  # End-to-end tests
│   ├── auth-flow/
│   ├── campaign-management/
│   └── real-time/
└── fixtures/             # Test data and fixtures
    ├── users.js
    ├── campaigns.js
    ├── tokens.js
    └── database-seeds/
```

## Test Configuration
- **Test Runner**: Jest
- **Backend Testing**: Supertest for API testing
- **Frontend Testing**: React Testing Library
- **Database**: MongoDB Memory Server for isolated testing
- **Coverage**: Istanbul/ Jest coverage reports

## Testing Commands
```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run integration tests only
npm run test:integration

# Run e2e tests only
npm run test:e2e

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run tests for specific file
npm test -- --testPathPattern=jwtSecurity.test.js
```

## Test Environment Variables
- `TEST_MONGODB_URI`: MongoDB connection for testing
- `TEST_JWT_SECRET_KEY`: JWT secret for testing
- `TEST_JWT_REFRESH_SECRET_KEY`: JWT refresh secret for testing
- `TEST_NODE_ENV`: Set to 'test'

## CI/CD Integration
Tests will be automatically run on:
- Pull requests
- Push to main branch
- Merge to main branch
- Deployment to staging

## Mock Services
- **Mock Authentication**: Mock Passport.js strategies
- **Mock Database**: In-memory MongoDB
- **Mock File Upload**: Mock S3 service
- **Mock WebSocket**: Mock Socket.io connections

## Test Data Management
- **Fixtures**: Reusable test data
- **Factories**: Dynamic test data generation
- **Cleanup**: Database cleanup between tests
- **Seeds**: Initial test data setup

---

## Test Priorities

### 🔴 Critical (Security & Core Features)
1. **Authentication Tests**
   - JWT token generation and validation
   - Refresh token functionality
   - Token blacklist implementation
   - Password validation and hashing
   - Session management

2. **API Security Tests**
   - Input validation and sanitization
   - Rate limiting
   - CORS configuration
   - CSRF protection

3. **Database Tests**
   - User authentication flows
   - Campaign data integrity
   - Friend system functionality

### 🟡 Medium (Feature Testing)
1. **Campaign Management Tests**
   - CRUD operations
   - Player/GM permissions
   - Map and token management

2. **Real-time Communication Tests**
   - WebSocket authentication
   - Real-time updates
   - Room management

3. **File Upload Tests**
   - File validation
   - Storage and retrieval
   - Security checks

### 🟢 Low (Enhancement & Performance)
1. **User Experience Tests**
   - Form validation
   - Error handling
   - User interface components

2. **Performance Tests**
   - Load testing
   - Response time testing
   - Database performance

---

## Mock Data Structures

### User Mock Data
```javascript
// tests/fixtures/users.js
const mockUsers = {
  validUser: {
    username: 'testuser',
    email: 'test@example.com',
    password: 'Password123!',
    roles: ['user']
  },
  adminUser: {
    username: 'admin',
    email: 'admin@example.com',
    password: 'AdminPassword123!',
    roles: ['admin']
  },
  inactiveUser: {
    username: 'inactive',
    email: 'inactive@example.com',
    password: 'Password123!',
    roles: ['user'],
    isActive: false
  }
};

module.exports = mockUsers;
```

### JWT Token Mock Data
```javascript
// tests/fixtures/tokens.js
const jwt = require('jsonwebtoken');

const generateMockToken = (payload, type = 'access') => {
  return jwt.sign({
    ...payload,
    type,
    iat: Math.floor(Date.now() / 1000),
    jti: require('crypto').randomBytes(16).toString('hex')
  }, process.env.TEST_JWT_SECRET_KEY, {
    algorithm: 'HS256',
    expiresIn: type === 'access' ? '24h' : '7d',
    issuer: 'vttless-test',
    audience: 'vttless-app-test'
  });
};

const mockTokens = {
  validAccessToken: (userId) => generateMockToken({ userId, username: 'testuser' }),
  validRefreshToken: (userId) => generateMockToken({ userId, username: 'testuser' }, 'refresh'),
  expiredAccessToken: (userId) => generateMockToken({ userId, username: 'testuser' }, { expiresIn: '-1h' }),
  invalidToken: 'invalid.jwt.token.here',
  malformedToken: 'this.is.not.a.jwt.token'
};

module.exports = mockTokens;
```

### Database Seeds
```javascript
// tests/fixtures/database-seeds/users.js
const mongoose = require('mongoose');
const User = require('../../backend/models/user');
const Role = require('../../backend/models/roles');

const seedUsers = async () => {
  // Create roles
  const userRole = await Role.findOneAndUpdate(
    { name: 'user' },
    { name: 'user' },
    { upsert: true, new: true }
  );
  
  const adminRole = await Role.findOneAndUpdate(
    { name: 'admin' },
    { name: 'admin' },
    { upsert: true, new: true }
  );

  // Create test users
  const users = [
    {
      username: 'testuser',
      email: 'test@example.com',
      password: 'hashedpassword123',
      roles: [userRole._id]
    },
    {
      username: 'admin',
      email: 'admin@example.com',
      password: 'hashedpassword123',
      roles: [adminRole._id]
    }
  ];

  await User.deleteMany({});
  await User.insertMany(users);
  
  return users;
};

module.exports = seedUsers;
```

---

## Test Utilities

### Authentication Helper
```javascript
// tests/utils/authHelper.js
const request = require('supertest');
const app = require('../../backend/index');
const mockTokens = require('../fixtures/tokens');

class AuthHelper {
  static async login(userData) {
    const response = await request(app)
      .post('/auth/login')
      .send(userData);
    
    return response;
  }

  static async getAuthHeaders(token) {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  static async getRefreshHeaders(refreshToken) {
    return {
      'Cookie': `vttless-refresh=${refreshToken}`,
      'Content-Type': 'application/json'
    };
  }
}

module.exports = AuthHelper;
```

### Database Helper
```javascript
// tests/utils/databaseHelper.js
const mongoose = require('mongoose');
const MongoMemoryServer = require('mongodb-memory-server').MongoMemoryServer;

class DatabaseHelper {
  constructor() {
    this.mongoServer = null;
    this.connection = null;
  }

  async connect() {
    this.mongoServer = await MongoMemoryServer.create();
    const uri = this.mongoServer.getUri();
    
    mongoose.connect(uri);
    this.connection = mongoose.connection;
  }

  async disconnect() {
    if (this.connection) {
      await mongoose.disconnect();
    }
    if (this.mongoServer) {
      await this.mongoServer.stop();
    }
  }

  async clear() {
    if (this.connection) {
      const collections = this.connection.collections;
      for (const key in collections) {
        await collections[key].deleteMany({});
      }
    }
  }
}

module.exports = new DatabaseHelper();
```

### Security Test Helper
```javascript
// tests/utils/securityHelper.js
class SecurityHelper {
  static generateMaliciousInput() {
    return {
      sqlInjection: "'; DROP TABLE users; --",
      xss: '<script>alert("xss")</script>',
      commandInjection: '$(rm -rf /)',
      pathTraversal: '../../../etc/passwd',
      largeInput: 'a'.repeat(10000)
    };
  }

  static generateValidInput() {
    return {
      username: 'testuser123',
      email: 'test@example.com',
      password: 'ValidPassword123!',
      campaignName: 'Test Campaign'
    };
  }

  static analyzeResponseForSecurity(response) {
    const securityIssues = [];
    
    // Check for sensitive information in response
    if (response.text.includes('password')) {
      securityIssues.push('Password information leaked in response');
    }
    
    // Check for stack traces
    if (response.text.includes('stack trace') || response.text.includes('Error:')) {
      securityIssues.push('Stack trace exposed in response');
    }
    
    // Check for database errors
    if (response.text.includes('database') || response.text.includes('MongoError')) {
      securityIssues.push('Database errors exposed in response');
    }
    
    return securityIssues;
  }
}

module.exports = SecurityHelper;
```

---

## Test Setup Scripts

### Test Environment Configuration
```javascript
// tests/setup.js
require('dotenv').config({ path: '.env.test' });

const DatabaseHelper = require('./utils/databaseHelper');

beforeAll(async () => {
  await DatabaseHelper.connect();
});

beforeEach(async () => {
  await DatabaseHelper.clear();
});

afterAll(async () => {
  await DatabaseHelper.disconnect();
});
```

### Jest Configuration
```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testMatch: [
    '<rootDir>/tests/**/*.test.js'
  ],
  collectCoverageFrom: [
    'backend/**/*.js',
    'client/src/**/*.js',
    '!backend/node_modules/**',
    '!client/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  testTimeout: 30000
};
```

---

## Next Steps

1. **Install Testing Dependencies**
2. **Create Unit Tests for JWT Security**
3. **Create Integration Tests for Authentication**
4. **Set Up Test Database Configuration**
5. **Configure Jest and Testing Tools**
6. **Create CI/CD Pipeline Integration**

This comprehensive testing infrastructure will ensure that your JWT security improvements and other features are thoroughly tested and won't break when you make future changes.
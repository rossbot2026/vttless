#!/usr/bin/env node

/**
 * Minimal Test Server for API Testing
 * This server provides basic endpoints without complex authentication
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();
const port = 3001;

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  methods: "GET,POST,PUT,DELETE,PATCH",
  credentials: true
}));

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    service: 'backend',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// System Status Endpoint
app.get('/api/status', (req, res) => {
  const memoryUsage = process.memoryUsage();
  
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB',
      external: Math.round(memoryUsage.external / 1024 / 1024) + 'MB'
    },
    cpu: process.cpuUsage(),
    nodeVersion: process.version,
    platform: process.platform
  });
});

// Metrics Endpoint
app.get('/metrics', (req, res) => {
  const memoryUsage = process.memoryUsage();
  const cpuUsage = process.cpuUsage();
  
  res.status(200).json({
    memory: {
      used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      external: Math.round(memoryUsage.external / 1024 / 1024),
      rss: Math.round(memoryUsage.rss / 1024 / 1024)
    },
    cpu: {
      user: cpuUsage.user,
      system: cpuUsage.system
    },
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Authentication Endpoints (Error Handling)
app.post('/auth/login', (req, res) => {
  // Validate request body
  if (!req.body || !req.body.username || !req.body.password) {
    return res.status(400).json({ 
      error: 'Username and password are required',
      code: 'MISSING_CREDENTIALS'
    });
  }
  
  // Simulate authentication error
  res.status(401).json({
    error: 'Invalid credentials',
    code: 'INVALID_CREDENTIALS'
  });
});

app.post('/auth/register', (req, res) => {
  // Validate request body
  if (!req.body || !req.body.username || !req.body.email || !req.body.password) {
    return res.status(400).json({ 
      error: 'Username, email, and password are required',
      code: 'MISSING_FIELDS'
    });
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(req.body.email)) {
    return res.status(400).json({
      error: 'Invalid email format',
      code: 'INVALID_EMAIL'
    });
  }
  
  // Validate password strength
  if (req.body.password.length < 8) {
    return res.status(400).json({
      error: 'Password must be at least 8 characters long',
      code: 'WEAK_PASSWORD'
    });
  }
  
  // Simulate user creation
  res.status(201).json({
    user: {
      id: 'test-user-id',
      username: req.body.username,
      email: req.body.email,
      firstName: req.body.firstName || '',
      lastName: req.body.lastName || '',
      createdAt: new Date().toISOString()
    }
  });
});

// Protected Endpoint (Example)
app.get('/auth/me', (req, res) => {
  // Check for authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authorization token required',
      code: 'MISSING_TOKEN'
    });
  }
  
  const token = authHeader.substring(7);
  
  // Simple token validation (in real app, use JWT verification)
  if (token === 'valid-token') {
    return res.status(200).json({
      user: {
        id: 'user-id',
        username: 'testuser',
        email: 'test@example.com',
        roles: ['user']
      }
    });
  }
  
  res.status(401).json({
    error: 'Invalid token',
    code: 'INVALID_TOKEN'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Handle JSON parsing errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: 'Invalid JSON',
      code: 'INVALID_JSON'
    });
  }
  
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
});

// 404 handler - must be last
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    code: 'NOT_FOUND',
    path: req.originalUrl
  });
});

// Start server
app.listen(port, () => {
  console.log(`Test server running on port ${port}`);
  console.log(`Health check: http://localhost:${port}/health`);
  console.log(`API status: http://localhost:${port}/api/status`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  process.exit(0);
});
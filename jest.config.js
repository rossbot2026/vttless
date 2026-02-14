module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: [
    '**/__tests__/**/*.js',
    '**/?(*.)+(spec|test).js'
  ],
  transform: {},
  collectCoverageFrom: [
    'backend/**/*.js',
    '!backend/index.js',
    '!backend/node_modules/**',
    '!backend/tests/**',
    '!backend/db.js',
    '!backend/passport.js',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
};
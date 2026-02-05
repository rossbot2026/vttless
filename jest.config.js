const { pathsToModuleNameMapper } = require('ts-jest');

const { rootDir } = require('./backend');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: [
    '**/__tests__**/*.(js|ts)',
    '**/?(*.)+(spec|test)*.(js|ts)'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleNameMapper: pathsToModuleNameMapper({
    '@/*': ['<rootDir>/client/src/*'],
  }, { prefix: '<rootDir>/' }),
  collectCoverageFrom: [
    'backend/**/*.js',
    '!backend/index.js',
    '!backend/node_modules/**',
    '!backend/tests/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  verbose: true,
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/backend/tsconfig.json',
    },
  },
};
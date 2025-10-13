import { config } from '../src/config/env';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = process.env.MONGODB_URI_TEST || 'mongodb://localhost:27017/mindsupport-test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only-32chars';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-testing-only-32chars';
process.env.STREAM_API_KEY = 'test-stream-key';
process.env.STREAM_API_SECRET = 'test-stream-secret';
process.env.PUBLISH_SECRET = 'test-publish-secret';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Global test setup
beforeAll(async () => {
  // Setup code
});

// Global test teardown
afterAll(async () => {
  // Cleanup code
});
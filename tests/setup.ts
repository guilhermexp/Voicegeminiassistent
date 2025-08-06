// Vitest setup file
import { beforeAll, afterEach, afterAll } from 'vitest';

// Setup for tests
beforeAll(() => {
  // Mock environment variables
  process.env.GEMINI_API_KEY = 'test-api-key';
  process.env.FIRECRAWL_API_KEY = 'test-firecrawl-key';
});

afterEach(() => {
  // Clear all mocks after each test
});

afterAll(() => {
  // Cleanup after all tests
});
'use strict';

// Runs before any test file (and therefore before src/config/env.js is loaded).
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-that-is-long-enough-for-tests';
process.env.JWT_EXPIRES_IN = '1h';
process.env.BCRYPT_ROUNDS = '4';
process.env.RATE_LIMIT_MAX = '100000';
process.env.AUTH_RATE_LIMIT_MAX = '100000';
process.env.CORS_ORIGIN = '*';

// Deterministic seed values, independent of a developer's local .env.
process.env.ADMIN_NAME = 'Seed Admin';
process.env.ADMIN_EMAIL = 'admin@test.edu';
process.env.ADMIN_PASSWORD = 'Admin@12345';
process.env.SEED_SAMPLE_DATA = 'true';
process.env.SEED_RESET_ADMIN_PASSWORD = 'false';

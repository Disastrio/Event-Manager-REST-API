'use strict';

require('dotenv').config();

function toInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';
const isTest = NODE_ENV === 'test';

const JWT_SECRET =
  process.env.JWT_SECRET || (isProduction ? '' : 'dev-only-insecure-secret-change-me');

if (isProduction && (!JWT_SECRET || JWT_SECRET.length < 32)) {
  // Fail fast instead of shipping a weak signing key.
  throw new Error(
    'JWT_SECRET must be set to a random string of at least 32 characters in production.'
  );
}

const config = {
  env: NODE_ENV,
  isProduction,
  isTest,
  port: toInt(process.env.PORT, 5000),
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/campus_events',
  jwt: {
    secret: JWT_SECRET || 'dev-only-insecure-secret-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    issuer: 'campus-events-api',
    audience: 'campus-events-client',
  },
  bcryptRounds: toInt(process.env.BCRYPT_ROUNDS, 12),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  rateLimit: {
    windowMs: toInt(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: toInt(process.env.RATE_LIMIT_MAX, 100),
    authMax: toInt(process.env.AUTH_RATE_LIMIT_MAX, 10),
  },
  seed: {
    adminName: process.env.ADMIN_NAME || 'Platform Admin',
    adminEmail: process.env.ADMIN_EMAIL || 'admin@campus.edu',
    adminPassword: process.env.ADMIN_PASSWORD || 'Admin@12345',
    sampleData: String(process.env.SEED_SAMPLE_DATA || 'true') === 'true',
  },
};

module.exports = config;

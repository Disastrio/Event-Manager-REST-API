'use strict';

const rateLimit = require('express-rate-limit');
const config = require('../config/env');

function handler(_req, res) {
  res.status(429).json({
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please retry later.',
    },
  });
}

/** Broad limiter for the whole API. */
const globalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
  // Rate limiting makes the suite flaky; disable it under tests.
  skip: () => config.isTest,
});

/** Stricter limiter for credential endpoints to slow down brute force. */
const authLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
  skip: () => config.isTest,
});

module.exports = { globalLimiter, authLimiter };

'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');

const config = require('./config/env');
const apiRoutes = require('./routes');
const openapi = require('./docs/openapi');
const { globalLimiter } = require('./middleware/rateLimit');
const notFound = require('./middleware/notFound');
const errorHandler = require('./middleware/error');

const app = express();

app.disable('x-powered-by');
// Trust the first proxy so rate limiting sees the real client IP on Render/Railway.
app.set('trust proxy', 1);

app.use(
  helmet({
    // Swagger UI uses inline scripts/styles; the API itself is JSON-only.
    contentSecurityPolicy: false,
  })
);

const corsOrigins =
  config.corsOrigin === '*'
    ? '*'
    : config.corsOrigin.split(',').map((origin) => origin.trim()).filter(Boolean);

app.use(
  cors({
    origin: corsOrigins,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

if (!config.isTest) {
  app.use(morgan(config.isProduction ? 'combined' : 'dev'));
}

// Broad rate limit for the API (credential routes add a stricter limiter).
app.use(globalLimiter);

app.get('/', (_req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Campus Events API',
      version: '1.0.0',
      documentation: '/api-docs',
      openapi: '/api-docs.json',
      health: '/api/v1/health',
    },
  });
});

app.use('/api/v1', apiRoutes);

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(openapi, {
    customSiteTitle: 'Campus Events API Docs',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      docExpansion: 'none',
      filter: true,
    },
  })
);

app.get('/api-docs.json', (_req, res) => res.json(openapi));

app.use(notFound);
app.use(errorHandler);

module.exports = app;

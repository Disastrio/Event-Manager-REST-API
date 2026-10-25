'use strict';

const express = require('express');
const authRoutes = require('./authRoutes');
const eventRoutes = require('./eventRoutes');
const registrationRoutes = require('./registrationRoutes');
const userRoutes = require('./userRoutes');
const { dbState } = require('../config/db');

const router = express.Router();

router.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      database: dbState(),
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    },
  });
});

router.use('/auth', authRoutes);
router.use('/events', eventRoutes);
router.use('/registrations', registrationRoutes);
router.use('/users', userRoutes);

module.exports = router;

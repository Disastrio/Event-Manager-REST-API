'use strict';

const mongoose = require('mongoose');
const config = require('./env');

mongoose.set('strictQuery', true);

/**
 * Connect to MongoDB. Safe to call once per process.
 * @param {string} [uri] override the configured URI (used by tests)
 */
async function connectDB(uri = config.mongoUri) {
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
  });

  if (!config.isTest) {
    // eslint-disable-next-line no-console
    console.log(`[db] connected to ${mongoose.connection.name}`);
  }

  return mongoose.connection;
}

async function disconnectDB() {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.disconnect();
}

/** Human readable connection state, useful for the health endpoint. */
function dbState() {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return states[mongoose.connection.readyState] || 'unknown';
}

module.exports = { connectDB, disconnectDB, dbState };

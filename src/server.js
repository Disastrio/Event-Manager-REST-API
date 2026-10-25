'use strict';

const app = require('./app');
const config = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');

async function start() {
  try {
    await connectDB();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[startup] could not connect to MongoDB:', err.message);
    process.exit(1);
  }

  const server = app.listen(config.port, () => {
    // eslint-disable-next-line no-console
    console.log(`[server] Campus Events API listening on http://localhost:${config.port}`);
    // eslint-disable-next-line no-console
    console.log(`[server] Swagger docs: http://localhost:${config.port}/api-docs`);
  });

  async function shutdown(signal) {
    // eslint-disable-next-line no-console
    console.log(`\n[server] ${signal} received, shutting down...`);
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    // Force exit if connections do not drain in time.
    setTimeout(() => process.exit(1), 10000).unref();
  }

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

start();

process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('[server] unhandled rejection:', reason);
});

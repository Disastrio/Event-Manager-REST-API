'use strict';

const config = require('../config/env');
const ApiError = require('../utils/ApiError');

/** Convert known error shapes into the standard error envelope. */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong';
  let details;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err.name === 'ValidationError' && err.errors) {
    statusCode = 422;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  } else if (err.name === 'CastError') {
    statusCode = 400;
    code = 'INVALID_ID';
    message = `Invalid value for ${err.path}`;
  } else if (err.code === 11000) {
    statusCode = 409;
    code = 'DUPLICATE_KEY';
    const fields = Object.keys(err.keyValue || {});
    message = fields.length
      ? `A record with this ${fields.join(', ')} already exists`
      : 'Duplicate record';
    details = fields.length ? fields.map((field) => ({ field, message: 'Must be unique' })) : undefined;
  } else if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
    statusCode = 400;
    code = 'INVALID_JSON';
    message = 'Request body contains invalid JSON';
  } else if (err.type === 'entity.too.large') {
    statusCode = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'Request body is too large';
  }

  if (statusCode >= 500 && !config.isTest) {
    // eslint-disable-next-line no-console
    console.error('[error]', err);
  }

  const body = {
    success: false,
    error: { code, message },
  };
  if (details) body.error.details = details;
  if (!config.isProduction && statusCode >= 500) body.error.stack = err.stack;

  return res.status(statusCode).json(body);
}

module.exports = errorHandler;

'use strict';

/**
 * Operational error with an HTTP status, a stable machine-readable code and
 * optional field-level details.
 */
class ApiError extends Error {
  constructor(statusCode, message, code = 'ERROR', details = undefined) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request', code = 'BAD_REQUEST', details) {
    return new ApiError(400, message, code, details);
  }

  static unauthorized(message = 'Authentication required', code = 'UNAUTHORIZED') {
    return new ApiError(401, message, code);
  }

  static forbidden(message = 'You do not have permission to perform this action', code = 'FORBIDDEN') {
    return new ApiError(403, message, code);
  }

  static notFound(message = 'Resource not found', code = 'NOT_FOUND') {
    return new ApiError(404, message, code);
  }

  static conflict(message = 'Resource already exists', code = 'CONFLICT') {
    return new ApiError(409, message, code);
  }

  static unprocessable(message = 'Validation failed', code = 'VALIDATION_ERROR', details) {
    return new ApiError(422, message, code, details);
  }

  static tooMany(message = 'Too many requests', code = 'RATE_LIMITED') {
    return new ApiError(429, message, code);
  }
}

module.exports = ApiError;

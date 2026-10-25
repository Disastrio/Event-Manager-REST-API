'use strict';

const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Collect express-validator errors and convert them to a 422 response.
 * Maps each error to { field, message }.
 */
function validate(req, _res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const details = result.array({ onlyFirstError: true }).map((err) => ({
    field: err.path || err.param || 'body',
    message: err.msg,
  }));

  return next(ApiError.unprocessable('Validation failed', 'VALIDATION_ERROR', details));
}

module.exports = validate;

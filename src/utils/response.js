'use strict';

/**
 * Standard success envelope.
 * @param {import('express').Response} res
 * @param {number} statusCode
 * @param {*} data
 * @param {object} [meta]
 */
function sendSuccess(res, statusCode, data, meta) {
  const payload = { success: true, data };
  if (meta) payload.meta = meta;
  return res.status(statusCode).json(payload);
}

/** Build pagination metadata from total count. */
function paginationMeta(total, page, limit) {
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

module.exports = { sendSuccess, paginationMeta };

'use strict';

/** Escape user input before using it inside a RegExp. */
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Parse pagination query params with safe bounds.
 * @param {object} query
 * @param {{ defaultLimit?: number, maxLimit?: number }} [options]
 */
function getPagination(query, options = {}) {
  const defaultLimit = options.defaultLimit || 10;
  const maxLimit = options.maxLimit || 100;

  let page = Number.parseInt(query.page, 10);
  let limit = Number.parseInt(query.limit, 10);

  if (!Number.isFinite(page) || page < 1) page = 1;
  if (!Number.isFinite(limit) || limit < 1) limit = defaultLimit;
  if (limit > maxLimit) limit = maxLimit;

  return { page, limit, skip: (page - 1) * limit };
}

module.exports = { escapeRegex, getPagination };

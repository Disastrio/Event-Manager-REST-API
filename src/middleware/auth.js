'use strict';

const ApiError = require('../utils/ApiError');
const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');

function extractToken(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token || null;
}

async function loadUserFromToken(token) {
  const payload = verifyToken(token);
  const user = await User.findById(payload.sub);
  if (!user) throw ApiError.unauthorized('The account for this token no longer exists', 'INVALID_TOKEN');
  return user;
}

/** Require a valid Bearer token. Attaches `req.user`. */
async function authenticate(req, _res, next) {
  try {
    const token = extractToken(req);
    if (!token) {
      return next(ApiError.unauthorized('Missing or malformed Authorization header', 'MISSING_TOKEN'));
    }
    req.user = await loadUserFromToken(token);
    return next();
  } catch (err) {
    if (err.isOperational) return next(err);
    if (err.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Token has expired', 'TOKEN_EXPIRED'));
    }
    if (err.name === 'JsonWebTokenError' || err.name === 'NotBeforeError') {
      return next(ApiError.unauthorized('Invalid token', 'INVALID_TOKEN'));
    }
    return next(err);
  }
}

/**
 * Attach `req.user` when a valid token is present, but never fail the request.
 * Used by public endpoints that personalise their response (e.g. isRegistered).
 */
async function optionalAuth(req, _res, next) {
  const token = extractToken(req);
  if (!token) return next();
  try {
    req.user = await loadUserFromToken(token);
  } catch (_err) {
    req.user = undefined;
  }
  return next();
}

/** Restrict a route to one or more roles. Must run after `authenticate`. */
function authorize(...roles) {
  return function roleGuard(req, _res, next) {
    if (!req.user) {
      return next(ApiError.unauthorized('Authentication required', 'UNAUTHORIZED'));
    }
    if (roles.length && !roles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `This action requires role: ${roles.join(' or ')}`,
          'INSUFFICIENT_ROLE'
        )
      );
    }
    return next();
  };
}

module.exports = { authenticate, optionalAuth, authorize, extractToken };

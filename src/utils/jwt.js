'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config/env');

/**
 * Issue a signed access token for a user.
 * @param {{ _id: any, role: string }} user
 */
function signToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role },
    config.jwt.secret,
    {
      expiresIn: config.jwt.expiresIn,
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
    }
  );
}

/** Verify a token and return its payload, throwing on invalid/expired tokens. */
function verifyToken(token) {
  return jwt.verify(token, config.jwt.secret, {
    issuer: config.jwt.issuer,
    audience: config.jwt.audience,
  });
}

module.exports = { signToken, verifyToken };

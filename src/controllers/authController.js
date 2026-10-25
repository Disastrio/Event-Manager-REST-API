'use strict';

const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../utils/jwt');
const { sendSuccess } = require('../utils/response');

/**
 * POST /auth/register
 * Public sign-up. Always creates a student; admins are promoted by an admin
 * or created by the seed script, never by an unauthenticated request.
 */
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    throw ApiError.conflict('An account with this email already exists', 'EMAIL_TAKEN');
  }

  const user = await User.create({ name, email, password, role: 'student' });
  const token = signToken(user);

  return sendSuccess(res, 201, { user, token });
});

/**
 * POST /auth/login
 * Returns a JWT on success. The error is intentionally generic so it cannot
 * be used to enumerate registered emails.
 */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const matches = await user.comparePassword(password);
  if (!matches) {
    throw ApiError.unauthorized('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  const token = signToken(user);
  // Remove the hash from the in-memory document before serialising.
  user.password = undefined;

  return sendSuccess(res, 200, { user, token });
});

/** GET /auth/me */
const me = asyncHandler(async (req, res) => sendSuccess(res, 200, req.user));

/** PATCH /auth/me */
const updateMe = asyncHandler(async (req, res) => {
  req.user.name = req.body.name;
  await req.user.save();
  return sendSuccess(res, 200, req.user);
});

module.exports = { register, login, me, updateMe };

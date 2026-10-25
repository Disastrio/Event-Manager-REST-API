'use strict';

const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, paginationMeta } = require('../utils/response');
const { escapeRegex, getPagination } = require('../utils/query');

/** GET /users — admin only, paginated and searchable. */
const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { role, search } = req.query;

  const filter = {};
  if (role) filter.role = role;
  if (search) {
    const regex = { $regex: escapeRegex(search), $options: 'i' };
    filter.$or = [{ name: regex }, { email: regex }];
  }

  const [users, total] = await Promise.all([
    User.find(filter).sort('-createdAt').skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return sendSuccess(res, 200, users, paginationMeta(total, page, limit));
});

/** PATCH /users/:id/role — admin only. */
const updateUserRole = asyncHandler(async (req, res) => {
  const { role } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) throw ApiError.notFound('User not found', 'USER_NOT_FOUND');

  if (user._id.equals(req.user._id) && role !== 'admin') {
    throw ApiError.conflict('You cannot remove your own admin role', 'CANNOT_DEMOTE_SELF');
  }

  if (user.role === 'admin' && role !== 'admin') {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount <= 1) {
      throw ApiError.conflict('Cannot demote the last remaining admin', 'LAST_ADMIN');
    }
  }

  user.role = role;
  await user.save();

  return sendSuccess(res, 200, user);
});

module.exports = { listUsers, updateUserRole };

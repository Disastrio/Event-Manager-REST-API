'use strict';

const Event = require('../models/Event');
const Registration = require('../models/Registration');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, paginationMeta } = require('../utils/response');
const { getPagination } = require('../utils/query');
const { canManage } = require('./eventController');

/**
 * Reserve one seat with a single conditional update. This is atomic at the
 * document level, so concurrent registrations cannot oversell the event.
 */
async function reserveSeat(eventId) {
  return Event.findOneAndUpdate(
    {
      _id: eventId,
      status: 'published',
      $expr: { $lt: ['$registeredCount', '$capacity'] },
    },
    { $inc: { registeredCount: 1 } },
    { new: true }
  );
}

async function releaseSeat(eventId) {
  await Event.updateOne(
    { _id: eventId, registeredCount: { $gt: 0 } },
    { $inc: { registeredCount: -1 } }
  );
}

function assertEventIsOpen(event) {
  if (event.status !== 'published') {
    throw ApiError.badRequest('This event is not open for registration', 'EVENT_NOT_OPEN');
  }
  if (event.startDate <= new Date()) {
    throw ApiError.badRequest('This event has already started', 'EVENT_STARTED');
  }
}

/** POST /events/:id/register */
const registerForEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw ApiError.notFound('Event not found', 'EVENT_NOT_FOUND');
  assertEventIsOpen(event);

  if (event.registeredCount >= event.capacity) {
    throw ApiError.conflict('This event is full', 'EVENT_FULL');
  }

  const existing = await Registration.findOne({ event: event._id, user: req.user._id });

  if (existing && existing.status === 'registered') {
    throw ApiError.conflict('You are already registered for this event', 'ALREADY_REGISTERED');
  }

  // Cancelled registration: reactivate it instead of inserting a duplicate.
  if (existing) {
    const reserved = await reserveSeat(event._id);
    if (!reserved) throw ApiError.conflict('This event is full', 'EVENT_FULL');

    const reactivated = await Registration.findOneAndUpdate(
      { _id: existing._id, status: 'cancelled' },
      { $set: { status: 'registered', registeredAt: new Date() }, $unset: { cancelledAt: 1 } },
      { new: true }
    ).populate('event');

    if (!reactivated) {
      await releaseSeat(event._id);
      throw ApiError.conflict('You are already registered for this event', 'ALREADY_REGISTERED');
    }

    return sendSuccess(res, 201, reactivated);
  }

  const reserved = await reserveSeat(event._id);
  if (!reserved) throw ApiError.conflict('This event is full', 'EVENT_FULL');

  let registration;
  try {
    registration = await Registration.create({ event: event._id, user: req.user._id });
  } catch (err) {
    await releaseSeat(event._id);
    if (err.code === 11000) {
      throw ApiError.conflict('You are already registered for this event', 'ALREADY_REGISTERED');
    }
    throw err;
  }

  await registration.populate('event');
  return sendSuccess(res, 201, registration);
});

/** DELETE /events/:id/register — cancel the caller's registration. */
const cancelRegistration = asyncHandler(async (req, res) => {
  const registration = await Registration.findOneAndUpdate(
    { event: req.params.id, user: req.user._id, status: 'registered' },
    { $set: { status: 'cancelled', cancelledAt: new Date() } },
    { new: true }
  ).populate('event');

  if (!registration) {
    throw ApiError.notFound(
      'You do not have an active registration for this event',
      'REGISTRATION_NOT_FOUND'
    );
  }

  await releaseSeat(registration.event?._id || req.params.id);
  return sendSuccess(res, 200, registration);
});

/** GET /registrations/me — the caller's registrations, paginated. */
const myRegistrations = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);

  const filter = { user: req.user._id };
  if (req.query.status) filter.status = req.query.status;

  const [registrations, total] = await Promise.all([
    Registration.find(filter)
      .sort('-createdAt')
      .skip(skip)
      .limit(limit)
      .populate('event', 'title description category location startDate endDate capacity status registeredCount'),
    Registration.countDocuments(filter),
  ]);

  return sendSuccess(res, 200, registrations, paginationMeta(total, page, limit));
});

/** GET /events/:id/registrations — admin or organizer view of attendees. */
const eventRegistrations = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw ApiError.notFound('Event not found', 'EVENT_NOT_FOUND');

  if (!canManage(event, req.user)) {
    throw ApiError.forbidden(
      'Only the organizer or an admin can view registrations for this event',
      'NOT_EVENT_OWNER'
    );
  }

  const { page, limit, skip } = getPagination(req.query);
  const filter = { event: event._id };
  if (req.query.status) filter.status = req.query.status;

  const [registrations, total] = await Promise.all([
    Registration.find(filter)
      .sort('-createdAt')
      .skip(skip)
      .limit(limit)
      .populate('user', 'name email role'),
    Registration.countDocuments(filter),
  ]);

  return sendSuccess(res, 200, registrations, paginationMeta(total, page, limit));
});

module.exports = {
  registerForEvent,
  cancelRegistration,
  myRegistrations,
  eventRegistrations,
};

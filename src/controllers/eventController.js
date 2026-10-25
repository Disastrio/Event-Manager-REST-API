'use strict';

const Event = require('../models/Event');
const Registration = require('../models/Registration');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, paginationMeta } = require('../utils/response');
const { escapeRegex, getPagination } = require('../utils/query');

const UPDATABLE_FIELDS = [
  'title',
  'description',
  'category',
  'location',
  'startDate',
  'endDate',
  'capacity',
  'status',
];

function canManage(event, user) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return event.organizer && event.organizer.toString() === user._id.toString();
}

/** GET /events — public, paginated, searchable. */
const listEvents = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPagination(req.query);
  const { search, category, sort } = req.query;

  const filter = {};

  // Non-admins only ever see published events, regardless of ?status.
  if (!req.user || req.user.role !== 'admin') {
    filter.status = 'published';
  } else if (req.query.status) {
    filter.status = req.query.status;
  }

  if (category) {
    filter.category = { $regex: `^${escapeRegex(category)}$`, $options: 'i' };
  }

  if (search) {
    const regex = { $regex: escapeRegex(search), $options: 'i' };
    filter.$or = [{ title: regex }, { description: regex }, { location: regex }];
  }

  let sortBy = '-createdAt';
  if (sort) {
    // `title` sorts ascending, `-title` descending.
    sortBy = String(sort);
  }

  const [events, total] = await Promise.all([
    Event.find(filter)
      .sort(sortBy)
      .skip(skip)
      .limit(limit)
      .populate('organizer', 'name email role'),
    Event.countDocuments(filter),
  ]);

  return sendSuccess(res, 200, events, paginationMeta(total, page, limit));
});

/** GET /events/categories — distinct categories for filter UIs. */
const listCategories = asyncHandler(async (req, res) => {
  const match = !req.user || req.user.role !== 'admin' ? { status: 'published' } : {};
  const categories = await Event.distinct('category', match);
  categories.sort((a, b) => a.localeCompare(b));
  return sendSuccess(res, 200, categories);
});

/** GET /events/:id — public for published events, owner/admin for drafts. */
const getEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id).populate('organizer', 'name email role');
  if (!event) throw ApiError.notFound('Event not found', 'EVENT_NOT_FOUND');

  if (event.status !== 'published' && !canManage(event, req.user)) {
    // Hide non-public events instead of leaking their existence.
    throw ApiError.notFound('Event not found', 'EVENT_NOT_FOUND');
  }

  const payload = event.toJSON();
  if (req.user) {
    const registration = await Registration.exists({
      event: event._id,
      user: req.user._id,
      status: 'registered',
    });
    payload.isRegistered = Boolean(registration);
  }

  return sendSuccess(res, 200, payload);
});

/** POST /events — admin only. */
const createEvent = asyncHandler(async (req, res) => {
  const event = await Event.create({
    title: req.body.title,
    description: req.body.description,
    category: req.body.category,
    location: req.body.location,
    startDate: req.body.startDate,
    endDate: req.body.endDate,
    capacity: req.body.capacity,
    status: req.body.status || 'published',
    organizer: req.user._id,
  });

  await event.populate('organizer', 'name email role');
  return sendSuccess(res, 201, event);
});

/** PATCH /events/:id — admin or the organizer. */
const updateEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw ApiError.notFound('Event not found', 'EVENT_NOT_FOUND');

  if (!canManage(event, req.user)) {
    throw ApiError.forbidden('Only the organizer or an admin can update this event', 'NOT_EVENT_OWNER');
  }

  if (req.body.capacity !== undefined && req.body.capacity < event.registeredCount) {
    throw ApiError.unprocessable(
      `Capacity cannot be lower than the ${event.registeredCount} existing registrations`,
      'CAPACITY_BELOW_REGISTRATIONS',
      [{ field: 'capacity', message: `Minimum capacity is ${event.registeredCount}` }]
    );
  }

  for (const field of UPDATABLE_FIELDS) {
    if (req.body[field] !== undefined) event[field] = req.body[field];
  }

  await event.save();
  await event.populate('organizer', 'name email role');
  return sendSuccess(res, 200, event);
});

/** DELETE /events/:id — admin or the organizer. Removes registrations too. */
const deleteEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) throw ApiError.notFound('Event not found', 'EVENT_NOT_FOUND');

  if (!canManage(event, req.user)) {
    throw ApiError.forbidden('Only the organizer or an admin can delete this event', 'NOT_EVENT_OWNER');
  }

  await Promise.all([
    Event.deleteOne({ _id: event._id }),
    Registration.deleteMany({ event: event._id }),
  ]);

  return res.status(204).send();
});

module.exports = {
  listEvents,
  listCategories,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
  canManage,
};

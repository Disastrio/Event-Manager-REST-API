'use strict';

const { body, param, query } = require('express-validator');
const Event = require('../models/Event');

const EVENT_STATUSES = Event.STATUSES;

const SORTABLE_FIELDS = ['createdAt', 'startDate', 'title', 'capacity', 'registeredCount'];

const eventIdValidator = [
  param('id').isMongoId().withMessage('Invalid event id'),
];

const createEventValidator = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Title is required')
    .isLength({ min: 3, max: 120 })
    .withMessage('Title must be between 3 and 120 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be between 10 and 5000 characters'),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Category must be between 2 and 50 characters'),
  body('location')
    .trim()
    .notEmpty()
    .withMessage('Location is required')
    .isLength({ min: 2, max: 200 })
    .withMessage('Location must be between 2 and 200 characters'),
  body('startDate')
    .notEmpty()
    .withMessage('Start date is required')
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date')
    .toDate()
    .custom((value) => new Date(value) > new Date())
    .withMessage('Start date must be in the future'),
  body('endDate')
    .notEmpty()
    .withMessage('End date is required')
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .toDate()
    .custom((value, { req }) => {
      const start = req.body.startDate instanceof Date ? req.body.startDate : new Date(req.body.startDate);
      return new Date(value) > start;
    })
    .withMessage('End date must be after start date'),
  body('capacity')
    .notEmpty()
    .withMessage('Capacity is required')
    .isInt({ min: 1, max: 100000 })
    .withMessage('Capacity must be an integer between 1 and 100000')
    .toInt(),
  body('status')
    .optional()
    .isIn(EVENT_STATUSES)
    .withMessage(`Status must be one of: ${EVENT_STATUSES.join(', ')}`),
];

const updateEventValidator = [
  ...eventIdValidator,
  body('title')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Title cannot be empty')
    .isLength({ min: 3, max: 120 })
    .withMessage('Title must be between 3 and 120 characters'),
  body('description')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Description cannot be empty')
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be between 10 and 5000 characters'),
  body('category')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Category cannot be empty')
    .isLength({ min: 2, max: 50 })
    .withMessage('Category must be between 2 and 50 characters'),
  body('location')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Location cannot be empty')
    .isLength({ min: 2, max: 200 })
    .withMessage('Location must be between 2 and 200 characters'),
  body('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date')
    .toDate(),
  body('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .toDate(),
  body('capacity')
    .optional()
    .isInt({ min: 1, max: 100000 })
    .withMessage('Capacity must be an integer between 1 and 100000')
    .toInt(),
  body('status')
    .optional()
    .isIn(EVENT_STATUSES)
    .withMessage(`Status must be one of: ${EVENT_STATUSES.join(', ')}`),
  body().custom((value) => {
    const allowed = ['title', 'description', 'category', 'location', 'startDate', 'endDate', 'capacity', 'status'];
    const hasField = allowed.some((field) => value[field] !== undefined);
    if (!hasField) throw new Error('Provide at least one field to update');
    return true;
  }),
];

const listEventsValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer').toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  query('search')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search must be at most 100 characters'),
  query('category')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Category must be between 2 and 50 characters'),
  query('status')
    .optional()
    .isIn(EVENT_STATUSES)
    .withMessage(`Status must be one of: ${EVENT_STATUSES.join(', ')}`),
  query('sort')
    .optional()
    .custom((value) => {
      const field = String(value).replace(/^-/, '');
      if (!SORTABLE_FIELDS.includes(field)) {
        throw new Error(`Sort must be one of: ${SORTABLE_FIELDS.join(', ')} (optionally prefixed with -)`);
      }
      return true;
    }),
];

module.exports = {
  eventIdValidator,
  createEventValidator,
  updateEventValidator,
  listEventsValidator,
  SORTABLE_FIELDS,
};

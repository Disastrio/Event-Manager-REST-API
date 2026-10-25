'use strict';

const express = require('express');
const {
  listEvents,
  listCategories,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
} = require('../controllers/eventController');
const {
  registerForEvent,
  cancelRegistration,
  eventRegistrations,
} = require('../controllers/registrationController');
const { authenticate, optionalAuth, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  eventIdValidator,
  createEventValidator,
  updateEventValidator,
  listEventsValidator,
} = require('../validators/eventValidators');
const {
  registrationIdValidator,
  eventRegistrationsValidator,
} = require('../validators/registrationValidators');

const router = express.Router();

// Collection
router.get('/', optionalAuth, listEventsValidator, validate, listEvents);
router.post('/', authenticate, authorize('admin'), createEventValidator, validate, createEvent);

// Must be registered before /:id so "categories" is not treated as an id.
router.get('/categories', optionalAuth, listCategories);

// Registration actions for a single event
router.post('/:id/register', authenticate, registrationIdValidator, validate, registerForEvent);
router.delete('/:id/register', authenticate, registrationIdValidator, validate, cancelRegistration);
router.get(
  '/:id/registrations',
  authenticate,
  eventRegistrationsValidator,
  validate,
  eventRegistrations
);

// Single event
router.get('/:id', optionalAuth, eventIdValidator, validate, getEvent);
router.patch('/:id', authenticate, updateEventValidator, validate, updateEvent);
router.delete('/:id', authenticate, eventIdValidator, validate, deleteEvent);

module.exports = router;

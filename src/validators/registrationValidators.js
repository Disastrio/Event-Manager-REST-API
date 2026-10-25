'use strict';

const { query, param } = require('express-validator');

const registrationIdValidator = [
  param('id').isMongoId().withMessage('Invalid event id'),
];

const myRegistrationsValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer').toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  query('status')
    .optional()
    .isIn(['registered', 'cancelled'])
    .withMessage('Status must be one of: registered, cancelled'),
];

const eventRegistrationsValidator = [
  ...registrationIdValidator,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer').toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  query('status')
    .optional()
    .isIn(['registered', 'cancelled'])
    .withMessage('Status must be one of: registered, cancelled'),
];

const usersQueryValidator = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer').toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
    .toInt(),
  query('role')
    .optional()
    .isIn(['student', 'admin'])
    .withMessage('Role must be one of: student, admin'),
  query('search')
    .optional()
    .isString()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Search must be at most 100 characters'),
];

module.exports = {
  registrationIdValidator,
  myRegistrationsValidator,
  eventRegistrationsValidator,
  usersQueryValidator,
};

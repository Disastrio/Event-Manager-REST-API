'use strict';

const { param, body } = require('express-validator');

const userIdValidator = [param('id').isMongoId().withMessage('Invalid user id')];

const updateRoleValidator = [
  ...userIdValidator,
  body('role')
    .notEmpty()
    .withMessage('Role is required')
    .isIn(['student', 'admin'])
    .withMessage('Role must be one of: student, admin'),
];

module.exports = { userIdValidator, updateRoleValidator };

'use strict';

const express = require('express');
const { listUsers, updateUserRole } = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { updateRoleValidator } = require('../validators/userValidators');
const { usersQueryValidator } = require('../validators/registrationValidators');

const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get('/', usersQueryValidator, validate, listUsers);
router.patch('/:id/role', updateRoleValidator, validate, updateUserRole);

module.exports = router;

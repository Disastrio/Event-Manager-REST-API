'use strict';

const express = require('express');
const { myRegistrations } = require('../controllers/registrationController');
const { authenticate } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { myRegistrationsValidator } = require('../validators/registrationValidators');

const router = express.Router();

router.get('/me', authenticate, myRegistrationsValidator, validate, myRegistrations);

module.exports = router;

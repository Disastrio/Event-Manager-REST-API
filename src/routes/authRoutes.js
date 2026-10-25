'use strict';

const express = require('express');
const { register, login, me, updateMe } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const validate = require('../middleware/validate');
const {
  registerValidator,
  loginValidator,
  updateMeValidator,
} = require('../validators/authValidators');

const router = express.Router();

router.post('/register', authLimiter, registerValidator, validate, register);
router.post('/login', authLimiter, loginValidator, validate, login);
router.get('/me', authenticate, me);
router.patch('/me', authenticate, updateMeValidator, validate, updateMe);

module.exports = router;

'use strict';

const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Event = require('../src/models/Event');
const { signToken } = require('../src/utils/jwt');

const DAY = 24 * 60 * 60 * 1000;
let userCounter = 0;

function inDays(days) {
  return new Date(Date.now() + days * DAY);
}

async function createUser(overrides = {}) {
  userCounter += 1;
  return User.create({
    name: `Test User ${userCounter}`,
    email: `user${userCounter}@test.edu`,
    password: 'Passw0rd123',
    role: 'student',
    ...overrides,
  });
}

function tokenFor(user) {
  return signToken(user);
}

function authHeader(user) {
  return { Authorization: `Bearer ${tokenFor(user)}` };
}

async function createEvent(organizer, overrides = {}) {
  return Event.create({
    title: 'Test Event',
    description: 'A valid test event description with enough characters.',
    category: 'Technology',
    location: 'Main Hall',
    startDate: inDays(10),
    endDate: inDays(11),
    capacity: 10,
    organizer: organizer._id,
    status: 'published',
    ...overrides,
  });
}

module.exports = {
  app,
  request,
  User,
  Event,
  createUser,
  tokenFor,
  authHeader,
  createEvent,
  inDays,
};

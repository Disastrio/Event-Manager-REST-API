'use strict';

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const { connectDB, disconnectDB } = require('../src/config/db');
const User = require('../src/models/User');
const Event = require('../src/models/Event');
const Registration = require('../src/models/Registration');

jest.setTimeout(120000);

let mongod;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await connectDB(mongod.getUri());
  // Wait for unique/text indexes so duplicate-key tests are deterministic.
  await Promise.all([User.init(), Event.init(), Registration.init()]);
});

afterEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((collection) => collection.deleteMany({})));
});

afterAll(async () => {
  await disconnectDB();
  if (mongod) await mongod.stop();
});

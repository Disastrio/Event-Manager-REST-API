'use strict';

const { seed } = require('../src/seed');
const User = require('../src/models/User');
const Event = require('../src/models/Event');

describe('Seed script', () => {
  it('creates the admin and sample events, and is idempotent', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    try {
      const first = await seed({ connect: false, disconnect: false });
      expect(first.adminCreated).toBe(true);
      expect(first.sampleEventsCreated).toBeGreaterThan(0);

      const second = await seed({ connect: false, disconnect: false });
      expect(second.adminCreated).toBe(false);
      expect(second.sampleEventsCreated).toBe(0);

      expect(await User.countDocuments({ role: 'admin' })).toBe(1);
      expect(await Event.countDocuments()).toBe(first.sampleEventsCreated);

      const admin = await User.findOne({ email: 'admin@test.edu' }).select('+password');
      expect(admin).not.toBeNull();
      expect(admin.role).toBe('admin');
      expect(await admin.comparePassword('Admin@12345')).toBe(true);
    } finally {
      logSpy.mockRestore();
    }
  });
});

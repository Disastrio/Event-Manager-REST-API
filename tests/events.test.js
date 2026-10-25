'use strict';

const mongoose = require('mongoose');
const {
  app,
  request,
  User,
  Event,
  createUser,
  authHeader,
  createEvent,
  inDays,
} = require('./helpers');

const baseEvent = {
  title: 'Robotics Workshop',
  description: 'Build and program a simple robot in one afternoon.',
  category: 'Technology',
  location: 'Lab 204',
  startDate: inDays(14).toISOString(),
  endDate: inDays(14.25).toISOString(),
  capacity: 30,
};

describe('Events', () => {
  let admin;
  let student;

  beforeEach(async () => {
    admin = await createUser({ role: 'admin' });
    student = await createUser();
  });

  describe('POST /api/v1/events', () => {
    it('lets an admin create an event', async () => {
      const res = await request(app)
        .post('/api/v1/events')
        .set(authHeader(admin))
        .send(baseEvent);

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({
        title: baseEvent.title,
        category: 'Technology',
        capacity: 30,
        status: 'published',
        registeredCount: 0,
      });
      expect(res.body.data.organizer.email).toBe(admin.email);
      expect(res.body.data.isFull).toBe(false);
    });

    it('forbids students from creating events', async () => {
      const res = await request(app)
        .post('/api/v1/events')
        .set(authHeader(student))
        .send(baseEvent);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('INSUFFICIENT_ROLE');
    });

    it('requires authentication', async () => {
      const res = await request(app).post('/api/v1/events').send(baseEvent);
      expect(res.status).toBe(401);
    });

    it('rejects an end date before the start date', async () => {
      const res = await request(app)
        .post('/api/v1/events')
        .set(authHeader(admin))
        .send({ ...baseEvent, startDate: inDays(10).toISOString(), endDate: inDays(5).toISOString() });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'endDate' })])
      );
    });

    it('rejects a start date in the past', async () => {
      const res = await request(app)
        .post('/api/v1/events')
        .set(authHeader(admin))
        .send({ ...baseEvent, startDate: inDays(-2).toISOString(), endDate: inDays(1).toISOString() });

      expect(res.status).toBe(422);
      expect(res.body.error.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'startDate' })])
      );
    });

    it('rejects missing and invalid fields', async () => {
      const res = await request(app)
        .post('/api/v1/events')
        .set(authHeader(admin))
        .send({ title: 'x', capacity: 0 });

      expect(res.status).toBe(422);
      const fields = res.body.error.details.map((detail) => detail.field);
      expect(fields).toEqual(
        expect.arrayContaining(['title', 'description', 'category', 'location', 'capacity'])
      );
    });
  });

  describe('GET /api/v1/events', () => {
    beforeEach(async () => {
      await createEvent(admin, { title: 'Robotics Workshop' });
      await createEvent(admin, { title: 'Football Cup', category: 'Sports' });
      await createEvent(admin, { title: 'Cultural Night', category: 'Cultural' });
    });

    it('returns a paginated list with metadata', async () => {
      const res = await request(app).get('/api/v1/events?page=1&limit=2');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta).toMatchObject({
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2,
        hasNextPage: true,
        hasPrevPage: false,
      });
    });

    it('returns the next page', async () => {
      const res = await request(app).get('/api/v1/events?page=2&limit=2');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta.hasNextPage).toBe(false);
      expect(res.body.meta.hasPrevPage).toBe(true);
    });

    it('searches by title, description or location (case-insensitive)', async () => {
      const res = await request(app).get('/api/v1/events?search=football');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe('Football Cup');
    });

    it('filters by category', async () => {
      const res = await request(app).get('/api/v1/events?category=Sports');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].category).toBe('Sports');
    });

    it('sorts results', async () => {
      const res = await request(app).get('/api/v1/events?sort=title');

      expect(res.status).toBe(200);
      const titles = res.body.data.map((event) => event.title);
      expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)));
    });

    it('rejects an invalid sort field', async () => {
      const res = await request(app).get('/api/v1/events?sort=password');
      expect(res.status).toBe(422);
    });

    it('rejects an out-of-range limit', async () => {
      const res = await request(app).get('/api/v1/events?limit=500');
      expect(res.status).toBe(422);
    });

    it('hides draft events from students but not admins', async () => {
      await createEvent(admin, { title: 'Secret Draft', status: 'draft' });

      const studentRes = await request(app).get('/api/v1/events');
      expect(studentRes.body.data.map((event) => event.title)).not.toContain('Secret Draft');

      const adminRes = await request(app)
        .get('/api/v1/events?status=draft')
        .set(authHeader(admin));
      expect(adminRes.body.data.map((event) => event.title)).toContain('Secret Draft');
    });
  });

  describe('GET /api/v1/events/:id', () => {
    it('returns a published event', async () => {
      const event = await createEvent(admin);

      const res = await request(app).get(`/api/v1/events/${event._id}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(event._id.toString());
    });

    it('includes isRegistered for a signed-in attendee', async () => {
      const event = await createEvent(admin);
      await request(app)
        .post(`/api/v1/events/${event._id}/register`)
        .set(authHeader(student))
        .expect(201);

      const res = await request(app)
        .get(`/api/v1/events/${event._id}`)
        .set(authHeader(student));

      expect(res.status).toBe(200);
      expect(res.body.data.isRegistered).toBe(true);
    });

    it('returns 404 for an unknown event', async () => {
      const res = await request(app).get(`/api/v1/events/${new mongoose.Types.ObjectId()}`);
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('EVENT_NOT_FOUND');
    });

    it('returns 422 for a malformed id', async () => {
      const res = await request(app).get('/api/v1/events/not-an-id');
      expect(res.status).toBe(422);
    });

    it('returns 404 for a draft to a student', async () => {
      const event = await createEvent(admin, { status: 'draft' });
      const res = await request(app)
        .get(`/api/v1/events/${event._id}`)
        .set(authHeader(student));

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/events/:id', () => {
    it('lets the organizer update fields', async () => {
      const event = await createEvent(admin);

      const res = await request(app)
        .patch(`/api/v1/events/${event._id}`)
        .set(authHeader(admin))
        .send({ title: 'Updated Robotics Workshop', capacity: 50 });

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Updated Robotics Workshop');
      expect(res.body.data.capacity).toBe(50);
    });

    it('forbids a student who does not own the event', async () => {
      const event = await createEvent(admin);

      const res = await request(app)
        .patch(`/api/v1/events/${event._id}`)
        .set(authHeader(student))
        .send({ title: 'Hijacked' });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('NOT_EVENT_OWNER');
    });

    it('rejects an empty update body', async () => {
      const event = await createEvent(admin);

      const res = await request(app)
        .patch(`/api/v1/events/${event._id}`)
        .set(authHeader(admin))
        .send({});

      expect(res.status).toBe(422);
    });

    it('rejects a capacity below the current registrations', async () => {
      const event = await createEvent(admin, { capacity: 5 });
      event.registeredCount = 3;
      await event.save();

      const res = await request(app)
        .patch(`/api/v1/events/${event._id}`)
        .set(authHeader(admin))
        .send({ capacity: 2 });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('CAPACITY_BELOW_REGISTRATIONS');
    });

    it('returns 404 for an unknown event', async () => {
      const res = await request(app)
        .patch(`/api/v1/events/${new mongoose.Types.ObjectId()}`)
        .set(authHeader(admin))
        .send({ title: 'Nothing here' });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/events/:id', () => {
    it('deletes the event and its registrations', async () => {
      const event = await createEvent(admin);
      await request(app)
        .post(`/api/v1/events/${event._id}/register`)
        .set(authHeader(student))
        .expect(201);

      const res = await request(app)
        .delete(`/api/v1/events/${event._id}`)
        .set(authHeader(admin));

      expect(res.status).toBe(204);
      expect(await Event.findById(event._id)).toBeNull();

      const Registration = require('../src/models/Registration');
      expect(await Registration.countDocuments({ event: event._id })).toBe(0);
    });

    it('forbids a student from deleting an event', async () => {
      const event = await createEvent(admin);
      const res = await request(app)
        .delete(`/api/v1/events/${event._id}`)
        .set(authHeader(student));

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/v1/events/categories', () => {
    it('returns distinct categories', async () => {
      await createEvent(admin, { category: 'Technology' });
      await createEvent(admin, { category: 'Sports' });

      const res = await request(app).get('/api/v1/events/categories');
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual(expect.arrayContaining(['Sports', 'Technology']));
    });
  });

  describe('GET /api/v1/health', () => {
    it('reports health', async () => {
      const res = await request(app).get('/api/v1/health');
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('ok');
      expect(res.body.data.database).toBe('connected');
    });
  });
});

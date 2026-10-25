'use strict';

const {
  app,
  request,
  createUser,
  authHeader,
  createEvent,
  inDays,
} = require('./helpers');
const Registration = require('../src/models/Registration');
const Event = require('../src/models/Event');

describe('Registrations', () => {
  let admin;
  let student;
  let otherStudent;

  beforeEach(async () => {
    admin = await createUser({ role: 'admin' });
    student = await createUser();
    otherStudent = await createUser();
  });

  describe('POST /api/v1/events/:id/register', () => {
    it('registers a student and increments the count', async () => {
      const event = await createEvent(admin);

      const res = await request(app)
        .post(`/api/v1/events/${event._id}/register`)
        .set(authHeader(student));

      expect(res.status).toBe(201);
      expect(res.body.data).toMatchObject({ status: 'registered' });
      expect(res.body.data.event.id).toBe(event._id.toString());

      const updated = await Event.findById(event._id);
      expect(updated.registeredCount).toBe(1);
    });

    it('requires authentication', async () => {
      const event = await createEvent(admin);
      const res = await request(app).post(`/api/v1/events/${event._id}/register`);
      expect(res.status).toBe(401);
    });

    it('rejects duplicate registrations', async () => {
      const event = await createEvent(admin);

      await request(app)
        .post(`/api/v1/events/${event._id}/register`)
        .set(authHeader(student))
        .expect(201);

      const res = await request(app)
        .post(`/api/v1/events/${event._id}/register`)
        .set(authHeader(student));

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ALREADY_REGISTERED');

      const updated = await Event.findById(event._id);
      expect(updated.registeredCount).toBe(1);
      expect(await Registration.countDocuments({ event: event._id })).toBe(1);
    });

    it('rejects registration when the event is full', async () => {
      const event = await createEvent(admin, { capacity: 1 });

      await request(app)
        .post(`/api/v1/events/${event._id}/register`)
        .set(authHeader(student))
        .expect(201);

      const res = await request(app)
        .post(`/api/v1/events/${event._id}/register`)
        .set(authHeader(otherStudent));

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('EVENT_FULL');

      const updated = await Event.findById(event._id);
      expect(updated.registeredCount).toBe(1);
    });

    it('rejects registration for a draft event', async () => {
      const event = await createEvent(admin, { status: 'draft' });

      const res = await request(app)
        .post(`/api/v1/events/${event._id}/register`)
        .set(authHeader(student));

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('EVENT_NOT_OPEN');
    });

    it('rejects registration for an event that already started', async () => {
      const event = await createEvent(admin, {
        startDate: inDays(-2),
        endDate: inDays(-1),
      });

      const res = await request(app)
        .post(`/api/v1/events/${event._id}/register`)
        .set(authHeader(student));

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('EVENT_STARTED');
    });

    it('returns 404 for an unknown event', async () => {
      const res = await request(app)
        .post('/api/v1/events/64b7f7f7f7f7f7f7f7f7f7f7/register')
        .set(authHeader(student));

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/events/:id/register', () => {
    it('cancels a registration and releases the seat', async () => {
      const event = await createEvent(admin);
      await request(app)
        .post(`/api/v1/events/${event._id}/register`)
        .set(authHeader(student))
        .expect(201);

      const res = await request(app)
        .delete(`/api/v1/events/${event._id}/register`)
        .set(authHeader(student));

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('cancelled');

      const updated = await Event.findById(event._id);
      expect(updated.registeredCount).toBe(0);
    });

    it('returns 404 when there is no active registration', async () => {
      const event = await createEvent(admin);

      const res = await request(app)
        .delete(`/api/v1/events/${event._id}/register`)
        .set(authHeader(student));

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('REGISTRATION_NOT_FOUND');
    });

    it('allows re-registering after cancelling without duplicating records', async () => {
      const event = await createEvent(admin);

      await request(app)
        .post(`/api/v1/events/${event._id}/register`)
        .set(authHeader(student))
        .expect(201);
      await request(app)
        .delete(`/api/v1/events/${event._id}/register`)
        .set(authHeader(student))
        .expect(200);

      const res = await request(app)
        .post(`/api/v1/events/${event._id}/register`)
        .set(authHeader(student));

      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe('registered');

      const registrations = await Registration.find({ event: event._id, user: student._id });
      expect(registrations).toHaveLength(1);
      expect(registrations[0].status).toBe('registered');

      const updated = await Event.findById(event._id);
      expect(updated.registeredCount).toBe(1);
    });
  });

  describe('GET /api/v1/registrations/me', () => {
    it('lists the current user’s registrations with pagination', async () => {
      const first = await createEvent(admin, { title: 'First Event' });
      const second = await createEvent(admin, { title: 'Second Event' });
      await createEvent(admin, { title: 'Third Event' });

      await request(app)
        .post(`/api/v1/events/${first._id}/register`)
        .set(authHeader(student))
        .expect(201);
      await request(app)
        .post(`/api/v1/events/${second._id}/register`)
        .set(authHeader(student))
        .expect(201);

      const res = await request(app)
        .get('/api/v1/registrations/me?limit=1')
        .set(authHeader(student));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta.total).toBe(2);
      expect(res.body.meta.totalPages).toBe(2);
    });

    it('filters by registration status', async () => {
      const event = await createEvent(admin);
      await request(app)
        .post(`/api/v1/events/${event._id}/register`)
        .set(authHeader(student))
        .expect(201);
      await request(app)
        .delete(`/api/v1/events/${event._id}/register`)
        .set(authHeader(student))
        .expect(200);

      const cancelled = await request(app)
        .get('/api/v1/registrations/me?status=cancelled')
        .set(authHeader(student));
      expect(cancelled.body.data).toHaveLength(1);

      const active = await request(app)
        .get('/api/v1/registrations/me?status=registered')
        .set(authHeader(student));
      expect(active.body.data).toHaveLength(0);
    });

    it('requires authentication', async () => {
      const res = await request(app).get('/api/v1/registrations/me');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/events/:id/registrations', () => {
    it('lets an admin see attendees', async () => {
      const event = await createEvent(admin);
      await request(app)
        .post(`/api/v1/events/${event._id}/register`)
        .set(authHeader(student))
        .expect(201);

      const res = await request(app)
        .get(`/api/v1/events/${event._id}/registrations`)
        .set(authHeader(admin));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].user.email).toBe(student.email);
    });

    it('lets the organizer see attendees', async () => {
      const organizer = await createUser();
      const event = await createEvent(organizer);
      await request(app)
        .post(`/api/v1/events/${event._id}/register`)
        .set(authHeader(student))
        .expect(201);

      const res = await request(app)
        .get(`/api/v1/events/${event._id}/registrations`)
        .set(authHeader(organizer));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('forbids an unrelated student', async () => {
      const event = await createEvent(admin);
      const res = await request(app)
        .get(`/api/v1/events/${event._id}/registrations`)
        .set(authHeader(student));

      expect(res.status).toBe(403);
    });

    it('returns 404 for an unknown event', async () => {
      const res = await request(app)
        .get('/api/v1/events/64b7f7f7f7f7f7f7f7f7f7f7/registrations')
        .set(authHeader(admin));

      expect(res.status).toBe(404);
    });
  });
});

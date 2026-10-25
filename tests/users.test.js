'use strict';

const { app, request, createUser, authHeader } = require('./helpers');

describe('Users (admin)', () => {
  let admin;
  let student;

  beforeEach(async () => {
    admin = await createUser({ role: 'admin' });
    student = await createUser({ name: 'Grace Hopper' });
  });

  describe('GET /api/v1/users', () => {
    it('lists users for an admin with pagination', async () => {
      const res = await request(app)
        .get('/api/v1/users?limit=1')
        .set(authHeader(admin));

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.meta.total).toBe(2);
      expect(res.body.meta.totalPages).toBe(2);
    });

    it('filters by role and searches by name', async () => {
      const res = await request(app)
        .get('/api/v1/users?role=admin')
        .set(authHeader(admin));
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].role).toBe('admin');

      const search = await request(app)
        .get('/api/v1/users?search=grace')
        .set(authHeader(admin));
      expect(search.body.data).toHaveLength(1);
      expect(search.body.data[0].name).toBe('Grace Hopper');
    });

    it('forbids a student', async () => {
      const res = await request(app)
        .get('/api/v1/users')
        .set(authHeader(student));

      expect(res.status).toBe(403);
    });
  });

  describe('PATCH /api/v1/users/:id/role', () => {
    it('promotes a student to admin', async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${student._id}/role`)
        .set(authHeader(admin))
        .send({ role: 'admin' });

      expect(res.status).toBe(200);
      expect(res.body.data.role).toBe('admin');
    });

    it('rejects an invalid role', async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${student._id}/role`)
        .set(authHeader(admin))
        .send({ role: 'superuser' });

      expect(res.status).toBe(422);
    });

    it('prevents an admin from demoting themselves', async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${admin._id}/role`)
        .set(authHeader(admin))
        .send({ role: 'student' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CANNOT_DEMOTE_SELF');
    });

    it('returns 404 for an unknown user', async () => {
      const res = await request(app)
        .patch('/api/v1/users/64b7f7f7f7f7f7f7f7f7f7f7/role')
        .set(authHeader(admin))
        .send({ role: 'admin' });

      expect(res.status).toBe(404);
    });

    it('forbids a student from changing roles', async () => {
      const res = await request(app)
        .patch(`/api/v1/users/${admin._id}/role`)
        .set(authHeader(student))
        .send({ role: 'student' });

      expect(res.status).toBe(403);
    });
  });
});

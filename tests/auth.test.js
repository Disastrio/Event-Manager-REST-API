'use strict';

const { app, request, User } = require('./helpers');

describe('Auth', () => {
  const validPayload = {
    name: 'Ada Lovelace',
    email: 'ada@campus.edu',
    password: 'Passw0rd123',
  };

  describe('POST /api/v1/auth/register', () => {
    it('creates a student, returns a token and never leaks the password', async () => {
      const res = await request(app).post('/api/v1/auth/register').send(validPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toEqual(expect.any(String));
      expect(res.body.data.user).toMatchObject({
        name: 'Ada Lovelace',
        email: 'ada@campus.edu',
        role: 'student',
      });
      expect(res.body.data.user.password).toBeUndefined();
      expect(res.body.data.user.id).toEqual(expect.any(String));

      const stored = await User.findOne({ email: 'ada@campus.edu' }).select('+password');
      expect(stored.password).not.toBe('Passw0rd123');
      expect(stored.password).toMatch(/^\$2[aby]\$/);
    });

    it('rejects a duplicate email with 409', async () => {
      await request(app).post('/api/v1/auth/register').send(validPayload).expect(201);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validPayload, name: 'Someone Else' });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('EMAIL_TAKEN');
    });

    it('rejects invalid input with field-level details', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ name: 'A', email: 'not-an-email', password: 'short' });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(Array.isArray(res.body.error.details)).toBe(true);

      const fields = res.body.error.details.map((detail) => detail.field);
      expect(fields).toEqual(expect.arrayContaining(['name', 'email', 'password']));
    });

    it('requires a password with a letter and a number', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validPayload, email: 'weak@campus.edu', password: 'onlyletters' });

      expect(res.status).toBe(422);
      expect(res.body.error.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'password' }),
        ])
      );
    });

    it('rejects password longer than bcrypt can safely hash (72 chars)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ ...validPayload, email: 'long@campus.edu', password: `${'a'.repeat(80)}1` });

      expect(res.status).toBe(422);
      expect(res.body.error.details).toEqual(
        expect.arrayContaining([expect.objectContaining({ field: 'password' })])
      );
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/auth/register').send(validPayload).expect(201);
    });

    it('returns a token for valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: validPayload.email, password: validPayload.password });

      expect(res.status).toBe(200);
      expect(res.body.data.token).toEqual(expect.any(String));
      expect(res.body.data.user.email).toBe(validPayload.email);
      expect(res.body.data.user.password).toBeUndefined();
    });

    it('returns a generic 401 for a wrong password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: validPayload.email, password: 'WrongPass1' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns a generic 401 for an unknown email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@campus.edu', password: 'Passw0rd123' });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('rejects requests without a token', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('MISSING_TOKEN');
    });

    it('rejects a malformed token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer not.a.jwt');

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    it('returns the current user for a valid token', async () => {
      const login = await request(app)
        .post('/api/v1/auth/register')
        .send(validPayload)
        .expect(201);

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${login.body.data.token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.email).toBe(validPayload.email);
    });
  });
});

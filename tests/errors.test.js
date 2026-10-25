'use strict';

const jwt = require('jsonwebtoken');
const config = require('../src/config/env');
const {
  app,
  request,
  createUser,
  authHeader,
  createEvent,
} = require('./helpers');

describe('Error handling', () => {
  it('returns a structured 404 for unknown routes', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: 'Route GET /api/v1/does-not-exist not found',
      },
    });
  });

  it('returns 400 for malformed JSON bodies', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": "broken"');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_JSON');
  });

  it('returns 413 when the body exceeds the 1 MB limit', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ email: 'a@b.co', password: 'x'.repeat(1024 * 1024 + 100) }));

    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe('PAYLOAD_TOO_LARGE');
  });

  it('returns 401 TOKEN_EXPIRED for an expired JWT', async () => {
    const user = await createUser();
    const expired = jwt.sign(
      { sub: user._id.toString(), role: user.role },
      config.jwt.secret,
      {
        expiresIn: '-1s',
        issuer: config.jwt.issuer,
        audience: config.jwt.audience,
      }
    );

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${expired}`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('converts Mongoose validation errors into 422 responses', async () => {
    const admin = await createUser({ role: 'admin' });
    const event = await createEvent(admin);

    // The update validator does not cross-check dates; the model does.
    const res = await request(app)
      .patch(`/api/v1/events/${event._id}`)
      .set(authHeader(admin))
      .send({ startDate: new Date(Date.now() + 30 * 86400000).toISOString() });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: 'endDate' })])
    );
  });

  it('returns 401 when a token refers to a deleted user', async () => {
    const user = await createUser();
    const header = authHeader(user);
    await user.deleteOne();

    const res = await request(app).get('/api/v1/auth/me').set(header);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });
});

import { jest, expect, beforeAll, afterAll, beforeEach, describe, it } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';

import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../src/app.js';
import User from '../../src/models/User.model.js';
import Account from '../../src/models/Account.model.js';

let mongoServer;
let app;

jest.setTimeout(30000);

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  app = createApp();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await User.deleteMany({});
  await Account.deleteMany({});
});

describe('Auth & User Account Integration Tests', () => {
  const validUser = {
    email: 'user@example.com',
    password: 'Password123!',
  };

  describe('POST /api/v1/auth/register', () => {
    it('creates a user and initial wallet account with 0 balance', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(validUser.email);
      expect(res.body.data.user.role).toBe('user');
      expect(res.body.data.user.passwordHash).toBeUndefined();

      // Verify wallet account was created in DB
      const account = await Account.findOne({ userId: res.body.data.user.id });
      expect(account).not.toBeNull();
      expect(account.cachedBalance).toBe(0);
      expect(account.currency).toBe('INR');
    });

    it('ignores client role=admin attempt and creates user with role=user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'admin_attempt@example.com', password: 'Password123!', role: 'admin' });

      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe('user');

      const dbUser = await User.findById(res.body.data.user.id);
      expect(dbUser.role).toBe('user');
    });

    it('ignores client role=SUPER_ADMIN attempt and creates user with role=user', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'superadmin_attempt@example.com', password: 'Password123!', role: 'SUPER_ADMIN' });

      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe('user');

      const dbUser = await User.findById(res.body.data.user.id);
      expect(dbUser.role).toBe('user');
    });

    it('rejects registration with duplicate email', async () => {
      await request(app).post('/api/v1/auth/register').send(validUser);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(validUser);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects registration with weak password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'weak@example.com', password: '123' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/v1/auth/register').send(validUser);
    });

    it('authenticates valid credentials and returns tokens', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: validUser.email,
        password: validUser.password,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.user.email).toBe(validUser.email);
    });

    it('rejects incorrect password', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: validUser.email,
        password: 'WrongPassword123!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/v1/accounts/me (Protected Route)', () => {
    let accessToken;

    beforeEach(async () => {
      await request(app).post('/api/v1/auth/register').send(validUser);
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: validUser.email,
        password: validUser.password,
      });
      accessToken = loginRes.body.data.accessToken;
    });

    it('allows access with valid Bearer access token', async () => {
      const res = await request(app)
        .get('/api/v1/accounts/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(validUser.email);
      expect(res.body.data.account.cachedBalance).toBe(0);
    });

    it('denies access without authorization header', async () => {
      const res = await request(app).get('/api/v1/accounts/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('denies access with malformed token', async () => {
      const res = await request(app)
        .get('/api/v1/accounts/me')
        .set('Authorization', 'Bearer invalidtoken123');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/v1/auth/refresh & Rotation', () => {
    let refreshToken;

    beforeEach(async () => {
      await request(app).post('/api/v1/auth/register').send(validUser);
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: validUser.email,
        password: validUser.password,
      });
      refreshToken = loginRes.body.data.refreshToken;
    });

    it('rotates refresh token and issues new tokens', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.refreshToken).toBeDefined();
      expect(res.body.data.refreshToken).not.toBe(refreshToken);
    });

    it('detects reuse of previously rotated refresh token and revokes session', async () => {
      // First refresh call -> consumes old refreshToken
      const firstRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(firstRes.status).toBe(200);

      // Reusing consumed refreshToken -> MUST be rejected with 401
      const reuseRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(reuseRes.status).toBe(401);
      expect(reuseRes.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    let accessToken;
    let refreshToken;

    beforeEach(async () => {
      await request(app).post('/api/v1/auth/register').send(validUser);
      const loginRes = await request(app).post('/api/v1/auth/login').send({
        email: validUser.email,
        password: validUser.password,
      });
      accessToken = loginRes.body.data.accessToken;
      refreshToken = loginRes.body.data.refreshToken;
    });

    it('logs out user and invalidates refresh token', async () => {
      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken });

      expect(logoutRes.status).toBe(200);

      // Submitting invalidated refresh token returns 401
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(refreshRes.status).toBe(401);
    });
  });
});

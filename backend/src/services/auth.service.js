import crypto from 'crypto';
import userRepository from '../repositories/user.repository.js';
import accountRepository from '../repositories/account.repository.js';
import { hashPassword, comparePassword, hashToken } from '../utils/hash.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { getRedisClient } from '../config/redis.js';
import { AppError } from '../utils/AppError.js';

// Fallback in-memory refresh token store when Redis is not running (e.g., unit tests)
const fallbackTokenStore = new Map();

class AuthService {
  /**
   * Helper to store a hashed refresh token in Redis or fallback store.
   */
  async _storeRefreshToken(userId, familyId, token) {
    const hashed = hashToken(token);
    const key = `refreshToken:${userId}:${familyId}`;
    const ttlSeconds = 7 * 24 * 60 * 60; // 7 days

    const redis = getRedisClient();
    if (redis && redis.status === 'ready') {
      await redis.set(key, hashed, 'EX', ttlSeconds);
    } else {
      fallbackTokenStore.set(key, hashed);
    }
  }

  /**
   * Helper to verify and consume a refresh token.
   */
  async _verifyAndConsumeRefreshToken(userId, familyId, token) {
    const key = `refreshToken:${userId}:${familyId}`;
    const hashed = hashToken(token);

    const redis = getRedisClient();
    let storedHash = null;

    if (redis && redis.status === 'ready') {
      storedHash = await redis.get(key);
      if (storedHash) {
        await redis.del(key);
      }
    } else {
      storedHash = fallbackTokenStore.get(key);
      if (storedHash) {
        fallbackTokenStore.delete(key);
      }
    }

    if (!storedHash || storedHash !== hashed) {
      // Reuse attempt detected! Revoke all tokens for this user family.
      if (redis && redis.status === 'ready') {
        const keys = await redis.keys(`refreshToken:${userId}:*`);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } else {
        for (const k of fallbackTokenStore.keys()) {
          if (k.startsWith(`refreshToken:${userId}:`)) {
            fallbackTokenStore.delete(k);
          }
        }
      }
      throw new AppError(
        'UNAUTHORIZED',
        'Refresh token has been revoked or previously used',
        401,
      );
    }
  }

  /**
   * Register a new user and create an initial wallet account.
   * Public registration ALWAYS forces role = 'user' to prevent privilege escalation.
   */
  async register({ email, password }) {
    const existing = await userRepository.findByEmail(email);
    if (existing) {
      throw new AppError('VALIDATION_ERROR', 'Email is already registered', 400);
    }

    const passwordHash = await hashPassword(password);
    const user = await userRepository.create({
      email,
      passwordHash,
      role: 'user', // Hardcoded to 'user' for public registration
      status: 'active',
    });

    await accountRepository.create({
      userId: user._id,
      currency: 'INR',
      cachedBalance: 0,
      version: 0,
      status: 'active',
    });

    return user;
  }

  /**
   * Authenticate user credentials and return access + refresh tokens.
   */
  async login({ email, password }) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new AppError('UNAUTHORIZED', 'Invalid email or password', 401);
    }

    if (user.status === 'frozen') {
      throw new AppError(
        'FORBIDDEN',
        'Account is frozen. Contact administrator.',
        403,
      );
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      throw new AppError('UNAUTHORIZED', 'Invalid email or password', 401);
    }

    const familyId = crypto.randomUUID();
    const accessToken = signAccessToken({ id: user._id.toString(), role: user.role });
    const refreshToken = signRefreshToken({ id: user._id.toString(), familyId });

    await this._storeRefreshToken(user._id.toString(), familyId, refreshToken);

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Refresh token rotation strategy.
   */
  async refresh({ refreshToken }) {
    if (!refreshToken) {
      throw new AppError('VALIDATION_ERROR', 'Refresh token is required', 400);
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch {
      throw new AppError('UNAUTHORIZED', 'Invalid or expired refresh token', 401);
    }

    const { id: userId, familyId } = decoded;

    // Verify and consume (token rotation)
    await this._verifyAndConsumeRefreshToken(userId, familyId, refreshToken);

    const user = await userRepository.findById(userId);
    if (!user || user.status === 'frozen') {
      throw new AppError('FORBIDDEN', 'User account is invalid or frozen', 403);
    }

    // Issue new token pair with new familyId
    const newFamilyId = crypto.randomUUID();
    const newAccessToken = signAccessToken({ id: user._id.toString(), role: user.role });
    const newRefreshToken = signRefreshToken({ id: user._id.toString(), familyId: newFamilyId });

    await this._storeRefreshToken(user._id.toString(), newFamilyId, newRefreshToken);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Logout user and invalidate active refresh token session.
   */
  async logout({ userId, refreshToken }) {
    if (refreshToken) {
      try {
        const decoded = verifyRefreshToken(refreshToken);
        const key = `refreshToken:${userId || decoded.id}:${decoded.familyId}`;
        const redis = getRedisClient();
        if (redis && redis.status === 'ready') {
          await redis.del(key);
        } else {
          fallbackTokenStore.delete(key);
        }
      } catch {
        // Silent failure if token invalid
      }
    }
  }
}

export default new AuthService();

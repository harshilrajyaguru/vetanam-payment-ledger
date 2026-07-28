import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { AppError } from './AppError.js';

/**
 * Sign a short-lived access JWT.
 * @param {Object} payload Payload containing id and role
 * @returns {string} JWT access token
 */
export function signAccessToken(payload) {
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiresIn,
  });
}

/**
 * Sign a rotating refresh JWT.
 * @param {Object} payload Payload containing id and tokenFamilyId
 * @returns {string} JWT refresh token
 */
export function signRefreshToken(payload) {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn,
  });
}

/**
 * Verify an access JWT token.
 * @param {string} token
 * @returns {Object} Decoded payload
 */
export function verifyAccessToken(token) {
  try {
    return jwt.verify(token, config.jwt.accessSecret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('UNAUTHORIZED', 'Access token has expired', 401);
    }
    throw new AppError('UNAUTHORIZED', 'Invalid access token', 401);
  }
}

/**
 * Verify a refresh JWT token.
 * @param {string} token
 * @returns {Object} Decoded payload
 */
export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, config.jwt.refreshSecret);
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new AppError('UNAUTHORIZED', 'Refresh token has expired', 401);
    }
    throw new AppError('UNAUTHORIZED', 'Invalid refresh token', 401);
  }
}

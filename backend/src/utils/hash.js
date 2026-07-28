import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import config from '../config/index.js';

/**
 * Hash a plaintext password using bcryptjs.
 * @param {string} password
 * @returns {Promise<string>} Hashed password
 */
export async function hashPassword(password) {
  const saltRounds = config.bcrypt.rounds || 12;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Compare a plaintext password with a bcrypt hash.
 * @param {string} password
 * @param {string} hash
 * @returns {Promise<boolean>}
 */
export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/**
 * Hash a token string using SHA-256 for secure cache storage.
 * @param {string} token
 * @returns {string} Hex-encoded SHA-256 hash
 */
export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

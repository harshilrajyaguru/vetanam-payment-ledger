import { verifyAccessToken } from '../utils/jwt.js';
import { AppError } from '../utils/AppError.js';

/**
 * Express middleware to guard routes using JWT Bearer authentication.
 */
export function authGuard(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(
      new AppError(
        'UNAUTHORIZED',
        'Authentication required. Please provide a valid Bearer token.',
        401,
      ),
    );
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    next(error);
  }
}

export default authGuard;

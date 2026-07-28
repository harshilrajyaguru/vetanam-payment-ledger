import { AppError } from '../utils/AppError.js';

/**
 * Express middleware to enforce role-based access control (RBAC).
 * @param  {...string} allowedRoles Roles allowed to access the route (e.g. 'admin')
 */
export function roleGuard(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError('UNAUTHORIZED', 'Authentication required', 401));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(
          'FORBIDDEN',
          'You do not have permission to perform this action.',
          403,
        ),
      );
    }

    next();
  };
}

export default roleGuard;

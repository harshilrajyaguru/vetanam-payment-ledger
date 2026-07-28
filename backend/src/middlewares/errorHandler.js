import { AppError, ERROR_CODES } from '../utils/AppError.js';

export function errorHandler(err, req, res, _next) {
  const isAppError = err instanceof AppError;
  const statusCode = isAppError ? err.statusCode : 500;
  const code = isAppError ? err.code : 'INTERNAL_ERROR';
  const message = isAppError ? err.message : 'An unexpected error occurred.';
  const details = isAppError ? err.details : {};

  if (!isAppError) {
    req.log?.error({ err, requestId: req.requestId }, 'Unhandled error');
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
      details,
    },
  });
}

export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} not found.`,
      requestId: req.requestId,
      timestamp: new Date().toISOString(),
      details: {},
    },
  });
}

export { ERROR_CODES };

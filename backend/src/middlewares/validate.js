import { AppError } from '../utils/AppError.js';

/**
 * Validate HTTP request body using a Zod schema.
 * @param {import('zod').ZodSchema} schema
 */
export function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issues = result.error.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      }));
      return next(
        new AppError('VALIDATION_ERROR', 'Request validation failed', 400, {
          issues,
        }),
      );
    }
    req.body = result.data;
    next();
  };
}

export default validate;

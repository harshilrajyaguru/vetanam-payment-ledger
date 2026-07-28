export class AppError extends Error {
  constructor(code, message, statusCode = 500, details = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const ERROR_CODES = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  ACCOUNT_FROZEN: 403,
  FRAUD_BLOCKED: 403,
  RECEIVER_NOT_FOUND: 404,
  TRANSACTION_NOT_FOUND: 404,
  INSUFFICIENT_FUNDS: 409,
  IDEMPOTENCY_KEY_CONFLICT: 409,
  TRANSFER_TO_SELF: 422,
  AMOUNT_INVALID: 422,
  FLAGGED_FOR_REVIEW: 202,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
};

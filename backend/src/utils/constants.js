export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
};

export const USER_STATUS = {
  ACTIVE: 'active',
  FROZEN: 'frozen',
};

export const ACCOUNT_STATUS = {
  ACTIVE: 'active',
  FROZEN: 'frozen',
};

export const TRANSACTION_STATUS = {
  PENDING: 'PENDING',
  PROCESSING: 'PROCESSING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  FLAGGED: 'FLAGGED',
  REVERSED: 'REVERSED',
};

export const LEDGER_ENTRY_TYPE = {
  DEBIT: 'DEBIT',
  CREDIT: 'CREDIT',
};

export const NOTIFICATION_TYPE = {
  TXN_COMPLETED: 'TXN_COMPLETED',
  TXN_FAILED: 'TXN_FAILED',
  TXN_FLAGGED: 'TXN_FLAGGED',
};

export const DEFAULT_CURRENCY = 'INR';
export const IDEMPOTENCY_TTL_SECONDS = 86400;

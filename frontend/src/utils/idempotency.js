// Client idempotency key generation — Phase 4.

export function generateIdempotencyKey() {
  return crypto.randomUUID();
}

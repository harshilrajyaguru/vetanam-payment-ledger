import { z } from 'zod';

export const transferSchema = z.object({
  recipientEmail: z
    .string({ required_error: 'Recipient email address is required' })
    .email('Invalid recipient email address format')
    .toLowerCase()
    .trim(),
  amount: z
    .number({ required_error: 'Amount is required' })
    .int('Amount must be an integer')
    .positive('Amount must be a positive integer in minor units'),
  currency: z.string().default('INR'),
  description: z.string().max(255).optional(),
  idempotencyKey: z.string().optional(),
});

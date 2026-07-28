import { z } from 'zod';

export const depositSchema = z.object({
  amount: z
    .number({ required_error: 'Amount is required' })
    .int('Amount must be an integer in minor units')
    .positive('Amount must be a positive integer in minor units')
    .max(1000000, 'Maximum deposit per transaction is ₹10,000.'),
  description: z.string().max(255).optional(),
});

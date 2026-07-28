import { Router } from 'express';
import { createTransfer } from '../controllers/transfer.controller.js';
import { authGuard } from '../middlewares/authGuard.js';
import { validate } from '../middlewares/validate.js';
import { transferSchema } from '../validators/transfer.validator.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';

const router = Router();

const transferLimiter = rateLimiter({
  max: 30,
  windowMs: 60 * 1000,
  keyPrefix: 'rl:transfers',
});

router.post(
  '/',
  authGuard,
  transferLimiter,
  validate(transferSchema),
  createTransfer,
);

export default router;

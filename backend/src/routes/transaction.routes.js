import { Router } from 'express';
import {
  initiateTransfer,
  getMyTransactions,
  getTransactionById,
  getTransactionLedger,
} from '../controllers/transaction.controller.js';
import { authGuard } from '../middlewares/authGuard.js';
import { transferLimiter } from '../middlewares/rateLimiter.js';
import { validate } from '../middlewares/validate.js';
import { transferSchema } from '../validators/transfer.validator.js';

const router = Router();

router.post('/', authGuard, transferLimiter, validate(transferSchema), initiateTransfer);
router.get('/', authGuard, getMyTransactions);
router.get('/:id', authGuard, getTransactionById);
router.get('/:id/ledger', authGuard, getTransactionLedger);

export default router;

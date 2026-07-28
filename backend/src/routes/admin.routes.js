import { Router } from 'express';
import {
  getUsers,
  freezeUserAccount,
  getTransactions,
  reviewTransaction,
  getAuditLogs,
} from '../controllers/admin.controller.js';
import { authGuard } from '../middlewares/authGuard.js';
import { roleGuard } from '../middlewares/roleGuard.js';

const router = Router();

// All admin routes require authentication and 'admin' role
router.use(authGuard, roleGuard('admin'));

router.get('/users', getUsers);
router.patch('/users/:id/freeze', freezeUserAccount);
router.get('/transactions', getTransactions);
router.patch('/transactions/:id/review', reviewTransaction);
router.get('/audit-logs', getAuditLogs);

export default router;

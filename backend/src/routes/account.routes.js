import { Router } from 'express';
import { getMyAccount, depositFunds } from '../controllers/account.controller.js';
import { authGuard } from '../middlewares/authGuard.js';
import { validate } from '../middlewares/validate.js';
import { depositSchema } from '../validators/account.validator.js';

const router = Router();

router.get('/me', authGuard, getMyAccount);
router.post('/deposit', authGuard, validate(depositSchema), depositFunds);

export default router;

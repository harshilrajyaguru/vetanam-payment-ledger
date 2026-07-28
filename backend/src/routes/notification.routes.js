import { Router } from 'express';
import { getMyNotifications } from '../controllers/notification.controller.js';
import { authGuard } from '../middlewares/authGuard.js';

const router = Router();

router.get('/', authGuard, getMyNotifications);

export default router;

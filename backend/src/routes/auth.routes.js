import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.js';
import { rateLimiter } from '../middlewares/rateLimiter.js';
import { authGuard } from '../middlewares/authGuard.js';
import { registerSchema, loginSchema, refreshSchema } from '../validators/auth.validator.js';
import config from '../config/index.js';

const router = Router();

const authRateLimiter = rateLimiter({
  max: config.rateLimit.auth.max,
  windowMs: config.rateLimit.auth.windowMs,
  keyPrefix: 'rl:auth',
});

router.post(
  '/register',
  authRateLimiter,
  validate(registerSchema),
  authController.register,
);

router.post(
  '/login',
  authRateLimiter,
  validate(loginSchema),
  authController.login,
);

router.post(
  '/refresh',
  authRateLimiter,
  validate(refreshSchema),
  authController.refresh,
);

router.post(
  '/logout',
  authGuard,
  authController.logout,
);

export default router;

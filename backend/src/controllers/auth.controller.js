import authService from '../services/auth.service.js';
import accountRepository from '../repositories/account.repository.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const register = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await authService.register({ email, password });
  res.status(201).json({
    success: true,
    data: {
      user: {
        id: user._id,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
      },
    },
  });
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);

  // Fetch account so the frontend can display wallet balance immediately after login
  const account = await accountRepository.findByUserId(result.user._id);

  res.status(200).json({
    success: true,
    data: {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: {
        id: result.user._id,
        email: result.user.email,
        role: result.user.role,
        status: result.user.status,
      },
      account: account
        ? {
            id: account._id.toString(),
            userId: account.userId.toString(),
            currency: account.currency,
            cachedBalance: account.cachedBalance,
            status: account.status,
          }
        : null,
    },
  });
});

export const refresh = asyncHandler(async (req, res) => {
  const result = await authService.refresh(req.body);
  res.status(200).json({
    success: true,
    data: {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    },
  });
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout({
    userId: req.user?.id,
    refreshToken: req.body?.refreshToken,
  });
  res.status(200).json({
    success: true,
    data: {
      message: 'Logged out successfully',
    },
  });
});

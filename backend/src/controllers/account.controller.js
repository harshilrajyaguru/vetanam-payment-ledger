import accountService from '../services/account.service.js';
import userRepository from '../repositories/user.repository.js';

export async function getMyAccount(req, res, next) {
  try {
    const user = await userRepository.findById(req.user.id);
    const account = await accountService.getUserAccount(req.user.id);
    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user._id.toString(),
          email: user.email,
          role: user.role,
          status: user.status,
        },
        account: {
          id: account._id.toString(),
          userId: account.userId.toString(),
          currency: account.currency,
          cachedBalance: account.cachedBalance,
          status: account.status,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function depositFunds(req, res, next) {
  try {
    const result = await accountService.depositFunds(req.user.id, {
      amount: req.body.amount,
      description: req.body.description,
    });
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

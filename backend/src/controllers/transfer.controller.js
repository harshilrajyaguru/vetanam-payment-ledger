import transactionService from '../services/transaction.service.js';

export async function createTransfer(req, res, next) {
  try {
    const userId = req.user.id;
    const idempotencyKey = req.headers['idempotency-key'] || req.body.idempotencyKey;
    const { recipientEmail, receiverAccountId, amount, currency, description } = req.body;

    const result = await transactionService.transferMoney({
      userId,
      recipientEmail,
      receiverAccountId,
      amount,
      currency,
      description,
      idempotencyKey,
    });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export default {
  createTransfer,
};

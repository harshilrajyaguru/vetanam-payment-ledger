import transactionService from '../services/transaction.service.js';

export async function initiateTransfer(req, res, next) {
  try {
    const idempotencyKey = req.headers['idempotency-key'] || req.body.idempotencyKey;
    const result = await transactionService.transferMoney({
      userId: req.user.id,
      recipientEmail: req.body.recipientEmail,
      amount: req.body.amount,
      currency: req.body.currency,
      description: req.body.description,
      idempotencyKey,
    });
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getMyTransactions(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const result = await transactionService.getUserTransactions(req.user.id, { page, limit });
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTransactionById(req, res, next) {
  try {
    const transaction = await transactionService.getTransactionById(
      req.params.id,
      req.user.id,
      req.user.role,
    );
    return res.status(200).json({
      success: true,
      data: { transaction },
    });
  } catch (error) {
    next(error);
  }
}

export async function getTransactionLedger(req, res, next) {
  try {
    const result = await transactionService.getTransactionLedger(
      req.params.id,
      req.user.id,
      req.user.role,
    );
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

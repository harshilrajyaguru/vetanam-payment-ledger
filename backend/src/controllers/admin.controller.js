import adminService from '../services/admin.service.js';
import accountService from '../services/account.service.js';

export async function getUsers(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search || '';
    const result = await adminService.getUsersPaginated({ page, limit, search });
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function freezeUserAccount(req, res, next) {
  try {
    const action = req.body.action || 'freeze';
    const result = await accountService.toggleAccountFreeze(req.params.id, {
      action,
      actorId: req.user.id,
    });
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function getTransactions(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const { status, userId, startDate, endDate } = req.query;
    const result = await adminService.getTransactionsPaginated({
      page,
      limit,
      status,
      userId,
      startDate,
      endDate,
    });
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

export async function reviewTransaction(req, res, next) {
  try {
    const { decision } = req.body;
    const transaction = await adminService.reviewFlaggedTransaction(req.params.id, {
      decision,
      adminUserId: req.user.id,
    });
    return res.status(200).json({
      success: true,
      data: { transaction },
    });
  } catch (error) {
    next(error);
  }
}

export async function getAuditLogs(req, res, next) {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const { action, targetType } = req.query;
    const result = await adminService.getAuditLogsPaginated({ page, limit, action, targetType });
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

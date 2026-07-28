import AuditLog from '../models/AuditLog.model.js';

export class AuditLogRepository {
  /**
   * Create an immutable audit log entry.
   * @param {Object} auditLogData
   * @param {import('mongoose').ClientSession} [session]
   */
  async create(auditLogData, session = null) {
    const options = session ? { session } : {};
    const [auditLog] = await AuditLog.create([auditLogData], options);
    return auditLog;
  }

  /**
   * Get paginated audit logs with optional action/targetType filtering.
   * @param {Object} filter
   * @param {number} [filter.page=1]
   * @param {number} [filter.limit=20]
   * @param {string} [filter.action]
   * @param {string} [filter.targetType]
   * @param {import('mongoose').ClientSession} [session]
   */
  async findPaginated({ page = 1, limit = 20, action, targetType } = {}, session = null) {
    const query = {};
    if (action) query.action = action;
    if (targetType) query.targetType = targetType;

    const skip = (page - 1) * limit;
    const [auditLogs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .session(session),
      AuditLog.countDocuments(query).session(session),
    ]);
    return { auditLogs, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Find audit logs for a specific actor.
   * @param {string} actorId
   * @param {Object} pagination
   * @param {number} [pagination.page=1]
   * @param {number} [pagination.limit=20]
   * @param {import('mongoose').ClientSession} [session]
   */
  async findByActorId(actorId, { page = 1, limit = 20 } = {}, session = null) {
    const skip = (page - 1) * limit;
    const [auditLogs, total] = await Promise.all([
      AuditLog.find({ actorId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .session(session),
      AuditLog.countDocuments({ actorId }).session(session),
    ]);
    return { auditLogs, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}

export default new AuditLogRepository();

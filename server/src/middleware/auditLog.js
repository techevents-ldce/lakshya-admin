const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

/**
 * Audit logging middleware factory
 * Usage: router.delete('/events/:id', protect, authorize('admin'), auditLog('DELETE_EVENT', 'Event'), handler)
 */
const auditLog = (action, targetModel) => async (req, res, next) => {
  // Store original json method to intercept response
  const originalJson = res.json.bind(res);
  res.json = async (data) => {
    // Only log successful operations
    if (res.statusCode < 400 && req.user) {
      try {
        const targetId = req.params.id || data?.data?._id || null;
        await AuditLog.create({
          adminId: req.user.id,
          action,
          targetId,
          targetModel,
          entityType: targetModel,
          details: JSON.stringify({ body: req.body, params: req.params }),
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'] || null,
        });
      } catch (e) {
        logger.error('AuditLog write failed', { error: e.message });
      }
    }
    return originalJson(data);
  };
  next();
};

/**
 * Programmatic audit log writer — call from service layer for richer before/after logging.
 */
const writeAuditLog = async ({ adminId, action, entityType, entityId, before, after, ip, userAgent }) => {
  try {
    await AuditLog.create({
      adminId,
      action,
      targetId: entityId,
      targetModel: entityType,
      entityType,
      before: before || null,
      after: after || null,
      ipAddress: ip || null,
      userAgent: userAgent || null,
    });
  } catch (e) {
    logger.error('AuditLog write failed', { error: e.message });
  }
};

module.exports = auditLog;
module.exports.writeAuditLog = writeAuditLog;

const pool = require("../db/db");
const { v4: uuidv4 } = require("uuid");

async function logAudit(req, action, entityType, entityId, oldValues = null, newValues = null) {
  try {
    const userId = req.user?.id || null;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get("user-agent") || null;

    await pool.query(
      `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        userId,
        action,
        entityType,
        entityId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress,
        userAgent,
      ]
    );
  } catch (error) {
    console.error("Error logging audit:", error);
    // Don't throw - audit logging should not break the main flow
  }
}

module.exports = { logAudit };


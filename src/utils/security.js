const sqlite3 = require('sqlite3').verbose();

/**
 * Ensure a security_config row exists for the given server.
 * Uses an idempotent upsert that does not overwrite existing columns.
 */
function ensureConfigRow(serverId, db) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO security_config (server_id) VALUES (?) ON CONFLICT(server_id) DO NOTHING',
      [serverId],
      function(err) {
        if (err) reject(err); else resolve();
      }
    );
  });
}

/**
 * Get security configuration for a server
 * @param {string} serverId - The server ID
 * @param {sqlite3.Database} db - Database connection
 * @returns {Promise<Object>} Security configuration object
 */
async function getSecurityConfig(serverId, db) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT * FROM security_config WHERE server_id = ?',
      [serverId],
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row || null);
        }
      }
    );
  });
}

/**
 * Create or update security configuration for a server
 * @param {string} serverId - The server ID
 * @param {Object} config - Configuration object
 * @param {sqlite3.Database} db - Database connection
 * @returns {Promise<void>}
 */
async function setSecurityConfig(serverId, config, db) {
  await ensureConfigRow(serverId, db);
  return new Promise((resolve, reject) => {
    const setClause = Object.keys(config).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(config), serverId];
    db.run(
      `UPDATE security_config SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE server_id = ?`,
      values,
      function(err) {
        if (err) reject(err); else resolve();
      }
    );
  });
}

/**
 * Enable/disable a specific security feature
 * @param {string} serverId - The server ID
 * @param {string} feature - Feature name (e.g., 'ban', 'kick', etc.)
 * @param {boolean} enabled - Whether to enable or disable
 * @param {sqlite3.Database} db - Database connection
 * @returns {Promise<void>}
 */
async function toggleSecurityFeature(serverId, feature, enabled, db) {
  await ensureConfigRow(serverId, db);
  return new Promise((resolve, reject) => {
    const field = `${feature}_enabled`;
    db.run(
      `UPDATE security_config SET ${field} = ?, updated_at = CURRENT_TIMESTAMP WHERE server_id = ?`,
      [enabled ? 1 : 0, serverId],
      function(err) {
        if (err) reject(err); else resolve();
      }
    );
  });
}

/**
 * Set punishment type for a security feature
 * @param {string} serverId - The server ID
 * @param {string} feature - Feature name
 * @param {string} punishment - Punishment type ('clear_roles', 'kick', 'ban', 'timeout')
 * @param {sqlite3.Database} db - Database connection
 * @returns {Promise<void>}
 */
async function setSecurityPunishment(serverId, feature, punishment, db) {
  await ensureConfigRow(serverId, db);
  return new Promise((resolve, reject) => {
    const field = `${feature}_punishment`;
    db.run(
      `UPDATE security_config SET ${field} = ?, updated_at = CURRENT_TIMESTAMP WHERE server_id = ?`,
      [punishment, serverId],
      function(err) {
        if (err) reject(err); else resolve();
      }
    );
  });
}

/**
 * Set max violations before punishment
 * @param {string} serverId - The server ID
 * @param {string} feature - Feature name
 * @param {number} maxViolations - Maximum violations allowed
 * @param {sqlite3.Database} db - Database connection
 * @returns {Promise<void>}
 */
async function setMaxViolations(serverId, feature, maxViolations, db) {
  await ensureConfigRow(serverId, db);
  return new Promise((resolve, reject) => {
    const field = `${feature}_max_violations`;
    db.run(
      `UPDATE security_config SET ${field} = ?, updated_at = CURRENT_TIMESTAMP WHERE server_id = ?`,
      [maxViolations, serverId],
      function(err) {
        if (err) reject(err); else resolve();
      }
    );
  });
}

/**
 * Add whitelisted members for a security feature
 * @param {string} serverId - The server ID
 * @param {string} feature - Feature name
 * @param {Array<string>} memberIds - Array of member IDs to whitelist
 * @param {sqlite3.Database} db - Database connection
 * @returns {Promise<void>}
 */
async function addWhitelistedMembers(serverId, feature, memberIds, db) {
  await ensureConfigRow(serverId, db);
  return new Promise((resolve, reject) => {
    const field = `${feature}_whitelisted_members`;
    
    // Get current whitelisted members
    db.get(
      `SELECT ${field} FROM security_config WHERE server_id = ?`,
      [serverId],
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        let currentMembers = [];
        if (row && row[field]) {
          currentMembers = row[field].split(',').filter(id => id.trim());
        }

        // Add new members
        const updatedMembers = [...new Set([...currentMembers, ...memberIds])];
        const membersString = updatedMembers.join(',');

        db.run(
          `UPDATE security_config SET ${field} = ?, updated_at = CURRENT_TIMESTAMP WHERE server_id = ?`,
          [membersString, serverId],
          function(err) {
            if (err) reject(err); else resolve();
          }
        );
      }
    );
  });
}

/**
 * Add whitelisted roles for a security feature
 * @param {string} serverId - The server ID
 * @param {string} feature - Feature name
 * @param {Array<string>} roleIds - Array of role IDs to whitelist
 * @param {sqlite3.Database} db - Database connection
 * @returns {Promise<void>}
 */
async function addWhitelistedRoles(serverId, feature, roleIds, db) {
  await ensureConfigRow(serverId, db);
  return new Promise((resolve, reject) => {
    const field = `${feature}_whitelisted_roles`;
    
    // Get current whitelisted roles
    db.get(
      `SELECT ${field} FROM security_config WHERE server_id = ?`,
      [serverId],
      (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        let currentRoles = [];
        if (row && row[field]) {
          currentRoles = row[field].split(',').filter(id => id.trim());
        }

        // Add new roles
        const updatedRoles = [...new Set([...currentRoles, ...roleIds])];
        const rolesString = updatedRoles.join(',');

        db.run(
          `UPDATE security_config SET ${field} = ?, updated_at = CURRENT_TIMESTAMP WHERE server_id = ?`,
          [rolesString, serverId],
          function(err) {
            if (err) reject(err); else resolve();
          }
        );
      }
    );
  });
}

/**
 * Check if a user is whitelisted for a security feature
 * @param {string} serverId - The server ID
 * @param {string} feature - Feature name
 * @param {string} userId - User ID to check
 * @param {Array<string>} userRoles - User's role IDs
 * @param {sqlite3.Database} db - Database connection
 * @returns {Promise<boolean>} True if whitelisted
 */
async function isWhitelisted(serverId, feature, userId, userRoles, db) {
  const row = await new Promise((resolve, reject) => {
    db.get(
      `SELECT ${feature}_whitelisted_members, ${feature}_whitelisted_roles FROM security_config WHERE server_id = ?`,
      [serverId],
      (err, row) => {
        if (err) return reject(err);
        resolve(row);
      }
    );
  });

  if (!row) {
    return false;
  }

  // Check member whitelist
  const whitelistedMembersRaw = row[`${feature}_whitelisted_members`];
  if (whitelistedMembersRaw) {
    const whitelistedMembers = whitelistedMembersRaw.split(',').filter(id => id.trim());
    if (whitelistedMembers.includes(userId)) {
      return true;
    }
  }

  // Check role whitelist
  const whitelistedRolesRaw = row[`${feature}_whitelisted_roles`];
  if (whitelistedRolesRaw) {
    const whitelistedRoles = whitelistedRolesRaw.split(',').filter(id => id.trim());
    const hasWhitelistedRole = userRoles.some(roleId => whitelistedRoles.includes(roleId));
    if (hasWhitelistedRole) {
      return true;
    }
  }

  return false;
}

/**
 * Record a security violation
 * @param {string} serverId - The server ID
 * @param {string} userId - User ID who committed the violation
 * @param {string} violationType - Type of violation
 * @param {sqlite3.Database} db - Database connection
 * @returns {Promise<Object>} Violation info with count
 */
async function recordViolation(serverId, userId, violationType, db) {
  const upsertQuery = `
    INSERT INTO security_violations (server_id, user_id, violation_type, violation_count, last_violation, created_at)
    VALUES (?, ?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    ON CONFLICT(server_id, user_id, violation_type)
    DO UPDATE SET violation_count = violation_count + 1, last_violation = CURRENT_TIMESTAMP;
  `;

  const selectQuery = `
    SELECT violation_count FROM security_violations WHERE server_id = ? AND user_id = ? AND violation_type = ?;
  `;

  try {
    // Run the UPSERT operation
    await new Promise((resolve, reject) => {
      db.run(upsertQuery, [serverId, userId, violationType], function(err) {
        if (err) return reject(err);
        resolve();
      });
    });

    // Get the new violation count
    const row = await new Promise((resolve, reject) => {
      db.get(selectQuery, [serverId, userId, violationType], (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });

    return { userId, violationType, count: row ? row.violation_count : 0 };

  } catch (err) {
    console.error(`[DATABASE_ERROR] Failed to record violation for ${userId} in ${serverId}:`, err.message);
    return null; // Return null on failure
  }
}

/**
 * Get violation count for a user
 * @param {string} serverId - The server ID
 * @param {string} userId - User ID
 * @param {string} violationType - Type of violation
 * @param {sqlite3.Database} db - Database connection
 * @returns {Promise<number>} Violation count
 */
async function getViolationCount(serverId, userId, violationType, db) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT violation_count FROM security_violations WHERE server_id = ? AND user_id = ? AND violation_type = ?',
      [serverId, userId, violationType],
      (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row ? row.violation_count : 0);
        }
      }
    );
  });
}

/**
 * Reset violation count for a user
 * @param {string} serverId - The server ID
 * @param {string} userId - User ID
 * @param {string} violationType - Type of violation
 * @param {sqlite3.Database} db - Database connection
 * @returns {Promise<void>}
 */
async function resetViolationCount(serverId, userId, violationType, db) {
  return new Promise((resolve, reject) => {
    db.run(
      'DELETE FROM security_violations WHERE server_id = ? AND user_id = ? AND violation_type = ?',
      [serverId, userId, violationType],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

/**
 * Set logs channel for security events
 * @param {string} serverId - The server ID
 * @param {string} channelId - Channel ID for logs
 * @param {sqlite3.Database} db - Database connection
 * @returns {Promise<void>}
 */
async function setLogsChannel(serverId, channelId, db) {
  await ensureConfigRow(serverId, db);
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE security_config SET logs_channel = ?, updated_at = CURRENT_TIMESTAMP WHERE server_id = ?',
      [channelId, serverId],
      function(err) {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

module.exports = {
  getSecurityConfig,
  setSecurityConfig,
  toggleSecurityFeature,
  setSecurityPunishment,
  setMaxViolations,
  addWhitelistedMembers,
  addWhitelistedRoles,
  isWhitelisted,
  recordViolation,
  getViolationCount,
  resetViolationCount,
  setLogsChannel
}; 
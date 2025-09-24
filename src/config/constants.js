// Paul Dev Helper Bot - Constants
module.exports = {
  // Bot Information
  BOT_NAME: 'Paul Dev Helper',
  BOT_VERSION: '1.0.0',
  BOT_AUTHOR: 'skz_rayan23',
  
  // Default Settings
  DEFAULT_PREFIX: '+',
  DEFAULT_COOLDOWN: 3000,
  
  // Limits
  MAX_WARNINGS: 3,
  MAX_DAILY_ACTIONS: 4,
  MAX_MESSAGE_LENGTH: 2000,
  
  // Colors (Discord embed colors)
  COLORS: {
    SUCCESS: 0x00ff00,
    ERROR: 0xff0000,
    WARNING: 0xffff00,
    INFO: 0x0099ff,
    PRIMARY: 0x7289da,
  },
  
  // Emojis
  EMOJIS: {
    SUCCESS: '✅',
    ERROR: '❌',
    WARNING: '⚠️',
    INFO: 'ℹ️',
    LOADING: '⏳',
  },
  
  // Permissions
  PERMISSIONS: {
    ADMIN: 'Administrator',
    MODERATOR: 'ManageMessages',
    HELPER: 'ManageRoles',
  },
  
  // Database
  DATABASE: {
    PATH: './data/database.db',
    BACKUP_INTERVAL: 24 * 60 * 60 * 1000, // 24 hours
  },
  
  // Security
  SECURITY: {
    MAX_VIOLATIONS: 3,
    DEFAULT_PUNISHMENT: 'clear_roles',
    AUDIT_LOG_LIMIT: 20,
  },
};

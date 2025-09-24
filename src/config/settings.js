// Paul Dev Helper Bot - Settings
const { constants } = require('./constants');

module.exports = {
  // Bot Settings
  bot: {
    name: constants.BOT_NAME,
    version: constants.BOT_VERSION,
    author: constants.BOT_AUTHOR,
    prefix: process.env.BOT_PREFIX || constants.DEFAULT_PREFIX,
    ownerId: process.env.BOT_OWNER_ID,
  },
  
  // Database Settings
  database: {
    path: process.env.DATABASE_PATH || constants.DATABASE.PATH,
    backupInterval: constants.DATABASE.BACKUP_INTERVAL,
  },
  
  // Logging Settings
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    file: process.env.LOG_FILE || './data/logs/bot.log',
    maxSize: '10m',
    maxFiles: 5,
  },
  
  // Security Settings
  security: {
    enabled: process.env.SECURITY_ENABLED === 'true',
    antibot: process.env.ANTIBOT_ENABLED === 'true',
    maxViolations: constants.SECURITY.MAX_VIOLATIONS,
    defaultPunishment: constants.SECURITY.DEFAULT_PUNISHMENT,
  },
  
  // Web Server Settings (if using Express)
  web: {
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost',
    enabled: process.env.WEB_ENABLED === 'true',
  },
  
  // YouTube Settings
  youtube: {
    apiKey: process.env.YT_API_KEY,
    enabled: !!process.env.YT_API_KEY,
  },
  
  // External Services
  external: {
    webhookUrl: process.env.WEBHOOK_URL,
  },
};

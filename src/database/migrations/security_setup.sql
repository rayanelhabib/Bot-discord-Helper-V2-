-- 🛡️ Security Configuration Table
CREATE TABLE IF NOT EXISTS security_config (
  server_id TEXT PRIMARY KEY,
  
  -- Ban protection
  ban_enabled INTEGER DEFAULT 0,
  ban_punishment TEXT DEFAULT 'clear_roles',
  ban_max_violations INTEGER DEFAULT 3,
  ban_whitelisted_members TEXT DEFAULT '',
  ban_whitelisted_roles TEXT DEFAULT '',
  
  -- Kick protection
  kick_enabled INTEGER DEFAULT 0,
  kick_punishment TEXT DEFAULT 'clear_roles',
  kick_max_violations INTEGER DEFAULT 3,
  kick_whitelisted_members TEXT DEFAULT '',
  kick_whitelisted_roles TEXT DEFAULT '',
  
  -- Channel create protection
  channel_create_enabled INTEGER DEFAULT 0,
  channel_create_punishment TEXT DEFAULT 'clear_roles',
  channel_create_max_violations INTEGER DEFAULT 3,
  channel_create_whitelisted_members TEXT DEFAULT '',
  channel_create_whitelisted_roles TEXT DEFAULT '',
  
  -- Channel delete protection
  channel_delete_enabled INTEGER DEFAULT 0,
  channel_delete_punishment TEXT DEFAULT 'clear_roles',
  channel_delete_max_violations INTEGER DEFAULT 3,
  channel_delete_whitelisted_members TEXT DEFAULT '',
  channel_delete_whitelisted_roles TEXT DEFAULT '',
  
  -- Role create protection
  role_create_enabled INTEGER DEFAULT 0,
  role_create_punishment TEXT DEFAULT 'clear_roles',
  role_create_max_violations INTEGER DEFAULT 3,
  role_create_whitelisted_members TEXT DEFAULT '',
  role_create_whitelisted_roles TEXT DEFAULT '',
  
  -- Role delete protection
  role_delete_enabled INTEGER DEFAULT 0,
  role_delete_punishment TEXT DEFAULT 'clear_roles',
  role_delete_max_violations INTEGER DEFAULT 3,
  role_delete_whitelisted_members TEXT DEFAULT '',
  role_delete_whitelisted_roles TEXT DEFAULT '',
  
  -- Bot add protection
  addbot_enabled INTEGER DEFAULT 0,
  addbot_punishment TEXT DEFAULT 'clear_roles',
  addbot_max_violations INTEGER DEFAULT 3,
  addbot_whitelisted_members TEXT DEFAULT '',
  addbot_whitelisted_roles TEXT DEFAULT '',
  
  -- Dangerous role give protection
  dangerous_role_give_enabled INTEGER DEFAULT 0,
  dangerous_role_give_punishment TEXT DEFAULT 'clear_roles',
  dangerous_role_give_max_violations INTEGER DEFAULT 3,
  dangerous_role_give_whitelisted_members TEXT DEFAULT '',
  dangerous_role_give_whitelisted_roles TEXT DEFAULT '',
  
  -- Vanity change protection
  change_vanity_enabled INTEGER DEFAULT 0,
  change_vanity_punishment TEXT DEFAULT 'clear_roles',
  change_vanity_max_violations INTEGER DEFAULT 3,
  change_vanity_whitelisted_members TEXT DEFAULT '',
  change_vanity_whitelisted_roles TEXT DEFAULT '',
  
  -- Server name change protection
  change_server_name_enabled INTEGER DEFAULT 0,
  change_server_name_punishment TEXT DEFAULT 'clear_roles',
  change_server_name_max_violations INTEGER DEFAULT 3,
  change_server_name_whitelisted_members TEXT DEFAULT '',
  change_server_name_whitelisted_roles TEXT DEFAULT '',
  
  -- General settings
  logs_channel TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_security_config_server_id ON security_config(server_id);
CREATE INDEX IF NOT EXISTS idx_security_config_enabled ON security_config(
  ban_enabled, kick_enabled, channel_create_enabled, channel_delete_enabled,
  role_create_enabled, role_delete_enabled, addbot_enabled, dangerous_role_give_enabled,
  change_vanity_enabled, change_server_name_enabled
);

-- Security violation tracking table
CREATE TABLE IF NOT EXISTS security_violations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  violation_type TEXT NOT NULL,
  violation_count INTEGER DEFAULT 1,
  last_violation DATETIME DEFAULT CURRENT_TIMESTAMP,
  punishment_applied TEXT DEFAULT '',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(server_id, user_id, violation_type)
);

-- Create index for security violations
CREATE INDEX IF NOT EXISTS idx_security_violations_server_user ON security_violations(server_id, user_id);
CREATE INDEX IF NOT EXISTS idx_security_violations_type ON security_violations(violation_type); 
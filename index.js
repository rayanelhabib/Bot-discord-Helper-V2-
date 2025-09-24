/**
 * Paul Dev Helper Bot
 * Copyright (c) 2024 skz_rayan23 (rayanelhabib)
 * 
 * This project is created and maintained by skz_rayan23.
 * All rights reserved. Do not remove this copyright notice.
 * 
 * GitHub: https://github.com/rayanelhabib/Bot-discord-Helper-V2-
 * Discord: skz_rayan23
 */

require('dotenv').config();
const { Client, GatewayIntentBits, Collection, REST, Routes, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildModeration,
  ],
});

// Utility function for safe message replies
async function safeReply(message, content, options = {}) {
  try {
    return await message.reply(content, options);
  } catch (error) {
    // If reply fails (likely because original message was deleted),
    // try sending a regular message instead
    try {
      return await message.channel.send(content, options);
    } catch (channelError) {
      console.error('❌ Failed to send message:', channelError);
      return null;
    }
  }
}

// Utility function for safe interaction replies
async function safeInteractionReply(interaction, options) {
  try {
    // Check if interaction has already been replied to or deferred
    if (interaction.replied || interaction.deferred) {
      return await interaction.followUp(options);
    } else {
      return await interaction.reply(options);
    }
  } catch (error) {
    console.error('❌ Failed to reply to interaction:', error);
    
    // Try to send a follow-up message as a last resort
    try {
      if (!interaction.replied && !interaction.deferred) {
        return await interaction.reply({ content: 'An error occurred while processing your command.', ephemeral: true });
      } else {
        return await interaction.followUp({ content: 'An error occurred while processing your command.', ephemeral: true });
      }
    } catch (followUpError) {
      console.error('❌ Failed to send follow-up message:', followUpError);
      return null;
    }
  }
}

// SQLite setup
const db = new sqlite3.Database('./data/database.db', (err) => {
  if (err) console.error('❌ DB error:', err.message);
  else console.log('📦 Connected to SQLite DB');

  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS verification_settings (
        server_id TEXT PRIMARY KEY,
        verified_role TEXT,
        verified_female_role TEXT,
        unverified_role TEXT,
        verif_logs_channel TEXT,
        verifembed TEXT
      )`);
      
    db.run(`CREATE TABLE IF NOT EXISTS verificators (server_id TEXT, role_id TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS verifications (server_id TEXT, verificator_id TEXT, count INTEGER DEFAULT 0)`);
    db.run(`CREATE TABLE IF NOT EXISTS jail_settings (server_id TEXT PRIMARY KEY, jail_logs_channel TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS jailer_roles (server_id TEXT, role_id TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS jailed_roles (server_id TEXT, role_id TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS jail_logs (jailer_id TEXT, user_id TEXT, reason TEXT, timestamp TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS jailed_users (server_id TEXT, user_id TEXT, previous_roles TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS voice_state_channels (server_id TEXT PRIMARY KEY, channel_id TEXT NOT NULL)`);
    db.run(`CREATE TABLE IF NOT EXISTS server_tags (server_id TEXT PRIMARY KEY, servertag TEXT DEFAULT 'none')`);
    db.run(`CREATE TABLE IF NOT EXISTS disabled_commands (id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT NOT NULL, command_name TEXT NOT NULL, disabled_by TEXT NOT NULL, disabled_at DATETIME DEFAULT CURRENT_TIMESTAMP, UNIQUE(guild_id, command_name))`);
    db.run(`CREATE TABLE IF NOT EXISTS antibot_settings (guild_id TEXT PRIMARY KEY, enabled INTEGER DEFAULT 0, logs_channel TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS autorole_settings (server_id TEXT PRIMARY KEY, autorole_id TEXT NOT NULL)`);
    db.run(`CREATE TABLE IF NOT EXISTS server_prefixes (server_id TEXT PRIMARY KEY, prefix TEXT NOT NULL DEFAULT '+', set_by TEXT NOT NULL, set_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    db.run(`CREATE TABLE IF NOT EXISTS security_role_snapshots (
      server_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      roles TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    
    // Security Tables
    db.run(`CREATE TABLE IF NOT EXISTS security_config (server_id TEXT PRIMARY KEY, ban_enabled INTEGER DEFAULT 0, ban_punishment TEXT DEFAULT 'clear_roles', ban_max_violations INTEGER DEFAULT 3, ban_whitelisted_members TEXT DEFAULT '', ban_whitelisted_roles TEXT DEFAULT '', kick_enabled INTEGER DEFAULT 0, kick_punishment TEXT DEFAULT 'clear_roles', kick_max_violations INTEGER DEFAULT 3, kick_whitelisted_members TEXT DEFAULT '', kick_whitelisted_roles TEXT DEFAULT '', channel_create_enabled INTEGER DEFAULT 0, channel_create_punishment TEXT DEFAULT 'clear_roles', channel_create_max_violations INTEGER DEFAULT 3, channel_create_whitelisted_members TEXT DEFAULT '', channel_create_whitelisted_roles TEXT DEFAULT '', channel_delete_enabled INTEGER DEFAULT 0, channel_delete_punishment TEXT DEFAULT 'clear_roles', channel_delete_max_violations INTEGER DEFAULT 3, channel_delete_whitelisted_members TEXT DEFAULT '', channel_delete_whitelisted_roles TEXT DEFAULT '', role_create_enabled INTEGER DEFAULT 0, role_create_punishment TEXT DEFAULT 'clear_roles', role_create_max_violations INTEGER DEFAULT 3, role_create_whitelisted_members TEXT DEFAULT '', role_create_whitelisted_roles TEXT DEFAULT '', role_delete_enabled INTEGER DEFAULT 0, role_delete_punishment TEXT DEFAULT 'clear_roles', role_delete_max_violations INTEGER DEFAULT 3, role_delete_whitelisted_members TEXT DEFAULT '', role_delete_whitelisted_roles TEXT DEFAULT '', addbot_enabled INTEGER DEFAULT 0, addbot_punishment TEXT DEFAULT 'clear_roles', addbot_max_violations INTEGER DEFAULT 3, addbot_whitelisted_members TEXT DEFAULT '', addbot_whitelisted_roles TEXT DEFAULT '', dangerous_role_give_enabled INTEGER DEFAULT 0, dangerous_role_give_punishment TEXT DEFAULT 'clear_roles', dangerous_role_give_max_violations INTEGER DEFAULT 3, dangerous_role_give_whitelisted_members TEXT DEFAULT '', dangerous_role_give_whitelisted_roles TEXT DEFAULT '', change_vanity_enabled INTEGER DEFAULT 0, change_vanity_punishment TEXT DEFAULT 'clear_roles', change_vanity_max_violations INTEGER DEFAULT 3, change_vanity_whitelisted_members TEXT DEFAULT '', change_vanity_whitelisted_roles TEXT DEFAULT '', change_server_name_enabled INTEGER DEFAULT 0, change_server_name_punishment TEXT DEFAULT 'clear_roles', change_server_name_max_violations INTEGER DEFAULT 3, change_server_name_whitelisted_members TEXT DEFAULT '', change_server_name_whitelisted_roles TEXT DEFAULT '', logs_channel TEXT DEFAULT '', created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    db.run(`CREATE TABLE IF NOT EXISTS security_violations (server_id TEXT NOT NULL, user_id TEXT NOT NULL, violation_type TEXT NOT NULL, violation_count INTEGER DEFAULT 0, last_violation DATETIME DEFAULT CURRENT_TIMESTAMP, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (server_id, user_id, violation_type))`);

    // Check and add log_channel_id to security_config if it doesn't exist
    db.all('PRAGMA table_info(security_config)', (err, columns) => {
      if (err) {
        console.error('Could not get security_config table info:', err);
        return;
      }
      const hasLogChannelId = columns.some(col => col.name === 'log_channel_id');
      if (!hasLogChannelId) {
        console.log("Adding 'log_channel_id' column to 'security_config' table.");
        db.run('ALTER TABLE security_config ADD COLUMN log_channel_id TEXT', (alterErr) => {
          if (alterErr) {
            console.error("Failed to add 'log_channel_id' column:", alterErr);
          } else {
            console.log("'log_channel_id' column added successfully.");
          }
        });
      }
    });
    
    // Warning System Tables
    db.run(`CREATE TABLE IF NOT EXISTS warnings (id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT NOT NULL, user_id TEXT NOT NULL, moderator_id TEXT NOT NULL, reason TEXT NOT NULL, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    db.run(`CREATE TABLE IF NOT EXISTS warn_settings (guild_id TEXT PRIMARY KEY, first_warn_role TEXT, second_warn_role TEXT, last_warn_role TEXT, warner_role TEXT, logs_channel TEXT)`);
    db.run(`CREATE TABLE IF NOT EXISTS active_warnings (id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT NOT NULL, user_id TEXT NOT NULL, warning_level INTEGER NOT NULL, expires_at DATETIME NOT NULL, UNIQUE(guild_id, user_id))`);
    db.run(`CREATE TABLE IF NOT EXISTS moderation_limits (id INTEGER PRIMARY KEY AUTOINCREMENT, guild_id TEXT NOT NULL, moderator_id TEXT NOT NULL, action_type TEXT NOT NULL, action_date DATE NOT NULL, action_count INTEGER DEFAULT 1, UNIQUE(guild_id, moderator_id, action_type, action_date))`);
  });
});

// Command Collections
client.commands = new Collection();
client.slashCommands = new Collection();
client.noPrefixCommands = new Collection();

// Load Prefix Commands
function loadCommands(dir) {
    const commandFiles = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of commandFiles) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
            loadCommands(fullPath);
        } else if (file.name.endsWith('.js')) {
            try {
                const command = require(path.resolve(fullPath));
                if (command.name && command.execute) {
                    client.commands.set(command.name, command);
                    console.log(`📥 Loaded prefix command: ${command.name}`);
                }
            } catch (e) {
                console.error(`❌ Failed to load prefix command ${file.name}:`, e);
            }
        }
    }
}
loadCommands('./src/commands');

// Load No-Prefix Commands
function loadNoPrefixCommands(dir) {
    const commandFiles = fs.readdirSync(dir, { withFileTypes: true });
    for (const file of commandFiles) {
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
            loadNoPrefixCommands(fullPath);
        } else if (file.name.endsWith('.js')) {
            try {
                const command = require(path.resolve(fullPath));
                if (command.name && command.execute) {
                    client.noPrefixCommands.set(command.name, command);
                    console.log(`🔄 Loaded no-prefix command: ${command.name}`);
                    
                    // Also register aliases
                    if (command.aliases && command.aliases.length > 0) {
                        command.aliases.forEach(alias => {
                            client.noPrefixCommands.set(alias, command);
                        });
                    }
                }
            } catch (e) {
                console.error(`❌ Failed to load no-prefix command ${file.name}:`, e);
            }
        }
    }
}loadNoPrefixCommands('./src/no-prefix');

// Load Slash Commands
const slashCommands = [];
const slashFiles = fs.readdirSync('./src/interactions').filter(file => file.endsWith('.js'));
for (const file of slashFiles) {
    try {
        const command = require(`./src/interactions/${file}`);
        if (command.data && command.execute) {
            client.slashCommands.set(command.data.name, command);
            slashCommands.push(command.data.toJSON());
            console.log(`⚡ Loaded slash command: ${command.data.name}`);
        }
    } catch (e) {
        console.error(`❌ Failed to load slash command ${file}:`, e);
    }
}


// Helper function for warning roles
function getWarningRole(settings, level) {
  switch (level) {
    case 1: return settings.first_warn_role;
    case 2: return settings.second_warn_role;
    case 3: return settings.last_warn_role;
    default: return null;
  }
}

// Make getWarningRole globally accessible
global.getWarningRole = getWarningRole;

// Helper function to check moderation limits
async function checkModerationLimit(guildId, moderatorId, actionType, db) {
  return new Promise((resolve) => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    
    db.get(
      'SELECT action_count FROM moderation_limits WHERE guild_id = ? AND moderator_id = ? AND action_type = ? AND action_date = ?',
      [guildId, moderatorId, actionType, today],
      (err, row) => {
        if (err) {
          console.error('Error checking moderation limit:', err);
          resolve({ canProceed: true, currentCount: 0, remaining: 4 }); // Allow if error
        } else {
          const currentCount = row ? row.action_count : 0;
          const canProceed = currentCount < 4;
          const remaining = 4 - currentCount;
          resolve({ canProceed, currentCount, remaining });
        }
      }
    );
  });
}

// Helper function to increment moderation count
async function incrementModerationCount(guildId, moderatorId, actionType, db) {
  return new Promise((resolve) => {
    const today = new Date().toISOString().split('T')[0];
    
    db.run(
      'INSERT OR REPLACE INTO moderation_limits (guild_id, moderator_id, action_type, action_date, action_count) VALUES (?, ?, ?, ?, COALESCE((SELECT action_count FROM moderation_limits WHERE guild_id = ? AND moderator_id = ? AND action_type = ? AND action_date = ?) + 1, 1))',
      [guildId, moderatorId, actionType, today, guildId, moderatorId, actionType, today],
      (err) => {
        if (err) {
          console.error('Error incrementing moderation count:', err);
        }
        resolve();
      }
    );
  });
}

// Make helper functions globally available
global.checkModerationLimit = checkModerationLimit;
global.incrementModerationCount = incrementModerationCount;
global.getWarningRole = getWarningRole;

// Handle slash + prefix commands
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.slashCommands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, db, client);
  } catch (error) {
    console.error(`⚠️ Slash command error:`, error);
    await safeInteractionReply(interaction, { content: 'Error executing command', ephemeral: true });
  }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Get server-specific prefix
    const serverPrefix = message.guild ? await getServerPrefix(message.guild.id) : PREFIX;

    const args = message.content.trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    // Handle no-prefix commands
    const noPrefixCommand = client.noPrefixCommands.get(commandName);
    if (noPrefixCommand) {
        try {
            await noPrefixCommand.execute(message, args, client, db);
            return; // Command executed, stop processing.
        } catch (error) {
            console.error(`⚠️ No-prefix command error:`, error);
            await safeReply(message, 'There was an error executing that command.');
        }
    }

    // Handle prefix commands with dynamic prefix
    if (!message.content.startsWith(serverPrefix)) return;
  
    const prefixArgs = message.content.slice(serverPrefix.length).trim().split(/ +/);
    const prefixCommandName = prefixArgs.shift().toLowerCase();
  
    const command =
      client.commands.get(prefixCommandName) ||
      [...client.commands.values()].find(
        (cmd) => cmd.aliases && cmd.aliases.includes(prefixCommandName)
      );
  
    if (!command) return;

    // 🔒 Check if command is disabled in this guild
    if (message.guild) {
      const isDisabled = await isCommandDisabled(message.guild.id, command.name);
      if (isDisabled) {
        return await safeReply(message, '✗ This command is disabled in this server.');
      }
    }
  
    try {
      await command.execute(message, prefixArgs, client, db);
    } catch (error) {
      console.error(`⚠️ Prefix command error:`, error);
      await safeReply(message, 'There was an error executing that command.');
    }
});
  
  

// 🔒 Command checking functions
async function isCommandDisabled(guildId, commandName) {
  return new Promise((resolve) => {
    db.get(
      'SELECT * FROM disabled_commands WHERE guild_id = ? AND command_name = ?',
      [guildId, commandName],
      (err, row) => {
        if (err) {
          console.error('Error checking if command is disabled:', err);
          resolve(false); // Default to enabled if there's an error
        } else {
          resolve(!!row);
        }
      }
    );
  });
}

async function getDisabledCommands(guildId) {
  return new Promise((resolve) => {
    db.all(
      'SELECT command_name, disabled_by, disabled_at FROM disabled_commands WHERE guild_id = ?',
      [guildId],
      (err, rows) => {
        if (err) {
          console.error('Error getting disabled commands:', err);
          resolve([]);
        } else {
          resolve(rows || []);
        }
      }
    );
  });
}

// 🔧 Prefix management functions
async function getServerPrefix(guildId) {
  return new Promise((resolve) => {
    db.get(
      'SELECT prefix FROM server_prefixes WHERE server_id = ?',
      [guildId],
      (err, row) => {
        if (err) {
          console.error('Error getting server prefix:', err);
          resolve('+'); // Default prefix
        } else {
          resolve(row ? row.prefix : '+'); // Default prefix if not set
        }
      }
    );
  });
}

async function setServerPrefix(guildId, prefix, setBy) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT OR REPLACE INTO server_prefixes (server_id, prefix, set_by) VALUES (?, ?, ?)',
      [guildId, prefix, setBy],
      function(err) {
        if (err) {
          console.error('Error setting server prefix:', err);
          reject(err);
        } else {
          resolve(true);
        }
      }
    );
  });
}

// 🤖 Anti-bot detection event
client.on('guildMemberAdd', async (member) => {
  console.log(`👤 Member joined: ${member.user.tag} (${member.user.bot ? 'BOT' : 'USER'}) in ${member.guild.name}`);
  
  try {
    // Check if anti-bot is enabled for this guild
    db.get(
      'SELECT enabled, logs_channel FROM antibot_settings WHERE guild_id = ?',
      [member.guild.id],
      async (err, row) => {
        if (err) {
          console.error('Error checking antibot settings:', err);
          return;
        }

        console.log(`🔍 Anti-bot check for ${member.guild.name}: ${row ? (row.enabled === 1 ? 'ENABLED' : 'DISABLED') : 'NOT SET'}`);

        if (!row || row.enabled !== 1) {
          return; // Anti-bot is disabled
        }

        // Check if the new member is a bot
        if (member.user.bot) {
          console.log(`🤖 Bot detected in ${member.guild.name}: ${member.user.tag}`);

          // Kick the bot immediately
          try {
            await member.kick('Anti-bot protection: Bot account detected');
            console.log(`✅ Kicked bot ${member.user.tag} from ${member.guild.name}`);

            // Try to get audit logs to find bot adder
            let botAdder = null;
            try {
              const auditLogs = await member.guild.fetchAuditLogs({
                limit: 20,
              });

              console.log(`📋 Found ${auditLogs.entries.size} audit log entries`);

              // Look for the person who added the bot (before the bot was kicked)
              console.log(`🔍 Looking for bot adder in audit logs...`);
              console.log(`🎯 Bot ID we're looking for: ${member.user.id}`);
              
              for (const [key, entry] of auditLogs.entries) {
                console.log(`📝 Entry ${key}: Action=${entry.action}, Target=${entry.target?.id}, Executor=${entry.executor?.tag} (${entry.executor?.bot ? 'BOT' : 'HUMAN'})`);
                
                // Skip if this is the bot's own kick action
                if (entry.target?.id === member.user.id && entry.action === 'MEMBER_REMOVE') {
                  console.log(`⏭️ Skipping bot's own kick action`);
                  continue;
                }
                
                // Look for any action related to our bot by a human
                if (entry.target?.id === member.user.id && entry.executor && !entry.executor.bot) {
                  botAdder = entry.executor;
                  console.log(`✅ Found bot adder: ${botAdder.tag} (action: ${entry.action})`);
                  break;
                }
                
                // Also look for any MEMBER_ADD action by a human (in case target ID doesn't match)
                if (entry.action === 'MEMBER_ADD' && entry.executor && !entry.executor.bot) {
                  console.log(`🔍 Found MEMBER_ADD by human: ${entry.executor.tag}, but target is: ${entry.target?.id}`);
                  if (!botAdder) {
                    botAdder = entry.executor;
                    console.log(`✅ Using this as potential bot adder: ${botAdder.tag}`);
                  }
                }
              }

              if (!botAdder) {
                console.log(`❌ No bot adder found in audit logs for bot ${member.user.tag}`);
              }
            } catch (auditError) {
              console.log(`⚠️ Could not fetch audit logs: ${auditError.message}`);
            }

            // Remove roles from the bot adder if found
            let rolesRemoved = 0;
            let rolesFailed = 0;
            let rolesSkipped = 0;
            
            if (botAdder && botAdder.id !== member.guild.ownerId) {
              try {
                const botAdderMember = await member.guild.members.fetch(botAdder.id);
                
                if (botAdderMember && botAdderMember.roles.cache.size > 1) {
                  const allRoles = botAdderMember.roles.cache.filter(role => role.id !== member.guild.id);
                  const rolesToRemove = allRoles.filter(role => role.editable);
                  const rolesNotEditable = allRoles.filter(role => !role.editable);

                  // Remove editable roles
                  for (const [roleId, role] of rolesToRemove) {
                    try {
                      await botAdderMember.roles.remove(role, 'Anti-bot protection: Removed role for adding bot');
                      console.log(`✅ Removed role ${role.name} from ${botAdder.tag}`);
                      rolesRemoved++;
                    } catch (roleError) {
                      console.log(`⚠️ Could not remove role ${role.name} from ${botAdder.tag}: ${roleError.message}`);
                      rolesFailed++;
                    }
                  }

                  // Count non-editable roles
                  rolesSkipped = rolesNotEditable.size;
                  if (rolesSkipped > 0) {
                    console.log(`⚠️ Skipped ${rolesSkipped} non-editable roles from ${botAdder.tag}`);
                  }
                }
              } catch (adderError) {
                console.log(`⚠️ Could not fetch bot adder member: ${adderError.message}`);
              }
            }

            // Send log message if logs channel is set
            if (row.logs_channel) {
              try {
                const logsChannel = await member.guild.channels.fetch(row.logs_channel);
                if (logsChannel) {
                  let roleStatus = 'None';
                  if (botAdder && botAdder.id !== member.guild.ownerId) {
                    if (rolesRemoved > 0 && rolesSkipped === 0 && rolesFailed === 0) {
                      roleStatus = `Removed ${rolesRemoved} roles`;
                    } else if (rolesRemoved > 0) {
                      roleStatus = `Removed ${rolesRemoved} roles, ${rolesFailed} failed, ${rolesSkipped} skipped (can't edit)`;
                    } else if (rolesSkipped > 0) {
                      roleStatus = `${rolesSkipped} roles skipped (can't edit)`;
                    } else if (rolesFailed > 0) {
                      roleStatus = `${rolesFailed} roles failed to remove`;
                    } else {
                      roleStatus = 'No roles to remove';
                    }
                  } else if (botAdder && botAdder.id === member.guild.ownerId) {
                    roleStatus = 'Server owner (protected)';
                  } else {
                    roleStatus = 'Unknown adder';
                  }

                  const logText = new TextDisplayBuilder().setContent(
                    `🤖 **Bot Detection & Action Taken**\n\n` +
                    `**Bot:** ${member.user.tag} (${member.user.id})\n` +
                    `**Action:** Kicked\n` +
                    `**Bot Adder:** ${botAdder ? `${botAdder.tag} (${botAdder.id})` : 'Unknown'}\n` +
                    `**Role Action:** ${roleStatus}\n` +
                    `**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`
                  );

                  const container = new ContainerBuilder().addTextDisplayComponents(logText);
                  await logsChannel.send({ flags: MessageFlags.IsComponentsV2, components: [container] });
                }
              } catch (logError) {
                console.error('Error sending log message:', logError);
              }
            }

          } catch (kickError) {
            console.error(`❌ Failed to kick bot ${member.user.tag}:`, kickError);
          }
        }
      }
    );
  } catch (error) {
    console.error('Error in anti-bot detection:', error);
  }
});

// Load events
const eventFiles = fs.readdirSync('./src/events').filter(file => file.endsWith('.js') && !file.startsWith('_'));
for (const file of eventFiles) {
  try {
    const event = require(`./src/events/${file}`);
    if (!event || typeof event.execute !== 'function' || !event.name) {
      console.warn(`⚠️ Skipping non-event file: ${file}`);
      continue;
    }
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client, db));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client, db));
    }
    console.log(`📡 Loaded event: ${event.name}`);
  } catch (e) {
    console.error(`❌ Failed loading event ${file}:`, e.message);
  }}


// Login
client.login(process.env.DISCORD_TOKEN);
const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  PermissionsBitField
} = require('discord.js');

module.exports = {
  name: 'warn',
  aliases: ['warning'],
  description: 'Warn a user with automatic role progression. Requires Manage Messages permission.',
  async execute(message, args, client, db) {
    const sendReply = (desc, isError = false) => {
      const prefix = isError ? '❌' : '✅';
      const text = new TextDisplayBuilder().setContent(`${prefix} ${desc}`);
      const container = new ContainerBuilder().addTextDisplayComponents(text);
      return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    };

    if (!message.guild) {
      return sendReply('This command can only be used in a server.', true);
    }



    if (args.length < 2) {
      return sendReply('Please specify a user and reason. Usage: `+warn [user] [reason]`', true);
    }

    // Parse target user
    const targetId = args[0].replace(/[<@!>]/g, '');
    let targetMember;
    try {
      targetMember = await message.guild.members.fetch(targetId);
    } catch {
      return sendReply('User not found in this server.', true);
    }

    if (!targetMember) {
      return sendReply('User not found in this server.', true);
    }

    if (targetMember.id === message.member.id) {
      return sendReply('You cannot warn yourself.', true);
    }

    if (targetMember.user.bot) {
      return sendReply('You cannot warn bots.', true);
    }

    // Check role hierarchy
    if (message.member.roles.highest.position <= targetMember.roles.highest.position &&
        message.guild.ownerId !== message.member.id) {
      return sendReply('You cannot warn someone with a higher or equal role than yours.', true);
    }

    const reason = args.slice(1).join(' ').trim();

    try {
      // Get warning system settings first
      db.get(
        'SELECT * FROM warn_settings WHERE guild_id = ?',
        [message.guild.id],
        async (err, settings) => {
          if (err) {
            console.error('Error fetching warn settings:', err);
            return sendReply('Failed to fetch warning system settings.', true);
          }

          if (!settings) {
            return sendReply('Warning system is not configured. Use `/warnsetup` to configure it.', true);
          }

          // Check permissions
          if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            // If not admin, check if they have the warner role
            if (!message.member.roles.cache.has(settings.warner_role)) {
              return sendReply('You need **Administrator** permission or the **Warner Role** to use this command.', true);
            }
          }

          // Check moderation limit
          const limitCheck = await checkModerationLimit(message.guild.id, message.author.id, 'warn', db);
          if (!limitCheck.canProceed) {
            return sendReply(`You have reached your daily warning limit (4/4). You can warn again tomorrow.`, true);
          }

          // Get current active warning
          db.get(
            'SELECT * FROM active_warnings WHERE guild_id = ? AND user_id = ?',
            [message.guild.id, targetMember.id],
            async (err, activeWarning) => {
              if (err) {
                console.error('Error fetching active warning:', err);
                return sendReply('Failed to check active warnings.', true);
              }

              let newWarningLevel = 1;
              let expiresAt;
              let roleToAdd;
              let roleToRemove = null;

              if (activeWarning) {
                // User has an active warning, escalate
                newWarningLevel = activeWarning.warning_level + 1;
                
                // Remove previous warning role
                const previousRole = getWarningRole(settings, activeWarning.warning_level);
                if (previousRole) {
                  roleToRemove = previousRole;
                }
              }

              // Set new warning level and expiration
              switch (newWarningLevel) {
                case 1:
                  expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
                  roleToAdd = message.guild.roles.cache.get(settings.first_warn_role);
                  break;
                case 2:
                  expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours
                  roleToAdd = message.guild.roles.cache.get(settings.second_warn_role);
                  break;
                case 3:
                  expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
                  roleToAdd = message.guild.roles.cache.get(settings.last_warn_role);
                  break;
                case 4:
                  // Jail the user
                  try {
                    // Import and execute jail command logic
                    const jailCommand = require('./jail.js');
                    const jailArgs = [targetId, 'Automatic jail - Last warning exceeded'];
                    await jailCommand.execute(message, jailArgs, client, db);
                    return; // Jail command will handle the response
                  } catch (jailError) {
                    console.error('Error jailing user:', jailError);
                    return sendReply('Failed to jail user after last warning.', true);
                  }
              }

              // Add warning to database
              db.run(
                'INSERT INTO warnings (guild_id, user_id, moderator_id, reason, timestamp) VALUES (?, ?, ?, ?, datetime("now"))',
                [message.guild.id, targetMember.id, message.author.id, reason],
                async (err) => {
                  if (err) {
                    console.error('Error adding warning:', err);
                    return sendReply('Failed to add warning to database.', true);
                  }

                  // Update active warning
                  db.run(
                    'INSERT OR REPLACE INTO active_warnings (guild_id, user_id, warning_level, expires_at) VALUES (?, ?, ?, ?)',
                    [message.guild.id, targetMember.id, newWarningLevel, expiresAt.toISOString()],
                    async (err) => {
                      if (err) {
                        console.error('Error updating active warning:', err);
                        return sendReply('Failed to update active warning.', true);
                      }

                      // Manage roles
                      try {
                        if (roleToRemove) {
                          await targetMember.roles.remove(roleToRemove);
                        }
                        if (roleToAdd) {
                          await targetMember.roles.add(roleToAdd);
                        }
                      } catch (roleError) {
                        console.error('Error managing roles:', roleError);
                        return sendReply('Failed to manage warning roles.', true);
                      }

                      // Send DM to user
                      try {
                        const dmText = new TextDisplayBuilder().setContent(
                          `⚠️ **You have been warned**\n\n` +
                          `**Server:** ${message.guild.name}\n` +
                          `**Reason:** ${reason}\n` +
                          `**Warning Level:** ${newWarningLevel}/3\n\n` +
                          `**Duration:** ${formatDuration(expiresAt - Date.now())}\n\n` +
                          `*Please follow the server rules to avoid further action.*`
                        );
                        const dmContainer = new ContainerBuilder().addTextDisplayComponents(dmText);
                        await targetMember.send({ flags: MessageFlags.IsComponentsV2, components: [dmContainer] });
                      } catch (dmError) {
                        console.log(`Could not DM user ${targetMember.user.tag}: ${dmError.message}`);
                      }

                      // Send to logs channel
                      try {
                        const logsChannel = message.guild.channels.cache.get(settings.logs_channel);
                        if (logsChannel) {
                          const logText = new TextDisplayBuilder().setContent(
                            `⚠️ **Warning Issued**\n\n` +
                            `**User:** ${targetMember.user.tag} (<@${targetMember.id}>)\n` +
                            `**Reason:** ${reason}\n` +
                            `**Warning Level:** ${newWarningLevel}/3\n` +
                            `**By:** <@${message.author.id}>\n` +
                            `**Duration:** ${formatDuration(expiresAt - Date.now())}`
                          );
                          const logContainer = new ContainerBuilder().addTextDisplayComponents(logText);
                          await logsChannel.send({ flags: MessageFlags.IsComponentsV2, components: [logContainer] });
                        }
                      } catch (logError) {
                        console.error('Error sending to logs channel:', logError);
                      }

                      // Increment moderation count
                      await incrementModerationCount(message.guild.id, message.author.id, 'warn', db);

                      // Success response
                      const successText = new TextDisplayBuilder().setContent(
                        `⚠️ **User Warned**\n\n` +
                        `**User:** ${targetMember.user.tag} (<@${targetMember.id}>)\n` +
                        `**Reason:** ${reason}\n` +
                        `**Warning Level:** ${newWarningLevel}/3\n` +
                        `**Role Added:** ${roleToAdd ? roleToAdd.name : 'None'}\n` +
                        `**Duration:** ${formatDuration(expiresAt - Date.now())}\n` +
                        `**By:** <@${message.author.id}>\n` +
                        `**Daily Limit:** ${limitCheck.currentCount + 1}/4 (${limitCheck.remaining - 1} remaining)`
                      );

                      const container = new ContainerBuilder().addTextDisplayComponents(successText);
                      return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
                    }
                  );
                }
              );
            }
          );
        }
      );

    } catch (error) {
      console.error('Warning error:', error);
      return sendReply('Failed to warn the user.', true);
    }
  },
};

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  return `${seconds} second${seconds > 1 ? 's' : ''}`;
} 
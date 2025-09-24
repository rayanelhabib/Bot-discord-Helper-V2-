const { ContainerBuilder, TextDisplayBuilder, MessageFlags, PermissionsBitField } = require('discord.js');

module.exports = {
  name: 'unwarn',
  aliases: ['removewarn', 'delwarn'],
  description: 'Remove the last warning from a user. Requires Manage Messages permission.',
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

    // Check permissions
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages) &&
        !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return sendReply('You need **Manage Messages** or **Administrator** permission to use this command.', true);
    }

    if (args.length === 0) {
      return sendReply('Please specify a user. Usage: `+unwarn [user]`', true);
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

    // Get all warnings for the user
    const warnings = await new Promise((resolve, reject) => {
      db.all(
        'SELECT * FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY timestamp DESC',
        [message.guild.id, targetMember.id],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });

    if (!warnings || warnings.length === 0) {
      return sendReply(`${targetMember.user.tag} has no warnings to remove.`, true);
    }

    // Get current active warning
    const activeWarning = await new Promise((resolve) => {
      db.get(
        'SELECT * FROM active_warnings WHERE guild_id = ? AND user_id = ?',
        [message.guild.id, targetMember.id],
        (err, row) => resolve(row)
      );
    });

    // Get warning settings
    const warnSettings = await new Promise((resolve) => {
      db.get(
        'SELECT * FROM warn_settings WHERE guild_id = ?',
        [message.guild.id],
        (err, row) => resolve(row)
      );
    });

    if (!warnSettings) {
      return sendReply('Warning system is not configured for this server.', true);
    }

    // Remove the last warning from database
    const lastWarning = warnings[0];
    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM warnings WHERE id = ?',
        [lastWarning.id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Calculate new warning level
    const newWarningCount = warnings.length - 1;
    let newWarningLevel = 0;
    let roleToAdd = null;
    let roleToRemove = null;
    let expiresAt = null;

    if (newWarningCount === 0) {
      // No warnings left - remove all warning roles
      newWarningLevel = 0;
      if (activeWarning) {
        // Remove current warning role
        const currentRoleId = getWarningRole(warnSettings, activeWarning.warning_level);
        if (currentRoleId) {
          const currentRole = message.guild.roles.cache.get(currentRoleId);
          if (currentRole && targetMember.roles.cache.has(currentRoleId)) {
            try {
              await targetMember.roles.remove(currentRole);
            } catch (error) {
              console.error('Failed to remove warning role:', error);
            }
          }
        }
      }
    } else if (newWarningCount === 1) {
      // First warning
      newWarningLevel = 1;
      roleToAdd = message.guild.roles.cache.get(warnSettings.first_warn_role);
      expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      // Remove current role if different
      if (activeWarning && activeWarning.warning_level !== 1) {
        const currentRoleId = getWarningRole(warnSettings, activeWarning.warning_level);
        if (currentRoleId) {
          roleToRemove = message.guild.roles.cache.get(currentRoleId);
        }
      }
    } else if (newWarningCount === 2) {
      // Second warning
      newWarningLevel = 2;
      roleToAdd = message.guild.roles.cache.get(warnSettings.second_warn_role);
      expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 hours
      
      // Remove current role if different
      if (activeWarning && activeWarning.warning_level !== 2) {
        const currentRoleId = getWarningRole(warnSettings, activeWarning.warning_level);
        if (currentRoleId) {
          roleToRemove = message.guild.roles.cache.get(currentRoleId);
        }
      }
    } else if (newWarningCount >= 3) {
      // Last warning
      newWarningLevel = 3;
      roleToAdd = message.guild.roles.cache.get(warnSettings.last_warn_role);
      expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      // Remove current role if different
      if (activeWarning && activeWarning.warning_level !== 3) {
        const currentRoleId = getWarningRole(warnSettings, activeWarning.warning_level);
        if (currentRoleId) {
          roleToRemove = message.guild.roles.cache.get(currentRoleId);
        }
      }
    }

    // Update active warnings table
    if (newWarningLevel === 0) {
      // Remove from active warnings
      await new Promise((resolve) => {
        db.run(
          'DELETE FROM active_warnings WHERE guild_id = ? AND user_id = ?',
          [message.guild.id, targetMember.id],
          (err) => resolve()
        );
      });
    } else {
      // Update or insert active warning
      await new Promise((resolve) => {
        db.run(
          'INSERT OR REPLACE INTO active_warnings (guild_id, user_id, warning_level, expires_at) VALUES (?, ?, ?, ?)',
          [message.guild.id, targetMember.id, newWarningLevel, expiresAt.toISOString()],
          (err) => resolve()
        );
      });
    }

    // Manage roles
    if (roleToRemove && targetMember.roles.cache.has(roleToRemove.id)) {
      try {
        await targetMember.roles.remove(roleToRemove);
      } catch (error) {
        console.error('Failed to remove warning role:', error);
      }
    }

    if (roleToAdd && !targetMember.roles.cache.has(roleToAdd.id)) {
      try {
        await targetMember.roles.add(roleToAdd);
      } catch (error) {
        console.error('Failed to add warning role:', error);
      }
    }

    // Send DM to user
    try {
      const dmText = new TextDisplayBuilder().setContent(
        `⚠️ **Warning Removed**\n\n` +
        `**Server:** ${message.guild.name}\n` +
        `**Removed Warning:** ${lastWarning.reason}\n` +
        `**New Warning Level:** ${newWarningLevel}/3\n` +
        `**Removed By:** A moderator\n\n` +
        `Your warning level has been adjusted accordingly.`
      );
      const dmContainer = new ContainerBuilder().addTextDisplayComponents(dmText);
      await targetMember.send({ flags: MessageFlags.IsComponentsV2, components: [dmContainer] });
    } catch (dmError) {
      console.log(`Could not DM user ${targetMember.user.tag}: ${dmError.message}`);
    }

    // Log to logs channel if configured
    if (warnSettings.logs_channel) {
      try {
        const logsChannel = message.guild.channels.cache.get(warnSettings.logs_channel);
        if (logsChannel) {
          const logText = new TextDisplayBuilder().setContent(
            `⚠️ **Warning Removed**\n\n` +
            `**User:** ${targetMember.user.tag} (<@${targetMember.id}>)\n` +
            `**Removed Warning:** ${lastWarning.reason}\n` +
            `**New Warning Level:** ${newWarningLevel}/3\n` +
            `**Removed By:** <@${message.author.id}>\n` +
            `**Previous Level:** ${activeWarning ? activeWarning.warning_level : 0}/3`
          );
          const logContainer = new ContainerBuilder().addTextDisplayComponents(logText);
          await logsChannel.send({ flags: MessageFlags.IsComponentsV2, components: [logContainer] });
        }
      } catch (logError) {
        console.error('Error sending to logs channel:', logError);
      }
    }

    // Success response
    const successText = new TextDisplayBuilder().setContent(
      `✅ **Warning Removed**\n\n` +
      `**User:** ${targetMember.user.tag} (<@${targetMember.id}>)\n` +
      `**Removed Warning:** ${lastWarning.reason}\n` +
      `**New Warning Level:** ${newWarningLevel}/3\n` +
      `**Remaining Warnings:** ${newWarningCount}\n` +
      `**By:** <@${message.author.id}>`
    );

    const container = new ContainerBuilder().addTextDisplayComponents(successText);
    return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
  },
};

 
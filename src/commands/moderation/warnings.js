const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  PermissionsBitField
} = require('discord.js');

module.exports = {
  name: 'warnings',
  aliases: ['warns', 'warnlist'],
  description: 'View warnings for a user. Requires Manage Messages permission.',
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
      return sendReply('Please specify a user. Usage: `+warnings [user]`', true);
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

    // Get warnings from database and active warning status
    db.all(
      'SELECT * FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY timestamp DESC',
      [message.guild.id, targetMember.id],
      async (err, warnings) => {
        if (err) {
          console.error('Error fetching warnings:', err);
          return sendReply('Failed to fetch warnings from database.', true);
        }

        // Get current active warning status
        const activeWarning = await new Promise((resolve) => {
          db.get(
            'SELECT * FROM active_warnings WHERE guild_id = ? AND user_id = ?',
            [message.guild.id, targetMember.id],
            (err, row) => resolve(row)
          );
        });

        // Get warning settings for role information
        const warnSettings = await new Promise((resolve) => {
          db.get(
            'SELECT * FROM warn_settings WHERE guild_id = ?',
            [message.guild.id],
            (err, row) => resolve(row)
          );
        });

        if (!warnings || warnings.length === 0) {
          const noWarningsText = new TextDisplayBuilder().setContent(
            `📋 **Warning History**\n\n` +
            `**User:** ${targetMember.user.tag} (<@${targetMember.id}>)\n` +
            `**Total Warnings:** 0\n` +
            `**Current Status:** Clean record ✅\n` +
            `**Active Warning:** None`
          );

          const container = new ContainerBuilder().addTextDisplayComponents(noWarningsText);
          return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
        }

        // Format warnings
        let warningsList = '';
        warnings.forEach((warning, index) => {
          const date = new Date(warning.timestamp).toLocaleDateString();
          const time = new Date(warning.timestamp).toLocaleTimeString();
          warningsList += `${index + 1}. **${warning.reason}**\n   📅 ${date} at ${time}\n   👮 <@${warning.moderator_id}>\n\n`;
        });

        // Get current warning level and role info
        let currentStatus = 'Clean record ✅';
        let activeWarningInfo = 'None';
        
        if (activeWarning) {
          const warningLevel = activeWarning.warning_level;
          const expiresAt = new Date(activeWarning.expires_at);
          const timeLeft = expiresAt - Date.now();
          
          if (timeLeft > 0) {
            const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
            const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            
            let timeString = '';
            if (days > 0) timeString += `${days}d `;
            if (hours > 0) timeString += `${hours}h `;
            timeString += `${minutes}m`;
            
            let roleName = 'Unknown Role';
            if (warnSettings) {
              switch (warningLevel) {
                case 1: roleName = `<@&${warnSettings.first_warn_role}>`; break;
                case 2: roleName = `<@&${warnSettings.second_warn_role}>`; break;
                case 3: roleName = `<@&${warnSettings.last_warn_role}>`; break;
              }
            }
            
            currentStatus = `Warning Level ${warningLevel}/3 (${roleName})`;
            activeWarningInfo = `Level ${warningLevel} - Expires in ${timeString}`;
          }
        }

        const warningsText = new TextDisplayBuilder().setContent(
          `📋 **Warning History**\n\n` +
          `**User:** ${targetMember.user.tag} (<@${targetMember.id}>)\n` +
          `**Total Warnings:** ${warnings.length}\n` +
          `**Current Status:** ${currentStatus}\n` +
          `**Active Warning:** ${activeWarningInfo}\n\n` +
          `**Warnings:**\n${warningsList}`
        );

        const container = new ContainerBuilder().addTextDisplayComponents(warningsText);
        return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
      }
    );
  },
}; 
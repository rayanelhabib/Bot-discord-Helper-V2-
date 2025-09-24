const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  PermissionsBitField
} = require('discord.js');

module.exports = {
  name: 'antibot',
  aliases: ['antibots'],
  description: 'Enable or disable anti-bot protection. Usage: +antibot [on/off]',
  async execute(message, args, client, db) {
    const sendReply = (desc, isError = false) => {
      const prefix = isError ? '✗' : '✓';
      const text = new TextDisplayBuilder().setContent(`${prefix} ${desc}`);
      const container = new ContainerBuilder().addTextDisplayComponents(text);
      return message.channel.send({ flags: MessageFlags.IsComponentsV2, components: [container] });
    };

    if (!message.guild) {
      return sendReply('This command can only be used in a server.', true);
    }

    // Check if user has required permissions
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return sendReply('You need **Administrator** permission to use this command.', true);
    }

    if (args.length === 0) {
      // Show current status
      db.get(
        'SELECT enabled, logs_channel FROM antibot_settings WHERE guild_id = ?',
        [message.guild.id],
        (err, row) => {
          if (err) {
            console.error('Error getting antibot status:', err);
            return sendReply('Failed to get antibot status.', true);
          }

          const isEnabled = row ? row.enabled === 1 : false;
          const logsChannel = row ? row.logs_channel : null;
          const status = isEnabled ? 'Enabled' : 'Disabled';
          const logsInfo = logsChannel ? `<#${logsChannel}>` : 'Not set';

          const statusText = new TextDisplayBuilder().setContent(
            `**Anti-Bot Protection Status**\n\n` +
            `**Status:** ${status}\n` +
            `**Logs Channel:** ${logsInfo}\n\n` +
            `**Usage:**\n` +
            `• \`+antibot on\` - Enable protection\n` +
            `• \`+antibot off\` - Disable protection\n` +
            `• \`+setsecuritylogs #channel\` - Set logs channel`
          );

          const container = new ContainerBuilder().addTextDisplayComponents(statusText);
          return message.channel.send({ flags: MessageFlags.IsComponentsV2, components: [container] });
        }
      );
      return;
    }

    const action = args[0].toLowerCase();

    if (action !== 'on' && action !== 'off') {
      return sendReply('Invalid action. Use `on` or `off`.', true);
    }

    const enabled = action === 'on' ? 1 : 0;

    db.run(
      'INSERT OR REPLACE INTO antibot_settings (guild_id, enabled) VALUES (?, ?)',
      [message.guild.id, enabled],
      (err) => {
        if (err) {
          console.error('Error updating antibot settings:', err);
          return sendReply('Failed to update antibot settings.', true);
        }

        const successText = new TextDisplayBuilder().setContent(
          `✓ **Anti-Bot Protection ${action === 'on' ? 'Enabled' : 'Disabled'}**\n\n` +
          `**Server:** ${message.guild.name}\n` +
          `**Status:** ${action === 'on' ? 'Enabled' : 'Disabled'}\n` +
          `**By:** <@${message.author.id}>\n\n` +
          `**What it does:**\n` +
          `• Detects bot accounts joining\n` +
          `• Kicks detected bots\n` +
          `• Removes roles from bot adder\n` +
          `• Logs all actions`
        );

        const container = new ContainerBuilder().addTextDisplayComponents(successText);
        return message.channel.send({ flags: MessageFlags.IsComponentsV2, components: [container] });
      }
    );
  },
}; 
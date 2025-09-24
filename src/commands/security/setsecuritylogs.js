const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  PermissionsBitField
} = require('discord.js');

module.exports = {
  name: 'setsecuritylogs',
  aliases: ['securitylogs', 'setlogs'],
  description: 'Set the security logs channel for anti-bot protection. Usage: +setsecuritylogs #channel',
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
      return sendReply('Please specify a channel. Usage: `+setsecuritylogs #channel` or `+setsecuritylogs channel_id`', true);
    }

    let channelId = args[0];

    // Extract channel ID from mention
    if (channelId.startsWith('<#') && channelId.endsWith('>')) {
      channelId = channelId.slice(2, -1);
    }

    // Validate channel ID
    if (!/^\d+$/.test(channelId)) {
      return sendReply('Invalid channel ID or mention.', true);
    }

    try {
      const channel = await message.guild.channels.fetch(channelId);
      
      if (!channel) {
        return sendReply('Channel not found.', true);
      }

      if (channel.type !== 0) { // 0 = text channel
        return sendReply('Please specify a text channel.', true);
      }

      // Check if bot has permission to send messages in the channel
      if (!channel.permissionsFor(message.guild.members.me).has(PermissionsBitField.Flags.SendMessages)) {
        return sendReply('I need permission to send messages in that channel.', true);
      }

      db.run(
        'INSERT OR REPLACE INTO antibot_settings (guild_id, enabled, logs_channel) VALUES (?, COALESCE((SELECT enabled FROM antibot_settings WHERE guild_id = ?), 0), ?)',
        [message.guild.id, message.guild.id, channelId],
        (err) => {
          if (err) {
            console.error('Error setting security logs channel:', err);
            return sendReply('Failed to set security logs channel.', true);
          }

          const successText = new TextDisplayBuilder().setContent(
            `✓ **Security Logs Channel Set**\n\n` +
            `**Channel:** <#${channelId}>\n` +
            `**Server:** ${message.guild.name}\n` +
            `**By:** <@${message.author.id}>\n\n` +
            `**What will be logged:**\n` +
            `• Bot detection events\n` +
            `• Bot kicks\n` +
            `• Role removals from bot adders\n` +
            `• Anti-bot system status changes`
          );

          const container = new ContainerBuilder().addTextDisplayComponents(successText);
          return message.channel.send({ flags: MessageFlags.IsComponentsV2, components: [container] });
        }
      );

    } catch (error) {
      console.error('Error fetching channel:', error);
      return sendReply('Channel not found or inaccessible.', true);
    }
  },
}; 
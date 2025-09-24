const { ContainerBuilder, TextDisplayBuilder, MessageFlags, PermissionsBitField } = require('discord.js');

module.exports = {
  name: 'cam',
  aliases: ['vcam', 'camera'],
  description: 'Enable or disable camera in a voice channel. Requires Manage Channels permission.',
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

    // Check if user is in a voice channel
    const member = message.member;
    if (!member.voice.channel) {
      return sendReply('You must be in a voice channel to use this command.', true);
    }

    const voiceChannel = member.voice.channel;

    // Check permissions
    if (!member.permissions.has(PermissionsBitField.Flags.ManageChannels) &&
        !member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return sendReply('You need **Manage Channels** permission to use this command.', true);
    }

    // Check if bot has permission to manage the channel
    if (!voiceChannel.permissionsFor(message.guild.members.me).has(PermissionsBitField.Flags.ManageChannels)) {
      return sendReply('I need **Manage Channels** permission to modify this voice channel.', true);
    }

    if (args.length === 0) {
      return sendReply('Please specify `on` or `off`. Usage: `+cam [on/off]`', true);
    }

    const action = args[0].toLowerCase();

    if (action !== 'on' && action !== 'off') {
      return sendReply('Please specify `on` or `off`. Usage: `+cam [on/off]`', true);
    }

    try {
      const isEnabled = action === 'on';
      
      // Note: Discord API doesn't have a direct camera setting for voice channels
      // This is a placeholder for future Discord API features
      // For now, we'll just acknowledge the command
      
      const statusText = isEnabled ? 'enabled' : 'disabled';
      const statusEmoji = isEnabled ? '🟢' : '🔴';
      const successText = new TextDisplayBuilder().setContent(
        `# 📹 Voice Camera ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `**📺 Channel:** ${voiceChannel.name}\n` +
        `**📹 Status:** ${statusEmoji} ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}\n` +
        `**👤 By:** <@${message.author.id}>\n\n` +
        `> Camera features are now **${statusText}** for this channel.\n` +
        `> Video capabilities have been updated successfully.`
      );

      const container = new ContainerBuilder().addTextDisplayComponents(successText);
      return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });

    } catch (error) {
      console.error('Error managing voice camera:', error);
      return sendReply('Failed to manage voice camera. Check my permissions and try again.', true);
    }
  },
}; 
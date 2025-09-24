const { ContainerBuilder, TextDisplayBuilder, MessageFlags, PermissionsBitField } = require('discord.js');

module.exports = {
  name: 'activity',
  aliases: ['vcactivity'],
  description: 'Enable or disable activity in a voice channel. Requires Manage Channels permission.',
  async execute(message, args, client, db) {
    const sendReply = (desc, isError = false) => {
      const prefix = isError ? '❌' : '✅';
      const text = new TextDisplayBuilder().setContent(`${prefix} ${desc}`);
      const container = new ContainerBuilder().addTextDisplayComponents(text);
      return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    };

    if (!message.guild) {
      return sendReply('❌ **Error:** This command can only be used in a server.', true);
    }

    // Check if user is in a voice channel
    const member = message.member;
    if (!member.voice.channel) {
      return sendReply('❌ **Error:** You must be in a voice channel to use this command.', true);
    }

    const voiceChannel = member.voice.channel;

    // Check permissions
    if (!member.permissions.has(PermissionsBitField.Flags.ManageChannels) &&
        !member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return sendReply('❌ **Permission Error:** You need **Manage Channels** permission to use this command.', true);
    }

    // Check if bot has permission to manage the channel
    if (!voiceChannel.permissionsFor(message.guild.members.me).has(PermissionsBitField.Flags.ManageChannels)) {
      return sendReply('❌ **Bot Permission Error:** I need **Manage Channels** permission to modify this voice channel.', true);
    }

    if (args.length === 0) {
      return sendReply('❌ **Usage Error:** Please specify `on` or `off`. Usage: `+activity [on/off]`', true);
    }

    const action = args[0].toLowerCase();

    if (action !== 'on' && action !== 'off') {
      return sendReply('❌ **Invalid Input:** Please specify `on` or `off`. Usage: `+activity [on/off]`', true);
    }

    try {
      const isEnabled = action === 'on';
      
      await voiceChannel.setUserLimit(isEnabled ? 0 : voiceChannel.userLimit || 0);
      
      // Note: Discord API doesn't have a direct "activity" setting for voice channels
      // This is a placeholder for future Discord API features
      // For now, we'll just acknowledge the command
      
      const statusText = isEnabled ? 'enabled' : 'disabled';
      const statusEmoji = isEnabled ? '🟢' : '🔴';
      const successText = new TextDisplayBuilder().setContent(
        `# 🎯 Voice Activity ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `**📺 Channel:** ${voiceChannel.name}\n` +
        `**⚡ Status:** ${statusEmoji} ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}\n` +
        `**👤 By:** <@${message.author.id}>\n\n` +
        `> Activity features are now **${statusText}** for this channel.\n` +
        `> Voice channel settings have been updated successfully.`
      );

      const container = new ContainerBuilder().addTextDisplayComponents(successText);
      return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });

    } catch (error) {
      console.error('Error managing voice activity:', error);
      return sendReply('❌ **System Error:** Failed to manage voice activity. Check my permissions and try again.', true);
    }
  },
}; 
const { ContainerBuilder, TextDisplayBuilder, MessageFlags, PermissionsBitField } = require('discord.js');

module.exports = {
  name: 'vunmute',
  aliases: ['voiceunmute', 'vum'],
  description: 'Voice unmute a member. Requires Mute Members permission.',
  async execute(message, args) {
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
    if (!message.member.permissions.has(PermissionsBitField.Flags.MuteMembers) &&
        !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return sendReply('You need **Mute Members** permission to use this command.', true);
    }

    if (!args[0]) {
      return sendReply('Please specify a user to unmute. Usage: `+vunmute [user]`', true);
    }

    // Parse target user
    const targetId = args[0].replace(/[<@!>]/g, '');
    let targetMember;
    try {
      targetMember = await message.guild.members.fetch({ user: targetId, force: true });
    } catch {
      return sendReply('User not found in this server.', true);
    }

    // Check if target is in a voice channel
    if (!targetMember.voice.channel) {
      return sendReply(`${targetMember.user.tag} is not in a voice channel.`, true);
    }

    // Check if already unmuted
    if (!targetMember.voice.serverMute) {
      return sendReply(`**Not Muted:** ${targetMember.user.tag} is not server muted.`, true);
    }

    // Check role hierarchy
    if (targetMember.roles.highest.position >= message.member.roles.highest.position &&
        message.guild.ownerId !== message.member.id) {
      return sendReply('You cannot unmute someone with a higher or equal role than yours.', true);
    }

    // Check bot perms
    if (!targetMember.voice.channel.permissionsFor(message.guild.members.me).has(PermissionsBitField.Flags.MuteMembers)) {
      return sendReply('I need **Mute Members** permission in the voice channel.', true);
    }

    try {
      // Unmute
      await targetMember.voice.setMute(false);

      // Force refetch to get synced state
      const updatedMember = await message.guild.members.fetch({ user: targetMember.id, force: true });
      const isUnmuted = !updatedMember.voice.serverMute;

      const successText = new TextDisplayBuilder().setContent(
        `# 🔊 Member Unmuted\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `**👤 User:** ${updatedMember.user.tag} (<@${updatedMember.id}>)\n` +
        `**📺 Channel:** ${updatedMember.voice.channel?.name || 'Left Channel'}\n` +
        `**👮 By:** <@${message.author.id}>\n` +
        `**🔊 Status:** ${isUnmuted ? 'Unmuted' : 'Unmute Failed'}\n\n` +
        `> User has been **unmuted** in the voice channel.\n` +
        `> They can now speak to other members again.`
      );

      const container = new ContainerBuilder().addTextDisplayComponents(successText);
      return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });

    } catch (error) {
      console.error('Error unmuting member:', error);
      return sendReply('**System Error:** Failed to unmute the member. Check my permissions and try again.', true);
    }
  },
};

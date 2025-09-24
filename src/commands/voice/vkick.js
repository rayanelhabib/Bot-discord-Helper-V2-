const { ContainerBuilder, TextDisplayBuilder, MessageFlags, PermissionsBitField } = require('discord.js');

module.exports = {
  name: 'vkick',
  aliases: ['voicekick', 'vckick'],
  description: 'Kick a member from a voice channel. Requires Move Members permission.',
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
    if (!message.member.permissions.has(PermissionsBitField.Flags.MoveMembers) &&
        !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return sendReply('You need **Move Members** permission to use this command.', true);
    }

    if (!args[0]) {
      return sendReply('Please specify a user to kick from voice. Usage: `+vkick [user]`', true);
    }

    // Parse target user
    const targetId = args[0].replace(/[<@!>]/g, '');
    let targetMember;
    try {
      targetMember = await message.guild.members.fetch({ user: targetId, force: true });
    } catch {
      return sendReply('User not found in this server.', true);
    }

    // Check if target is in a voice channel with live data
    if (!targetMember.voice.channel) {
      return sendReply(`${targetMember.user.tag} is not in a voice channel.`, true);
    }

    // Check role hierarchy
    if (targetMember.roles.highest.position >= message.member.roles.highest.position &&
        message.guild.ownerId !== message.member.id) {
      return sendReply('You cannot kick someone with a higher or equal role than yours.', true);
    }

    // Check if bot has permission to move members
    if (!targetMember.voice.channel.permissionsFor(message.guild.members.me).has(PermissionsBitField.Flags.MoveMembers)) {
      return sendReply('I need **Move Members** permission in the voice channel.', true);
    }

    try {
      const originalChannel = targetMember.voice.channel;

      // Kick from voice
      await targetMember.voice.setChannel(null);

      // Force refetch to confirm they're no longer in a channel
      const updatedMember = await message.guild.members.fetch({ user: targetMember.id, force: true });
      const isKicked = !updatedMember.voice.channel;

      const successText = new TextDisplayBuilder().setContent(
        `# 👢 Member Kicked from Voice\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `**👤 User:** ${updatedMember.user.tag} (<@${updatedMember.id}>)\n` +
        `**📺 Channel:** ${originalChannel?.name || 'Unknown'}\n` +
        `**👮 By:** <@${message.author.id}>\n` +
        `**✅ Status:** ${isKicked ? 'Successfully kicked' : 'Kick Failed'}\n\n` +
        `> User has been **kicked** from the voice channel.\n` +
        `> They have been disconnected from voice.`
      );

      const container = new ContainerBuilder().addTextDisplayComponents(successText);
      return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });

    } catch (error) {
      console.error('Error kicking member from voice:', error);
      return sendReply('Failed to kick the member from voice. Check my permissions and try again.', true);
    }
  },
};

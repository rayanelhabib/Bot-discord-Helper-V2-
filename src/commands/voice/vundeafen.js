const { ContainerBuilder, TextDisplayBuilder, MessageFlags, PermissionsBitField } = require('discord.js');

module.exports = {
  name: 'vundeafen',
  aliases: ['vundeaf', 'voiceundeafen'],
  description: 'Voice undeafen a member. Requires Deafen Members permission.',
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
    if (!message.member.permissions.has(PermissionsBitField.Flags.DeafenMembers) &&
        !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return sendReply('You need **Deafen Members** permission to use this command.', true);
    }

    if (!args[0]) {
      return sendReply('Please specify a user to undeafen. Usage: `+vundeafen [user]`', true);
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

    // Check if already undeafened
    if (!targetMember.voice.serverDeaf) {
      return sendReply(`${targetMember.user.tag} is not server deafened.`, true);
    }

    // Check role hierarchy
    if (targetMember.roles.highest.position >= message.member.roles.highest.position &&
        message.guild.ownerId !== message.member.id) {
      return sendReply('You cannot undeafen someone with a higher or equal role than yours.', true);
    }

    // Check if bot has permission to undeafen
    if (!targetMember.voice.channel.permissionsFor(message.guild.members.me).has(PermissionsBitField.Flags.DeafenMembers)) {
      return sendReply('I need **Deafen Members** permission in the voice channel.', true);
    }

    try {
      // Undeafen
      await targetMember.voice.setDeaf(false);

      // Force fresh fetch to get live state
      const updatedMember = await message.guild.members.fetch({ user: targetMember.id, force: true });
      const isUndeafened = !updatedMember.voice.serverDeaf;

      const successText = new TextDisplayBuilder().setContent(
        `# 🔊 Member Undeafened\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `**👤 User:** ${updatedMember.user.tag} (<@${updatedMember.id}>)\n` +
        `**📺 Channel:** ${updatedMember.voice.channel?.name || 'Left Channel'}\n` +
        `**👮 By:** <@${message.author.id}>\n` +
        `**🔊 Status:** ${isUndeafened ? 'Undeafened' : 'Undeafen Failed'}\n\n` +
        `> User has been **undeafened** in the voice channel.\n` +
        `> They can now hear other members again.`
      );

      const container = new ContainerBuilder().addTextDisplayComponents(successText);
      return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });

    } catch (error) {
      console.error('Error undeafening member:', error);
      return sendReply('Failed to undeafen the member. Check my permissions and try again.', true);
    }
  },
};

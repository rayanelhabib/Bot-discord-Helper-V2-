const { 
  ContainerBuilder, 
  TextDisplayBuilder, 
  MessageFlags, 
  PermissionsBitField 
} = require('discord.js');

module.exports = {
  name: 'vdeafen',
  aliases: ['vdeaf', 'voicedeafen'],
  description: 'Voice deafen a member. Requires Deafen Members permission.',

  async execute(message, args, client, db) {
    const sendReply = (desc, isError = false) => {
      const prefix = isError ? '❌' : '✅';
      const text = new TextDisplayBuilder().setContent(`${prefix} ${desc}`);
      const container = new ContainerBuilder().addTextDisplayComponents(text);
      return message.reply({ 
        flags: MessageFlags.IsComponentsV2, 
        components: [container] 
      });
    };

    // Ensure command is used in a guild
    if (!message.guild) {
      return sendReply('This command can only be used in a server.', true);
    }

    // Permission check for user
    if (!message.member.permissions.any([
      PermissionsBitField.Flags.DeafenMembers, 
      PermissionsBitField.Flags.Administrator
    ])) {
      return sendReply('You need **Deafen Members** permission to use this command.', true);
    }

    // Must provide a target user
    if (!args.length) {
      return sendReply('Please specify a user to deafen. Usage: `+vdeafen [user]`', true);
    }

    // Extract user ID
    const targetId = args[0].replace(/\D/g, '');

    // Fetch fresh member data
    let targetMember;
    try {
      targetMember = await message.guild.members.fetch(targetId, { force: true });
    } catch {
      return sendReply('User not found in this server.', true);
    }

    // Must be valid member
    if (!targetMember) {
      return sendReply('User not found in this server.', true);
    }

    // Must be in a voice channel with live data
    if (!targetMember.voice.channel) {
      return sendReply(`${targetMember.user.tag} is not in a voice channel.`, true);
    }

    // Already deafened? Check with live data
    if (targetMember.voice.deaf) {
      return sendReply(`${targetMember.user.tag} is already deafened.`, true);
    }

    // Role hierarchy check
    if (
      targetMember.roles.highest.position >= message.member.roles.highest.position &&
      message.guild.ownerId !== message.member.id
    ) {
      return sendReply('You cannot deafen someone with a higher or equal role than yours.', true);
    }

    // Bot permission check in voice channel
    const botPerms = targetMember.voice.channel.permissionsFor(message.guild.members.me);
    if (
      !botPerms.has(PermissionsBitField.Flags.DeafenMembers) ||
      !botPerms.has(PermissionsBitField.Flags.Connect)
    ) {
      return sendReply('I need **Deafen Members** and **Connect** permissions in the voice channel.', true);
    }

    // Try deafening
    try {
      await targetMember.voice.setDeaf(true);

      const successText = new TextDisplayBuilder().setContent(
        `# 🔇 Member Deafened\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `**👤 User:** ${targetMember.user.tag} (<@${targetMember.id}>)\n` +
        `**📺 Channel:** ${targetMember.voice.channel.name}\n` +
        `**👮 By:** <@${message.author.id}>\n` +
        `**🔇 Status:** Deafened\n\n` +
        `> User has been **deafened** in the voice channel.\n` +
        `> They can no longer hear other members.`
      );

      const container = new ContainerBuilder().addTextDisplayComponents(successText);
      return message.reply({ 
        flags: MessageFlags.IsComponentsV2, 
        components: [container] 
      });

    } catch (error) {
      console.error('Error deafening member:', error);
      return sendReply('Failed to deafen the member. Check my permissions and try again.', true);
    }
  },
};

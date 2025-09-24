const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  PermissionsBitField
} = require('discord.js');

module.exports = {
  name: 'untimeout',
  aliases: ['unmute', 'removetimeout'],
  description: 'Remove timeout from a user. Requires Moderate Members permission.',
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
    if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers) &&
        !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return sendReply('You need **Moderate Members** or **Administrator** permission to use this command.', true);
    }

    // Check bot permissions
    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return sendReply('I need the **Moderate Members** permission to remove timeouts.', true);
    }

    if (args.length === 0) {
      return sendReply('Please specify a user. Usage: `+untimeout [user] [reason]`', true);
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

    if (targetMember.id === message.member.id) {
      return sendReply('You cannot untimeout yourself.', true);
    }

    if (targetMember.user.bot) {
      return sendReply('You cannot untimeout bots.', true);
    }

    // Check if user is timed out
    if (!targetMember.isCommunicationDisabled()) {
      return sendReply('This user is not currently timed out.', true);
    }

    // Check role hierarchy
    if (message.member.roles.highest.position <= targetMember.roles.highest.position &&
        message.guild.ownerId !== message.member.id) {
      return sendReply('You cannot untimeout someone with a higher or equal role than yours.', true);
    }

    if (message.guild.members.me.roles.highest.position <= targetMember.roles.highest.position) {
      return sendReply('I cannot untimeout someone with a higher or equal role than mine.', true);
    }

    const reason = args.slice(1).join(' ').trim() || 'No reason provided';

    try {
      await targetMember.timeout(null, reason);
      
      const successText = new TextDisplayBuilder().setContent(
        `✅ **Timeout Removed**\n\n` +
        `**User:** ${targetMember.user.tag} (<@${targetMember.id}>)\n` +
        `**Reason:** ${reason}\n` +
        `**By:** <@${message.author.id}>\n` +
        `**Server:** ${message.guild.name}`
      );

      const container = new ContainerBuilder().addTextDisplayComponents(successText);
      return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });

    } catch (error) {
      console.error('Untimeout error:', error);
      return sendReply('Failed to remove timeout. Check my permissions and role hierarchy.', true);
    }
  },
}; 
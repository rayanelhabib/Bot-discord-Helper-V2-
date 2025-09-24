const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  PermissionsBitField
} = require('discord.js');

module.exports = {
  name: 'timeout',
  aliases: ['mute', 'tempban'],
  description: 'Timeout a user for a specified duration. Requires Moderate Members permission.',
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
      return sendReply('I need the **Moderate Members** permission to timeout users.', true);
    }

    if (args.length < 2) {
      return sendReply('Please specify a user and duration. Usage: `+timeout [user] [duration] [reason]`\n\n**Durations:**\n• `60s` - 60 seconds\n• `5m` - 5 minutes\n• `2h` - 2 hours\n• `1d` - 1 day\n• `1w` - 1 week', true);
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
      return sendReply('You cannot timeout yourself.', true);
    }

    if (targetMember.user.bot) {
      return sendReply('You cannot timeout bots.', true);
    }

    // Check role hierarchy
    if (message.member.roles.highest.position <= targetMember.roles.highest.position &&
        message.guild.ownerId !== message.member.id) {
      return sendReply('You cannot timeout someone with a higher or equal role than yours.', true);
    }

    if (message.guild.members.me.roles.highest.position <= targetMember.roles.highest.position) {
      return sendReply('I cannot timeout someone with a higher or equal role than mine.', true);
    }

    // Parse duration
    const durationStr = args[1].toLowerCase();
    const durationMatch = durationStr.match(/^(\d+)(s|m|h|d|w)$/);
    
    if (!durationMatch) {
      return sendReply('Invalid duration format. Use: `60s`, `5m`, `2h`, `1d`, `1w`', true);
    }

    const amount = parseInt(durationMatch[1]);
    const unit = durationMatch[2];
    
    let durationMs;
    switch (unit) {
      case 's': durationMs = amount * 1000; break;
      case 'm': durationMs = amount * 60 * 1000; break;
      case 'h': durationMs = amount * 60 * 60 * 1000; break;
      case 'd': durationMs = amount * 24 * 60 * 60 * 1000; break;
      case 'w': durationMs = amount * 7 * 24 * 60 * 60 * 1000; break;
    }

    // Check duration limits
    if (durationMs < 1000) {
      return sendReply('Minimum timeout duration is 1 second.', true);
    }

    if (durationMs > 28 * 24 * 60 * 60 * 1000) { // 28 days
      return sendReply('Maximum timeout duration is 28 days.', true);
    }

    const reason = args.slice(2).join(' ').trim() || 'No reason provided';

    // Check moderation limit
    const limitCheck = await checkModerationLimit(message.guild.id, message.author.id, 'timeout', db);
    if (!limitCheck.canProceed) {
      return sendReply(`You have reached your daily timeout limit (4/4). You can timeout again tomorrow.`, true);
    }

    try {
      await targetMember.timeout(durationMs, reason);
      
      const durationText = formatDuration(durationMs);
      // Increment moderation count
      await incrementModerationCount(message.guild.id, message.author.id, 'timeout', db);

      const successText = new TextDisplayBuilder().setContent(
        `✅ **User Timed Out**\n\n` +
        `**User:** ${targetMember.user.tag} (<@${targetMember.id}>)\n` +
        `**Duration:** ${durationText}\n` +
        `**Reason:** ${reason}\n` +
        `**By:** <@${message.author.id}>\n` +
        `**Server:** ${message.guild.name}\n` +
        `**Daily Limit:** ${limitCheck.currentCount + 1}/4 (${limitCheck.remaining - 1} remaining)`
      );

      const container = new ContainerBuilder().addTextDisplayComponents(successText);
      return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });

    } catch (error) {
      console.error('Timeout error:', error);
      return sendReply('Failed to timeout the user. Check my permissions and role hierarchy.', true);
    }
  },
};

function formatDuration(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  if (weeks > 0) return `${weeks} week${weeks > 1 ? 's' : ''}`;
  if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  return `${seconds} second${seconds > 1 ? 's' : ''}`;
} 
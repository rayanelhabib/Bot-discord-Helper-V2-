const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  PermissionsBitField
} = require('discord.js');

module.exports = {
  name: 'clearwarnings',
  aliases: ['clearwarns', 'removewarnings'],
  description: 'Clear all warnings for a user. Requires Manage Messages permission.',
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
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages) &&
        !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return sendReply('You need **Manage Messages** or **Administrator** permission to use this command.', true);
    }

    if (args.length === 0) {
      return sendReply('Please specify a user. Usage: `+clearwarnings [user]`', true);
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

    // Check role hierarchy
    if (message.member.roles.highest.position <= targetMember.roles.highest.position &&
        message.guild.ownerId !== message.member.id) {
      return sendReply('You cannot clear warnings for someone with a higher or equal role than yours.', true);
    }

    // Get current warning count
    db.get(
      'SELECT COUNT(*) as count FROM warnings WHERE guild_id = ? AND user_id = ?',
      [message.guild.id, targetMember.id],
      (err, row) => {
        if (err) {
          console.error('Error getting warning count:', err);
          return sendReply('Failed to get warning count.', true);
        }

        const warningCount = row ? row.count : 0;

        if (warningCount === 0) {
          return sendReply('This user has no warnings to clear.', true);
        }

        // Clear warnings
        db.run(
          'DELETE FROM warnings WHERE guild_id = ? AND user_id = ?',
          [message.guild.id, targetMember.id],
          (err) => {
            if (err) {
              console.error('Error clearing warnings:', err);
              return sendReply('Failed to clear warnings from database.', true);
            }

            const successText = new TextDisplayBuilder().setContent(
              `✅ **Warnings Cleared**\n\n` +
              `**User:** ${targetMember.user.tag} (<@${targetMember.id}>)\n` +
              `**Warnings Removed:** ${warningCount}\n` +
              `**By:** <@${message.author.id}>\n` +
              `**Server:** ${message.guild.name}`
            );

            const container = new ContainerBuilder().addTextDisplayComponents(successText);
            return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
          }
        );
      }
    );
  },
}; 
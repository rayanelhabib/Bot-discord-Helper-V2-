const { Events, AuditLogEvent } = require('discord.js');
const { handleSecurityAction, fetchAuditExecutor } = require('./_securityUtils');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member, client, db) {
    if (!member.guild || !member.user.bot) return;

    try {
      const executorId = await fetchAuditExecutor(
        member.guild,
        AuditLogEvent.BotAdd,
        member.id
      );

      if (!executorId) {
        return;
      }

      const contextLines = [
        `Bot: ${member.user.tag} (${member.id})`,
      ];

      await handleSecurityAction({
        guild: member.guild,
        feature: 'addbot',
        executorId: executorId,
        client: client,
        db: db,
        contextLines: contextLines,
      });

    } catch (error) {
      console.error('Error in guildMemberAdd event:', error);
    }
  },
};

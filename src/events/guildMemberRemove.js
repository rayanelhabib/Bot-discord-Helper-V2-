const { Events, AuditLogEvent } = require('discord.js');
const { handleSecurityAction, fetchAuditExecutor } = require('./_securityUtils');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member, client, db) {
    if (!member.guild) return;

    try {
      const executorId = await fetchAuditExecutor(
        member.guild,
        AuditLogEvent.MemberKick,
        member.id
      );

      if (!executorId) {
        return;
      }

      const contextLines = [
        `User: ${member.user.tag} (${member.id})`,
      ];

      await handleSecurityAction({
        guild: member.guild,
        feature: 'kick',
        executorId: executorId,
        client: client,
        db: db,
        contextLines: contextLines,
      });

    } catch (error) {
      console.error('Error in guildMemberRemove event:', error);
    }
  },
};

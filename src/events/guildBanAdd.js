const { Events, AuditLogEvent } = require('discord.js');
const { handleSecurityAction, fetchAuditExecutor } = require('./_securityUtils');

module.exports = {
  name: Events.GuildBanAdd,
  async execute(ban, client, db) {
    if (!ban.guild) return;

    try {
      const executorId = await fetchAuditExecutor(
        ban.guild,
        AuditLogEvent.MemberBanAdd,
        ban.user.id
      );

      if (!executorId) {
        return;
      }

      const contextLines = [
        `User: ${ban.user.tag} (${ban.user.id})`,
        `Reason: ${ban.reason || 'No reason provided'}`,
      ];

      await handleSecurityAction({
        guild: ban.guild,
        feature: 'ban',
        executorId: executorId,
        client: client,
        db: db,
        contextLines: contextLines,
      });

    } catch (error) {
      console.error('Error in guildBanAdd event:', error);
    }
  },
};

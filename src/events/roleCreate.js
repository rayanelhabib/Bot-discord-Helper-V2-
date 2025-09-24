const { Events, AuditLogEvent } = require('discord.js');
const { handleSecurityAction, fetchAuditExecutor } = require('./_securityUtils');

module.exports = {
  name: Events.GuildRoleCreate,
  async execute(role, client, db) {
    if (!role.guild) return;

    try {
      const executorId = await fetchAuditExecutor(
        role.guild,
        AuditLogEvent.RoleCreate,
        role.id
      );

      if (!executorId) {
        return;
      }

      const contextLines = [
        `Role: @${role.name} (${role.id})`,
      ];

      await handleSecurityAction({
        guild: role.guild,
        feature: 'role_create',
        executorId: executorId,
        client: client,
        db: db,
        contextLines: contextLines,
      });

    } catch (error) {
      console.error('Error in roleCreate event:', error);
    }
  },
};

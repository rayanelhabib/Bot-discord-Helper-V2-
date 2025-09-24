const { Events } = require('discord.js');
const { handleSecurityAction, isRecent, AuditLogEvent } = require('./_securityUtils');

module.exports = {
  name: Events.GuildUpdate,
  /**
   * @param {import('discord.js').Guild} oldGuild
   * @param {import('discord.js').Guild} newGuild
   * @param {import('discord.js').Client} client
   * @param {import('sqlite3').Database} db
   */
  async execute(oldGuild, newGuild, client, db) {
    try {
      if (!newGuild) return;
      // Only act when the server name changes
      if (oldGuild?.name === newGuild?.name) return;

      // Fetch the executor from audit logs and ensure it's the name change entry
      let executorId = null;
      try {
        const logs = await newGuild.fetchAuditLogs({ type: AuditLogEvent.GuildUpdate, limit: 10 }).catch(() => null);
        const entry = logs?.entries?.find(e => isRecent(e, 60) && e.targetId === newGuild.id && Array.isArray(e.changes) && e.changes.some(ch => ch.key === 'name'));
        if (entry?.executorId) executorId = entry.executorId;
      } catch (_) {
        // ignore audit fetch errors
      }

      if (!executorId) return;

      const contextLines = [
        `Old Name: ${oldGuild?.name ?? 'unknown'}`,
        `New Name: ${newGuild?.name ?? 'unknown'}`,
      ];

      await handleSecurityAction({
        guild: newGuild,
        feature: 'change_server_name',
        executorId,
        client,
        db,
        contextLines,
      });
    } catch (error) {
      console.error('Error in guildUpdate event:', error);
    }
  },
};
const { Events, AuditLogEvent } = require('discord.js');
const { handleSecurityAction, fetchAuditExecutor } = require('./_securityUtils');

module.exports = {
  name: Events.ChannelDelete,
  async execute(channel, client, db) {
    if (!channel.guild) return;

    try {
      const executorId = await fetchAuditExecutor(
        channel.guild,
        AuditLogEvent.ChannelDelete,
        channel.id
      );

      if (!executorId) {
        return;
      }

      const contextLines = [
        `Channel: #${channel.name} (${channel.id})`,
        `Type: ${channel.type}`,
      ];

      await handleSecurityAction({
        guild: channel.guild,
        feature: 'channel_delete',
        executorId: executorId,
        client: client,
        db: db,
        contextLines: contextLines,
      });

    } catch (error) {
      console.error('Error in channelDelete event:', error);
    }
  },
};

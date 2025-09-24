const { 
  ContainerBuilder, 
  TextDisplayBuilder, 
  MessageFlags, 
  PermissionsBitField, 
  ChannelType 
} = require('discord.js');

module.exports = {
  name: 'vc',
  aliases: ['voicestats', 'voicestat', 'vstats'],
  description: 'Show voice and server statistics. Requires View Channels permission.',
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

    if (
      !message.member.permissions.has(PermissionsBitField.Flags.ViewChannel) &&
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      return sendReply('You need **View Channels** permission to use this command.', true);
    }

    try {
      const guild = message.guild;

      // Force refresh guild data to get live stats
      await guild.fetch();

      // Get members in voice channels
      const membersInVoice = guild.members.cache.filter(m => m.voice.channel);
      const totalMembersInVoice = membersInVoice.size;

      // Get online members (non-bots)
      const onlineMembers = guild.members.cache.filter(
        m => !m.user.bot && m.presence?.status !== 'offline'
      );
      const totalOnlineMembers = onlineMembers.size;

      // Total members (non-bots)
      const totalMembers = guild.memberCount - guild.members.cache.filter(m => m.user.bot).size;

      const serverName = guild.name;

      // Keep title, transparent look, and your format
      const statsText = 
        `## ${serverName} stats\n` +
        `All members : ${totalMembers.toLocaleString()}\n` +
        `Online members : ${totalOnlineMembers.toLocaleString()}\n` +
        `In voice : ${totalMembersInVoice.toLocaleString()}`;

      const statsDisplay = new TextDisplayBuilder().setContent(statsText);
      const container = new ContainerBuilder().addTextDisplayComponents(statsDisplay);
      return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });

    } catch (error) {
      console.error('Error getting voice stats:', error);
      return sendReply('Failed to get voice statistics. Please try again.', true);
    }
  },
};

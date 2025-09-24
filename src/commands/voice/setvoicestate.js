const { PermissionsBitField, ChannelType, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');

module.exports = {
  name: 'setvoicestate',
  description: 'Sets a voice channel to display the number of members in voice channels.',
  aliases: ['setvoicestats'],
  async execute(message, args, client, db) {
    const sendReply = (desc, isError = false) => {
      const prefix = isError ? '❌' : '✅';
      const text = new TextDisplayBuilder().setContent(`${prefix} ${desc}`);
      const container = new ContainerBuilder().addTextDisplayComponents(text);
      return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    };

    // Check for administrator permissions
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return sendReply('You must be an administrator to use this command.', true);
    }

    const channelId = args[0];
    if (!channelId) {
      return sendReply('Please provide a voice channel ID.', true);
    }

    let channel;
    try {
      channel = await message.guild.channels.fetch(channelId, { force: true });
    } catch (error) {
      return sendReply('I could not find that channel. Please check the ID and my permissions.', true);
    }

    if (!channel || channel.type !== ChannelType.GuildVoice) {
      return sendReply('Please provide a valid voice channel ID.', true);
    }

    const serverId = message.guild.id;

    // Insert or update the database
    db.run('REPLACE INTO voice_state_channels (server_id, channel_id) VALUES (?, ?)', [serverId, channelId], (err) => {
      if (err) {
        console.error('Error saving voice state channel:', err);
        return sendReply('An error occurred while setting the voice state channel.', true);
      }

      // Immediately update the channel name with live data
      const voiceCount = message.guild.members.cache.filter(member => member.voice.channel).size;
      channel.setName(`🔉・Voice: ${voiceCount}`)
        .then(() => {
          sendReply(`Voice state channel has been set to ${channel.name} and updated. It will continue to update every 5 minutes.`);
        })
        .catch(console.error);
    });
  },
};

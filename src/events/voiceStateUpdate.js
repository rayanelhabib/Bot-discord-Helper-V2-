const { ChannelType } = require('discord.js');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState, client, db) {
    // Handle voice state channel updates
    try {
      const guild = newState.guild;
      
      // Check if this guild has a voice state channel configured
      db.get('SELECT channel_id FROM voice_state_channels WHERE server_id = ?', [guild.id], async (err, row) => {
        if (err) {
          console.error('Error checking voice state channel:', err);
          return;
        }

        if (!row || !row.channel_id) return;

        try {
          // Fetch the voice state channel with fresh data
          const voiceStateChannel = await guild.channels.fetch(row.channel_id, { force: true });
          
          if (!voiceStateChannel || voiceStateChannel.type !== ChannelType.GuildVoice) {
            // Channel was deleted or is invalid, clean up database
            db.run('DELETE FROM voice_state_channels WHERE server_id = ?', [guild.id]);
            console.log(`Voice state channel was deleted for server ${guild.name}, cleaned up database.`);
            return;
          }

          // Get live voice count
          const voiceCount = guild.members.cache.filter(member => member.voice.channel).size;
          
          // Update the channel name with live count
          await voiceStateChannel.setName(`🔉・Voice: ${voiceCount}`);
          
        } catch (error) {
          console.error('Error updating voice state channel:', error);
        }
      });
    } catch (error) {
      console.error('Error in voiceStateUpdate event:', error);
    }
  },
}; 
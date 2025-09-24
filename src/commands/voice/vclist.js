const { PermissionsBitField, ChannelType, EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'vclist',
  aliases: ['voicelist', 'vlist', 'voiceclist'],
  description: 'Show list of members connected in a voice channel. Requires View Channels permission.',
  
  async execute(message, args) {
    // Helper to reply with styled messages
    const sendReply = (content, isError = false) => {
      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(isError ? 0xff0000 : 0x00ff00)
            .setDescription(`${isError ? '❌' : '✅'} ${content}`)
        ]
      });
    };

    // Must be in a guild
    if (!message.guild) {
      return sendReply('This command can only be used in a server.', true);
    }

    // Check permission
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.ViewChannel) &&
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
    ) {
      return sendReply('You need **View Channels** permission to use this command.', true);
    }

    let targetChannel;

    // No argument → use user's VC
    if (args.length === 0) {
      if (!message.member.voice.channel) {
        return sendReply('You must be in a voice channel or specify one. Usage: `+vclist [channel]`', true);
      }
      targetChannel = message.member.voice.channel;
    } else {
      const channelId = args[0].replace(/[<#>]/g, '');
      targetChannel = message.guild.channels.cache.get(channelId);

      if (!targetChannel) {
        targetChannel = message.guild.channels.cache.find(
          ch =>
            ch.type === ChannelType.GuildVoice &&
            ch.name.toLowerCase().includes(args[0].toLowerCase())
        );
      }

      if (!targetChannel || targetChannel.type !== ChannelType.GuildVoice) {
        return sendReply('Voice channel not found. Please specify a valid one.', true);
      }
    }

    try {
      // Force refresh the target channel to get live member data
      const freshChannel = await message.guild.channels.fetch(targetChannel.id, { force: true });
      const members = freshChannel.members;
      const memberCount = members.size;

      // If empty
      if (memberCount === 0) {
        return message.reply({
          embeds: [
            new EmbedBuilder()
              .setColor(0xff9900)
              .setTitle('📋 Voice Channel List')
              .setDescription(
                `**📺 Channel:** ${targetChannel.name}\n` +
                `**👥 Members:** 0\n` +
                `**🔴 Status:** Empty channel\n\n` +
                `> This voice channel is currently **empty**.`
              )
          ]
        });
      }

      // Sort members by role position, then username
      const sortedMembers = [...members.values()].sort((a, b) => {
        if (a.roles.highest.position !== b.roles.highest.position) {
          return b.roles.highest.position - a.roles.highest.position;
        }
        return a.user.username.localeCompare(b.user.username);
      });

      let memberList = '';
      let index = 1;

      for (const member of sortedMembers) {
        // Force refresh member data to get live voice state
        const freshMember = await message.guild.members.fetch(member.id, { force: true });
        const vs = freshMember.voice;

        // Status icons
        let status = '🟢';
        if (vs.selfMute && vs.selfDeaf) status = '🔇';
        else if (vs.selfMute) status = '🔇';
        else if (vs.selfDeaf) status = '🔇';
        else if (vs.streaming) status = '📺';
        else if (vs.selfVideo) status = '📹';

        // Role indicator
        let roleIndicator = '';
        if (freshMember.id === message.guild.ownerId) roleIndicator = '👑';
        else if (freshMember.permissions.has(PermissionsBitField.Flags.Administrator)) roleIndicator = '⚡';
        else if (freshMember.permissions.has(PermissionsBitField.Flags.ManageGuild)) roleIndicator = '🛡️';

        // Additional info
        const extra = [];
        if (vs.selfMute && vs.selfDeaf) extra.push('Muted & Deafened');
        else if (vs.selfMute) extra.push('Muted');
        else if (vs.selfDeaf) extra.push('Deafened');
        if (vs.streaming) extra.push('Streaming');
        if (vs.selfVideo) extra.push('Video');

        memberList += `${index}. ${status} ${roleIndicator} **${freshMember.user.username}**` +
          (extra.length ? ` (${extra.join(', ')})` : '') + '\n';
        index++;
      }

      return message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x00aaff)
            .setTitle('📋 Voice Channel List')
            .setDescription(
              `**📺 Channel:** ${targetChannel.name}\n` +
              `**👥 Members:** ${memberCount}\n` +
              `**🟢 Status:** Active\n\n` +
              `## 👥 Member List\n${memberList}\n` +
              `## 📋 Legend\n🟢 Speaking | 🔇 Muted/Deafened | 📺 Streaming | 📹 Video\n` +
              `👑 Owner | ⚡ Admin | 🛡️ Manager`
            )
        ]
      });

    } catch (err) {
      console.error(err);
      return sendReply('Failed to get voice channel list. Please try again.', true);
    }
  }
};

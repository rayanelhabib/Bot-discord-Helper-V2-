const {
  PermissionsBitField,
  ChannelType
} = require('discord.js');
const security = require('../../utils/security');

module.exports = {
  name: 'setlogchannel',
  aliases: ['logchannel', 'securitylogchannel'],
  description: 'Sets the channel where security logs are sent. Usage: +setlogchannel #channel',
  async execute(message, args, client, db) {
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply('❌ You need **Administrator** permission to use this command.');
    }

    if (args.length === 0) {
      return message.reply('❌ Please specify a channel. Usage: `+setlogchannel #channel` or `+setlogchannel <channel_id>`');
    }

    let logChannel = message.mentions.channels.first();
    if (!logChannel) {
        const channelId = args[0];
        if (!/^\d+$/.test(channelId)) {
            return message.reply('❌ Invalid channel ID.');
        }
        try {
            logChannel = await message.guild.channels.fetch(channelId);
        } catch {
            return message.reply('❌ Channel not found.');
        }
    }

    if (!logChannel) {
        return message.reply('❌ Channel not found.');
    }

    if (logChannel.type !== ChannelType.GuildText) {
        return message.reply('❌ Please specify a text channel.');
    }
    
    const me = message.guild.members.me;
    if (!logChannel.permissionsFor(me).has(PermissionsBitField.Flags.SendMessages)) {
        return message.reply('❌ I need permission to send messages in that channel.');
    }

    const guildId = message.guild.id;
    try {
      await security.setSecurityConfig(guildId, { log_channel_id: logChannel.id }, db);
      await message.reply(`✅ Security logs will now be sent to ${logChannel}.`);
    } catch (error) {
      console.error('Error setting log channel (prefix command):', error);
      await message.reply('❌ An error occurred while setting the log channel.');
    }
  },
};

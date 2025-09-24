const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  PermissionsBitField,
  ChannelType
} = require('discord.js');

module.exports = {
  name: 'fmove',
  aliases: ['vmove', 'voicemove'],
  description: 'Move a member to another voice channel. Requires Move Members permission.',
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

    // Check user permissions
    if (
      !message.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
      !message.member.permissions.has(PermissionsBitField.Flags.MoveMembers)
    ) {
      return sendReply('You need **Move Members** permission to use this command.', true);
    }

    if (args.length < 2) {
      return sendReply('Please specify a user and channel. Usage: `+fmove [user] [channel]`', true);
    }

    // Parse target user
    const targetId = args[0].replace(/[<@!>]/g, '');
    let targetMember;
    try {
      targetMember = await message.guild.members.fetch(targetId, { force: true });
    } catch {
      return sendReply('User not found in this server.', true);
    }

    if (!targetMember.voice.channel) {
      return sendReply(`${targetMember.user.tag} is not in a voice channel.`, true);
    }

    // Parse target channel
    const channelId = args[1].replace(/[<#>]/g, '');
    let targetChannel;
    
    try {
      // Try to fetch the channel directly first
      targetChannel = await message.guild.channels.fetch(channelId, { force: true });
    } catch {
      // If direct fetch fails, search by name
      targetChannel = message.guild.channels.cache.find(
        ch => ch.type === ChannelType.GuildVoice && ch.name.toLowerCase() === args[1].toLowerCase()
      ) ||
      message.guild.channels.cache.find(
        ch => ch.type === ChannelType.GuildVoice && ch.name.toLowerCase().includes(args[1].toLowerCase())
      );
      
      // If found in cache, fetch fresh data
      if (targetChannel) {
        targetChannel = await message.guild.channels.fetch(targetChannel.id, { force: true });
      }
    }

    if (!targetChannel || targetChannel.type !== ChannelType.GuildVoice) {
      return sendReply('Voice channel not found. Please specify a valid voice channel.', true);
    }

    if (targetMember.voice.channel.id === targetChannel.id) {
      return sendReply(`${targetMember.user.tag} is already in ${targetChannel.name}.`, true);
    }

    // Role hierarchy check
    if (
      targetMember.roles.highest.position >= message.member.roles.highest.position &&
      message.guild.ownerId !== message.member.id
    ) {
      return sendReply('You cannot move someone with a higher or equal role than yours.', true);
    }

    // Bot permission checks
    if (
      !message.guild.members.me.permissions.has(PermissionsBitField.Flags.MoveMembers) ||
      !targetChannel.permissionsFor(message.guild.members.me).has(PermissionsBitField.Flags.MoveMembers)
    ) {
      return sendReply('I need **Move Members** permission to do this.', true);
    }

    try {
      const originalChannel = targetMember.voice.channel;
      await targetMember.voice.setChannel(targetChannel);

      const successText = new TextDisplayBuilder().setContent(
        `# 🚶 Member Moved\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `**👤 User:** ${targetMember.user.tag} (<@${targetMember.id}>)\n` +
        `**📤 From:** ${originalChannel.name}\n` +
        `**📥 To:** ${targetChannel.name}\n` +
        `**👮 By:** <@${message.author.id}>\n` +
        `**✅ Status:** Successfully moved\n\n` +
        `> User has been **moved** to the new voice channel.\n` +
        `> Voice channel transfer completed successfully.`
      );

      const container = new ContainerBuilder().addTextDisplayComponents(successText);
      return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    } catch (error) {
      console.error('Error moving member:', error);
      return sendReply('Failed to move the member. Check my permissions and try again.', true);
    }
  },
};

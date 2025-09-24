const {
    ContainerBuilder,
    TextDisplayBuilder,
    MediaGalleryBuilder,
    MessageFlags,
    PermissionsBitField
  } = require('discord.js');
  
  module.exports = {
    name: 'ban',
    aliases: [],
    description: 'Ban a user (limit 3 bans per day).',
    async execute(message, args, client, db) {
      const sendReply = (desc, isError = false, isWarning = false) => {
        const prefix = isError ? '❌' : isWarning ? '⚠️' : '✅';
        const text = new TextDisplayBuilder().setContent(`${prefix} ${desc}`);
        const container = new ContainerBuilder().addTextDisplayComponents(text);
        return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
      };
  
      if (!message.guild) {
        return sendReply('This command can only be used in a server.', true);
      }
  
      // Permissions check
      if (
        !message.member.permissions.has(PermissionsBitField.Flags.BanMembers) &&
        !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
      ) {
        return sendReply('You need the **Ban Members** permission or Administrator to use this command.', true);
      }
  
      if (args.length === 0) {
        return sendReply('Please specify a user to ban by mention or ID.', true);
      }
  
      // Resolve target member
      const targetId = args[0].replace(/[<@!>]/g, '');
      let targetMember;
      try {
        targetMember = await message.guild.members.fetch(targetId);
      } catch {
        return sendReply('User not found in this server.', true);
      }
  
      if (!targetMember) {
        return sendReply('User not found in this server.', true);
      }
  
      if (targetMember.id === message.member.id) {
        return sendReply('You cannot ban yourself.', true);
      }
  
      if (targetMember.user.bot) {
        return sendReply('You cannot ban bots.', true);
      }
  
      if (
        message.member.roles.highest.position <= targetMember.roles.highest.position &&
        message.guild.ownerId !== message.member.id
      ) {
        return sendReply('You cannot ban someone with a higher or equal role than yours.', true);
      }
  
      const botMember = message.guild.members.me;
      if (!botMember.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        return sendReply('I need the **Ban Members** permission to ban users.', true);
      }
      if (botMember.roles.highest.position <= targetMember.roles.highest.position) {
        return sendReply('I cannot ban someone with a higher or equal role than mine.', true);
      }
  
            // Check moderation limit
      const limitCheck = await checkModerationLimit(message.guild.id, message.author.id, 'ban', db);
      if (!limitCheck.canProceed) {
        return sendReply(`You have reached your daily ban limit (4/4). You can ban again tomorrow.`, true);
      }
  
      const reason = args.slice(1).join(' ').trim() || 'No reason provided';
  
      const bannerUrl = message.guild.bannerURL({ size: 512, extension: 'png' });
      const fallbackUrl = 'https://cdn.discordapp.com/attachments/1365992242283810870/1401764054959394816/d733b491c5031518eed0e59a49511c9a.gif?ex=68917602&is=68902482&hm=288f604a4761b7f885efa0b8e882157cff67d8cd60d8e2d08884397c6de2e9ad&';
  
      const dmText = new TextDisplayBuilder().setContent(`You have been banned from **${message.guild.name}**.\nReason: ${reason}`);
  
      const mediaGallery = new MediaGalleryBuilder().addItems(item => item.setURL(bannerUrl || fallbackUrl));
  
      const dmContainer = new ContainerBuilder()
        .addTextDisplayComponents(dmText)
        .addMediaGalleryComponents(mediaGallery);
  
      try {
        await targetMember.send({ flags: MessageFlags.IsComponentsV2, components: [dmContainer] });
      } catch (dmErr) {
        console.warn(`Could not DM banned user ${targetMember.user.tag}: ${dmErr.message}`);
      }
  
      try {
        await targetMember.ban({ reason });
        
        // Increment moderation count
        await incrementModerationCount(message.guild.id, message.author.id, 'ban', db);
        
        return sendReply(`Banned **${targetMember.user.tag}** successfully.\nReason: ${reason}\nDaily Limit: ${limitCheck.currentCount + 1}/4 (${limitCheck.remaining - 1} remaining)`);
      } catch (error) {
        console.error('Ban error:', error);
        return sendReply('Failed to ban the user. Check my permissions and role hierarchy.', true);
      }
    },
  };
const {
    ContainerBuilder,
    TextDisplayBuilder,
    MediaGalleryBuilder,
    MessageFlags,
    PermissionsBitField
  } = require('discord.js');
  

  
  module.exports = {
    name: 'kick',
    aliases: [],
    description: 'Kick a user by mention or ID.',
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
  
      if (
        !message.member.permissions.has(PermissionsBitField.Flags.KickMembers) &&
        !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
      ) {
        return sendReply('You need the **Kick Members** permission or Administrator to use this command.', true);
      }
  
      // Check moderation limit
      const limitCheck = await checkModerationLimit(message.guild.id, message.author.id, 'kick', db);
      if (!limitCheck.canProceed) {
        return sendReply(`You have reached your daily kick limit (4/4). You can kick again tomorrow.`, true);
      }
  
      if (args.length === 0) {
        return sendReply('Please mention a user or provide a user ID to kick.', true);
      }
  
      let target =
        message.mentions.members.first() ||
        message.guild.members.cache.get(args[0]) ||
        await message.guild.members.fetch(args[0]).catch(() => null);
  
      if (!target) {
        return sendReply('User not found.', true);
      }
  
      if (target.user.bot) {
        return sendReply('You cannot kick bots.', true);
      }
  
      if (target.roles.highest.position >= message.member.roles.highest.position && message.author.id !== message.guild.ownerId) {
        return sendReply('You cannot kick a member with an equal or higher role than yours.', true);
      }
  
      if (!target.kickable) {
        return sendReply('I cannot kick this user (missing permissions or role hierarchy).', true);
      }
  
      const reason = args.slice(1).join(' ').trim() || 'No reason provided';
  
      const bannerURL = message.guild.bannerURL({ size: 1024, extension: 'png' });
  
      const dmText = new TextDisplayBuilder().setContent(
        `You have been kicked from **${message.guild.name}**.\nReason: ${reason}`
      );
      const dmContainer = new ContainerBuilder().addTextDisplayComponents(dmText);
  
      if (bannerURL) {
        const media = new MediaGalleryBuilder().addItems(item => item.setURL(bannerURL));
        dmContainer.addMediaGalleryComponents(media);
      } else {
        const fallbackURL = 'https://cdn.discordapp.com/attachments/1365992242283810870/1401764054959394816/d733b491c5031518eed0e59a49511c9a.gif';
        const mediaFallback = new MediaGalleryBuilder().addItems(item => item.setURL(fallbackURL));
        dmContainer.addMediaGalleryComponents(mediaFallback);
      }
  
      try {
        await target.send({ flags: MessageFlags.IsComponentsV2, components: [dmContainer] });
      } catch {
        // DM fermé, ignore
      }
  
            try {
        await target.kick(reason);

        // Increment moderation count
        await incrementModerationCount(message.guild.id, message.author.id, 'kick', db);

        return sendReply(`User <@${target.id}> has been kicked. Reason: ${reason}\nDaily Limit: ${limitCheck.currentCount + 1}/4 (${limitCheck.remaining - 1} remaining)`);
      } catch (error) {
        console.error('Kick error:', error);
        return sendReply('Failed to kick the user. Please check my permissions and role hierarchy.', true);
      }
    },
  };
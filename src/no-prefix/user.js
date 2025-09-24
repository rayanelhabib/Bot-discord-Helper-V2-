const {
    ContainerBuilder,
    TextDisplayBuilder,
    MediaGalleryBuilder,
    MessageFlags
  } = require('discord.js');
  
  module.exports = {
    name: 'user',
    aliases: ['userinfo', 'u'],
    description: 'Displays detailed info about a user in this server.',
    async execute(message, args, client) {
      let member;
  
      // Try to fetch member by ID or mention in args, else default to message author
      const userId = args[0]?.match(/\d{17,19}/)?.[0];
      try {
        member = userId
          ? await message.guild.members.fetch(userId)
          : message.member;
      } catch {
        member = message.member;
      }
  
      const user = member.user;
  
      // Format join date or fallback text
      const joinedAt = member.joinedAt
        ? member.joinedAt.toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })
        : 'Unknown';
  
      // Highest role mention (exclude @everyone)
      const highestRole = member.roles.highest.id !== message.guild.id
        ? member.roles.highest.name
        : 'No Roles';
  
      // Display name fallback
      const displayName = member.displayName || user.username;
  
      // Server banner or fallback gif
      const serverBannerURL = message.guild.bannerURL({ dynamic: true, size: 4096 }) 
        || 'https://cdn.discordapp.com/attachments/1371996635449790530/1402394995088031844/standard.gif?ex=6893c19e&is=6892701e&hm=047a227623a43c683a2442fe53370d22f415bb9444f123bf0d11a467782bdc9e';
  
      // Text display with arrows for a clean structure
      const infoText = new TextDisplayBuilder().setContent(
        `User Information:\n\n` +
        `Name        → <@${user.id}> (${user.tag})\n` +
        `Display Name→ ${displayName}\n` +
        `Highest Role→ ${highestRole}\n` +
        `Joined Server→ ${joinedAt}`
      );
  
      // Media gallery with server banner/fallback
      const mediaGallery = new MediaGalleryBuilder().addItems(
        media => media.setURL(serverBannerURL)
      );
  
      // Container with text + media gallery
      const container = new ContainerBuilder()
        .addTextDisplayComponents(infoText)
        .addMediaGalleryComponents(mediaGallery);
  
      // Send container message with V2 components flag
      await message.channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
    }
  };

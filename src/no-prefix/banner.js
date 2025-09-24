const {
    ContainerBuilder,
    TextDisplayBuilder,
    MediaGalleryBuilder,
    MessageFlags
  } = require('discord.js');
  
  module.exports = {
    name: 'banner',
    aliases: ['b'],
    description: 'Displays a user\'s banner in V2 container format.',
    async execute(message, args, client) {
      let user;
  
      // Try to fetch user by mention or ID in message content
      const userId = message.content.match(/\d{17,19}/);
      if (userId) {
        try {
          user = await client.users.fetch(userId[0]);
        } catch (error) {
          console.error("Failed to fetch user by ID:", error);
          user = message.author;
        }
      } else {
        user = message.author;
      }
  
      // Fetch user to get banner (user object from cache may not have banner info)
      try {
        user = await client.users.fetch(user.id, { force: true });
      } catch (error) {
        console.error("Failed to fetch full user info:", error);
        // fallback to previous user if error
      }
  
      // Get banner URL or fallback
      const bannerUrl = user.banner
        ? user.bannerURL({ dynamic: true, size: 4096 })
        : null;
  
      if (!bannerUrl) {
        return message.channel.send(`${user.tag} does not have a banner set.`);
      }
  
      const titleText = new TextDisplayBuilder()
        .setContent(`Banner of <@${user.id}>`);
  
      const mediaGallery = new MediaGalleryBuilder().addItems(
        media => media.setURL(bannerUrl)
      );
  
      const container = new ContainerBuilder()
        .addTextDisplayComponents(titleText)
        .addMediaGalleryComponents(mediaGallery);
  
      await message.channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });
    }
  };
  
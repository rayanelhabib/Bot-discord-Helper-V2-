const {
    ContainerBuilder,
    TextDisplayBuilder,
    MediaGalleryBuilder,
    MessageFlags
  } = require('discord.js');
  
  module.exports = {
    name: 'avatar',
    aliases: ['a'],
    description: 'Displays a user\'s avatar in V2 container format.',
    async execute(message, args, client) {
      let user;
  
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
  
      const avatarUrl = user.displayAvatarURL({ dynamic: true, size: 4096 });
  
      const titleText = new TextDisplayBuilder()
        .setContent(`Avatar of <@${user.id}>`);
  
      const mediaGallery = new MediaGalleryBuilder().addItems(
        media => media.setURL(avatarUrl)
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
  
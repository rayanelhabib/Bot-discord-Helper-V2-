const { ContainerBuilder, TextDisplayBuilder, MediaGalleryBuilder, MessageFlags } = require('discord.js');

module.exports = {
  name: 'seeverifembed',
  description: 'Send the saved verification embed',
  async execute(message, args, db) {
    const guildId = message.guild.id;

        const sendError = (desc) => {
      const text = new TextDisplayBuilder().setContent(`❌ ${desc}`);
      const container = new ContainerBuilder().addTextDisplayComponents(text);
      return message.channel.send({ flags: MessageFlags.IsComponentsV2, components: [container] });
    };

    db.get(`SELECT verifembed FROM verification_settings WHERE server_id = ?`, [guildId], (err, row) => {
      if (err) {
        console.error(err);
        return sendError('A database error occurred.');
      }

      if (!row || !row.verifembed) {
        return sendError('No verification embed is set for this server.');
      }

      let savedData;
      try {
        savedData = JSON.parse(row.verifembed);
      } catch {
        return sendError('The stored embed data is invalid JSON.');
      }

      if (!savedData.embeds || !Array.isArray(savedData.embeds) || savedData.embeds.length === 0) {
        return sendError('No valid embed data found in the saved settings.');
      }

      try {
        // Take the first embed object from the saved data
        const embedData = savedData.embeds[0];
        const container = new ContainerBuilder();
        const textComponents = [];

        if (embedData.title) {
          textComponents.push(new TextDisplayBuilder().setContent(`## ${embedData.title}`));
        }
        if (embedData.description) {
          textComponents.push(new TextDisplayBuilder().setContent(embedData.description));
        }
        if (embedData.fields && Array.isArray(embedData.fields)) {
          const fieldsText = embedData.fields.map(field => `**${field.name}**\n${field.value}`).join('\n\n');
          if (fieldsText) {
            textComponents.push(new TextDisplayBuilder().setContent(fieldsText));
          }
        }
        if (embedData.footer && embedData.footer.text) {
          textComponents.push(new TextDisplayBuilder().setContent(`> ${embedData.footer.text}`));
        }

        if (textComponents.length > 0) {
          container.addTextDisplayComponents(...textComponents);
        }

        const mediaItems = [];
        if (embedData.thumbnail && embedData.thumbnail.url) {
          mediaItems.push(new MediaGalleryItemBuilder().setURL(embedData.thumbnail.url));
        }
        if (embedData.image && embedData.image.url) {
          mediaItems.push(new MediaGalleryItemBuilder().setURL(embedData.image.url));
        }

        if (mediaItems.length > 0) {
          const mediaGallery = new MediaGalleryBuilder().addItems(...mediaItems);
          container.addMediaGalleryComponents(mediaGallery);
        }

        message.channel.send({ 
          flags: MessageFlags.IsComponentsV2, 
          components: [container]
        });

      } catch (error) {
        console.error('Failed to construct container from stored data:', error);
        sendError('Failed to build the message from the stored data.');
      }
    });
  },
};

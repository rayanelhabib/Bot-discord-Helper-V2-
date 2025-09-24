const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  PermissionsBitField
} = require('discord.js');

module.exports = {
  name: 'addemojie',
  aliases: ['ae', 'emojiadd'],
  description: 'Add an emoji to the server. Requires Admin or Manage Emojis permission.',
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

    // Check permissions
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
        !message.member.permissions.has(PermissionsBitField.Flags.ManageGuildExpressions)) {
      return sendReply('You need **Administrator** or **Manage Emojis and Stickers** permission to use this command.', true);
    }

    // Check bot permissions
    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageGuildExpressions)) {
      return sendReply('I need the **Manage Emojis and Stickers** permission to add emojis.', true);
    }

    if (args.length < 2) {
      return sendReply('Please provide both emoji and name. Usage: `+addemojie [emoji] [name]`', true);
    }

    const emojiInput = args[0];
    const emojiName = args[1].toLowerCase();

    // Validate emoji name (only letters, numbers, and underscores)
    if (!/^[a-zA-Z0-9_]+$/.test(emojiName)) {
      return sendReply('Emoji name can only contain letters, numbers, and underscores.', true);
    }

    // Check if emoji name is too long
    if (emojiName.length > 32) {
      return sendReply('Emoji name cannot be longer than 32 characters.', true);
    }

    try {
      let emojiUrl;
      let isCustomEmoji = false;

      // Check if it's a custom emoji
      const customEmojiMatch = emojiInput.match(/<a?:(\w+):(\d+)>/);
      if (customEmojiMatch) {
        isCustomEmoji = true;
        const animated = emojiInput.startsWith('<a:');
        const emojiId = customEmojiMatch[2];
        emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${animated ? 'gif' : 'png'}`;
      } else {
        // Check if it's a Unicode emoji
        const unicodeEmojiMatch = emojiInput.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u);
        if (!unicodeEmojiMatch) {
          return sendReply('Please provide a valid emoji (custom Discord emoji or Unicode emoji).', true);
        }
        return sendReply('Unicode emojis cannot be added as custom server emojis. Please use a custom Discord emoji.', true);
      }

      // Check if emoji name already exists
      const existingEmoji = message.guild.emojis.cache.find(emoji => emoji.name === emojiName);
      if (existingEmoji) {
        return sendReply(`An emoji with the name \`${emojiName}\` already exists.`, true);
      }

      // Check server emoji limit
      const emojiCount = message.guild.emojis.cache.size;
      const maxEmojis = message.guild.premiumTier === 0 ? 25 : 
                       message.guild.premiumTier === 1 ? 50 : 
                       message.guild.premiumTier === 2 ? 100 : 200;

      if (emojiCount >= maxEmojis) {
        return sendReply(`Server has reached the maximum emoji limit (${maxEmojis}).`, true);
      }

      // Fetch the emoji image
      const response = await fetch(emojiUrl);
      if (!response.ok) {
        return sendReply('Failed to fetch emoji image. Please try again.', true);
      }

      const buffer = await response.arrayBuffer();

      // Add the emoji to the server
      const newEmoji = await message.guild.emojis.create({
        attachment: Buffer.from(buffer),
        name: emojiName
      });

      const successText = new TextDisplayBuilder().setContent(
        `✅ **Emoji Added Successfully**\n\n` +
        `**Emoji:** ${newEmoji}\n` +
        `**Name:** \`${emojiName}\`\n` +
        `**Server:** ${message.guild.name}\n` +
        `**By:** <@${message.author.id}>\n` +
        `**Usage:** \`:${emojiName}:\``
      );

      const container = new ContainerBuilder().addTextDisplayComponents(successText);
      return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });

    } catch (error) {
      console.error('Error adding emoji:', error);
      
      if (error.code === 50035) {
        return sendReply('Emoji file is too large. Discord emojis must be under 256KB.', true);
      } else if (error.code === 50013) {
        return sendReply('I don\'t have permission to add emojis to this server.', true);
      } else {
        return sendReply('Failed to add emoji. Please check the emoji URL and try again.', true);
      }
    }
  },
}; 
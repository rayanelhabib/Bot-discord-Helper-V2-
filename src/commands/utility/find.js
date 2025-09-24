const {
  ContainerBuilder,
  TextDisplayBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
  MessageFlags,
  PermissionsBitField
} = require('discord.js');

module.exports = {
  name: 'find',
  aliases: [],
  description: 'Find a user by ID or tag and show their voice channel information.',
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

    if (args.length === 0) {
      return sendReply('Please provide a user ID or mention a user to find.', true);
    }

    // Find the target user
    let target = null;
    
    // Check if it's a mention
    if (message.mentions.members.size > 0) {
      target = message.mentions.members.first();
    } else {
      // Try to find by ID or username
      const searchTerm = args[0];
      
      // First try to get by ID
      target = message.guild.members.cache.get(searchTerm);
      
      // If not found by ID, try to fetch from Discord
      if (!target) {
        try {
          target = await message.guild.members.fetch(searchTerm);
        } catch (error) {
          // If fetch fails, search by username/tag
          target = message.guild.members.cache.find(member => 
            member.user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.user.globalName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            member.displayName.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
      }
    }

    if (!target) {
      return sendReply('User not found. Please provide a valid user ID, mention, or username.', true);
    }

    // Get voice channel information
    const voiceChannel = target.voice.channel;
    
    if (!voiceChannel) {
      const notInVoiceText = new TextDisplayBuilder().setContent(
        `# don't found in any voice`
      );
      
      const container = new ContainerBuilder().addTextDisplayComponents(notInVoiceText);
      return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    }

    // Create voice channel button
    const voiceButton = new ButtonBuilder()
      .setLabel('Join Voice Channel')
      .setStyle(ButtonStyle.Link)
      .setURL(`https://discord.com/channels/${message.guild.id}/${voiceChannel.id}`);

    const buttonRow = new ActionRowBuilder().addComponents(voiceButton);

    // Create user information display
    const userInfoText = new TextDisplayBuilder().setContent(
      `**Nickname:** ${target.displayName}\n` +
      `**Voice Channel:** <#${voiceChannel.id}> (${voiceChannel.name})\n` +
      `**Connected Users:** ${voiceChannel.members.size}/${voiceChannel.userLimit || '∞'}`
    );

    const container = new ContainerBuilder()
      .addTextDisplayComponents(userInfoText)
      .addActionRowComponents(buttonRow);

    return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
  },
};

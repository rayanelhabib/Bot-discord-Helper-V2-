const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  PermissionsBitField
} = require('discord.js');

module.exports = {
  name: 'hide',
  aliases: ['hidechannel', 'lockdown'],
  description: 'Hide the current channel from everyone. Requires Admin or Manage Channels permission.',
  async execute(message, args, client, db) {
    console.log('Hide command executed by:', message.author.tag);
    
    const sendReply = (desc, isError = false, isWarning = false) => {
      const prefix = isError ? '❌' : isWarning ? '⚠️' : '✅';
      const text = new TextDisplayBuilder().setContent(`${prefix} ${desc}`);
      const container = new ContainerBuilder().addTextDisplayComponents(text);
      return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    };

    if (!message.guild) {
      return sendReply('This command can only be used in a server.', true);
    }

    // Check if user has required permissions
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
        !message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return sendReply('You need **Administrator** or **Manage Channels** permission to use this command.', true);
    }

    // Check if bot has required permissions
    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return sendReply('I need **Manage Channels** permission to modify channel permissions.', true);
    }

    try {
      const channel = message.channel;

      // Get the @everyone role
      const everyoneRole = message.guild.roles.everyone;

      // Hide channel from @everyone role
      await channel.permissionOverwrites.create(everyoneRole, {
        ViewChannel: false,
        Connect: false,
        SendMessages: false,
        Speak: false
      });

      // Create success message
      const successText = new TextDisplayBuilder().setContent(
        `✅ **Channel Hidden Successfully**\n\n` +
        `**Channel:** <#${channel.id}>\n` +
        `**Action:** Hidden from everyone\n` +
        `**Permissions Removed:**\n` +
        `• View Channel\n` +
        `• Connect\n` +
        `• Send Messages\n` +
        `• Speak\n` +
        `**By:** <@${message.author.id}>`
      );

      const container = new ContainerBuilder().addTextDisplayComponents(successText);

      return message.channel.send({ flags: MessageFlags.IsComponentsV2, components: [container] });

    } catch (error) {
      console.error('Error hiding channel:', error);
      return sendReply('Failed to hide channel. Please check my permissions and role hierarchy.', true);
    }
  },
}; 
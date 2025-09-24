const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  PermissionsBitField
} = require('discord.js');

module.exports = {
  name: 'show',
  aliases: ['showchannel', 'unlock'],
  description: 'Show the current channel to everyone. Requires Admin or Manage Channels permission.',
  async execute(message, args, client, db) {
    console.log('Show command executed by:', message.author.tag);
    
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

      // Show channel to @everyone role
      await channel.permissionOverwrites.create(everyoneRole, {
        ViewChannel: true,
        Connect: true,
        SendMessages: true,
        Speak: true
      });

      // Create success message
      const successText = new TextDisplayBuilder().setContent(
        `✅ **Channel Shown Successfully**\n\n` +
        `**Channel:** <#${channel.id}>\n` +
        `**Action:** Shown to everyone\n` +
        `**Permissions Added:**\n` +
        `• View Channel\n` +
        `• Connect\n` +
        `• Send Messages\n` +
        `• Speak\n` +
        `**By:** <@${message.author.id}>`
      );

      const container = new ContainerBuilder().addTextDisplayComponents(successText);

      return message.channel.send({ flags: MessageFlags.IsComponentsV2, components: [container] });

    } catch (error) {
      console.error('Error showing channel:', error);
      return sendReply('Failed to show channel. Please check my permissions and role hierarchy.', true);
    }
  },
}; 
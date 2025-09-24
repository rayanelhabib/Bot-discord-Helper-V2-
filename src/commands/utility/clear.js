const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  PermissionsBitField
} = require('discord.js');

module.exports = {
  name: 'clear',
  aliases: ['purge', 'delete'],
  description: 'Delete messages and show deletion count. Requires Admin or Manage Messages permission.',
  async execute(message, args, client, db) {
    const sendReply = (desc, isError = false) => {
      const prefix = isError ? '❌' : '✅';
      const text = new TextDisplayBuilder().setContent(`${prefix} ${desc}`);
      const container = new ContainerBuilder().addTextDisplayComponents(text);
      return message.channel.send({ flags: MessageFlags.IsComponentsV2, components: [container] });
    };

    // Check if user has required permissions
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
        !message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return sendReply('You need **Administrator** or **Manage Messages** permission to use this command.', true);
    }

    // Check if bot has required permissions
    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return sendReply('I need **Manage Messages** permission to delete messages.', true);
    }

    // Parse the number of messages to delete
    const deleteCount = parseInt(args[0]);
    
    if (!deleteCount || deleteCount < 1 || deleteCount > 100) {
      return sendReply('Please provide a valid number between 1 and 100.', true);
    }

    try {
      // Fetch messages to delete (including the command message)
      const messages = await message.channel.messages.fetch({ limit: deleteCount + 1 });
      const messagesToDelete = messages.first(deleteCount + 1);
      
      if (messagesToDelete.length === 0) {
        return sendReply('No messages found to delete.', true);
      }

      // Delete the messages
      await message.channel.bulkDelete(messagesToDelete, true);

      // Create container showing deletion count
      const deleteInfoText = new TextDisplayBuilder().setContent(
        `🗑️ **Messages Deleted**\n\n` +
        `**Deleted:** ${messagesToDelete.length} messages\n` +
        `**Channel:** <#${message.channel.id}>\n` +
        `**By:** <@${message.author.id}>`
      );

      const container = new ContainerBuilder().addTextDisplayComponents(deleteInfoText);

      // Send the container and delete it after 3 seconds
      const sentMessage = await message.channel.send({
        flags: MessageFlags.IsComponentsV2,
        components: [container]
      });

      // Delete the container message after 3 seconds
      setTimeout(async () => {
        try {
          await sentMessage.delete();
        } catch (error) {
          // Ignore if message is already deleted
        }
      }, 3000);

    } catch (error) {
      console.error('Error deleting messages:', error);
      return sendReply('Failed to delete messages. Make sure the messages are not older than 14 days.', true);
    }
  },
}; 
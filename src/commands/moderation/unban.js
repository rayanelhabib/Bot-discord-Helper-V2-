const {
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
    PermissionsBitField
  } = require('discord.js');
  
  module.exports = {
    name: 'unban',
    aliases: [],
    description: 'Unban a user by ID.',
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
  
      // Permissions check
      if (
        !message.member.permissions.has(PermissionsBitField.Flags.BanMembers) &&
        !message.member.permissions.has(PermissionsBitField.Flags.Administrator)
      ) {
        return sendReply('You need the **Ban Members** permission or Administrator to use this command.', true);
      }
  
      if (args.length === 0) {
        return sendReply('Please provide the ID of the user to unban.', true);
      }
  
      const userId = args[0].replace(/[<@!>]/g, '');
  
      try {
        const banList = await message.guild.bans.fetch();
  
        if (!banList.has(userId)) {
          return sendReply('This user is not banned.', true);
        }
  
        await message.guild.bans.remove(userId);
  
        return sendReply(`Successfully unbanned user with ID \`${userId}\`.`);
      } catch (error) {
        console.error('Unban error:', error);
        return sendReply('Failed to unban the user. Please check the ID and my permissions.', true);
      }
    },
  };
  
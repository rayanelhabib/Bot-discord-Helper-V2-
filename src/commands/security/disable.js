const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  PermissionsBitField
} = require('discord.js');

module.exports = {
  name: 'disable',
  aliases: ['dis'],
  description: 'Disable a command in this server. Requires Admin and higher role than bot.',
  async execute(message, args, client, db) {
    const sendReply = (desc, isError = false) => {
      const prefix = isError ? '✗' : '✓';
      const text = new TextDisplayBuilder().setContent(`${prefix} ${desc}`);
      const container = new ContainerBuilder().addTextDisplayComponents(text);
      return message.channel.send({ flags: MessageFlags.IsComponentsV2, components: [container] });
    };

    if (!message.guild) {
      return sendReply('This command can only be used in a server.', true);
    }

    // Check if user has required permissions
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return sendReply('You need **Administrator** permission to use this command.', true);
    }

    // Check if user has higher role than bot
    if (message.member.roles.highest.position <= message.guild.members.me.roles.highest.position) {
      return sendReply('You need a higher role than the bot to use this command.', true);
    }

    if (args.length === 0) {
      return sendReply('Please specify a command to disable. Usage: `+disable [command]`', true);
    }

    const commandName = args[0].toLowerCase();

    try {
      // Check if command exists (including aliases)
      let command = client.commands.get(commandName);
      
      // If not found by direct name, search through all commands for aliases
      if (!command) {
        for (const [cmdName, cmd] of client.commands) {
          if (cmd.aliases && cmd.aliases.includes(commandName)) {
            command = cmd;
            break;
          }
        }
      }
      
      if (!command) {
        return sendReply(`Command \`${commandName}\` not found.`, true);
      }

      // Prevent disabling enable/disable commands
      if (commandName === 'enable' || commandName === 'disable') {
        return sendReply('You cannot disable the enable/disable commands.', true);
      }

      // Get the actual command name (not the alias)
      const actualCommandName = command.name;

      // Check if command is already disabled
      db.get(
        'SELECT * FROM disabled_commands WHERE guild_id = ? AND command_name = ?',
        [message.guild.id, actualCommandName],
        (err, existing) => {
          if (err) {
            console.error('Error checking command status:', err);
            return sendReply('Failed to check command status.', true);
          }

          if (existing) {
            return sendReply(`Command \`${actualCommandName}\` is already disabled.`);
          }

          // Add to disabled commands
          db.run(
            'INSERT INTO disabled_commands (guild_id, command_name, disabled_by, disabled_at) VALUES (?, ?, ?, datetime("now"))',
            [message.guild.id, actualCommandName, message.author.id],
            (insertErr) => {
              if (insertErr) {
                console.error('Error disabling command:', insertErr);
                return sendReply('Failed to disable command.', true);
              }

              const successText = new TextDisplayBuilder().setContent(
                `✓ **Command Disabled Successfully**\n\n` +
                `**Command:** \`${actualCommandName}\`\n` +
                `**Server:** ${message.guild.name}\n` +
                `**By:** <@${message.author.id}>`
              );

              const container = new ContainerBuilder().addTextDisplayComponents(successText);
              return message.channel.send({ flags: MessageFlags.IsComponentsV2, components: [container] });
            }
          );
        }
      );

    } catch (error) {
      console.error('Error disabling command:', error);
      return sendReply('Failed to disable command. Please try again.', true);
    }
  },
}; 
const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  PermissionsBitField
} = require('discord.js');

module.exports = {
  name: 'autorole',
  aliases: ['ar'],
  description: 'Set, show, or turn off autorole. Requires Manage Roles permission.',
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
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageRoles) &&
        !message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return sendReply('You need **Manage Roles** or **Administrator** permission to use this command.', true);
    }

    // Check bot permissions
    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
      return sendReply('I need the **Manage Roles** permission to manage autorole.', true);
    }

    // Handle different subcommands
    if (args.length === 0) {
      return sendReply('Please specify an action. Usage: `+autorole [role]` or `+autorole off` or `+autorole show`', true);
    }

    const subcommand = args[0].toLowerCase();

    // Show current autorole configuration
    if (subcommand === 'show') {
      db.get('SELECT autorole_id FROM autorole_settings WHERE server_id = ?', [message.guild.id], (err, row) => {
        if (err) {
          console.error('Error fetching autorole:', err);
          return sendReply('Failed to fetch autorole configuration.', true);
        }

        if (!row || !row.autorole_id) {
          return sendReply('No autorole is currently set for this server.');
        }

        const role = message.guild.roles.cache.get(row.autorole_id);
        if (!role) {
          // Role was deleted, clean up database
          db.run('DELETE FROM autorole_settings WHERE server_id = ?', [message.guild.id]);
          return sendReply('Autorole was set but the role no longer exists. Autorole has been disabled.');
        }

        const statusText = new TextDisplayBuilder().setContent(
          `📋 **Autorole Configuration**\n\n` +
          `**Server:** ${message.guild.name}\n` +
          `**Role:** ${role} (\`${role.name}\`)\n` +
          `**Role ID:** \`${role.id}\`\n` +
          `**Status:** ✅ Active\n\n` +
          `**Commands:**\n` +
          `• \`+autorole off\` - Disable autorole\n` +
          `• \`+autorole [role]\` - Set new autorole`
        );

        const container = new ContainerBuilder().addTextDisplayComponents(statusText);
        return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
      });
      return;
    }

    // Turn off autorole
    if (subcommand === 'off') {
      db.run('DELETE FROM autorole_settings WHERE server_id = ?', [message.guild.id], (err) => {
        if (err) {
          console.error('Error disabling autorole:', err);
          return sendReply('Failed to disable autorole.', true);
        }

        const successText = new TextDisplayBuilder().setContent(
          `✅ **Autorole Disabled**\n\n` +
          `**Server:** ${message.guild.name}\n` +
          `**By:** <@${message.author.id}>\n\n` +
          `New members will no longer automatically receive a role.`
        );

        const container = new ContainerBuilder().addTextDisplayComponents(successText);
        return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
      });
      return;
    }

    // Set autorole
    let roleId;
    let role;

    // Check if it's a role mention
    const roleMention = args[0].match(/<@&(\d+)>/);
    if (roleMention) {
      roleId = roleMention[1];
    } else {
      // Check if it's a role ID
      if (/^\d+$/.test(args[0])) {
        roleId = args[0];
      } else {
        // Try to find role by name
        const roleName = args.join(' ');
        role = message.guild.roles.cache.find(r => r.name.toLowerCase() === roleName.toLowerCase());
        if (!role) {
          return sendReply('Role not found. Please provide a valid role mention, ID, or name.', true);
        }
        roleId = role.id;
      }
    }

    // Get the role object
    if (!role) {
      role = message.guild.roles.cache.get(roleId);
    }

    if (!role) {
      return sendReply('Role not found. Please provide a valid role mention, ID, or name.', true);
    }

    // Check if bot can manage this role
    if (role.position >= message.guild.members.me.roles.highest.position) {
      return sendReply('I cannot assign this role because it is higher than or equal to my highest role.', true);
    }

    // Check if user can manage this role
    if (role.position >= message.member.roles.highest.position && message.guild.ownerId !== message.member.id) {
      return sendReply('You cannot assign this role because it is higher than or equal to your highest role.', true);
    }

    // Check if role has dangerous permissions
    if (role.permissions.has(PermissionsBitField.Flags.Administrator) ||
        role.permissions.has(PermissionsBitField.Flags.ManageGuild) ||
        role.permissions.has(PermissionsBitField.Flags.ManageRoles) ||
        role.permissions.has(PermissionsBitField.Flags.ManageChannels) ||
        role.permissions.has(PermissionsBitField.Flags.ManageWebhooks) ||
        role.permissions.has(PermissionsBitField.Flags.ManageGuildExpressions) ||
        role.permissions.has(PermissionsBitField.Flags.BanMembers) ||
        role.permissions.has(PermissionsBitField.Flags.KickMembers)) {
      return sendReply('Cannot set autorole for roles with administrative or management permissions for security reasons.', true);
    }

    // Check if user has higher role than bot
    if (message.member.roles.highest.position <= message.guild.members.me.roles.highest.position && message.guild.ownerId !== message.member.id) {
      return sendReply('You need a higher role than the bot to set autorole.', true);
    }

    // Save to database
    db.run('INSERT OR REPLACE INTO autorole_settings (server_id, autorole_id) VALUES (?, ?)', 
      [message.guild.id, role.id], (err) => {
        if (err) {
          console.error('Error setting autorole:', err);
          return sendReply('Failed to set autorole.', true);
        }

        const successText = new TextDisplayBuilder().setContent(
          `✅ **Autorole Set Successfully**\n\n` +
          `**Server:** ${message.guild.name}\n` +
          `**Role:** ${role} (\`${role.name}\`)\n` +
          `**Role ID:** \`${role.id}\`\n` +
          `**By:** <@${message.author.id}>\n\n` +
          `New members will now automatically receive the ${role} role when they join.\n\n` +
          `**Commands:**\n` +
          `• \`+autorole off\` - Disable autorole\n` +
          `• \`+autorole show\` - Show current configuration`
        );

        const container = new ContainerBuilder().addTextDisplayComponents(successText);
        return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
      });
  },
}; 
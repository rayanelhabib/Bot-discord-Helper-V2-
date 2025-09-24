const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  PermissionsBitField
} = require('discord.js');

module.exports = {
  name: 'add',
  aliases: ['addperm', 'giveperm'],
  description: 'Give permissions to a user or role in the current channel. Requires Admin or Manage Channels permission.',
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

    // Check if user has required permissions
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
        !message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return sendReply('You need **Administrator** or **Manage Channels** permission to use this command.', true);
    }

    // Check if bot has required permissions
    if (!message.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return sendReply('I need **Manage Channels** permission to modify channel permissions.', true);
    }

    if (args.length === 0) {
      return sendReply('Please provide a user ID, mention, or role ID to add permissions for.', true);
    }

    let target = null;
    let targetType = '';

    // Try to find the target (user or role)
    const targetId = args[0].replace(/[<@!&#>]/g, ''); // Remove mention formatting

    // First try to find as a role
    const role = message.guild.roles.cache.get(targetId);
    if (role) {
      target = role;
      targetType = 'role';
    } else {
      // Try to find as a user/member
      try {
        const member = message.mentions.members.first() || 
                      message.guild.members.cache.get(targetId) ||
                      await message.guild.members.fetch(targetId);
        
        if (member) {
          target = member;
          targetType = 'user';
        }
      } catch (error) {
        // User not found, continue to error message
      }
    }

    if (!target) {
      return sendReply('User or role not found. Please provide a valid user ID, mention, or role ID.', true);
    }

    // Check if target is manageable (for roles)
    if (targetType === 'role' && !target.editable) {
      return sendReply('I cannot modify this role. It may be higher than my highest role or managed by an integration.', true);
    }

    // Check role hierarchy for users
    if (targetType === 'user' && target.roles.highest.position >= message.member.roles.highest.position && 
        message.author.id !== message.guild.ownerId) {
      return sendReply('You cannot modify permissions for a member with an equal or higher role than yours.', true);
    }

    try {
      // Define the permissions to add
      const permissionsToAdd = [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.Connect,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.Speak
      ];

      // Get current channel permissions
      const channel = message.channel;
      const currentPerms = channel.permissionOverwrites.cache.get(target.id);

      // Create new permission overwrite
      const newPerms = new PermissionsBitField();
      permissionsToAdd.forEach(perm => newPerms.add(perm));

      // Add the permissions
      await channel.permissionOverwrites.create(target, {
        ViewChannel: true,
        Connect: true,
        SendMessages: true,
        Speak: true
      });

      // Create success message
      const targetName = targetType === 'user' ? target.user.tag : target.name;
      const targetDisplay = targetType === 'user' ? `<@${target.id}>` : target.name;
      
      const successText = new TextDisplayBuilder().setContent(
        `✅ **Permissions Added Successfully**\n\n` +
        `**Target:** ${targetDisplay} (${targetName})\n` +
        `**Channel:** <#${channel.id}>\n` +
        `**Permissions Added:**\n` +
        `• View Channel\n` +
        `• Connect\n` +
        `• Send Messages\n` +
        `• Speak\n` +
        `**By:** <@${message.author.id}>`
      );

      const container = new ContainerBuilder().addTextDisplayComponents(successText);

      return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });

    } catch (error) {
      console.error('Error adding permissions:', error);
      return sendReply('Failed to add permissions. Please check my permissions and role hierarchy.', true);
    }
  },
}; 
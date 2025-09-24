const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  PermissionsBitField
} = require('discord.js');

module.exports = {
  name: 'list',
  aliases: ['ls'],
  description: 'List admins, bots, or roles. Usage: +list [admins/bots/roles]',
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
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator) &&
        !message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return sendReply('You need **Administrator** or **Manage Server** permission to use this command.', true);
    }

    if (args.length === 0) {
      return sendReply('Please specify what to list: `+list admins`, `+list bots`, `+list users`, or `+list roles`', true);
    }

    const listType = args[0].toLowerCase();

    try {
      switch (listType) {
        case 'admins':
          await listAdmins(message, sendReply);
          break;
        case 'bots':
          await listBots(message, sendReply);
          break;
        case 'users':
          await listUsers(message, sendReply);
          break;
        case 'roles':
          await listRoles(message, sendReply);
          break;
        default:
          return sendReply('Invalid option. Use: `+list admins`, `+list bots`, `+list users`, or `+list roles`', true);
      }
    } catch (error) {
      console.error('Error in list command:', error);
      return sendReply('An error occurred while processing the list.', true);
    }
  },
};

async function listAdmins(message, sendReply) {
  // Fetch all members to ensure we have the latest data
  try {
    await message.guild.members.fetch();
  } catch (error) {
    console.error('Error fetching members:', error);
  }

  // Get all members with admin permissions
  const admins = message.guild.members.cache.filter(member => 
    member.permissions.has(PermissionsBitField.Flags.Administrator) && !member.user.bot
  );

  if (admins.size === 0) {
    return sendReply('No administrators found in this server.', true);
  }

  const adminList = admins.map(member => 
    `◦ **${member.user.tag}**\n   └ ID: \`${member.id}\``
  );

  await sendPaginatedList(message, adminList, '# Server Administrators', sendReply);
}

async function listBots(message, sendReply) {
  // Fetch all members to ensure we have the latest data
  try {
    await message.guild.members.fetch();
  } catch (error) {
    console.error('Error fetching members:', error);
  }

  // Get all bot members
  const bots = message.guild.members.cache.filter(member => member.user.bot);

  if (bots.size === 0) {
    return sendReply('No bots found in this server.', true);
  }

  const botList = bots.map(bot => 
    `◦ **${bot.user.tag}**\n   └ ID: \`${bot.id}\``
  );

  await sendPaginatedList(message, botList, '# Bots', sendReply);
}

async function listUsers(message, sendReply) {
  // Fetch all members to ensure we have the latest data
  try {
    await message.guild.members.fetch();
  } catch (error) {
    console.error('Error fetching members:', error);
  }

  // Get all human members (excluding bots)
  const users = message.guild.members.cache.filter(member => !member.user.bot);

  if (users.size === 0) {
    return sendReply('No users found in this server.', true);
  }

  const userList = users.map(user => 
    `◦ **${user.user.tag}**\n   └ ID: \`${user.id}\``
  );

  await sendPaginatedList(message, userList, '# Users', sendReply);
}

async function listRoles(message, sendReply) {
  // Get all roles (excluding @everyone) and sort by position (highest first)
  const roles = message.guild.roles.cache
    .filter(role => role.id !== message.guild.id)
    .sort((a, b) => b.position - a.position);

  if (roles.size === 0) {
    return sendReply('No roles found in this server.', true);
  }

  const roleList = roles.map(role => 
    `◦ **${role.name}** (${role.members.size} members) - Priority: ${role.position}\n   └ ID: \`${role.id}\``
  );

  await sendPaginatedList(message, roleList, '# Roles', sendReply);
}

async function sendPaginatedList(message, items, title, sendReply) {
  const itemsPerPage = 15; // Discord has message length limits
  const pages = Math.ceil(items.length / itemsPerPage);

  for (let i = 0; i < pages; i++) {
    const startIndex = i * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageItems = items.slice(startIndex, endIndex);

    const pageContent = pageItems.join('\n');
    const pageNumber = pages > 1 ? ` (Page ${i + 1}/${pages})` : '';

    const listText = new TextDisplayBuilder().setContent(
      `**${title}${pageNumber}**\n\n${pageContent}`
    );

    const container = new ContainerBuilder().addTextDisplayComponents(listText);

    await message.channel.send({ 
      flags: MessageFlags.IsComponentsV2, 
      components: [container] 
    });

    // Add a small delay between pages to avoid rate limiting
    if (i < pages - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
} 
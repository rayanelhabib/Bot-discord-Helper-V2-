const { ContainerBuilder, TextDisplayBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const path = require('path');
const security = require(path.join(process.cwd(), 'src/utils/security.js'));

module.exports = {
  name: 'security',
  description: 'Manage server security settings',
  usage: 'security <subcommand> [options]',
  category: 'Security',
  permissions: [PermissionFlagsBits.Administrator],
  
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

    // Admin + higher-than-bot checks
    if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return sendReply('You need **Administrator** permission to use this command.', true);
    }
    const me = message.guild.members.me;
    if (message.member.roles.highest.position <= me.roles.highest.position && message.author.id !== message.guild.ownerId) {
      return sendReply('You need a higher role than the bot to use this command.', true);
    }

    const serverId = message.guild.id;

    if (!args.length) {
      return await showSecurityStatus(message, serverId, db);
    }

    const subcommand = args[0].toLowerCase();

    try {
      switch (subcommand) {
        case 'status':
          await showSecurityStatus(message, serverId, db);
          break;
          
        case 'enable':
          if (!args[1]) return sendReply('Specify a feature. Use `+security help` for features.', true);
          await toggleSecurityFeature(message, serverId, args[1], true, db);
          break;
          
        case 'disable':
          if (!args[1]) return sendReply('Specify a feature. Use `+security help` for features.', true);
          await toggleSecurityFeature(message, serverId, args[1], false, db);
          break;
          
        case 'punishment':
          if (!args[1] || !args[2]) return sendReply('Usage: `+security punishment <feature> <clear_roles|kick|ban|timeout>`', true);
          await setPunishmentType(message, serverId, args[1], args[2], db);
          break;
          
        case 'maxviolations':
          if (!args[1] || !args[2] || isNaN(args[2])) return sendReply('Usage: `+security maxviolations <feature> <number>`', true);
          await setMaxViolations(message, serverId, args[1], parseInt(args[2]), db);
          break;
          
        case 'whitelist':
          if (!args[1] || !args[2] || !args[3]) return sendReply('Usage: `+security whitelist <feature> <member|role> <id>`', true);
          await addToWhitelist(message, serverId, args[1], args[2], args[3], db);
          break;
          
        case 'logs':
          if (!args[1]) return sendReply('Provide a channel ID for security logs.', true);
          await setLogsChannel(message, serverId, args[1], db);
          break;
          
        case 'violations':
          if (!args[1]) return sendReply('Specify a user ID to check violations for.', true);
          await showViolations(message, serverId, args[1], args[2], db);
          break;
          
        case 'reset':
          if (!args[1] || !args[2]) return sendReply('Usage: `+security reset <user_id> <violation_type>`', true);
          await resetViolations(message, serverId, args[1], args[2], db);
          break;
          
        case 'help':
          return sendReply('Security: `status`, `enable`, `disable`, `punishment`, `maxviolations`, `whitelist`, `logs`, `violations`, `reset`');
          
        default:
          return sendReply('Unknown subcommand. Use `+security help`.', true);
      }
    } catch (error) {
      console.error('Security command error:', error);
      return sendReply('An error occurred while processing the security command.', true);
    }
  }
};

async function showSecurityStatus(message, serverId, db) {
  const config = await security.getSecurityConfig(serverId, db);
  const sendReply = (desc, isError = false) => {
    const text = new TextDisplayBuilder().setContent(`${isError ? '❌' : '✅'} ${desc}`);
    const container = new ContainerBuilder().addTextDisplayComponents(text);
    return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
  };

  if (!config) return sendReply('No security configuration found. Use `+security enable <feature>` to get started.', true);

  const features = [
    'ban', 'kick', 'channel_create', 'channel_delete', 
    'role_create', 'role_delete', 'addbot', 'dangerous_role_give',
    'change_vanity', 'change_server_name'
  ];

  console.log('Raw security config from DB:', config);
  const lines = ['🛡️ Security Configuration Status'];
  for (const feature of features) {
    const enabled = config[`${feature}_enabled`] ? 'ON' : 'OFF';
    const punishment = config[`${feature}_punishment`] || 'clear_roles';
    const maxV = config[`${feature}_max_violations`] || 3;
    lines.push(`• **${feature.replace(/_/g, ' ').toUpperCase()}**: ${enabled} | Punishment: ${punishment} | Max: ${maxV}`);

    let whitelistedRoles = config[`${feature}_whitelisted_roles`];
    if (typeof whitelistedRoles === 'string') {
      try { whitelistedRoles = JSON.parse(whitelistedRoles); } catch (e) { whitelistedRoles = []; }
    }
    if (Array.isArray(whitelistedRoles) && whitelistedRoles.length > 0) {
      lines.push(`  - Whitelisted Roles: ${whitelistedRoles.map(id => `<@&${id}>`).join(', ')}`);
    }

    let whitelistedMembers = config[`${feature}_whitelisted_members`];
    if (typeof whitelistedMembers === 'string') {
      try { whitelistedMembers = JSON.parse(whitelistedMembers); } catch (e) { whitelistedMembers = []; }
    }
    if (Array.isArray(whitelistedMembers) && whitelistedMembers.length > 0) {
      lines.push(`  - Whitelisted Members: ${whitelistedMembers.map(id => `<@${id}>`).join(', ')}`);
    }
  }
  if (config.logs_channel) lines.push(`📝 Logs: <#${config.logs_channel}>`);

  return sendReply(lines.join('\n'));
}

async function toggleSecurityFeature(message, serverId, feature, enabled, db) {
  const valid = [
    'ban', 'kick', 'channel_create', 'channel_delete', 
    'role_create', 'role_delete', 'addbot', 'dangerous_role_give',
    'change_vanity', 'change_server_name'
  ];
  const sendReply = (desc, isError = false) => {
    const text = new TextDisplayBuilder().setContent(`${isError ? '❌' : '✅'} ${desc}`);
    const container = new ContainerBuilder().addTextDisplayComponents(text);
    return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
  };
  if (!valid.includes(feature)) return sendReply(`Invalid feature. Valid: ${valid.join(', ')}`, true);
  await security.toggleSecurityFeature(serverId, feature, enabled, db);
  return sendReply(`${feature.replace(/_/g, ' ').toUpperCase()} ${enabled ? 'enabled' : 'disabled'}.`);
}

async function setPunishmentType(message, serverId, feature, punishment, db) {
  const valid = [
    'ban', 'kick', 'channel_create', 'channel_delete', 
    'role_create', 'role_delete', 'addbot', 'dangerous_role_give',
    'change_vanity', 'change_server_name'
  ];
  const types = ['clear_roles', 'kick', 'ban', 'timeout'];
  const sendReply = (desc, isError = false) => {
    const text = new TextDisplayBuilder().setContent(`${isError ? '❌' : '✅'} ${desc}`);
    const container = new ContainerBuilder().addTextDisplayComponents(text);
    return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
  };
  if (!valid.includes(feature)) return sendReply(`Invalid feature. Valid: ${valid.join(', ')}`, true);
  if (!types.includes(punishment)) return sendReply(`Invalid punishment. Valid: ${types.join(', ')}`, true);
  await security.setSecurityPunishment(serverId, feature, punishment, db);
  return sendReply(`${feature.replace(/_/g, ' ').toUpperCase()} punishment set to ${punishment}.`);
}

async function setMaxViolations(message, serverId, feature, maxViolations, db) {
  const valid = [
    'ban', 'kick', 'channel_create', 'channel_delete', 
    'role_create', 'role_delete', 'addbot', 'dangerous_role_give',
    'change_vanity', 'change_server_name'
  ];
  const sendReply = (desc, isError = false) => {
    const text = new TextDisplayBuilder().setContent(`${isError ? '❌' : '✅'} ${desc}`);
    const container = new ContainerBuilder().addTextDisplayComponents(text);
    return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
  };
  if (!valid.includes(feature)) return sendReply(`Invalid feature. Valid: ${valid.join(', ')}`, true);
  if (maxViolations < 1 || maxViolations > 10) return sendReply('Max violations must be between 1 and 10.', true);
  await security.setMaxViolations(serverId, feature, maxViolations, db);
  return sendReply(`${feature.replace(/_/g, ' ').toUpperCase()} max violations set to ${maxViolations}.`);
}

async function addToWhitelist(message, serverId, feature, type, id, db) {
  const valid = [
    'ban', 'kick', 'channel_create', 'channel_delete', 
    'role_create', 'role_delete', 'addbot', 'dangerous_role_give',
    'change_vanity', 'change_server_name'
  ];
  const sendReply = (desc, isError = false) => {
    const text = new TextDisplayBuilder().setContent(`${isError ? '❌' : '✅'} ${desc}`);
    const container = new ContainerBuilder().addTextDisplayComponents(text);
    return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
  };
  if (!valid.includes(feature)) return sendReply(`Invalid feature. Valid: ${valid.join(', ')}`, true);
  if (type !== 'member' && type !== 'role') return sendReply('Type must be either "member" or "role".', true);

  if (type === 'member') {
    const member = await message.guild.members.fetch(id).catch(() => null);
    if (!member) return sendReply('Member not found.', true);
    await security.addWhitelistedMembers(serverId, feature, [id], db);
  } else {
    const role = await message.guild.roles.fetch(id).catch(() => null);
    if (!role) return sendReply('Role not found.', true);
    await security.addWhitelistedRoles(serverId, feature, [id], db);
  }
  return sendReply(`Added ${type} <@${id}> to ${feature.replace(/_/g, ' ').toUpperCase()} whitelist.`);
}

async function setLogsChannel(message, serverId, channelId, db) {
  const sendReply = (desc, isError = false) => {
    const text = new TextDisplayBuilder().setContent(`${isError ? '❌' : '✅'} ${desc}`);
    const container = new ContainerBuilder().addTextDisplayComponents(text);
    return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
  };
  const channel = await message.guild.channels.fetch(channelId).catch(() => null);
  if (!channel) return sendReply('Channel not found.', true);
  await security.setLogsChannel(serverId, channelId, db);
  return sendReply(`Security logs channel set to <#${channelId}>.`);
}

async function showViolations(message, serverId, userId, violationType, db) {
  const sendReply = (desc, isError = false) => {
    const text = new TextDisplayBuilder().setContent(`${isError ? '❌' : '✅'} ${desc}`);
    const container = new ContainerBuilder().addTextDisplayComponents(text);
    return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
  };
  if (violationType) {
    const count = await security.getViolationCount(serverId, userId, violationType, db);
    return sendReply(`User <@${userId}> has ${count} violations for ${violationType}.`);
  } else {
    const features = [
      'ban', 'kick', 'channel_create', 'channel_delete', 
      'role_create', 'role_delete', 'addbot', 'dangerous_role_give',
      'change_vanity', 'change_server_name'
    ];
    const counts = await Promise.all(features.map(f => security.getViolationCount(serverId, userId, f, db)));
    const lines = ['📊 Violations:'];
    features.forEach((f, i) => { if (counts[i] > 0) lines.push(`• ${f.replace(/_/g, ' ').toUpperCase()}: ${counts[i]}`); });
    if (lines.length === 1) lines.push('No violations found for this user.');
    return sendReply(lines.join('\n'));
  }
}

async function resetViolations(message, serverId, userId, violationType, db) {
  const valid = [
    'ban', 'kick', 'channel_create', 'channel_delete', 
    'role_create', 'role_delete', 'addbot', 'dangerous_role_give',
    'change_vanity', 'change_server_name'
  ];
  const sendReply = (desc, isError = false) => {
    const text = new TextDisplayBuilder().setContent(`${isError ? '❌' : '✅'} ${desc}`);
    const container = new ContainerBuilder().addTextDisplayComponents(text);
    return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
  };
  if (!valid.includes(violationType)) return sendReply(`Invalid violation type. Valid: ${valid.join(', ')}`, true);
  await security.resetViolationCount(serverId, userId, violationType, db);
  return sendReply(`Reset violations for <@${userId}> in ${violationType.replace(/_/g, ' ').toUpperCase()}.`);
} 
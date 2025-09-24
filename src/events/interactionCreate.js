const { Events, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const security = require('../utils/security.js');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client, db) {
    // Handle button interactions
    if (interaction.isButton()) {
      await handleButtonInteraction(interaction, client, db);
    }
    
    // Handle select menu interactions
    if (interaction.isStringSelectMenu()) {
      await handleSelectMenuInteraction(interaction, client, db);
    }
  }
};

async function handleButtonInteraction(interaction, client, db) {
  const customId = interaction.customId;

  if (customId.startsWith('reset_all_violations_')) {
    const userId = customId.replace('reset_all_violations_', '');
    const guildId = interaction.guild.id;

    // Reset all violations for the user
    const features = [
      'ban', 'kick', 'channel_create', 'channel_delete', 
      'role_create', 'role_delete', 'addbot', 'dangerous_role_give',
      'change_vanity', 'change_server_name'
    ];

    let resetCount = 0;
    for (const feature of features) {
      const count = await security.getViolationCount(guildId, userId, feature, db);
      if (count > 0) {
        await security.resetViolationCount(guildId, userId, feature, db);
        resetCount++;
      }
    }

    const user = await client.users.fetch(userId).catch(() => null);
    const username = user ? user.username : `Unknown User (${userId})`;

    const embed = new EmbedBuilder()
      .setTitle('🔄 All Violations Reset')
      .setDescription(`Reset all violations for **${username}**.\n**${resetCount}** feature types cleared.`)
      .setColor('#00ff00')
      .setThumbnail(user ? user.displayAvatarURL() : null);

    await interaction.update({ 
      embeds: [embed], 
      components: [] 
    });
  }
}

async function handleSelectMenuInteraction(interaction, client, db) {
  const customId = interaction.customId;
  const selectedValue = interaction.values[0];

  if (customId === 'security_setup_menu') {
    await handleSecuritySetupMenu(interaction, selectedValue, client, db);
  }
}

async function handleSecuritySetupMenu(interaction, selectedValue, client, db) {
  const guildId = interaction.guild.id;

  switch (selectedValue) {
    case 'features':
      await showFeatureSelection(interaction, guildId, db);
      break;
    case 'punishments':
      await showPunishmentSelection(interaction, guildId, db);
      break;
    case 'limits':
      await showLimitSelection(interaction, guildId, db);
      break;
    case 'whitelist':
      await showWhitelistSelection(interaction, guildId, db);
      break;
    case 'logs':
      await showLogsSelection(interaction, guildId, db);
      break;
  }
}

async function showFeatureSelection(interaction, guildId, db) {
  const features = [
    { name: 'Ban Protection', value: 'ban', emoji: '🔨' },
    { name: 'Kick Protection', value: 'kick', emoji: '👢' },
    { name: 'Channel Create Protection', value: 'channel_create', emoji: '📝' },
    { name: 'Channel Delete Protection', value: 'channel_delete', emoji: '🗑️' },
    { name: 'Role Create Protection', value: 'role_create', emoji: '➕' },
    { name: 'Role Delete Protection', value: 'role_delete', emoji: '➖' },
    { name: 'Bot Add Protection', value: 'addbot', emoji: '🤖' },
    { name: 'Dangerous Role Give Protection', value: 'dangerous_role_give', emoji: '⚠️' },
    { name: 'Vanity Change Protection', value: 'change_vanity', emoji: '🔗' },
    { name: 'Server Name Change Protection', value: 'change_server_name', emoji: '📛' }
  ];

  const embed = new EmbedBuilder()
    .setTitle('🔧 Security Features')
    .setDescription('Select a security feature to enable or disable:')
    .setColor('#0099ff');

  const row = new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('security_feature_select')
        .setPlaceholder('Choose a security feature...')
        .addOptions(features.map(feature => ({
          label: feature.name,
          value: feature.value,
          emoji: feature.emoji
        })))
    );

  await interaction.update({ 
    embeds: [embed], 
    components: [row] 
  });
}

async function showPunishmentSelection(interaction, guildId, db) {
  const punishments = [
    { name: 'Clear Roles', value: 'clear_roles', emoji: '🎭', description: 'Remove all roles from violator' },
    { name: 'Kick User', value: 'kick', emoji: '👢', description: 'Kick violator from server' },
    { name: 'Ban User', value: 'ban', emoji: '🔨', description: 'Ban violator from server' },
    { name: 'Timeout User', value: 'timeout', emoji: '⏰', description: 'Timeout violator temporarily' }
  ];

  const embed = new EmbedBuilder()
    .setTitle('⚖️ Punishment Types')
    .setDescription('Select a punishment type to configure:')
    .setColor('#ff9900');

  const row = new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('security_punishment_select')
        .setPlaceholder('Choose a punishment type...')
        .addOptions(punishments.map(punishment => ({
          label: punishment.name,
          value: punishment.value,
          emoji: punishment.emoji,
          description: punishment.description
        })))
    );

  await interaction.update({ 
    embeds: [embed], 
    components: [row] 
  });
}

async function showLimitSelection(interaction, guildId, db) {
  const limits = [
    { name: '1 Violation', value: '1', emoji: '1️⃣' },
    { name: '2 Violations', value: '2', emoji: '2️⃣' },
    { name: '3 Violations', value: '3', emoji: '3️⃣' },
    { name: '5 Violations', value: '5', emoji: '5️⃣' },
    { name: '10 Violations', value: '10', emoji: '🔟' }
  ];

  const embed = new EmbedBuilder()
    .setTitle('🔢 Violation Limits')
    .setDescription('Select a violation limit to configure:')
    .setColor('#ff6600');

  const row = new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('security_limit_select')
        .setPlaceholder('Choose a violation limit...')
        .addOptions(limits.map(limit => ({
          label: limit.name,
          value: limit.value,
          emoji: limit.emoji
        })))
    );

  await interaction.update({ 
    embeds: [embed], 
    components: [row] 
  });
}

async function showWhitelistSelection(interaction, guildId, db) {
  const embed = new EmbedBuilder()
    .setTitle('🛡️ Whitelist Management')
    .setDescription('Choose a whitelist action:')
    .setColor('#00cc00');

  const row = new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('security_whitelist_select')
        .setPlaceholder('Choose a whitelist action...')
        .addOptions([
          {
            label: 'Add Member to Whitelist',
            value: 'add_member',
            emoji: '👤',
            description: 'Add a member to whitelist'
          },
          {
            label: 'Add Role to Whitelist',
            value: 'add_role',
            emoji: '🎭',
            description: 'Add a role to whitelist'
          },
          {
            label: 'View Whitelists',
            value: 'view',
            emoji: '👁️',
            description: 'View current whitelists'
          },
          {
            label: 'Clear Whitelists',
            value: 'clear',
            emoji: '🗑️',
            description: 'Clear all whitelists'
          }
        ])
    );

  await interaction.update({ 
    embeds: [embed], 
    components: [row] 
  });
}

async function showLogsSelection(interaction, guildId, db) {
  const embed = new EmbedBuilder()
    .setTitle('📝 Logs Configuration')
    .setDescription('Security logs help you monitor security events.\n\n**Current Status:** ' + 
      (await getCurrentLogsStatus(guildId, db)))
    .setColor('#0099cc');

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('security_logs_setup')
        .setLabel('Set Logs Channel')
        .setStyle(ButtonStyle.Primary)
        .setEmoji('📝'),
      new ButtonBuilder()
        .setCustomId('security_logs_test')
        .setLabel('Test Logs')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🧪')
    );

  await interaction.update({ 
    embeds: [embed], 
    components: [row] 
  });
}

async function getCurrentLogsStatus(guildId, db) {
  const config = await security.getSecurityConfig(guildId, db);
  if (config && config.logs_channel) {
    return `✅ Logs channel set to <#${config.logs_channel}>`;
  } else {
    return '❌ No logs channel configured';
  }
} 
const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} = require('discord.js');
const security = require('../utils/security.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('securitywhitelist')
    .setDescription('Manage security whitelists')
    .addSubcommand(sub =>
      sub.setName('add')
        .setDescription('Add member or role to security whitelist')
        .addStringOption(opt =>
          opt.setName('feature')
            .setDescription('Security feature')
            .setRequired(true)
            .addChoices(
              { name: 'Ban Protection', value: 'ban' },
              { name: 'Kick Protection', value: 'kick' },
              { name: 'Channel Create Protection', value: 'channel_create' },
              { name: 'Channel Delete Protection', value: 'channel_delete' },
              { name: 'Role Create Protection', value: 'role_create' },
              { name: 'Role Delete Protection', value: 'role_delete' },
              { name: 'Bot Add Protection', value: 'addbot' },
              { name: 'Dangerous Role Give Protection', value: 'dangerous_role_give' },
              { name: 'Vanity Change Protection', value: 'change_vanity' },
              { name: 'Server Name Change Protection', value: 'change_server_name' }
            )
        )
        .addStringOption(opt =>
          opt.setName('type')
            .setDescription('Type to whitelist')
            .setRequired(true)
            .addChoices(
              { name: 'Member', value: 'member' },
              { name: 'Role', value: 'role' }
            )
        )
        .addMentionableOption(opt =>
          opt.setName('target')
            .setDescription('Member or role to whitelist')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('remove')
        .setDescription('Remove member or role from security whitelist')
        .addStringOption(opt =>
          opt.setName('feature')
            .setDescription('Security feature')
            .setRequired(true)
            .addChoices(
              { name: 'Ban Protection', value: 'ban' },
              { name: 'Kick Protection', value: 'kick' },
              { name: 'Channel Create Protection', value: 'channel_create' },
              { name: 'Channel Delete Protection', value: 'channel_delete' },
              { name: 'Role Create Protection', value: 'role_create' },
              { name: 'Role Delete Protection', value: 'role_delete' },
              { name: 'Bot Add Protection', value: 'addbot' },
              { name: 'Dangerous Role Give Protection', value: 'dangerous_role_give' },
              { name: 'Vanity Change Protection', value: 'change_vanity' },
              { name: 'Server Name Change Protection', value: 'change_server_name' }
            )
        )
        .addMentionableOption(opt =>
          opt.setName('target')
            .setDescription('Member or role to remove from whitelist')
            .setRequired(true)
        )
    )
    .addSubcommand(sub =>
      sub.setName('list')
        .setDescription('Show current whitelist for a security feature')
        .addStringOption(opt =>
          opt.setName('feature')
            .setDescription('Security feature')
            .setRequired(true)
            .addChoices(
              { name: 'Ban Protection', value: 'ban' },
              { name: 'Kick Protection', value: 'kick' },
              { name: 'Channel Create Protection', value: 'channel_create' },
              { name: 'Channel Delete Protection', value: 'channel_delete' },
              { name: 'Role Create Protection', value: 'role_create' },
              { name: 'Role Delete Protection', value: 'role_delete' },
              { name: 'Bot Add Protection', value: 'addbot' },
              { name: 'Dangerous Role Give Protection', value: 'dangerous_role_give' },
              { name: 'Vanity Change Protection', value: 'change_vanity' },
              { name: 'Server Name Change Protection', value: 'change_server_name' }
            )
        )
    )
    .addSubcommand(sub =>
      sub.setName('clear')
        .setDescription('Clear all whitelists for a security feature')
        .addStringOption(opt =>
          opt.setName('feature')
            .setDescription('Security feature')
            .setRequired(true)
            .addChoices(
              { name: 'Ban Protection', value: 'ban' },
              { name: 'Kick Protection', value: 'kick' },
              { name: 'Channel Create Protection', value: 'channel_create' },
              { name: 'Channel Delete Protection', value: 'channel_delete' },
              { name: 'Role Create Protection', value: 'role_create' },
              { name: 'Role Delete Protection', value: 'role_delete' },
              { name: 'Bot Add Protection', value: 'addbot' },
              { name: 'Dangerous Role Give Protection', value: 'dangerous_role_give' },
              { name: 'Vanity Change Protection', value: 'change_vanity' },
              { name: 'Server Name Change Protection', value: 'change_server_name' }
            )
        )
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, db) {
    await interaction.deferReply({ ephemeral: true });

    const member = interaction.member;
    const me = interaction.guild.members.me;
    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      const text = new TextDisplayBuilder().setContent('❌ You need **Administrator** permission to use this command.');
      const container = new ContainerBuilder().addTextDisplayComponents(text);
      return interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    }
    if (member.roles.highest.position <= me.roles.highest.position && member.id !== interaction.guild.ownerId) {
      const text = new TextDisplayBuilder().setContent('❌ You need a higher role than the bot to use this command.');
      const container = new ContainerBuilder().addTextDisplayComponents(text);
      return interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    }

    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    try {
      switch (subcommand) {
        case 'add':
          await addToWhitelist(interaction, guildId, db);
          break;
        case 'remove':
          await removeFromWhitelist(interaction, guildId, db);
          break;
        case 'list':
          await listWhitelist(interaction, guildId, db);
          break;
        case 'clear':
          await clearWhitelist(interaction, guildId, db);
          break;
      }
    } catch (error) {
      console.error('Security whitelist command error:', error);
      const text = new TextDisplayBuilder().setContent('❌ An error occurred while processing the whitelist command.');
      const container = new ContainerBuilder().addTextDisplayComponents(text);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ flags: MessageFlags.IsComponentsV2, components: [container], ephemeral: true });
      } else {
        await interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });
      }
    }
  }
};

async function addToWhitelist(interaction, guildId, db) {
  const feature = interaction.options.getString('feature');
  const type = interaction.options.getString('type');
  const target = interaction.options.getMentionable('target');

  if (!target) {
    const text = new TextDisplayBuilder().setContent('❌ Invalid target specified.');
    const container = new ContainerBuilder().addTextDisplayComponents(text);
    return interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });
  }

  const targetId = target.id;
  const targetName = target.user ? target.user.tag : target.name;

  if (type === 'member') {
    const member = await interaction.guild.members.fetch(targetId).catch(() => null);
    if (!member) {
      const text = new TextDisplayBuilder().setContent('❌ Member not found.');
      const container = new ContainerBuilder().addTextDisplayComponents(text);
      return interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    }
    await security.addWhitelistedMembers(guildId, feature, [targetId], db);
  } else {
    const role = await interaction.guild.roles.fetch(targetId).catch(() => null);
    if (!role) {
      const text = new TextDisplayBuilder().setContent('❌ Role not found.');
      const container = new ContainerBuilder().addTextDisplayComponents(text);
      return interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    }
    await security.addWhitelistedRoles(guildId, feature, [targetId], db);
  }

  const featureName = feature.replace(/_/g, ' ').toUpperCase();
  const text = new TextDisplayBuilder().setContent(`✅ ${targetName} has been added to the ${featureName} whitelist.`);
  const container = new ContainerBuilder().addTextDisplayComponents(text);
  await interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });
}

async function removeFromWhitelist(interaction, guildId, db) {
  const feature = interaction.options.getString('feature');
  const target = interaction.options.getMentionable('target');

  if (!target) {
    const text = new TextDisplayBuilder().setContent('❌ Invalid target specified.');
    const container = new ContainerBuilder().addTextDisplayComponents(text);
    return interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });
  }

  const targetId = target.id;
  const targetName = target.user ? target.user.tag : target.name;

  const config = await security.getSecurityConfig(guildId, db);
  if (!config) {
    const text = new TextDisplayBuilder().setContent('❌ No security configuration found for this server.');
    const container = new ContainerBuilder().addTextDisplayComponents(text);
    return interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });
  }

  const memberField = `${feature}_whitelisted_members`;
  const roleField = `${feature}_whitelisted_roles`;

  let updated = false;
  let type = '';

  if (config[memberField]) {
    const members = config[memberField].split(',').filter(id => id.trim());
    if (members.includes(targetId)) {
      const updatedMembers = members.filter(id => id !== targetId);
      await security.setSecurityConfig(guildId, { [memberField]: updatedMembers.join(',') }, db);
      updated = true;
      type = 'member';
    }
  }

  if (!updated && config[roleField]) {
    const roles = config[roleField].split(',').filter(id => id.trim());
    if (roles.includes(targetId)) {
      const updatedRoles = roles.filter(id => id !== targetId);
      await security.setSecurityConfig(guildId, { [roleField]: updatedRoles.join(',') }, db);
      updated = true;
      type = 'role';
    }
  }

  if (!updated) {
    const text = new TextDisplayBuilder().setContent(`❌ ${targetName} is not in the whitelist for this feature.`);
    const container = new ContainerBuilder().addTextDisplayComponents(text);
    return interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });
  }

  const featureName = feature.replace(/_/g, ' ').toUpperCase();
  const text = new TextDisplayBuilder().setContent(`✅ ${targetName} has been removed from the ${featureName} whitelist.`);
  const container = new ContainerBuilder().addTextDisplayComponents(text);
  await interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });
}

async function listWhitelist(interaction, guildId, db) {
  const feature = interaction.options.getString('feature');
  const config = await security.getSecurityConfig(guildId, db);
  if (!config) {
    const text = new TextDisplayBuilder().setContent('❌ No security configuration found for this server.');
    const container = new ContainerBuilder().addTextDisplayComponents(text);
    return interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });
  }

  const memberField = `${feature}_whitelisted_members`;
  const roleField = `${feature}_whitelisted_roles`;
  const members = config[memberField] ? config[memberField].split(',').filter(id => id.trim()) : [];
  const roles = config[roleField] ? config[roleField].split(',').filter(id => id.trim()) : [];

  const featureName = feature.replace(/_/g, ' ').toUpperCase();
  const embed = new EmbedBuilder().setTitle(`🛡️ Whitelist for ${featureName}`).setColor('#0099ff').setTimestamp();
  if (members.length > 0) embed.addFields({ name: `👥 Whitelisted Members (${members.length})`, value: members.map(id => `<@${id}>`).join('\n'), inline: false });
  if (roles.length > 0) embed.addFields({ name: `🎭 Whitelisted Roles (${roles.length})`, value: roles.map(id => `<@&${id}>`).join('\n'), inline: false });
  if (members.length === 0 && roles.length === 0) embed.setDescription('No whitelisted members or roles for this feature.');

  await interaction.editReply({ embeds: [embed] });
}

async function clearWhitelist(interaction, guildId, db) {
  const feature = interaction.options.getString('feature');
  const memberField = `${feature}_whitelisted_members`;
  const roleField = `${feature}_whitelisted_roles`;
  await security.setSecurityConfig(guildId, { [memberField]: '', [roleField]: '' }, db);
  const featureName = feature.replace(/_/g, ' ').toUpperCase();
  const text = new TextDisplayBuilder().setContent(`🗑️ All whitelisted members and roles for ${featureName} have been removed.`);
  const container = new ContainerBuilder().addTextDisplayComponents(text);
  await interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });
} 
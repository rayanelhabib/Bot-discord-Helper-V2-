const { 
  SlashCommandBuilder, 
  PermissionFlagsBits, 
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} = require('discord.js');
const security = require('../utils/security.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('securityviolations')
    .setDescription('View and manage security violations')
    .addSubcommand(sub =>
      sub.setName('view')
        .setDescription('View violations for a user')
        .addUserOption(opt => opt.setName('user').setDescription('User to check violations for').setRequired(true))
        .addStringOption(opt =>
          opt.setName('feature').setDescription('Specific security feature to check').setRequired(false)
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
      sub.setName('reset')
        .setDescription('Reset violations for a user')
        .addUserOption(opt => opt.setName('user').setDescription('User to reset violations for').setRequired(true))
        .addStringOption(opt =>
          opt.setName('feature').setDescription('Specific security feature to reset').setRequired(false)
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
      sub.setName('top')
        .setDescription('Show top violators in the server')
        .addIntegerOption(opt => opt.setName('limit').setDescription('Number of users to show (1-10)').setRequired(false).setMinValue(1).setMaxValue(10))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, db) {
    // Enforce admin + higher-than-bot on every subcommand
    const member = interaction.member;
    const me = interaction.guild.members.me;
    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      const text = new TextDisplayBuilder().setContent('❌ You need **Administrator** permission to use this command.');
      const container = new ContainerBuilder().addTextDisplayComponents(text);
      return interaction.reply({ flags: MessageFlags.IsComponentsV2, components: [container], ephemeral: true });
    }
    if (member.roles.highest.position <= me.roles.highest.position && member.id !== interaction.guild.ownerId) {
      const text = new TextDisplayBuilder().setContent('❌ You need a higher role than the bot to use this command.');
      const container = new ContainerBuilder().addTextDisplayComponents(text);
      return interaction.reply({ flags: MessageFlags.IsComponentsV2, components: [container], ephemeral: true });
    }

    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    try {
      switch (subcommand) {
        case 'view':
          await viewViolations(interaction, guildId, db);
          break;
        case 'reset':
          await resetViolations(interaction, guildId, db);
          break;
        case 'top':
          await showTopViolators(interaction, guildId, db);
          break;
      }
    } catch (error) {
      console.error('Security violations command error:', error);
      const text = new TextDisplayBuilder().setContent('❌ An error occurred while processing the violations command.');
      const container = new ContainerBuilder().addTextDisplayComponents(text);
      await interaction.reply({ flags: MessageFlags.IsComponentsV2, components: [container], ephemeral: true });
    }
  }
};

async function viewViolations(interaction, guildId, db) {
  const user = interaction.options.getUser('user');
  const feature = interaction.options.getString('feature');

  if (feature) {
    const count = await security.getViolationCount(guildId, user.id, feature, db);
    const featureName = feature.replace(/_/g, ' ').toUpperCase();
    const text = new TextDisplayBuilder().setContent(`📊 ${featureName} violations for ${user.username}: ${count}`);
    const container = new ContainerBuilder().addTextDisplayComponents(text);
    return interaction.reply({ flags: MessageFlags.IsComponentsV2, components: [container], ephemeral: true });
  }

  const features = ['ban','kick','channel_create','channel_delete','role_create','role_delete','addbot','dangerous_role_give','change_vanity','change_server_name'];
  const embed = new EmbedBuilder().setTitle(`📊 Violations for ${user.username}`).setColor('#0099ff').setThumbnail(user.displayAvatarURL()).setTimestamp();

  let total = 0; let any = false;
  for (const feat of features) {
    const c = await security.getViolationCount(guildId, user.id, feat, db);
    if (c > 0) { any = true; total += c; embed.addFields({ name: feat.replace(/_/g,' ').toUpperCase(), value: `${c} violation${c>1?'s':''}`, inline: true }); }
  }
  if (!any) { embed.setDescription('✅ No violations found for this user.').setColor('#00ff00'); }
  else { embed.addFields({ name: '📊 Total Violations', value: `${total}`, inline: false }); }

  await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function resetViolations(interaction, guildId, db) {
  const user = interaction.options.getUser('user');
  const feature = interaction.options.getString('feature');

  if (feature) {
    await security.resetViolationCount(guildId, user.id, feature, db);
    const text = new TextDisplayBuilder().setContent(`🔄 Reset ${feature.replace(/_/g,' ').toUpperCase()} violations for ${user.username}.`);
    const container = new ContainerBuilder().addTextDisplayComponents(text);
    return interaction.reply({ flags: MessageFlags.IsComponentsV2, components: [container], ephemeral: true });
  }

  const features = ['ban','kick','channel_create','channel_delete','role_create','role_delete','addbot','dangerous_role_give','change_vanity','change_server_name'];
  let cleared = 0;
  for (const f of features) {
    const c = await security.getViolationCount(guildId, user.id, f, db);
    if (c > 0) { await security.resetViolationCount(guildId, user.id, f, db); cleared++; }
  }
  const text = new TextDisplayBuilder().setContent(`🔄 Reset all violations for ${user.username}. ${cleared} feature types cleared.`);
  const container = new ContainerBuilder().addTextDisplayComponents(text);
  await interaction.reply({ flags: MessageFlags.IsComponentsV2, components: [container], ephemeral: true });
}

async function showTopViolators(interaction, guildId, db) {
  const limit = interaction.options.getInteger('limit') || 5;
  const rows = await new Promise((resolve, reject) => {
    db.all('SELECT user_id, violation_type, violation_count FROM security_violations WHERE server_id = ? ORDER BY violation_count DESC', [guildId], (err, r) => err ? reject(err) : resolve(r||[]));
  });
  if (rows.length === 0) {
    const text = new TextDisplayBuilder().setContent('📊 No violations found in this server.');
    const container = new ContainerBuilder().addTextDisplayComponents(text);
    return interaction.reply({ flags: MessageFlags.IsComponentsV2, components: [container], ephemeral: true });
  }

  const grouped = {};
  for (const row of rows) {
    if (!grouped[row.user_id]) grouped[row.user_id] = { total: 0, features: {} };
    grouped[row.user_id].total += row.violation_count;
    grouped[row.user_id].features[row.violation_type] = row.violation_count;
  }
  const sorted = Object.entries(grouped).sort(([,a],[,b]) => b.total - a.total).slice(0, limit);
  const embed = new EmbedBuilder().setTitle(`📊 Top ${limit} Violators`).setColor('#ff9900').setTimestamp();
  for (let i=0;i<sorted.length;i++) {
    const [uid,data] = sorted[i];
    const user = await interaction.client.users.fetch(uid).catch(() => null);
    const name = user ? user.username : `Unknown (${uid})`;
    const top = Object.entries(data.features).sort(([,a],[,b]) => b-a).slice(0,3).map(([f,c]) => `${f.replace(/_/g,' ').toUpperCase()}: ${c}`).join(', ');
    embed.addFields({ name: `${i+1}. ${name}`, value: `Total: ${data.total}\nTop: ${top}`, inline: false });
  }
  await interaction.reply({ embeds: [embed], ephemeral: true });
} 
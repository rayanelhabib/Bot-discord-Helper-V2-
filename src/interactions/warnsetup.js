const {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags,
  PermissionsBitField
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnsetup')
    .setDescription('Setup the warning system with roles and logs channel')
    .addRoleOption(option =>
      option.setName('first_warn')
        .setDescription('Role given on first warning')
        .setRequired(true))
    .addRoleOption(option =>
      option.setName('second_warn')
        .setDescription('Role given on second warning')
        .setRequired(true))
    .addRoleOption(option =>
      option.setName('last_warn')
        .setDescription('Role given on third warning')
        .setRequired(true))
    .addRoleOption(option =>
      option.setName('warner_role')
        .setDescription('Role that can issue warnings')
        .setRequired(true))
    .addChannelOption(option =>
      option.setName('logs_channel')
        .setDescription('Channel for warning logs')
        .setRequired(true)),

  async execute(interaction, db, client) {
    const sendReply = (desc, isError = false) => {
      const prefix = isError ? '❌' : '✅';
      const text = new TextDisplayBuilder().setContent(`${prefix} ${desc}`);
      const container = new ContainerBuilder().addTextDisplayComponents(text);
      return interaction.reply({ flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral, components: [container] });
    };

    // Check permissions
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return sendReply('You need **Administrator** permission to setup the warning system.', true);
    }

    const firstWarnRole = interaction.options.getRole('first_warn');
    const secondWarnRole = interaction.options.getRole('second_warn');
    const lastWarnRole = interaction.options.getRole('last_warn');
    const warnerRole = interaction.options.getRole('warner_role');
    const logsChannel = interaction.options.getChannel('logs_channel');

    // Check if roles are different
    if (firstWarnRole.id === secondWarnRole.id || 
        firstWarnRole.id === lastWarnRole.id || 
        firstWarnRole.id === warnerRole.id ||
        secondWarnRole.id === lastWarnRole.id ||
        secondWarnRole.id === warnerRole.id ||
        lastWarnRole.id === warnerRole.id) {
      return sendReply('All roles must be different from each other.', true);
    }

    // Check if bot can manage these roles
    if (firstWarnRole.position >= interaction.guild.members.me.roles.highest.position ||
        secondWarnRole.position >= interaction.guild.members.me.roles.highest.position ||
        lastWarnRole.position >= interaction.guild.members.me.roles.highest.position ||
        warnerRole.position >= interaction.guild.members.me.roles.highest.position) {
      return sendReply('I cannot manage one or more of the roles. Make sure they are below my highest role.', true);
    }

    // Check if logs channel is a text channel
    if (logsChannel.type !== 0) { // 0 = text channel
      return sendReply('The logs channel must be a text channel.', true);
    }

    // Check if bot has permission to send messages in logs channel
    if (!logsChannel.permissionsFor(interaction.guild.members.me).has(PermissionsBitField.Flags.SendMessages)) {
      return sendReply('I need permission to send messages in the logs channel.', true);
    }

    try {
      // Save to database
      db.run(
        'INSERT OR REPLACE INTO warn_settings (guild_id, first_warn_role, second_warn_role, last_warn_role, warner_role, logs_channel) VALUES (?, ?, ?, ?, ?, ?)',
        [interaction.guild.id, firstWarnRole.id, secondWarnRole.id, lastWarnRole.id, warnerRole.id, logsChannel.id],
        (err) => {
          if (err) {
            console.error('Error saving warn settings:', err);
            return sendReply('Failed to save warning system settings.', true);
          }

          const successText = new TextDisplayBuilder().setContent(
            `✅ **Warning System Setup Complete**\n\n` +
            `**First Warning Role:** ${firstWarnRole} (\`${firstWarnRole.name}\`)\n` +
            `**Second Warning Role:** ${secondWarnRole} (\`${secondWarnRole.name}\`)\n` +
            `**Last Warning Role:** ${lastWarnRole} (\`${lastWarnRole.name}\`)\n` +
            `**Warner Role:** ${warnerRole} (\`${warnerRole.name}\`)\n` +
            `**Logs Channel:** ${logsChannel} (\`#${logsChannel.name}\`)\n\n` +
            `**Warning Progression:**\n` +
            `• 1st Warning: ${firstWarnRole} (24h)\n` +
            `• 2nd Warning: ${secondWarnRole} (48h)\n` +
            `• 3rd Warning: ${lastWarnRole} (7 days)\n` +
            `• 4th Warning: Automatic jail\n\n` +
            `**Setup by:** <@${interaction.user.id}>`
          );

          const container = new ContainerBuilder().addTextDisplayComponents(successText);
          return interaction.reply({ flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral, components: [container] });
        }
      );

    } catch (error) {
      console.error('Warn setup error:', error);
      return sendReply('Failed to setup warning system. Please try again.', true);
    }
  },
}; 
const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, MediaGalleryBuilder, MessageFlags, ChannelType } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setupj')
    .setDescription('Setup system configuration')
    .addSubcommand(sub =>
      sub
        .setName('jail')
        .setDescription('Configure jail system')
        // Required options first
        .addRoleOption(opt => opt.setName('jailer1').setDescription('Main jailer role').setRequired(true))
        .addRoleOption(opt => opt.setName('jailed1').setDescription('Main jailed role').setRequired(true))
        .addChannelOption(opt => 
          opt.setName('logs_channel')
             .setDescription('Jail logs channel')
             .setRequired(true)
             .addChannelTypes(ChannelType.GuildText)
        )
        // Optional after required
        .addRoleOption(opt => opt.setName('jailer2').setDescription('Optional jailer role').setRequired(false))
        .addRoleOption(opt => opt.setName('jailer3').setDescription('Optional jailer role').setRequired(false))
        .addRoleOption(opt => opt.setName('jailer4').setDescription('Optional jailer role').setRequired(false))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, db) {
    if (interaction.options.getSubcommand() !== 'jail') return;

    const sendReply = (desc, isError = false, ephemeral = true) => {
      const prefix = isError ? '❌' : '✅';
      const text = new TextDisplayBuilder().setContent(`${prefix} ${desc}`);
      const container = new ContainerBuilder().addTextDisplayComponents(text);
      return interaction.reply({ flags: MessageFlags.IsComponentsV2, components: [container], ephemeral });
    };


    const guildId = interaction.guild.id;

    // Collect roles & channel
    const jailers = [
      interaction.options.getRole('jailer1'),
      interaction.options.getRole('jailer2'),
      interaction.options.getRole('jailer3'),
      interaction.options.getRole('jailer4'),
    ].filter(Boolean);

    const jailedRoles = [
      interaction.options.getRole('jailed1'),
    ].filter(Boolean);

    const logsChannel = interaction.options.getChannel('logs_channel');

    // Check if jail setup already exists
    db.get(`SELECT server_id FROM jail_settings WHERE server_id = ?`, [guildId], (err, row) => {
      if (err) {
        console.error(err);
        return sendReply('Database error occurred.', true);
      }

      if (row) {
        return sendReply('Jail system is already set up for this server.', true);
      }

      // Insert jail settings
      db.run(
        `INSERT INTO jail_settings (server_id, jail_logs_channel) VALUES (?, ?)`,
        [guildId, logsChannel.id],
        (err) => {
          if (err) {
            console.error(err);
            return sendReply('Failed to save jail settings.', true);
          }

          // Insert jailer roles
          const jailerStmt = db.prepare(`INSERT INTO jailer_roles (server_id, role_id) VALUES (?, ?)`);
          jailers.forEach(role => jailerStmt.run(guildId, role.id));
          jailerStmt.finalize();

          // Insert jailed roles
          const jailedStmt = db.prepare(`INSERT INTO jailed_roles (server_id, role_id) VALUES (?, ?)`);
          jailedRoles.forEach(role => jailedStmt.run(guildId, role.id));
          jailedStmt.finalize();

          // Reply with embed confirmation
          const titleText = new TextDisplayBuilder().setContent('## 🔒 Jail Setup Complete');
          const fieldsText = new TextDisplayBuilder().setContent(
            `**Jail Logs Channel**\n<#${logsChannel.id}>\n\n` +
            `**Jailer Roles**\n${jailers.map(r => `<@&${r.id}>`).join('\n') || 'None'}\n\n` +
            `**Jailed Roles**\n${jailedRoles.map(r => `<@&${r.id}>`).join('\n') || 'None'}`
          );
          const footerText = new TextDisplayBuilder().setContent(`Setup by ${interaction.user.tag}`);

          const container = new ContainerBuilder().addTextDisplayComponents(titleText, fieldsText, footerText);

          const userAvatar = interaction.user.displayAvatarURL();
          if (userAvatar) {
            const mediaGallery = new MediaGalleryBuilder().addItems(item => item.setURL(userAvatar));
            container.addMediaGalleryComponents(mediaGallery);
          }

          return interaction.reply({ flags: MessageFlags.IsComponentsV2, components: [container], ephemeral: false });
        }
      );
    });
  },
};

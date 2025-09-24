const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, ContainerBuilder, TextDisplayBuilder, MediaGalleryBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setupv')
    .setDescription('Setup verification system')
    .addSubcommand(sub =>
      sub.setName('verif')
        .setDescription('Configure verification roles and logs')
        .addRoleOption(opt => opt.setName('verified').setDescription('Verified role').setRequired(true))
        .addRoleOption(opt => opt.setName('verified_female').setDescription('Verified female role').setRequired(true))
        .addRoleOption(opt => opt.setName('unverified').setDescription('Unverified role').setRequired(true))
        .addChannelOption(opt =>
          opt.setName('logs_channel')
            .setDescription('Verification logs channel')
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addRoleOption(opt => opt.setName('verificator1').setDescription('Main verificator role').setRequired(true))
        .addRoleOption(opt => opt.setName('verificator2').setDescription('Optional verificator role').setRequired(false))
        .addRoleOption(opt => opt.setName('verificator3').setDescription('Optional verificator role').setRequired(false))
        .addRoleOption(opt => opt.setName('verificator4').setDescription('Optional verificator role').setRequired(false))
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, db) {
    const sub = interaction.options.getSubcommand();
    if (sub !== 'verif') return;

    const sendReply = (desc, isError = false, ephemeral = true) => {
      const prefix = isError ? '❌' : '✅';
      const text = new TextDisplayBuilder().setContent(`${prefix} ${desc}`);
      const container = new ContainerBuilder().addTextDisplayComponents(text);
      return interaction.reply({ flags: MessageFlags.IsComponentsV2, components: [container], ephemeral });
    };

    const guildId = interaction.guild.id;

    // Get roles and channel
    const verified = interaction.options.getRole('verified');
    const verifiedFemale = interaction.options.getRole('verified_female');
    const unverified = interaction.options.getRole('unverified');
    const logsChannel = interaction.options.getChannel('logs_channel');
    const verificators = [
      interaction.options.getRole('verificator1'),
      interaction.options.getRole('verificator2'),
      interaction.options.getRole('verificator3'),
      interaction.options.getRole('verificator4')
    ].filter(Boolean);

    // Check if already setup
    db.get(`SELECT server_id FROM verification_settings WHERE server_id = ?`, [guildId], (err, row) => {
      if (err) {
        console.error(err);
        return sendReply('Database error.', true);
      }

      if (row) {
        // Update existing record
        db.run(`UPDATE verification_settings SET
                  verified_role = ?,
                  verified_female_role = ?,
                  unverified_role = ?,
                  verif_logs_channel = ?
                WHERE server_id = ?`,
          [verified.id, verifiedFemale.id, unverified.id, logsChannel.id, guildId],
          (err) => {
            if (err) {
              console.error(err);
              return sendReply('Failed to update settings.', true);
            }

            // Delete old verificators for this guild first
            db.run(`DELETE FROM verificators WHERE server_id = ?`, [guildId], (err) => {
              if (err) {
                console.error(err);
                return sendReply('Failed to clear old verificators.', true);
              }

              // Insert new verificators
              const stmt = db.prepare(`INSERT INTO verificators (server_id, role_id) VALUES (?, ?)`);
              verificators.forEach(role => stmt.run(guildId, role.id));
              stmt.finalize();

              const titleText = new TextDisplayBuilder().setContent('## ✅ Verification Setup Updated');
              const descText = new TextDisplayBuilder().setContent('The verification system has been successfully updated.');
              const fieldsText = new TextDisplayBuilder().setContent(
                `**Verified Role:** <@&${verified.id}>\n` +
                `**Verified Female Role:** <@&${verifiedFemale.id}>\n` +
                `**Unverified Role:** <@&${unverified.id}>\n` +
                `**Verification Logs Channel:** <#${logsChannel.id}>\n\n` +
                `**Verificators**\n${verificators.map(r => `<@&${r.id}>`).join('\n') || 'None'}`
              );
              const footerText = new TextDisplayBuilder().setContent(`Updated by ${interaction.user.tag}`);

              const container = new ContainerBuilder().addTextDisplayComponents(titleText, descText, fieldsText, footerText);

              const userAvatar = interaction.user.displayAvatarURL();
              if (userAvatar) {
                const mediaGallery = new MediaGalleryBuilder().addItems(item => item.setURL(userAvatar));
                container.addMediaGalleryComponents(mediaGallery);
              }

              return interaction.reply({ flags: MessageFlags.IsComponentsV2, components: [container], ephemeral: false });
            });
          });
      } else {
        // Insert new record
        db.run(`INSERT INTO verification_settings (server_id, verified_role, verified_female_role, unverified_role, verif_logs_channel) VALUES (?, ?, ?, ?, ?)`,
          [guildId, verified.id, verifiedFemale.id, unverified.id, logsChannel.id],
          (err) => {
            if (err) {
              console.error(err);
              return sendReply('Failed to save settings.', true);
            }

            const stmt = db.prepare(`INSERT INTO verificators (server_id, role_id) VALUES (?, ?)`);
            verificators.forEach(role => stmt.run(guildId, role.id));
            stmt.finalize();

            const titleText = new TextDisplayBuilder().setContent('## ✅ Verification Setup Complete');
            const descText = new TextDisplayBuilder().setContent('The verification system has been successfully configured.');
            const fieldsText = new TextDisplayBuilder().setContent(
              `**Verified Role:** <@&${verified.id}>\n` +
              `**Verified Female Role:** <@&${verifiedFemale.id}>\n` +
              `**Unverified Role:** <@&${unverified.id}>\n` +
              `**Verification Logs Channel:** <#${logsChannel.id}>\n\n` +
              `**Verificators**\n${verificators.map(r => `<@&${r.id}>`).join('\n') || 'None'}`
            );
            const footerText = new TextDisplayBuilder().setContent(`Setup by ${interaction.user.tag}`);

            const container = new ContainerBuilder().addTextDisplayComponents(titleText, descText, fieldsText, footerText);

            const userAvatar = interaction.user.displayAvatarURL();
            if (userAvatar) {
              const mediaGallery = new MediaGalleryBuilder().addItems(item => item.setURL(userAvatar));
              container.addMediaGalleryComponents(mediaGallery);
            }

            return interaction.reply({ flags: MessageFlags.IsComponentsV2, components: [container], ephemeral: false });
          });
      }
    });
  },
};

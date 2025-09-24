const { SlashCommandBuilder, EmbedBuilder, PermissionsBitField } = require('discord.js');
const sqlite3 = require('sqlite3');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('security-setup')
    .setDescription('Initializes the security module with default settings for this server.')
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  async execute(interaction, db) {
    const serverId = interaction.guild.id;

    await interaction.deferReply({ ephemeral: true });

    try {
      // Check if a configuration already exists
      const existingConfig = await new Promise((resolve, reject) => {
        db.get('SELECT 1 FROM security_config WHERE server_id = ?', [serverId], (err, row) => {
          if (err) return reject(err);
          resolve(row);
        });
      });

      if (existingConfig) {
        const embed = new EmbedBuilder()
          .setColor('#ffcc00')
          .setTitle('🛡️ Security Already Configured')
          .setDescription('The security module has already been set up for this server. You can use other commands to view or modify the settings.')
          .setTimestamp();
        return interaction.editReply({ embeds: [embed] });
      }

      // Define default settings
      const columns = [
        'server_id',
        'ban_enabled', 'ban_punishment', 'ban_max_violations',
        'kick_enabled', 'kick_punishment', 'kick_max_violations',
        'channel_create_enabled', 'channel_create_punishment', 'channel_create_max_violations',
        'channel_delete_enabled', 'channel_delete_punishment', 'channel_delete_max_violations',
        'role_create_enabled', 'role_create_punishment', 'role_create_max_violations',
        'role_delete_enabled', 'role_delete_punishment', 'role_delete_max_violations',
        'addbot_enabled', 'addbot_punishment', 'addbot_max_violations',
        'dangerous_role_give_enabled', 'dangerous_role_give_punishment', 'dangerous_role_give_max_violations',
        'change_vanity_enabled', 'change_vanity_punishment', 'change_vanity_max_violations',
        'change_server_name_enabled', 'change_server_name_punishment', 'change_server_name_max_violations'
      ];

      const values = [
        serverId, // server_id
        0, 'clear_roles', 3, // ban
        0, 'clear_roles', 3, // kick
        0, 'clear_roles', 3, // channel_create
        0, 'clear_roles', 3, // channel_delete
        0, 'clear_roles', 3, // role_create
        0, 'clear_roles', 3, // role_delete
        0, 'clear_roles', 3, // addbot
        0, 'clear_roles', 3, // dangerous_role_give
        0, 'clear_roles', 3, // change_vanity
        0, 'clear_roles', 3  // change_server_name
      ];

      const placeholders = columns.map(() => '?').join(', ');
      const query = `INSERT INTO security_config (${columns.join(', ')}) VALUES (${placeholders});`;

      // Insert the new default configuration
      await new Promise((resolve, reject) => {
        db.run(query, values, function(err) {
          if (err) return reject(err);
          resolve();
        });
      });

      const successEmbed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('✅ Security Module Initialized')
        .setDescription('The security system has been successfully initialized. **All security protections are currently disabled by default.**')
        .addFields({ name: '➡️ How to Enable Protections', value: 'To start protecting your server, use the `/security enable <feature>` command for each protection you want to activate.' })
        .setTimestamp();

      await interaction.editReply({ embeds: [successEmbed] });

    } catch (error) {
      console.error('Error during /security-setup:', error);
      const errorEmbed = new EmbedBuilder()
        .setColor('#ff0000')
        .setTitle('❌ An Error Occurred')
        .setDescription('Could not initialize the security module. Please check the console for more details.');
      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
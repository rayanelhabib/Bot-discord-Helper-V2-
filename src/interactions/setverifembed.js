const { SlashCommandBuilder, PermissionFlagsBits, ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setverifembed')
    .setDescription('Set the verification embed JSON configuration')
    .addStringOption(option => 
      option.setName('json')
            .setDescription('The embed JSON string')
            .setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, db) {
    const sendReply = (desc, isError = false) => {
      const prefix = isError ? '❌' : '✅';
      const text = new TextDisplayBuilder().setContent(`${prefix} ${desc}`);
      const container = new ContainerBuilder().addTextDisplayComponents(text);
      return interaction.reply({ flags: MessageFlags.IsComponentsV2, components: [container], ephemeral: true });
    };

    const guildId = interaction.guild.id;
    const jsonString = interaction.options.getString('json');

    let embedObj;
    try {
      embedObj = JSON.parse(jsonString);
    } catch {
      return sendReply('Invalid JSON format. Please provide valid embed JSON.', true);
    }

    // Optional: Validate minimal embed keys here if you want

    // Save to DB
    const embedJsonStr = JSON.stringify(embedObj);

    // Check if there's already a row for this guild
    db.get(`SELECT server_id FROM verification_settings WHERE server_id = ?`, [guildId], (err, row) => {
      if (err) {
        console.error(err);
        return sendReply('Database error occurred.', true);
      }

      if (row) {
        // Update existing row
        db.run(`UPDATE verification_settings SET verifembed = ? WHERE server_id = ?`, [embedJsonStr, guildId], function(err) {
          if (err) {
            console.error(err);
            return sendReply('Failed to update verification embed.', true);
          }
          return sendReply('Verification embed updated successfully.');
        });
      } else {
        // Insert new row with just server_id and embed JSON (other fields null)
        db.run(`INSERT INTO verification_settings (server_id, verifembed) VALUES (?, ?)`, [guildId, embedJsonStr], function(err) {
          if (err) {
            console.error(err);
            return sendReply('Failed to set verification embed.', true);
          }
          return sendReply('Verification embed set successfully.');
        });
      }
    });
  },
};

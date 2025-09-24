const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  TextDisplayBuilder,
  ContainerBuilder,
  MessageFlags
} = require('discord.js');
const security = require('../utils/security.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setlogchannel')
    .setDescription('Sets the channel where security logs are sent.')
    .addChannelOption(option =>
      option.setName('channel')
        .setDescription('The channel to send security logs to.')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, db) {
    await interaction.deferReply({ ephemeral: true });

    const member = interaction.member;
    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      const text = new TextDisplayBuilder().setContent('❌ You need **Administrator** permission to use this command.');
      const container = new ContainerBuilder().addTextDisplayComponents(text);
      return interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    }

    const logChannel = interaction.options.getChannel('channel');
    const guildId = interaction.guild.id;

    try {
      await security.setSecurityConfig(guildId, { log_channel_id: logChannel.id }, db);
      const text = new TextDisplayBuilder().setContent(`✅ Security logs will now be sent to ${logChannel}.`);
      const container = new ContainerBuilder().addTextDisplayComponents(text);
      await interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    } catch (error) {
      console.error('Error setting log channel:', error);
      const text = new TextDisplayBuilder().setContent('❌ An error occurred while setting the log channel.');
      const container = new ContainerBuilder().addTextDisplayComponents(text);
      await interaction.editReply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    }
  },
};

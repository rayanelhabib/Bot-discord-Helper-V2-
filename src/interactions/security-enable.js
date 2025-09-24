const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} = require('discord.js');
const path = require('path');
const security = require(path.join(process.cwd(), 'utils/security.js'));

module.exports = {
  data: new SlashCommandBuilder()
    .setName('security-enable')
    .setDescription('Enable a security feature with optional punishment and max violations settings')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option.setName('feature')
        .setDescription('The security feature to enable')
        .setRequired(true)
        .addChoices(
          { name: 'Ban Protection', value: 'ban' },
          { name: 'Kick Protection', value: 'kick' },
          { name: 'Channel Create Protection', value: 'channel_create' },
          { name: 'Channel Delete Protection', value: 'channel_delete' },
          { name: 'Role Create Protection', value: 'role_create' },
          { name: 'Role Delete Protection', value: 'role_delete' },
          { name: 'Add Bot Protection', value: 'addbot' },
          { name: 'Dangerous Role Give Protection', value: 'dangerous_role_give' },
          { name: 'Change Vanity Protection', value: 'change_vanity' },
          { name: 'Change Server Name Protection', value: 'change_server_name' }
        ))
    .addStringOption(option =>
      option.setName('punishment')
        .setDescription('Type of punishment when violations occur (optional)')
        .setRequired(false)
        .addChoices(
          { name: 'Clear Roles', value: 'clear_roles' },
          { name: 'Kick', value: 'kick' },
          { name: 'Ban', value: 'ban' },
          { name: 'Timeout', value: 'timeout' }
        ))
    .addIntegerOption(option =>
      option.setName('max_violations')
        .setDescription('Maximum violations before punishment (1-10, optional)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(10)),

  async execute(interaction, db, client) {
    const sendReply = async (desc, isError = false, isWarning = false) => {
      const prefix = isError ? '❌' : isWarning ? '⚠️' : '✅';
      const text = new TextDisplayBuilder().setContent(`${prefix} ${desc}`);
      const container = new ContainerBuilder().addTextDisplayComponents(text);
      
      const payload = {
        flags: MessageFlags.IsComponentsV2,
        components: [container],
        ephemeral: true
      };

      if (interaction.replied || interaction.deferred) {
        return await interaction.followUp(payload);
      } else {
        return await interaction.reply(payload);
      }
    };

    if (!interaction.guild) {
      return await sendReply('This command can only be used in a server.', true);
    }

    // Admin + higher-than-bot checks
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return await sendReply('You need **Administrator** permission to use this command.', true);
    }

    const me = interaction.guild.members.me;
    if (interaction.member.roles.highest.position <= me.roles.highest.position && 
        interaction.user.id !== interaction.guild.ownerId) {
      return await sendReply('You need a higher role than the bot to use this command.', true);
    }

    const serverId = interaction.guild.id;
    const feature = interaction.options.getString('feature');
    const punishment = interaction.options.getString('punishment');
    const maxViolations = interaction.options.getInteger('max_violations');

    const validFeatures = [
      'ban', 'kick', 'channel_create', 'channel_delete', 
      'role_create', 'role_delete', 'addbot', 'dangerous_role_give',
      'change_vanity', 'change_server_name'
    ];

    if (!validFeatures.includes(feature)) {
      return await sendReply(`Invalid feature. Valid features: ${validFeatures.join(', ')}`, true);
    }

    try {
      // Enable the security feature
      await security.toggleSecurityFeature(serverId, feature, true, db);
      
      const featureName = feature.replace(/_/g, ' ').toUpperCase();
      let successMessage = `🛡️ **${featureName}** security feature has been **ENABLED** for this server.`;
      
      // Set punishment type if provided
      if (punishment) {
        await security.setSecurityPunishment(serverId, feature, punishment, db);
        successMessage += `\n⚖️ **Punishment type** set to: **${punishment.replace(/_/g, ' ').toUpperCase()}**`;
      }
      
      // Set max violations if provided
      if (maxViolations) {
        await security.setMaxViolations(serverId, feature, maxViolations, db);
        successMessage += `\n📊 **Max violations** set to: **${maxViolations}**`;
      }
      
      // Add helpful info about default settings
      if (!punishment && !maxViolations) {
        successMessage += `\n\n💡 **Tip:** Use the command again with \`punishment\` and \`max_violations\` options to customize settings.`;
      } else if (!punishment) {
        successMessage += `\n\n💡 **Tip:** Add \`punishment\` option to set what happens after violations.`;
      } else if (!maxViolations) {
        successMessage += `\n\n💡 **Tip:** Add \`max_violations\` option to set the violation threshold.`;
      }
      
      return await sendReply(successMessage);
      
    } catch (error) {
      console.error('Error configuring security feature:', error);
      return await sendReply('An error occurred while configuring the security feature. Please try again.', true);
    }
  },
};
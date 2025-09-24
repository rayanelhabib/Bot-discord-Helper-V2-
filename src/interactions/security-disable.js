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
    .setName('security-disable')
    .setDescription('Disable a security feature for the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(option =>
      option.setName('feature')
        .setDescription('The security feature to disable')
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
        )),

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

    const validFeatures = [
      'ban', 'kick', 'channel_create', 'channel_delete', 
      'role_create', 'role_delete', 'addbot', 'dangerous_role_give',
      'change_vanity', 'change_server_name'
    ];

    if (!validFeatures.includes(feature)) {
      return await sendReply(`Invalid feature. Valid features: ${validFeatures.join(', ')}`, true);
    }

    try {
      // Disable the security feature
      await security.toggleSecurityFeature(serverId, feature, false, db);
      
      const featureName = feature.replace(/_/g, ' ').toUpperCase();
      return await sendReply(`🔓 **${featureName}** security feature has been **DISABLED** for this server.`);
      
    } catch (error) {
      console.error('Error disabling security feature:', error);
      return await sendReply('An error occurred while disabling the security feature. Please try again.', true);
    }
  },
};
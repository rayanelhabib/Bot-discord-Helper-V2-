const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('restore-roles')
    .setDescription('Restore the last saved roles for a user (after security punishment).')
    .addUserOption(opt => opt.setName('user').setDescription('User to restore').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),
  async execute(interaction, db) {
    const target = interaction.options.getUser('user', true);
    const guild = interaction.guild;

    if (!guild) return interaction.reply({ content: 'Guild not found.', ephemeral: true });
    await interaction.deferReply({ ephemeral: true });

    try {
      const me = guild.members.me;
      const invoker = await guild.members.fetch(interaction.user.id);
      const member = await guild.members.fetch(target.id).catch(() => null);
      if (!member) return interaction.editReply('User is not in this server.');

      // Require invoker to be higher than bot so they can override protection
      const invokerHigherThanBot = invoker.roles.highest.comparePositionTo(me.roles.highest) > 0;
      if (!invokerHigherThanBot) {
        return interaction.editReply('You need a role higher than the bot to restore roles.');
      }

      // Load latest snapshot
      const snapshot = await new Promise((resolve, reject) => {
        db.get(
          'SELECT roles FROM security_role_snapshots WHERE server_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1',
          [guild.id, target.id],
          (err, row) => err ? reject(err) : resolve(row)
        );
      });

      if (!snapshot || !snapshot.roles) {
        return interaction.editReply('No saved role snapshot found for this user.');
      }

      const roleIds = snapshot.roles.split(',').filter(Boolean);
      const roles = roleIds
        .map(id => guild.roles.cache.get(id))
        .filter(r => !!r && r.editable);

      // Remove all editable roles first (except @everyone), then add snapshot
      const currentEditable = member.roles.cache.filter(r => r.editable && r.id !== guild.id);
      for (const role of currentEditable.values()) {
        await member.roles.remove(role).catch(() => {});
      }
      for (const role of roles) {
        await member.roles.add(role).catch(() => {});
      }

      // Clear previous snapshots for this user until next punishment
      await new Promise((resolve) => {
        db.run('DELETE FROM security_role_snapshots WHERE server_id = ? AND user_id = ?', [guild.id, target.id], () => resolve());
      });

      return interaction.editReply(`Restored ${roles.length} roles for ${member.user.tag}. Previous snapshot cleared.`);
    } catch (e) {
      console.error('restore-roles error:', e);
      return interaction.editReply('Failed to restore roles.');
    }
  }
};


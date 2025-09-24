const { ContainerBuilder, TextDisplayBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');
const path = require('path');

module.exports = {
  name: 'rr',
  description: 'Restore the last saved roles for a member (after security punishment).',
  usage: 'rr <user_id|@mention>',
  category: 'Security',
  permissions: [PermissionFlagsBits.ManageRoles],

  async execute(message, args, client, db) {
    const sendReply = (desc, isError = false) => {
      const prefix = isError ? '❌' : '✅';
      const text = new TextDisplayBuilder().setContent(`${prefix} ${desc}`);
      const container = new ContainerBuilder().addTextDisplayComponents(text);
      return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    };

    if (!message.guild) return sendReply('This command can only be used in a server.', true);

    // Permission check
    if (!message.member.permissions.has(PermissionFlagsBits.ManageRoles)) {
      return sendReply('You need the Manage Roles permission to use this command.', true);
    }

    const me = message.guild.members.me;
    if (message.member.roles.highest.position <= me.roles.highest.position && message.author.id !== message.guild.ownerId) {
      return sendReply('You need a higher role than the bot to restore roles.', true);
    }

    const targetArg = args[0];
    if (!targetArg) return sendReply('Usage: `+rr <user_id|@mention>`', true);

    const idMatch = targetArg.match(/\d{16,20}/);
    const userId = idMatch ? idMatch[0] : null;
    if (!userId) return sendReply('Provide a valid user ID or mention.', true);

    const member = await message.guild.members.fetch(userId).catch(() => null);
    if (!member) return sendReply('User not found in this server.', true);

    try {
      const snapshot = await new Promise((resolve, reject) => {
        db.get(
          'SELECT roles FROM security_role_snapshots WHERE server_id = ? AND user_id = ? ORDER BY created_at DESC LIMIT 1',
          [message.guild.id, userId],
          (err, row) => err ? reject(err) : resolve(row)
        );
      });

      if (!snapshot || !snapshot.roles) {
        return sendReply('No saved role snapshot found for this user.', true);
      }

      const roleIds = snapshot.roles.split(',').filter(Boolean);
      const rolesToAdd = roleIds
        .map(id => message.guild.roles.cache.get(id))
        .filter(r => !!r && r.editable);

      const currentEditable = member.roles.cache.filter(r => r.editable && r.id !== message.guild.id);
      for (const role of currentEditable.values()) {
        await member.roles.remove(role).catch(() => {});
      }
      for (const role of rolesToAdd) {
        await member.roles.add(role).catch(() => {});
      }

      // Clear previous snapshots for this user until next punishment
      await new Promise((resolve) => {
        db.run('DELETE FROM security_role_snapshots WHERE server_id = ? AND user_id = ?', [message.guild.id, userId], () => resolve());
      });

      return sendReply(`Restored ${rolesToAdd.length} roles for <@${member.id}>. Previous snapshot cleared.`);
    } catch (e) {
      console.error('rr error:', e);
      return sendReply('Failed to restore roles.', true);
    }
  }
};


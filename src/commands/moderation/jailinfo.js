const { ContainerBuilder, TextDisplayBuilder, MediaGalleryBuilder, MessageFlags } = require('discord.js');

module.exports = {
  name: 'jailinfo',
  aliases: [],
  async execute(message, args, client, db) {
    const userId = args[0]?.replace(/[<@!>]/g, '');
    const guildId = message.guild.id;

    const sendError = (desc) => {
      const text = new TextDisplayBuilder().setContent(`❌ ${desc}`);
      const container = new ContainerBuilder().addTextDisplayComponents(text);
      return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    };

    if (!userId) return sendError('Please mention a user or provide a valid user ID.');

    let target = message.guild.members.cache.get(userId);
    if (!target) {
      try {
        target = await message.guild.members.fetch(userId);
      } catch {
        return sendError('User not found in this server.');
      }
    }

    const jailData = await new Promise((resolve, reject) => {
      db.get(
        `SELECT previous_roles FROM jailed_users WHERE server_id = ? AND user_id = ?`,
        [guildId, target.id],
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        }
      );
    });

    if (!jailData) {
      return sendError('This user is not currently jailed.');
    }

    const jailLog = await new Promise((resolve, reject) => {
      db.get(
        `SELECT jailer_id, reason, timestamp FROM jail_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT 1`,
        [target.id],
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        }
      );
    });

    if (!jailLog) {
      return sendError('No jail log found for this user.');
    }

    // Skip @everyone (its ID is the same as the guild)
    const roleTags = jailData.previous_roles
      .split(',')
      .filter(id => id !== guildId)
      .map(id => {
        const role = message.guild.roles.cache.get(id);
        return role ? `<@&${id}>` : `\`${id}\``;
      })
      .join(', ') || '*None*';

    const guildIcon = message.guild.iconURL({ dynamic: true, size: 1024 });

    const titleText = new TextDisplayBuilder().setContent('## 📋 Jail Information');
    const infoText = new TextDisplayBuilder().setContent(
      `**User:** ➔ <@${target.id}> (\`${target.id}\`)\n` +
      `**Jailed By:** ➔ <@${jailLog.jailer_id}>\n` +
      `**Reason:** ➔ ${jailLog.reason || 'No reason provided'}\n` +
      `**Timestamp:** ➔ <t:${Math.floor(new Date(jailLog.timestamp).getTime() / 1000)}:F>\n` +
      `**Previous Roles:** ➔ ${roleTags || 'None'}`
    );

    const container = new ContainerBuilder().addTextDisplayComponents(titleText, infoText);

    return message.reply({
      flags: MessageFlags.IsComponentsV2,
      components: [container],
    });
      
  },
};

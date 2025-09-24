const { ContainerBuilder, TextDisplayBuilder, MediaGalleryBuilder, MessageFlags, PermissionsBitField } = require('discord.js');

module.exports = {
  name: 'unjail',
  aliases: [],
  async execute(message, args, client, db) {
    const author = message.member;
    const target = message.mentions.members.first() || message.guild.members.cache.get(args[0]);
    const guildId = message.guild.id;

    const sendReply = (desc, isError = false) => {
      const prefix = isError ? '❌' : '✅';
      const text = new TextDisplayBuilder().setContent(`${prefix} ${desc}`);
      const container = new ContainerBuilder().addTextDisplayComponents(text);
      return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    };

    if (!target) return sendReply('Please mention a valid user to unjail.', true);

    // Check if user is jailed
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

    if (!jailData) return sendReply('This user is not currently jailed.', true);

    const previousRoleIds = jailData.previous_roles.split(',');

    // Remove jailed role
    const jailedRoleRow = await new Promise((resolve, reject) => {
      db.get(
        `SELECT role_id FROM jailed_roles WHERE server_id = ?`,
        [guildId],
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        }
      );
    });

    if (jailedRoleRow) {
      const jailedRole = message.guild.roles.cache.get(jailedRoleRow.role_id);
      if (jailedRole && target.roles.cache.has(jailedRole.id)) {
        try {
          await target.roles.remove(jailedRole.id);
        } catch (err) {
          console.error(err);
        }
      }
    }

    // Restore previous roles
    const rolesToAdd = previousRoleIds
      .map(id => message.guild.roles.cache.get(id))
      .filter(role => role && role.editable);

    try {
      await target.roles.add(rolesToAdd);
    } catch (err) {
      console.error(err);
      return sendReply('Failed to restore roles. Make sure I have permission.', true);
    }

    // Remove from jailed_users and jail_logs
    db.run(
      `DELETE FROM jailed_users WHERE server_id = ? AND user_id = ?`,
      [guildId, target.id]
    );
    db.run(
      `DELETE FROM jail_logs WHERE user_id = ?`,
      [target.id]
    );

    // Send DM
    const dmTitle = new TextDisplayBuilder().setContent('## 🔓 You have been unjailed');
    const dmBody = new TextDisplayBuilder().setContent(`You have been unjailed in **${message.guild.name}**.`);
    const dmContainer = new ContainerBuilder().addTextDisplayComponents(dmTitle, dmBody);

    const guildIcon = message.guild.iconURL();
    if (guildIcon) {
      const mediaGallery = new MediaGalleryBuilder().addItems(item => item.setURL(guildIcon));
      dmContainer.addMediaGalleryComponents(mediaGallery);
    }

    try {
      await target.send({ flags: MessageFlags.IsComponentsV2, components: [dmContainer] });
    } catch (err) {
      console.error(`Could not send DM to ${target.id}`, err);
    }


    // Send log embed
    const logChannelRow = await new Promise((resolve, reject) => {
      db.get(
        `SELECT jail_logs_channel FROM jail_settings WHERE server_id = ?`,
        [guildId],
        (err, row) => {
          if (err) return reject(err);
          resolve(row);
        }
      );
    });

    if (logChannelRow) {
        const logChannel = message.guild.channels.cache.get(logChannelRow.jail_logs_channel);
        if (logChannel) {
          const guildIcon = message.guild.iconURL({ dynamic: true, size: 1024 }); // Get server icon if available
      
          const logTitle = new TextDisplayBuilder().setContent(`### 🔓 User Unjailed in ${message.guild.name}`);
          const logBody = new TextDisplayBuilder().setContent(
            `**User:** ➔ <@${target.id}> (\`${target.id}\`)\n` +
            `**Unjailed By:** ➔ <@${author.id}> (\`${author.id}\`)`
          );
          const logContainer = new ContainerBuilder().addTextDisplayComponents(logTitle, logBody);

          if (guildIcon) {
            const mediaGallery = new MediaGalleryBuilder().addItems(item => item.setURL(guildIcon));
            logContainer.addMediaGalleryComponents(mediaGallery);
          }

          logChannel.send({ flags: MessageFlags.IsComponentsV2, components: [logContainer] });
        }
      }
      

    return sendReply(`Successfully unjailed <@${target.id}>.`);
  },
};
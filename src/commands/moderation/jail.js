const { ContainerBuilder, TextDisplayBuilder, MediaGalleryBuilder, MessageFlags, PermissionsBitField } = require('discord.js');

module.exports = {
  name: 'jail',
  aliases: ['jaail'],
  async execute(message, args, client, db) {
    const author = message.member;
    const guildId = message.guild.id;
    const userId = args[0]?.replace(/[<@!>]/g, '');
    const reason = args.slice(1).join(' ') || 'No reason provided';

        const sendError = (desc) => {
      const text = new TextDisplayBuilder().setContent(`❌ ${desc}`);
      const container = new ContainerBuilder().addTextDisplayComponents(text);
      return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    };

    const sendSuccess = (desc) => {
      const text = new TextDisplayBuilder().setContent(`✅ ${desc}`);
      const container = new ContainerBuilder().addTextDisplayComponents(text);
      return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    };

    if (!userId) return sendError('Please mention a user or provide a valid user ID.');

    // Try to get the member from cache or fetch
    let target = message.guild.members.cache.get(userId);
    if (!target) {
      try {
        target = await message.guild.members.fetch(userId);
      } catch {
        return sendError('User not found in this server.');
      }
    }

    if (target.id === author.id)
      return sendError("You can't jail yourself.");

    if (
      target.roles.highest.position >= author.roles.highest.position &&
      message.guild.ownerId !== author.id
    )
      return sendError("You can't jail someone with a higher or equal role.");

    if (!target.moderatable)
      return sendError("I can't jail this user. I may be missing permissions.");

    // Check if the author is allowed (admin or jailer role)
    let isAllowed = author.permissions.has(PermissionsBitField.Flags.Administrator);
    if (!isAllowed) {
      const jailerRoles = await new Promise((resolve, reject) => {
        db.all(`SELECT role_id FROM jailer_roles WHERE server_id = ?`, [guildId], (err, rows) => {
          if (err) return reject(err);
          resolve(rows.map(r => r.role_id));
        });
      });
      isAllowed = jailerRoles.some(roleId => author.roles.cache.has(roleId));
    }

    if (!isAllowed)
      return sendError("You don't have permission to jail users.");

    // Check moderation limit
    const limitCheck = await checkModerationLimit(guildId, author.id, 'jail', db);
    if (!limitCheck.canProceed) {
      return sendError(`You have reached your daily jail limit (4/4). You can jail again tomorrow.`);
    }

    // Get the jailed role
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

    if (!jailedRoleRow)
      return sendError('No jailed role is configured for this server.');

    const jailedRole = message.guild.roles.cache.get(jailedRoleRow.role_id);
    if (!jailedRole)
      return sendError('The configured jailed role no longer exists.');

    // Get all roles to remove
    const rolesToRemove = target.roles.cache.filter(
      r => r.editable && r.id !== jailedRole.id
    );

    const previousRoles = rolesToRemove.map(r => r.id).join(',');

    // Save previous roles
    db.run(
      `INSERT INTO jailed_users (server_id, user_id, previous_roles) VALUES (?, ?, ?)`,
      [guildId, target.id, previousRoles],
      (err) => {
        if (err) console.error('❌ Failed to save previous roles:', err);
      }
    );

    try {
      await target.roles.remove(rolesToRemove);
      await target.roles.add(jailedRole);
    } catch (err) {
      console.error(err);
      return sendError('Failed to jail the user. I may be missing permissions.');
    }

    // DM the user (optional)
    const dmTitle = new TextDisplayBuilder().setContent('## You have been jailed');
    const dmBody = new TextDisplayBuilder().setContent(`You have been jailed in **${message.guild.name}**.\n**Reason**: ${reason}`);
    const dmContainer = new ContainerBuilder().addTextDisplayComponents(dmTitle, dmBody);

    const guildIcon = message.guild.iconURL();
    if (guildIcon) {
      const mediaGallery = new MediaGalleryBuilder().addItems(item => item.setURL(guildIcon));
      dmContainer.addMediaGalleryComponents(mediaGallery);
    }

    try {
      await target.send({ flags: MessageFlags.IsComponentsV2, components: [dmContainer] });
    } catch {}


    // Log to logs channel
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
      
          const logTitle = new TextDisplayBuilder().setContent(`### 🔨 User Jailed in ${message.guild.name}`);
          const logBody = new TextDisplayBuilder().setContent(
            `**User:** ➔ <@${target.id}> (\`${target.id}\`)\n` +
            `**Jailed By:** ➔ <@${author.id}> (\`${author.id}\`)\n` +
            `**Reason:** ➔ ${reason || 'No reason provided.'}`
          );
          const logContainer = new ContainerBuilder().addTextDisplayComponents(logTitle, logBody);

          if (guildIcon) {
            const mediaGallery = new MediaGalleryBuilder().addItems(item => item.setURL(guildIcon));
            logContainer.addMediaGalleryComponents(mediaGallery);
          }

          logChannel.send({ flags: MessageFlags.IsComponentsV2, components: [logContainer] });
        }
      }
      

    // Log in DB
    const timestamp = new Date().toISOString();
    db.run(
      `INSERT INTO jail_logs (jailer_id, user_id, reason, timestamp) VALUES (?, ?, ?, ?)`,
      [author.id, target.id, reason, timestamp]
    );

    // Increment moderation count
    await incrementModerationCount(guildId, author.id, 'jail', db);

    return sendSuccess(`Successfully jailed <@${target.id}>.\nDaily Limit: ${limitCheck.currentCount + 1}/4 (${limitCheck.remaining - 1} remaining)`);
  },
};
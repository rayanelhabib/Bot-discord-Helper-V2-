const { ContainerBuilder, TextDisplayBuilder, MediaGalleryBuilder, MessageFlags, PermissionsBitField } = require('discord.js');

module.exports = {
  name: 'verifyboy',
  aliases: ['vb'],
  async execute(message, args, client, db) {
    const sendReply = (desc, isError = false, isWarning = false) => {
      const prefix = isError ? '❌' : isWarning ? '⚠️' : '✅';
      const text = new TextDisplayBuilder().setContent(`${prefix} ${desc}`);
      const container = new ContainerBuilder().addTextDisplayComponents(text);
      return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    };

    if (!args[0]) {
      return sendReply('Please mention a user or provide a user ID.', true);
    }

    const target =
      message.mentions.members.first() ||
      message.guild.members.cache.get(args[0]) ||
      (await message.guild.members.fetch(args[0]).catch(() => null));

    if (!target) {
      return sendReply('Invalid user provided.', true);
    }

    const guildId = message.guild.id;

    db.get(
      `SELECT verified_role, unverified_role, verif_logs_channel FROM verification_settings WHERE server_id = ?`,
      [guildId],
      async (err, settingsRow) => {
        if (err || !settingsRow) {
          return sendReply('Verification system is not set up.', true);
        }

        const { verified_role, unverified_role, verif_logs_channel } = settingsRow;
        const isAdmin = message.member.permissions.has(PermissionsBitField.Flags.Administrator);
        let isVerificator = false;

        db.all(`SELECT role_id FROM verificators WHERE server_id = ?`, [guildId], async (err, rows) => {
          if (err) {
            console.error(err);
            return sendReply('Database error occurred.', true);
          }

          if (!isAdmin) {
            isVerificator = rows.some(row => message.member.roles.cache.has(row.role_id));
            if (!isVerificator) {
              return sendReply('You do not have permission to use this command.', true);
            }
          }

          if (target.roles.cache.has(verified_role)) {
            return sendReply('This user is already verified.', false, true);
          }

          if (!target.roles.cache.has(unverified_role)) {
            return sendReply('This user does not have the unverified role.', false, true);
          }

          try {
            const botMember = message.guild.members.me;
            const manageableRoles = target.roles.cache.filter(r => botMember.roles.highest.position > r.position);
            await target.roles.remove(unverified_role);
            await target.roles.add(verified_role);

            // DM Handling
            db.get(`SELECT verifembed FROM verification_settings WHERE server_id = ?`, [guildId], async (err, row) => {
              const sendDm = async (dmComponents) => {
                try {
                  await target.send({ flags: MessageFlags.IsComponentsV2, components: dmComponents });
                } catch (dmErr) {
                  console.warn(`⚠️ Could not DM user ${target.id}: ${dmErr.message}`);
                  sendReply(`<@${target.id}> verified, but I couldn't send them a DM (maybe DMs are off).`, false, true);
                }
              };

              if (!err && row?.verifembed) {
                try {
                  const parsed = JSON.parse(row.verifembed);
                  const embed = parsed.embeds?.[0];
                  const container = new ContainerBuilder();

                  if (embed) {
                    const textComponents = [];
                    if (embed.title) textComponents.push(new TextDisplayBuilder().setContent(`## ${embed.title}`));
                    if (embed.description) textComponents.push(new TextDisplayBuilder().setContent(embed.description));
                    if (embed.fields) {
                      const fieldsContent = embed.fields.map(f => `**${f.name}**\n${f.value}`).join('\n\n');
                      textComponents.push(new TextDisplayBuilder().setContent(fieldsContent));
                    }
                    if (embed.footer?.text) textComponents.push(new TextDisplayBuilder().setContent(embed.footer.text));
                    container.addTextDisplayComponents(...textComponents);

                    const mediaComponents = [];
                    if (embed.thumbnail?.url) mediaComponents.push(new MediaGalleryBuilder().addItems(item => item.setURL(embed.thumbnail.url)));
                    if (embed.image?.url) mediaComponents.push(new MediaGalleryBuilder().addItems(item => item.setURL(embed.image.url)));
                    if (mediaComponents.length > 0) container.addMediaGalleryComponents(...mediaComponents);
                  } else if (parsed.content) {
                     container.addTextDisplayComponents(new TextDisplayBuilder().setContent(parsed.content));
                  }

                  if (container.components.length > 0) {
                    return await sendDm([container]);
                  }
                } catch (parseErr) {
                  console.error('Failed to parse stored verifembed:', parseErr);
                }
              }

              // Fallback DM
              const fallbackText = new TextDisplayBuilder().setContent(`Hi <@${target.id}>, you have been verified in **${message.guild.name}**.`);
              const fallbackContainer = new ContainerBuilder().addTextDisplayComponents(fallbackText);
              await sendDm([fallbackContainer]);
            });
  

            // Log
            const logChannel = message.guild.channels.cache.get(verif_logs_channel);
            if (logChannel) {
              const logText = new TextDisplayBuilder().setContent(`## ✅ User Verified\n<@${target.id}> has been verified by <@${message.author.id}>`);
              const logContainer = new ContainerBuilder().addTextDisplayComponents(logText);
              logChannel.send({ flags: MessageFlags.IsComponentsV2, components: [logContainer] });
            }

            // Update verification count
            db.get(
              `SELECT count FROM verifications WHERE server_id = ? AND verificator_id = ?`,
              [guildId, message.author.id],
              (err, row) => {
                if (row) {
                  db.run(
                    `UPDATE verifications SET count = count + 1 WHERE server_id = ? AND verificator_id = ?`,
                    [guildId, message.author.id]
                  );
                } else {
                  db.run(
                    `INSERT INTO verifications (server_id, verificator_id, count) VALUES (?, ?, ?)`,
                    [guildId, message.author.id, 1]
                  );
                }
              }
            );

            return sendReply(`<@${target.id}> has been successfully verified.`);
          } catch (error) {
            console.error(error);
            return sendReply('Failed to verify user.', true);
          }
        });
      }
    );
  },
};

const { ContainerBuilder, TextDisplayBuilder, MessageFlags, MediaGalleryBuilder } = require('discord.js');

module.exports = {
  name: 'config',
  aliases: [],
  async execute(message, args, client, db) {
    const guildId = message.guild.id;
    const guild = message.guild;

    const getRoleTag = (id) => {
      const role = guild.roles.cache.get(id);
      return role ? `${role.name} (${role.id})` : '❌ Not set';
    };

    const getChannelTag = (id) => {
      const channel = guild.channels.cache.get(id);
      return channel ? `<#${channel.id}>` : '❌ Not set';
    };

    // Helper to join arrays or fallback text
    const joinOrNone = (arr) => (arr.length ? arr.join(', ') : '❌ None configured');

    try {
      // Fetch data from DB in parallel
      const [
        verifSettings,
        verificatorRows,
        jailSettings,
        jailerRows,
        jailedRoleRow,
        warnSettings,
      ] = await Promise.all([
        new Promise((res, rej) =>
          db.get(
            `SELECT * FROM verification_settings WHERE server_id = ?`,
            [guildId],
            (e, r) => (e ? rej(e) : res(r))
          )
        ),
        new Promise((res, rej) =>
          db.all(
            `SELECT role_id FROM verificators WHERE server_id = ?`,
            [guildId],
            (e, r) => (e ? rej(e) : res(r))
          )
        ),
        new Promise((res, rej) =>
          db.get(
            `SELECT jail_logs_channel FROM jail_settings WHERE server_id = ?`,
            [guildId],
            (e, r) => (e ? rej(e) : res(r))
          )
        ),
        new Promise((res, rej) =>
          db.all(
            `SELECT role_id FROM jailer_roles WHERE server_id = ?`,
            [guildId],
            (e, r) => (e ? rej(e) : res(r))
          )
        ),
        new Promise((res, rej) =>
          db.get(
            `SELECT role_id FROM jailed_roles WHERE server_id = ?`,
            [guildId],
            (e, r) => (e ? rej(e) : res(r))
          )
        ),
        new Promise((res, rej) =>
          db.get(
            `SELECT * FROM warn_settings WHERE guild_id = ?`,
            [guildId],
            (e, r) => (e ? rej(e) : res(r))
          )
        ),
      ]);

      const verificatorRoles = verificatorRows.map((r) => getRoleTag(r.role_id));
      const jailerRoles = jailerRows.map((r) => getRoleTag(r.role_id));
      const jailedRole = jailedRoleRow ? getRoleTag(jailedRoleRow.role_id) : '❌ Not set';

      // Build embed with clear sections and spacing
      const guildIcon = guild.iconURL({ dynamic: true, size: 256 });

      const titleText = new TextDisplayBuilder().setContent(`## ${guild.name} Configuration`);

      const verificationText = new TextDisplayBuilder().setContent(
        `### 🛡️ Verification Roles\n` +
        `**• Verified:** ➔ ${verifSettings ? getRoleTag(verifSettings.verified_role) : '❌ Not set'}\n` +
        `**• Verified Female:** ➔ ${verifSettings ? getRoleTag(verifSettings.verified_female_role) : '❌ Not set'}\n` +
        `**• Unverified:** ➔ ${verifSettings ? getRoleTag(verifSettings.unverified_role) : '❌ Not set'}\n` +
        `**🔧 Verificator Roles:** ➔ ${joinOrNone(verificatorRoles)}\n` +
        `**📥 Verification Logs Channel:** ➔ ${verifSettings ? getChannelTag(verifSettings.verif_logs_channel) : '❌ Not set'}`
      );

      const jailText = new TextDisplayBuilder().setContent(
        `### 🚨 Jail System\n` +
        `**• Jailed Role:** ➔ ${jailedRole || '❌ Not set'}\n` +
        `**• Jailer Roles:** ➔ ${joinOrNone(jailerRoles)}\n` +
        `**• Jail Logs Channel:** ➔ ${jailSettings ? getChannelTag(jailSettings.jail_logs_channel) : '❌ Not set'}`
      );

      const warnText = new TextDisplayBuilder().setContent(
        `### ⚠️ Warning System\n` +
        `**• First Warning Role:** ➔ ${warnSettings ? getRoleTag(warnSettings.first_warn_role) : '❌ Not set'}\n` +
        `**• Second Warning Role:** ➔ ${warnSettings ? getRoleTag(warnSettings.second_warn_role) : '❌ Not set'}\n` +
        `**• Last Warning Role:** ➔ ${warnSettings ? getRoleTag(warnSettings.last_warn_role) : '❌ Not set'}\n` +
        `**• Warner Role:** ➔ ${warnSettings ? getRoleTag(warnSettings.warner_role) : '❌ Not set'}\n` +
        `**• Warning Logs Channel:** ➔ ${warnSettings ? getChannelTag(warnSettings.logs_channel) : '❌ Not set'}`
      );

      const footerText = new TextDisplayBuilder().setContent(`> Server ID: ${guildId}`);

      const container = new ContainerBuilder()
        .addTextDisplayComponents(titleText, verificationText, jailText, warnText, footerText);

      return message.reply({
        flags: MessageFlags.IsComponentsV2,
        components: [container],
      });

    } catch (err) {
      console.error('Error fetching config:', err);
      return message.reply({ content: '❌ Failed to load server configuration.' });
    }
  },
};

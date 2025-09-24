const { AuditLogEvent, PermissionsBitField, EmbedBuilder } = require('discord.js');
const security = require('../utils/security');

function getTodayDateString() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function incrementAndGetTodayCount(guildId, userId, actionType, db) {
  return new Promise((resolve, reject) => {
    const dateStr = getTodayDateString();
    db.run(
      `INSERT INTO moderation_limits (guild_id, moderator_id, action_type, action_date, action_count)
       VALUES (?, ?, ?, ?, 1)
       ON CONFLICT(guild_id, moderator_id, action_type, action_date)
       DO UPDATE SET action_count = action_count + 1`,
      [guildId, userId, actionType, dateStr],
      function(err) {
        if (err) return reject(err);
        db.get(
          'SELECT action_count FROM moderation_limits WHERE guild_id = ? AND moderator_id = ? AND action_type = ? AND action_date = ?',
          [guildId, userId, actionType, dateStr],
          (e, row) => e ? reject(e) : resolve(row ? row.action_count : 1)
        );
      }
    );
  });
}

async function snapshotRoles(db, guildId, userId, rolesIterable) {
  try {
    const roleIds = [...rolesIterable]
      .filter(r => r && r.id)
      .map(r => r.id)
      .filter(id => id !== guildId); // exclude @everyone
    const rolesStr = roleIds.join(',');
    await new Promise((resolve, reject) => {
      db.run('INSERT INTO security_role_snapshots (server_id, user_id, roles) VALUES (?, ?, ?)', [guildId, userId, rolesStr], function(err) {
        if (err) return reject(err); resolve();
      });
    });
  } catch (_) {}
}

async function applyPunishment(member, punishment, db) {
  try {
    switch (punishment) {
      case 'clear_roles': {
        if (!member.manageable) return { ok: false, reason: 'not_manageable' };
        const rolesToRemove = member.roles.cache.filter(r => r.editable && r.id !== member.guild.id);
        await snapshotRoles(db, member.guild.id, member.id, rolesToRemove.values());
        for (const role of rolesToRemove.values()) {
          await member.roles.remove(role).catch(() => {});
        }
        return { ok: true };
      }
      case 'kick':
        if (!member.kickable) return { ok: false, reason: 'not_kickable' };
        await member.kick('Security auto-punishment');
        return { ok: true };
      case 'ban':
        if (!member.bannable) return { ok: false, reason: 'not_bannable' };
        await member.ban({ reason: 'Security auto-punishment' });
        return { ok: true };
      case 'timeout':
        if (!member.moderatable) return { ok: false, reason: 'not_moderatable' };
        const timeoutMs = 60 * 60 * 1000; // 1 hour default
        await member.timeout(timeoutMs, 'Security auto-punishment');
        return { ok: true };
      default:
        return { ok: false, reason: 'unknown' };
    }
  } catch (e) {
    return { ok: false, reason: 'exception' };
  }
}

async function sendSecurityLog(guild, channelId, embed) {
  if (!channelId) return;
  try {
    const channel = await guild.channels.fetch(channelId).catch(() => null);
    if (channel && channel.isTextBased()) {
      await channel.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error(`Failed to send security log to channel ${channelId} in guild ${guild.id}:`, error);
  }
}

function hasAuditPerm(guild) {
  const me = guild.members.me;
  return !!me?.permissions?.has(PermissionsBitField.Flags.ViewAuditLog);
}

function isRecent(entry, seconds = 30) {
  if (!entry?.createdTimestamp) return false;
  const ageMs = Date.now() - entry.createdTimestamp;
  return ageMs >= 0 && ageMs <= seconds * 1000;
}

async function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchAuditExecutor(guild, actions, targetId = null, attempts = 3, delayMs = 900) {
  if (!hasAuditPerm(guild)) return null;
  const actionSet = Array.isArray(actions) ? actions : [actions];
  for (let i = 0; i < attempts; i++) {
    const logs = await guild.fetchAuditLogs({ limit: 50, type: actionSet[0] }).catch(() => null);
    const entries = logs?.entries;
    if (entries) {
      const match = entries.find(e => actionSet.includes(e.action) && isRecent(e) && (!targetId || e.targetId === targetId));
      if (match?.executorId) return match.executorId;
    }
    if (i < attempts - 1) await delay(delayMs);
  }
  return null;
}

async function handleSecurityAction(opts) {
  const { guild, feature, executorId, client, db, contextLines } = opts;

  const executor = await guild.members.fetch(executorId).catch(() => null);
  if (!executor) return;

  const config = await security.getSecurityConfig(guild.id, db);
  if (!config || !config[`${feature}_enabled`]) return;

  if (executor.id === guild.ownerId) return;
  const isWL = await security.isWhitelisted(guild.id, feature, executorId, executor.roles.cache.map(r => r.id), db);
  if (isWL) return;

  const violation = await security.recordViolation(guild.id, executorId, feature, db);
  if (!violation) return;

  const count = violation.count;
  const max = config[`${feature}_max_violations`] || 1;
  const punishment = config[`${feature}_punishment`] || 'clear_roles';

  const logEmbed = new EmbedBuilder()
    .setColor('#ff4d4d')
    .setTitle('🛡️ Security Alert')
    .setThumbnail(executor.user.displayAvatarURL())
    .addFields(
      { name: 'Feature', value: feature.replace(/_/g, ' ').toUpperCase(), inline: true },
      { name: 'Executor', value: `<@${executorId}>`, inline: true },
      { name: 'Violations', value: `${count} / ${max}`, inline: true },
    )
    .setTimestamp();

  if (contextLines && contextLines.length > 0) {
    logEmbed.setDescription(contextLines.join('\n'));
  }

  if (count >= max) {
    const res = await applyPunishment(executor, punishment, db);
    const punishmentStatus = res.ok ? '✅ Applied' : `❌ Failed (${res.reason})`;
    logEmbed.addFields({ name: 'Punishment', value: `${punishment.toUpperCase()}\n${punishmentStatus}` });

    // Always reset this user's violations for this feature after we decide the outcome
    await security.resetViolationCount(guild.id, executorId, feature, db);
    if (res.ok) {
      logEmbed.setFooter({ text: 'User violations for this action have been reset.' });
    }
  } else {
    logEmbed.addFields({ name: 'Punishment', value: 'None' });
  }

  if (config.log_channel_id) {
    await sendSecurityLog(guild, config.log_channel_id, logEmbed);
  }
}

module.exports = {
  AuditLogEvent,
  handleSecurityAction,
  sendSecurityLog,
  hasAuditPerm,
  isRecent,
  fetchAuditExecutor,
};
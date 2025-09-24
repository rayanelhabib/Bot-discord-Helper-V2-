const { 
  ContainerBuilder, 
  TextDisplayBuilder, 
  MessageFlags, 
  PermissionsBitField 
} = require('discord.js');

module.exports = {
  name: 'setprefix',
  aliases: ['prefix', 'changeprefix'],
  description: 'Set custom prefix for this server (Admin only)',
  async execute(message, args, client, db) {
    const sendReply = (desc, isError = false) => {
      const prefix = isError ? '✗' : '✓';
      const text = new TextDisplayBuilder().setContent(`${prefix} ${desc}`);
      const container = new ContainerBuilder().addTextDisplayComponents(text);
      return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    };

    if (!message.guild) {
      return sendReply('This command can only be used in a server.', true);
    }

    // Check if user has admin permissions
    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return sendReply('You need **Administrator** permission to change the server prefix.', true);
    }

    // Check if bot has permission to manage messages (for logging)
    if (!message.channel.permissionsFor(message.guild.members.me).has(PermissionsBitField.Flags.ManageMessages)) {
      return sendReply('I need **Manage Messages** permission to properly handle prefix changes.', true);
    }

    // If no arguments, show current prefix
    if (!args[0]) {
      try {
        const currentPrefix = await getServerPrefix(message.guild.id);
        const prefixInfo = new TextDisplayBuilder().setContent(
          `**Current Server Prefix**\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
          `**Server:** ${message.guild.name}\n` +
          `**Current Prefix:** \`${currentPrefix}\`\n` +
          `**Default Prefix:** \`+\`\n\n` +
          `**Usage:** \`${currentPrefix}setprefix [new_prefix]\`\n` +
          `**Example:** \`${currentPrefix}setprefix !\`\n\n` +
          `> Only server administrators can change the prefix.\n` +
          `> The prefix must be 1-5 characters long.`
        );

        const container = new ContainerBuilder().addTextDisplayComponents(prefixInfo);
        return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
      } catch (error) {
        console.error('Error getting current prefix:', error);
        return sendReply('Failed to get current prefix. Please try again.', true);
      }
    }

    const newPrefix = args[0].trim();

    // Validate prefix
    if (newPrefix.length < 1 || newPrefix.length > 5) {
      return sendReply('Prefix must be between 1 and 5 characters long.', true);
    }

    // Check for problematic prefixes
    const problematicPrefixes = ['@', '@everyone', '@here', 'http', 'https', 'www'];
    if (problematicPrefixes.some(problematic => newPrefix.toLowerCase().includes(problematic))) {
      return sendReply('That prefix contains problematic characters. Please choose a different one.', true);
    }

    // Check if prefix contains only valid characters
    if (!/^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]+$/.test(newPrefix)) {
      return sendReply('Prefix contains invalid characters. Use only letters, numbers, and common symbols.', true);
    }

    try {
      // Set the new prefix
      await setServerPrefix(message.guild.id, newPrefix, message.author.id);

      const successText = new TextDisplayBuilder().setContent(
        `**Prefix Updated Successfully**\n\n` +
        `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
        `**Server:** ${message.guild.name}\n` +
        `**New Prefix:** \`${newPrefix}\`\n` +
        `**Set By:** <@${message.author.id}>\n` +
        `**Status:** ✓ Active\n\n` +
        `**Test Command:** \`${newPrefix}help\`\n\n` +
        `> Server prefix has been updated successfully.\n` +
        `> All commands now use the new prefix.`
      );

      const container = new ContainerBuilder().addTextDisplayComponents(successText);
      return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });

    } catch (error) {
      console.error('Error setting prefix:', error);
      return sendReply('Failed to set the new prefix. Please try again.', true);
    }
  },
};

// Helper functions (these should be available from the main file)
async function getServerPrefix(guildId) {
  return new Promise((resolve) => {
    const { Database } = require('sqlite3');
    const db = new Database('./database.db');
    db.get(
      'SELECT prefix FROM server_prefixes WHERE server_id = ?',
      [guildId],
      (err, row) => {
        if (err) {
          console.error('Error getting server prefix:', err);
          resolve('+'); // Default prefix
        } else {
          resolve(row ? row.prefix : '+'); // Default prefix if not set
        }
        db.close();
      }
    );
  });
}

async function setServerPrefix(guildId, prefix, setBy) {
  return new Promise((resolve, reject) => {
    const { Database } = require('sqlite3');
    const db = new Database('./database.db');
    db.run(
      'INSERT OR REPLACE INTO server_prefixes (server_id, prefix, set_by) VALUES (?, ?, ?)',
      [guildId, prefix, setBy],
      function(err) {
        if (err) {
          console.error('Error setting server prefix:', err);
          reject(err);
        } else {
          resolve(true);
        }
        db.close();
      }
    );
  });
} 
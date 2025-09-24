const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');

module.exports = {
  name: 'topverif',
  aliases: ['topv', 'vboard'],
  async execute(message, args, client, db) {
    const guildId = message.guild.id;

    db.all(
      `SELECT verificator_id, count FROM verifications WHERE server_id = ? ORDER BY count DESC LIMIT 10`,
      [guildId],
      async (err, rows) => {
        const sendReply = (desc, isError = false) => {
          const prefix = isError ? '❌' : '📭';
          const text = new TextDisplayBuilder().setContent(`${prefix} ${desc}`);
          const container = new ContainerBuilder().addTextDisplayComponents(text);
          return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
        };

        if (err) {
          console.error(err);
          return sendReply('Failed to retrieve leaderboard.', true);
        }

        if (rows.length === 0) {
          return sendReply('No verifications have been recorded yet.');
        }

        const titleText = new TextDisplayBuilder().setContent('## 🏆 Top Verificators Leaderboard');
        
        const userPromises = rows.map(async (row, i) => {
          const userId = row.verificator_id;
          let userName = `Unknown (${userId})`;
          try {
            const member = await message.guild.members.fetch(userId);
            userName = member.displayName;
          } catch (e) {
            console.warn(`Failed to fetch user ${userId}`);
          }
          return `#${i + 1} - **${userName}**\n✅ ${row.count} verifications`;
        });

        const descriptions = await Promise.all(userPromises);
        const bodyText = new TextDisplayBuilder().setContent(descriptions.join('\n\n'));

        const container = new ContainerBuilder().addTextDisplayComponents(titleText, bodyText);

        return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
      }
    );
  },
};

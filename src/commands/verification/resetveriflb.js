const { ContainerBuilder, TextDisplayBuilder, MessageFlags } = require('discord.js');

module.exports = {
  name: 'resetveriflb',
  aliases: ['resetvboard', 'resetverif'],
  async execute(message, args, client, db) {
        if (!message.member.permissions.has('Administrator')) {
      const text = new TextDisplayBuilder().setContent('❌ You must be an administrator to clear the verification leaderboard.');
      const container = new ContainerBuilder().addTextDisplayComponents(text);
      return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    }

    const guildId = message.guild.id;

    db.run(
      `DELETE FROM verifications WHERE server_id = ?`,
      [guildId],
      function (err) {
        if (err) {
          console.error(err);
                    const text = new TextDisplayBuilder().setContent('❌ Failed to clear the verification leaderboard.');
          const container = new ContainerBuilder().addTextDisplayComponents(text);
          return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
        }

                const text = new TextDisplayBuilder().setContent('✅ All verificators have been successfully cleared from the leaderboard.');
        const container = new ContainerBuilder().addTextDisplayComponents(text);
        return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
      }
    );
  },
};

const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} = require('discord.js');

module.exports = {
  name: 'coinflip',
  aliases: ['flip', 'coin', 'cf'],
  description: 'Flip a coin!',
  async execute(message, args, client, db) {
    const sendReply = (desc) => {
      const text = new TextDisplayBuilder().setContent(desc);
      const container = new ContainerBuilder().addTextDisplayComponents(text);
      return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    };

    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const emoji = result === 'heads' ? '🪙' : '🪙';
    
    const responseText = new TextDisplayBuilder().setContent(
      `${emoji} **Coin Flip**\n\n` +
      `**Result:** ${result.toUpperCase()}\n` +
      `**Flipped by:** <@${message.author.id}>`
    );

    const container = new ContainerBuilder().addTextDisplayComponents(responseText);
    return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
  },
}; 
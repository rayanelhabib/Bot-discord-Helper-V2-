const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} = require('discord.js');

module.exports = {
  name: 'dice',
  aliases: ['roll', 'd'],
  description: 'Roll some dice! Usage: +dice [number of dice]d[sides]',
  async execute(message, args, client, db) {
    const sendReply = (desc) => {
      const text = new TextDisplayBuilder().setContent(desc);
      const container = new ContainerBuilder().addTextDisplayComponents(text);
      return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    };

    let diceInput = args[0] || '1d6';
    
    // Parse dice notation (e.g., 2d20, 1d6, 3d10)
    const diceMatch = diceInput.match(/^(\d+)d(\d+)$/i);
    
    if (!diceMatch) {
      return sendReply('🎲 Please use the format: `+dice [number]d[sides]`\nExamples: `+dice 1d6`, `+dice 2d20`, `+dice 3d10`');
    }

    const numDice = parseInt(diceMatch[1]);
    const sides = parseInt(diceMatch[2]);

    // Limits to prevent spam
    if (numDice > 10) {
      return sendReply('🎲 You can only roll up to 10 dice at once!');
    }

    if (sides > 100) {
      return sendReply('🎲 Maximum sides per die is 100!');
    }

    if (sides < 2) {
      return sendReply('🎲 A die must have at least 2 sides!');
    }

    const rolls = [];
    let total = 0;

    for (let i = 0; i < numDice; i++) {
      const roll = Math.floor(Math.random() * sides) + 1;
      rolls.push(roll);
      total += roll;
    }

    const rollsText = rolls.join(', ');
    const resultText = numDice > 1 ? `**Total:** ${total}` : '';
    
    const responseText = new TextDisplayBuilder().setContent(
      `🎲 **Dice Roll**\n\n` +
      `**Rolling:** ${numDice}d${sides}\n` +
      `**Results:** ${rollsText}\n` +
      `${resultText}\n` +
      `**Rolled by:** <@${message.author.id}>`
    );

    const container = new ContainerBuilder().addTextDisplayComponents(responseText);
    return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
  },
}; 
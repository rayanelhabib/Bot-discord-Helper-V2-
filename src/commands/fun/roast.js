const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} = require('discord.js');

module.exports = {
  name: 'roast',
  aliases: ['burn', 'insult'],
  description: 'Get roasted! (All in good fun)',
  async execute(message, args, client, db) {
    const sendReply = (desc) => {
      const text = new TextDisplayBuilder().setContent(desc);
      const container = new ContainerBuilder().addTextDisplayComponents(text);
      return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    };

    const target = message.mentions.users.first() || message.author;
    
    const roasts = [
      `🔥 ${target} is so slow, they could win a race against a statue!`,
      `🔥 ${target} is so forgetful, they probably forgot their own name!`,
      `🔥 ${target} is so unlucky, they could win the lottery and still be broke!`,
      `🔥 ${target} is so lazy, they consider breathing exercise!`,
      `🔥 ${target} is so bad at cooking, they could burn water!`,
      `🔥 ${target} is so clumsy, they trip over wireless headphones!`,
      `🔥 ${target} is so indecisive, they can't even pick a favorite color!`,
      `🔥 ${target} is so slow at typing, they use carrier pigeons for emails!`,
      `🔥 ${target} is so bad at directions, they get lost in their own house!`,
      `🔥 ${target} is so forgetful, they probably forgot they're being roasted right now!`,
      `🔥 ${target} is so bad at jokes, they make dad jokes look cool!`,
      `🔥 ${target} is so slow, they could win a race against a sloth!`,
      `🔥 ${target} is so unlucky, they could find a four-leaf clover and still have bad luck!`,
      `🔥 ${target} is so bad at math, they need a calculator to count to 10!`,
      `🔥 ${target} is so forgetful, they probably forgot what they were doing!`,
      `🔥 ${target} is so slow, they could win a race against a turtle!`,
      `🔥 ${target} is so bad at cooking, they could burn ice!`,
      `🔥 ${target} is so clumsy, they trip over their own shadow!`,
      `🔥 ${target} is so indecisive, they can't even decide what to eat!`,
      `🔥 ${target} is so slow at typing, they use smoke signals for texting!`
    ];

    const randomRoast = roasts[Math.floor(Math.random() * roasts.length)];
    
    const responseText = new TextDisplayBuilder().setContent(
      `🔥 **Roast Time!**\n\n` +
      `${randomRoast}\n\n` +
      `*Remember, this is all in good fun! 😄*`
    );

    const container = new ContainerBuilder().addTextDisplayComponents(responseText);
    return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
  },
}; 
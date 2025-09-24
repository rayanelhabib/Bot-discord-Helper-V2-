const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} = require('discord.js');

module.exports = {
  name: '8ball',
  aliases: ['8b', 'magic8ball'],
  description: 'Ask the magic 8-ball a question!',
  async execute(message, args, client, db) {
    const sendReply = (desc) => {
      const text = new TextDisplayBuilder().setContent(desc);
      const container = new ContainerBuilder().addTextDisplayComponents(text);
      return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    };

    if (args.length === 0) {
      return sendReply('❓ Please ask me a question! Usage: `+8ball [your question]`');
    }

    const question = args.join(' ');
    const responses = [
      '🎱 **It is certain**',
      '🎱 **It is decidedly so**',
      '🎱 **Without a doubt**',
      '🎱 **Yes, definitely**',
      '🎱 **You may rely on it**',
      '🎱 **As I see it, yes**',
      '🎱 **Most likely**',
      '🎱 **Outlook good**',
      '🎱 **Yes**',
      '🎱 **Signs point to yes**',
      '🎱 **Reply hazy, try again**',
      '🎱 **Ask again later**',
      '🎱 **Better not tell you now**',
      '🎱 **Cannot predict now**',
      '🎱 **Concentrate and ask again**',
      '🎱 **Don\'t count on it**',
      '🎱 **My reply is no**',
      '🎱 **My sources say no**',
      '🎱 **Outlook not so good**',
      '🎱 **Very doubtful**'
    ];

    const randomResponse = responses[Math.floor(Math.random() * responses.length)];
    
    const responseText = new TextDisplayBuilder().setContent(
      `🎱 **Magic 8-Ball**\n\n` +
      `**Question:** ${question}\n\n` +
      `**Answer:** ${randomResponse}`
    );

    const container = new ContainerBuilder().addTextDisplayComponents(responseText);
    return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
  },
}; 
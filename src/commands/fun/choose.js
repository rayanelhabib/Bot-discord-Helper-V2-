const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} = require('discord.js');

module.exports = {
  name: 'choose',
  aliases: ['pick', 'choice'],
  description: 'Let me choose for you! Usage: +choose [option1] [option2] [option3]...',
  async execute(message, args, client, db) {
    const sendReply = (desc) => {
      const text = new TextDisplayBuilder().setContent(desc);
      const container = new ContainerBuilder().addTextDisplayComponents(text);
      return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    };

    if (args.length < 2) {
      return sendReply('🤔 Please provide at least 2 options to choose from!\nUsage: `+choose [option1] [option2] [option3]...`');
    }

    const choices = args;
    const randomChoice = choices[Math.floor(Math.random() * choices.length)];
    
    const responseText = new TextDisplayBuilder().setContent(
      `🤔 **I Choose...**\n\n` +
      `**Options:** ${choices.join(', ')}\n\n` +
      `**My choice:** **${randomChoice}**\n` +
      `**Chosen for:** <@${message.author.id}>`
    );

    const container = new ContainerBuilder().addTextDisplayComponents(responseText);
    return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
  },
}; 
const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} = require('discord.js');

module.exports = {
  name: 'compliment',
  aliases: ['nice', 'praise'],
  description: 'Get a nice compliment!',
  async execute(message, args, client, db) {
    const sendReply = (desc) => {
      const text = new TextDisplayBuilder().setContent(desc);
      const container = new ContainerBuilder().addTextDisplayComponents(text);
      return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    };

    const target = message.mentions.users.first() || message.author;
    
    const compliments = [
      `💖 ${target} is absolutely amazing and deserves all the happiness in the world!`,
      `💖 ${target} has the most beautiful smile that brightens everyone's day!`,
      `💖 ${target} is incredibly kind and always knows how to make others feel better!`,
      `💖 ${target} is so talented, they could probably do anything they set their mind to!`,
      `💖 ${target} has the best sense of humor and always makes people laugh!`,
      `💖 ${target} is such a wonderful person with a heart of gold!`,
      `💖 ${target} is incredibly smart and always has the best ideas!`,
      `💖 ${target} is so thoughtful and always remembers the little things!`,
      `💖 ${target} has the most positive energy that's absolutely contagious!`,
      `💖 ${target} is such a great friend and always there when people need them!`,
      `💖 ${target} is incredibly creative and has such a unique perspective!`,
      `💖 ${target} is so inspiring and motivates others to be their best selves!`,
      `💖 ${target} has the most beautiful personality that shines through everything they do!`,
      `💖 ${target} is incredibly patient and understanding with everyone around them!`,
      `💖 ${target} is so generous and always willing to help others!`,
      `💖 ${target} has the most amazing spirit that lifts everyone up!`,
      `💖 ${target} is incredibly wise and always gives the best advice!`,
      `💖 ${target} is so genuine and authentic in everything they do!`,
      `💖 ${target} has the most wonderful aura that makes everyone feel comfortable!`,
      `💖 ${target} is absolutely perfect just the way they are!`
    ];

    const randomCompliment = compliments[Math.floor(Math.random() * compliments.length)];
    
    const responseText = new TextDisplayBuilder().setContent(
      `💖 **Compliment Time!**\n\n` +
      `${randomCompliment}\n\n` +
      `*Spread the love! 💕*`
    );

    const container = new ContainerBuilder().addTextDisplayComponents(responseText);
    return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
  },
}; 
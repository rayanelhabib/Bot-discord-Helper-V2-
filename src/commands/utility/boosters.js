const {
  ContainerBuilder,
  TextDisplayBuilder,
  MessageFlags
} = require('discord.js');

module.exports = {
  name: 'boosters',
  aliases: ['boosts', 'nitro'],
  description: 'Show a list of users boosting the server with boost information.',
  async execute(message, args, client, db) {
    const sendReply = (desc, isError = false) => {
      const prefix = isError ? '❌' : '✅';
      const text = new TextDisplayBuilder().setContent(`${prefix} ${desc}`);
      const container = new ContainerBuilder().addTextDisplayComponents(text);
      return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
    };

    if (!message.guild) {
      return sendReply('This command can only be used in a server.', true);
    }

    // Get all boosters from the guild
    let boosters = message.guild.members.cache.filter(member => member.premiumSince);

    // Always try to fetch members to get the most up-to-date data
    try {
      // Fetch all members to ensure we have the latest data
      await message.guild.members.fetch();
      boosters = message.guild.members.cache.filter(member => member.premiumSince);
    } catch (error) {
      console.error('Error fetching members:', error);
    }

    // Debug: Log all members with premiumSince
    console.log('All members with premiumSince:', boosters.map(m => `${m.user.tag} (${m.premiumSince})`));

    if (boosters.size === 0) {
      // Debug: Check if we can see any members at all
      const totalMembers = message.guild.members.cache.size;
      return sendReply(`No users are currently boosting this server. (Total members cached: ${totalMembers})`, true);
    }

    // Debug: Show how many boosters we found vs server total
    console.log(`Found ${boosters.size} boosters, server has ${message.guild.premiumSubscriptionCount} total boosts`);

    // Sort boosters by boost time (oldest first)
    const sortedBoosters = boosters.sort((a, b) => a.premiumSince - b.premiumSince);

    // Create clean design with boosters
    let wheelContent = `# **${message.guild.name} Boosters**\n\n`;
    
    // Add server boost level info
    const boostLevel = message.guild.premiumTier;
    const boostCount = message.guild.premiumSubscriptionCount;
    wheelContent += `**Server Boost Level:** ${boostLevel} (${boostCount} boosts)\n\n`;

    // Create clean design with symbols
    const wheelSymbols = ['◦', '○', '●', '▪', '▫', '□', '■', '◆', '◇', '♦', '♢', '♠', '♣', '♥', '♡'];
    let symbolIndex = 0;

    sortedBoosters.forEach((booster, index) => {
      const symbol = wheelSymbols[symbolIndex % wheelSymbols.length];
      const boostTime = Math.floor(booster.premiumSince.getTime() / 1000);
      
      // Check if this user has multiple boosts
      // We can't directly get boost count from Discord API, so we'll show based on server total
      // If there's only 1 booster but 3 total boosts, they likely have multiple boosts
      const userBoostCount = boosters.size === 1 && message.guild.premiumSubscriptionCount > 1 ? 
        message.guild.premiumSubscriptionCount : 1;
      
      wheelContent += `## ${symbol} **${booster.user.tag}**\n`;
      wheelContent += `   * <t:${boostTime}:R>\n`;
      wheelContent += `   * ${userBoostCount} boost${userBoostCount > 1 ? 's' : ''}\n\n`;
      
      symbolIndex++;
    });

    // Add footer
    wheelContent += `**Total Boosters:** ${boosters.size}`;

    const boostersText = new TextDisplayBuilder().setContent(wheelContent);
    const container = new ContainerBuilder().addTextDisplayComponents(boostersText);

    return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
  },
}; 
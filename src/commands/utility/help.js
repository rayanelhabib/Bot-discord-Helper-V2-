const {
  MessageFlags,
  TextDisplayBuilder,
  ContainerBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  SeparatorBuilder,
} = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

// --- Helper function to count lines ---
async function countLines() {
  const targetDirs = ['.', './src/commands', './src/events', './src/interactions'];
  const allowedExtensions = ['.js'];
  const excludedDirs = ['node_modules', '.git', 'sqlite', 'database', 'data'];
  let totalLines = 0;

  async function countLinesInFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return content.split('\n').length;
    } catch {
      return 0;
    }
  }

  async function scanDirectory(dirPath) {
    try {
      const entries = await fs.readdir(dirPath);
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry);
        const stat = await fs.stat(fullPath);
        if (stat.isDirectory()) {
          if (!excludedDirs.includes(entry)) await scanDirectory(fullPath);
        } else if (allowedExtensions.includes(path.extname(entry))) {
          totalLines += await countLinesInFile(fullPath);
        }
      }
    } catch {
      // Directory doesn't exist or can't be read
    }
  }

  for (const dir of targetDirs) {
    await scanDirectory(path.resolve(dir));
  }
  return totalLines;
}

// --- Command Data with Modern Symbols ---
const helpData = {
  moderation: {
    label: 'Moderation',
    emoji: '⚔',
    description: 'Advanced moderation with daily limits & role progression',
    color: '•',
    commands: [
      { name: '[prefix]warn [user] [reason]', value: '→ Warn user with automatic role progression (4/4 daily limit)' },
      { name: '[prefix]unwarn [user]', value: '→ Remove last warning & adjust level' },
      { name: '[prefix]warnings [user]', value: '→ View detailed warning history & status' },
      { name: '[prefix]clearwarnings [user]', value: '→ Clear all warnings for user' },
      { name: '[prefix]ban [user] [reason]', value: '→ Ban user from server (4/4 daily limit)' },
      { name: '[prefix]unban [user]', value: '→ Unban user from server' },
      { name: '[prefix]kick [user] [reason]', value: '→ Kick user from server (4/4 daily limit)' },
      { name: '[prefix]timeout [user] [duration] [reason]', value: '→ Timeout user (4/4 daily limit)' },
      { name: '[prefix]untimeout [user]', value: '→ Remove timeout from user' },
      { name: '[prefix]jail [user] [reason]', value: '→ Jail user (remove roles, add jail role) (4/4 daily limit)' },
      { name: '[prefix]unjail [user]', value: '→ Unjail user (restore previous roles)' },
      { name: '[prefix]jailinfo [user]', value: '→ View jail information for user' },
    ],
  },
  setup: {
    label: 'Setup',
    emoji: '⚙',
    description: 'Slash commands for server configuration',
    color: '•',
    commands: [
      { name: '/warnsetup', value: '→ Setup warning system with roles & logs' },
      { name: '/setup-jail', value: '→ Setup jail system with roles & logs' },
      { name: '/setup-verif', value: '→ Setup verification system' },
      { name: '/setverifembed', value: '→ Set custom verification embed' },
      { name: '/security-setup', value: '→ Setup advanced security systems & monitoring' },
      { name: '/security-enable', value: '→ Enable security features with optional punishment type & max violations settings' },
      { name: '/security-disable', value: '→ Disable specific security features' },
      { name: '/security-violations', value: '→ View and manage security violations' },
      { name: '/security-whitelist', value: '→ Manage security whitelist for trusted users' },
      { name: '/restore-roles', value: '→ Restore roles for users after incidents' },
      { name: '/setlogchannel', value: '→ Set general logging channel for server' },
    ],
  },
  verification: {
    label: 'Verification',
    emoji: '✓',
    description: 'Gender-based verification with statistics',
    color: '•',
    commands: [
      { name: '[prefix]verifyboy [user]', value: '→ Verify user as male (requires verificator role)' },
      { name: '[prefix]verifygirl [user]', value: '→ Verify user as female (requires verificator role)' },
      { name: '[prefix]topverif', value: '→ Show top verificators leaderboard' },
      { name: '[prefix]seeverifembed', value: '→ View current verification embed' },
      { name: '[prefix]resetveriflb', value: '→ Reset verification leaderboard' },
    ],
  },
  security: {
    label: 'Security',
    emoji: '🛡',
    description: 'Advanced server security & protection systems',
    color: '•',
    commands: [
      { name: '[prefix]enable [command]', value: '→ Enable disabled command in server' },
      { name: '[prefix]disable [command]', value: '→ Disable command in server' },
      { name: '[prefix]antibot [on/off]', value: '→ Enable/disable anti-bot protection' },
      { name: '[prefix]setsecuritylogs [channel]', value: '→ Set security logs channel' },
      { name: '[prefix]setlogchannel [channel]', value: '→ Set general log channel for server' },
      { name: '[prefix]security', value: '→ Advanced security dashboard with threat detection' },
      { name: '[prefix]rr', value: '→ Reaction role management system' },
    ],
  },
  utility: {
    label: 'Utility',
    emoji: '⚡',
    description: 'Server management & utility tools',
    color: '•',
    commands: [
      { name: '[prefix]config', value: '→ View server configuration & settings' },
      { name: '[prefix]autorole [show/off/set] [role]', value: '→ Manage automatic role assignment' },
      { name: '[prefix]addemojie [emoji] [name]', value: '→ Add custom emoji to server (Admin/Manager)' },
      { name: '[prefix]list [role]', value: '→ List all members with specific role' },
      { name: '[prefix]show [channel]', value: '→ Show hidden channel' },
      { name: '[prefix]hide [channel]', value: '→ Hide channel' },
      { name: '[prefix]boosters', value: '→ List server boosters' },
      { name: '[prefix]add [role] [user]', value: '→ Add role to user' },
      { name: '[prefix]remove [role] [user]', value: '→ Remove role from user' },
      { name: '[prefix]clear [amount]', value: '→ Clear messages from channel' },
      { name: '[prefix]find [user]', value: '→ Find user in server' },
      { name: '[prefix]setservertag [tag]', value: '→ Set server tag for new members' },
      { name: '[prefix]setprefix [new_prefix]', value: '→ Set custom prefix for this server (Admin only)' },
      { name: '[prefix]yt [url]', value: '→ Download YouTube video as MP3 audio file' },
      { name: '[prefix]ytmp4 [url]', value: '→ Download YouTube video as MP4 video file' },
    ],
  },
  fun: {
    label: 'Fun',
    emoji: '🎮',
    description: 'Entertainment commands for everyone',
    color: '•',
    commands: [
      { name: '[prefix]8ball [question]', value: '→ Ask magic 8-ball a question' },
      { name: '[prefix]coinflip', value: '→ Flip a coin (heads/tails)' },
      { name: '[prefix]dice [number]d[sides]', value: '→ Roll dice (e.g., 2d6 for 2 six-sided dice)' },
      { name: '[prefix]choose [option1] [option2] ...', value: '→ Choose between multiple options' },
      { name: '[prefix]roast [user]', value: '→ Generate funny roast for user' },
      { name: '[prefix]compliment [user]', value: '→ Generate nice compliment for user' },
      { name: '[prefix]ascii [text]', value: '→ Convert text to ASCII art' },
    ],
  },
  voice: {
    label: 'Voice',
    emoji: '🎤',
    description: 'Real-time voice channel management & live statistics',
    color: '•',
    commands: [
      { name: '[prefix]vc', value: '→ **Live voice & server statistics** - Real-time member counts, voice states, and channel info (View Channels)' },
      { name: '[prefix]vclist [channel]', value: '→ **Live member list** - Show real-time list of members in voice channel with status (View Channels)' },
      { name: '[prefix]fmove [user] [channel]', value: '→ **Move members** - Move user to another voice channel with live data (Move Members)' },
      { name: '[prefix]vmute [user]', value: '→ **Voice mute** - Server mute a member in voice with live state checking (Mute Members)' },
      { name: '[prefix]vunmute [user]', value: '→ **Voice unmute** - Remove server mute with live state verification (Mute Members)' },
      { name: '[prefix]vdeafen [user]', value: '→ **Voice deafen** - Server deafen a member with live state checking (Deafen Members)' },
      { name: '[prefix]vundeafen [user]', value: '→ **Voice undeafen** - Remove server deafen with live state verification (Deafen Members)' },
      { name: '[prefix]vkick [user]', value: '→ **Voice kick** - Kick member from voice channel with live verification (Move Members)' },
      { name: '[prefix]setvoicestate [channel]', value: '→ **Auto-updating voice counter** - Set channel to show live voice member count' },
      { name: '[prefix]activity [on/off]', value: '→ **Voice activity** - Enable/disable activity features in voice channel (Manage Channels)' },
      { name: '[prefix]cam [on/off]', value: '→ **Voice camera** - Enable/disable camera features in voice channel (Manage Channels)' },
      { name: '[prefix]sb [on/off]', value: '→ **Voice soundboard** - Enable/disable soundboard features in voice channel (Manage Channels)' },
    ],
  },
  noprefix: {
    label: 'No-Prefix',
    emoji: '⚡',
    description: 'Quick commands that work without any prefix',
    color: '•',
    commands: [
      { name: 'avatar [user]', value: '→ Display user avatar in high quality (4096px)' },
      { name: 'a [user]', value: '→ Alias for avatar command' },
      { name: 'banner [user]', value: '→ Display user banner in high quality' },
      { name: 'b [user]', value: '→ Alias for banner command' },
      { name: 'user [user]', value: '→ Show detailed user information and profile' },
      { name: 'userinfo [user]', value: '→ Alias for user command' },
      { name: 'u [user]', value: '→ Short alias for user command' },
      { name: 'ms77 [amount]', value: '→ Bulk delete messages (Admin/Manage Messages only)' },
    ],
  },
};

// Helper function to get server prefix
async function getServerPrefix(guildId) {
  return new Promise((resolve) => {
    const { Database } = require('sqlite3');
    const db = new Database('./data/database.db');
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

module.exports = {
  name: 'help',
  aliases: ['h', 'commands', 'cmd', 'menu'],
  description: 'Show interactive bot help menu with categories',
  async execute(message, args, client, db) {
    const totalLines = await countLines();
    const serverLink = 'https://discord.gg/NKBk9SaSUC'; // Replace with your support server
    
    // Get server-specific prefix
    const serverPrefix = message.guild ? await getServerPrefix(message.guild.id) : '+';

    // --- Main Help Components ---
    const titleText = new TextDisplayBuilder().setContent('# Paul Prog\'s Helper Bot');

    const descriptionText = new TextDisplayBuilder().setContent(
      `> **Welcome to Paul Prog's Helper!**\n\n` +
      `A powerful Discord bot with **advanced moderation**, **verification systems**, **enhanced security features**, **real-time voice management**, **YouTube downloads**, **no-prefix quick commands**, and **comprehensive utility tools**.\n\n` +
      `**Quick Start:** Use the menu below to explore commands by category!\n` +
      `**Voice Commands:** Now with **live real-time data** instead of cached information!\n` +
      `**Security:** Enhanced protection with advanced threat detection & monitoring!\n` +
      `**No-Prefix:** Quick commands that work without any prefix - just type the command name!`
    );

    const statsText = new TextDisplayBuilder().setContent(
      `**Bot Overview**\n` +
      `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
      `**Code Lines:** ${totalLines.toLocaleString()}\n` +
      `**Categories:** ${Object.keys(helpData).length}\n` +
      `**Commands:** ${Object.values(helpData).reduce((sum, cat) => sum + cat.commands.length, 0)}\n` +
      `**Voice Commands:** 12 commands with **live real-time data**\n` +
      `**Prefix:** \`${serverPrefix}\`\n` +
      `**Slash Commands:** Available for setup`
    );

    const footerText = new TextDisplayBuilder().setContent(
      `**Tip:** Click the menu below to explore commands • Voice commands use **live data** • **No-prefix commands** available • Enhanced **security features** • [Support Server](${serverLink})`
    );

    // --- Interactive Components ---
    const selectMenuOptions = Object.keys(helpData).map(key => ({
      label: `${helpData[key].emoji} ${helpData[key].label}`,
      description: `${helpData[key].description.substring(0, 50)}...`,
      value: key,
    }));

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId('help-category-select')
      .setPlaceholder('Choose a category to explore commands')
      .addOptions(selectMenuOptions);

    const supportButton = new ButtonBuilder()
      .setLabel('Support')
      .setStyle(ButtonStyle.Link)
      .setURL(serverLink);

    const inviteButton = new ButtonBuilder()
      .setLabel('Paul Dev DashBoard')
      .setStyle(ButtonStyle.Link)
      .setURL('https://discord.gg/NKBk9SaSUC');

    const separator = new SeparatorBuilder();
    const buttonActionRow = new ActionRowBuilder().addComponents(supportButton, inviteButton);
    const menuActionRow = new ActionRowBuilder().addComponents(selectMenu);

    // Main payload
    const mainPayload = {
      flags: MessageFlags.IsComponentsV2,
      components: [
        {
          type: 17, // Container
          components: [
            titleText.toJSON(),
            descriptionText.toJSON(),
            separator.toJSON(),
            statsText.toJSON(),
            separator.toJSON(),
            menuActionRow.toJSON(),
            buttonActionRow.toJSON(),
            footerText.toJSON(),
          ],
        },
      ],
    };

    const sentMessage = await message.channel.send(mainPayload);

    const collector = sentMessage.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 300000, // 5 minutes
      filter: i => i.user.id === message.author.id,
    });

    collector.on('collect', async interaction => {
      const selectedKey = interaction.values[0];
      const category = helpData[selectedKey];

      // --- Category Help Components ---
      const categoryTitle = new TextDisplayBuilder().setContent(`# ${category.emoji} ${category.label} Commands`);

      const categoryDescription = new TextDisplayBuilder().setContent(
        `> **${category.description}**\n\n` +
        `**Category:** ${category.label}\n` +
        `**Commands:** ${category.commands.length} available\n` +
        `**Usage:** ${selectedKey === 'noprefix' ? 'No prefix needed - just type the command name!' : `Use \`${serverPrefix}\` prefix for all commands`}` +
        (selectedKey === 'voice' ? `\n**Feature:** All voice commands now use **live real-time data** instead of cached information!` : '') +
        (selectedKey === 'noprefix' ? `\n**Feature:** These commands work **instantly** without any prefix - perfect for quick actions!` : '')
      );
      
      const commandTexts = category.commands.map(cmd => {
        // Special handling for no-prefix commands
        const displayName = selectedKey === 'noprefix' 
          ? cmd.name 
          : cmd.name.replace('[prefix]', serverPrefix);
        return new TextDisplayBuilder().setContent(`**\`${displayName}\`**\n${cmd.value}`);
      });

      const categoryFooter = new TextDisplayBuilder().setContent(
        `**Navigation:** Use the menu to switch categories • Voice commands feature **real-time data** • **No-prefix commands** work instantly • Enhanced **security protection** • [Support](${serverLink})`
      );

      const categoryPayload = {
        flags: MessageFlags.IsComponentsV2,
        components: [
          {
            type: 17, // Container
            components: [
              categoryTitle.toJSON(),
              categoryDescription.toJSON(),
              separator.toJSON(),
              ...commandTexts.map(c => c.toJSON()),
              separator.toJSON(),
              menuActionRow.toJSON(),
              buttonActionRow.toJSON(),
              categoryFooter.toJSON(),
            ],
          },
        ],
      };

      await interaction.update(categoryPayload);
    });

    collector.on('end', async () => {
      try {
        const disabledMenuActionRow = new ActionRowBuilder().addComponents(selectMenu.setDisabled(true));
        const expiredText = new TextDisplayBuilder().setContent(
          `**Help menu expired**\n\nUse \`${serverPrefix}help\` again to view the interactive help menu.`
        );

        const finalPayload = {
          flags: MessageFlags.IsComponentsV2,
          components: [
            {
              type: 17, // Container
              components: [
                titleText.toJSON(),
                descriptionText.toJSON(),
                separator.toJSON(),
                expiredText.toJSON(),
                separator.toJSON(),
                disabledMenuActionRow.toJSON(),
                buttonActionRow.toJSON(),
                footerText.toJSON(),
              ],
            },
          ],
        };
        await sentMessage.edit(finalPayload);
      } catch (error) {
        console.error('Failed to disable help menu:', error);
      }
    });
  },
}; 

# 🤖 Paul Prog's Helper Bot

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)](https://nodejs.org/)
[![Discord.js](https://img.shields.io/badge/discord.js-v14-blue.svg)](https://discord.js.org/)

> **Developed by [@rayanelhabib](https://github.com/rayanelhabib)** | **Support: [Discord Server](https://discord.gg/9h9DQac2HK)**

A comprehensive Discord bot with advanced moderation, security, verification, and voice management features.

## ✨ Features

### 🛡️ **Advanced Security System**
- **10+ Protection Types**: Ban, kick, channel/role management, bot addition protection
- **Violation Tracking**: Per-user violation counting with configurable limits
- **Whitelist System**: Trusted users/roles exempt from security measures
- **Real-time Monitoring**: Live threat detection and response

### ⚔️ **Comprehensive Moderation**
- **Daily Limits**: 4 actions per day per moderator to prevent abuse
- **Warning System**: Progressive role-based warnings with automatic escalation
- **Jail System**: Temporary role removal with restoration capabilities
- **Comprehensive Logging**: All actions logged with detailed information

### ✓ **Verification System**
- **Gender-based Verification**: Separate verification for male/female users
- **Verificator Roles**: Role-based permission system for verifiers
- **Statistics Tracking**: Leaderboard for top verificators
- **Custom Embeds**: Configurable verification messages

### 🎤 **Voice Management**
- **Real-time Data**: Live voice statistics instead of cached data
- **Voice Moderation**: Mute, deafen, kick, and move users
- **Live Member Lists**: Real-time voice channel member tracking
- **Auto-updating Counters**: Dynamic voice member count displays

### 🎮 **Entertainment & Utility**
- **Fun Commands**: 8-ball, dice, coinflip, roasts, compliments
- **YouTube Downloads**: MP3 and MP4 video downloads
- **No-Prefix Commands**: Quick access commands without prefix
- **Customizable Prefixes**: Per-server command prefixes

## 🚀 Quick Start

### Prerequisites
- Node.js 16.0.0 or higher
- Discord Bot Token
- Basic knowledge of Discord.js

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/rayanelhabib/Bot-discord-Helper-V2-.git
   cd Bot-discord-Helper-V2-
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your Discord bot token and other settings
   ```

4. **Start the bot**
   ```bash
   npm start
   ```

### Docker Installation

```bash
# Build and run with Docker Compose
docker-compose up -d
```

## 📁 Project Structure

```
paul-progs-helper/
├── src/                    # Source code
│   ├── commands/          # All bot commands
│   ├── events/            # Discord event handlers
│   ├── interactions/      # Slash commands
│   ├── no-prefix/         # No-prefix commands
│   ├── utils/             # Utility functions
│   ├── database/          # Database management
│   └── config/            # Configuration files
├── assets/                # Static resources
├── data/                  # Database and logs
└── scripts/               # Utility scripts
```

## ⚙️ Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DISCORD_TOKEN` | Your Discord bot token | ✅ |
| `BOT_PREFIX` | Default command prefix | ❌ |
| `BOT_OWNER_ID` | Bot owner's Discord ID | ❌ |
| `DATABASE_PATH` | Path to SQLite database | ❌ |
| `LOG_LEVEL` | Logging level (info, debug, error) | ❌ |

### Bot Permissions

The bot requires the following permissions:
- **Administrator** (recommended) or specific permissions:
  - Manage Roles
  - Manage Channels
  - Manage Messages
  - Kick Members
  - Ban Members
  - Manage Nicknames
  - View Channels
  - Send Messages
  - Embed Links
  - Attach Files
  - Read Message History
  - Use External Emojis
  - Add Reactions

## 🛠️ Development

### Available Scripts

```bash
npm start          # Start the bot
npm run dev        # Start with nodemon (development)
npm test           # Run tests
npm run lint       # Check code style
npm run lint:fix   # Fix code style issues
npm run format     # Format code with Prettier
```

### Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📊 Statistics

- **100+ Commands** across 7 categories
- **Advanced Security** with 10+ protection types
- **Real-time Features** with live data processing
- **Modular Architecture** for easy maintenance
- **Comprehensive Documentation** with detailed guides

## 🤝 Support

- **Discord Server**: [Join our support server](https://discord.gg/9h9DQac2HK)
- **Developer Profile**: [GitHub Profile](https://github.com/rayanelhabib)
- **Documentation**: [Wiki](https://github.com/rayanelhabib/Bot-discord-Helper-V2-/wiki)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**skz_rayan23** - Original Creator & Maintainer
- **GitHub Profile**: [@rayanelhabib](https://github.com/rayanelhabib)
- **Discord**: skz_rayan23
- **Support Server**: [Join Discord](https://discord.gg/9h9DQac2HK)

### 🔒 Copyright Protection
This project is created and maintained exclusively by **skz_rayan23**.
- ✅ **Original Work**: This is my original creation
- ✅ **Full Ownership**: I retain all rights to this project
- ✅ **Attribution Required**: Any use must credit me as the original author
- ✅ **No Removal**: My name and copyright cannot be removed

### 🌟 Developed by
**Rayan El Habib** - [GitHub Profile](https://github.com/rayanelhabib)

## 🙏 Acknowledgments

- [Discord.js](https://discord.js.org/) - Discord API wrapper
- [SQLite3](https://www.sqlite.org/) - Database engine
- [Canvas](https://github.com/Automattic/node-canvas) - Image generation
- All contributors and testers

---

⭐ **Star this repository if you found it helpful!**

const {
    ContainerBuilder,
    TextDisplayBuilder,
    MessageFlags,
  } = require('discord.js');
  
  module.exports = {
    name: 'setservertag',
    aliases: [],
    async execute(message, args, client, db) {
      const guild = message.guild;
      const user = message.author;
  
      const sendReply = (desc, isError = false) => {
        const prefix = isError ? '✗' : '➤';
        const text = new TextDisplayBuilder().setContent(`${prefix} ${desc}`);
        const container = new ContainerBuilder().addTextDisplayComponents(text);
        return message.reply({ flags: MessageFlags.IsComponentsV2, components: [container] });
      };
  
      // Permission check
      const isServerOwner = guild.ownerId === user.id;
      const isBotDev = user.id === '335869842748080140';
      if (!isServerOwner && !isBotDev) {
        return sendReply('You do not have permission to use this command.', true);
      }
  
      // Argument check
      const newTag = args.join(' ').trim();
      if (!newTag) {
        return sendReply('Please provide a tag to set.', true);
      }
  
      db.get(`SELECT servertag FROM server_tags WHERE server_id = ?`, [guild.id], async (err, row) => {
        if (err) {
          console.error('DB error while fetching tag:', err);
          return sendReply('An error occurred while accessing the tag.', true);
        }
  
        const oldTag = row?.servertag || null;
  
        // Save new tag to DB
        db.run(
          `INSERT INTO server_tags (server_id, servertag)
           VALUES (?, ?)
           ON CONFLICT(server_id) DO UPDATE SET servertag = excluded.servertag`,
          [guild.id, newTag],
          async (err) => {
            if (err) {
              console.error('DB error while updating tag:', err);
              return sendReply('An error occurred while saving the tag.', true);
            }
  
            let updated = 0;
  
            try {
              // Fetch all members (online + offline)
              const allMembers = await guild.members.fetch();
  
              for (const member of allMembers.values()) {
                if (member.user.bot) continue;
  
                let name = member.displayName;
  
                // Remove old tag if it is at the start of the name
                if (oldTag && name.startsWith(`${oldTag}  `)) {
                  name = name.slice(`${oldTag}  `.length);
                }
  
                // Apply new tag at the beginning
                const newName = `${newTag}  ${name}`.slice(0, 32);
                if (newName === member.displayName) continue;
  
                try {
                  await member.setNickname(newName);
                  updated++;
                } catch (err) {
                  console.warn(`Couldn't update ${member.user.tag}:`, err.message);
                }
              }
            } catch (fetchErr) {
              console.error('Failed to fetch all members:', fetchErr);
              return sendReply('Failed to fetch all members for updating.', true);
            }
  
            return sendReply(`Server tag set to \`${newTag}\`. Updated ${updated} members.`);
          }
        );
      });
    },
  };
  
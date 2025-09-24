const { Events } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    async execute(client, db) {
        console.log(`✅ Logged in as ${client.user.tag}`);

        // Check for expired warnings every 10 minutes
        setInterval(() => {
            db.all('SELECT * FROM active_warnings WHERE expires_at <= ?', [new Date().toISOString()], async (err, warnings) => {
                if (err) {
                    console.error('Error fetching expired warnings:', err);
                    return;
                }

                for (const warning of warnings) {
                    try {
                        const guild = await client.guilds.fetch(warning.guild_id);
                        const member = await guild.members.fetch(warning.user_id);
                        const settings = await new Promise((resolve) => {
                            db.get('SELECT * FROM warn_settings WHERE guild_id = ?', [warning.guild_id], (err, row) => resolve(row));
                        });

                        if (member && settings) {
                            const roleToRemove = getWarningRole(settings, warning.warning_level);
                            if (roleToRemove && member.roles.cache.has(roleToRemove)) {
                                await member.roles.remove(roleToRemove, 'Warning expired');
                            }
                        }

                        db.run('DELETE FROM active_warnings WHERE id = ?', [warning.id]);

                    } catch (error) {
                        console.error(`Error processing expired warning for user ${warning.user_id}:`, error);
                    }
                }
            });
        }, 600000); // 10 minutes
    },
};

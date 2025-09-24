/**
 * Check if a command is disabled in a specific guild
 * @param {string} guildId - The guild ID
 * @param {string} commandName - The command name
 * @param {Object} db - Database connection
 * @returns {Promise<boolean>} - True if command is disabled, false if enabled
 */
async function isCommandDisabled(guildId, commandName, db) {
  try {
    const [rows] = await db.query(
      'SELECT * FROM disabled_commands WHERE guild_id = ? AND command_name = ?',
      [guildId, commandName]
    );
    
    return rows.length > 0;
  } catch (error) {
    console.error('Error checking if command is disabled:', error);
    return false; // Default to enabled if there's an error
  }
}

/**
 * Get disabled commands for a guild
 * @param {string} guildId - The guild ID
 * @param {Object} db - Database connection
 * @returns {Promise<Array>} - Array of disabled commands
 */
async function getDisabledCommands(guildId, db) {
  try {
    const [rows] = await db.query(
      'SELECT command_name, disabled_by, disabled_at FROM disabled_commands WHERE guild_id = ?',
      [guildId]
    );
    
    return rows;
  } catch (error) {
    console.error('Error getting disabled commands:', error);
    return [];
  }
}

module.exports = {
  isCommandDisabled,
  getDisabledCommands
}; 
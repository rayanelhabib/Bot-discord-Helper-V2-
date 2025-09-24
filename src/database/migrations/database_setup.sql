-- Create disabled_commands table
CREATE TABLE IF NOT EXISTS disabled_commands (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    command_name VARCHAR(50) NOT NULL,
    disabled_by VARCHAR(20) NOT NULL,
    disabled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_guild_command (guild_id, command_name)
);

-- Create index for faster lookups
CREATE INDEX idx_guild_id ON disabled_commands(guild_id);
CREATE INDEX idx_command_name ON disabled_commands(command_name); 
module.exports = {
  name: 'presenceUpdate',
  async execute(oldPresence, newPresence, client, db) {
    // This event helps keep presence data fresh for voice commands
    // The presence data is automatically updated in the cache
    // No additional action needed, but this ensures we're listening for presence changes
    
    try {
      // Log presence changes for debugging (optional)
      if (oldPresence?.status !== newPresence?.status) {

      }
    } catch (error) {
      console.error('Error in presenceUpdate event:', error);
    }
  },
}; 
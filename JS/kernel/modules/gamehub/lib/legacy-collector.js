/**
 * Game Hub Module
 * Automatically collects and manages games
 */

module.exports = {
  name: 'GameHubModule',
  version: '1.0.0',
  dependencies: [],
  
  metadata: {
    description: 'Automatic game collection and management with proxy support',
    author: 'VessieOS',
    category: 'game-management'
  },

  validate() {
    return typeof GameHubCollector !== 'undefined';
  },

  async execute(context) {
    const { executor, pipeline, logger } = context;

    logger('Starting Game Hub automatic collector...');

    try {
      // Initialize collector
      const collector = new GameHubCollector({
        cacheExpiry: 3600000
      });

      // Start collection from all sources
      logger('Collecting games from all sources...');
      const results = await collector.collectAll();

      // Log results
      for (const result of results) {
        if (result.success) {
          logger(`✓ ${result.source}: ${result.count} games collected`);
        } else {
          logger(`✗ ${result.source}: ${result.error}`);
        }
      }

      // Start auto-update
      logger('Starting auto-update service...');
      collector.autoUpdate(3600000); // Update every hour

      // Get statistics
      const stats = collector.getStats();
      logger(`Total games in database: ${stats.totalGames}`);

      return {
        success: true,
        totalGames: stats.totalGames,
        bySource: stats.bySource,
        stats: stats
      };
    } catch (error) {
      logger(`Error: ${error.message}`);
      throw error;
    }
  }
};

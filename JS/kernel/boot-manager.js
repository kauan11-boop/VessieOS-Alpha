/**
 * VessieOS Boot Manager
 * Initializes all systems and starts automatic execution
 */

class VessieOSBootManager {
  constructor() {
    this.systems = {};
    this.isBooting = false;
    this.bootLog = [];
    this.bootCallbacks = [];
  }

  /**
   * Initialize all systems
   */
  async boot() {
    if (this.isBooting) return;
    this.isBooting = true;

    this.log('🚀 VessieOS Boot Sequence Starting');
    this.log('═══════════════════════════════════════');

    try {
      // Step 1: Initialize Responsive Renderer
      this.log('Step 1: Initializing Responsive Renderer...');
      this.systems.responsive = new ResponsiveRenderer();
      this.log('✓ Responsive Renderer initialized');

      // Step 2: Initialize Windows Executor
      this.log('Step 2: Checking Windows Executor...');
      this.systems.executor = new WindowsExecutor({
        timeout: 30000,
        maxConcurrent: 3
      });
      const execAvailable = await this.systems.executor.checkAvailability();
      this.log(execAvailable ? '✓ Windows Executor ready' : '⚠ Windows Executor not available');

      // Step 3: Initialize Module System
      this.log('Step 3: Initializing Module System...');
      this.systems.modules = new ModuleSystem({
        modulePath: './Module'
      });
      this.systems.modules.setExecutor(this.systems.executor);
      this.log('✓ Module System ready');

      // Step 4: Initialize AI Integration
      this.log('Step 4: Initializing AI Integration...');
      this.systems.ai = new LMStudioIntegration({
        host: 'http://localhost:1234'
      });
      const aiConnected = await this.systems.ai.checkConnection();
      this.log(aiConnected ? '✓ LM Studio connected' : '⚠ LM Studio will retry on demand');

      // Step 5: Initialize Game Hub
      this.log('Step 5: Initializing Game Hub Collector...');
      this.systems.gameHub = new GameHubCollector();
      this.log('✓ Game Hub ready for auto-collection');

      // Step 6: Initialize Web Content Fetcher
      this.log('Step 6: Initializing Web Content Fetcher...');
      this.systems.webFetcher = new WebContentFetcher();
      this.log('✓ Web Content Fetcher ready');

      // Step 7: Register default modules
      this.log('Step 7: Registering default modules...');
      await this.registerDefaultModules();
      this.log('✓ Modules registered');

      // Step 8: Create and prepare pipelines
      this.log('Step 8: Creating execution pipelines...');
      await this.createPipelines();
      this.log('✓ Pipelines ready');

      this.log('═══════════════════════════════════════');
      this.log('✨ VessieOS Boot Complete!');
      this.log(`Total Systems Initialized: ${Object.keys(this.systems).length}`);

      this.isBooting = false;
      this.fireBootCallbacks();

      return true;

    } catch (error) {
      this.log(`❌ Boot Failed: ${error.message}`);
      this.isBooting = false;
      throw error;
    }
  }

  /**
   * Register default modules
   */
  async registerDefaultModules() {
    // Register system manager
    const systemManager = {
      name: 'SystemManager',
      version: '1.0.0',
      dependencies: [],
      validate: () => true,
      execute: async (context) => {
        context.logger('System manager running');
        return { success: true };
      }
    };

    // Register game hub module
    const gameHubModule = {
      name: 'GameHub',
      version: '1.0.0',
      dependencies: [],
      validate: () => typeof GameHubCollector !== 'undefined',
      execute: async (context) => {
        context.logger('Starting auto game collection...');
        const results = await this.systems.gameHub.collectAll();
        const stats = this.systems.gameHub.getStats();
        context.logger(`Games collected: ${stats.totalGames}`);
        return { success: true, stats };
      }
    };

    // Register AI module
    const aiModule = {
      name: 'AIEngine',
      version: '1.0.0',
      dependencies: [],
      validate: () => typeof LMStudioIntegration !== 'undefined',
      execute: async (context) => {
        context.logger('AI Engine ready');
        const status = this.systems.ai.getStatus();
        context.logger(`Models: ${status.availableModels.length}`);
        return { success: true, status };
      }
    };

    try {
      this.systems.modules.registerModule('SystemManager', systemManager);
      this.systems.modules.registerModule('GameHub', gameHubModule);
      this.systems.modules.registerModule('AIEngine', aiModule);
    } catch (error) {
      this.log(`Error registering modules: ${error.message}`);
    }
  }

  /**
   * Create execution pipelines
   */
  async createPipelines() {
    // Main startup pipeline
    const startupPipeline = this.systems.modules.createPipeline('startup', [
      'SystemManager',
      'GameHub',
      'AIEngine'
    ]);

    this.log(`Pipeline created: ${startupPipeline.name}`);
  }

  /**
   * Auto-execute all pipelines
   */
  async autoExecute() {
    this.log('Starting automatic pipeline execution...');

    try {
      const results = await this.systems.modules.executeAll();
      
      for (const result of results) {
        if (result.success) {
          this.log(`✓ Pipeline completed successfully`);
        } else {
          this.log(`✗ Pipeline error: ${result.error}`);
        }
      }

      return results;
    } catch (error) {
      this.log(`Auto-execution error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Start automatic services
   */
  async startAutoServices() {
    this.log('Starting automatic services...');

    // Start game hub auto-collection
    this.systems.gameHub.autoUpdate(3600000);
    this.log('Game Hub auto-update started (1 hour interval)');

    // Setup periodic system checks
    setInterval(() => {
      const status = {
        responsive: this.systems.responsive.getViewportInfo(),
        modules: this.systems.modules.listModules(),
        games: this.systems.gameHub.getStats(),
        ai: this.systems.ai.getStatus()
      };

      document.dispatchEvent(new CustomEvent('system-status', {
        detail: status
      }));
    }, 30000);

    this.log('System monitoring started');
  }

  /**
   * Get system status
   */
  getStatus() {
    return {
      responsive: this.systems.responsive?.getViewportInfo(),
      gameHub: this.systems.gameHub?.getStats(),
      ai: this.systems.ai?.getStatus(),
      modules: this.systems.modules?.listModules(),
      isBooting: this.isBooting
    };
  }

  /**
   * Register boot callback
   */
  onBoot(callback) {
    this.bootCallbacks.push(callback);
  }

  /**
   * Fire boot callbacks
   */
  fireBootCallbacks() {
    this.bootCallbacks.forEach(callback => {
      try {
        callback(this.getStatus());
      } catch (error) {
        this.log(`Boot callback error: ${error.message}`);
      }
    });
  }

  /**
   * Log message
   */
  log(message) {
    const timestamp = new Date().toISOString();
    const entry = { timestamp, message };
    this.bootLog.push(entry);
    console.log(`[VessieOS] ${message}`);
  }

  /**
   * Get boot log
   */
  getBootLog() {
    return this.bootLog;
  }

  /**
   * Get system instance
   */
  getSystem(name) {
    return this.systems[name] || null;
  }

  /**
   * Shutdown all systems
   */
  async shutdown() {
    this.log('Shutting down VessieOS...');

    try {
      if (this.systems.responsive) {
        this.systems.responsive.destroy();
      }

      if (this.systems.executor) {
        this.systems.executor.clearProcessCache();
      }

      if (this.systems.modules) {
        this.systems.modules.clearExecutionLog();
      }

      if (this.systems.webFetcher) {
        this.systems.webFetcher.clearCache();
      }

      this.log('✓ Shutdown complete');
    } catch (error) {
      this.log(`Shutdown error: ${error.message}`);
    }
  }
}

// Initialize boot manager globally
if (typeof window !== 'undefined') {
  window.VessieOS = {
    boot: async () => {
      if (!window.VessieOSBootManager) {
        window.VessieOSBootManager = new VessieOSBootManager();
      }
      return await window.VessieOSBootManager.boot();
    },
    autoExecute: async () => {
      if (!window.VessieOSBootManager) {
        throw new Error('Boot VessieOS first');
      }
      return await window.VessieOSBootManager.autoExecute();
    },
    getStatus: () => {
      return window.VessieOSBootManager?.getStatus();
    },
    getSystem: (name) => {
      return window.VessieOSBootManager?.getSystem(name);
    }
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = VessieOSBootManager;
}

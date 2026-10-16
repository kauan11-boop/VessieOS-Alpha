/**
 * VessieOS Configuration
 * Central configuration for all systems
 */

const VessieOSConfig = {
  // System
  system: {
    name: 'VessieOS',
    version: '1.0.0',
    buildDate: new Date().toISOString(),
    autoStartServices: true,
    enableDebugLogging: true
  },

  // Responsive Renderer
  responsive: {
    enabled: true,
    breakpoints: {
      xs: 0,
      sm: 576,
      md: 768,
      lg: 992,
      xl: 1200,
      xxl: 1400
    },
    observeResizeChanges: true,
    cacheElements: true
  },

  // Windows Executor
  executor: {
    enabled: true,
    timeout: 30000,
    maxConcurrent: 3,
    workDir: 'C:\\VessieOS\\bin',
    captureOutput: true,
    enableSandbox: true
  },

  // Module System
  modules: {
    enabled: true,
    modulePath: './Module',
    autoLoad: true,
    concurrentExecution: true,
    maxPipelineSize: 20,
    executionTimeout: 300000 // 5 minutes
  },

  // LM Studio AI
  ai: {
    enabled: true,
    host: 'http://localhost:1234',
    apiPath: '/v1',
    temperature: 0.7,
    maxTokens: 2048,
    maxHistorySize: 50,
    autoConnect: true,
    retryAttempts: 3,
    retryDelay: 5000
  },

  // Game Hub Collector
  gameHub: {
    enabled: true,
    autoStart: true,
    autoUpdateInterval: 3600000, // 1 hour
    cacheExpiry: 86400000, // 24 hours
    sources: {
      steam: { enabled: true, priority: 1 },
      epic: { enabled: true, priority: 2 },
      igdb: { enabled: false, priority: 3 },
      local: { enabled: true, priority: 0 }
    },
    maxRetries: 3,
    proxies: [
      { type: 'cors', url: 'https://cors-anywhere.herokuapp.com/' },
      { type: 'allorigins', url: 'https://api.allorigins.win/raw?url=' },
      { type: 'direct', url: '' }
    ]
  },

  // Web Content Fetcher
  webFetcher: {
    enabled: true,
    cacheExpiry: 86400000, // 24 hours
    searchEngines: [
      { name: 'DuckDuckGo', enabled: true },
      { name: 'Wikipedia', enabled: true },
      { name: 'GitHub', enabled: true }
    ],
    maxResults: 10,
    timeout: 10000,
    retryAttempts: 3
  },

  // Logging
  logging: {
    enabled: true,
    level: 'info', // debug, info, warn, error
    maxLogSize: 10000,
    logToConsole: true,
    logToFile: false,
    logPath: './logs/'
  },

  // Performance
  performance: {
    enableMetrics: true,
    enableProfiling: false,
    maxMemoryCache: 52428800, // 50MB
    enableServiceWorker: false
  },

  // Security
  security: {
    sandboxMode: true,
    enableCSP: true,
    validateInputs: true,
    enableRateLimiting: true,
    maxRequestsPerMinute: 100
  },

  // UI/UX
  ui: {
    theme: 'dark',
    language: 'pt-BR',
    enableAnimations: true,
    enableSound: false,
    responsiveDesign: true
  },

  // Endpoints
  endpoints: {
    api: '/api',
    ws: 'ws://localhost:8000',
    executor: '/api/executor',
    modules: '/api/modules',
    games: '/api/games'
  },

  /**
   * Get configuration value
   */
  get(path) {
    return path.split('.').reduce((obj, key) => obj?.[key], this);
  },

  /**
   * Set configuration value
   */
  set(path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    let obj = this;

    for (const key of keys) {
      obj[key] = obj[key] || {};
      obj = obj[key];
    }

    obj[lastKey] = value;
  },

  /**
   * Merge configuration
   */
  merge(config) {
    Object.assign(this, config);
  },

  /**
   * Export as JSON
   */
  toJSON() {
    return JSON.stringify(this, null, 2);
  },

  /**
   * Validate configuration
   */
  validate() {
    const errors = [];

    if (!this.system.name) errors.push('system.name is required');
    if (!this.responsive.breakpoints) errors.push('responsive.breakpoints is required');
    if (!this.ai.host) errors.push('ai.host is required');

    return {
      valid: errors.length === 0,
      errors
    };
  },

  /**
   * Get enabled systems
   */
  getEnabledSystems() {
    return {
      responsive: this.responsive.enabled,
      executor: this.executor.enabled,
      modules: this.modules.enabled,
      ai: this.ai.enabled,
      gameHub: this.gameHub.enabled,
      webFetcher: this.webFetcher.enabled
    };
  },

  /**
   * Reset to defaults
   */
  reset() {
    Object.assign(this, JSON.parse(JSON.stringify(VessieOSConfigDefaults)));
  }
};

// Backup de configuração padrão
const VessieOSConfigDefaults = JSON.parse(JSON.stringify(VessieOSConfig));

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = VessieOSConfig;
}

// Global
if (typeof window !== 'undefined') {
  window.VessieOSConfig = VessieOSConfig;
}

/**
 * VessieOS Online Configuration
 * Configuração centralizada para todos os sistemas
 */

class OnlineConfig {
  static get environment() {
    const isDevelopment = window.location.hostname === 'localhost' || 
                         window.location.hostname === '127.0.0.1';
    return isDevelopment ? 'development' : 'production';
  }

  static get apiEndpoint() {
    if (this.environment === 'development') {
      return 'http://localhost:3000/api';
    }
    return 'https://api.github.com';
  }

  static get cors() {
    return {
      // AllOrigins como proxy principal (cors-anywhere.herokuapp.com foi
      // descontinuado e exige ativação manual por usuário — não funciona
      // em produção sem isso)
      proxy: 'https://api.allorigins.win/raw?url=',
      // corsproxy.io como fallback secundário
      fallback: 'https://corsproxy.io/?url='
    };
  }

  // Discord OAuth Configuration
  static get discord() {
    return {
      clientId: this.getEnv('DISCORD_CLIENT_ID', ''),
      redirectUri: `${window.location.origin}/callback.html`,
      scopes: [
        'identify',      // Identificação do usuário
        'email',         // Email do usuário
        'guilds',        // Lista de servidores
        'guilds.join',   // Permissão para entrar em servidores
        'messages.read', // Ler mensagens (em DMs)
        'bot'            // Permissões de bot
      ],
      permissions: 0x00000008 // SEND_MESSAGES
    };
  }

  // GitHub OAuth Configuration
  static get github() {
    return {
      clientId: this.getEnv('GITHUB_CLIENT_ID', ''),
      redirectUri: `${window.location.origin}/callback.html`,
      scopes: [
        'user:email',    // Acesso a email
        'repo',          // Acesso a repositórios
        'gist',          // Acesso a gists
        'read:user'      // Perfil público
      ]
    };
  }

  // LM Studio AI Configuration
  static get ai() {
    return {
      host: 'http://localhost:1234',
      apiEndpoint: '/api/v1/chat/completions',
      models: {
        default: 'neural-chat-7b-v3-3',
        list: [
          'neural-chat-7b-v3-3',
          'mistral-7b-instruct-v0.2',
          'llama-2-7b-chat'
        ]
      },
      parameters: {
        temperature: 0.7,
        topP: 0.9,
        maxTokens: 512,
        repeatPenalty: 1.1
      },
      timeout: 30000,
      retries: 3
    };
  }

  // Database Configuration
  static get database() {
    return {
      type: 'indexeddb', // 'indexeddb' ou 'localstorage'
      name: 'VessieOS',
      version: 1,
      stores: {
        users: 'id',
        posts: 'id',
        comments: 'id',
        messages: 'id',
        notifications: 'id',
        cache: 'url',
        syncQueue: 'id'
      }
    };
  }

  // Service Worker Configuration
  static get serviceWorker() {
    return {
      enabled: true,
      // Caminho relativo: em GitHub Pages de projeto (usuario.github.io/Repo/)
      // um caminho absoluto ("/systems/...") aponta para a raiz do domínio,
      // não do repositório, e o registro falha.
      path: 'systems/online/sw.js',
      cacheName: 'VessieOS-v1',
      cacheTTL: 24 * 60 * 60 * 1000, // 24 horas
      networkFirst: [
        'api',
        'systems'
      ],
      cacheFirst: [
        'CSS',
        'JS',
        'HTML'
      ]
    };
  }

  // Online System Configuration
  static get online() {
    return {
      syncInterval: 30000, // 30 segundos
      storageType: 'indexeddb',
      enableOfflineMode: true,
      enablePushNotifications: true,
      autoSync: true,
      maxSyncQueueSize: 100,
      syncTimeout: 10000
    };
  }

  // Game Hub Configuration
  static get gameHub() {
    return {
      autoFetch: true,
      cacheTTL: 24 * 60 * 60 * 1000, // 24 horas
      proxyFallback: true,
      sources: [
        'rawg.io',
        'igdb.com',
        'gog.com'
      ],
      proxies: [
        'https://api.allorigins.win/raw?url=',
        'https://corsproxy.io/?url=',
        'https://api.codetabs.com/v1/proxy/?quest='
      ]
    };
  }

  // Feature Flags
  static get features() {
    return {
      discordIntegration: true,
      socialNetwork: true,
      gameHub: true,
      aiChat: true,
      offlineMode: true,
      pushNotifications: false, // Requer backend
      realTimeSync: false,      // Requer WebSocket
      multiplayerFeatures: false // Requer backend
    };
  }

  // Analytics Configuration (optional)
  static get analytics() {
    return {
      enabled: false,
      trackingId: '',
      anonymize: true
    };
  }

  // Security Configuration
  static get security() {
    return {
      enableCSP: true,
      enableXSSProtection: true,
      enableCORSPolicy: true,
      tokenStorageType: 'sessionStorage', // localStorage ou sessionStorage
      tokenExpiry: 24 * 60 * 60 * 1000, // 24 horas
      encryptionEnabled: false // Requer crypto lib
    };
  }

  // UI Configuration
  static get ui() {
    return {
      theme: 'dark',
      breakpoints: {
        xs: 0,
        sm: 576,
        md: 768,
        lg: 992,
        xl: 1200,
        xxl: 1400
      },
      animations: {
        enabled: true,
        duration: 300,
        easing: 'ease-in-out'
      }
    };
  }

  // Logging Configuration
  static get logging() {
    return {
      enabled: true,
      level: this.environment === 'development' ? 'debug' : 'info',
      console: this.environment === 'development',
      storage: true,
      maxLogs: 1000
    };
  }

  /**
   * Get environment variable safely
   *
   * BUG CORRIGIDO: este projeto é servido como HTML/JS estático (GitHub
   * Pages), então `process.env` nunca existe no navegador — a versão
   * anterior sempre caía no `defaultValue` (string vazia), então o
   * Discord/GitHub Client ID nunca podia ser configurado sem editar o
   * código-fonte manualmente. Agora, valores salvos pelo próprio usuário
   * em Configurações → Online (persistidos em localStorage) têm
   * prioridade; `process.env` ainda é checado por último, para builds
   * que passam por um bundler real (Node/Vite/CRA).
   */
  static getEnv(key, defaultValue = null) {
    try {
      const stored = localStorage.getItem(`VessieOS_env_${key}`);
      if (stored) return stored;
    } catch { /* localStorage indisponível (modo privado restrito etc.) */ }

    try {
      if (typeof process !== 'undefined' && process.env) {
        return process.env[`REACT_APP_${key}`] || defaultValue;
      }
    } catch { /* ignore */ }

    return defaultValue;
  }

  /**
   * Persiste um valor de configuração (ex: Discord Client ID) para que
   * getEnv() o encontre em carregamentos futuros. Usado pela tela
   * Configurações → Online do VessieOS.
   */
  static setEnv(key, value) {
    try {
      if (value) localStorage.setItem(`VessieOS_env_${key}`, value);
      else localStorage.removeItem(`VessieOS_env_${key}`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get full configuration
   */
  static getAll() {
    return {
      environment: this.environment,
      apiEndpoint: this.apiEndpoint,
      cors: this.cors,
      discord: this.discord,
      github: this.github,
      ai: this.ai,
      database: this.database,
      serviceWorker: this.serviceWorker,
      online: this.online,
      gameHub: this.gameHub,
      features: this.features,
      security: this.security,
      ui: this.ui,
      logging: this.logging
    };
  }

  /**
   * Validate configuration
   */
  static validate() {
    const errors = [];
    const warnings = [];

    // Validar Discord
    if (this.features.discordIntegration && !this.discord.clientId) {
      warnings.push('Discord clientId não configurado');
    }

    // Validar GitHub
    if (!this.github.clientId) {
      warnings.push('GitHub clientId não configurado');
    }

    // Validar LM Studio
    if (this.features.aiChat) {
      try {
        const url = new URL(this.ai.host);
      } catch {
        errors.push('LM Studio host URL inválida');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Log configuration (sanitizado)
   */
  static log() {
    const config = this.getAll();
    
    // Remover informações sensíveis
    const sanitized = JSON.parse(JSON.stringify(config));
    if (sanitized.discord.clientId) {
      sanitized.discord.clientId = '***REDACTED***';
    }
    if (sanitized.github.clientId) {
      sanitized.github.clientId = '***REDACTED***';
    }

    console.log('🔧 VessieOS Configuration:', sanitized);
  }
}

// Export para diferentes ambientes
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OnlineConfig;
}

// Validar ao carregar
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const validation = OnlineConfig.validate();
    if (validation.errors.length > 0) {
      console.error('❌ Configuration errors:', validation.errors);
    }
    if (validation.warnings.length > 0) {
      console.warn('⚠️ Configuration warnings:', validation.warnings);
    }
  });
} else {
  const validation = OnlineConfig.validate();
  if (validation.errors.length > 0) {
    console.error('❌ Configuration errors:', validation.errors);
  }
}


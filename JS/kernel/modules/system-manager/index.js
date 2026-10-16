/**
 * System Manager Module
 * Gerencia inicialização do sistema e sequência de boot dos serviços.
 * (Convertido de CommonJS quebrado para auto-registro no ModuleSystem.)
 */
(function () {
  const SystemManagerModule = {
    name: 'SystemManager',
    version: '1.1.0',
    dependencies: [],

    metadata: {
      description: 'Gerencia inicialização do sistema, sequências de boot e serviços',
      author: 'VessieOS',
      category: 'system'
    },

    validate() {
      return true;
    },

    async execute(context) {
      const { logger } = context;
      logger('Inicializando serviços do sistema...');

      try {
        const viewport = window.innerWidth;
        document.documentElement.setAttribute('data-viewport', String(viewport));

        const config = {
          autoUpdate: true,
          enableAI: typeof LMStudioIntegration !== 'undefined',
          gameHubEnabled: typeof GameHubCollector !== 'undefined',
          modules: true
        };

        const services = [];
        if (config.enableAI) {
          logger('Subsistema de IA disponível.');
          services.push({ name: 'AIEngine', status: 'initialized' });
        }
        if (config.gameHubEnabled) {
          logger('Game Hub disponível.');
          services.push({ name: 'GameHub', status: 'initialized' });
        }

        logger('Inicialização do sistema concluída.');
        return { success: true, servicesInitialized: services.length, services };
      } catch (error) {
        logger(`Erro: ${error.message}`);
        return { success: false, error: error.message };
      }
    }
  };

  function tryRegister() {
    if (window.VessieOS?.moduleSystem?.registerModule) {
      window.VessieOS.moduleSystem.registerModule(SystemManagerModule.name, SystemManagerModule);
      return true;
    }
    return false;
  }

  if (!tryRegister()) {
    document.addEventListener('vessieos:modulesystem-ready', tryRegister, { once: true });
    let attempts = 0;
    const retry = setInterval(() => {
      attempts++;
      if (tryRegister() || attempts > 30) clearInterval(retry);
    }, 200);
  }
})();

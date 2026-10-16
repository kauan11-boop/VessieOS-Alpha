/**
 * AI Integration Module
 * Inicializa e gerencia a integração com LM Studio.
 *
 * Estava escrito como `module.exports = {...}` (CommonJS), o que é
 * ReferenceError puro em um <script> de navegador (`module` não existe).
 * Nunca rodava. Agora se auto-registra em window.VessieOS.modules
 * (ModuleSystem), com espera defensiva caso o kernel ainda não tenha
 * terminado de inicializar.
 */
(function () {
  const AIIntegrationModule = {
    name: 'AIIntegration',
    version: '1.1.0',
    dependencies: [],

    metadata: {
      description: 'Integração e gerenciamento de modelos do LM Studio',
      author: 'VessieOS',
      category: 'ai'
    },

    validate() {
      return typeof LMStudioIntegration !== 'undefined';
    },

    async execute(context) {
      const { logger } = context;
      logger('Inicializando integração com LM Studio...');

      try {
        const ai = new LMStudioIntegration({
          host: 'http://localhost:1234',
          maxHistorySize: 50,
          temperature: 0.7,
          maxTokens: 2048
        });

        const isConnected = await ai.checkConnection();
        logger(isConnected ? '✓ Conectado ao LM Studio' : '⚠ LM Studio indisponível, tentará novamente depois');

        const models = isConnected ? await ai.loadModels() : [];
        logger(`${models.length} modelo(s) de IA carregado(s)`);
        for (const model of models) logger(`  • ${model.id}`);

        const status = ai.getStatus();
        window.VessieOS = window.VessieOS || {};
        window.VessieOS.ai = ai; // acessível globalmente para outros apps (Vessy AI, GameHub, etc.)

        return {
          success: true,
          isConnected: status.isConnected,
          currentModel: status.currentModel,
          availableModels: status.availableModels,
          modelCount: models.length
        };
      } catch (error) {
        logger(`Erro: ${error.message}`);
        return { success: false, error: error.message };
      }
    }
  };

  function tryRegister() {
    if (window.VessieOS?.moduleSystem?.registerModule) {
      window.VessieOS.moduleSystem.registerModule(AIIntegrationModule.name, AIIntegrationModule);
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

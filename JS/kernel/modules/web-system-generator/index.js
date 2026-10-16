/**
 * Web System Generator Module
 * Busca conteúdo web e gera "sistemas" de conteúdo automaticamente.
 * (Convertido de CommonJS quebrado para auto-registro no ModuleSystem.)
 */
(function () {
  const WebSystemGeneratorModule = {
    name: 'WebSystemGenerator',
    version: '1.1.0',
    dependencies: [],

    metadata: {
      description: 'Geração automática de conteúdo/sistemas a partir de busca web',
      author: 'VessieOS',
      category: 'content-generation'
    },

    validate() {
      return typeof WebContentFetcher !== 'undefined';
    },

    async execute(context) {
      const { logger } = context;
      logger('Inicializando Web System Generator...');

      try {
        const fetcher = new WebContentFetcher({ cacheExpiry: 86400000 });
        const topics = [
          'VessieOS Development',
          'JavaScript Game Engines',
          'System Architecture Patterns'
        ];

        logger(`Gerando sistemas para ${topics.length} tópicos...`);
        const generatedSystems = [];

        for (const topic of topics) {
          logger(`Gerando sistema: ${topic}`);
          try {
            const system = await fetcher.generateSystem(topic);
            if (!system.error) {
              generatedSystems.push({ name: system.name, id: system.id, sourceCount: system.contentBlocks.length });
              logger(`✓ Gerado: ${topic} (${system.contentBlocks.length} fontes)`);
            } else {
              logger(`✗ Falhou: ${topic}`);
            }
          } catch (e) {
            logger(`Erro ao gerar ${topic}: ${e.message}`);
          }
        }

        logger(`${generatedSystems.length} sistema(s) gerado(s).`);
        return { success: true, generatedCount: generatedSystems.length, systems: generatedSystems };
      } catch (error) {
        logger(`Erro: ${error.message}`);
        return { success: false, error: error.message };
      }
    }
  };

  function tryRegister() {
    if (window.VessieOS?.moduleSystem?.registerModule) {
      window.VessieOS.moduleSystem.registerModule(WebSystemGeneratorModule.name, WebSystemGeneratorModule);
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

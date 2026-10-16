// loader.js — Carregador de Módulos do VessieOS
// Carrega todos os módulos do kernel na ordem correta
// Dependências: window.S, window.VFS, window.toast

(function () {
  "use strict";

  // Ordem de carregamento dos módulos
  const MODULE_LOAD_ORDER = [
    // Módulos de base (dependem apenas do kernel core)
    'steam',           // VessieSteam - login e perfis
    'saving',          // CacheManager, AppSaveSystem, ContentSaveSystem

    // Módulos de sistema
    'vessielang',      // VessieLang - linguagem customizada
    'windows10-fs',    // Vin10 - arquitetura Windows 10
    'diskmgr',         // VessieDiskMgr - unidades de disco, partições

    // Módulos de funcionalidade
    'format',          // Vin10Format - formatação/reset

    // Módulos de interface
    'loader',          // VessieLoader - carregador de módulos
    'notifications',   // VessieNotifications - notificações Win10
    'search',          // VessieSearch - pesquisa universal
    'taskmanager',     // VessieTaskManager - gerenciador de tarefas
    'controlpanel',    // VessieControlPanel - painel de controle
    'shortcuts',       // VessieShortcuts - atalhos de teclado
    'recyclebin'       // VessieRecycleBin - lixeira
  ];

  // Estado do carregamento
  const loadState = {
    loaded: [],
    failed: [],
    startTime: Date.now(),
    complete: false
  };

  // Carregar um módulo específico
  function loadModule(name) {
    try {
      const path = `JS/kernel/modules/${name}.js`;
      // Verificar se o módulo já está carregado
      if (loadState.loaded.includes(name)) {
        return true;
      }

      // Registrar como carregado (o script real já foi incluído via tag <script>)
      loadState.loaded.push(name);
      return true;
    } catch (e) {
      console.error(`Erro ao carregar módulo ${name}:`, e);
      loadState.failed.push(name);
      return false;
    }
  }

  // Carregar todos os módulos na ordem
  function loadAllModules() {
    MODULE_LOAD_ORDER.forEach(name => {
      loadModule(name);
    });

    loadState.complete = true;
    loadState.endTime = Date.now();
    loadState.duration = loadState.endTime - loadState.startTime;

    return loadState;
  }

  // Verificar se todos os módulos estão carregados
  function isFullyLoaded() {
    return MODULE_LOAD_ORDER.every(name => loadState.loaded.includes(name));
  }

  // Obter status do carregamento
  function getStatus() {
    return {
      ...loadState,
      modules: [...loadState.loaded],
      failed: [...loadState.failed],
      isFullyLoaded: isFullyLoaded()
    };
  }

  // Exportar para window
  window.VessieLoader = {
    loadModule,
    loadAllModules,
    isFullyLoaded,
    getStatus,
    MODULE_LOAD_ORDER
  };

  // Auto-carregar ao iniciar
  try {
    const result = loadAllModules();
    console.log('VessieOS Loader: módulos carregados em', result.duration, 'ms');
  } catch (e) {
    console.error('Erro no loader:', e);
  }

})();
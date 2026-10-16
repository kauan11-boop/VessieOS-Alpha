(function () {
  // Raiz do projeto derivada da URL deste próprio script
  const ROOT = new URL('../../../', document.currentScript.src).href;

  // ---- Tema: VessieOS é somente escuro ----
  // window.setVessieTheme continua exposto como compatibilidade (outros
  // módulos o chamam), mas sempre resolve para o escuro e remove qualquer
  // resquício de `theme-light` salvo anteriormente.
  window.setVessieTheme = function () {
    document.documentElement.classList.remove('theme-light');
    document.documentElement.classList.add('theme-dark');
    try {
      localStorage.setItem('vessieos_theme_mode', 'dark');
      localStorage.removeItem('vos-theme');
    } catch (_) { /* ignore */ }
  };
  try {
    localStorage.removeItem('vos-theme');
  } catch (_) { /* ignore */ }
  window.setVessieTheme('dark');

  const scripts = [
    // Sistema "Online" (config, auth, integração Discord real) — estes três
    // arquivos existiam no projeto mas nenhum HTML os carregava, então as
    // classes OnlineConfig/AuthenticationSystem/DiscordIntegration nunca
    // existiam em tempo de execução (código morto). Precisam vir cedo,
    // antes de settings.js, que agora expõe a tela Configurações → Online.
    'systems/online/config.js',
    'systems/online/auth.js',
    'systems/discord/integration.js',
    // Biblioteca própria de gerenciamento de janelas (drag, resize em 8
    // direções, foco, minimizar/maximizar, snap layouts) — precisa
    // carregar antes de JS/core/main.js, que expõe window.createWin(...)
    // delegando pra ela.
    'JS/core/vessie-wm.js',
    'JS/core/main.js',
    // Aplicativos do VessieOS — extraídos de JS/core/main.js para JS/apps/.
    // Cada um depende dos utilitários globais do kernel (S, VFS, toast,
    // createWin, persistState, etc.), expostos em window pelo core/main.js
    // acima, então precisam carregar depois dele.
    'JS/apps/framework/framework.js',
    'JS/apps/vm-manager/vm-manager.js',
    'JS/apps/discord/discord.js',
    'JS/apps/vessie-ai/vessie-ai.js',
    'JS/apps/automation/automation.js',
    'JS/apps/dashboard/dashboard.js',
    'JS/apps/explorer/explorer.js',
    'JS/apps/notepad/notepad.js',
    'JS/apps/nvidia/nvidia.js',
    'JS/apps/games/games.js',
    'JS/apps/browser/browser.js',
    'JS/apps/word-processor/word-processor.js',
    'JS/apps/calculator/calculator.js',
    'JS/apps/coin-store/coin-store.js',
    'JS/apps/error-center/error-center.js',
    'JS/apps/terminal/terminal.js',
    'JS/apps/vessielang-ide/vessielang-ide.js',
    'JS/apps/settings/settings.js',
    'JS/apps/music-player/music-player.js',
    'JS/apps/camera/camera.js',
    'JS/apps/task-manager/task-manager.js',
    'JS/apps/about/about.js',
    'JS/kernel/modules/neural-core/neural.js', // rede neural + Double DQN (JS puro)
    'JS/kernel/modules/neural-core/autonomy.js', // Agent Loop autônomo (observar/pensar/agir/resultado)
    'JS/apps/vessie-neural/vessie-neural.js', // app Vessie Neural
    'apps-iframe/registry.js', // registro dos apps separados (iframe)
    'JS/kernel/modules/app-runtime/commands.js', // 200+ comandos puros do SO
    'JS/kernel/modules/app-runtime/system-commands.js', // comandos que mexem no SO (com permissão)
    'JS/kernel/modules/app-runtime/app-host.js', // host dos apps em iframe + RPC
    // Ponte de integração entre apps (Abrir com, reveal, conteúdo inicial) —
    // usa apenas lookups tardios (lazy), então a posição aqui não é crítica,
    // mas carregar após os apps permite semear o conteúdo com tudo pronto.
    'JS/apps/app-bridge/app-bridge.js',
    'JS/apps/emulator/emulator.js', // janela do Emulador (Executar/Inspeção/Compatibilidade)
    'JS/apps/command-panel/command-panel.js', // Painel de Comando + hubs (edu/planos/plugins) — corrige openers ausentes
    'JS/core/bootstrap.js',
    'JS/core/storage.js',
    'JS/core/theme.js',
    'JS/core/graphics.js',
    'JS/core/events.js',
    'JS/kernel/kernel.js',
    'JS/kernel/modules/emulation/index.js', // emulador do kernel (MZ/PE/DOS) — registra serviço `emulation`
    'JS/kernel/logging.js',
    'JS/kernel/registry.js',
    'JS/kernel/filesystem.js',
    'JS/kernel/process-manager.js',
    'JS/kernel/security.js',
    'JS/kernel/module-system.js',        // registrador de pipelines (window.VessieOS.moduleSystem) — não era carregado antes
    'JS/kernel/lm-studio-ai.js',         // LMStudioIntegration — exigido por ai-integration, nunca era carregado antes
    'JS/kernel/web-content-fetcher.js',  // WebContentFetcher — exigido por web-system-generator, nunca era carregado antes
    'JS/kernel/loader.js',
    'JS/kernel/monitor.js',
    'JS/modules/desktop-icons.js',
    'JS/modules/taskbar.js',
    'JS/modules/notifications.js',
    'JS/modules/windows.js',
    'JS/modules/apps.js',
    'JS/modules/search.js',
    'JS/modules/tray.js',
    'JS/modules/execute-exes.js',
    'JS/kernel/modules/resources/lib/event-bus.js',
    'JS/kernel/modules/resources/lib/anti-fall.js',
    'JS/kernel/modules/graphics/engines/Vessie3DProEngine.js', // motor 3D unificado — antes nunca era carregado no boot
    'JS/systems/game-hub-collector.js',  // classe-base GameHubCollector — EnhancedGameHub quebrava sem isso
    'JS/kernel/modules/gamehub/index.js',
    'JS/kernel/modules/gamehub/lib/three-hook.js',
    'JS/kernel/modules/start-menu/index.js',
    'JS/kernel/modules/command-palette/index.js',
    'JS/kernel/modules/subsystem-manager/index.js',
    'JS/kernel/modules/ai-integration/index.js',
    'JS/kernel/modules/system-manager/index.js',
    'JS/kernel/modules/web-system-generator/index.js',
    'JS/kernel/modules/vessiecoin/index.js',
    'JS/kernel/modules/bsod-simulator/index.js',
    'JS/kernel/modules/adaptive-color/index.js',
    // VessieLang: linguagem de programação própria do ecossistema
    // (dialetos B1/J3/G5/FULL) + ponte com o kernel real do VessieOS.
    // Cadeia clássica (auto-registram globais, não usam export ES —
    // precisam continuar funcionando também no runner Node standalone),
    // igual ao padrão já usado pelo Vessie3DProEngine e pelo LM Studio.
    // A ordem importa: cada arquivo depende dos globais do anterior.
    'JS/kernel/modules/vessielang/lib/B1_Lang.js',
    'JS/kernel/modules/vessielang/lib/J3_Lang.js',
    'JS/kernel/modules/vessielang/lib/G5_Lang.js',
    'JS/kernel/modules/vessielang/lib/VL_Full.js',
    'JS/kernel/modules/vessielang/lib/dispatcher.js',
    'JS/kernel/modules/vessielang/lib/vl-fs.js',
    'JS/kernel/modules/vessielang/lib/vl-security.js',
    'JS/kernel/modules/vessielang/lib/vl-kernel.js',
    'JS/kernel/modules/vessielang/lib/vl-modules.js',
    'JS/kernel/modules/vessielang/lib/vl-os.js',
    'JS/kernel/modules/vessielang/lib/vl-gamehub.js',
    'JS/kernel/modules/vessielang/lib/runtime-bridge.js'
  ];

  let idx = 0;

  function loadNext() {
    if (idx >= scripts.length) { syncModules(); return; }
    const script = document.createElement('script');
    script.src = ROOT + scripts[idx++];
    script.async = false;
    script.onload = loadNext;
    script.onerror = () => { console.error('[Loader] falhou:', script.src); loadNext(); };
    document.head.appendChild(script);
  }

  /**
   * Sincronização dos módulos: cada arquivo em JS/modules/ e
   * JS/kernel/modules/ que segue o padrão do projeto só se REGISTRA em
   * window.VessieOS.modules.<nome> = { init } — não se inicializa sozinho.
   * Até aqui nada chamava esse init() (exceto execute-exes.js, que se
   * auto-inicia por conta própria). Depois que o último script termina de
   * carregar, percorremos o registro e chamamos init() em cada módulo
   * exatamente uma vez, na ordem em que foram registrados.
   */
  function syncModules() {
    const registry = (window.VessieOS && window.VessieOS.modules) || {};
    Object.keys(registry).forEach((name) => {
      const mod = registry[name];
      if (!mod || mod._vosSynced || typeof mod.init !== 'function') return;
      try {
        mod.init();
        mod._vosSynced = true;
      } catch (error) {
        console.error(`[Loader] módulo "${name}" falhou ao sincronizar:`, error);
      }
    });
  }

  loadNext();
})();
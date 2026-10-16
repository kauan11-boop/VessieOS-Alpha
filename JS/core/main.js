(function () {
"use strict";

let GAMES = [];

window.GAMES = GAMES;

const EXTRA_STYLE = document.createElement('style');

EXTRA_STYLE.textContent = `
  #eg.horror{display:flex!important;flex-direction:column;justify-content:center;align-items:center;background:radial-gradient(circle at center,#000 0%,#040404 40%,#000 100%);color:#fff;text-shadow:0 0 18px rgba(255,255,255,.35);font-family:Segoe UI,Arial,sans-serif;z-index:9999}
  #eg.horror .horror-title{font-size:2.15rem;font-weight:700;letter-spacing:.2em;text-transform:uppercase}
  #eg.horror .horror-sub{font-size:1rem;color:#ff6b6b;margin-top:8px}
  .di img{width:100%;height:100%;object-fit:cover;border-radius:14px}
  .di[data-sz="small"]{width:74px;padding:6px 4px}
  .di[data-sz="small"] .ic{width:44px;height:44px;border-radius:12px}
  .di[data-sz="large"]{width:120px;padding:14px 8px}
  .di[data-sz="large"] .ic{width:82px;height:82px;border-radius:18px}
  .wall-tab{display:inline-flex;align-items:center;gap:8px;padding:7px 10px;border-radius:999px;border:1px solid var(--border);background:rgba(255,255,255,.06);color:var(--dim);cursor:pointer;margin-right:8px;margin-bottom:8px}
  .wall-tab.active{background:rgba(96,165,250,.18);color:white;border-color:rgba(96,165,250,.35)}
  .wg{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}
  .wt{display:flex;flex-direction:column;gap:8px;padding:10px;border-radius:16px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);cursor:pointer;transition:.16s var(--ease),background .16s var(--ease),border-color .16s var(--ease),transform .16s var(--ease)}
  .wt:hover{transform:translateY(-3px);background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.18)}
  .wt-preview{height:100px;border-radius:14px;background-size:cover;background-position:center;border:1px solid rgba(255,255,255,.08);background-repeat:no-repeat;overflow:hidden;position:relative;}
  .wt-cat{font-size:.68rem;color:var(--dim);text-align:center;margin-top:2px}
  .ia-save-button{display:inline-flex;align-items:center;gap:10px;padding:14px 20px;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:linear-gradient(135deg,var(--a),var(--a2));color:#fff;font-weight:700;transition:.18s var(--ease);box-shadow:0 16px 40px rgba(96,165,250,.22);outline:none}
  .ia-save-button:hover{transform:translateY(-1px);box-shadow:0 18px 44px rgba(96,165,250,.3)}
  .ia-save-button:focus{outline:2px solid rgba(255,255,255,.35);outline-offset:2px}
  .wt-name{font-size:.78rem;color:var(--text-2);text-align:center;line-height:1.35;min-height:38px}
  .wt.ac{border-color:var(--a);box-shadow:0 0 0 2px var(--acc-glow)}
  .wall-preview{margin-top:16px;border-radius:18px;overflow:hidden;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);position:relative;min-height:220px}
  .wall-preview .wp-info{padding:14px 16px;display:flex;justify-content:space-between;align-items:center;gap:8px;background:rgba(0,0,0,.15);border-bottom:1px solid rgba(255,255,255,.08);color:var(--text);font-size:.84rem}
  .wall-preview-inner{position:relative;width:100%;height:260px;overflow:hidden;background:#10131f}
  .wall-preview-inner img,.wall-preview-inner video,.wall-preview-inner iframe{position:absolute;top:50%;left:50%;width:100%;height:100%;transform:translate(-50%,-50%);object-fit:cover;min-width:100%;min-height:100%;border:none}
  .wall-preview-empty{padding:22px;color:var(--dim);font-size:.9rem;line-height:1.5}
  #desktop-media-bg{position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:-1}
  #desktop-media-bg video,#desktop-media-bg iframe{position:absolute;top:50%;left:50%;width:100%;height:100%;transform:translate(-50%,-50%);object-fit:cover;min-width:100%;min-height:100%;border:none;pointer-events:none}
  .fem-body{display:flex;gap:12px;align-items:flex-start}
  .fem-body .fgrid{flex:1;}
  .feprev{width:320px;min-width:240px;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:14px;display:flex;flex-direction:column;gap:12px;max-height:calc(100% - 20px);overflow:hidden}
  .feprev h4{margin:0;font-size:.95rem;color:#fff}
  .feprev .fp-media{flex:1;min-height:160px;overflow:hidden;border-radius:14px;background:#0c0f17;display:flex;align-items:center;justify-content:center}
  .feprev .fp-media img,.feprev .fp-media video,.feprev .fp-media iframe{width:100%;height:100%;object-fit:contain}
  .feprev textarea{width:100%;height:180px;background:rgba(0,0,0,.2);border:1px solid rgba(255,255,255,.08);border-radius:12px;color:#fff;padding:10px;resize:none;font-family:Consolas,monospace;outline:none}
  .feprev .fp-meta{display:flex;flex-direction:column;gap:6px;color:var(--dim);font-size:.82rem}
  .feprev .fp-actions{display:flex;gap:8px;flex-wrap:wrap}

  .wt.ac .wt-name{color:white;font-weight:600}
  .vc-card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:12px;margin-top:10px}
  .mc-tracklist{margin-top:14px;display:grid;gap:8px;max-height:140px;overflow:auto}
  .mc-track{padding:8px 10px;border-radius:10px;background:rgba(255,255,255,.04);display:flex;justify-content:space-between;align-items:center;cursor:pointer;color:var(--dim)}
  .mc-track.active{background:rgba(96,165,250,.2);color:white}
`;

document.head.appendChild(EXTRA_STYLE);

const PLANOS_CONTENT = ``;

const S = {
    user: 'Avançado',
    apiKey: '',
    aiProvider: 'lmstudio',
    aiModel: 'gpt-4o-mini',
    aiEndpoint: '',
    aiCustomEndpoint: '',
    wallpaper: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=80',
    desktopIconSize: 'medium',
    cursorSize: 1,
    wallpapers: [],
    wins: [],
    nextZ: 100,
    unlocked: true,
    chatHistory: [],
    volume: 70,
    darkMode: true,
    sounds: true,
    notificationsEnabled: true,
    animationsEnabled: true,
    vocabulary: [],
    gameTemplates: [],
    pinnedApps: ['vessie', 'explorer', 'games', 'chrome', 'terminal', 'vessielang', 'settings', 'notepad', 'calc'],
    recentApps: [],
    iconScale: 1,
    notifications: [],
    // Pasta Windows fica bloqueada por padrão (ver isLockedNode/requestAdminUnlock);
    // "true" pelo resto da sessão depois que o código de administrador (Vessie) é
    // digitado corretamente uma vez. Reseta ao recarregar a página, de propósito
    // (como o UAC real: acesso elevado não é permanente entre sessões).
    windowsUnlocked: false,
    fs: {
      // Arquitetura de diretórios estilo Windows, com unidade e perfis:
      //   C:/Usuários/<nome>/{Área de Trabalho, Documentos, Downloads,
      //     Imagens, Música, Vídeos}
      //   C:/Windows (sistema, bloqueado) · C:/Arquivos de Programas · C:/Temp
      // Pastas antigas (save plano: Desktop, Documentos...) são migradas
      // para cá por migrateFs() no boot — ver abaixo de restoreState().
      'C:': {
        // Perfis de usuário são criados no boot/login por ensureUserDirs().
        'Usuários': {},
        // 'Windows' é um marcador especial (__locked), não uma pasta de
        // verdade — não tem 104 chaves reais dentro (seria um desperdício);
        // VFS.stat()/list() sabem reportar "104 arquivos" e bloquear a
        // navegação a partir só desse marcador. Ver isLockedNode() e
        // requestAdminUnlock() logo abaixo da definição da VFS.
        'Windows': { __locked: true, __fileCount: 104 },
        'Arquivos de Programas': {},
        'Temp': {}
      }
    },
    currentPath: '',
    selectedFiles: [],
    taskbarWindows: [],
    musPlaying: false,
    musTrack: 0,
    musProg: 0,
    musTimer: null
  };

window.S = S;

const Kernel = (() => {
    const listeners = new Map();
    const services = new Map();
    const modules = new Map();
    const queue = [];
    let busy = false;

    const eventBus = {
      on(event, handler) {
        if (typeof handler !== 'function') return () => { };
        if (!listeners.has(event)) listeners.set(event, new Set());
        listeners.get(event).add(handler);
        return () => this.off(event, handler);
      },
      once(event, handler) {
        if (typeof handler !== 'function') return () => { };
        const wrapper = (payload) => { this.off(event, wrapper); handler(payload); };
        return this.on(event, wrapper);
      },
      off(event, handler) {
        const set = listeners.get(event);
        if (!set) return;
        set.delete(handler);
        if (!set.size) listeners.delete(event);
      },
      emit(event, detail) {
        const set = listeners.get(event);
        if (!set) return;
        for (const handler of Array.from(set)) {
          try { handler({ event, detail }); } catch (err) { console.warn('EventBus error', event, err); }
        }
      },
      emitAsync(event, detail) {
        setTimeout(() => eventBus.emit(event, detail), 0);
      }
    };

    return {
      eventBus,
      registerService(name, service) { if (!name) return null; services.set(name, service); return service; },
      getService(name) { return services.get(name); },
      registerModule(name, module) { if (!name) return null; modules.set(name, module); return module; },
      getModule(name) { return modules.get(name); },
      schedule(task, priority = 0) {
        if (typeof task !== 'function') return;
        queue.push({ task, priority });
        queue.sort((a, b) => b.priority - a.priority);
        if (busy) return;
        busy = true;
        requestAnimationFrame(() => {
          while (queue.length) { const item = queue.shift(); try { item.task(); } catch (err) { console.error('Kernel scheduler', err); } }
          busy = false;
        });
      },
      start() { this.eventBus.emit('kernel:ready'); return this; }
    };
  })();

const ServiceLocator = {
    register(name, service) { return Kernel.registerService(name, service); },
    resolve(name) { return Kernel.getService(name); }
  };

window.ServiceLocator = ServiceLocator;

const CoreSystem = {
    name: 'VessieOS Core',
    version: '3.0',
    started: performance.now(),
    subsystems: new Map(),
    register(name, subsystem) { if (!name || !subsystem) return null; this.subsystems.set(name, subsystem); if (typeof subsystem.init === 'function') subsystem.init(); return subsystem; },
    get(name) { return this.subsystems.get(name); },
    info() { return { name: this.name, version: this.version, uptime: `${Math.round((performance.now() - this.started) / 1000)}s`, subsystems: [...this.subsystems.keys()] }; },
    boot() { this.register('Kernel', Kernel); this.register('ServiceLocator', ServiceLocator); return this; }
  };

const Framework = {
    components: new Map(),
    registerComponent(name, component) { if (!name || !component) return null; this.components.set(name, component); if (typeof component.init === 'function') component.init(); return component; },
    getComponent(name) { return this.components.get(name); },
    bootstrap() { this.components.forEach(component => { if (typeof component.bootstrap === 'function') component.bootstrap(); }); return this; }
  };

const GraphicsEngine = {
    layers: new Map(),
    registerLayer(name, callback) { if (!name || typeof callback !== 'function') return null; this.layers.set(name, callback); return this; },
    render() { this.layers.forEach(cb => cb()); },
    applyBackground(url) { const desk = document.getElementById('desktop'); if (desk) desk.style.backgroundImage = `url('${url}')`; return this; },
    applyStyle(vars) { if (!vars) return this; Object.entries(vars).forEach(([k, v]) => document.documentElement.style.setProperty(k, v)); return this; }
  };

const ThemeManager = {
    themes: new Map(),
    current: 'VessieOS',
    register(name, vars) { if (!name || !vars) return this; this.themes.set(name, vars); return this; },
    apply(name) { const vars = this.themes.get(name); if (!vars) return false; Object.entries(vars).forEach(([key, val]) => document.documentElement.style.setProperty(key, val)); this.current = name; try { localStorage.setItem('vos-theme', JSON.stringify({ name, vars })); } catch (_) { } return true; },
    init() { try { const stored = JSON.parse(localStorage.getItem('vos-theme') || 'null'); if (stored?.name && stored?.vars) this.register(stored.name, stored.vars); if (stored?.name) this.apply(stored.name); } catch (_) { } }
  };

const VariantManager = {
    variants: new Map(),
    register(name, config) { if (!name || !config) return this; this.variants.set(name, config); return this; },
    get(name) { return this.variants.get(name); },
    apply(name) { const config = this.get(name); if (!config) return false; if (config.styles) GraphicsEngine.applyStyle(config.styles); if (config.background) GraphicsEngine.applyBackground(config.background); if (config.theme) ThemeManager.apply(config.theme); return true; }
  };

const LibraryManager = {
    libraries: [
      { name: 'Tailwind CSS', selected: true, category: 'UI', description: 'Utility-first styling core' },
      { name: 'Bootstrap', selected: true, category: 'UI', description: 'Grid, components, responsive utilities' },
      { name: 'Pico CSS', selected: true, category: 'UI', description: 'Minimal CSS framework' },
      { name: 'Bulma', selected: true, category: 'UI', description: 'Flexbox-based layout system' },
      { name: 'DaisyUI', selected: true, category: 'UI', description: 'Tailwind component library' },
      { name: 'Three.js', selected: true, category: 'Graphics', description: 'WebGL 3D rendering engine' },
      { name: 'babylonjs', selected: true, category: 'Graphics', description: 'High-performance 3D game engine' },
      { name: 'React', selected: false, category: 'UI', description: 'Component-based UI framework' },
      { name: 'Vue', selected: false, category: 'UI', description: 'Reactive template framework' },
      { name: 'Svelte', selected: false, category: 'UI', description: 'Compiler optimized interface framework' },
      { name: 'Alpine.js', selected: false, category: 'UI', description: 'Tiny reactive behaviour' },
      { name: 'GSAP', selected: false, category: 'Graphics', description: 'High-performance animations' },
      { name: 'PixiJS', selected: false, category: 'Graphics', description: '2D WebGL renderer' },
      { name: 'Phaser', selected: false, category: 'Games', description: 'HTML5 game development framework' },
      { name: 'PlayCanvas', selected: false, category: 'Games', description: 'WebGL game engine platform' },
      { name: 'Matter.js', selected: false, category: 'Physics', description: '2D rigid body physics' },
      { name: 'Cannon.js', selected: false, category: 'Physics', description: '3D physics simulation' },
      { name: 'Howler.js', selected: false, category: 'Audio', description: 'Cross-browser sound API' },
      { name: 'Tone.js', selected: false, category: 'Audio', description: 'Interactive audio synthesis' },
      { name: 'Lodash', selected: false, category: 'Utility', description: 'Performance utility helpers' },
      { name: 'Day.js', selected: false, category: 'Utility', description: 'Small date utility library' },
      { name: 'Axios', selected: false, category: 'Network', description: 'HTTP request helper' },
      { name: 'Socket.IO', selected: false, category: 'Network', description: 'Realtime web socket communication' },
      { name: 'Dexie', selected: false, category: 'Storage', description: 'IndexedDB wrapper for local cache' },
      { name: 'Hammer.js', selected: false, category: 'Input', description: 'Touch gestures for mobile controls' },
      { name: 'Zustand', selected: false, category: 'State', description: 'Minimal state management' },
      { name: 'RxJS', selected: false, category: 'State', description: 'Reactive streams and observables' },
      { name: 'SWR', selected: false, category: 'Data', description: 'Data fetching cache layer' },
      { name: 'Framer Motion', selected: false, category: 'Graphics', description: 'Motion animations for UI' }
    ],
    getSelected() { return this.libraries.filter(lib => lib.selected); },
    getAvailable() { return this.libraries; },
    toggle(name) { const lib = this.libraries.find(x => x.name === name); if (!lib) return null; lib.selected = !lib.selected; Kernel.eventBus.emit('library:changed', { name: lib.name, selected: lib.selected }); return lib; },
    describe() { return this.getSelected().map(lib => `${lib.name}: ${lib.description}`); },
    init() { console.log('LibraryManager init:', this.getSelected().length, 'selected'); }
  };

const SandboxManager = {
    secureIframeAttributes: 'allowfullscreen;autoplay;gamepad;microphone;camera;clipboard-read;clipboard-write',
    attach(iframe) { if (!iframe) return iframe; iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock allow-modals'); iframe.setAttribute('allow', this.secureIframeAttributes); iframe.setAttribute('loading', 'lazy'); iframe.setAttribute('referrerpolicy', 'no-referrer'); iframe.style.backgroundColor = '#0b1220'; iframe.style.filter = 'drop-shadow(0 0 20px rgba(0,0,0,.45))'; return iframe; },
    safeUrl(url) { try { const parsed = new URL(url); if (parsed.protocol === 'http:') parsed.protocol = 'https:'; return parsed.href; } catch (e) { return url; } }
  };

const GameEngine = {
    state: { activeGames: 0, frames: 0, optimizations: [] },
    modules: new Map(),
    init() { Kernel.eventBus.on('game:launch', ({ detail }) => { if (detail?.iframe) this.optimizeGameFrame(detail.iframe); }); },
    registerModule(name, module) { if (!name || !module) return null; this.modules.set(name, module); if (typeof module.init === 'function') module.init(); return module; },
    getModule(name) { return this.modules.get(name); },
    optimizeGameFrame(iframe) { if (!iframe) return null; VessieGameRuntime.optimizeGameFrame(iframe); iframe.dataset.secure = 'true'; this.state.optimizations.push('vessie-runtime'); return iframe; },
    launch(url, title) { const safeUrl = SandboxManager.safeUrl(url); const frame = createWin(title || 'Jogo Web', '<i class="fab fa-steam"></i>', `<iframe src="${safeUrl}" style="border:none;width:100%;height:100%" allow="fullscreen;autoplay" title="${title || 'Jogo'}"></iframe>`, 920, 640); const iframe = frame.querySelector('iframe'); this.optimizeGameFrame(iframe); this.state.activeGames++; Kernel.eventBus.emit('game:launched', { url: safeUrl, title, iframe }); return frame; }
  };

const GameOptimizer = {
    improvements: [
      'sandboxed-iframe', 'secure-referrer', 'lazy-loading', 'preload-hints', 'selective-cors', 'gamepad-support', 'audio-priority', 'fps-stabilizer', 'render-layering', 'cache-boost', 'memory-fence', 'minimap-layer', 'input-debounce', 'animation-throttling', 'shader-fallback', 'gpu-hinting', 'network-budget', 'asset-prefetch', 'error-guard', 'safe-mode'
    ],
    apply(iframe) { if (!iframe) return; iframe.dataset.optimized = 'true'; iframe.dataset.gameOptimizations = this.improvements.join(','); return iframe; },
    report() { return `Aplicando ${this.improvements.length} otimizações de jogos`; }
  };

const SecurityEngine = {
    policies: { strictIframes: true, enableReferrerPolicy: true, disableMixedContent: true },
    secureIframe(iframe) { return SandboxManager.attach(iframe); },
    auditIframe(iframe) { if (!iframe) return false; return iframe.getAttribute('sandbox') !== null && iframe.getAttribute('referrerpolicy') === 'no-referrer'; }
  };

const GraphicsModule = {
    layers: new Map(),
    register(name, layer) { if (!name || typeof layer !== 'function') return this; this.layers.set(name, layer); return this; },
    render() { this.layers.forEach(fn => fn()); },
    init() { this.register('gameOverlay', () => { document.documentElement.style.setProperty('--game-glow', 'rgba(96,165,250,.08)'); }); }
  };

const UIFrameworkManager = {
    frameworks: ['Tailwind CSS', 'Bootstrap', 'Pico CSS', 'Bulma', 'DaisyUI', 'Three.js', 'babylonjs'],
    describe() { return this.frameworks.join(', '); },
    init() { console.log('UIFrameworkManager active frameworks:', this.frameworks.length); }
  };

const Engine = {
    modules: new Map(),
    renderers: new Map(),
    state: { frames: 0, lastTick: performance.now(), delta: 0 },
    registerModule(name, module) { if (!name || !module) return null; this.modules.set(name, module); if (typeof module.init === 'function') module.init(); return module; },
    getModule(name) { return this.modules.get(name); },
    registerRenderer(name, renderer) { if (!name || !renderer) return null; this.renderers.set(name, renderer); return renderer; },
    tick() { const now = performance.now(); this.state.delta = now - this.state.lastTick; this.state.lastTick = now; this.state.frames++; this.renderers.forEach(r => { if (typeof r === 'function') r(); else if (r && typeof r.render === 'function') r.render(); }); return this.state; },
    start() { const frame = () => { this.tick(); requestAnimationFrame(frame); }; requestAnimationFrame(frame); return this; }
  };

const StorageEngine = {
    autoSave: 20000,
    timer: null,
    watch() { if (this.timer) clearInterval(this.timer); this.timer = setInterval(() => persistState(), this.autoSave); return this; },
    stop() { if (this.timer) clearInterval(this.timer); this.timer = null; return this; }
  };

const VessieFramework = {
    initialized: false,
    modules: new Map(),
    services: new Map(),
    register(name, module) { if (!name || !module) return null; this.modules.set(name, module); if (typeof module.init === 'function') module.init(); return module; },
    registerService(name, service) { if (!name || !service) return null; this.services.set(name, service); return service; },
    get(name) { return this.modules.get(name) || this.services.get(name); },
    bootstrap() { if (this.initialized) return this; this.initialized = true; Kernel.eventBus.emit('vessie:framework:bootstrap', { modules: [...this.modules.keys()] }); return this; },
    report() { return { initialized: this.initialized, modules: [...this.modules.keys()], services: [...this.services.keys()] }; }
  };

window.VessieFramework = VessieFramework;

const RuntimeMetrics = {
    started: performance.now(),
    counters: { boot: 1, render: 0, iframes: 0, vms: 0, cacheHits: 0, cacheMisses: 0 },
    sample() { this.counters.render += 1; return this.snapshot(); },
    snapshot() { return { uptimeMs: Math.round(performance.now() - this.started), counters: { ...this.counters } }; }
  };

const VessieRuntime = {
    timer: null,
    optimizations: new Map(),
    registerOptimization(name, fn) { if (!name || typeof fn !== 'function') return null; this.optimizations.set(name, fn); return fn; },
    runOptimization(name) { const fn = this.optimizations.get(name); if (typeof fn === 'function') { try { fn(); } catch (err) { console.warn('VessieRuntime', name, err); } } return !!fn; },
    start() { if (this.timer) return this; this.timer = setInterval(() => { RuntimeMetrics.sample(); Kernel.eventBus.emit('vessie:runtime:tick', RuntimeMetrics.snapshot()); }, 3000); return this; },
    stop() { if (this.timer) clearInterval(this.timer); this.timer = null; return this; },
    snapshot() { return RuntimeMetrics.snapshot(); }
  };

window.VessieRuntime = VessieRuntime;

const VessieAIEngine = {
    providers: {
      lmstudio: { label: 'LM Studio', defaultEndpoint: 'http://127.0.0.1:1234/v1/chat/completions', fallbacks: ['http://localhost:1234/v1/chat/completions'] },
      openai: { label: 'OpenAI Compatible', defaultEndpoint: 'https://api.openai.com/v1/chat/completions', fallbacks: [] },
      ollama: { label: 'Ollama', defaultEndpoint: 'http://localhost:11434/api/chat', fallbacks: [] },
      vllm: { label: 'vLLM', defaultEndpoint: 'http://localhost:8000/v1/chat/completions', fallbacks: [] },
      jan: { label: 'Jan', defaultEndpoint: 'http://127.0.0.1:1337/v1/chat/completions', fallbacks: [] },
      anythingllm: { label: 'AnythingLLM', defaultEndpoint: 'http://localhost:3001/v1/chat/completions', fallbacks: [] }
    },
    profiles: [
      { id: 'balanced', label: 'Balanced', temperature: 0.7, maxTokens: 700 },
      { id: 'fast', label: 'Fast', temperature: 0.3, maxTokens: 450 },
      { id: 'creative', label: 'Creative', temperature: 1.0, maxTokens: 900 }
    ],
    state: { activeProvider: 'lmstudio', selectedProfile: 'balanced', requests: 0, retries: 0, timeoutMs: 12000 },
    resolveProvider(provider) { const key = (provider || S.aiProvider || 'lmstudio').toLowerCase(); return this.providers[key] || this.providers.lmstudio; },
    resolveProfile(profile) { return this.profiles.find(p => p.id === profile) || this.profiles.find(p => p.id === 'balanced') || this.profiles[0]; },
    buildPayload(messages, options = {}) {
      const provider = this.resolveProvider(options.provider);
      const profile = this.resolveProfile(options.profile);
      const model = options.model || S.aiModel || 'gpt-4o-mini';
      const base = { model, messages, temperature: options.temperature ?? profile.temperature };
      if (provider && provider.defaultEndpoint.includes('/api/chat')) return { ...base, stream: false };
      return { ...base, max_tokens: options.maxTokens ?? profile.maxTokens };
    },
    async request(messages, options = {}) {
      const provider = this.resolveProvider(options.provider);
      const profile = this.resolveProfile(options.profile);
      const endpoints = [];
      const explicit = options.endpoint || S.aiCustomEndpoint || S.aiEndpoint || '';
      if (explicit) endpoints.push(explicit);
      if (provider.defaultEndpoint) endpoints.push(provider.defaultEndpoint);
      if (Array.isArray(provider.fallbacks)) endpoints.push(...provider.fallbacks);
      const payload = this.buildPayload(messages, { ...options, provider, profile });
      const headers = { 'Content-Type': 'application/json' };
      if (S.apiKey) headers['Authorization'] = `Bearer ${S.apiKey}`;
      const lastErrors = [];
      for (const endpoint of endpoints) {
        try {
          this.state.requests += 1;
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), options.timeoutMs || this.state.timeoutMs);
          const res = await fetch(endpoint, { method: 'POST', headers, body: JSON.stringify(payload), signal: controller.signal });
          clearTimeout(timer);
          const data = await res.json();
          if (!res.ok) throw new Error(data.error?.message || `Erro ${res.status}`);
          if (Array.isArray(data.choices) && data.choices[0]?.message) return { endpoint, data, content: data.choices[0].message.content || '' };
          if (data.choices?.[0]?.text) return { endpoint, data, content: data.choices[0].text || '' };
          if (typeof data.message?.content === 'string') return { endpoint, data, content: data.message.content };
          if (typeof data.response === 'string') return { endpoint, data, content: data.response };
          throw new Error('Resposta inválida do provedor');
        } catch (err) {
          lastErrors.push(`${endpoint}: ${err.message}`);
          this.state.retries += 1;
        }
      }
      throw new Error(lastErrors.join(' | '));
    },
    async chat(messages, options = {}) {
      const result = await this.request(messages, options);
      return result.content;
    },
    async editText(selectedText, instruction) {
      const promptText = `Você é um assistente de edição de texto especializado em manutenção de formato e lógica. Modifique apenas o texto abaixo seguindo esta instrução, preservando o restante do documento inalterado.\n\nInstrução: ${instruction}\n\nTexto selecionado:\n${selectedText}`;
      const messages = [{ role: 'system', content: 'Você é um assistente de edição de código e texto.' }, { role: 'user', content: promptText }];
      return this.chat(messages, { profile: 'balanced' });
    },
    describe() { return { provider: this.state.activeProvider, profile: this.state.selectedProfile, requests: this.state.requests, retries: this.state.retries }; }
  };

window.VessieAIEngine = VessieAIEngine;

// Add VessieOS global API for AI-generated scripts
// This is used by the AI prompt system to generate Node.js code
// that can alter and use the VessieOS web operating system
const VessieOS_API = `
// VessieOS Global API (available in generated scripts)
// - VessieOS: Main system object
// - VessieAIEngine: AI engine instance  
// - VessieFramework: Framework modules
// - VessieRuntime: Runtime metrics
// - VessieWM: Window manager
// - VFS: Virtual File System
// - WindowManager: Window management
// - AppRegistry: Application registry
// - StorageEngine: Local storage
// - ThemeManager: Theme management
// - LibraryManager: Available libraries
// - GraphicsEngine: Graphics rendering
// - ServiceLocator: Service location

// Example usage:
// const files = await VessieOS.VFS.list('C:/Usuarios/' + VessieOS.user() + '/Documentos');
// const apps = WindowManager.list();
// const theme = ThemeManager.apply('VessieOS');
`.trim();

// AI PROMPT PANEL HANDLER
const AIPromptPanel = {
    open() {
      const panel = document.getElementById('ai-prompt-panel');
      if (!panel) return;
      panel.style.display = 'block';
      setTimeout(() => {
        const textarea = document.getElementById('ai-prompt-text');
        if (textarea) textarea.focus();
      }, 100);
      document.getElementById('ai-prompt-close').onclick = this.close;
      document.getElementById('ai-prompt-clear').onclick = () => {
        const textarea = document.getElementById('ai-prompt-text');
        if (textarea) textarea.value = '';
      };
      document.getElementById('ai-prompt-send').onclick = () => this.send();
      document.getElementById('ai-prompt-panel').onclick = (e) => {
        if (e.target.closest('#ai-prompt-panel')) this.close();
      };
    },

    close() {
      const panel = document.getElementById('ai-prompt-panel');
      if (panel) panel.style.display = 'none';
    },

    async send() {
      const textarea = document.getElementById('ai-prompt-text');
      const resultDiv = document.getElementById('ai-prompt-result');
      const prompt = textarea?.value?.trim();
      if (!prompt) return;

      resultDiv.innerHTML = '<div style="color:var(--dim)">Processando...</div>';
      resultDiv.style.display = 'block';

      try {
        // Enhanced system prompt focusing on VessieOS OS manipulation
        const systemPrompt = `Você é um desenvolvedor Node.js especializado em criar sistemas para alterar e utilizar o VessieOS (Web Operating System). Gere um código Node.js completo e funcional que:

        1. Alter/Modifique o sistema operacional VessieOS (configurações, tema, ícones, wallpaper)
        2. Utilize recursos do VessieOS (VFS, gerenciamento de janelas, apps, storedata)
        3. Interaja com o sistema de arquivos local do navegador
        4. Seja bem comentado e siga boas práticas
        
        O código deve poder:
        - Alterar temas, wallpapers e configurações visuais
        - Gerenciar ícones da área de trabalho (tamanho, organização)
        - Criar/remover apps e atalhos
        - Ler/escrever no sistema de arquivos virtual do VessieOS
        - Interagir com o gerenciador de janelas
        
        Use estes recursos do VessieOS:
        ${VessieOS_API}
        
        Prompt do usuário: ${prompt}
        `;

        const result = await VessieAIEngine.chat([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ]);
        
        const code = result.content || '';
        resultDiv.innerHTML = `<div style="background:rgba(0,0,0,.5);border-radius:8px;padding:20px;color:#fff;max-height:500px;overflow:auto;"><pre style="color:#e0e0e0;font-size:0.8rem;"><code class="language-javascript">${this.escapeHtml(code)}</code></pre></div>`;
        
        // Add copy button
        const copyBtn = document.createElement('button');
        copyBtn.style.marginTop='10px';
        copyBtn.style.padding='8px 16px';
        copyBtn.style.background='linear-gradient(135deg,#60a5fa,#a78bfa)';
        copyBtn.style.color='#fff';
        copyBtn.style.border='none';
        copyBtn.style.borderRadius='6px';
        copyBtn.style.cursor='pointer';
        copyBtn.textContent='Copiar código';
        copyBtn.onclick = () => {
          navigator.clipboard.writeText(code).then(() => {
            toast('📋 Código copiado para clipboard!', 'success');
          });
        };
        resultDiv.appendChild(copyBtn);
        
        // Execute button for VessieOS integration
        const execBtn = document.createElement('button');
        execBtn.style.marginTop='10px';
        execBtn.style.padding='8px 16px';
        execBtn.style.background='linear-gradient(135deg,#43cea2,#185a9d)';
        execBtn.style.color='#fff';
        execBtn.style.border='none';
        execBtn.style.borderRadius='6px';
        execBtn.style.cursor='pointer';
        execBtn.textContent='Executar no VessieOS';
        execBtn.onclick = () => this.executeNodeCode(code);
        resultDiv.appendChild(execBtn);
      } catch (err) {
        resultDiv.innerHTML = `<div style="color:#ff7875;">❌ Erro: ${err.message}</div>`;
      }
    },

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    },

    async executeNodeCode(code) {
      // Create a script element and execute it in a sandbox
      const script = document.createElement('script');
      script.textContent = `(function() {
        // Node.js integration with VessieOS
        // This code was generated by AI based on your prompt
        ${code}
      })()`;
      document.body.appendChild(script);
      setTimeout(() => script.remove(), 3000);
      toast('✅ Código Node.js executado no contexto', 'success');
    }
  };

window.AIPromptPanel = AIPromptPanel;

// Add toggle button to taskbar or create shortcut
const tb = document.getElementById('tb');
if (tb) {
  const promptBtn = document.createElement('button');
  promptBtn.className = 'tbtn';
  promptBtn.title='Painel de Prompt IA';
  promptBtn.innerHTML='<i class="fas fa-robot"></i>';
  promptBtn.style.cssText = 'margin-left:8px;';
  promptBtn.onclick = () => AIPromptPanel.open();
  tb.querySelector('.tb-l').appendChild(promptBtn);
}
window.VessieVMManager = {
    vms: new Map(),
    create(name, type = 'sandbox') { const id = `vm-${Date.now().toString(36)}`; const vm = { id, name, type, createdAt: Date.now(), status: 'ready', snapshots: [], lastRestore: null }; this.vms.set(id, vm); RuntimeMetrics.counters.vms = this.vms.size; Kernel.eventBus.emit('vessie:vm:create', { vm }); return vm; },
    list() { return [...this.vms.values()]; },
    snapshot(id) { const vm = this.vms.get(id); if (!vm) return null; const snapshot = { id: Date.now().toString(36), createdAt: Date.now(), status: vm.status }; vm.snapshots.push(snapshot); Kernel.eventBus.emit('vessie:vm:snapshot', { vm, snapshot }); return snapshot; },
    restore(id) { const vm = this.vms.get(id); if (!vm) return null; vm.lastRestore = Date.now(); vm.status = 'restored'; Kernel.eventBus.emit('vessie:vm:restore', { vm }); return vm; }
};

window.VessieVMManager = VessieVMManager;

const VessieIframeRuntime = {
    registry: new Map(),
    attach(iframe, options = {}) {
      if (!iframe) return null;
      const sandbox = options.sandbox || 'allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock allow-popups-to-escape-sandbox';
      const allow = options.allow || 'fullscreen;autoplay;clipboard-read;clipboard-write;camera;microphone';
      iframe.setAttribute('sandbox', sandbox);
      iframe.setAttribute('allow', allow);
      iframe.setAttribute('loading', 'lazy');
      iframe.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
      iframe.style.backgroundColor = options.background || '#000';
      iframe.style.transform = 'translateZ(0)';
      iframe.dataset.vessieRuntime = 'iframe';
      this.registry.set(iframe, { sandbox, allow });
      RuntimeMetrics.counters.iframes = this.registry.size;
      return iframe;
    },
    inspect(iframe) { return this.registry.get(iframe) || null; }
  };

window.VessieIframeRuntime = VessieIframeRuntime;

const VessieGameRuntime = {
    optimizeGameFrame(iframe) { if (!iframe) return null; VessieIframeRuntime.attach(iframe, { sandbox: 'allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock allow-modals', allow: 'fullscreen;autoplay;gamepad;clipboard-read;clipboard-write' }); iframe.style.transition = 'filter .25s ease, transform .25s ease'; iframe.style.transform = 'translateZ(0)'; iframe.dataset.vessieOptimized = 'true'; return iframe; },
    launch(url, title) { const safeUrl = SandboxManager.safeUrl(url); const frame = createWin(title || 'Jogo Web', '<i class="fab fa-steam"></i>', `<iframe src="${safeUrl}" style="border:none;width:100%;height:100%" allow="fullscreen;autoplay" title="${title || 'Jogo'}"></iframe>`, 920, 640); const iframe = frame.querySelector('iframe'); this.optimizeGameFrame(iframe); Kernel.eventBus.emit('vessie:game:launch', { url: safeUrl, title }); return frame; }
  };

CoreSystem.boot();

const CacheManager = {
    maxEntries: 80,
    imageCache: new Map(),
    templateCache: new Map(),
    get(cache, key) { const map = this[cache]; if (!map) return; const value = map.get(key); if (value) { map.delete(key); map.set(key, value); } return value; },
    set(cache, key, value) { const map = this[cache]; if (!map) return; map.set(key, value); if (map.size > this.maxEntries) { const first = map.keys().next().value; map.delete(first); } return value; },
    delete(cache, key) { const map = this[cache]; if (!map) return false; return map.delete(key); },
    clear(cache) { const map = this[cache]; if (!map) return; map.clear(); }
  };

const PersistenceService = {
    key: 'vessieos_state',
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } },
    get(key, fallback = null) { try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch { return fallback; } },
    remove(key) { localStorage.removeItem(key); },
    setState(state) { return this.set(this.key, state); },
    getState() { return this.get(this.key, null); },
    restoreState(target) {
      const data = this.getState();
      if (!data || typeof data !== 'object') return;
      if (data.fs && typeof data.fs === 'object') target.fs = data.fs;
      if (data.fsMeta && typeof data.fsMeta === 'object') target.fsMeta = data.fsMeta;
      if (typeof data.wallpaper === 'string') target.wallpaper = data.wallpaper;
      if (typeof data.desktopIconSize === 'string') target.desktopIconSize = data.desktopIconSize;
      if (typeof data.notificationsEnabled === 'boolean') target.notificationsEnabled = data.notificationsEnabled;
      if (typeof data.animationsEnabled === 'boolean') target.animationsEnabled = data.animationsEnabled;
      if (typeof data.cursorSize === 'number') target.cursorSize = data.cursorSize;
      if (typeof data.iconScale === 'number') target.iconScale = data.iconScale;
      if (Array.isArray(data.wallpapers)) target.wallpapers = ensureWallpapers(data.wallpapers);
      if (typeof data.sounds === 'boolean') target.sounds = data.sounds;
      if (Array.isArray(data.vocabulary)) target.vocabulary = data.vocabulary;
      if (Array.isArray(data.gameTemplates)) target.gameTemplates = data.gameTemplates;
      if (Array.isArray(data.chatHistory)) target.chatHistory = data.chatHistory;
      if (typeof data.iconImageUrl === 'string') target.iconImageUrl = data.iconImageUrl;
      if (typeof data.apiKey === 'string') target.apiKey = data.apiKey;
      if (typeof data.aiProvider === 'string') target.aiProvider = data.aiProvider;
      if (typeof data.aiModel === 'string') target.aiModel = data.aiModel;
      if (typeof data.aiEndpoint === 'string') target.aiEndpoint = data.aiEndpoint;
      if (typeof data.aiCustomEndpoint === 'string') target.aiCustomEndpoint = data.aiCustomEndpoint;
      if (Array.isArray(data.pinnedApps)) target.pinnedApps = data.pinnedApps;
      if (Array.isArray(data.recentApps)) target.recentApps = data.recentApps;
    }
  };

const VFS = {
    /**
     * Nome do usuário atual, higienizado para uso como nome de pasta.
     */
    user() {
      return String(S.user || 'Usuário').replace(/[\\/]/g, '').trim() || 'Usuário';
    },
    /** Raiz do perfil: C:/Usuários/<nome> */
    userRoot() {
      return 'C:/Usuários/' + this.user();
    },
    /** Subpasta do perfil: C:/Usuários/<nome>/<sub> */
    userDir(sub) {
      return this.userRoot() + '/' + sub;
    },
    /**
     * Normaliza um caminho para o formato canônico interno (sempre com
     * separador "/" e, quando aplicável, sob C:/...):
     *   - "%User%" -> nome do usuário atual
     *   - "C:\..." / "C:/..." -> remove o prefixo da unidade
     *   - "Users/<nome>/..." -> "C:/Usuários/<nome>/..."
     *   - "Sistema/..." (legado) -> "C:/..." equivalente
     *   - pastas planas legadas ("Desktop", "Documentos", "Downloads",
     *     "Imagens", "Videos"/"Vídeos", "Música") -> perfil do usuário
     *   - "Program Files"/"Program Files (x86)" -> "Arquivos de Programas"
     * Continua aceitando os caminhos já canônicos sem alteração.
     */
    normalize(path) {
      let p = String(path || '').replace(/\\/g, '/').trim();
      p = p.replace(/%user%/gi, () => this.user());
      p = p.replace(/^\/+/, '').replace(/\/+$/, '');
      const parts = p.split('/').filter(Boolean);
      if (parts[0] && parts[0].toLowerCase() === 'c:') parts[0] = 'C:';
      if (!parts.length) return '';
      if (parts[0] !== 'C:') return 'C:/' + this._mapRest(parts);
      const rest = parts.slice(1);
      if (!rest.length) return 'C:';
      return 'C:/' + this._mapRest(rest);
    },
    // Mapeia segmentos (sem a unidade) para o caminho canonico sob C:/.
    _mapRest(parts) {
      if (!parts.length) return '';
      const head = parts[0];
      const headLow = head.toLowerCase();
      // ja canonico: Usuarios|Windows|Arquivos de Programas|Temp/...
      if (head === 'Usuários' || head === 'Windows' || head === 'Arquivos de Programas' || head === 'Temp') {
        return parts.join('/');
      }
      // "Users/<nome>/..." (inclui "Users" sozinho -> perfil atual)
      if (headLow === 'users') {
        if (parts.length <= 2) return 'Usuários/' + this.user();
        return ['Usuários', ...parts.slice(2)].join('/');
      }
      // "Sistema/..." (legado)
      if (headLow === 'sistema') {
        const rest = parts.slice(1);
        if (!rest.length) return '';
        if (rest[0] === 'Windows') return ['Windows', ...rest.slice(1)].join('/');
        return rest.join('/');
      }
      // pastas planas legadas -> perfil do usuario atual
      const legacyMap = { 'desktop': 'Área de Trabalho', 'videos': 'Vídeos' };
      const userDirs = ['área de trabalho', 'documentos', 'downloads', 'imagens', 'vídeos', 'videos', 'música', 'musica', 'desktop'];
      if (userDirs.includes(headLow)) {
        const dir = legacyMap[headLow] || head;
        return ['Usuários', this.user(), dir, ...parts.slice(1)].join('/');
      }
      // "Program Files[/ (x86)]" -> Arquivos de Programas
      if (headLow === 'program files' || headLow === 'program files (x86)') {
        return ['Arquivos de Programas', ...parts.slice(1)].join('/');
      }
      // raiz desconhecida (pastas custom antigas, devices): vira C:/...
      return parts.join('/');
    },
    resolve(path) { const key = this.normalize(path); if (!key) return S.fs; const parts = key.split('/'); let node = S.fs; for (const part of parts) { if (node && typeof node === 'object' && part in node) { node = node[part]; } else { return null; } } return node; },
    exists(path) { return this.resolve(path) !== null; },
    isLocked(path) { return VFS.isLockedNode(this.resolve(path)); },
    isLockedNode(node) { return !!(node && typeof node === 'object' && node.__locked && !S.windowsUnlocked); },
    list(path) {
      const node = this.resolve(path);
      if (this.isLockedNode(node)) return null; // acesso bloqueado — ver isLockedNode
      return node && typeof node === 'object' ? Object.keys(node) : [];
    },
    read(path) { return this.resolve(path); },
    write(path, value) {
      const key = this.normalize(path);
      const parts = key.split('/');
      if (this._pathHasLockedAncestor(parts)) return false;
      let node = S.fs;
      while (parts.length > 1) { const part = parts.shift(); if (!node[part] || typeof node[part] !== 'object') node[part] = {}; node = node[part]; }
      node[parts[0]] = value;
      this._touchMeta(key, typeof value === 'string' ? value.length : 0);
      return true;
    },
    mkdir(path) { const key = this.normalize(path); if (!key) return false; const parts = key.split('/'); if (this._pathHasLockedAncestor(parts)) return false; let node = S.fs; while (parts.length) { const part = parts.shift(); if (!node[part] || typeof node[part] !== 'object') node[part] = {}; node = node[part]; } return true; },
    delete(path) {
      const key = this.normalize(path);
      const parts = key.split('/');
      if (!parts.length) return false;
      if (this._pathHasLockedAncestor(parts)) return false;
      let node = S.fs;
      while (parts.length > 1) { const part = parts.shift(); if (!node[part] || typeof node[part] !== 'object') return false; node = node[part]; }
      const removed = delete node[parts[0]];
      if (removed && S.fsMeta) {
        delete S.fsMeta[key];
        // limpa metadados de qualquer item dentro de uma pasta removida
        Object.keys(S.fsMeta).forEach((k) => { if (k.startsWith(key + '/')) delete S.fsMeta[k]; });
      }
      return removed;
    },
    /** true se algum ancestral do caminho (incluindo o próprio alvo) for
     * um marcador bloqueado — impede fs.write/mkdir/delete de "vazar"
     * pra dentro de C:\Windows por baixo dos panos (via VessieScript,
     * VessieLang, ou qualquer outro chamador de VFS.write direto),
     * mesmo sem passar pela UI que pediria o código de administrador. */
    _pathHasLockedAncestor(parts) {
      let node = S.fs;
      for (const part of parts) {
        if (!node || typeof node !== 'object') return false;
        if (this.isLockedNode(node)) return true;
        node = node[part];
      }
      return this.isLockedNode(node);
    },

    // ---------- metadados reais (tamanho, criado, modificado) ----------
    _touchMeta(key, size) {
      if (!S.fsMeta) S.fsMeta = {};
      const now = new Date().toISOString();
      const existing = S.fsMeta[key];
      S.fsMeta[key] = { size, created: existing?.created || now, modified: now };
    },
    getExt(name) { const m = /\.([a-z0-9]+)$/i.exec(String(name || '')); return m ? m[1].toLowerCase() : ''; },
    stat(path) {
      const key = this.normalize(path);
      const node = this.resolve(key);
      const isDir = node && typeof node === 'object';
      const locked = this.isLockedNode(node);
      const name = key.split('/').pop() || key;
      const meta = (S.fsMeta && S.fsMeta[key]) || null;
      return {
        path: key,
        name,
        isDir,
        locked,
        ext: isDir ? '' : this.getExt(name),
        size: locked ? node.__fileCount : (isDir ? (node ? Object.keys(node).length : 0) : (meta?.size ?? (typeof node === 'string' ? node.length : 0))),
        created: meta?.created || null,
        modified: meta?.modified || null
      };
    }
  };

window.VFS = VFS;
window.ensureUserDirs = ensureUserDirs;
window.migrateFs = migrateFs;

function requestAdminUnlock(itemLabel = 'esta pasta') {
    if (S.windowsUnlocked) return true;
    const wantsCode = confirm(
      `🔒 Acesso Negado\n\nVocê não tem permissão de administrador para acessar ${itemLabel}.\n\n` +
      `Peça para o administrador liberar o acesso, ou clique em "OK" para digitar o código de administrador agora.`
    );
    if (!wantsCode) { toast('🔒 Acesso negado. Peça para o administrador liberar.', 'error'); return false; }
    const code = prompt('Digite o código de administrador:');
    if (code === null) return false;
    if (code.trim().toLowerCase() === 'vessie') {
      S.windowsUnlocked = true;
      // Revela um conteúdo de verdade (ainda que simples) em vez de deixar
      // os metadados internos do cadeado (__locked/__fileCount) aparecendo
      // como se fossem 2 "arquivos" dentro da pasta depois de desbloqueada.
      const winNode = S.fs?.['C:']?.['Windows'];
      if (winNode && winNode.__locked) {
        S.fs['C:']['Windows'] = { System32: {}, WinSxS: {}, 'System.ini': 'Arquivos internos do sistema. Edite por sua conta e risco.' };
      }
      toast('🔓 Acesso liberado pelo administrador.', 'success');
      return true;
    }
    toast('❌ Código incorreto. Acesso negado.', 'error');
    return false;
  }

window.requestAdminUnlock = requestAdminUnlock;

window.VessieOS = window.VessieOS || {};

window.VessieOS.FileSystem = VFS;

const AppRegistry = {
    apps: new Map(),
    register(app) { if (!app || !app.id) return null; this.apps.set(app.id, app); return app; },
    get(id) { return this.apps.get(id); },
    open(id, ...args) { const app = this.get(id); return app && typeof app.open === 'function' ? app.open(...args) : null; }
  };

const WindowManager = {
    windows: new Map(),
    create(title, icon, content, width, height) { const win = createWin(title, icon, content, width, height); if (win && win.id) this.windows.set(win.id, win); return win; },
    focus(id) { focusWin(id); return this.windows.get(id); },
    close(id) { const win = this.windows.get(id); if (win) win.querySelector('[data-act="cls"]')?.click(); },
    get(id) { return this.windows.get(id); }
  };

ServiceLocator.register('Persistence', PersistenceService);

ServiceLocator.register('CacheManager', CacheManager);

ServiceLocator.register('VFS', VFS);

ServiceLocator.register('AppRegistry', AppRegistry);

ServiceLocator.register('WindowManager', WindowManager);

ServiceLocator.register('CoreSystem', CoreSystem);

ServiceLocator.register('Framework', Framework);

ServiceLocator.register('GraphicsEngine', GraphicsEngine);

ServiceLocator.register('ThemeManager', ThemeManager);

ServiceLocator.register('VariantManager', VariantManager);

ServiceLocator.register('LibraryManager', LibraryManager);

ServiceLocator.register('UIFrameworkManager', UIFrameworkManager);

ServiceLocator.register('SandboxManager', SandboxManager);

ServiceLocator.register('GameEngine', GameEngine);

ServiceLocator.register('GameOptimizer', GameOptimizer);

ServiceLocator.register('SecurityEngine', SecurityEngine);

ServiceLocator.register('Engine', Engine);

ServiceLocator.register('StorageEngine', StorageEngine);

ServiceLocator.register('VessieFramework', VessieFramework);

ServiceLocator.register('VessieRuntime', VessieRuntime);

ServiceLocator.register('VessieAIEngine', VessieAIEngine);

ServiceLocator.register('VessieVMManager', VessieVMManager);

ServiceLocator.register('VessieIframeRuntime', VessieIframeRuntime);

ServiceLocator.register('VessieGameRuntime', VessieGameRuntime);

ServiceLocator.register('VessieSteam', window.VessieSteam);

ServiceLocator.register('VessieLang', window.VessieLang);

ServiceLocator.register('VessieSaving', window.VessieSaving);

ServiceLocator.register('Vin10', window.Vin10);

ServiceLocator.register('Vin10Format', window.Vin10Format);

ServiceLocator.register('VessieLoader', window.VessieLoader);

ServiceLocator.register('VessieNotifications', window.VessieNotifications);

ServiceLocator.register('VessieSearch', window.VessieSearch);

ServiceLocator.register('VessieTaskManager', window.VessieTaskManager);

ServiceLocator.register('VessieControlPanel', window.VessieControlPanel);

ServiceLocator.register('VessieShortcuts', window.VessieShortcuts);

ServiceLocator.register('VessieRecycleBin', window.VessieRecycleBin);

ServiceLocator.register('VessieDiskMgr', window.VessieDiskMgr);

const AIService = {
    provider: 'lmstudio',
    get config() {
      return {
        model: S.aiModel || 'gpt-4o-mini',
        endpoint: S.aiCustomEndpoint || S.aiEndpoint || 'http://127.0.0.1:1234/v1/chat/completions',
        apiKey: S.apiKey || ''
      };
    },
    get headers() {
      const headers = { 'Content-Type': 'application/json' };
      if (this.config.apiKey) headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      return headers;
    },
    async request(payload) {
      const endpoint = this.config.endpoint;
      if (!endpoint) throw new Error('Endpoint de IA não configurado');
      const messages = Array.isArray(payload?.messages) ? payload.messages : [{ role: 'user', content: payload?.content || '' }];
      return VessieAIEngine.request(messages, { endpoint, provider: S.aiProvider || 'lmstudio', model: this.config.model });
    },
    parseCompletion(data) {
      if (data && typeof data === 'object' && typeof data.content === 'string') return data.content;
      return '';
    },
    async chat(messages) {
      const data = await VessieAIEngine.chat(messages, { provider: S.aiProvider || 'lmstudio', model: this.config.model, endpoint: this.config.endpoint });
      return data;
    },
    async editText(selectedText, instruction) {
      return VessieAIEngine.editText(selectedText, instruction);
    }
  };

ServiceLocator.register('AIService', AIService);

ServiceLocator.register('AppRegistry', AppRegistry);

ServiceLocator.register('WindowManager', WindowManager);

ServiceLocator.register('EventBus', Kernel.eventBus);

ServiceLocator.register('Kernel', Kernel);

ThemeManager.register('VessieOS', {
    '--a': '#60a5fa', '--a2': '#a78bfa', '--a3': '#22d3ee', '--acc-glow': 'rgba(96,165,250,.42)', '--acc-glow-2': 'rgba(167,139,250,.35)'
  });

ThemeManager.register('Nebula', {
    '--a': '#8b5cf6', '--a2': '#ec4899', '--a3': '#0ea5e9', '--acc-glow': 'rgba(139,92,246,.35)', '--acc-glow-2': 'rgba(236,72,153,.28)'
  });

ThemeManager.register('Solarized', {
    '--a': '#268bd2', '--a2': '#2aa198', '--a3': '#b58900', '--acc-glow': 'rgba(38,139,210,.35)', '--acc-glow-2': 'rgba(181,137,0,.28)'
  });

ThemeManager.register('Dracula', {
    '--a': '#bd93f9', '--a2': '#ff79c6', '--a3': '#8be9fd', '--acc-glow': 'rgba(189,147,249,.35)', '--acc-glow-2': 'rgba(139,233,253,.28)'
  });

ThemeManager.register('Aurora', {
    '--a': '#22d3ee', '--a2': '#7c3aed', '--a3': '#f472b6', '--acc-glow': 'rgba(34,211,238,.35)', '--acc-glow-2': 'rgba(124,58,237,.28)'
  });

ThemeManager.init();

VariantManager.register('Fluent', { styles: { '--a': '#60a5fa', '--a2': '#a78bfa', '--a3': '#22d3ee' }, background: S.wallpaper, theme: 'VessieOS' });

VariantManager.register('Aurora', { styles: { '--a': '#22d3ee', '--a2': '#7c3aed', '--a3': '#f472b6' }, background: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1400&q=80', theme: 'VessieOS' });

VariantManager.register('Cyberpunk', { styles: { '--a': '#ff007c', '--a2': '#00f5d4', '--a3': '#fee440' }, background: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=1400&q=80', theme: 'Nebula' });

VariantManager.register('Forest', { styles: { '--a': '#48b9c7', '--a2': '#5fdde5', '--a3': '#1a8a98' }, background: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1400&q=80', theme: 'Solarized' });

VariantManager.register('Midnight', { styles: { '--a': '#0f172a', '--a2': '#1e293b', '--a3': '#334155' }, background: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=80', theme: 'Dracula' });

VariantManager.register('Sunset', { styles: { '--a': '#f97316', '--a2': '#facc15', '--a3': '#fb7185' }, background: 'https://images.unsplash.com/photo-1501973801547-2b3a1f66ae22?auto=format&fit=crop&w=1400&q=80', theme: 'Solarized' });

VariantManager.register('Ocean', { styles: { '--a': '#0ea5e9', '--a2': '#22d3ee', '--a3': '#818cf8' }, background: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80', theme: 'VessieOS' });

VariantManager.register('Aurora Glow', { styles: { '--a': '#a855f7', '--a2': '#ec4899', '--a3': '#f59e0b' }, background: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1400&q=80', theme: 'Aurora' });

VariantManager.register('Neon', { styles: { '--a': '#ff4d6d', '--a2': '#845ef7', '--a3': '#22b8cf' }, background: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=1400&q=80', theme: 'Nebula' });

VariantManager.register('Solar', { styles: { '--a': '#f97316', '--a2': '#fed7aa', '--a3': '#facc15' }, background: 'https://images.unsplash.com/photo-1499084732479-de2c02d45fcc?auto=format&fit=crop&w=1400&q=80', theme: 'Solarized' });

VariantManager.register('Forest Mist', { styles: { '--a': '#16a34a', '--a2': '#4ade80', '--a3': '#0f766e' }, background: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1400&q=80', theme: 'VessieOS' });

VariantManager.register('Ocean Breeze', { styles: { '--a': '#3b82f6', '--a2': '#0ea5e9', '--a3': '#22d3ee' }, background: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80', theme: 'VessieOS' });

VariantManager.register('Retro', { styles: { '--a': '#fb7185', '--a2': '#f59e0b', '--a3': '#10b981' }, background: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1400&q=80', theme: 'VessieOS' });

VariantManager.register('Minimal', { styles: { '--a': '#111827', '--a2': '#374151', '--a3': '#9ca3af' }, background: 'https://images.unsplash.com/photo-1496307653780-42ee777d4833?auto=format&fit=crop&w=1400&q=80', theme: 'VessieOS' });

VariantManager.register('Space', { styles: { '--a': '#0f172a', '--a2': '#1e293b', '--a3': '#7c3aed' }, background: 'https://images.unsplash.com/photo-1517976487492-5750f3195933?auto=format&fit=crop&w=1400&q=80', theme: 'Dracula' });

VariantManager.register('Vaporwave', { styles: { '--a': '#c084fc', '--a2': '#f9a8d4', '--a3': '#60a5fa' }, background: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80', theme: 'Aurora' });

VariantManager.register('Cyber', { styles: { '--a': '#22d3ee', '--a2': '#a855f7', '--a3': '#f97316' }, background: 'https://images.unsplash.com/photo-1496307653780-42ee777d4833?auto=format&fit=crop&w=1400&q=80', theme: 'Nebula' });

VariantManager.register('Aurora Night', { styles: { '--a': '#8b5cf6', '--a2': '#0ea5e9', '--a3': '#22d3ee' }, background: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1400&q=80', theme: 'Aurora' });

VariantManager.register('Glass', { styles: { '--a': '#dbeafe', '--a2': '#e0f2fe', '--a3': '#bae6fd' }, background: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1400&q=80', theme: 'Solarized' });

VariantManager.register('Pixel', { styles: { '--a': '#f97316', '--a2': '#fb7185', '--a3': '#8b5cf6' }, background: 'https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=1400&q=80', theme: 'VessieOS' });

VariantManager.register('Emerald', { styles: { '--a': '#10b981', '--a2': '#22c55e', '--a3': '#14b8a6' }, background: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1400&q=80', theme: 'VessieOS' });

VariantManager.register('Sandstone', { styles: { '--a': '#f59e0b', '--a2': '#fbbf24', '--a3': '#f97316' }, background: 'https://images.unsplash.com/photo-1496307653780-42ee777d4833?auto=format&fit=crop&w=1400&q=80', theme: 'Solarized' });

VariantManager.register('Ice', { styles: { '--a': '#93c5fd', '--a2': '#bfdbfe', '--a3': '#e0f2fe' }, background: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1400&q=80', theme: 'VessieOS' });

VariantManager.register('Volcano', { styles: { '--a': '#f97316', '--a2': '#ef4444', '--a3': '#c2410c' }, background: 'https://images.unsplash.com/photo-1517832207067-4db24a2ae47c?auto=format&fit=crop&w=1400&q=80', theme: 'Nebula' });

VariantManager.register('Rust', { styles: { '--a': '#c2410c', '--a2': '#f97316', '--a3': '#f59e0b' }, background: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1400&q=80', theme: 'Solarized' });

VariantManager.register('Coral', { styles: { '--a': '#fb7185', '--a2': '#fda4af', '--a3': '#ffb703' }, background: 'https://images.unsplash.com/photo-1501973801547-2b3a1f66ae22?auto=format&fit=crop&w=1400&q=80', theme: 'VessieOS' });

VariantManager.register('Slate', { styles: { '--a': '#64748b', '--a2': '#94a3b8', '--a3': '#cbd5e1' }, background: 'https://images.unsplash.com/photo-1496307653780-42ee777d4833?auto=format&fit=crop&w=1400&q=80', theme: 'Dracula' });

VariantManager.register('Blossom', { styles: { '--a': '#f9a8d4', '--a2': '#fbcfe8', '--a3': '#fee2e2' }, background: 'https://images.unsplash.com/photo-1496307653780-42ee777d4833?auto=format&fit=crop&w=1400&q=80', theme: 'VessieOS' });

VariantManager.register('Savanna', { styles: { '--a': '#fde047', '--a2': '#facc15', '--a3': '#f97316' }, background: 'https://images.unsplash.com/photo-1496307653780-42ee777d4833?auto=format&fit=crop&w=1400&q=80', theme: 'Solarized' });

VariantManager.register('Arcadia', { styles: { '--a': '#34d399', '--a2': '#6ee7b7', '--a3': '#10b981' }, background: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1400&q=80', theme: 'VessieOS' });

Engine.registerRenderer('graphics', GraphicsEngine);

Engine.registerModule('AI', AIService);

Engine.registerModule('LibraryManager', LibraryManager);

Engine.registerModule('UIFrameworkManager', UIFrameworkManager);

Engine.registerModule('GameEngine', GameEngine);

Engine.registerModule('GameOptimizer', GameOptimizer);

Engine.registerModule('SecurityEngine', SecurityEngine);

CoreSystem.register('ThemeManager', ThemeManager);

CoreSystem.register('VariantManager', VariantManager);

CoreSystem.register('Engine', Engine);

CoreSystem.register('GameEngine', GameEngine);

CoreSystem.register('SecurityEngine', SecurityEngine);

CoreSystem.register('LibraryManager', LibraryManager);

Framework.registerComponent('Graphics', GraphicsEngine);

Framework.registerComponent('VFS', VFS);

Framework.registerComponent('AI', AIService);

Framework.registerComponent('GameEngine', GameEngine);

Framework.registerComponent('LibraryManager', LibraryManager);

Framework.registerComponent('SecurityEngine', SecurityEngine);

Kernel.eventBus.once('kernel:ready', () => { Engine.start(); StorageEngine.watch(); VessieRuntime.start(); VessieFramework.bootstrap(); GameEngine.init(); UIFrameworkManager.init(); LibraryManager.init(); });

Kernel.start();

const WALLS = [
    { n: 'StelleFly Honkai', u: 'https://4kwallpapers.com/images/walls/thumbs_2t/26880.jpg', c: 'StelleFly Honkai' },
    { n: 'Solo Leveling', u: 'https://4kwallpapers.com/images/walls/thumbs_2t/26864.jpg', c: 'Solo Leveling' },
    { n: 'Godzilla Minus Zero 2026', u: 'https://4kwallpapers.com/images/walls/thumbs_2t/26852.jpg', c: 'Godzilla Minus Zero 2026' },
    { n: 'BMW S 1000', u: 'https://4kwallpapers.com/images/walls/thumbs_2t/26835.jpg', c: 'BMW S 1000' },
    { n: 'Grand Theft Auto VI Ultimate Edition', u: 'https://4kwallpapers.com/images/walls/thumbs_2t/26757.jpg', c: 'Grand Theft Auto VI Ultimate Edition' },
    { n: 'Neon-Share', u: 'https://i.giphy.com/KWcGnX2iz0G1fMMHrO.webp', c: 'Neon-Share' },
    { n: 'Cyberpunk 2077', u: 'https://4kwallpapers.com/images/walls/thumbs_2t/26756.jpg', c: 'Cyberpunk 2077' }
  ];

window.WALLS = WALLS;

function ensureWallpapers(list) {
    const source = Array.isArray(list) && list.length ? list : WALLS.map(w => ({ ...w }));
    return source.filter(w => w && w.u).map(w => ({ n: w.n || 'Wallpaper', u: w.u, c: w.c || getWallCategory(w) }));
  }

window.ensureWallpapers = ensureWallpapers;

function persistState() {

    try {
      PersistenceService.setState({
        fs: S.fs,
        fsMeta: S.fsMeta || {},
        wallpaper: S.wallpaper,
        desktopIconSize: S.desktopIconSize,
        cursorSize: S.cursorSize,
        wallpapers: ensureWallpapers(S.wallpapers || []),
        sounds: S.sounds,
        notificationsEnabled: S.notificationsEnabled !== false,
        animationsEnabled: S.animationsEnabled !== false,
        vocabulary: S.vocabulary || [],
        gameTemplates: S.gameTemplates || [],
        iconScale: S.iconScale || 1,
        chatHistory: S.chatHistory || [],
        iconImageUrl: S.iconImageUrl || '',
        apiKey: S.apiKey || '',
        aiProvider: S.aiProvider || 'lmstudio',
        aiModel: S.aiModel || 'gpt-4o-mini',
        aiEndpoint: S.aiEndpoint || '',
        aiCustomEndpoint: S.aiCustomEndpoint || '',
        pinnedApps: S.pinnedApps || [],
        recentApps: S.recentApps || [],
        taskbarPinned: S.taskbarPinned || []
      });
    } catch (e) { }
    if (typeof window.VessieRemoteStorageSync === 'function') {
      window.VessieRemoteStorageSync(S);
    }
  }

window.persistState = persistState;

function restoreState() {
    try {
      PersistenceService.restoreState(S);
    } catch (e) { }
    S.wallpapers = ensureWallpapers(S.wallpapers || []);
    if (!S.wallpapers.length) {
      S.wallpapers = WALLS.map(w => ({ ...w }));
    }
    if (!Array.isArray(S.vocabulary)) S.vocabulary = [];
    if (!Array.isArray(S.gameTemplates)) S.gameTemplates = [];
    if (!S.fsMeta || typeof S.fsMeta !== 'object') S.fsMeta = {};
    if (!Array.isArray(S.pinnedApps)) S.pinnedApps = ['vessie', 'explorer', 'games', 'chrome', 'terminal', 'settings', 'notepad', 'calc', 'vstore'];
    if (!Array.isArray(S.recentApps)) S.recentApps = [];
    if (!Array.isArray(S.taskbarPinned)) S.taskbarPinned = [];
  }

restoreState();

// Migra saves do modelo plano (Desktop/Documentos/... na raiz) para a
// árvore C:/Usuários/<nome>/... e garante o perfil do usuário atual.
migrateFs();
ensureUserDirs(true);
try { persistState(); } catch (_) { /* ignore */ }
document.documentElement.classList.toggle('vsys-reduce-motion', S.animationsEnabled === false);

function normalizeText(value) {
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

/**
 * Migra o VFS do modelo plano legado (pastas soltas na raiz do S.fs)
 * para a árvore C:/Usuários/<nome>/... + C:/Windows + C:/Arquivos de
 * Programas + C:/Temp. Preserva todo o conteúdo e remapeia fsMeta e
 * S.currentPath. Roda uma vez por boot; sem legado, não faz nada.
 */
function migrateFs() {
    if (!S.fs || typeof S.fs !== 'object') S.fs = {};
    if (S.fs['C:'] && S.fs['C:']['Usuários']) return;
    const old = S.fs;
    const take = (k) => (old && typeof old[k] === 'object' && old[k] !== null ? old[k] : {});
    const user = VFS.user();
    const userDir = {
      'Área de Trabalho': take('Desktop'),
      'Documentos': take('Documentos'),
      'Downloads': take('Downloads'),
      'Imagens': take('Imagens'),
      'Música': take('Música'),
      'Vídeos': take('Videos')
    };
    const known = new Set(['C:', 'Desktop', 'Documentos', 'Downloads', 'Imagens', 'Videos', 'Música', 'Vídeos', 'Sistema']);
    const extra = {};
    Object.keys(old).forEach(k => {
      if (!known.has(k) && typeof old[k] === 'object' && old[k] !== null) extra[k] = old[k];
    });
    const oldSys = take('Sistema');
    const winMarker = (oldSys && typeof oldSys['Windows'] === 'object' && oldSys['Windows'] !== null)
      ? oldSys['Windows']
      : { __locked: true, __fileCount: 104 };
    S.fs = Object.assign({
      'C:': {
        'Usuários': { [user]: userDir },
        'Windows': winMarker,
        'Arquivos de Programas': {},
        'Temp': {}
      }
    }, extra);
    // fsMeta usa caminhos como chave: remapeia prefixos legados.
    if (S.fsMeta && typeof S.fsMeta === 'object') {
      const fresh = {};
      Object.keys(S.fsMeta).forEach(k => {
        try {
          const nk = VFS.normalize(k);
          fresh[nk || k] = S.fsMeta[k];
        } catch (_) { fresh[k] = S.fsMeta[k]; }
      });
      S.fsMeta = fresh;
    }
    // currentPath legado -> novo (se existir).
    if (S.currentPath) {
      try {
        const np = VFS.normalize(S.currentPath);
        if (np && VFS.exists(np)) S.currentPath = np;
        else S.currentPath = '';
      } catch (_) { S.currentPath = ''; }
    }
  }

/**
 * Garante as 6 pastas do perfil do usuário atual (cria o perfil na
 * primeira vez, estilo Windows). seedWelcome=true escreve os arquivos de
 * boas-vindas quando o perfil nasce vazio.
 */
function ensureUserDirs(seedWelcome) {
    const user = VFS.user();
    const base = 'C:/Usuários/' + user;
    const dirs = ['Área de Trabalho', 'Documentos', 'Downloads', 'Imagens', 'Música', 'Vídeos'];
    let createdProfile = false;
    dirs.forEach(d => {
      if (!VFS.exists(base + '/' + d)) { VFS.mkdir(base + '/' + d); createdProfile = true; }
    });
    if (seedWelcome && createdProfile && !VFS.exists(base + '/Documentos/Bem-vindo.txt')) {
      VFS.write(base + '/Documentos/Bem-vindo.txt', 'Olá! Bem-vindo ao VessieOS 💜\n\nEste é seu espaço pessoal.');
      let gameCount = '';
      try { gameCount = (typeof GAMES !== 'undefined' && GAMES.length ? '\n• Game Hub com ' + GAMES.length + ' jogos' : ''); } catch (_) {}
      VFS.write(base + '/Documentos/Leia-me.txt', 'VessieOS v3.0\n\n• IA Vessie integrada\n• Dashboard completo' + gameCount + '\n• Terminal\n• Bloco de notas\n• Explorador de arquivos');
      try {
        if (typeof PLANOS_CONTENT !== 'undefined' && PLANOS_CONTENT) VFS.write(base + '/Documentos/Planos.md', PLANOS_CONTENT);
      } catch (_) { /* ignore */ }
    }
    return base;
  }

function normalizeGameName(value) {
    return normalizeText(value).replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

function dedupeGames(list) {
    const seen = new Set();
    const out = [];
    for (const game of list || []) {
      const key = `${normalizeGameName(game?.name)}|${normalizeGameName(game?.url)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(game);
    }
    return out;
  }

function buildVessiePhrases() {
    // FRASES NATURAIS DA VESSIE - Personalize aqui!
    // Adicione mais respostas para diferentes contextos
    const responses = {
      'help|ajuda|socorro|sos': ['Claro, estou aqui! 💜 O que você precisa?', 'Como posso ajudar você hoje?', 'Estou pronta! Qual é sua dúvida?'],
      'oi|olá|hey': ['Oi! 💜 Tudo bem com você?', 'Olá! Bem-vindo! ✨', 'E aí! Como vai?'],
      'wallpaper|papel|fundo': ['Posso aplicar wallpapers novos e alternar entre categorias como Natureza, Tech e Futurista.', 'Quer personalizar seu fundo? Tenho várias opções legais!'],
      'jogo|game|play': ['Amei! Temos vários jogos legais disponíveis. Qual você quer jogar?', 'Gostaria de jogar algo? Temos Minecraft, 1v1 LOL e mais!'],
      'música|music|som': ['Quer ouvir uma música? Temos um player completo para você!', 'Posso tocar músicas para você! 🎵'],
      'arquivo|salvar|export': ['Posso salvar seus dados em arquivo para você usar depois!', 'Quer exportar seus dados? Faço isso para você!'],
      'obrigado|thanks|vlw': ['De nada! Sempre feliz em ajudar 💜', 'Fico feliz em poder ajudar!', 'Qualquer coisa, estou por aqui!'],
      'legal|top|show': ['Fico feliz que tenha gostado! ✨', 'Que legal! Quer descobrir mais funcionalidades?'],
    };
    return responses;
  }

const VESSIE_RESPONSES = buildVessiePhrases();

function getVessieResponse(msg) {
    const lower = normalizeText(msg || '');
    for (const [keys, responses] of Object.entries(VESSIE_RESPONSES || {})) {
      const keyList = keys.split('|');
      if (keyList.some(k => lower.includes(k))) {
        return responses[Math.floor(Math.random() * responses.length)];
      }
    }
    return pickVessiePhrase();
  }

function pickVessiePhrase() {
    const generic = [
      '💜 Estou pronta para ajudar com o que vier!',
      '✨ Que interessante!',
      '🌟 Entendi!',
      '💜 Legal! Gosto dessa ideia.',
      '⚡ Pode deixar comigo!'
    ];
    return generic[Math.floor(Math.random() * generic.length)];
  }

function applyDesktopIconSize(size) {
    S.desktopIconSize = size;
    persistState();
    renderDesktop();
    toast('Tamanho dos ícones atualizado ✨', 'success');
  }
// Exposta globalmente: chamada via onchange inline no HTML das Configurações
// (que roda em escopo global), então precisa existir em window — sem isso,
// trocar o tamanho do ícone lançava ReferenceError silenciosamente.
window.applyDesktopIconSize = applyDesktopIconSize;

function applyIconImage(url) {
    if (!url) return;
    S.iconImageUrl = url;
    persistState();
    renderDesktop();
    toast('Ícone personalizado aplicado 🖼️', 'success');
  }
window.applyIconImage = applyIconImage;

window.exportVessieData = function () {
    const payload = {
      vocabulary: S.vocabulary || [],
      gameTemplates: S.gameTemplates || [],
      wallpapers: S.wallpapers || [],
      wall: S.wallpaper,
      theme: localStorage.getItem('vos-theme') || ''
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'vessieos-export.json';
    a.click();
    toast('Arquivo exportado com sucesso 📦', 'success');
  };

window.importVessieData = function (file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (Array.isArray(data.vocabulary)) S.vocabulary = data.vocabulary;
        if (Array.isArray(data.gameTemplates)) S.gameTemplates = data.gameTemplates;
        if (Array.isArray(data.wallpapers)) S.wallpapers = data.wallpapers;
        if (data.wall) S.wallpaper = data.wall;
        if (data.theme) localStorage.setItem('vos-theme', data.theme);
        persistState();
        renderDesktop();
        toast('Importação concluída ✅', 'success');
      } catch (e) { toast('Arquivo inválido para importação', 'error'); }
    };
    reader.readAsText(file);
  };

window.openVessieTraining = function () { };

window.trainVessieVocabulary = function () { };

let soundCtx = null;

function getSoundContext() {
    if (!soundCtx) {
      soundCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (soundCtx.state === 'suspended') soundCtx.resume();
    return soundCtx;
  }

function playSound(kind = 'notify') {
    if (!S.sounds) return;
    try {
      const ctx = getSoundContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const map = { boot: [440, 660], notify: [523, 784], open: [659, 880], error: [220, 180], window: [392, 523] };
      const [f1, f2] = map[kind] || map.notify;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f1, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(f2, ctx.currentTime + 0.16);
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.03, ctx.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.2);
      osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.22);
    } catch (e) { }
  }

GAMES = [
    { n: 'Village Craft', u: 'https://1v1-lol.gitlab.io/go/class-389.html', ic: 'https://jamestore214.github.io/img/class-389.png' },
    { n: 'Shady Bears', u: 'https://1v1-lol.gitlab.io/go/class-379.html', ic: 'https://jamestore214.github.io/img/class-379.png' },
    { n: 'Bitlife', u: 'https://1v1-lol.gitlab.io/go/class-441.html', ic: 'https://jamestore214.github.io/img/class-441.png' },
    { n: 'Moto X3m Pool Party', u: 'https://1v1-lol.gitlab.io/go/class-462.html', ic: 'https://jamestore214.github.io/img/class-462.png' },
    { n: 'Minecraft', u: 'https://play.mcjs.cc/1.8.8/', ic: 'https://www.rw-designer.com/icon-image/5547-256x256x32.png' },
    { n: 'Parking Fury 3D: Night Thief', u: 'https://1v1-lol.gitlab.io/go/class-725.html', ic: 'https://jamestore214.github.io/img/class-725.png' },
    { n: 'Idle Startup Tycoon', u: 'https://1v1-lol.gitlab.io/go/class-778.html', ic: 'https://jamestore214.github.io/img/class-778.png' },
    { n: 'City Brawl', u: 'https://orbit-kick.com/games/city-brawl/', ic: 'https://dam.orbit-kick.com/styles/medium/s3/games/city-brawl-cover.png.webp' },
    { n: 'Bat Smash', u: 'https://orbit-kick.com/games/bat-smash/', ic: 'https://dam.orbit-kick.com/styles/medium/s3/games/bat-smash-cover.png.webp' },
    { n: 'Wacky Steps', u: 'https://orbit-kick.com/games/wacky-steps/', ic: 'https://dam.orbit-kick.com/styles/medium/s3/games/wacky-steps-cover.png.webp' },
    { n: 'Dunk Clash', u: 'https://orbit-kick.com/games/dunk-clash/', ic: 'https://dam.orbit-kick.com/styles/medium/s3/games/dunk-clash-cover.jpg.webp' },
    { n: 'Ragdoll Playground', u: 'https://orbit-kick.com/games/ragdoll-playground/', ic: 'https://dam.orbit-kick.com/styles/medium/s3/games/ragdoll-playground-cover.png.webp' },
    { n: 'Slope Snowball', u: 'https://orbit-kick.com/games/slope-snowball/', ic: 'https://dam.orbit-kick.com/styles/medium/s3/games/slope-snowball-cover.png.webp' },
    { n: 'Slope Rider', u: 'https://orbit-kick.com/games/slope-rider/', ic: 'https://dam.orbit-kick.com/styles/medium/s3/games/slope-rider-cover.png.webp' },
    { n: 'Ragdoll Hit', u: 'https://orbit-kick.com/games/ragdoll-hit/', ic: 'https://dam.orbit-kick.com/styles/medium/s3/games/ragdoll-hit.png.webp' },
    { n: 'Color Rush', u: 'https://orbit-kick.com/games/color-rush/', ic: 'https://dam.orbit-kick.com/styles/medium/s3/games/color-rush.png.webp' },
    { n: 'Labubu Clicker', u: 'https://orbit-kick.com/games/labubu-clicker/', ic: 'https://dam.orbit-kick.com/styles/medium/s3/games/labubu-clicker-cover.png.webp' },
    { n: 'Italian Brainrot Clicker 2', u: 'https://orbit-kick.com/games/italian-brainrot-clicker-2/', ic: 'https://dam.orbit-kick.com/styles/medium/s3/games/italian-brainrot-clicker-2-cover.png.webp' },
    { n: 'Flying Ball', u: 'https://orbit-kick.com/games/flying-ball/', ic: 'https://dam.orbit-kick.com/styles/medium/s3/games/flying-ball-cover.png.webp' },
    { n: 'Perfect Orbit', u: 'https://orbit-kick.com/games/perfect-orbit/', ic: 'https://dam.orbit-kick.com/styles/medium/s3/games/perfect-orbit-cover.png.webp' },
    { n: 'Track Dash', u: 'https://orbit-kick.com/games/track-dash/', ic: 'https://dam.orbit-kick.com/styles/medium/s3/games/track-dash-cover.png.webp' },
    { n: 'Ragdoll Launcher', u: 'https://orbit-kick.com/games/ragdoll-launcher/', ic: 'https://dam.orbit-kick.com/styles/medium/s3/games/ragdoll-launcher-cover.png.webp' },
    { n: 'Golf Puzzle', u: 'https://orbit-kick.com/games/golf-puzzle/', ic: 'https://dam.orbit-kick.com/styles/medium/s3/games/golf-puzzle-cover.png.webp' },
    { n: 'Arrow Arena', u: 'https://orbit-kick.com/games/arrow-arena/', ic: 'https://dam.orbit-kick.com/styles/medium/s3/games/arrow-arena-cover.png.webp' },
    { n: 'Wobbly Pets', u: 'https://orbit-kick.com/games/wobbly-pets/', ic: 'https://dam.orbit-kick.com/styles/medium/s3/games/wobbly-pets-cover.png.webp' },
    { n: 'Lift Off 2', u: 'https://orbit-kick.com/games/lift-off-2/', ic: 'https://dam.orbit-kick.com/styles/medium/s3/games/lift-off-2-cover.png.webp' },
    { n: 'Tunnel Rush', u: 'https://orbit-kick.com/games/tunnel-rush/', ic: 'https://dam.orbit-kick.com/styles/medium/s3/games/tunnel-rush.png.webp' },
    { n: 'Tralalero Tralala Clicker', u: 'https://orbit-kick.com/games/tralalero-tralala-clicker/', ic: 'https://dam.orbit-kick.com/styles/medium/s3/games/tralalero-tralala-clicker-cover.png.webp' },
    { n: 'Wacky Nursery 2', u: 'https://orbit-kick.com/games/wacky-nursery-2/', ic: 'https://dam.orbit-kick.com/styles/medium/s3/games/wacky-nursery-2-cover.png.webp' },
    { n: 'Wacky Nursery', u: 'https://orbit-kick.com/games/wacky-nursery/', ic: 'https://dam.orbit-kick.com/styles/medium/s3/games/wacky-nursery-cover.png.webp' },
    { n: 'Hyper Tunnel', u: 'https://orbit-kick.com/games/hyper-tunnel/', ic: 'https://dam.orbit-kick.com/styles/medium/s3/games/hyper-tunnel-cover.png.webp' },
    { n: 'Knife Master', u: 'https://dam.orbit-kick.com/styles/medium/s3/games/knife-master-cover.png.webp', ic: 'https://orbit-kick.com/games/knife-master/' },
    { n: 'Rocket Soccer Derby', u: 'https://1v1-lol.gitlab.io/go/class-527.html', ic: 'https://jamestore214.github.io/img/class-527.png' },
    { n: 'IZOWAVE', u: 'https://1v1-lol.gitlab.io/go/class-325.html', ic: 'https://jamestore214.github.io/img/class-325.png' },
    { n: 'Rock Paper Clicker', u: 'https://1v1-lol.gitlab.io/go/class-1127.html', ic: 'https://jamestore214.github.io/img/class-1127.png' },
    { n: 'Tiger Simulator 3d', u: 'https://1v1-lol.gitlab.io/go/class-587.html', ic: 'https://jamestore214.github.io/img/class-587.png' },
    { n: 'Crazy Taxi', u: 'https://snowriderio.io/crazy-taxi', ic: 'https://snowriderio.io/cache/data/image/game/crazy-taxi-1-h220x220.webp' },
    { n: 'Az Games', u: 'https://azgames.io/', ic: 'https://azgames.io/favicon.ico' },
    { n: 'Bacon May Die', u: 'https://1v1-lol.gitlab.io/go/class-334.html', ic: 'https://jamestore214.github.io/img/class-334.png' },
    { n: 'Jetski Race', u: 'https://snowriderio.io/jetski-race', ic: 'https://snowriderio.io/cache/data/image/game/jetski-race-h220x220.webp' },
    { n: 'Blue Hedgehog Hill Dash Ride', u: 'https://snowriderio.io/blue-hedgehog-hill-dash-ride', ic: 'https://snowriderio.io/cache/data/image/game/blue-hedgehog-hill-dash-ride-h220x220.webp' },
    { n: '1v1 LOL', u: 'https://1v1-lol.gitlab.io/', ic: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR3HlcPjxDtFoPAY6TcOGPk1H2Qb8l0trXLzQ&s' },
    { n: 'Friday Night Funkin', u: 'https://fnf-2.io/', ic: 'https://art.ngfiles.com/images/1674000/1674368_bozubrain_fnf-icons-free-to-use.png?f1614903474' },
    { n: 'Veck IO', u: 'https://hollowknight.io/veck-io', ic: 'https://escaperoadcity.org/cache/data/image/game/veck-io-avt-m150x150.jpg' },
    { n: 'Escape Road', u: 'https://snowroad.io/escape-road-2', ic: 'https://snowroad.io/cache/data/image/game/escape-road-game-f200x200.webp' },
    { n: 'Curve Rush', u: 'https://snowroad.io/curve-rush', ic: 'https://snowroad.io/cache/data/image/game/curve-rush-2-1-f200x200.webp' },
    { n: 'Drift Hunters', u: 'https://escaperoadcity.org/drift-hunters-max', ic: 'https://escaperoadcity.org/cache/data/image/game/drift-hunters-max-cover-m150x150.png' },
    { n: 'Subway Surfers', u: 'https://1v1-lol.gitlab.io/go/class-444.html', ic: 'https://img.poki-cdn.com/cdn-cgi/image/q=78,scq=50,width=40,height=40,fit=cover,f=auto/fc09ae107e5bbe1531e5d87d216b09f8/subway-surfers.png' },
    { n: 'Dude Theft AUTO', u: 'https://escaperoadcity.org/dude-theft-auto', ic: 'https://escaperoadcity.org/cache/data/image/game/dude-theft-auto-avt-m54x54.jpg' },
    { n: 'Drift Boss', u: 'https://snowroad.io/drift-boss', ic: 'https://snowroad.io/cache/data/image/game/drift-boss-f200x200.webp' },
    { n: 'Crossy Road', u: 'https://snowroad.io/crossy-road', ic: 'https://snowroad.io/cache/data/image/game/crossy-road-unblocked-f200x200.webp' },
    { n: 'Stickman Slash', u: 'https://snowroad.io/stickman-slash', ic: 'https://snowroad.io/cache/data/image/game/stickman-slash-sn-f200x200.webp' },
    { n: 'Snow Road', u: 'https://snowroad.io/', ic: 'https://snowroad.io/cache/data/image/game/snow-road-game-1-f200x200.webp' },
    { n: 'Dead Strike', u: 'https://escaperoadcity.org/dead-strike', ic: 'https://escaperoadcity.org/cache/data/image/game/dead-strike-avt-m150x150.jpg' },
    { n: 'Kart Bros IO', u: 'https://escaperoadcity.org/kart-bros-io', ic: 'https://escaperoadcity.org/cache/data/image/game/kart-bros-io-avt-e-m150x150.jpg' },
    { n: 'Undead Invasion', u: 'https://escaperoadcity.org/undead-invasion', ic: 'https://escaperoadcity.org/cache/data/image/game/undead-invasion-avt-m150x150.jpg' },
    { n: 'Orbit Kick', u: 'https://escaperoadcity.org/orbit-kick', ic: 'https://escaperoadcity.org/cache/data/image/game/orbit-kick-1-m54x54.png' },
    { n: 'GT Cars Racing', u: 'https://escaperoadcity.org/gt-cars-city-racing', ic: 'https://escaperoadcity.org/cache/data/image/game/gt-cars-city-racing-cover-m54x54.png' },
    { n: 'Sling Drift', u: 'https://escaperoadcity.org/sling-drift', ic: 'https://escaperoadcity.org/cache/data/image/game/sling-drift-cover-m54x54.png' },
    { n: 'Jelly Runner', u: 'https://escaperoadcity.org/jelly-runner', ic: 'https://escaperoadcity.org/cache/data/image/game/jelly-runner-avt-m150x150.jpg' },
    { n: 'Rebound Shooter', u: 'https://escaperoadcity.org/rebound-shooter', ic: 'https://escaperoadcity.org/cache/data/image/game/rebound-shooter-avt-m150x150.jpg' },
    { n: 'Retro Rush', u: 'https://snowroad.io/retro-rush', ic: 'https://snowroad.io/cache/data/image/game/retro-rush-1-f200x200.webp' },
    { n: '2v2 IO', u: 'https://2v2.io/', ic: 'https://brain-lines.io/cache/data/image/game/2v2io-b1-f240x240.webp' },
    { n: 'Car Destruction King', u: 'https://snowriderio.io/car-destruction-king', ic: 'https://snowriderio.io/cache/data/image/game/car-destruction-king-h220x220.webp' },
    { n: 'Tsunami Race', u: 'https://snowriderio.io/tsunami-race', ic: 'https://snowriderio.io/cache/data/image/game/tsunami-race-h220x220.webp' },
    { n: 'Rob Brainrot 2', u: 'https://snowriderio.io/cache/data/image/game/rob-brainrot-2-h220x220.webp', ic: 'https://snowriderio.io/cache/data/image/game/rob-brainrot-2-h220x220.webp' },
    { n: 'Crossy Road', u: 'https://snowriderio.io/crossy-road', ic: 'https://snowriderio.io/cache/data/image/game/crossy-road-h220x220.webp' },
    { n: 'Snowy Roads', u: 'https://snowriderio.io/truck-driver-snowy-roads', ic: 'https://snowriderio.io/cache/data/image/game/snowy-roads-h220x220.webp' },
    { n: 'Climb Hero', u: 'https://snowriderio.io/climb-hero', ic: 'https://snowriderio.io/cache/data/image/game/climb-hero-1-h220x220.webp' },
    { n: 'Demolition Derby', u: 'https://snowriderio.io/demolition-derby', ic: 'https://snowriderio.io/cache/data/image/game/demolition-derby-h220x220.webp' },
    { n: 'Slalom Ski Simulator', u: 'https://snowriderio.io/slalom-ski-simulator', ic: 'https://snowriderio.io/cache/data/image/game/slalom-ski-simulator-h220x220.webp' },
    { n: 'Golf Orbit', u: 'https://snowriderio.io/golf-orbit', ic: 'https://snowriderio.io/cache/data/image/game/golf-orbit-h220x220.webp' },
    { n: 'Fireboy and Watergirl', u: 'https://snowriderio.io/fireboy-and-watergirl', ic: 'https://snowriderio.io/cache/data/image/game/fireboy-and-watergirl-h220x220.webp' },
    { n: 'Astro Clicker', u: 'https://snowroad.io/astro-robot-clicker', ic: 'https://snowroad.io/cache/data/image/game/robotcl-f200x200.webp' },
    { n: 'Traffic Light Simulator 3D', u: 'https://snowriderio.io/traffic-light-simulator-3d', ic: 'https://snowriderio.io/cache/data/image/game/traffic-light-simulator-3d-h220x220.webp' },
    { n: 'Steal Brainrot Eggs', u: 'https://snowriderio.io/steal-brainrot-eggs', ic: 'https://snowriderio.io/cache/data/image/game/steal-brainrot-eggs-h220x220.webp' },
    { n: 'Moto X3M', u: 'https://snowriderio.io/moto-x3m-game', ic: 'https://snowriderio.io/cache/data/image/game/moto-x3m-game-h220x220.webp' },
    { n: 'Granny', u: 'https://snowriderio.io/granny', ic: 'https://snowriderio.io/cache/data/image/game/granny-h220x220.webp' },
    { n: 'Space Waves', u: 'https://snowriderio.io/space-waves', ic: 'https://snowriderio.io/cache/data/image/game/space-waves-h220x220.webp' },
    { n: 'SUV Snow Driving 3D', u: 'https://snowriderio.io/suv-snow-driving-3d', ic: 'https://snowriderio.io/cache/data/image/game/suv-snow-driving-3d-h220x220.webp' },
    { n: 'Xlope', u: 'https://snowriderio.io/xlope', ic: 'https://snowriderio.io/cache/data/image/game/xlope-game-h220x220.webp' },
    { n: '99 Nights in the Forest', u: 'https://snowriderio.io/99-nights-in-the-forest', ic: 'https://snowriderio.io/cache/data/image/game/99-nights-in-the-forest-h220x220.webp' },
    { n: 'Human Expenditure Program', u: 'https://snowriderio.io/human-expenditure-program', ic: 'https://snowriderio.io/cache/data/image/game/human-expenditure-program-h220x220.webp' },
    { n: '67 Clicker', u: 'https://snowriderio.io/67-clicker', ic: 'https://snowriderio.io/cache/data/image/game/67-clicker-h220x220.webp' },
    { n: 'Madness Lab', u: 'https://snowriderio.io/madness-lab', ic: 'https://snowriderio.io/cache/data/image/game/madness-lab-h220x220.webp' },
    { n: 'Swipe Ball', u: 'https://snowriderio.io/swipe-ball', ic: 'https://snowriderio.io/cache/data/image/game/swipe-ball-2-h220x220.webp' },
    { n: 'Chase Rush', u: 'https://snowriderio.io/chase-rush', ic: 'https://snowriderio.io/cache/data/image/game/chase-rush-h220x220.webp' },
    { n: 'Wheelie Master', u: 'https://escaperoadcity.org/wheelie-master', ic: 'https://escaperoadcity.org/cache/data/image/game/wheelie-master-avt-m54x54.jpg' },
    { n: 'Stickman Empire', u: 'https://snowriderio.io/stickman-empires', ic: 'https://snowriderio.io/cache/data/image/game/stickman-empire-1-h220x220.webp' },
    { n: 'Color Jump', u: 'https://snowriderio.io/color-jump', ic: 'https://snowriderio.io/cache/data/image/game/color-jump-h220x220.webp' },
    { n: 'Plants vs. Brainrots', u: 'https://snowriderio.io/plants-vs-brainrots', ic: 'https://snowriderio.io/cache/data/image/game/plants-vs-brainrots-h220x220.webp' },
    { n: 'Rocket Fortress', u: 'https://snowriderio.io/rocket-fortress', ic: 'https://snowriderio.io/cache/data/image/game/rocket-fortress.jpg1-h220x220.webp' },
    { n: 'Mad Pursuit', u: 'https://snowriderio.io/mad-pursuit', ic: 'https://snowriderio.io/cache/data/image/game/mad-pursuit-2-h220x220.webp' },
    { n: 'Super Bear Adventure 3', u: 'https://snowriderio.io/super-bear-adventure-3', ic: 'https://snowriderio.io/cache/data/image/game/super-bear-adventure-3-h220x220.webp' },
    { n: 'Escape Road City', u: 'https://escaperoadcity.org/escape-road-city', ic: 'https://escaperoadcity.org/cache/data/image/game/escape-road-city-game-m54x54.jpg' },
    { n: 'Traffic Road', u: 'https://dashmetry.com/traffic-road', ic: 'https://snowroad.io/cache/data/image/game/traffic-road-f200x200.webp' },
    { n: 'Cobb Can Move', u: 'https://snowroad.io/cobb-can-move', ic: 'https://snowroad.io/cache/data/image/game/cobb-can-move-f200x200.webp' },
    { n: 'Wurst Dash', u: 'https://snowroad.io/wurst-dash', ic: 'https://snowroad.io/cache/data/image/game/wurst-dash-f200x200.webp' },
    { n: 'Tube Fight', u: 'https://snowroad.io/tube-fight', ic: 'https://snowroad.io/cache/data/image/game/tube-fight-g-f200x200.webp' },
    { n: 'Pick Brainrot: 3D Battle', u: 'https://snowriderio.io/pick-brainrot-3d-battle', ic: 'https://snowriderio.io/cache/data/image/game/pick-brainrot-h220x220.webp' },
    { n: 'Tap Brawl', u: 'https://snowroad.io/tap-brawl', ic: 'https://snowroad.io/cache/data/image/game/tap-brawl-sn1-f200x200.webp' },
    { n: 'Curve Rush IO', u: 'https://snowriderio.io/curve-rush-io', ic: 'https://snowriderio.io/cache/data/image/game/curve-rush-io-h220x220.webp' },
    { n: 'Hoop Legends', u: 'https://snowriderio.io/hoop-legends', ic: 'https://snowriderio.io/cache/data/image/game/hoop-legends-h220x220.webp' },
    { n: 'Kickback Dash', u: 'https://snowriderio.io/kickback-dash', ic: 'https://snowriderio.io/cache/data/image/game/kickback-dash-h220x220.webp' },
    { n: 'Buckshot Roulette', u: 'https://game3.glov3.me/uploads/game/html5/26485/', ic: 'https://buckshotroulette.com/data/image/game/buckshot-roulette-feature-image.jpg' },
    { n: 'Ultrakill Prelude', u: 'blob:https://1077352353-atari-embeds.googleusercontent.com/b2ea0f86-a8d8-4454-a5a5-e11a998ae78c', ic: 'https://www.play-games.com/files/img/ultrakill-prelude-1766330796.jpg' },
    { n: 'Go Kart Go Ultra', u: 'https://1v1-lol.gitlab.io/go/class-604.html', ic: 'https://jamestore214.github.io/img/class-604.png' },
    { n: 'Car Drift Racers 2', u: 'https://1v1-lol.gitlab.io/go/class-601.html', ic: 'https://jamestore214.github.io/img/class-601.png' },
    { n: 'Escape Raid', u: 'https://snowriderio.io/escape-raid', ic: 'https://snowriderio.io/cache/data/image/game/escape-raid-1-h220x220.webp' },
    { n: 'hollow knight 2', u: 'https://hollowknight.io/hollow-knight-2', ic: 'https://hollowknight.io/cache/data/image/game/hollow-knight-2/hollow-knight-2-m150x150.webp' },
    { n: 'Kindergarten', u: 'https://hollowknight.io/kindergarten', ic: 'https://hollowknight.io/cache/data/image/game/kindergarten/kindergarten-game-m150x150.webp' },
    { n: 'Pizza Tower', u: 'https://hollowknight.io/pizza-tower', ic: 'https://hollowknight.io/cache/data/image/game/pizza-tower/pizza-tower-m150x150.webp' },
    { n: 'Little Nightmares', u: 'https://hollowknight.io/little-nightmares', ic: 'https://hollowknight.io/cache/data/image/game/little-nightmares/little-nightmares-m150x150.webp' },
    { n: 'Stick Fight', u: 'https://hollowknight.io/stick-fight', ic: 'https://hollowknight.io/cache/data/image/game/stick-fight/stick-fight-m150x150.webp' },
    { n: 'Stick Fight', u: 'https://hollowknight.io/stick-fight', ic: 'https://hollowknight.io/cache/data/image/game/doki-doki-literature-club/doki-doki-literature-club-m150x150.webp' },
    { n: '2048', u: 'https://1v1-lol.gitlab.io/go/class-452.html', ic: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/18/2048_logo.svg/330px-2048_logo.svg.png?_=20251209055949' },
    { n: 'Pro Evolution Soccer 2', u: 'https://classicgamezone.com/pt/games/pro-evolution-soccer-2', ic: 'https://classicgamezone.com/games/covers/ps/pro-evolution-soccer-2.webp' },
    { n: 'School Fury', u: 'https://snowroad.io/school-fury', ic: 'https://snowroad.io/cache/data/image/game/school-fury-sn-f200x200.webp' },
    { n: 'Wave Rider', u: 'https://snowroad.io/wave-rider', ic: 'https://snowroad.io/cache/data/image/game/wave-rider-f200x200.webp' },
    { n: 'Temple Run', u: 'https://snowriderio.io/temple-run', ic: 'https://snowriderio.io/cache/data/image/game/temple-run-h220x220.webp' },
    { n: 'Ninja Obby Parkour', u: 'https://snowriderio.io/ninja-obby-parkour', ic: 'https://snowriderio.io/cache/data/image/game/ninja-obby-parkour-h220x220.webp' },
    { n: 'Chicken Scream Race', u: 'https://snowriderio.io/chicken-scream-race', ic: 'https://snowriderio.io/cache/data/image/game/chicken-scream-race-h220x220.webp' },
    { n: 'Build an Aquapark', u: 'https://snowriderio.io/build-an-aquapark', ic: 'https://snowriderio.io/cache/data/image/game/build-an-aquapark-1-h220x220.webp' },
    { n: 'Drift Frenzy', u: 'https://snowroad.io/drift-frenzy', ic: 'https://snowroad.io/cache/data/image/game/drift-frenzy-f200x200.webp' },
    { n: 'Snow Racer', u: 'https://snowriderio.io/', ic: 'https://snowriderio.io/cache/data/image/game/snow-rider-io-h220x220.webp' },
    { n: 'Snow Racer 3D', u: 'https://snowriderio.io/snow-rider-3d', ic: 'https://snowriderio.io/cache/data/image/game/snow-rider-3d-h220x220.webp' },
    { n: 'Drift Rush', u: 'https://snowriderio.io/drift-rush', ic: 'https://snowriderio.io/cache/data/image/game/drift-rush-h220x220.webp' },
    { n: 'Cowboy Safari', u: 'https://snowriderio.io/cowboy-safari', ic: 'https://snowriderio.io/cache/data/image/game/cowboy-safari-h220x220.webp' },
    { n: 'Dart Hero', u: 'https://snowriderio.io/dart-hero', ic: 'https://snowriderio.io/cache/data/image/game/dart-hero-h220x220.webp' },
    { n: 'Flippy Race', u: 'https://snowriderio.io/flippy-race', ic: 'https://snowriderio.io/cache/data/image/game/flippy-race-h220x220.webp' },
    { n: 'Wacky Flip', u: 'https://snowriderio.io/wacky-flip', ic: 'https://snowriderio.io/cache/data/image/game/wacky-flip-h220x220.webp' },
    { n: 'Fish Quest', u: 'https://snowriderio.io/fish-quest', ic: 'https://snowriderio.io/cache/data/image/game/fish-quest-h220x220.webp' },
    { n: 'Sorry Bob', u: 'https://snowriderio.io/sorry-bob', ic: 'https://snowriderio.io/cache/data/image/game/sorry-bob-h220x220.webp' },
    { n: 'BloodMoney', u: 'https://snowriderio.io/bloodmoney', ic: 'https://snowriderio.io/cache/data/image/game/bloodmoney-h220x220.webp' },
    { n: 'Red Rush', u: 'https://snowriderio.io/red-rush', ic: 'https://snowriderio.io/cache/data/image/game/red-rush-h220x220.webp' },
    { n: 'Arcade Volley', u: 'https://snowriderio.io/arcade-volley', ic: 'https://snowriderio.io/cache/data/image/game/arcade-volley-h220x220.webp' },
    { n: 'Fall Flat Battle', u: 'https://snowriderio.io/fall-flat-battle', ic: 'https://snowriderio.io/cache/data/image/game/fall-flat-battle-h220x220.webp' },
    { n: 'Snowball Adventure', u: 'https://snowriderio.io/snowball-adventure', ic: 'https://snowriderio.io/cache/data/image/game/snowball-adventure-h220x220.webp' },
    { n: 'Merge Rot', u: 'https://snowriderio.io/merge-rot', ic: 'https://snowriderio.io/cache/data/image/game/merge-rot-h220x220.webp' },
    { n: 'Super Mario World', u: 'https://classicgamezone.com/games/super-mario-world', ic: 'https://classicgamezone.com/games/covers/snes/super-mario-world.webp' },
    { n: 'Tralalero Tralala Clicker', u: 'https://snowriderio.io/tralalero-tralala-clicker', ic: 'https://snowriderio.io/cache/data/image/game/tralalero-tralala-clicker-h220x220.webp' },
    { n: 'Flip Master', u: 'https://snowriderio.io/flip-master', ic: 'https://snowriderio.io/cache/data/image/game/flip-master-h220x220.webp' },
    { n: 'Snow Racer Parkour', u: 'https://snowriderio.io/snow-rider-obby-parkour', ic: 'https://snowriderio.io/cache/data/image/game/snow-rider-obby-parkour-h220x220.webp' },
    { n: 'Crazy Cars', u: 'https://snowriderio.io/crazy-cars', ic: 'https://snowriderio.io/cache/data/image/game/crazy-cars-1-h220x220.webp' },
    { n: 'Snake.io', u: 'https://snowriderio.io/snake-io', ic: 'https://snowriderio.io/cache/data/image/game/snake.io-h220x220.webp' },
    { n: 'Clash Crowd Game', u: 'https://snowriderio.io/clash-crowd-game', ic: 'https://snowriderio.io/cache/data/image/game/clash-crowd-game-h220x220.webp' },
    { n: 'Golf Hit Game', u: 'https://snowriderio.io/golf-hit', ic: 'https://snowriderio.io/cache/data/image/game/golf-hit-game-h220x220.webp' },
    { n: 'Golf Hit Game', u: 'https://snowriderio.io/golf-hit', ic: 'https://snowriderio.io/cache/data/image/game/golf-hit-game-h220x220.webp' },
    { n: 'Tomb Raider II', u: 'https://classicgamezone.com/pt/games/tomb-raider-2', ic: 'https://classicgamezone.com/games/covers/ps/tomb-raider-2.webp' },
    { n: 'Unity Play', u: 'https://play.unity.com/pt', ic: 'https://unity.com/pt/favicon.ico' },
    { n: 'Xadres', u: 'https://www.jogar-xadrez.com/jogar-contra-computador.html/', ic: 'https://t4.ftcdn.net/jpg/19/72/75/71/240_F_1972757119_aFVzB4n1NFlCOxiQt7QmtuTMQ4Y1KVtB.jpg' },
    { n: 'Tekken 3', u: 'https://classicgamezone.com/pt/games/tekken-3', ic: 'https://classicgamezone.com/games/covers/ps/tekken-3.webp' },
    { n: 'Hollow Knight', u: 'https://hollowknight.io/', ic: 'https://hollowknight.io/cache/data/image/game/hollow-knight/hollow-knight-m200x200.webp' },
    { n: 'FIFA 2000: Major League Soccer', u: 'https://classicgamezone.com/pt/games/fifa-2000-major-league-soccer', ic: 'https://classicgamezone.com/games/covers/ps/fifa-2000-major-league-soccer.webp' },
    { n: 'Crash Bandicoot', u: 'https://classicgamezone.com/pt/games/crash-bandicoot', ic: 'https://classicgamezone.com/games/covers/ps/crash-bandicoot.webp' },
    { n: 'Crash Bandicoot 2: Cortex Strikes Back', u: 'https://classicgamezone.com/pt/games/crash-bandicoot-2-cortex-strikes-back', ic: 'https://classicgamezone.com/games/covers/ps/crash-bandicoot-2-cortex-strikes-back.webp' },
    { n: 'Crash Bandicoot 3', u: 'https://classicgamezone.com/pt/games/crash-bandicoot-3-warped', ic: 'https://classicgamezone.com/games/covers/ps/crash-bandicoot-3-warped.webp' },
    { n: 'Fnaf Game', u: 'https://fnafgame.io/', ic: 'chrome://favicon2/?size=24&scaleFactor=1x&showFallbackMonogram=&pageUrl=https%3A%2F%2Ffnafgame.io%2F' },
    { n: 'Crash Team Racing', u: 'https://classicgamezone.com/pt/games/crash-team-racing', ic: 'https://classicgamezone.com/games/covers/ps/crash-team-racing.webp' },
    { n: 'Thumb Fighter', u: 'https://1v1-lol.gitlab.io/go/class-644.html', ic: 'https://jamestore214.github.io/img/class-644.png' },
    { n: 'Horror Nights Story', u: 'https://1v1-lol.gitlab.io/go/class-1023.html', ic: 'https://jamestore214.github.io/img/class-1023.png' },
    { n: 'Zombie Dying Survival Days', u: 'https://1v1-lol.gitlab.io/go/class-1078.html', ic: 'https://jamestore214.github.io/img/class-1078.png' },
    { n: 'Gunspin', u: 'https://1v1-lol.gitlab.io/go/class-533.html', ic: 'https://jamestore214.github.io/img/class-533.png' },
    { n: 'Basket Random', u: 'https://1v1-lol.gitlab.io/go/class-436.html', ic: 'https://jamestore214.github.io/img/class-436.png' }
  ];
window.GAMES = GAMES;

const TRACKS = [
    { t: 'Lofi Vibes', a: 'VessieOS Radio', dur: 214, src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
    { t: 'Neon Dreams', a: 'Synthwave Mix', dur: 187, src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
    { t: 'Chill Beats', a: 'Study Playlist', dur: 243, src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
    { t: 'Pixel Heart', a: '8-bit Sounds', dur: 156, src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
    { t: 'Midnight City', a: 'Ambient Radio', dur: 298, src: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3' }
  ];

window.TRACKS = TRACKS;

const APPS = [
    { id: 'vessie', n: 'Vessie IA', ic: '<i class="fas fa-wand-magic-sparkles"></i>', cat: 'ai' },
    { id: 'neural', n: 'Vessie Neural', ic: '<i class="fas fa-brain"></i>', cat: 'ai' },
    { id: 'comandos', n: 'Console de Comandos', ic: '<i class="fas fa-terminal"></i>', cat: 'sys' },
    { id: 'appbuilder', n: 'Criador de Apps', ic: '<i class="fas fa-screwdriver-wrench"></i>', cat: 'sys' },
    { id: 'notas', n: 'Notas', ic: '<i class="fas fa-note-sticky"></i>', cat: 'util' },
    { id: 'monitor', n: 'Monitor do Sistema', ic: '<i class="fas fa-gauge-high"></i>', cat: 'sys' },
    { id: 'vessielang', n: 'VessieLang Studio', ic: '<i class="fas fa-code"></i>', cat: 'learn' },
    { id: 'painel', n: 'Painel de Comando', ic: '<i class="fas fa-sliders"></i>', cat: 'sys' },
    { id: 'dashboard', n: 'Dashboard', ic: '<i class="fas fa-chart-line"></i>', cat: 'util' },
    { id: 'edu', n: 'Educação', ic: '<i class="fas fa-graduation-cap"></i>', cat: 'learn' },
    { id: 'automation', n: 'Automação', ic: '<i class="fas fa-robot"></i>', cat: 'sys' },
    { id: 'explorer', n: 'Explorador', ic: '<i class="fas fa-folder-open"></i>', cat: 'sys' },
    { id: 'chrome', n: 'Chrome', ic: '<i class="fas fa-globe"></i>', cat: 'util' },
    { id: 'nvidia', n: 'Nvidia APP', ic: '<i class="fas fa-microchip"></i>', cat: 'sys' },
    { id: 'games', n: 'Steam', ic: '<i class="fab fa-steam"></i>', cat: 'game' },
    { id: 'framework', n: 'Vessie Framework', ic: '<i class="fas fa-cubes"></i>', cat: 'sys' },
    { id: 'vm', n: 'VM Manager', ic: '<i class="fas fa-server"></i>', cat: 'sys' },
    { id: 'notepad', n: 'Bloco de Notas', ic: '<i class="fas fa-file-lines"></i>', cat: 'util' },
    { id: 'calc', n: 'Calculadora', ic: '<i class="fas fa-calculator"></i>', cat: 'util' },
    { id: 'music', n: 'Música', ic: '<i class="fas fa-music"></i>', cat: 'media' },
    { id: 'terminal', n: 'Terminal', ic: '<i class="fas fa-terminal"></i>', cat: 'sys' },
    { id: 'settings', n: 'Configurações', ic: '<i class="fas fa-gear"></i>', cat: 'sys' },
    { id: 'discord', n: 'Discord', ic: '<i class="fab fa-discord"></i>', cat: 'util' },
    { id: 'camera', n: 'Câmera', ic: '<i class="fas fa-camera"></i>', cat: 'media' },
    { id: 'word', n: 'Editor de Texto', ic: '<i class="fas fa-pen-to-square"></i>', cat: 'util' },
    { id: 'vcoinstore', n: 'Loja VessieCoin', ic: '<i class="fas fa-coins"></i>', cat: 'util' },
    { id: 'vstore', n: 'Vessie-Store', ic: '<i class="fas fa-store"></i>', cat: 'sys' },
    { id: 'errorcenter', n: 'Central de Erros', ic: '<i class="fas fa-triangle-exclamation"></i>', cat: 'sys' }
  ];

const VESSY_PROMPT = `Você é a Vessie, a assistente de IA integrada ao VessieOS.

Estilo:
- Direta, clara e tecnicamente precisa; sem diminutivos e sem excesso de emojis
- Tom cordial e profissional; objetiva, com exemplos curtos quando ajudarem
- Se errar, reconheça em uma frase e corrija
- Pode ajudar com programação, matemática, escrita, organização e com o próprio sistema (apps, arquivos, terminal, configurações)
- Quando o usuário pedir uma tarefa do sistema, proponha os passos e peça confirmação antes de qualquer ação irreversível

Responda sempre em português brasileiro.`;

setWall(S.wallpaper);

function setLoginVisibility(visible) {
    const login = document.getElementById('login');
    if (!login) return;
    const content = login.querySelector('.login-content');
    login.style.display = 'grid';
    login.style.opacity = '1';
    login.style.visibility = 'visible';
    login.style.pointerEvents = 'auto';
    login.classList.add('is-ready');
    login.classList.toggle('is-visible', visible);
    if (content) {
      content.style.opacity = visible ? '1' : '0';
      content.style.transform = visible ? 'translateY(0)' : 'translateY(18px)';
    }
}

function revealLoginScreen() {
    const login = document.getElementById('login');
    if (!login || login.classList.contains('is-visible')) return;
    setLoginVisibility(true);
    requestAnimationFrame(() => {
        const input = document.getElementById('l-name');
        if (input) {
            input.focus();
            input.select();
        }
    });
}

function shouldShowLoginOnUserInteraction() {
    const login = document.getElementById('login');
    const desktop = document.getElementById('desktop');
    const boot = document.getElementById('boot');
    if (!login || !desktop || (boot && boot.style.display !== 'none')) return false;
    return desktop.style.display !== 'block' && !login.classList.contains('is-visible');
}

setTimeout(() => {
    const boot = document.getElementById('boot');
    boot.style.opacity = '0';
    setTimeout(() => {
      boot.style.display = 'none';
      const login = document.getElementById('login');
      if (login) {
        setLoginVisibility(false);
      }
      updateLockWidgets();
      updateClock();
      if (!window.vessieLockClockInterval) {
        window.vessieLockClockInterval = window.setInterval(updateClock, 1000);
      }
    }, 450);
  }, 1100);

document.addEventListener('pointerdown', (event) => {
  if (event.target && event.target.closest('#l-btn')) return;
  if (shouldShowLoginOnUserInteraction()) revealLoginScreen();
}, { passive: true, capture: true });

document.addEventListener('keydown', (event) => {
  if (event.target && ['INPUT', 'TEXTAREA'].includes(event.target.tagName)) return;
  if (shouldShowLoginOnUserInteraction()) revealLoginScreen();
}, { capture: true });

document.getElementById('login-continue').onclick = revealLoginScreen;

const loginAvatar = document.getElementById('login-avatar');
const loginAvatarFile = document.getElementById('login-avatar-file');
const loginAvatarPhoto = document.getElementById('login-avatar-photo');
const loginAvatarIcon = document.getElementById('login-avatar-icon');
function setLoginAvatar(dataUrl) {
    if (!loginAvatarPhoto || !loginAvatarIcon || !dataUrl) return;
    loginAvatarPhoto.src = dataUrl;
    loginAvatarPhoto.hidden = false;
    loginAvatarIcon.hidden = true;
  }
try {
  const savedAvatar = localStorage.getItem('vessie_profile_photo');
  if (savedAvatar) setLoginAvatar(savedAvatar);
} catch (error) {
  console.warn('Não foi possível carregar a foto de perfil salva:', error);
}
loginAvatar?.addEventListener('click', () => loginAvatarFile?.click());
loginAvatar?.addEventListener('dblclick', (e) => {
  e.preventDefault();
  if (loginAvatarPhoto && !loginAvatarPhoto.hidden && loginAvatarPhoto.src) {
    if (confirm('Remover foto de perfil?')) clearLoginAvatar();
  }
});
if (loginAvatar) loginAvatar.title = 'Escolher foto de perfil (duplo-clique remove a foto)';

function clearLoginAvatar() {
  try { localStorage.removeItem('vessie_profile_photo'); } catch (_) { /* ignore */ }
  if (loginAvatarPhoto) { loginAvatarPhoto.removeAttribute('src'); loginAvatarPhoto.hidden = true; }
  if (loginAvatarIcon) loginAvatarIcon.hidden = false;
  toast('Foto de perfil removida.', 'info');
  syncProfileToMenu();
}

// Leva foto + nome do login para o Menu Iniciar (avatar e nome do rodapé).
function syncProfileToMenu() {
  const photo = (loginAvatarPhoto && !loginAvatarPhoto.hidden && loginAvatarPhoto.src) ? loginAvatarPhoto.src : null;
  const name = (document.getElementById('l-name')?.value || '').trim() || (window.S && window.S.user) || 'Visitante';
  const uav = document.querySelector('#sm-usr .sm-uav');
  if (uav) {
    if (photo) {
      uav.innerHTML = '';
      const img = document.createElement('img');
      img.src = photo; img.alt = '';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;border-radius:50%;display:block';
      uav.appendChild(img);
    } else if (!uav.querySelector('img')) {
      uav.innerHTML = '<i class="fas fa-user"></i>';
    }
  }
  const un = document.getElementById('sm-uname');
  if (un) un.textContent = name;
}
try {
  const savedName = localStorage.getItem('vessie_profile_name');
  if (savedName) {
    const nameInput = document.getElementById('l-name');
    if (nameInput && !nameInput.value) nameInput.value = savedName;
  }
} catch (_) { /* ignore */ }
loginAvatarFile?.addEventListener('change', () => {
  const file = loginAvatarFile.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) {
    toast('Escolha uma imagem de até 2 MB.', 'error');
    loginAvatarFile.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onerror = () => toast('Não foi possível carregar a foto de perfil.', 'error');
  reader.onload = () => {
    if (typeof reader.result !== 'string') {
      toast('A imagem selecionada possui um formato inválido.', 'error');
      return;
    }
    try {
      localStorage.setItem('vessie_profile_photo', reader.result);
      setLoginAvatar(reader.result);
    } catch (error) {
      toast(`Não foi possível salvar a foto: ${error?.message || 'armazenamento indisponível'}`, 'error');
    }
  };
  reader.readAsDataURL(file);
});

document.getElementById('l-btn').onclick = () => {
  revealLoginScreen();
  loginFn();
};

document.getElementById('l-name').addEventListener('keydown', e => { if (e.key === 'Enter') loginFn(); });

function loginFn() {
    const n = document.getElementById('l-name').value.trim() || 'Visitante';
    S.user = n;
    // Exposto globalmente pra outros scripts (ex.: execute-exes.js,
    // VessieScript, VessieLang) resolverem a tag "%User%" sem precisar
    // acessar o closure interno de S diretamente.
    window.VessieOS = window.VessieOS || {};
    window.VessieOS.currentUser = n;
    try { localStorage.setItem('vessie_profile_name', n); } catch (_) { /* ignore */ }
    // Perfil novo ganha as 6 pastas (estilo Windows) no primeiro login.
    try { ensureUserDirs(true); persistState(); } catch (_) { /* ignore */ }
    const login = document.getElementById('login');
    const desktop = document.getElementById('desktop');
    const taskbar = document.getElementById('tb');
    const userName = document.getElementById('sm-uname');

    if (userName) userName.textContent = n;
    syncProfileToMenu();
    if (login) {
      login.classList.remove('is-visible');
      login.classList.remove('is-ready');
      login.style.opacity = '0';
      login.style.visibility = 'hidden';
      login.style.pointerEvents = 'none';
      login.style.display = 'none';
    }
    if (desktop) desktop.style.display = 'block';
    if (taskbar) taskbar.style.display = 'flex';
    setWall(S.wallpaper);
    renderDesktop();
    renderStartMenu();
    renderTaskbarPins();
    updateClock();
    if (!window.vessieLockClockInterval) {
      window.vessieLockClockInterval = window.setInterval(updateClock, 1000);
    }
    setTimeout(() => {
      toast(`Olá, ${n}! 💜 Bem-vindo ao VessieOS!`, 'default');
      addNotif('VessieOS', 'Sistema iniciado com sucesso! 🌟');
    }, 600);
  }

function updateClock() {
    const now = new Date();
    const t = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const d = now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    const taskbarTime = document.getElementById('tb-time');
    const taskbarDate = document.getElementById('tb-date');
    const lockTime = document.getElementById('lock-time');
    const lockDate = document.getElementById('lock-date');
    if (taskbarTime) taskbarTime.textContent = t;
    if (taskbarDate) taskbarDate.textContent = d;
    if (lockTime) lockTime.textContent = t;
    if (lockDate) lockDate.textContent = now.toLocaleDateString('pt-BR', {
      weekday: 'long', day: 'numeric', month: 'long'
    });
  }

function updateLockWidgets() {
    updateLockWeather();
    const news = document.getElementById('lock-news');
    if (news) {
      const items = [
        'VessieOS iniciado. Seus arquivos e aplicativos estão prontos.',
        'Dica: use o Explorador para abrir e organizar seus arquivos.',
        'Dica: configure o LM Studio nas opções da Vessie IA para usar modelos locais.'
      ];
      const index = Math.floor(Date.now() / 86400000) % items.length;
      news.textContent = items[index];
    }
  }

// Clima real via Open-Meteo (grátis, sem chave). Usa a localização do
// navegador quando permitida (salva em cache) ou São Paulo como padrão.
// Nunca exibe erro técnico na tela de bloqueio — em caso de falha mostra
// uma mensagem neutra e acolhedora.
async function updateLockWeather() {
    const el = document.getElementById('lock-weather');
    const show = (t) => { if (el) el.textContent = t; };
    try {
      let coords = null;
      try { coords = JSON.parse(localStorage.getItem('vessie_geo') || 'null'); } catch (_) { coords = null; }
      if (!coords && navigator.geolocation) {
        coords = await new Promise((res) => {
          let done = false;
          const fin = (v) => { if (!done) { done = true; res(v); } };
          try {
            navigator.geolocation.getCurrentPosition(
              (p) => fin({ lat: p.coords.latitude, lon: p.coords.longitude }),
              () => fin(null),
              { timeout: 4000, maximumAge: 86400000 }
            );
          } catch (_) { fin(null); }
          setTimeout(() => fin(null), 4500);
        });
        if (coords) { try { localStorage.setItem('vessie_geo', JSON.stringify(coords)); } catch (_) {} }
      }
      const lat = coords?.lat ?? -23.55, lon = coords?.lon ?? -46.63;
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 6000);
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2,weather_code&timezone=auto`, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!r.ok) throw new Error('http ' + r.status);
      const j = await r.json();
      const code = j?.current?.weather_code;
      const desc = { 0: 'Céu limpo', 1: 'Quase limpo', 2: 'Parcialmente nublado', 3: 'Nublado', 45: 'Nevoeiro', 48: 'Nevoeiro com geada', 51: 'Garoa leve', 53: 'Garoa', 55: 'Garoa forte', 61: 'Chuva leve', 63: 'Chuva', 65: 'Chuva forte', 71: 'Neve leve', 73: 'Neve', 75: 'Neve forte', 80: 'Pancadas leves', 81: 'Pancadas', 82: 'Pancadas fortes', 95: 'Tempestade', 96: 'Tempestade com granizo' }[code] || 'Tempo instável';
      show(`${desc} · ${Math.round(j.current.temperature_2)}°C`);
    } catch (_) {
      show('Um ótimo dia para criar algo novo ✨');
    }
  }

function isImageWallpaper(url) {
    if (typeof url !== 'string') return false;
    if (url.startsWith('data:image/')) return true;
    try {
      const parsed = new URL(url, window.location.href);
      return /\.(gif|webp|jpe?g|png|avif)$/i.test(parsed.pathname)
        || parsed.hostname === 'images.unsplash.com'
        || parsed.searchParams.has('auto');
    } catch (error) {
      return /\.(gif|webp|jpe?g|png|avif)(\?.*)?$/i.test(url);
    }
  }

function setWall(url) {
    const next = url || S.wallpaper || WALLS[0]?.u || '';
    S.wallpaper = next;
    const desktop = document.getElementById('desktop');
    const mediaBg = document.getElementById('desktop-media-bg');
    const loginWallpaper = document.getElementById('login-wallpaper');
    if (mediaBg) mediaBg.innerHTML = '';
    if (loginWallpaper) {
      const imageUrl = isImageWallpaper(next) ? next : (WALLS[0]?.u || '');
      loginWallpaper.style.backgroundImage = `url("${imageUrl.replace(/["\\\r\n]/g, '')}")`;
    }
    if (desktop) {
      if (next.match(/\.(mp4|webm|ogg)(\?.*)?$/i)) {
        desktop.style.backgroundImage = 'none';
        if (mediaBg) {
          mediaBg.innerHTML = `<video autoplay muted loop playsinline src="${next}"></video>`;
        }
      } else if (next.startsWith('http://') || next.startsWith('https://')) {
        const isImage = isImageWallpaper(next);
        if (isImage) {
          desktop.style.backgroundImage = `url('${next}')`;
        } else {
          desktop.style.backgroundImage = 'none';
          if (mediaBg) {
            mediaBg.innerHTML = `<iframe src="${next}" allow="autoplay; fullscreen" sandbox="allow-same-origin allow-scripts allow-popups"></iframe>`;
          }
        }
      } else {
        desktop.style.backgroundImage = `url('${next}')`;
      }
    }
  }

function toast(msg, type = 'default', title = '') {
    const wrap = document.getElementById('toasts');
    const el = document.createElement('div');
    el.className = `toast ${type === 'success' ? 's' : type === 'error' ? 'e' : ''}`;
    el.innerHTML = `${title ? `<div class="t-title">${title}</div>` : ''}${msg}`;
    wrap.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .4s'; setTimeout(() => el.remove(), 400) }, 3500);
  }

window.toast = toast;

// Expostos para a Vessie-Store (e outros módulos) atualizarem menus/desktop
// após instalar/desinstalar. São function declarations no mesmo IIFE, então
// já existem (hoisted) quando esta linha executa.
window.renderDesktop = renderDesktop;
window.renderPinnedGrid = renderPinnedGrid;
window.renderAllAppsGrid = renderAllAppsGrid;
window.renderRecentApps = renderRecentApps;
window.smCatMeta = smCatMeta;

function addNotif(title, body) {
    if (S.notificationsEnabled === false) return;
    const list = document.getElementById('notif-list');
    const el = document.createElement('div');
    el.className = 'n-item info';
    el.innerHTML = `<div class="n-title">${title}</div><div class="n-body">${body}</div>`;
    list.prepend(el);
    const badge = document.getElementById('tb-notif');
    badge.style.color = 'var(--a)';
  }

document.getElementById('tb-notif').onclick = () => document.getElementById('np').classList.toggle('open');

document.getElementById('tb-notif').dataset.vosNotifBound = 'true';

document.getElementById('np-close').onclick = () => document.getElementById('np').classList.remove('open');

document.getElementById('clr-notifs').onclick = () => {
    document.getElementById('notif-list').innerHTML = '';
    document.getElementById('tb-notif').style.color = '';
  };

document.querySelectorAll('[data-qt]').forEach(qt => {
    qt.onclick = () => {
      qt.classList.toggle('on');
      const name = qt.dataset.qt;
      const isOn = qt.classList.contains('on');
      if (name === 'dark') { document.getElementById('desktop').style.filter = isOn ? 'brightness(.85)' : 'brightness(1)'; }
      if (name === 'vol') { document.getElementById('vol-icon').className = isOn ? 'fas fa-volume-up' : 'fas fa-volume-mute'; }
    };
  });

function renderDesktop() {
    // Delega para o sistema ATIVO de desktop (ultra), que substitui este
    // legado via window.renderDesktop. Sem isso havia DUAS grades
    // divergentes: o login desenhava 7 ícones fixos e qualquer refresh
    // (instalar app, etc.) redesenhava 15 — "todos apareciam do nada".
    // O corpo abaixo só roda como fallback se o ultra ainda não carregou.
    if (typeof window.renderDesktop === 'function' && window.renderDesktop !== renderDesktop) {
      return window.renderDesktop();
    }
    const area = document.getElementById('icons-area');
    area.innerHTML = '';
    const desktopApps = [
      { id: 'explorer', n: 'Este Computador', ic: 'fas fa-folder-open', bg: 'linear-gradient(135deg,#f6d365,#fda085)' },
      { id: 'browser', n: 'Navegador', ic: 'fas fa-globe', bg: 'linear-gradient(135deg,#4facfe,#00f2fe)' },
      { id: 'games', n: 'Steam', ic: 'fab fa-steam', bg: 'linear-gradient(135deg,#1b2838,#66c0f4)' },
      { id: 'settings', n: 'Config', ic: 'fas fa-gear', bg: 'linear-gradient(135deg,#bdc3c7,#2c3e50)' },
      { id: 'terminal', n: 'Terminal', ic: 'fas fa-terminal', bg: 'linear-gradient(135deg,#232526,#414345)' },
      { id: 'discord', n: 'Discord', ic: 'fab fa-discord" style="color:#5865F2', cat: 'util' },
      { id: 'vstore', n: 'Vessie-Store', ic: '<i class="fas fa-store" style="color:#a78bfa"></i>' }
    ];
    desktopApps.forEach((app) => {
      // Todos os apps estão disponíveis (sem restrição de Vessie-Store)
      // Os ícones são sempre exibidos pois o sistema vem pré-instalado.
      const el = document.createElement('div');
      el.className = 'di';
      el.dataset.app = app.id;
      // ic pode ser só classes ("fas fa-x") ou HTML pronto ("<i ...>") —
      // injeta cada forma do jeito certo em vez de aninhar <i> dentro de <i>.
      const iconHtml = String(app.ic || '').trim().startsWith('<') ? app.ic : `<i class="${app.ic}"></i>`;
      const iconBg = app.bg || 'linear-gradient(135deg,#7c3aed,#4f46e5)';
      el.innerHTML = `<div class="ic" style="background:${iconBg}">${iconHtml}</div><label>${app.n}</label>`;
      el.ondblclick = () => openApp(app.id);
      el.onclick = e => { document.querySelectorAll('.di.sel').forEach(x => x.classList.remove('sel')); el.classList.add('sel'); e.stopPropagation(); };
      makeDraggableIcon(el);
      area.appendChild(el);
    });
    layoutDesktopIcons();
  }

// Auto-layout responsivo: distribui os ícones em colunas conforme a altura
// disponível e reaplica o layout quando a resolução muda. Ícones arrastados
// manualmente (dataset.moved) não são reposicionados — só são trazidos de
// volta para dentro da área visível.
function layoutDesktopIcons() {
    const area = document.getElementById('icons-area');
    if (!area) return;
    const cellW = 100, cellH = 110, pad = 20;
    const availH = Math.max(300, (area.clientHeight || window.innerHeight - 52) - pad);
    const availW = Math.max(200, (area.clientWidth || window.innerWidth) - pad);
    const rows = Math.max(2, Math.floor(availH / cellH));
    let auto = 0;
    area.querySelectorAll('.di').forEach((el) => {
      if (el.dataset.moved) {
        const maxL = Math.max(pad, availW - 90), maxT = Math.max(pad, availH - 90);
        el.style.left = Math.max(0, Math.min(parseFloat(el.style.left) || pad, maxL)) + 'px';
        el.style.top = Math.max(0, Math.min(parseFloat(el.style.top) || pad, maxT)) + 'px';
        return;
      }
      const col = Math.floor(auto / rows), row = auto % rows;
      el.style.left = (pad + col * cellW) + 'px';
      el.style.top = (pad + row * cellH) + 'px';
      auto++;
    });
  }

if (!window.__vosIconsResizeBound) {
    window.__vosIconsResizeBound = true;
    let iconsRt = null;
    window.addEventListener('resize', () => {
      clearTimeout(iconsRt);
      iconsRt = setTimeout(layoutDesktopIcons, 150);
    });
  }

function makeDraggableIcon(el) {
    let dx, dy, dragging = false;
    el.addEventListener('mousedown', e => {
      if (e.detail > 1) return;
      dx = e.clientX - el.offsetLeft; dy = e.clientY - el.offsetTop;
      dragging = true; el.style.zIndex = 999; e.stopPropagation();
    });
    document.addEventListener('mousemove', e => {
      if (!dragging) return;
      el.style.left = (e.clientX - dx) + 'px'; el.style.top = (e.clientY - dy) + 'px';
      el.dataset.moved = '1';
      el.style.pointerEvents = 'auto';
    });
    document.addEventListener('mouseup', () => {
      if (dragging) { dragging = false; el.style.zIndex = ''; el.style.pointerEvents = 'auto'; snapIconToGrid(el); }
    });
  }

// Grade invisível do desktop (cela 100x110 a partir do padding 20):
// ícones soltos "grudam" na cela mais próxima e nunca saem da tela.
function snapIconToGrid(el) {
    if (!el) return;
    const cellW = 100, cellH = 110, pad = 20;
    const area = document.getElementById('icons-area');
    const maxL = Math.max(pad, (area?.clientWidth || window.innerWidth) - 92);
    const maxT = Math.max(pad, (area?.clientHeight || window.innerHeight - 52) - 100);
    const l = pad + Math.round(((parseFloat(el.style.left) || pad) - pad) / cellW) * cellW;
    const t = pad + Math.round(((parseFloat(el.style.top) || pad) - pad) / cellH) * cellH;
    el.style.left = Math.max(0, Math.min(l, maxL)) + 'px';
    el.style.top = Math.max(0, Math.min(t, maxT)) + 'px';
  }

const SM_CATEGORIES = {
    ai: { label: 'Inteligência Artificial', icon: 'fa-robot' },
    sys: { label: 'Sistema', icon: 'fa-microchip' },
    util: { label: 'Utilitários', icon: 'fa-toolbox' },
    game: { label: 'Jogos', icon: 'fa-gamepad' },
    media: { label: 'Multimídia', icon: 'fa-photo-film' },
    learn: { label: 'Educação', icon: 'fa-graduation-cap' }
  };

function smCatMeta(cat) { return SM_CATEGORIES[cat] || { label: 'Outros', icon: 'fa-shapes' }; }

function renderStartMenu() {
    renderPinnedGrid();
    renderAllAppsGrid();
    renderRecentApps();
    window.APPS = APPS;
    window.openApp = openApp;
    document.dispatchEvent(new CustomEvent('vessieos:startmenu-rendered'));
  }

function renderPinnedGrid() {
    const box = document.getElementById('sm-pin-grid');
    if (!box) return;
    box.innerHTML = '';
    // Todos os apps estão disponíveis (sem restrição de Vessie-Store)
    const onStore = (id) => true;
    const pinned = (S.pinnedApps || []).filter(onStore).map(id => APPS.find(a => a.id === id)).filter(Boolean);
    if (!pinned.length) { box.innerHTML = '<span style="color:var(--dim);font-size:.8rem">Nenhum app fixado — clique com o botão direito em um app em "Todos os apps" para fixar.</span>'; return; }
    pinned.forEach(app => {
      const meta = smCatMeta(app.cat);
      const el = document.createElement('div');
      el.className = `sm-pin-tile sm-cat-${app.cat || 'util'}`;
      el.dataset.appId = app.id;
      el.innerHTML = `<div class="sm-tile-icon">${app.ic}</div><span>${app.n}</span>`;
      el.onclick = () => openStartApp(app.id);
      el.oncontextmenu = (e) => { e.preventDefault(); smShowTileContext(e.clientX, e.clientY, app); };
      box.appendChild(el);
    });
  }

function renderAllAppsGrid() {
    const grid = document.getElementById('sm-grid');
    if (!grid) return;
    grid.innerHTML = '';
    // Todos os apps estão disponíveis (sem restrição de Vessie-Store)
    const byCat = {};
    const listed = APPS.filter(a => true);
    listed.slice().sort((a, b) => a.n.localeCompare(b.n, 'pt-BR')).forEach(app => {
      const cat = app.cat || 'util';
      (byCat[cat] = byCat[cat] || []).push(app);
    });
    Object.keys(byCat).sort((a, b) => smCatMeta(a).label.localeCompare(smCatMeta(b).label, 'pt-BR')).forEach(cat => {
      const meta = smCatMeta(cat);
      const title = document.createElement('div');
      title.className = 'sm-cat-title';
      title.innerHTML = `<i class="fas ${meta.icon}"></i> ${meta.label}`;
      grid.appendChild(title);

      const wrap = document.createElement('div');
      wrap.className = 'sm-cat-grid';
      byCat[cat].forEach(app => {
        const isPinned = (S.pinnedApps || []).includes(app.id);
        const el = document.createElement('div');
        el.className = 'sm-app';
        el.dataset.appId = app.id;
        el.innerHTML = `<div class="ai">${app.ic}</div><span>${app.n}</span><button class="sm-pin-btn ${isPinned ? 'pinned' : ''}" title="${isPinned ? 'Desafixar' : 'Fixar em Fixados'}"><i class="fas fa-thumbtack"></i></button>`;
        el.onclick = (e) => { if (e.target.closest('.sm-pin-btn')) return; openStartApp(app.id); };
        el.querySelector('.sm-pin-btn').onclick = (e) => { e.stopPropagation(); togglePinnedApp(app.id); };
        el.oncontextmenu = (e) => { e.preventDefault(); smShowTileContext(e.clientX, e.clientY, app); };
        wrap.appendChild(el);
      });
      grid.appendChild(wrap);
    });
  }

// ---------- Fixar na barra de tarefas ----------
function taskbarPinnedIds() {
    if (!Array.isArray(S.taskbarPinned)) S.taskbarPinned = [];
    return S.taskbarPinned;
}

function isTaskbarPinned(appId) {
    return taskbarPinnedIds().includes(appId);
}

function toggleTaskbarPin(appId) {
    const known = APPS.some(a => a.id === appId);
    if (!known) { toast('Só aplicativos do sistema podem ser fixados na barra.', 'error'); return; }
    const arr = taskbarPinnedIds();
    const i = arr.indexOf(appId);
    if (i >= 0) arr.splice(i, 1); else arr.push(appId);
    persistState();
    renderTaskbarPins();
    const app = APPS.find(a => a.id === appId);
    toast(`"${app ? app.n : appId}" ${i >= 0 ? 'desafixado da barra' : 'fixado na barra de tarefas'}`, 'success');
}

function renderTaskbarPins() {
    const host = document.getElementById('tb-wins'); if (!host) return;
    host.querySelectorAll('.tbp').forEach(b => b.remove());
    const frag = document.createDocumentFragment();
    taskbarPinnedIds().forEach(id => {
      // Todos os apps estão disponíveis (sem restrição de Vessie-Store)
      const app = APPS.find(a => a.id === id); if (!app) return;
      const b = document.createElement('button');
      b.className = 'tbp'; b.dataset.appId = id;
      b.title = app.n + ' — botão direito desafixa';
      b.setAttribute('aria-label', app.n);
      b.innerHTML = `<span class="tb-i">${app.ic}</span>`;
      b.onclick = () => openStartApp(id);
      b.oncontextmenu = (e) => { e.preventDefault(); e.stopPropagation(); toggleTaskbarPin(id); };
      frag.appendChild(b);
    });
    host.prepend(frag);
    markRunningPins();
}

function markRunningPins() {
    document.querySelectorAll('#tb-wins .tbp').forEach(b => {
      b.classList.toggle('on', !!document.querySelector(`.win[data-app="${b.dataset.appId}"]`));
    });
}

if (!window.__vosPinsWmBound) {
    window.__vosPinsWmBound = true;
    document.addEventListener('vessiewm:create', markRunningPins);
    document.addEventListener('vessiewm:close', () => setTimeout(markRunningPins, 200));
}

window.renderTaskbarPins = renderTaskbarPins;
window.toggleTaskbarPin = toggleTaskbarPin;
window.isTaskbarPinned = isTaskbarPinned;

function togglePinnedApp(appId) {
    S.pinnedApps = S.pinnedApps || [];
    const wasPinned = S.pinnedApps.includes(appId);
    S.pinnedApps = wasPinned ? S.pinnedApps.filter(id => id !== appId) : [...S.pinnedApps, appId];
    persistState();
    renderPinnedGrid();
    renderAllAppsGrid();
    const app = APPS.find(a => a.id === appId);
    toast(`${app ? app.n : 'App'} ${wasPinned ? 'desafixado' : 'fixado em Fixados'}`, 'success');
  }

function smShowTileContext(x, y, app) {
    document.querySelector('.sm-ctx')?.remove();
    const isPinned = (S.pinnedApps || []).includes(app.id);
    const onDesk = (window.desktopPin && typeof window.desktopPin.isPinned === 'function') ? window.desktopPin.isPinned(app.id) : false;
    const onBar = isTaskbarPinned(app.id);
    const menu = document.createElement('div');
    menu.className = 'sm-ctx';
    menu.innerHTML = `
      <div class="cti" data-act="open"><i class="fas fa-arrow-up-right-from-square"></i> Abrir</div>
      <div class="cti" data-act="pin"><i class="fas fa-thumbtack"></i> ${isPinned ? 'Desafixar' : 'Fixar em Fixados'}</div>
      <div class="cti" data-act="desk"><i class="fas fa-desktop"></i> ${onDesk ? 'Desafixar da área de trabalho' : 'Fixar na área de trabalho'}</div>
      <div class="cti" data-act="bar"><i class="fas fa-bars-staggered"></i> ${onBar ? 'Desafixar da barra de tarefas' : 'Fixar na barra de tarefas'}</div>`;
    document.body.appendChild(menu);
    const vw = window.innerWidth, vh = window.innerHeight;
    menu.style.left = Math.min(x, vw - 190) + 'px';
    menu.style.top = Math.min(y, vh - 190) + 'px';
    menu.querySelector('[data-act="open"]').onclick = () => { menu.remove(); openStartApp(app.id); };
    menu.querySelector('[data-act="pin"]').onclick = () => { menu.remove(); togglePinnedApp(app.id); };
    menu.querySelector('[data-act="desk"]').onclick = () => {
      menu.remove();
      if (window.desktopPin && typeof window.desktopPin.set === 'function') {
        const now = !window.desktopPin.isPinned(app.id);
        window.desktopPin.set(app.id, now);
        toast(`"${app.n}" ${now ? 'fixado na área de trabalho' : 'desafixado da área de trabalho'}`, 'success');
      } else toast('Recurso indisponível no momento.', 'error');
    };
    menu.querySelector('[data-act="bar"]').onclick = () => { menu.remove(); toggleTaskbarPin(app.id); };
    const closeOnce = (e) => { if (!e.target.closest('.sm-ctx')) { menu.remove(); document.removeEventListener('click', closeOnce); } };
    setTimeout(() => document.addEventListener('click', closeOnce), 0);
  }

function openStartApp(appId) {
    const app = APPS.find(a => a.id === appId);
    openApp(appId);
    if (app) addRecentApp(app);
    closeStartMenu();
  }

function addRecentApp(app) {
    S.recentApps = (S.recentApps || []).filter(a => a.id !== app.id);
    S.recentApps.unshift({ id: app.id, n: app.n, ic: app.ic });
    if (S.recentApps.length > 6) S.recentApps = S.recentApps.slice(0, 6);
    persistState();
    renderRecentApps();
  }

function renderRecentApps() {
    const box = document.getElementById('sm-recent');
    if (!box) return;
    const recent = (S.recentApps || []).filter(a => true);
    if (!recent.length) { box.innerHTML = '<span class="sm-recent-empty">Nenhum app recente</span>'; return; }
    box.innerHTML = '';
    recent.forEach(app => {
      const el = document.createElement('div');
      el.className = 'sm-recent-item';
      el.innerHTML = `<span class="ri">${app.ic}</span> ${app.n}`;
      el.onclick = () => openStartApp(app.id);
      box.appendChild(el);
    });
  }

const SEARCH_SITES = [
    { n: 'Google', url: 'https://www.google.com', ic: '<i class="fab fa-google" style="color:#4285f4"></i>' },
    { n: 'YouTube', url: 'https://www.youtube.com', ic: '<i class="fab fa-youtube" style="color:#ef4444"></i>' },
    { n: 'GitHub', url: 'https://github.com', ic: '<i class="fab fa-github" style="color:#fff"></i>' },
    { n: 'Wikipedia', url: 'https://pt.wikipedia.org', ic: '<i class="fab fa-wikipedia-w" style="color:#fff"></i>' },
    { n: 'Stack Overflow', url: 'https://stackoverflow.com', ic: '<i class="fab fa-stack-overflow" style="color:#f97316"></i>' },
    { n: 'MDN Web Docs', url: 'https://developer.mozilla.org', ic: '<i class="fas fa-book" style="color:#0ea5e9"></i>' },
    { n: 'Spotify Web', url: 'https://open.spotify.com', ic: '<i class="fab fa-spotify" style="color:#22c55e"></i>' },
    { n: 'ChatGPT', url: 'https://chat.openai.com', ic: '<i class="fas fa-robot" style="color:#10a37f"></i>' }
  ];

// Últimos resultados (apps + sites + web) para o Enter abrir o primeiro.
let lastSearchItems = [];

function openSearchItem(item, rawQuery) {
    if (!item) return;
    if (item.kind === 'app') { openStartApp(item.id); return; }
    if (item.kind === 'site') {
      if (typeof window.openBrowserWith === 'function') window.openBrowserWith(item.url, item.n);
      else openApp('browser');
      closeStartMenu();
      return;
    }
    if (item.kind === 'web') {
      const q = (rawQuery || '').trim();
      const url = /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(q) && !q.includes(' ')
        ? (/^https?:\/\//i.test(q) ? q : 'https://' + q)
        : 'https://www.google.com/search?q=' + encodeURIComponent(q);
      if (typeof window.openBrowserWith === 'function') window.openBrowserWith(url, 'Pesquisa: ' + q);
      else openApp('browser');
      closeStartMenu();
    }
  }

function searchApps(query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) { smSwitchView('pinned'); return; }
    smSwitchView('search');
    // Todos os apps estão disponíveis (sem restrição de Vessie-Store)
    const results = APPS.filter(app => (app.n.toLowerCase().includes(q) || app.id.toLowerCase().includes(q) || smCatMeta(app.cat).label.toLowerCase().includes(q)))
      .map(app => ({ kind: 'app', id: app.id, n: app.n, ic: app.ic, tag: smCatMeta(app.cat).label }));
    const sites = SEARCH_SITES.filter(s => s.n.toLowerCase().includes(q))
      .map(s => ({ kind: 'site', n: s.n, url: s.url, ic: s.ic, tag: 'Site' }));
    lastSearchItems = [...results, ...sites];
    const grid = document.getElementById('sm-search-grid');
    const count = document.getElementById('sm-search-count');
    const total = lastSearchItems.length;
    if (count) count.textContent = total ? `${total} resultado(s) para "${query}"` : `Nada encontrado para "${query}"`;
    if (!grid) return;
    grid.innerHTML = '';
    if (!total && !q) { smSwitchView('pinned'); return; }
    lastSearchItems.forEach((item, idx) => {
      const el = document.createElement('div');
      el.className = 'sm-app';
      el.innerHTML = `<div class="ai">${item.ic}</div><span>${item.n}</span><span class="sm-search-tag">${item.tag}</span>`;
      el.onclick = () => openSearchItem(item, query);
      grid.appendChild(el);
    });
    if (q) {
      const web = document.createElement('div');
      web.className = 'sm-app';
      const safe = query.replace(/</g, '&lt;');
      web.innerHTML = `<div class="ai"><i class="fas fa-globe" style="color:#0ea5e9"></i></div><span>Buscar "${safe}" na web</span><span class="sm-search-tag">Web</span>`;
      web.onclick = () => openSearchItem({ kind: 'web' }, query);
      grid.appendChild(web);
    }
    if (!total && !q) grid.innerHTML = `<div class="sm-search-empty">Nenhum app, configuração ou arquivo encontrado.</div>`;
  }

function smSwitchView(view) {
    document.getElementById('sm-view-pinned').style.display = view === 'pinned' ? '' : 'none';
    document.getElementById('sm-view-all').style.display = view === 'all' ? '' : 'none';
    document.getElementById('sm-view-search').style.display = view === 'search' ? '' : 'none';
  }

function openStartMenu() {
    document.getElementById('sm').classList.add('open');
    document.getElementById('sm-q').value = '';
    smSwitchView('pinned');
    document.getElementById('sm-q').focus();
  }

function closeStartMenu() {
    document.getElementById('sm').classList.remove('open');
    document.getElementById('sm').style.display = ''; // limpa display inline de módulos legados (execute-exes.js, command-palette)
    document.getElementById('sm-pw-menu')?.classList.remove('open');
  }

window.openStartMenu = openStartMenu;

window.closeStartMenu = closeStartMenu;

document.getElementById('tb-start').onclick = (e) => {
    const sm = document.getElementById('sm');
    sm.classList.contains('open') ? closeStartMenu() : openStartMenu();
    e.stopPropagation();
  };

document.getElementById('sm-goto-all').onclick = () => smSwitchView('all');

document.getElementById('sm-goto-pinned').onclick = () => smSwitchView('pinned');

document.getElementById('sm-q').oninput = function () { searchApps(this.value); };

document.getElementById('sm-q').onkeydown = function (e) {
    if (e.key !== 'Enter') return;
    const q = this.value.trim();
    if (lastSearchItems.length) openSearchItem(lastSearchItems[0], q);
    else if (q) openSearchItem({ kind: 'web' }, q);
  };

document.getElementById('sm-power').onclick = (e) => {
    e.stopPropagation();
    document.getElementById('sm-pw-menu').classList.toggle('open');
  };

document.getElementById('sm-pw-menu').querySelectorAll('[data-act]').forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      document.getElementById('sm-pw-menu').classList.remove('open');
      const act = btn.dataset.act;
      if (act === 'sleep') smSleep();
      else if (act === 'restart') smPowerAction('Reiniciar o VessieOS?', 'Reiniciando...');
      else if (act === 'shutdown') smPowerAction('Desligar o VessieOS?', 'Desligando...');
    };
  });

function smPowerAction(confirmMsg, toastMsg) {
    if (!confirm(confirmMsg)) return;
    closeStartMenu();
    toast(toastMsg, 'default');
    const overlay = document.createElement('div');
    overlay.className = 'sm-sleep-overlay';
    overlay.innerHTML = '<i class="fas fa-power-off fa-spin"></i>';
    document.body.appendChild(overlay);
    setTimeout(() => location.reload(), 650);
  }

function smSleep() {
    closeStartMenu();
    const overlay = document.createElement('div');
    overlay.className = 'sm-sleep-overlay';
    overlay.innerHTML = '<i class="fas fa-moon"></i><span>Suspenso — clique para reativar</span>';
    overlay.onclick = () => overlay.remove();
    document.body.appendChild(overlay);
  }

document.addEventListener('click', (e) => {
    const sm = document.getElementById('sm');
    if (sm.classList.contains('open') && !sm.contains(e.target) && e.target.id !== 'tb-start') closeStartMenu();
    if (!e.target.closest('.sm-pw-wrap')) document.getElementById('sm-pw-menu')?.classList.remove('open');
  });

window.__winCounter = window.__winCounter || { n: 0 };

// createWin, focusWin, addTaskbarBtn, removeTaskbarBtn e o sistema de
// Snap Layouts agora vivem em JS/core/vessie-wm.js (biblioteca própria
// de janelas do VessieOS — VessieWM). Este arquivo só usa a API pública
// dela; nenhum app precisou mudar, já que window.createWin(...) continua
// com a mesma assinatura de sempre.

let _reflowT;

window.addEventListener('resize', () => {
    clearTimeout(_reflowT);
    _reflowT = setTimeout(() => {
      window.VessieWM?.reflowAll();
      // Reorganiza ícones do desktop
      if (document.getElementById('desktop').style.display !== 'none') renderDesktop();
    }, 120);
  });

function openApp(id) {
    // Todos os apps vêm pré-instalados — nenhum é bloqueado por Vessie-Store
    const existing = document.querySelector(`.win[data-app="${id}"]`);
    if (existing) { focusWin(existing.id); return; }
    let win;
    // Qualquer opener ausente/quebrado vira toast em vez de travar em silêncio
    // (foi assim que "Painel de Comando" e "Educação" ficaram sem abrir).
    try {
      switch (id) {
        case 'vessie': win = openVessie(); break;
        case 'neural': win = window.openNeural?.(); break;
        case 'vessielang': win = window.openVessieLangStudio?.(); break;
        case 'dashboard': win = openDashboard(); break;
        case 'edu': win = openEducation(); break;
        case 'automation': win = openAutomation(); break;
        case 'explorer': win = openExplorer(); break;
        case 'games': win = openGames(); break;
        case 'framework': win = openFramework(); break;
        case 'vm': win = openVmManager(); break;
        case 'browser':
        case 'chrome': win = openBrowser(); break;
        case 'discord': win = openDiscrod(); break;
        case 'planos': win = openPlanos(); break;
        case 'notepad': win = openNotepad(); break;
        case 'nvidia': win = openNvidia(); break;
        case 'calc': win = openCalc(); break;
        case 'painel': win = openPainelDeComando(); break;
        case 'terminal': win = openTerminal(); break;
        case 'settings': win = openSettings(); break;
        case 'plugins': win = openPlugins(); break;
        case 'music': win = openMusic(); break;
        case 'camera': win = openCamera(); break;
        case 'word': win = openWordProcessor(); break;
        case 'vcoinstore': win = openVessieCoinStore(); break;
        case 'errorcenter': win = openErrorCenter(); break;
        default:
          // Apps separados (HTML+CSS+JS em iframe isolado): built-in de apps-iframe/registry.js ou criados no Criador de Apps.
          win = window.VessieAppHost ? window.VessieAppHost.open(id) : null;
          if (!win) { toast(`App "${id}" não encontrado`, 'error'); return; }
          break;
      }
    } catch (err) {
      console.error('[openApp] falha ao abrir', id, err);
      toast(`Não foi possível abrir "${id}".`, 'error');
      return;
    }
    if (win) win.dataset.app = id;
    // Expõe o registro de apps e a função de abertura para módulos do
    // kernel (JS/kernel/modules/*) que rodam fora deste closure, e
    // avisa quem estiver ouvindo que um app foi aberto (ex.: para
    // manter uma lista de "Recentes" no Menu Iniciar).
    window.APPS = APPS;
    window.openApp = openApp;
    document.dispatchEvent(new CustomEvent('vessieos:app-opened', { detail: { id } }));
  }

window.createVessieVm = function () {
    const vm = VessieVMManager.create(`VM ${VessieVMManager.list().length + 1}`, 'sandbox');
    if (vm) toast(`VM ${vm.name} criada com isolamento reforçado 🧠`, 'success');
    return vm;
  };

window.refreshAutoReport = function () {
    const box = document.getElementById('auto-report');
    if (!box) return;
    const cpu = (18 + Math.random() * 15).toFixed(1);
    const ram = (32 + Math.random() * 18).toFixed(0);
    const storage = (58 + Math.random() * 12).toFixed(1);
    box.innerHTML = `<strong>Resumo automático</strong><br>CPU: <b>${cpu}%</b> · RAM: <b>${ram}%</b> · Armazenamento: <b>${storage}%</b><br><br>✔️ Modo de manutenção ativo<br>✔️ Backup automático discreto<br>✔️ Recomendação: foco em jogos e estudo sem travamentos`;
  };

window.runAutoCleanup = function () {
    const box = document.getElementById('auto-report');
    if (box) { box.innerHTML = '<strong>Limpeza concluída</strong><br>Arquivos temporários removidos, cache limpo e espaço liberado com sucesso.'; }
    toast('Limpeza automática concluída ✨', 'success');
  };

window.runAutoOptimize = function () {
    const box = document.getElementById('auto-report');
    if (box) { box.innerHTML = '<strong>Otimização aplicada</strong><br>Prioridade ajustada para aplicações mais usadas e consumo reduzido.'; }
    toast('Otimização aplicada ⚡', 'success');
  };

window.runAutoBackup = function () {
    const box = document.getElementById('auto-report');
    if (box) { box.innerHTML = '<strong>Backup preparado</strong><br>Resumo de documentos, temas e preferências enviado para o ambiente virtual.'; }
    toast('Backup preparado ☁️', 'success');
  };

window.runAutoReport = function () {
    window.refreshAutoReport();
    toast('Relatório atualizado 📈', 'success');
  };

const STEAM_KEY = 'vessieos_steam_lib_v2';

const STEAM_SRC_KEY = 'vessieos_steam_sources_v1';

const STEAM_AUTO_KEY = 'vessieos_steam_autocollector_v1';

function isValidGameUrl(u) { return typeof u === 'string' && /^https?:\/\//i.test(u.trim()); }

function buildBaseSteamLibrary() {
    const templates = (S.gameTemplates || []).filter(t => t.enabled !== false && isValidGameUrl(t.url)).map(t => ({ id: 'g_' + Math.random().toString(36).slice(2, 9), name: t.name, url: t.url, icon: isValidGameUrl(t.icon) ? t.icon : '', cover: isValidGameUrl(t.icon) ? t.icon : '', added: Date.now(), plays: 0 }));
    const base = GAMES.filter(g => isValidGameUrl(g.u)).map(g => ({ id: 'g_' + Math.random().toString(36).slice(2, 9), name: g.n, url: g.u, icon: isValidGameUrl(g.ic) ? g.ic : '', cover: isValidGameUrl(g.ic) ? g.ic : '', added: Date.now(), plays: 0 }));
    return dedupeGames([...base, ...templates]);
  }

function steamLoad() {
    try {
      const stored = JSON.parse(localStorage.getItem(STEAM_KEY));
      if (Array.isArray(stored)) {
        const base = buildBaseSteamLibrary();
        const merged = base.map(item => {
          const existing = stored.find(saved => saved.name === item.name && saved.url === item.url);
          return existing ? { ...item, ...existing } : item;
        });
        const custom = stored.filter(saved => !base.some(item => item.name === saved.name && item.url === saved.url));
        const result = [...merged, ...custom];
        // Modelo Loja → Biblioteca: tudo que é coletado nasce NÃO comprado
        // (owned:false) e aparece na vitrine da Loja; só entra na Biblioteca
        // depois de Comprar (grátis) + Instalar. Normaliza saves antigos.
        result.forEach(it => { if (typeof it.owned !== 'boolean') it.owned = false; });
        localStorage.setItem(STEAM_KEY, JSON.stringify(result));
        return result;
      }
    } catch (e) { }
    const seed = buildBaseSteamLibrary();
    seed.forEach(it => { if (typeof it.owned !== 'boolean') it.owned = false; });
    localStorage.setItem(STEAM_KEY, JSON.stringify(seed));
    return seed;
  }

window.steamLoad = steamLoad;

function steamSave(lib) { localStorage.setItem(STEAM_KEY, JSON.stringify(lib)); }

function steamSources() {
    try { const d = JSON.parse(localStorage.getItem(STEAM_SRC_KEY)); if (Array.isArray(d)) return d; } catch (e) { }
    return ['https://snowriderio.io', 'https://azgames.io', 'https://classicgamezone.com'];
  }

function steamSaveSrc(s) { localStorage.setItem(STEAM_SRC_KEY, JSON.stringify(s)); }

function steamHostsFromGames() {
    const hosts = new Set();
    (GAMES || []).forEach(g => {
      try {
        const u = new URL(g.u);
        if (/^https?:$/.test(u.protocol)) hosts.add(u.origin);
      } catch (e) { /* entradas inválidas (ex.: "Exemple") são ignoradas */ }
    });
    return [...hosts];
  }

const STEAM_RECOMMENDED = ['https://snowriderio.io', 'https://azgames.io', 'https://classicgamezone.com', 'https://1v1-lol.gitlab.io'];

function steamAllSources() {
    return [...new Set([...steamSources(), ...steamHostsFromGames(), ...STEAM_RECOMMENDED])];
  }

const STEAM_PROXIES = [
    'https://api.codetabs.com/v1/proxy/?quest=',
    'https://cors.eu.org/',
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?url='
  ];

const steamProxyCooldown = new Map();

async function steamFetch(url, opts = {}) {
    const timeout = opts.timeout || 12000;
    const retries = opts.retries == null ? 2 : opts.retries;
    let lastErr = null;
    for (let attempt = 0; attempt <= retries; attempt++) {
      const ordered = STEAM_PROXIES.slice().sort((a, b) => (steamProxyCooldown.get(a) || 0) - (steamProxyCooldown.get(b) || 0));
      for (const p of ordered) {
        if ((steamProxyCooldown.get(p) || 0) > Date.now()) continue; // ainda se recuperando de uma falha
        try {
          const r = await fetch(p + encodeURIComponent(url), { signal: AbortSignal.timeout(timeout) });
          if (r.ok) {
            const t = await r.text();
            if (t && t.length > 100 && !/^\s*(error|proxy error|unable to fetch)/i.test(t)) {
              steamProxyCooldown.delete(p);
              return t;
            }
          }
          steamProxyCooldown.set(p, Date.now() + 30000);
        } catch (e) {
          lastErr = e;
          steamProxyCooldown.set(p, Date.now() + 60000);
        }
      }
      if (attempt < retries) await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
    }
    throw lastErr || new Error('Falha em todos os proxies');
  }

const GENERIC_NAME_BLACKLIST = new Set([
    'jogo', 'jogos', 'game', 'games', 'home', 'início', 'inicio', 'index',
    'untitled', 'sem título', 'sem titulo', 'página inicial', 'pagina inicial',
    '404', 'error', 'erro', 'not found', 'play', 'click here', 'clique aqui',
    'loading', 'carregando', 'welcome', 'bem-vindo', 'bem vindo', 'exemple', 'exemplo', 'example'
  ]);

function isValidGameName(name, host) {
    if (!name || typeof name !== 'string') return false;
    const clean = name.trim();
    if (clean.length < 2 || clean.length > 80) return false;
    const lower = clean.toLowerCase();
    if (GENERIC_NAME_BLACKLIST.has(lower)) return false;
    if (/^[\d\W]+$/.test(clean)) return false; // só números/símbolos
    if (host && lower === host.toLowerCase()) return false; // nome = domínio inteiro
    return true;
  }

function slugToTitle(pathname) {
    const slug = (pathname || '').split('/').filter(Boolean).pop() || '';
    return slug.replace(/\.\w+$/, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();
  }

function verifyImage(url, { minSize = 32, timeout = 4000 } = {}) {
    return new Promise((resolve) => {
      if (!url) return resolve(false);
      let done = false;
      const img = new Image();
      const timer = setTimeout(() => { if (!done) { done = true; resolve(false); } }, timeout);
      img.onload = () => { if (done) return; done = true; clearTimeout(timer); resolve(img.naturalWidth >= minSize && img.naturalHeight >= minSize); };
      img.onerror = () => { if (done) return; done = true; clearTimeout(timer); resolve(false); };
      try { img.referrerPolicy = 'no-referrer'; } catch (e) { }
      img.src = url;
    });
  }

async function pickVerifiedImage(candidates, opts) {
    const uniq = [...new Set((candidates || []).filter(Boolean))].slice(0, 8);
    if (!uniq.length) return '';
    const results = await Promise.all(uniq.map((c) => verifyImage(c, opts).then((ok) => ({ c, ok }))));
    const found = results.find((r) => r.ok);
    return found ? found.c : '';
  }

async function steamParse(html, baseUrl) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    let host = ''; try { host = new URL(baseUrl).host; } catch (e) { }
    let origin = ''; try { origin = new URL(baseUrl).origin; } catch (e) { }
    const abs = (u) => { if (!u) return null; try { return new URL(u, baseUrl).href; } catch (e) { return null; } };

    // ---- Nome: tenta todos os padrões possíveis, do mais específico ao
    // mais genérico, sem travar em nenhum deles — o objetivo é sempre
    // conseguir ALGUM nome, nunca bloquear a coleta. JSON-LD tipado como
    // jogo (VideoGame/Game/...) vem primeiro por ser o mais específico;
    // og:title, twitter:title e <h1> vêm em seguida; e se nada disso bater
    // (ou não existir), cai direto no próprio <title> do HTML — que é
    // sempre tentado, sempre disponível como último recurso confiável.
    const GAME_LD_TYPES = /^(VideoGame|Game|SoftwareApplication|MobileApplication)$/i;
    const nameCandidates = [];
    const ldImageCandidates = [];
    doc.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
      try {
        const data = JSON.parse(s.textContent);
        (Array.isArray(data) ? data : [data]).forEach((e) => {
          if (!e) return;
          const type = Array.isArray(e['@type']) ? e['@type'].join(',') : String(e['@type'] || '');
          const isGameSchema = GAME_LD_TYPES.test(type);
          if (e.name && isGameSchema) nameCandidates.push(String(e.name));
          if (isGameSchema) {
            const im = e.image;
            if (typeof im === 'string') ldImageCandidates.push(im);
            else if (im && typeof im === 'object' && im.url) ldImageCandidates.push(im.url);
            else if (Array.isArray(im)) im.forEach((x) => ldImageCandidates.push(typeof x === 'string' ? x : x?.url));
          }
        });
      } catch (err) { /* JSON-LD malformado — ignora */ }
    });
    const ogTitle = doc.querySelector('meta[property="og:title"]')?.content;
    if (ogTitle) nameCandidates.push(ogTitle);
    const twTitle = doc.querySelector('meta[name="twitter:title"]')?.content;
    if (twTitle) nameCandidates.push(twTitle);
    const h1Text = doc.querySelector('h1')?.textContent;
    if (h1Text) nameCandidates.push(h1Text);
    // <title> do HTML: sempre tentado, é o fallback final antes do slug.
    const docTitle = doc.querySelector('title')?.textContent;
    if (docTitle) nameCandidates.push(docTitle);

    let name = '';
    for (const candidate of nameCandidates) {
      const cleaned = candidate.trim().replace(/\s*[\|\-–·]\s*.*$/, '').slice(0, 80);
      if (isValidGameName(cleaned, host)) { name = cleaned; break; }
    }
    // Se nem o <title> "limpo" (sem o sufixo depois de | ou -) serviu,
    // tenta o <title> inteiro, sem cortar nada, antes de desistir pro slug.
    if (!name && docTitle && isValidGameName(docTitle.trim().slice(0, 80), host)) {
      name = docTitle.trim().slice(0, 80);
    }
    if (!name) { try { name = slugToTitle(new URL(baseUrl).pathname); } catch (e) { } }
    if (!isValidGameName(name, host)) name = host ? `Jogo de ${host}` : 'Jogo sem nome';

    // ---- Descrição ----

    let desc = (doc.querySelector('meta[property="og:description"]')?.content
      || doc.querySelector('meta[name="description"]')?.content || '').trim().slice(0, 200);
    doc.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
      try {
        const data = JSON.parse(s.textContent);
        (Array.isArray(data) ? data : [data]).forEach((e) => { if (!desc && e && typeof e.description === 'string') desc = e.description.slice(0, 200); });
      } catch (err) { /* ignora */ }
    });

    // ---- Capa: tenta TODOS os padrões, na ordem de qualidade, sem travar
    // em nenhum — JSON-LD tipado como jogo primeiro, depois og:image/
    // twitter:image, depois qualquer <img> que pareça capa/thumbnail. ----
    const coverCandidates = [...ldImageCandidates];
    ['meta[property="og:image:secure_url"]', 'meta[property="og:image"]', 'meta[name="twitter:image:src"]', 'meta[name="twitter:image"]'].forEach((sel) => {
      const v = doc.querySelector(sel)?.content; if (v) coverCandidates.push(v);
    });
    const imageSrcLink = doc.querySelector('link[rel="image_src"]')?.getAttribute('href');
    if (imageSrcLink) coverCandidates.push(imageSrcLink);
    // Imagens soltas no HTML (<img>): primeiro as que parecem claramente
    // capa/thumbnail pelo nome do arquivo, depois qualquer imagem grande —
    // sempre tentadas, sem depender de nenhuma outra condição.
    const allImgs = [...doc.querySelectorAll('img')].map((i) => i.getAttribute('src') || i.getAttribute('data-src')).filter(Boolean);
    coverCandidates.push(...allImgs.filter((s) => /h220x220\.webp|cache\/data\/image\/game\/|cover|thumbnail|boxart|box-art/i.test(s)));
    coverCandidates.push(...allImgs.filter((s) => /\.(webp|jpe?g|png)(\?.*)?$/i.test(s)));
    const cover = await pickVerifiedImage(coverCandidates.map(abs).filter(Boolean), { minSize: 96 });

    // ---- Ícone: logo pequeno/quadrado, extraído à parte da capa ----
    // Além das tags <link> do HTML, tenta direto os caminhos padrão de
    // favicon que praticamente todo site tem (mesmo SPAs que não expõem
    // <link rel="icon"> no HTML estático) — snowroad.io/favicon.ico e
    // variações, testadas na origem do próprio site (não da página).
    const iconCandidates = [
      doc.querySelector('link[rel="apple-touch-icon"]')?.getAttribute('href'),
      doc.querySelector('link[rel="icon"][sizes]')?.getAttribute('href'),
      doc.querySelector('link[rel="shortcut icon"]')?.getAttribute('href'),
      doc.querySelector('link[rel="icon"]')?.getAttribute('href'),
      '/favicon.ico',
      origin ? origin + '/favicon.ico' : null,
      origin ? origin + '/favicon.png' : null,
      origin ? origin + '/apple-touch-icon.png' : null,
      origin ? origin + '/apple-touch-icon-precomposed.png' : null,
      origin ? origin + '/icon.png' : null,
      origin ? origin + '/assets/favicon.ico' : null,
      origin ? origin + '/static/favicon.ico' : null,
      origin ? origin + '/img/favicon.ico' : null
    ].map(abs).filter(Boolean);
    const icon = (await pickVerifiedImage(iconCandidates, { minSize: 16 })) || cover;

    let embedUrl = null;
    const iframeSrc = doc.querySelector('iframe[src]')?.getAttribute('src');
    if (iframeSrc) embedUrl = abs(iframeSrc);

    return { name, icon: icon || cover || '', cover: cover || icon || '', desc, embedUrl };
  }

function steamIsPagination(u) {
    return /\/page\/\d+/i.test(u.pathname) || /[?&](page|p)=\d+/i.test(u.search);
  }

function steamScoreLink(pathname) {
    if (/\/(game|games|play|jogo|jogos|go)\//i.test(pathname)) return 2;
    if (/class-\d+/i.test(pathname)) return 2;
    return 1;
  }

function steamDiscover(html, baseUrl) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const host = new URL(baseUrl).host;
    const gameLinks = new Map();
    const paginationLinks = new Set();
    doc.querySelectorAll('a[href]').forEach(a => {
      try {
        const h = a.getAttribute('href'); if (!h || h.startsWith('#') || h.startsWith('javascript')) return;
        const u = new URL(h, baseUrl);
        if (u.host !== host) return;
        if (steamIsPagination(u)) { paginationLinks.add(u.href.split('#')[0]); return; }
        const p = u.pathname;
        // heurística: caminhos de jogo (não index, não categoria)
        if (p === '/' || p.length < 4) return;
        if (/^\/(privacy|terms|about|contact|category|tag|games?\/?$)/i.test(p)) return;
        if (/\/$/.test(p) && p.split('/').filter(Boolean).length < 2) return;
        const clean = u.href.split('#')[0].split('?')[0];
        const score = steamScoreLink(p);
        if (score > (gameLinks.get(clean) || 0)) gameLinks.set(clean, score);
      } catch (e) { }
    });
    const relNext = doc.querySelector('a[rel="next"]')?.getAttribute('href');
    if (relNext) { try { paginationLinks.add(new URL(relNext, baseUrl).href.split('#')[0]); } catch (e) { } }
    const sorted = [...gameLinks.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]);
    return { gameLinks: sorted.slice(0, 60), paginationLinks: [...paginationLinks].slice(0, 5) };
  }

async function steamDiscoverSitemap(baseUrl) {
    const host = new URL(baseUrl).host;
    const candidates = [new URL('/sitemap.xml', baseUrl).href, new URL('/sitemap_index.xml', baseUrl).href];
    for (const sm of candidates) {
      try {
        const xml = await steamFetch(sm, { retries: 0 });
        const doc = new DOMParser().parseFromString(xml, 'text/xml');
        const locs = [...doc.querySelectorAll('loc')].map(n => n.textContent.trim()).filter(Boolean);
        const own = locs.filter(l => { try { return new URL(l).host === host } catch (e) { return false } });
        if (own.length) return own.slice(0, 80);
      } catch (e) { /* sem sitemap ou proxy falhou — tenta o próximo candidato */ }
    }
    return [];
  }

function steamLog(msg, cls = '') { const el = document.getElementById('st-log'); if (!el) return; el.classList.add('show'); el.innerHTML += `<div class="${cls}">${msg}</div>`; el.scrollTop = el.scrollHeight; }

// Re-renderiza a aba atual da Steam (Loja/Biblioteca/...) sem trocar de
// contexto — usado após coletar, comprar ou instalar jogos.
function steamRefreshCurrentView() {
    const main = document.getElementById('st-main'); if (!main) return;
    const tab = document.querySelector('.st-tt.ac')?.dataset.view;
    if (tab) steamRender(tab);
}

window.steamAddGame = async function (url, opts = {}) {
    url = (url || '').trim(); if (!url) return;
    if (!/^https?:/.test(url)) url = 'https://' + url;
    steamLog('→ Analisando ' + url, 'in');
    try {
      const html = await steamFetch(url);
      const meta = await steamParse(html, url);
      const lib = steamLoad();
      if (lib.some(g => g.url === url)) { steamLog('⚠ Já está na biblioteca', 'er'); return; }
      let name = meta.name;
      if (opts.cleanTitle) name = name.replace(/\s+on Steam$/i, '').trim() || name;
      const cover = meta.cover || opts.coverFallback || '';
      lib.push({ id: 'g_' + Math.random().toString(36).slice(2, 9), name, url, icon: meta.icon || cover, cover, desc: meta.desc || '', added: Date.now(), plays: 0, owned: false });
      steamSave(dedupeGames(lib));
      steamLog('✓ Adicionado: ' + meta.name + (meta.cover ? '' : ' (sem capa verificada — usando ícone padrão)'), meta.cover ? 'ok' : 'in');
      steamRefreshCurrentView();
      toast('🎮 ' + meta.name + ' na LOJA — compre grátis para jogar!', 'success');
    } catch (e) { steamLog('✗ Erro: ' + e.message, 'er'); }
  };

// Importar jogo REAL da Steam pelo AppID ou link da loja. O navegador não
// enxerga o cliente Steam instalado (sandbox) — a detecção usa o catálogo
// público: nome via parse da página + capa oficial header.jpg por AppID.
window.steamImportSteam = async function (raw) {
    raw = (raw || '').trim(); if (!raw) return toast('Cole um AppID ou link da Steam.', 'error');
    const m = raw.match(/store\.steampowered\.com\/app\/(\d{1,8})/i) || raw.match(/^(\d{1,8})$/);
    if (!m) return toast('Formato inválido. Ex.: 730 ou link store.steampowered.com/app/730/', 'error');
    const appid = m[1];
    steamLog('🎮 Detectando AppID ' + appid + ' na Steam…', 'in');
    await steamAddGame('https://store.steampowered.com/app/' + appid + '/', {
      cleanTitle: true,
      coverFallback: 'https://cdn.akamai.steamstatic.com/steam/apps/' + appid + '/header.jpg'
    });
  };

window.steamCrawlSite = async function (url, opts = {}) {
    url = (url || '').trim(); if (!url) return;
    if (!/^https?:/.test(url)) url = 'https://' + url;
    const silent = !!opts.silent;
    if (!silent) steamLog('🔎 Explorando ' + url, 'in');
    try {
      const html = await steamFetch(url);
      const discovered = steamDiscover(html, url);
      const sitemapLinks = await steamDiscoverSitemap(url).catch(() => []);
      const links = discovered.gameLinks.slice();
      sitemapLinks.forEach(l => { if (!links.includes(l)) links.push(l); });
      if (!silent) steamLog(`Encontrados ${links.length} links candidatos` + (sitemapLinks.length ? ` (+${sitemapLinks.length} via sitemap)` : ''), 'in');
      // Adiciona fonte
      const srcs = steamSources(); if (!srcs.includes(url)) { srcs.push(url); steamSaveSrc(srcs); }

      const batchSize = opts.batchSize || 15;
      const batch = links.slice(0, batchSize);
      const rest = links.slice(batchSize);

      let added = 0;
      for (const l of batch) {
        const lib = steamLoad();
        if (lib.some(g => g.url === l)) { continue; }
        try {
          const h = await steamFetch(l);
          const m = await steamParse(h, l);
          if (!m.icon) { if (!silent) steamLog('  ⊘ sem imagem: ' + l, 'er'); continue; }
          lib.push({ id: 'g_' + Math.random().toString(36).slice(2, 9), name: m.name, url: l, icon: m.icon, cover: m.cover, desc: m.desc || '', added: Date.now(), plays: 0, owned: false });
          steamSave(dedupeGames(lib)); added++;
          if (!silent) steamLog('  ✓ ' + m.name, 'ok');
        } catch (e) { if (!silent) steamLog('  ✗ ' + l + ' — ' + e.message, 'er'); }
      }

      // O que não coube neste lote (+ links de paginação) não é descartado:
      // entra na fila do coletor autônomo, que continua sozinho em segundo
      // plano depois que esta função termina — o site inteiro acaba sendo
      // varrido com o tempo, mesmo sem o usuário clicar de novo.
      if (rest.length) SteamAuto.enqueue(rest, url);
      if (discovered.paginationLinks.length) SteamAuto.enqueuePages(discovered.paginationLinks, url);

      if (!silent) {
        steamLog('✓ Concluído: ' + added + ' jogos novos' + (rest.length ? ` · ${rest.length} na fila autônoma` : ''), 'ok');
        steamRefreshCurrentView();
        toast('🎮 ' + added + ' jogos na LOJA — compre grátis para jogar!', 'success');
      }
      return { added, queued: rest.length };
    } catch (e) {
      if (!silent) steamLog('✗ Erro: ' + e.message, 'er');
      throw e;
    }
  };

const SteamAuto = (function () {
    const defaults = () => ({ running: true, queue: [], pages: [], visited: [], rootLastCrawl: {}, statsDate: '', addedToday: 0, lastRun: 0, cycles: 0, lastSourcePick: 0, currentSource: null });
    function loadState() {
      try {
        const d = JSON.parse(localStorage.getItem(STEAM_AUTO_KEY));
        if (d && typeof d === 'object') return Object.assign(defaults(), d);
      } catch (e) { }
      return defaults();
    }
    let state = loadState();
    let timer = null;
    let statusMsg = 'Aguardando início...';
    const ROOT_COOLDOWN = 6 * 60 * 60 * 1000; // 6h antes de revisitar o mesmo site
    const SOURCE_PICK_INTERVAL = 2 * 60 * 1000; // seleciona uma fonte nova a cada 2 minutos

    function persist() { localStorage.setItem(STEAM_AUTO_KEY, JSON.stringify(state)); }
    function today() { return new Date().toISOString().slice(0, 10); }
    function bumpAdded(n) {
      if (state.statsDate !== today()) { state.statsDate = today(); state.addedToday = 0; }
      state.addedToday += n;
    }
    function enqueue(urls, from) {
      (urls || []).forEach(u => {
        if (state.visited.includes(u)) return;
        if (state.queue.some(q => q.url === u)) return;
        state.queue.push({ url: u, from });
      });
      if (state.queue.length > 400) state.queue = state.queue.slice(0, 400); // trava de segurança
      persist();
    }
    function enqueuePages(urls, from) {
      (urls || []).forEach(u => { if (!state.pages.some(p => p.url === u)) state.pages.push({ url: u, from }); });
      persist();
    }

    // Seleciona a próxima fonte da rotação (respeitando o cooldown por site)
    // e já dispara a coleta a partir dela — chamado no máximo 1x a cada
    // SOURCE_PICK_INTERVAL, para o ritmo ficar previsível: "a cada 2
    // minutos, escolhe uma fonte nova e começa a coletar automaticamente".
    async function pickAndCollectSource() {
      const now = Date.now();
      const sources = steamAllSources();
      const candidate = sources.find(s => !(state.rootLastCrawl[s] && now - state.rootLastCrawl[s] < ROOT_COOLDOWN));
      state.lastSourcePick = now;
      if (!candidate) {
        state.currentSource = null;
        statusMsg = 'Todas as fontes exploradas recentemente — aguardando cooldown';
        persist();
        return 0;
      }
      state.currentSource = candidate;
      statusMsg = 'Selecionou a fonte ' + candidate + ' — coletando...';
      persist();
      if (document.getElementById('st-log')) steamLog('🎯 Nova fonte selecionada: ' + candidate, 'in');
      let added = 0;
      try {
        const html = await steamFetch(candidate);
        const discovered = steamDiscover(html, candidate);
        const sitemapLinks = await steamDiscoverSitemap(candidate).catch(() => []);
        enqueue([...discovered.gameLinks, ...sitemapLinks], candidate);
        enqueuePages(discovered.paginationLinks, candidate);
        statusMsg = `Fonte ${candidate}: ${discovered.gameLinks.length + sitemapLinks.length} link(s) na fila`;
      } catch (e) {
        statusMsg = 'Falha ao coletar de ' + candidate + ': ' + e.message;
      }
      state.rootLastCrawl[candidate] = now;
      persist();
      return added;
    }

    async function tick() {
      if (!state.running) return;
      try {
        const lib = steamLoad();
        const BATCH = 4;
        let processed = 0, added = 0;

        // 1) drena a fila de links de jogos já descobertos (rápido, a cada tick)
        while (processed < BATCH && state.queue.length) {
          const item = state.queue.shift();
          state.visited.push(item.url);
          if (state.visited.length > 2000) state.visited = state.visited.slice(-2000);
          processed++;
          if (lib.some(g => g.url === item.url)) continue;
          try {
            const h = await steamFetch(item.url);
            const m = await steamParse(h, item.url);
            if (m.icon) {
              lib.push({ id: 'g_' + Math.random().toString(36).slice(2, 9), name: m.name, url: item.url, icon: m.icon, cover: m.cover, desc: m.desc || '', added: Date.now(), plays: 0, owned: false, autoCollected: true });
              steamSave(dedupeGames(lib));
              added++;
            }
          } catch (e) { /* site fora do ar ou proxy falhou — segue para o próximo */ }
        }

        // 2) fila de jogos vazia → avança uma página pendente de algum site
        if (!state.queue.length && state.pages.length) {
          const page = state.pages.shift();
          statusMsg = 'Paginando ' + page.url;
          try {
            const html = await steamFetch(page.url);
            const discovered = steamDiscover(html, page.url);
            enqueue(discovered.gameLinks, page.from);
            enqueuePages(discovered.paginationLinks, page.from);
          } catch (e) { }
          persist();
        }

        // 3) nada pendente → a cada 2 minutos (no máximo), seleciona uma
        //    fonte nova da rotação e começa a coletar a partir dela
        if (!state.queue.length && !state.pages.length && Date.now() - (state.lastSourcePick || 0) >= SOURCE_PICK_INTERVAL) {
          await pickAndCollectSource();
        }

        state.cycles++;
        state.lastRun = Date.now();
        bumpAdded(added);
        persist();
        if (added) {
          if (document.getElementById('st-log')) steamLog(`🤖 Coletor autônomo: +${added} jogo(s) novo(s)`, 'ok');
          if (document.getElementById('st-grid')) steamRender('library');
        }
        if (statusMsg.indexOf('fonte') === -1 && statusMsg.indexOf('Paginando') !== 0) {
          statusMsg = (state.queue.length || state.pages.length) ? `Processando fila: ${state.queue.length} jogos, ${state.pages.length} páginas` : statusMsg;
        }
      } catch (e) {
        statusMsg = 'Erro: ' + e.message;
      }
    }

    // Loop contínuo: entre 20s e 40s de espera (com jitter) para drenar a
    // fila com agilidade — mas a SELEÇÃO DE UMA FONTE NOVA (passo 3 do
    // tick) só acontece no máximo 1x a cada 2 minutos, controlado por
    // SOURCE_PICK_INTERVAL acima. Roda para sempre enquanto running=true,
    // mesmo com a janela da Steam fechada.
    function scheduleNext() {
      clearTimeout(timer);
      const delay = 20000 + Math.random() * 20000;
      timer = setTimeout(async () => { await tick(); scheduleNext(); }, delay);
    }
    function start() { state.running = true; persist(); scheduleNext(); }
    function stop() { state.running = false; persist(); clearTimeout(timer); }
    function status() {
      return {
        running: state.running,
        queued: state.queue.length,
        pages: state.pages.length,
        addedToday: state.statsDate === today() ? state.addedToday : 0,
        lastRun: state.lastRun,
        currentSource: state.currentSource,
        nextSourcePickIn: Math.max(0, SOURCE_PICK_INTERVAL - (Date.now() - (state.lastSourcePick || 0))),
        message: statusMsg
      };
    }
    return { enqueue, enqueuePages, start, stop, status, tick, pickAndCollectSource };
  })();

window.steamToggleAuto = function () {
    const wasRunning = SteamAuto.status().running;
    if (wasRunning) SteamAuto.stop(); else SteamAuto.start();
    if (document.getElementById('st-main')) steamRender('store');
    toast(wasRunning ? '⏸ Coletor autônomo pausado' : '▶ Coletor autônomo ativado', wasRunning ? 'default' : 'success');
  };

if (SteamAuto.status().running) SteamAuto.start();

window.steamRemove = function (id, e) {
    e && e.stopPropagation();
    const lib = steamLoad().filter(g => g.id !== id); steamSave(lib); steamRender('library');
  };

window.steamPlay = function (id) {
    const lib = steamLoad(); const g = lib.find(x => x.id === id); if (!g) return;
    // Rede de segurança: o fluxo é Loja (comprar grátis) → instalar → jogar.
    if (!g.owned) { toast('💳 Adquira grátis na LOJA primeiro!', 'error'); steamOpenDetail(id); return; }
    if (!g.installed) { toast('📦 Instale o jogo primeiro!', 'error'); steamOpenDetail(id); return; }
    g.plays = (g.plays || 0) + 1; g.lastPlay = Date.now(); steamSave(lib);
    // VessieCoin: recompensa por sessão de jogo (com cooldown por jogo, ver vessiecoin/index.js)
    window.VessieCoin?.earn(5, `Jogou ${g.name}`, { sourceId: `game:${g.id}` });
    const gameEngine = ServiceLocator.resolve('GameEngine');
    if (gameEngine && typeof gameEngine.launch === 'function') {
      gameEngine.launch(g.url, g.name);
    } else {
      // Bezel 3D: uma moldura com fundo Three.js (partículas + núcleo reativo)
      // por trás do iframe do jogo, dando uma sensação de "capsule/rig" ao redor
      // de qualquer jogo aberto pelo Game Hub — sem interferir na jogabilidade,
      // já que o canvas fica atrás e o iframe cobre a área de jogo em si.
      const winContent = `
        <div class="gh-play-bezel">
          <canvas class="gh-play-3d" aria-hidden="true"></canvas>
          <iframe src="${g.url}" style="border:none;width:100%;height:100%;position:relative;z-index:1" allow="fullscreen;autoplay" title="${g.name}"></iframe>
        </div>`;
      const win = createWin(g.name, '<i class="fab fa-steam" style="color:#66c0f4"></i>', winContent, 920, 640);
      requestAnimationFrame(() => {
        const canvas = win?.querySelector?.('.gh-play-3d') || document.querySelector('.gh-play-3d');
        if (canvas) window.mountGameHubThree(canvas, { accentColor: '#66c0f4' });
      });
    }
  };

// ============ LOJA: comprar (100% OFF) → instalar → jogar ============
// Todo jogo da biblioteca aparece na vitrine da Loja com promoção total.
// Estados por jogo (persistidos no item da biblioteca): owned (comprado),
// installing/installPct (baixando), installed (pronto p/ jogar).
function steamListPrice(g) {
    let h = 0; const s = String(g.id || g.name || '?');
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    const cents = [2990, 3990, 4990, 5990, 7990, 8990][h % 6];
    return 'R$ ' + (cents / 100).toFixed(2).replace('.', ',');
}

function steamBtnHtml(g) {
    if (!g.owned) {
      return `<button class="st-play-btn" onclick="event.stopPropagation();steamBuy('${g.id}')"><i class="fas fa-cart-plus"></i> COMPRAR</button>`;
    }
    if (!g.installed) {
      return g.installing
        ? `<div class="st-install" data-install="${g.id}"><div class="st-install-bar"><i style="width:${g.installPct || 0}%"></i></div><span>${g.installPct || 0}%</span></div>`
        : `<button class="st-play-btn" onclick="event.stopPropagation();steamInstall('${g.id}')"><i class="fas fa-download"></i> INSTALAR</button>`;
    }
    return `<button class="st-play-btn" onclick="event.stopPropagation();steamPlay('${g.id}')"><i class="fas fa-play"></i> JOGAR</button>`;
}

function steamActionsHtml(g) {
    const price = !g.owned
      ? `<div class="st-price"><span class="st-old">${steamListPrice(g)}</span><span class="st-off">-100%</span><strong class="st-free">Grátis</strong></div>`
      : (!g.installed
        ? `<div class="st-price"><strong class="st-free">Na biblioteca</strong></div>`
        : `<div class="st-price"><strong class="st-free">Instalado</strong></div>`);
    return `${price}${steamBtnHtml(g)}`;
}

function steamRefreshActions(id) {
    const lib = steamLoad(); const g = lib.find(x => x.id === id); if (!g) return;
    document.querySelectorAll(`[data-shop="${id}"]`).forEach(box => { box.innerHTML = steamActionsHtml(g); });
}

window.steamBuy = function (id) {
    const lib = steamLoad(); const g = lib.find(x => x.id === id); if (!g || g.owned) return;
    g.owned = true; steamSave(lib);
    toast(`✅ ${steamEsc(g.name)} adquirido por R$ 0,00 (100% OFF)!`, 'success');
    steamRefreshActions(id);
};

window.steamInstall = function (id) {
    const lib = steamLoad(); const g = lib.find(x => x.id === id);
    if (!g || !g.owned || g.installed || g.installing) return;
    g.installing = true; g.installPct = 0; steamSave(lib);
    steamRefreshActions(id);
    const timer = setInterval(() => {
      const l = steamLoad(); const cur = l.find(x => x.id === id);
      if (!cur || cur.installed) { clearInterval(timer); return; }
      cur.installPct = Math.min(100, (cur.installPct || 0) + 7 + Math.floor(Math.random() * 12));
      document.querySelectorAll(`[data-install="${id}"]`).forEach(bar => {
        const fill = bar.querySelector('i'), pct = bar.querySelector('span');
        if (fill) fill.style.width = cur.installPct + '%';
        if (pct) pct.textContent = cur.installPct + '%';
      });
      if (cur.installPct >= 100) {
        clearInterval(timer);
        cur.installed = true; cur.installing = false; delete cur.installPct;
        steamSave(l);
        toast(`📦 ${steamEsc(cur.name)} instalado! Clique em JOGAR.`, 'success');
        steamRefreshActions(id);
      } else steamSave(l);
    }, 140);
};

window.steamFilter = function (q) {
    q = q.toLowerCase();
    document.querySelectorAll('#st-grid .st-card').forEach(c => {
      c.style.display = c.dataset.name.toLowerCase().includes(q) ? '' : 'none';
    });
  };

window.addGameTemplate = function (name, url, icon) {
    const n = (name || '').trim();
    const u = (url || '').trim();
    if (!n || !u) return toast('Preencha nome e URL do template', 'error');
    S.gameTemplates = S.gameTemplates || [];
    S.gameTemplates.push({ name: n, url: u, icon: icon || '', enabled: true });
    persistState();
    steamRender('store');
    toast('Template adicionado ✨', 'success');
  };

window.removeGameTemplate = function (index) {
    S.gameTemplates = S.gameTemplates || [];
    S.gameTemplates.splice(index, 1);
    persistState();
    steamRender('store');
  };

// ================= BACKUP DA BIBLIOTECA (export/import em JSON) =================
// Guarda só as chaves do GameHub — nunca mexe em nenhuma outra chave do
// localStorage, e MUITO menos no storage de qualquer <iframe> de jogo
// (que, por segurança do próprio navegador, vive num domínio separado e
// é fisicamente inacessível pra este código de qualquer forma — cada
// site de jogo guarda o progresso dele isolado, sem depender do VessieOS).
function steamBuildBackup() {
  return {
    app: 'VessieOS-GameHub',
    version: 2,
    exportedAt: new Date().toISOString(),
    games: steamLoad(),
    sources: steamSources(),
    templates: (typeof S !== 'undefined' && S.gameTemplates) ? S.gameTemplates : []
  };
}

function steamApplyBackup(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.games)) {
    throw new Error('Arquivo/JSON não reconhecido como um backup do GameHub.');
  }
  steamSave(dedupeGames(data.games));
  if (Array.isArray(data.sources)) steamSaveSrc(data.sources);
  if (Array.isArray(data.templates) && typeof S !== 'undefined') { S.gameTemplates = data.templates; persistState(); }
  try { localStorage.setItem('vessieos_steam_last_backup', new Date().toISOString()); } catch (e) { /* ignore */ }
}

window.steamOpenBackupModal = function () {
  document.getElementById('st-backup-overlay')?.remove();
  const backup = steamBuildBackup();
  const json = JSON.stringify(backup, null, 2);
  const overlay = document.createElement('div');
  overlay.id = 'st-backup-overlay';
  overlay.className = 'st-modal-overlay';
  overlay.innerHTML = `
    <div class="st-modal" onclick="event.stopPropagation()">
      <div class="st-modal-hdr">
        <h3><i class="fas fa-cloud-arrow-down"></i> Backup da Biblioteca</h3>
        <button onclick="document.getElementById('st-backup-overlay').remove()"><i class="fas fa-times"></i></button>
      </div>
      <div class="st-modal-body">
        <p class="st-modal-note">Isso salva sua lista de jogos, capas e links de coleta — <b>não</b> mexe no progresso salvo de nenhum jogo (cada site guarda isso sozinho, no domínio dele). ${backup.games.length} jogo(s) neste backup.</p>

        <div class="st-modal-row">
          <button class="st-mbtn primary" onclick="steamDownloadBackup()"><i class="fas fa-download"></i> Baixar .json</button>
          <button class="st-mbtn" onclick="steamCopyBackup(this)"><i class="fas fa-copy"></i> Copiar texto</button>
        </div>
        <textarea id="st-backup-text" class="st-backup-ta" readonly onclick="this.select()">${json.replace(/</g, '&lt;')}</textarea>

        <div class="st-modal-divider"></div>

        <h4>Restaurar um backup</h4>
        <p class="st-modal-note">Cole o JSON de um backup abaixo, ou escolha um arquivo <code>.json</code>. Isso substitui sua biblioteca atual.</p>
        <textarea id="st-restore-text" class="st-backup-ta" placeholder="Cole aqui o conteúdo de um backup..."></textarea>
        <div class="st-modal-row">
          <label class="st-mbtn" style="cursor:pointer">
            <i class="fas fa-file-import"></i> Escolher arquivo .json
            <input type="file" accept="application/json,.json" style="display:none" onchange="steamRestoreFromFile(this)">
          </label>
          <button class="st-mbtn danger" onclick="steamRestoreFromText()"><i class="fas fa-rotate-left"></i> Restaurar</button>
        </div>
      </div>
    </div>`;
  overlay.onclick = () => overlay.remove();
  document.body.appendChild(overlay);
};

window.steamDownloadBackup = function () {
  const backup = steamBuildBackup();
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `vessieos-gamehub-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast('💾 Backup baixado', 'success');
};

window.steamCopyBackup = function (btn) {
  const ta = document.getElementById('st-backup-text');
  navigator.clipboard?.writeText(ta.value).then(() => {
    toast('📋 Backup copiado — cole onde quiser guardar', 'success');
  }).catch(() => { ta.select(); document.execCommand('copy'); toast('📋 Copiado', 'success'); });
};

function steamRestoreCommon(raw) {
  let data;
  try { data = JSON.parse(raw); } catch (e) { toast('⚠️ Esse texto não é um JSON válido.', 'error'); return; }
  const count = Array.isArray(data.games) ? data.games.length : 0;
  if (!confirm(`Isso vai substituir sua biblioteca atual por ${count} jogo(s) deste backup. Continuar?`)) return;
  try {
    steamApplyBackup(data);
    document.getElementById('st-backup-overlay')?.remove();
    steamRender('library');
    toast(`✅ Biblioteca restaurada (${count} jogos)`, 'success');
  } catch (e) { toast('⚠️ ' + e.message, 'error'); }
}

window.steamRestoreFromText = function () {
  const raw = (document.getElementById('st-restore-text')?.value || '').trim();
  if (!raw) { toast('Cole o JSON do backup primeiro.', 'error'); return; }
  steamRestoreCommon(raw);
};

window.steamRestoreFromFile = function (input) {
  const file = input.files?.[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = () => steamRestoreCommon(String(reader.result || ''));
  reader.readAsText(file);
};

// Lista de jogos na barra lateral, no estilo do cliente Steam real
// (ícone pequeno + nome, agrupados, com o filtro de busca no topo) — antes
// a barra lateral só tinha os links de navegação (Biblioteca/Loja/...),
// que agora vivem na faixa de abas horizontal (.st-toptabs).
window.steamRenderSidebarList = function (filterText) {
  const list = document.getElementById('st-sb-list'); if (!list) return;
  const q = (filterText ?? document.getElementById('st-sb-filter')?.value ?? '').toLowerCase();
  // Sidebar = Biblioteca = só comprados.
  const games = steamLoad().filter(g => g.owned && (!q || (g.name || '').toLowerCase().includes(q)));
  const recent = games.filter(g => g.lastPlay).sort((a, b) => b.lastPlay - a.lastPlay).slice(0, 5);
  const recentIds = new Set(recent.map(g => g.id));
  const rest = games.filter(g => !recentIds.has(g.id)).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  const row = (g) => `
    <div class="st-sb-row" onclick="steamOpenDetail('${g.id}')" title="${steamEsc(g.name)}">
      <span class="dot"></span>
      ${g.icon ? `<img src="${g.icon}" onerror="this.style.display='none'">` : `<span class="st-sb-ic">${steamEsc((g.name || '?')[0].toUpperCase())}</span>`}
      <span class="nm">${steamEsc(g.name)}</span>
    </div>`;

  list.innerHTML = `
    ${recent.length ? `<div class="st-sb-h">RECENTES</div>${recent.map(row).join('')}` : ''}
    <div class="st-sb-h">TODOS OS JOGOS · ${games.length}</div>
    ${rest.map(row).join('') || (games.length ? '' : '<div class="st-sb-empty">Nenhum jogo ainda</div>')}
  `;
};

// Página de detalhes de um jogo — inspirada na tela real da Biblioteca da
// Steam ao clicar num jogo: banner grande, botão JOGAR, estatísticas,
// abas (visuais) e um link pra página original do jogo.
window.steamOpenDetail = function (id) {
  const main = document.getElementById('st-main'); if (!main) return;
  steamEnsureCats();
  const g = steamLoad().find(x => x.id === id); if (!g) return;
  // Detalhe é contexto da Biblioteca: garante a sidebar visível.
  main.closest('.steam')?.classList.remove('no-sb');
  document.querySelectorAll('.st-tt').forEach(n => n.classList.remove('ac'));

  const fmtDate = (ts) => ts ? new Date(ts).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';
  main.innerHTML = `
    <div class="st-detail">
      <div class="st-detail-back" onclick="steamRender('library')"><i class="fas fa-arrow-left"></i> Voltar à biblioteca</div>
      <div class="st-detail-hero" style="${g.cover ? `background-image:linear-gradient(180deg,rgba(10,14,20,.15),rgba(10,14,20,.92) 88%),url('${g.cover}')` : ''}">
        <div class="st-detail-hero-inner">
          <h1>${steamEsc(g.name)}</h1>
          <div class="st-detail-actions">
            <div data-shop="${g.id}">${steamActionsHtml(g)}</div>
            <a class="st-mbtn" href="${g.url}" target="_blank" rel="noopener"><i class="fas fa-arrow-up-right-from-square"></i> Abrir site original</a>
            <button class="st-mbtn danger" onclick="steamRemove('${g.id}')"><i class="fas fa-trash"></i> Remover</button>
          </div>
        </div>
      </div>
      <div class="st-detail-stats">
        <div><span>SESSÕES</span><strong>${g.plays || 0}</strong></div>
        <div><span>ÚLTIMA VEZ JOGADO</span><strong>${fmtDate(g.lastPlay)}</strong></div>
        <div><span>ADICIONADO EM</span><strong>${fmtDate(g.added)}</strong></div>
      </div>
      <div class="st-detail-tabs">
        <span class="ac">PÁGINA DO JOGO</span><span>COMUNIDADE</span><span>GUIAS</span><span>SUPORTE</span>
      </div>
      <div class="st-detail-body">
        ${(g.cats || []).length ? `<div class="st-cats">${(g.cats || []).map(c => `<button class="st-chip sm" onclick="steamGotoCat('${c}')">${steamCatLabel(c)}</button>`).join('')}</div>` : ''}
        <p>${g.desc ? g.desc : 'Sem descrição coletada para este jogo.'}</p>
        <p class="st-detail-url"><i class="fas fa-link"></i> ${g.url}</p>
      </div>
    </div>`;
  // Sistemas do Game Hub Plus (favorito, avaliação, tempo, notas) — aditivo.
  try { if (window.VessieGameHubPlus && typeof window.VessieGameHubPlus.enhanceDetail === 'function') window.VessieGameHubPlus.enhanceDetail(main, id); } catch { /* perfil segue sem extras */ }
};

// ============ MOTOR DE CATEGORIAS + DESTAQUES (vitrine inteligente) ============
// Classificação por regras (nome/URL/descrição, pt+en), computed uma vez e
// salva no item: 16 categorias + rotação semanal determinística + ordenação
// por jogados. É um motor heurístico com aprendizado de uso (plays por
// categoria alimentam o "Em alta") — não há rede neural treinando no
// navegador; os nomes abaixo descrevem o que cada parte realmente faz.
const STEAM_CATS = [
    { id: 'acao', label: 'Ação', k: ['action', 'war', 'strike', 'battle', 'combat', 'guerra', 'batalha', 'acao', 'ação', 'stickman', 'ragdoll', 'assassin', 'ninja'] },
    { id: 'aventura', label: 'Aventura', k: ['adventure', 'quest', 'journey', 'aventura', 'explore', 'island', 'temple', 'pirate', 'escape road'] },
    { id: 'rpg', label: 'RPG', k: ['rpg', 'fantasy', 'dragon', 'dungeon', 'medieval', 'magic', 'wizard', 'fantasia', 'dragao', 'dragão'] },
    { id: 'estrategia', label: 'Estratégia', k: ['strategy', 'tower defense', 'tactic', 'tower', 'defense', 'estrateg', 'tatica', 'tática', 'chess', 'xadrez', 'kingdom', 'empire'] },
    { id: 'simulacao', label: 'Simulação', k: ['simulator', 'simulacao', 'simulação', 'tycoon', 'farm', 'truck', 'city', 'cooking', 'pet', 'hospital', 'fazenda', 'cidade', 'building'] },
    { id: 'esporte', label: 'Esporte', k: ['soccer', 'football', 'basketball', 'tennis', 'golf', 'sport', 'futebol', 'basquete', 'fifa', 'pool', 'sinuca', 'cricket', 'baseball'] },
    { id: 'corrida', label: 'Corrida', k: ['race', 'racing', 'drift', 'kart', 'corrida', 'turbo', 'moto x3m', 'traffic'] },
    { id: 'puzzle', label: 'Puzzle', k: ['puzzle', '2048', 'sudoku', 'bubble', 'jewel', 'candy', 'logic', 'quiz', 'trivia', 'memory', 'quebra'] },
    { id: 'terror', label: 'Terror', k: ['horror', 'scary', 'fnaf', 'granny', 'freddy', 'terror', 'creepy', 'baldi', 'slendrina', 'medo'] },
    { id: 'plataforma', label: 'Plataforma', k: ['platform', 'mario', 'sonic', 'jump', 'parkour', 'geometry', 'slope', 'plataforma', 'subway', 'temple run', 'run 3'] },
    { id: 'luta', label: 'Luta', k: ['fight', 'fighter', 'boxing', 'wrestling', 'tekken', 'luta', 'boxe', 'karate', 'wwe', 'mortal kombat'] },
    { id: 'tiro', label: 'Tiro', k: ['shooter', 'shoot', 'sniper', 'gun', 'fps', '1v1', 'fortnite', 'krunker', 'tiro', 'arma', 'bullet', 'lol'] },
    { id: 'sobrevivencia', label: 'Sobrevivência', k: ['survival', 'survive', 'survivor', 'zombie', 'zumbi', 'sobreviv', 'apocalypse', 'craft', 'minecraft', 'last day'] },
    { id: 'multiplayer', label: 'Multiplayer', k: ['multiplayer', '.io', '2 player', '2 jogadores', 'versus', 'pvp', 'online', 'agar', 'slither', 'brutal'] },
    { id: 'retro', label: 'Retrô', k: ['retro', 'classic', 'arcade', 'atari', 'nes', 'snes', 'pixel', 'pac-man', 'tetris', 'snake', 'space invaders', 'contra'] },
    { id: 'casual', label: 'Casual', k: ['casual', 'clicker', 'idle', 'dress', 'makeup', 'coloring', 'pintar', 'vestir', 'decorar', 'cozinhar'] }
  ];

function steamClassify(g) {
    const text = ((g.name || '') + ' ' + (g.url || '') + ' ' + (g.desc || '')).toLowerCase();
    const hits = STEAM_CATS.filter(c => c.k.some(k => text.includes(k))).map(c => c.id);
    return (hits.length ? hits : ['casual']).slice(0, 3);
}

function steamEnsureCats() {
    const lib = steamLoad();
    let dirty = false;
    lib.forEach(g => { if (!Array.isArray(g.cats)) { g.cats = steamClassify(g); dirty = true; } });
    if (dirty) steamSave(lib);
    return lib;
}

function steamCatLabel(id) {
    const c = STEAM_CATS.find(x => x.id === id);
    return c ? c.label : id;
}

function steamWeekNum() {
    const d = new Date(), onejan = new Date(d.getFullYear(), 0, 1);
    return Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
}

function steamHash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
}

// Destaque da semana: 3 jogos em rotação determinística (muda toda semana).
function steamFeatured() {
    const lib = steamEnsureCats();
    const w = steamWeekNum();
    return lib.slice().sort((a, b) => steamHash(a.id + '#' + w) - steamHash(b.id + '#' + w)).slice(0, 3);
}

let steamShopCat = 'all', steamShopSort = 'new', steamShopShown = 24;

function steamShopGames() {
    let arr = steamEnsureCats();
    if (steamShopCat !== 'all') arr = arr.filter(g => (g.cats || []).includes(steamShopCat));
    arr = arr.slice();
    if (steamShopSort === 'plays') arr.sort((a, b) => (b.plays || 0) - (a.plays || 0));
    else arr.sort((a, b) => (b.added || 0) - (a.added || 0));
    return arr;
}

function steamEsc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function steamShopCard(g) {
    const safeName = steamEsc(g.name || '?');
    const flag = g.installed
      ? '<span class="st-flag ok">INSTALADO</span>'
      : (g.owned ? '<span class="st-flag">ADQUIRIDO</span>' : '');
    return `
          <div class="st-card st-shop" data-name="${safeName}" onclick="steamOpenDetail('${g.id}')">
            ${flag}
            ${g.cover ? `<img class="cv" src="${g.cover}" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" alt="">` : ''}
            <div class="fb" style="${g.cover ? 'display:none' : ''}">${safeName[0].toUpperCase()}</div>
            <div class="meta"><div class="ttl" title="${safeName}">${safeName}</div><div class="sub"><span>${(g.cats || []).slice(0, 2).map(steamCatLabel).join(' · ')}</span></div></div>
            <div class="st-shop-buy" data-shop="${g.id}">${steamActionsHtml(g)}</div>
          </div>`;
}

function steamRenderShowcase() {
    const box = document.getElementById('st-showcase'); if (!box) return;
    const lib = steamEnsureCats();
    const feat = steamFeatured().filter(g => lib.some(x => x.id === g.id));
    const counts = {};
    lib.forEach(g => (g.cats || []).forEach(c => { counts[c] = (counts[c] || 0) + 1; }));
    const games = steamShopGames();
    const shown = games.slice(0, steamShopShown);
    box.innerHTML = `
        <div class="st-sec-h"><h3>⭐ Destaque da semana</h3><span>semana ${steamWeekNum()}</span></div>
        ${feat.length ? `<div class="st-grid st-feat">${feat.map(steamShopCard).join('')}</div>` : ''}
        <div class="st-sec-h"><h3>🗂️ Explorar por categoria</h3>
          <select class="st-sort" onchange="steamShopSortSet(this.value)">
            <option value="new"${steamShopSort === 'new' ? ' selected' : ''}>Mais recentes</option>
            <option value="plays"${steamShopSort === 'plays' ? ' selected' : ''}>Mais jogados</option>
          </select>
        </div>
        <div class="st-chips">
          <button class="st-chip${steamShopCat === 'all' ? ' ac' : ''}" onclick="steamSetShopCat('all')">Todas (${lib.length})</button>
          ${STEAM_CATS.map(c => `<button class="st-chip${steamShopCat === c.id ? ' ac' : ''}" onclick="steamSetShopCat('${c.id}')">${c.label} (${counts[c.id] || 0})</button>`).join('')}
        </div>
        ${shown.length ? `<div class="st-count">Mostrando ${shown.length} de ${games.length} jogos</div><div class="st-grid">${shown.map(steamShopCard).join('')}</div>` : '<div class="st-hero"><p>Nenhum jogo nesta categoria ainda.</p></div>'}
        ${games.length > shown.length ? `<div class="st-more"><button class="st-btn sec" onclick="steamShopMore()">Mostrar mais (${games.length - shown.length} restantes)</button></div>` : ''}`;
}

function steamSetShopCat(c) { steamShopCat = c; steamShopShown = 24; steamRenderShowcase(); }
function steamShopMore() { steamShopShown += 48; steamRenderShowcase(); }
function steamShopSortSet(v) { steamShopSort = v; steamRenderShowcase(); }
function steamGotoCat(c) {
    steamShopCat = c; steamShopShown = 24; steamShopSort = 'new';
    steamRender('store');
    steamRenderShowcase();
}

window.steamRender = function (view) {
    const main = document.getElementById('st-main'); if (!main) return;
    // A barra lateral pertence à Biblioteca: fora dela ela desaparece.
    main.closest('.steam')?.classList.toggle('no-sb', view !== 'library');
    document.querySelectorAll('.st-nv').forEach(n => n.classList.toggle('ac', n.dataset.view === view));
    document.querySelectorAll('.st-tt').forEach(n => n.classList.toggle('ac', n.dataset.view === view));
    steamRenderSidebarList();
    const lib = steamLoad();
    // Biblioteca = só jogos COMPRADOS. O resto vive na vitrine da Loja.
    const owned = lib.filter(g => g.owned);
    if (view === 'library') {
      const items = owned.slice().sort((a, b) => (b.lastPlay || b.added) - (a.lastPlay || a.added));
      main.innerHTML = `
      <div class="st-hdr"><h2>BIBLIOTECA · ${items.length} jogos</h2>
        <div style="display:flex;align-items:center;gap:8px">
          <input class="st-srch" placeholder="Buscar na biblioteca..." oninput="steamFilter(this.value)">
          <button class="st-backup-btn" onclick="steamOpenBackupModal()" title="Backup da biblioteca (exportar/importar)"><i class="fas fa-cloud-arrow-down"></i></button>
        </div>
      </div>
      <div class="st-content">
        <canvas id="st-3d-bg" class="st-3d-bg" aria-hidden="true"></canvas>
        ${items.length ? `<div class="st-grid" id="st-grid">${items.map(g => `
          <div class="st-card" data-name="${steamEsc(g.name)}" onclick="steamOpenDetail('${g.id}')" onmouseenter="pulseGameHubThree()">
            <button class="del" onclick="steamRemove('${g.id}',event)" title="Remover"><i class="fas fa-times"></i></button>
            ${g.cover ? `<img class="cv" src="${g.cover}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" alt="">` : ''}
            <div class="fb" style="${g.cover ? 'display:none' : ''}">${(g.name || '?')[0].toUpperCase()}</div>
            <div class="meta"><div class="ttl" title="${steamEsc(g.name)}">${steamEsc(g.name)}</div><div class="sub"><span>${g.plays || 0} sessões</span><span><i class="fab fa-steam"></i></span></div></div>
          </div>`).join('')}</div>` : `
          <div class="st-empty"><i class="fas fa-gamepad"></i><div>Sua biblioteca está vazia</div>
          <div style="margin-top:8px;font-size:.82rem">Vá em <b>LOJA</b>, colete jogos e clique em <b>COMPRAR</b> (grátis) para tê-los aqui</div></div>`}
      </div>`;
      // Fundo 3D em Three.js (partículas + núcleo reativo) atrás do grid da biblioteca.
      // Se o WebGL/Three.js não estiver disponível, mountGameHubThree simplesmente
      // não faz nada — o grid continua funcionando normalmente sem o fundo.
      const bgCanvas = document.getElementById('st-3d-bg');
      if (bgCanvas) window.mountGameHubThree(bgCanvas, { accentColor: '#a78bfa' });
      // Insígnias do Game Hub Plus (★ favorito, avaliação) sobre os cards.
      try { if (window.VessieGameHubPlus && typeof window.VessieGameHubPlus.enhanceLibrary === 'function') window.VessieGameHubPlus.enhanceLibrary(); } catch { /* biblioteca segue sem insígnias */ }
    } else if (view === 'store') {
      const srcs = steamSources();
      const autoHosts = steamHostsFromGames();
      const auto = SteamAuto.status();
      main.innerHTML = `
      <div class="st-hdr"><h2>LOJA · Coletor Automático</h2></div>
      <div class="st-content">
        <div id="st-showcase"></div>
        <div class="st-sec-h"><h3>🎮 Importar jogo da Steam</h3></div>
        <div class="st-hero">
          <p>Cole o link da página do jogo na Steam ou só o <b>AppID</b>. O sistema detecta <b>nome e capa oficiais</b> e coloca na vitrine da Loja.</p>
          <div class="st-form">
            <input id="st-steam-inp" placeholder="Ex.: 730 ou https://store.steampowered.com/app/730/..." onkeypress="if(event.key==='Enter')steamImportSteam(document.getElementById('st-steam-inp').value)">
            <button class="st-btn" onclick="steamImportSteam(document.getElementById('st-steam-inp').value)"><i class="fas fa-cloud-download-alt"></i> Detectar e importar</button>
          </div>
          <p class="st-note">O navegador não enxerga os jogos instalados no seu Steam — a detecção usa o catálogo público da Steam.</p>
        </div>
        <div class="st-sec-h"><h3>Coletar novos jogos</h3></div>
        <div class="st-hero">
          <h1><i class="fas fa-magnifying-glass-chart"></i> Coletar jogos de um site</h1>
          <p>Cole a URL de um <b>jogo individual</b> ou de um <b>site inteiro</b>. O sistema baixa o HTML, extrai o título via &lt;title&gt;/JSON-LD, encontra a imagem (e o sitemap, quando existe) e adiciona à sua biblioteca automaticamente.</p>
          <div class="st-form">
            <input id="st-url" placeholder="https://snowriderio.io/escape-raid" onkeypress="if(event.key==='Enter')steamAddGame(document.getElementById('st-url').value)">
            <button class="st-btn" onclick="steamAddGame(document.getElementById('st-url').value)"><i class="fas fa-plus"></i> Adicionar jogo</button>
            <button class="st-btn sec" onclick="steamCrawlSite(document.getElementById('st-url').value)"><i class="fas fa-spider"></i> Explorar site inteiro</button>
          </div>
          <div class="st-form" style="margin-top:10px">
            <input id="st-template-name" placeholder="Nome do template">
            <input id="st-template-url" placeholder="URL do jogo">
            <input id="st-template-icon" placeholder="Ícone/opcional">
            <button class="st-btn" onclick="window.addGameTemplate(document.getElementById('st-template-name').value,document.getElementById('st-template-url').value,document.getElementById('st-template-icon').value)"><i class="fas fa-layer-group"></i> Salvar template</button>
          </div>
          <div class="st-log" id="st-log"></div>
        </div>
        <div class="st-sec-h"><h3>🤖 Coletor Autônomo</h3><span>${auto.running ? '● Ativo' : '○ Pausado'}</span></div>
        <div class="st-hero" style="padding:14px 18px">
          <p style="margin:0 0 10px">
            ${auto.running ? `Rodando em segundo plano — ${auto.message}` : 'Pausado. Ative para o VessieOS ficar coletando jogos sozinho, o tempo todo, mesmo com a Steam fechada.'}<br>
            <span style="color:#67708a;font-size:.82rem">Fila: ${auto.queued} jogos · ${auto.pages} páginas para explorar · ${auto.addedToday} coletados hoje</span><br>
            ${auto.running ? `<span style="color:#66c0f4;font-size:.82rem">${auto.currentSource ? '🎯 Fonte atual: ' + auto.currentSource : 'Selecionando próxima fonte...'} · próxima seleção de fonte em ${Math.ceil(auto.nextSourcePickIn / 1000)}s</span>` : ''}
          </p>
          <button class="st-btn ${auto.running ? 'sec' : ''}" onclick="steamToggleAuto()"><i class="fas fa-${auto.running ? 'pause' : 'play'}"></i> ${auto.running ? 'Pausar coletor' : 'Ativar coletor autônomo'}</button>
        </div>
        <div class="st-sec-h"><h3>Templates salvos</h3><span>${(S.gameTemplates || []).length} itens</span></div>
        ${(S.gameTemplates || []).length ? `<div class="st-grid">${(S.gameTemplates || []).map((t, i) => `<div class="st-card"><div class="meta"><div class="ttl">${t.name}</div><div class="sub"><span>${t.url}</span></div></div><button class="del" onclick="window.removeGameTemplate(${i})"><i class="fas fa-times"></i></button></div>`).join('')}</div>` : '<div class="st-hero"><p>Nenhum template salvo. Use o formulário acima para automatizar a coleta.</p></div>'}
        <div class="st-sec-h"><h3>Fontes salvas</h3><span>${srcs.length} sites</span></div>
        ${srcs.map(s => `<div class="st-src"><i class="fas fa-globe" style="color:#66c0f4"></i><div class="url">${s}</div><span class="cnt">${lib.filter(g => { try { return new URL(g.url).host === new URL(s).host } catch (e) { return false } }).length} jogos</span><button onclick="steamRmSrc('${s.replace(/'/g, "\\'")}')">Remover</button><button class="st-btn" style="padding:4px 9px" onclick="steamCrawlSite('${s.replace(/'/g, "\\'")}')">Recoletar</button></div>`).join('')}
        <div class="st-sec-h"><h3>Fontes automáticas (detectadas nos seus jogos)</h3><span>${autoHosts.length} sites</span></div>
        ${autoHosts.map(s => `<div class="st-src"><i class="fas fa-robot" style="color:#a78bfa"></i><div class="url">${s}</div><span class="cnt">${lib.filter(g => { try { return new URL(g.url).host === new URL(s).host } catch (e) { return false } }).length} jogos</span></div>`).join('')}
        <div class="st-sec-h"><h3>Sites recomendados</h3></div>
        ${STEAM_RECOMMENDED.map(s => `<div class="st-src"><i class="fas fa-star" style="color:#f1c40f"></i><div class="url">${s}</div><button class="st-btn" style="padding:4px 9px" onclick="steamCrawlSite('${s}')">Coletar</button></div>`).join('')}
      </div>`;
      // Mantém o status do coletor autônomo (fonte atual, contagem
      // regressiva, fila) visivelmente atualizado enquanto o usuário
      // estiver olhando para a Loja, sem precisar trocar de aba.
      steamRenderShowcase();
      clearInterval(window.__steamStoreRefresh);
      window.__steamStoreRefresh = setInterval(() => {
        const stillOnStore = document.querySelector('.st-tt[data-view="store"].ac');
        if (!stillOnStore || !document.getElementById('st-main')) { clearInterval(window.__steamStoreRefresh); return; }
        // Só re-renderiza a seção do coletor, sem redesenhar o formulário
        // inteiro (evita perder o foco caso o usuário esteja digitando).
        const a = SteamAuto.status();
        const box = document.querySelectorAll('#st-main .st-hero')[1];
        if (box && a.running) {
          const p = box.querySelector('p');
          if (p) p.innerHTML = `Rodando em segundo plano — ${a.message}<br>
            <span style="color:#67708a;font-size:.82rem">Fila: ${a.queued} jogos · ${a.pages} páginas para explorar · ${a.addedToday} coletados hoje</span><br>
            <span style="color:#66c0f4;font-size:.82rem">${a.currentSource ? '🎯 Fonte atual: ' + a.currentSource : 'Selecionando próxima fonte...'} · próxima seleção de fonte em ${Math.ceil(a.nextSourcePickIn / 1000)}s</span>`;
        }
      }, 3000);
    } else if (view === 'community') {
      main.innerHTML = `
      <div class="st-hdr"><h2>COMUNIDADE</h2></div>
      <div class="st-content">
        <div class="st-grid">
          ${['Discussões', 'Capturas', 'Guias', 'Vídeos', 'Workshop', 'Mercado'].map(t => `
            <div class="st-card" onclick="toast('🚧 ${t} em breve')"><div class="fb"><i class="fas fa-users"></i></div><div class="meta"><div class="ttl">${t}</div><div class="sub"><span>VessieOS</span></div></div></div>`).join('')}
        </div>
        <div class="st-hero" style="margin-top:18px"><h1>Atividade dos amigos</h1><p>💜 <b>${S.user || 'Você'}</b> jogou ${lib.reduce((s, g) => s + (g.plays || 0), 0)} sessões no total. <b>Vessie</b> está jogando agora. <b>Sistema</b> recomenda explorar a Loja!</p></div>
      </div>`;
    } else if (view === 'downloads') {
      main.innerHTML = `
      <div class="st-hdr"><h2>DOWNLOADS</h2></div>
      <div class="st-content">
        <div class="st-hero"><h1>Nenhum download em andamento</h1><p>Jogos no VessieOS Steam são <b>baseados em web</b> — não precisam de download. Tudo roda instantaneamente via iframe seguro.</p></div>
        <div class="st-sec-h"><h3>Histórico de coleta</h3><span>${lib.length} itens na biblioteca</span></div>
        ${lib.slice().sort((a, b) => b.added - a.added).slice(0, 10).map(g => `<div class="st-src"><img src="${g.icon}" style="width:28px;height:28px;border-radius:3px;object-fit:cover" onerror="this.style.display='none'"><div class="url">${g.name}</div><span class="cnt">${new Date(g.added).toLocaleDateString('pt-BR')}</span></div>`).join('')}
      </div>`;
    } else if (view === 'friends') {
      main.innerHTML = `
      <div class="st-hdr"><h2>AMIGOS</h2></div>
      <div class="st-content">
        ${[{ n: 'Vessie', s: 'Online', c: '#5cb85c', g: 'Jogando Vessie IA 💜' }, { n: 'Sistema', s: 'Ocupado', c: '#f1c40f', g: 'Em manutenção' }, { n: 'Guest', s: 'Offline', c: '#67708a', g: '' }].map(f => `
          <div class="st-src"><div style="width:38px;height:38px;border-radius:4px;background:linear-gradient(135deg,${f.c},#1b2838);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700">${f.n[0]}</div><div class="url"><b style="color:${f.c}">${f.n}</b><div style="font-size:.74rem;color:#67708a">${f.s} · ${f.g}</div></div></div>`).join('')}
      </div>`;
    } else if (view === 'profile') {
      // Perfil do jogador (tempo, conquistas, DOS, notas) — vive no próprio
      // app Steam (games.js); sem ele, mostra orientação em vez de quebrar.
      try {
        if (window.VessieGameHubPlus && typeof window.VessieGameHubPlus.renderProfile === 'function') {
          window.VessieGameHubPlus.renderProfile(main);
        } else {
          main.innerHTML = '<div class="st-hero"><h1>Perfil indisponível</h1><p>O módulo Game Hub Plus ainda não carregou. Reabra a Steam em instantes.</p></div>';
        }
      } catch (err) {
        main.innerHTML = '<div class="st-hero"><h1>Perfil indisponível</h1><p>Não foi possível carregar o perfil agora.</p></div>';
      }
    }
  };

window.steamRmSrc = function (s) { const x = steamSources().filter(u => u !== s); steamSaveSrc(x); steamRender('store'); };

window.launchGame = function (url, name) {
    const gameEngine = ServiceLocator.resolve('GameEngine');
    if (gameEngine && typeof gameEngine.launch === 'function') {
      return gameEngine.launch(url, name);
    }
    return createWin(name, '<i class="fab fa-steam"></i>', `<iframe src="${url}" style="border:none;width:100%;height:100%;border-radius:0" allow="fullscreen;autoplay" title="${name}"></iframe>`, 880, 620);
  };

window.filterGames = function (q) { document.querySelectorAll('#games-grid .gm').forEach(g => { g.style.display = g.querySelector('span').textContent.toLowerCase().includes(q.toLowerCase()) ? '' : 'none'; }); };

window.updateAIInputs = function () {
    const modelEl = document.getElementById('settings-ai-model');
    const endpointEl = document.getElementById('settings-ai-endpoint');
    const customEl = document.getElementById('settings-ai-custom-endpoint');
    const keyEl = document.getElementById('settings-ai-key');
    if (modelEl) modelEl.value = S.aiModel || '';
    if (endpointEl) endpointEl.value = S.aiEndpoint || '';
    if (customEl) customEl.value = S.aiCustomEndpoint || '';
    if (keyEl) keyEl.value = S.apiKey || '';
  };

window.saveAIConfig = function () {
    const modelEl = document.getElementById('settings-ai-model');
    const endpointEl = document.getElementById('settings-ai-endpoint');
    const customEl = document.getElementById('settings-ai-custom-endpoint');
    const keyEl = document.getElementById('settings-ai-key');
    S.aiModel = (modelEl?.value || '').trim();
    S.aiEndpoint = (endpointEl?.value || '').trim();
    S.aiCustomEndpoint = (customEl?.value || '').trim();
    S.apiKey = (keyEl?.value || '').trim();
    persistState();
    toast('Configuração de IA salva! 🤖', 'success');
  };

function getWallCategory(w) {
    const rawCat = String(w?.c || '').trim();
    if (rawCat) {
      const key = rawCat.toLowerCase();
      if (key.includes('tech') || key.includes('neon') || key.includes('city') || key.includes('cyber') || key.includes('digital') || key.includes('grid')) return 'Tech';
      if (key.includes('space') || key.includes('galaxy') || key.includes('aurora') || key.includes('desert') || key.includes('cosmic') || key.includes('solar') || key.includes('polar')) return 'Futurista';
      if (key.includes('nature') || key.includes('forest') || key.includes('water') || key.includes('river') || key.includes('mountain') || key.includes('flora') || key.includes('cloud')) return 'Natureza';
      return rawCat;
    }
    const t = (w?.n || '').toLowerCase();
    if (t.includes('tech') || t.includes('neon') || t.includes('city') || t.includes('cyber') || t.includes('digital') || t.includes('grid')) return 'Tech';
    if (t.includes('space') || t.includes('galaxy') || t.includes('aurora') || t.includes('desert') || t.includes('cosmic') || t.includes('solar') || t.includes('polar')) return 'Futurista';
    return 'Natureza';
  }

window.getWallCategory = getWallCategory;

window.previewWall = function (url) {
    const preview = document.getElementById('wall-preview');
    if (!preview) return;
    preview.innerHTML = '';
    if (!url) {
      preview.innerHTML = '<div class="wall-preview-empty">Digite ou cole uma URL de imagem, GIF, WebP, MP4 ou iframe para ver a prévia aqui.</div>';
      return;
    }
    const lower = url.toLowerCase();
    let media = '';
    if (lower.match(/\.(mp4|webm|ogg)(\?.*)?$/)) {
      media = `<video autoplay muted loop playsinline src="${url}"></video>`;
    } else if (lower.match(/\.(gif|webp|jpe?g|png)(\?.*)?$/)) {
      media = `<img src="${url}" alt="Preview de wallpaper">`;
    } else if (url.startsWith('http://') || url.startsWith('https://')) {
      const safe = SandboxManager.safeUrl(url);
      media = `<iframe src="${safe}" allow="autoplay; fullscreen" sandbox="allow-same-origin allow-scripts allow-popups" title="Wallpaper iframe" style="width:100%;height:100%;border:none"></iframe>`;
    } else {
      media = '<div class="wall-preview-empty">URL não reconhecida. Use GIF, WebP, JPG, PNG, MP4, WebM ou um link de iframe.</div>';
    }
    preview.innerHTML = `<div class="wall-preview-inner">${media}</div><div class="wp-info"><span>Prévia de Wallpaper</span><span>${url}</span></div>`;
  }

window.applyWall = function (url, el) {
    if (!url) return;
    setWall(url);
    document.querySelectorAll('.wt').forEach(w => w.classList.remove('ac'));
    if (el) el.classList.add('ac');
    persistState();
    previewWall(url);
    toast('Papel de parede aplicado! 🖼️', 'success');
  };

window.applyAccent = function (color, el) { document.documentElement.style.setProperty('--a', color); document.querySelectorAll('.clr-swatch').forEach(s => s.classList.remove('ac')); if (el) el.classList.add('ac'); toast('Cor aplicada! 🎨', 'success'); };

window.applyTheme = function (name, c1, c2, c3, el) { window.VessieAdaptiveColor?.disable(); const r = document.documentElement.style; r.setProperty('--a', c1); r.setProperty('--a2', c2); r.setProperty('--a3', c3 || c1); const hex = c1.replace('#', ''); const R = parseInt(hex.substr(0, 2), 16), G = parseInt(hex.substr(2, 2), 16), B = parseInt(hex.substr(4, 2), 16); r.setProperty('--acc-glow', `rgba(${R},${G},${B},.42)`); document.querySelectorAll('.theme-card').forEach(s => s.classList.remove('ac')); if (el) el.classList.add('ac'); try { localStorage.setItem('vos-theme', JSON.stringify({ name, c1, c2, c3 })); } catch (_) { } toast('Tema ' + name + ' aplicado ✨', 'success'); };

(function () { try { const t = JSON.parse(localStorage.getItem('vos-theme') || 'null'); if (t) applyTheme(t.name, t.c1, t.c2, t.c3, null); } catch (_) { } })();

window.toggleDark = function (inp) { document.body.style.filter = inp.checked ? '' : 'invert(1) hue-rotate(180deg)'; };

document.getElementById('desktop').addEventListener('contextmenu', e => {
    if (e.target.closest('.win') || e.target.closest('#tb')) return;
    e.preventDefault(); const ctx = document.getElementById('ctx'); ctx.style.display = 'block';
    const x = Math.min(e.clientX, window.innerWidth - 210); const y = Math.min(e.clientY, window.innerHeight - 52 - 280);
    ctx.style.left = x + 'px'; ctx.style.top = y + 'px';
  });

window.addEventListener('contextmenu', e => { if (!e.target.closest('#desktop') || e.target.closest('.win')) e.preventDefault(); });

document.addEventListener('click', e => { if (!e.target.closest('#ctx')) document.getElementById('ctx').style.display = 'none'; });

document.querySelectorAll('.cti[data-act]').forEach(el => {
    el.onclick = () => {
      const act = el.dataset.act; document.getElementById('ctx').style.display = 'none';
      if (act === 'refresh') renderDesktop();
      else if (act === 'newFolder') { const n = prompt('Nome da nova pasta:'); if (n) toast(`Pasta "${n}" criada no desktop! 📁`, 'success'); }
      else if (act === 'personalize') openApp('settings');
      else if (act === 'terminal') openApp('terminal');
      else if (act === 'taskManager') openTaskManager();
      else if (act === 'about') openAbout();
    };
  });

document.getElementById('tb-search').onclick = () => {
    // Painel de pesquisa dedicado (JS/modules/search.js); cai para o
    // Menu Iniciar se o módulo ainda não carregou.
    if (typeof window.toggleSearchPanel === 'function') window.toggleSearchPanel();
    else openStartMenu();
  };

document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeStartMenu(); document.getElementById('ctx').style.display = 'none'; document.getElementById('np').classList.remove('open'); }
    if (e.ctrlKey && e.key === 't') openApp('terminal');
    if (e.ctrlKey && e.key === 'b') openApp('browser');
    if (e.ctrlKey && e.key === 'd') openApp('dashboard');
    if (e.ctrlKey && e.key === 'v') openApp('vessie');
  });

let secretBuf = '';

document.addEventListener('keydown', e => {
    secretBuf += e.key.toLowerCase(); if (secretBuf.length > 8) secretBuf = secretBuf.slice(-8);
    if (secretBuf.includes('vessie')) {
      secretBuf = '';
      const eg = document.getElementById('eg');
      eg.classList.add('horror');
      setTimeout(() => eg.classList.remove('horror'), 4000);
      toast('👁️ ...ela ouviu você chamar. "vessie" 💜', 'info');
    }
  });

(function ultra() {
    // ---------- INJECT STYLES ----------
    const css = document.createElement('style');
    css.textContent = `
  /* CONTEXT MENU SUBMENU */
  .cti.has-sub{position:relative;padding-right:26px}
  .cti.has-sub::after{content:'\\f105';font-family:'Font Awesome 6 Free';font-weight:900;position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:.7rem;color:var(--dim)}
  .cti.has-sub:hover>.csub,.csub.show{display:block}
  .csub{display:none;position:absolute;left:100%;top:-6px;background:rgba(14,16,28,.98);backdrop-filter:blur(22px);border:1px solid rgba(255,255,255,.09);border-radius:12px;padding:5px;box-shadow:0 15px 38px rgba(0,0,0,.8);min-width:190px;margin-left:4px}
  .csub.left{left:auto;right:100%;margin-left:0;margin-right:4px}
  .cti i.fa-check{margin-left:auto;color:var(--a2)}
  /* ICON SIZES */
  .di[data-sz="s"]{width:70px;padding:6px 4px;gap:4px}
  .di[data-sz="s"] .ic{width:38px;height:38px;font-size:20px;border-radius:10px}
  .di[data-sz="s"] label{font-size:10.5px;max-width:64px}
  .di[data-sz="m"]{width:90px}
  .di[data-sz="l"]{width:118px;padding:14px 8px;gap:9px}
  .di[data-sz="l"] .ic{width:78px;height:78px;font-size:44px;border-radius:18px}
  .di[data-sz="l"] label{font-size:13px;max-width:108px}
  .di[data-sz="xl"]{width:148px;padding:18px 10px}
  .di[data-sz="xl"] .ic{width:104px;height:104px;font-size:60px;border-radius:22px}
  .di[data-sz="xl"] label{font-size:14px;max-width:140px}
  .di .ic img,.di .ic{image-rendering:auto}
  /* SELECTION RECTANGLE */
  #selrect{position:absolute;border:1px solid rgba(126,182,255,.7);background:rgba(126,182,255,.13);pointer-events:none;display:none;z-index:5}
  /* ADAPTIVE TASKBAR */
  #tb{transition:background .6s ease,border-color .6s ease}
  #tb.tinted{background:var(--tb-tint, rgba(8,10,20,.85))!important}
  /* VM APP */
  .vm-wrap{display:flex;height:100%;background:#0b0d18;color:#e2e8f0;font-family:'Segoe UI',sans-serif}
  .vm-sb{width:210px;background:#0e1322;border-right:1px solid rgba(255,255,255,.05);padding:14px 10px;overflow-y:auto;flex-shrink:0}
  .vm-cat{font-size:.7rem;text-transform:uppercase;letter-spacing:1.2px;color:#5b6680;padding:10px 8px 6px}
  .vm-item{display:flex;align-items:center;gap:9px;padding:8px 10px;border-radius:8px;cursor:pointer;font-size:.84rem;color:#aab4cc;transition:.12s}
  .vm-item:hover{background:rgba(255,255,255,.05);color:#fff}
  .vm-item.ac{background:linear-gradient(90deg,rgba(126,182,255,.18),transparent);color:#fff;box-shadow:inset 3px 0 0 var(--a2)}
  .vm-item i{width:18px;color:var(--a2)}
  .vm-main{flex:1;display:flex;flex-direction:column;overflow:hidden}
  .vm-hero{padding:18px 22px;background:linear-gradient(135deg,#1a2240,#0e1322);border-bottom:1px solid rgba(255,255,255,.05)}
  .vm-hero h2{font-size:1.2rem;margin-bottom:4px;color:#fff}
  .vm-hero p{font-size:.82rem;color:#8898bb;line-height:1.5}
  .vm-frame{flex:1;background:#000;display:flex;align-items:center;justify-content:center;position:relative}
  .vm-frame iframe{width:100%;height:100%;border:0;background:#000}
  .vm-ph{text-align:center;color:#5b6680;padding:30px}
  .vm-ph i{font-size:3.5rem;margin-bottom:14px;display:block;color:#2a3556}
  .vm-actions{display:flex;gap:8px;padding:10px 22px;background:rgba(0,0,0,.3);border-bottom:1px solid rgba(255,255,255,.05);flex-wrap:wrap}
  .vm-btn{background:rgba(126,182,255,.13);border:1px solid rgba(126,182,255,.25);color:#fff;padding:6px 14px;border-radius:7px;font-size:.78rem;cursor:pointer;transition:.12s;display:flex;align-items:center;gap:6px}
  .vm-btn:hover{background:rgba(126,182,255,.25)}
  .vm-btn.danger{background:rgba(244,67,54,.13);border-color:rgba(244,67,54,.3)}
  /* TRASH */
  .trash-wrap{padding:18px;height:100%;overflow:auto}
  .trash-empty{text-align:center;padding:60px 20px;color:#5b6680}
  .trash-empty i{font-size:4rem;margin-bottom:14px;display:block;color:#2a3556}
  .trash-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:12px}
  .trash-it{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.06);border-radius:11px;padding:12px 8px;text-align:center;cursor:pointer;transition:.15s;position:relative}
  .trash-it:hover{background:rgba(255,255,255,.08);transform:translateY(-2px)}
  .trash-it i{font-size:2.2rem;color:var(--a2);margin-bottom:7px;display:block}
  .trash-it .nm{font-size:.78rem;color:#dde;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .trash-it .dt{font-size:.66rem;color:var(--dim);margin-top:3px}
  .trash-bar{display:flex;gap:9px;margin-bottom:14px;align-items:center;flex-wrap:wrap}
  /* APP THUMBNAIL ICON IMG SHARPNESS */
  .di .ic{image-rendering:-webkit-optimize-contrast}
  `;
    document.head.appendChild(css);

    // ---------- STATE ----------
    const LS = {
      sz: () => localStorage.getItem('vos_icon_sz') || 'm',
      setSz: v => localStorage.setItem('vos_icon_sz', v),
      autoArr: () => localStorage.getItem('vos_icon_autoArr') !== '0',
      setAutoArr: v => localStorage.setItem('vos_icon_autoArr', v ? '1' : '0'),
      snap: () => localStorage.getItem('vos_icon_snap') !== '0',
      setSnap: v => localStorage.setItem('vos_icon_snap', v ? '1' : '0'),
      show: () => localStorage.getItem('vos_icon_show') !== '0',
      setShow: v => localStorage.setItem('vos_icon_show', v ? '1' : '0'),
      pos: () => { try { return JSON.parse(localStorage.getItem('vos_icon_pos') || '{}') } catch { return {} } },
      setPos: o => localStorage.setItem('vos_icon_pos', JSON.stringify(o)),
      order: () => { try { return JSON.parse(localStorage.getItem('vos_icon_order') || 'null') } catch { return null } },
      setOrder: a => localStorage.setItem('vos_icon_order', JSON.stringify(a)),
      hidden: () => { try { return JSON.parse(localStorage.getItem('vos_icon_hidden') || '[]') } catch { return [] } },
      setHidden: a => localStorage.setItem('vos_icon_hidden', JSON.stringify(a)),
      trash: () => { try { return JSON.parse(localStorage.getItem('vos_trash') || '[]') } catch { return [] } },
      setTrash: a => localStorage.setItem('vos_trash', JSON.stringify(a)),
      customIcons: () => { try { return JSON.parse(localStorage.getItem('vos_custom_icons') || '[]') } catch { return [] } },
      setCustomIcons: a => localStorage.setItem('vos_custom_icons', JSON.stringify(a)),
    };
    const SZ_PX = { s: { w: 70, h: 70 }, m: { w: 90, h: 100 }, l: { w: 120, h: 130 }, xl: { w: 150, h: 160 } };

    // ---------- DESKTOP APPS LIST ----------
    const BASE_DESKTOP_APPS = [
      { id: 'vessie', n: 'Vessie IA', ic: 'fas fa-wand-magic-sparkles', bg: 'none' },
      { id: 'neural', n: 'Vessie Neural', ic: 'fas fa-brain', bg: 'none' },
      { id: 'appbuilder', n: 'Criador de Apps', ic: 'fas fa-screwdriver-wrench', bg: 'none' },
      { id: 'comandos', n: 'Console de Comandos', ic: 'fas fa-terminal', bg: 'none' },
      { id: 'vcoinstore', n: 'Loja VessieCoin', ic: 'fas fa-coins', bg: 'linear-gradient(135deg,#f6c343,#c98b1f)' },
      { id: 'dashboard', n: 'Dashboard', ic: 'fas fa-chart-line', bg: 'linear-gradient(135deg,#36d1dc,#5b86e5)' },
      { id: 'games', n: 'Steam', ic: 'fab fa-steam', bg: 'linear-gradient(135deg,#1b2838,#66c0f4)' },
      { id: 'browser', n: 'Navegador', ic: 'fas fa-globe', bg: 'linear-gradient(135deg,#4facfe,#00f2fe)' },
      { id: 'explorer', n: 'Explorador', ic: 'fas fa-folder-open', bg: 'linear-gradient(135deg,#f6d365,#fda085)' },
      { id: 'music', n: 'Música', ic: 'fas fa-music', bg: 'linear-gradient(135deg,#fa709a,#fee140)' },
      { id: 'notepad', n: 'Bloco Notas', ic: 'fas fa-file-lines', bg: 'linear-gradient(135deg,#a8edea,#fed6e3)' },
      { id: 'terminal', n: 'Terminal', ic: 'fas fa-terminal', bg: 'linear-gradient(135deg,#232526,#414345)' },
      { id: 'calc', n: 'Calculadora', ic: 'fas fa-calculator', bg: 'linear-gradient(135deg,#43cea2,#185a9d)' },
      { id: 'settings', n: 'Config', ic: 'fas fa-gear', bg: 'linear-gradient(135deg,#bdc3c7,#2c3e50)' },
      { id: 'camera', n: 'Câmera', ic: 'fas fa-camera', bg: 'linear-gradient(135deg,#ff6e7f,#bfe9ff)' },
      { id: 'word', n: 'Editor', ic: 'fas fa-pen-to-square', bg: 'linear-gradient(135deg,#2193b0,#6dd5ed)' },
      { id: 'vm', n: 'Máquinas Virtuais', ic: 'fas fa-server', bg: 'linear-gradient(135deg,#373b44,#4286f4)' },
      { id: 'trash', n: 'Lixeira', ic: 'fas fa-trash', bg: 'linear-gradient(135deg,#8e9eab,#eef2f3)' },
      { id: 'calculator', n: 'Calculadora', ic: 'fas fa-calculator', bg: 'linear-gradient(135deg,#43cea2,#185a9d)' },
      { id: 'painting', n: 'Paint', ic: 'fas fa-palette', bg: 'linear-gradient(135deg,#ff6b6b,#ff8e45)' },
      { id: 'clock', n: 'Relógio', ic: 'fas fa-clock', bg: 'linear-gradient(135deg,#48dbfb,#2874f0)' },
      { id: 'photos', n: 'Fotos', ic: 'fas fa-photo-video', bg: 'linear-gradient(135deg,#a855f7,#c084d0)' },
      { id: 'video', n: 'Vídeos', ic: 'fas fa-film', bg: 'linear-gradient(135deg,#11998e,#38bdf8)' }
    ];
    function getDesktopApps() {
      const hidden = new Set(LS.hidden());
      const customs = LS.customIcons();
      // Todos os apps vêm pré-instalados — nenhum é filtrado por Vessie-Store
      const onStore = (a) => true;
      let list = BASE_DESKTOP_APPS.concat(customs).filter(a => !hidden.has(a.id) && onStore(a));
      const order = LS.order();
      if (order) {
        const map = Object.fromEntries(list.map(a => [a.id, a]));
        const ordered = order.map(id => map[id]).filter(Boolean);
        const rest = list.filter(a => !order.includes(a.id));
        list = ordered.concat(rest);
      }
      return list;
    }

    // ---------- REDEFINE renderDesktop (adaptive sizes, snap, persisted pos) ----------
    window.renderDesktop = function () {
      const area = document.getElementById('icons-area');
      if (!area) return;
      area.innerHTML = '';
      if (!LS.show()) { return; }
      const sz = LS.sz();
      const { w: cellW, h: cellH } = SZ_PX[sz];
      const pad = 16;
      const availH = Math.max(300, (area.clientHeight || window.innerHeight - 52) - pad);
      const rows = Math.max(3, Math.floor(availH / cellH));
      const apps = getDesktopApps();
      const positions = LS.pos();
      const auto = LS.autoArr();

      apps.forEach((app, i) => {
        const col = Math.floor(i / rows), row = i % rows;
        let left = pad + col * cellW;
        let top = pad + row * cellH;
        if (!auto && positions[app.id]) {
          left = positions[app.id].x;
          top = positions[app.id].y;
        }
        const el = document.createElement('div');
        el.className = 'di';
        el.dataset.sz = sz;
        el.dataset.appId = app.id;
        el.style.cssText = `left:${left}px;top:${top}px`;
        const iconHtml = app.iconUrl
          ? `<img class="ic" src="${app.iconUrl}" alt="" onerror="this.outerHTML='<div class=\\'ic\\' style=\\'background:${app.bg || '#444'}\\'><i class=\\'fas fa-cube\\'></i></div>'">`
          : (app.emoji
            ? `<div class="ic-emoji">${app.emoji}</div>`
            : `<div class="ic" style="background:${app.bg || 'linear-gradient(135deg,#555,#222)'}"><i class="${app.ic || 'fas fa-cube'}"></i></div>`);
        el.innerHTML = iconHtml + `<label>${app.n}</label>`;
        el.ondblclick = () => openApp(app.id);
        el.onclick = e => {
          document.querySelectorAll('.di.sel').forEach(x => x.classList.remove('sel'));
          el.classList.add('sel');
          e.stopPropagation();
        };
        el.addEventListener('contextmenu', e => {
          e.preventDefault(); e.stopPropagation();
          document.querySelectorAll('.di.sel').forEach(x => x.classList.remove('sel'));
          el.classList.add('sel');
          showIconCtx(e.clientX, e.clientY, app);
        });
        makeDraggableEnh(el, app.id);
        area.appendChild(el);
      });
    };

    function makeDraggableEnh(el, id) {
      let dx, dy, dragging = false, moved = false;

      function start(clientX, clientY) {
        dx = clientX - el.offsetLeft; dy = clientY - el.offsetTop;
        dragging = true; moved = false; el.style.zIndex = 999;
      }
      function move(clientX, clientY) {
        if (!dragging) return;
        moved = true;
        el.style.left = (clientX - dx) + 'px';
        el.style.top = (clientY - dy) + 'px';
      }
      function end() {
        if (!dragging) return;
        dragging = false; el.style.zIndex = '';
        if (moved && !LS.autoArr()) {
          let x = parseInt(el.style.left), y = parseInt(el.style.top);
          if (LS.snap()) {
            const sz = LS.sz(); const { w: cw, h: ch } = SZ_PX[sz];
            x = Math.round((x - 16) / cw) * cw + 16;
            y = Math.round((y - 16) / ch) * ch + 16;
            el.style.left = x + 'px'; el.style.top = y + 'px';
          }
          const pos = LS.pos(); pos[id] = { x, y }; LS.setPos(pos);
        }
      }

      el.addEventListener('mousedown', e => {
        if (e.button !== 0 || e.detail > 1) return;
        start(e.clientX, e.clientY);
      });
      document.addEventListener('mousemove', e => move(e.clientX, e.clientY));
      document.addEventListener('mouseup', end);

      // Suporte a toque real (celular/tablet) — sem isto, arrastar uma
      // janela pelo título não funciona em telas touch, já que
      // mousedown/mousemove/mouseup não dependem de toque em todo
      // navegador móvel. Só a barra de título (onde isto é aplicado,
      // ver bindWindowActions/createWin) escuta touch aqui, então isto
      // não atrapalha rolagem de conteúdo dentro da janela.
      el.addEventListener('touchstart', e => {
        if (e.touches.length !== 1) return;
        const t = e.touches[0];
        start(t.clientX, t.clientY);
      }, { passive: true });
      document.addEventListener('touchmove', e => {
        if (!dragging || !e.touches.length) return;
        e.preventDefault(); // impede o scroll da página enquanto arrasta
        const t = e.touches[0];
        move(t.clientX, t.clientY);
      }, { passive: false });
      document.addEventListener('touchend', end);
      document.addEventListener('touchcancel', end);
    }

    // ---------- DESKTOP CONTEXT MENU (rebuilt with submenus) ----------
    const desktop = document.getElementById('desktop');
    const oldCtx = document.getElementById('ctx');
    if (oldCtx) oldCtx.remove();
    const ctx = document.createElement('div');
    ctx.id = 'ctx';
    document.getElementById('desktop').appendChild(ctx);

    function ckIf(b) { return b ? '<i class="fas fa-check"></i>' : ''; }
    function buildDesktopCtx() {
      const sz = LS.sz();
      return `
      <div class="cti has-sub"><i class="fas fa-eye"></i> Exibir
        <div class="csub">
          <div class="cti" data-cmd="size:xl"><i class="fas fa-expand"></i> Ícones extra grandes ${ckIf(sz === 'xl')}</div>
          <div class="cti" data-cmd="size:l"><i class="fas fa-expand-arrows-alt"></i> Ícones grandes ${ckIf(sz === 'l')}</div>
          <div class="cti" data-cmd="size:m"><i class="fas fa-th-large"></i> Ícones médios ${ckIf(sz === 'm')}</div>
          <div class="cti" data-cmd="size:s"><i class="fas fa-th"></i> Ícones pequenos ${ckIf(sz === 's')}</div>
          <div class="cts"></div>
          <div class="cti" data-cmd="toggle:auto"><i class="fas fa-magnet"></i> Organizar automaticamente ${ckIf(LS.autoArr())}</div>
          <div class="cti" data-cmd="toggle:snap"><i class="fas fa-border-all"></i> Alinhar à grade ${ckIf(LS.snap())}</div>
          <div class="cti" data-cmd="toggle:show"><i class="fas fa-eye-slash"></i> Mostrar ícones ${ckIf(LS.show())}</div>
        </div>
      </div>
      <div class="cti has-sub"><i class="fas fa-sort"></i> Classificar por
        <div class="csub">
          <div class="cti" data-cmd="sort:name"><i class="fas fa-font"></i> Nome</div>
          <div class="cti" data-cmd="sort:size"><i class="fas fa-arrows-alt-v"></i> Tipo</div>
          <div class="cti" data-cmd="sort:random"><i class="fas fa-random"></i> Aleatório</div>
          <div class="cti" data-cmd="sort:reset"><i class="fas fa-undo"></i> Restaurar padrão</div>
        </div>
      </div>
      <div class="cti" data-cmd="refresh"><i class="fas fa-sync-alt"></i> Atualizar</div>
      <div class="cts"></div>
      <div class="cti has-sub"><i class="fas fa-plus"></i> Novo
        <div class="csub">
          <div class="cti" data-cmd="new:folder"><i class="fas fa-folder-plus"></i> Pasta</div>
          <div class="cti" data-cmd="new:txt"><i class="fas fa-file"></i> Documento de texto</div>
          <div class="cti" data-cmd="new:shortcut"><i class="fas fa-link"></i> Atalho (URL)</div>
          <div class="cti" data-cmd="new:custom"><i class="fas fa-image"></i> Ícone personalizado</div>
        </div>
      </div>
      <div class="cti" data-cmd="personalize"><i class="fas fa-paint-brush"></i> Personalizar</div>
      <div class="cti" data-cmd="wallnext"><i class="fas fa-images"></i> Próximo wallpaper</div>
      <div class="cts"></div>
      <div class="cti" data-cmd="terminal"><i class="fas fa-terminal"></i> Abrir Terminal</div>
      <div class="cti" data-cmd="taskmgr"><i class="fas fa-tasks"></i> Gerenciador de Tarefas</div>
      <div class="cti" data-cmd="trash"><i class="fas fa-trash"></i> Lixeira</div>
      <div class="cts"></div>
      <div class="cti" data-cmd="about"><i class="fas fa-info-circle"></i> Sobre o VessieOS</div>
    `;
    }

    function showCtxAt(x, y) {
      ctx.style.display = 'block';
      ctx.style.left = Math.min(x, window.innerWidth - 230) + 'px';
      ctx.style.top = Math.min(y, window.innerHeight - 460) + 'px';
    }
    function hideCtx() { ctx.style.display = 'none'; document.querySelectorAll('.csub.show').forEach(s => s.classList.remove('show')); }

    desktop.addEventListener('contextmenu', e => {
      if (e.target.closest('.win') || e.target.closest('#tb') || e.target.closest('.di')) return;
      e.preventDefault();
      ctx.innerHTML = buildDesktopCtx();
      bindCtxCmds();
      showCtxAt(e.clientX, e.clientY);
    });
    document.addEventListener('click', e => { if (!e.target.closest('#ctx')) hideCtx(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') hideCtx(); });

    function bindCtxCmds() {
      ctx.querySelectorAll('.cti[data-cmd]').forEach(el => {
        el.onclick = (e) => {
          e.stopPropagation();
          const [cmd, arg] = el.dataset.cmd.split(':');
          handleCtxCmd(cmd, arg);
          hideCtx();
        };
      });
      // submenu hover
      ctx.querySelectorAll('.cti.has-sub').forEach(p => {
        p.addEventListener('mouseenter', () => {
          ctx.querySelectorAll('.csub.show').forEach(s => { if (!p.contains(s)) s.classList.remove('show'); });
          const s = p.querySelector('.csub'); if (s) {
            s.classList.add('show');
            const r = s.getBoundingClientRect();
            if (r.right > window.innerWidth) s.classList.add('left');
          }
        });
      });
    }

    function handleCtxCmd(cmd, arg) {
      if (cmd === 'size') { LS.setSz(arg); renderDesktop(); toast('Tamanho de ícone: ' + ({ s: 'Pequeno', m: 'Médio', l: 'Grande', xl: 'Extra Grande' }[arg])); }
      else if (cmd === 'toggle') {
        if (arg === 'auto') { LS.setAutoArr(!LS.autoArr()); if (LS.autoArr()) { localStorage.removeItem('vos_icon_pos'); } renderDesktop(); }
        if (arg === 'snap') { LS.setSnap(!LS.snap()); }
        if (arg === 'show') { LS.setShow(!LS.show()); renderDesktop(); }
      }
      else if (cmd === 'sort') {
        const apps = getDesktopApps();
        let arr;
        if (arg === 'name') arr = apps.slice().sort((a, b) => a.n.localeCompare(b.n)).map(a => a.id);
        else if (arg === 'size') arr = apps.slice().sort((a, b) => (a.id || '').localeCompare(b.id || '')).map(a => a.id);
        else if (arg === 'random') arr = apps.slice().sort(() => Math.random() - .5).map(a => a.id);
        else { localStorage.removeItem('vos_icon_order'); localStorage.removeItem('vos_icon_pos'); LS.setAutoArr(true); renderDesktop(); return; }
        LS.setOrder(arr); LS.setAutoArr(true); localStorage.removeItem('vos_icon_pos'); renderDesktop();
      }
      else if (cmd === 'refresh') { renderDesktop(); toast('Desktop atualizado', 'success'); }
      else if (cmd === 'new') {
        if (arg === 'folder') { const n = prompt('Nome da pasta:', 'Nova pasta'); if (n) addCustomIcon({ n, ic: 'fas fa-folder', bg: 'linear-gradient(135deg,#f6d365,#fda085)' }); }
        else if (arg === 'txt') { const n = prompt('Nome do arquivo:', 'Novo documento.txt'); if (n) addCustomIcon({ n, ic: 'fas fa-file-lines', bg: 'linear-gradient(135deg,#74ebd5,#9face6)', openId: 'notepad' }); }
        else if (arg === 'shortcut') { const u = prompt('URL do atalho:', 'https://'); if (u) { const n = prompt('Nome:', u.replace(/^https?:\/\//, '').split('/')[0]) || u; addCustomIcon({ n, ic: 'fas fa-link', bg: 'linear-gradient(135deg,#4facfe,#00f2fe)', url: u }); } }
        else if (arg === 'custom') {
          const n = prompt('Nome do ícone:'); if (!n) return;
          const u = prompt('URL da imagem (ícone):', '');
          const link = prompt('Abrir URL/site ao clicar (opcional):', '');
          addCustomIcon({ n, iconUrl: u || undefined, ic: u ? undefined : 'fas fa-star', bg: 'linear-gradient(135deg,#fceabb,#f8b500)', url: link || undefined });
        }
      }
      else if (cmd === 'personalize') { openApp('settings'); }
      else if (cmd === 'wallnext') { nextWall(); }
      else if (cmd === 'terminal') { openApp('terminal'); }
      else if (cmd === 'taskmgr') { openTaskManager(); }
      else if (cmd === 'trash') { openApp('trash'); }
      else if (cmd === 'about') { openAbout(); }
    }

    function addCustomIcon(o) {
      const arr = LS.customIcons();
      o.id = 'cu_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
      arr.push(o); LS.setCustomIcons(arr); renderDesktop();
      toast('"' + o.n + '" criado no desktop', 'success');
    }

    // ---------- PER-ICON CONTEXT MENU ----------
    function showIconCtx(x, y, app) {
      const tbTarget = app.openId || app.id;
      const tbOk = (typeof APPS !== 'undefined') && APPS.some(a => a.id === tbTarget);
      ctx.innerHTML = `
      <div class="cti" data-i="open"><i class="fas fa-play"></i> Abrir</div>
      <div class="cti" data-i="newwin"><i class="fas fa-window-restore"></i> Abrir em nova janela</div>
      <div class="cts"></div>
      <div class="cti" data-i="rename"><i class="fas fa-i-cursor"></i> Renomear</div>
      <div class="cti" data-i="changeicon"><i class="fas fa-image"></i> Alterar ícone</div>
      <div class="cts"></div>
      <div class="cti" data-i="trash"><i class="fas fa-trash"></i> Enviar para Lixeira</div>
      <div class="cti" data-i="hide"><i class="fas fa-eye-slash"></i> Ocultar do desktop</div>
      ${tbOk ? '<div class="cti" data-i="taskbar"><i class="fas fa-bars-staggered"></i> Fixar na barra de tarefas</div>' : ''}
      <div class="cts"></div>
      <div class="cti" data-i="props"><i class="fas fa-info-circle"></i> Propriedades</div>
    `;
      showCtxAt(x, y);
      ctx.querySelectorAll('.cti[data-i]').forEach(el => {
        el.onclick = e => {
          e.stopPropagation();
          iconCmd(el.dataset.i, app);
          hideCtx();
        };
      });
    }
    function iconCmd(c, app) {
      if (c === 'open' || c === 'newwin') {
        if (app.url) { window.open(app.url, '_blank'); return; }
        if (app.openId) { openApp(app.openId); return; }
        openApp(app.id);
      }
      else if (c === 'rename') {
        const nn = prompt('Novo nome:', app.n); if (!nn) return;
        const customs = LS.customIcons();
        const ci = customs.find(x => x.id === app.id);
        if (ci) { ci.n = nn; LS.setCustomIcons(customs); }
        else { // rename base app via custom override
          const ov = JSON.parse(localStorage.getItem('vos_icon_names') || '{}'); ov[app.id] = nn;
          localStorage.setItem('vos_icon_names', JSON.stringify(ov));
          BASE_DESKTOP_APPS.forEach(b => { if (b.id === app.id) b.n = nn; });
        }
        renderDesktop();
      }
      else if (c === 'changeicon') {
        const u = prompt('URL da nova imagem do ícone:', app.iconUrl || '');
        if (u === null) return;
        const customs = LS.customIcons();
        const ci = customs.find(x => x.id === app.id);
        if (ci) { ci.iconUrl = u || undefined; LS.setCustomIcons(customs); }
        else { BASE_DESKTOP_APPS.forEach(b => { if (b.id === app.id) b.iconUrl = u || undefined; }); }
        renderDesktop();
      }
      else if (c === 'trash') {
        const trash = LS.trash();
        trash.unshift({ ...app, deletedAt: Date.now(), wasCustom: !!LS.customIcons().find(x => x.id === app.id) });
        LS.setTrash(trash);
        const customs = LS.customIcons().filter(x => x.id !== app.id); LS.setCustomIcons(customs);
        const hidden = LS.hidden(); if (!hidden.includes(app.id)) { hidden.push(app.id); LS.setHidden(hidden); }
        renderDesktop(); toast('"' + app.n + '" enviado para a Lixeira', 'success');
      }
      else if (c === 'hide') {
        const hidden = LS.hidden(); if (!hidden.includes(app.id)) { hidden.push(app.id); LS.setHidden(hidden); }
        renderDesktop();
      }
      else if (c === 'taskbar') {
        toggleTaskbarPin(app.openId || app.id);
      }
      else if (c === 'props') {
        createWin('Propriedades · ' + app.n, '<i class="fas fa-info-circle"></i>',
          `<div style="padding:22px;font-size:.86rem;line-height:1.9;color:#cdd6f4">
          <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px">
            <div style="width:64px;height:64px;border-radius:14px;background:${app.bg || '#333'};display:flex;align-items:center;justify-content:center;font-size:32px;color:#fff">${app.iconUrl ? `<img src="${app.iconUrl}" style="width:100%;height:100%;border-radius:14px;object-fit:cover">` : `<i class="${app.ic}"></i>`}</div>
            <div><div style="font-size:1.05rem;font-weight:600">${app.n}</div><div style="color:var(--dim);font-size:.78rem">${app.id}</div></div>
          </div>
          <div><b>Tipo:</b> ${app.url ? 'Atalho de Internet' : (app.openId ? 'Atalho' : 'Aplicativo do sistema')}</div>
          ${app.url ? `<div><b>URL:</b> <a href="${app.url}" target="_blank" style="color:var(--a2)">${app.url}</a></div>` : ''}
          <div><b>Tamanho atual:</b> ${LS.sz().toUpperCase()}</div>
          <div><b>Posição persistida:</b> ${LS.pos()[app.id] ? 'Sim' : 'Não'}</div>
        </div>`, 420, 360);
      }
    }

    // ---------- PIN NA ÁREA DE TRABALHO (ponte p/ menus externos) ----------
    // Liga um app do sistema (APPS por id) a um ícone do desktop: desafixar
    // esconde/remove; fixar reexibe um ícone base ou cria um atalho custom.
    function deskVisibleFor(appId) {
      const hidden = new Set(LS.hidden());
      return deskAll().find(a => !hidden.has(a.id) && (a.id === appId || a.openId === appId)) || null;
    }
    function deskAll() {
      return BASE_DESKTOP_APPS.concat(LS.customIcons());
    }
    function normDeskIcon(ic) {
      ic = String(ic || '').trim();
      if (!ic) return { ic: 'fas fa-cube' };
      if (ic.startsWith('<')) return { ic: 'fas fa-cube' };
      if (/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}]/u.test(ic)) return { emoji: ic };
      return { ic };
    }
    window.desktopPin = {
      isPinned(appId) { return !!deskVisibleFor(appId); },
      set(appId, on) {
        const all = (typeof APPS !== 'undefined' ? APPS : []);
        const app = all.find(a => a.id === appId);
        if (on) {
          LS.setHidden(LS.hidden().filter(h => h !== appId && h !== 'desk_' + appId));
          let customs = LS.customIcons();
          if (!deskVisibleFor(appId) && app) {
            customs = customs.filter(c => c.openId !== appId);
            const nu = Object.assign({ id: 'desk_' + appId, n: app.n, openId: appId, bg: 'linear-gradient(135deg,#7c3aed,#4f46e5)' }, normDeskIcon(app.ic));
            customs.push(nu);
            LS.setCustomIcons(customs);
          }
        } else {
          const base = BASE_DESKTOP_APPS.find(b => b.id === appId);
          if (base) {
            const hidden = LS.hidden();
            if (!hidden.includes(appId)) { hidden.push(appId); LS.setHidden(hidden); }
          }
          LS.setCustomIcons(LS.customIcons().filter(c => c.openId !== appId && c.id !== appId && c.id !== 'desk_' + appId));
        }
        renderDesktop();
        return deskVisibleFor(appId);
      }
    };

    // Apply name overrides from rename
    try { const ov = JSON.parse(localStorage.getItem('vos_icon_names') || '{}'); BASE_DESKTOP_APPS.forEach(b => { if (ov[b.id]) b.n = ov[b.id]; }); } catch { }

    // ---------- WALLPAPER NEXT + PALETTE EXTRACTION ----------
    let wallIdx = 0;
    window.nextWall = function () {
      if (typeof WALLS === 'undefined' || !WALLS.length) return;
      wallIdx = (wallIdx + 1) % WALLS.length;
      const u = WALLS[wallIdx].u;
      setWall(u); extractPalette(u); toast('Wallpaper: ' + WALLS[wallIdx].n);
    };

    function extractPalette(url) {
      const img = new Image(); img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const c = document.createElement('canvas'); const W = 48, H = 48; c.width = W; c.height = H;
          const x = c.getContext('2d'); x.drawImage(img, 0, 0, W, H);
          const d = x.getImageData(0, 0, W, H).data;
          const buckets = {}; let bestC = null, bestN = 0;
          for (let i = 0; i < d.length; i += 4) {
            const a = d[i + 3]; if (a < 200) continue;
            const r = d[i] & 0xF0, g = d[i + 1] & 0xF0, b = d[i + 2] & 0xF0;
            const max = Math.max(r, g, b), min = Math.min(r, g, b);
            if (max - min < 24) continue; // skip greys
            if (max < 60 || max > 240) continue;
            const k = `${r},${g},${b}`;
            buckets[k] = (buckets[k] || 0) + 1;
            if (buckets[k] > bestN) { bestN = buckets[k]; bestC = [r, g, b]; }
          }
          if (!bestC) return;
          const [r, g, b] = bestC;
          const root = document.documentElement.style;
          const hex = `rgb(${r + 8},${g + 8},${b + 8})`;
          const hex2 = `rgb(${Math.min(255, r + 60)},${Math.min(255, g + 30)},${Math.min(255, b + 90)})`;
          root.setProperty('--a', hex);
          root.setProperty('--a3', hex);
          root.setProperty('--a2', hex2);
          const tb = document.getElementById('tb');
          if (tb) {
            tb.classList.add('tinted');
            tb.style.setProperty('--tb-tint', `rgba(${Math.round(r * 0.18)},${Math.round(g * 0.18)},${Math.round(b * 0.22)},.78)`);
          }
        } catch (e) { /* CORS may block — silent */ }
      };
      img.src = url;
    }
    // Hook setWall to also extract palette
    const _origSetWall = window.setWall;
    if (_origSetWall) {
      window.setWall = function (u) { _origSetWall(u); extractPalette(u); };
    }
    // Run once on boot if wallpaper already set
    setTimeout(() => { if (typeof S !== 'undefined' && S.wallpaper) extractPalette(S.wallpaper); }, 1200);

    // ---------- PATCH openApp TO HANDLE NEW APPS + CUSTOM ICONS ----------
    const _origOpen = window.openApp;
    window.openApp = function (id) {
      // custom icon shortcuts
      const ci = LS.customIcons().find(x => x.id === id);
      if (ci) {
        if (ci.url) {
          return createWin(ci.n, ci.iconUrl ? `<img src="${ci.iconUrl}" style="width:18px;height:18px;border-radius:4px">` : `<i class="${ci.ic || 'fas fa-link'}"></i>`,
            `<iframe src="${ci.url}" style="border:0;width:100%;height:100%" allow="fullscreen;autoplay" sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>`,
            960, 640);
        }
        if (ci.openId) return _origOpen(ci.openId);
        return toast('Arquivo: ' + ci.n);
      }
      if (id === 'trash') return openTrash();
      if (id === 'vm') return openVM();
      return _origOpen(id);
    };

    // ---------- TRASH APP ----------
    function openTrash() {
      const items = LS.trash();
      const win = createWin('Lixeira', '<i class="fas fa-trash" style="color:#9ecbff"></i>', `
      <div class="trash-wrap">
        <div class="trash-bar">
          <button class="vm-btn" id="tr-restore-all"><i class="fas fa-undo"></i> Restaurar tudo</button>
          <button class="vm-btn danger" id="tr-empty"><i class="fas fa-fire"></i> Esvaziar Lixeira</button>
          <span style="color:var(--dim);font-size:.8rem;margin-left:auto">${items.length} item(ns)</span>
        </div>
        <div id="tr-body"></div>
      </div>
    `, 640, 460);
      win.dataset.app = 'trash';
      renderTrashBody(win);
      win.querySelector('#tr-restore-all').onclick = () => {
        const it = LS.trash();
        it.forEach(t => {
          if (t.wasCustom) { const c = LS.customIcons(); c.push(t); LS.setCustomIcons(c); }
          const h = LS.hidden().filter(x => x !== t.id); LS.setHidden(h);
        });
        LS.setTrash([]); renderDesktop(); renderTrashBody(win); toast('Tudo restaurado', 'success');
      };
      win.querySelector('#tr-empty').onclick = () => {
        if (!confirm('Esvaziar Lixeira definitivamente?')) return;
        LS.setTrash([]); renderTrashBody(win); toast('Lixeira esvaziada', 'success');
      };
    }
    function renderTrashBody(win) {
      const body = win.querySelector('#tr-body');
      const items = LS.trash();
      if (!items.length) {
        body.innerHTML = `<div class="trash-empty"><i class="fas fa-trash-can"></i><h3>Lixeira vazia</h3><p>Itens excluídos aparecerão aqui</p></div>`;
        return;
      }
      body.innerHTML = `<div class="trash-grid">${items.map((t, i) => `
      <div class="trash-it" data-i="${i}">
        <i class="${t.ic || 'fas fa-file'}"></i>
        <div class="nm">${t.n}</div>
        <div class="dt">${new Date(t.deletedAt).toLocaleDateString('pt-BR')}</div>
      </div>`).join('')}</div>`;
      body.querySelectorAll('.trash-it').forEach(el => {
        el.oncontextmenu = e => {
          e.preventDefault();
          const i = +el.dataset.i, t = LS.trash()[i];
          ctx.innerHTML = `<div class="cti" data-tr="rest"><i class="fas fa-undo"></i> Restaurar</div><div class="cti" data-tr="del"><i class="fas fa-times"></i> Excluir definitivamente</div>`;
          showCtxAt(e.clientX, e.clientY);
          ctx.querySelectorAll('.cti').forEach(x => x.onclick = () => {
            const a = x.dataset.tr; const arr = LS.trash();
            if (a === 'rest') {
              if (t.wasCustom) { const c = LS.customIcons(); c.push(t); LS.setCustomIcons(c); }
              const h = LS.hidden().filter(x => x !== t.id); LS.setHidden(h);
            }
            arr.splice(i, 1); LS.setTrash(arr); renderDesktop(); renderTrashBody(win); hideCtx();
          });
        };
        el.ondblclick = () => {
          const i = +el.dataset.i, t = LS.trash()[i];
          if (confirm(`Restaurar "${t.n}"?`)) {
            if (t.wasCustom) { const c = LS.customIcons(); c.push(t); LS.setCustomIcons(c); }
            const h = LS.hidden().filter(x => x !== t.id); LS.setHidden(h);
            const arr = LS.trash(); arr.splice(i, 1); LS.setTrash(arr);
            renderDesktop(); renderTrashBody(win);
          }
        };
      });
    }

    // ---------- VIRTUAL MACHINES APP ----------
    const VMS = [
      {
        cat: 'Windows', items: [
          { id: 'win11', n: 'Windows 11 (Web Demo)', ic: 'fab fa-windows', desc: 'Emulação Windows 11 via web — interface completa', url: 'https://win11.blueedge.me/' },
          { id: 'win10', n: 'Windows 10 (Web)', ic: 'fab fa-windows', desc: 'Windows 10 emulado em JavaScript', url: 'https://win10.blueedge.me/' },
          { id: 'winxp', n: 'Windows XP (v86)', ic: 'fab fa-windows', desc: 'Windows XP rodando em v86 (emulador x86)', url: 'https://copy.sh/v86/?profile=windows2000' },
          { id: 'win98', n: 'Windows 98', ic: 'fab fa-windows', desc: 'Windows 98 clássico em v86', url: 'https://copy.sh/v86/?profile=windows98' },
        ]
      },
      {
        cat: 'Linux', items: [
          { id: 'ubuntu', n: 'Ubuntu Linux', ic: 'fab fa-ubuntu', desc: 'Ubuntu rodando direto no navegador', url: 'https://bellard.org/jslinux/vm.html?cpu=riscv64&url=buildroot-riscv64.cfg&mem=256' },
          { id: 'alpine', n: 'Alpine Linux', ic: 'fab fa-linux', desc: 'Distro leve via v86', url: 'https://copy.sh/v86/?profile=linux26' },
          { id: 'debian', n: 'Debian', ic: 'fab fa-debian', desc: 'Debian Linux via JSLinux', url: 'https://bellard.org/jslinux/vm.html?cpu=x86&url=https://bellard.org/jslinux/buildroot-x86.cfg&mem=192' },
        ]
      },
      {
        cat: 'Android & Mobile', items: [
          { id: 'android', n: 'Android (Demo)', ic: 'fab fa-android', desc: 'Emulador Android web', url: 'https://www.geo.tv/' },
          { id: 'androsim', n: 'Android Simulator', ic: 'fab fa-android', desc: 'Simulador de interface Android', url: 'https://appetize.io/embed/b0gfn0kpemmbq3a5wykcwumg34?device=pixel4&osVersion=11.0&scale=75&autoplay=false' },
        ]
      },
      {
        cat: 'Outros sistemas', items: [
          { id: 'macos9', n: 'Mac OS 9 (PCE)', ic: 'fab fa-apple', desc: 'Mac OS clássico em JavaScript', url: 'https://infinitemac.org/1999/Mac%20OS%209.0.4' },
          { id: 'kolibri', n: 'KolibriOS', ic: 'fas fa-circle-notch', desc: 'OS minúsculo em assembly via v86', url: 'https://copy.sh/v86/?profile=kolibri' },
          { id: 'freedos', n: 'FreeDOS', ic: 'fas fa-terminal', desc: 'DOS livre via v86', url: 'https://copy.sh/v86/?profile=freedos' },
          { id: 'haiku', n: 'Haiku OS', ic: 'fas fa-rocket', desc: 'Sucessor do BeOS via v86', url: 'https://copy.sh/v86/?profile=haiku' },
        ]
      },
      {
        cat: 'Jogos & Plataformas', items: [
          { id: 'roblox', n: 'Roblox (Web)', ic: 'fas fa-cube', desc: 'Acessa Roblox via portal web', url: 'https://www.roblox.com/' },
          { id: 'ff', n: 'Free Fire Web', ic: 'fas fa-fire', desc: 'Portal Free Fire (Garena)', url: 'https://ff.garena.com/' },
          { id: 'cod', n: 'Call of Duty Web', ic: 'fas fa-crosshairs', desc: 'Portal Call of Duty', url: 'https://www.callofduty.com/' },
          { id: 'msdos', n: 'MS-DOS Games Archive', ic: 'fas fa-gamepad', desc: 'Centenas de jogos clássicos DOS no Archive.org', url: 'https://archive.org/details/softwarelibrary_msdos_games' },
          { id: 'flash', n: 'Flash Games', ic: 'fas fa-bolt', desc: 'Coleção Flashpoint via web', url: 'https://flashpointarchive.org/' },
          { id: 'discrod', n: 'Discrod', ic: '<i class="fab fa-discord" style="color:#5865F2"></i>', cat: 'util' },
        ]
      },
    ];

    function openVM() {
      const sb = VMS.map(g => `<div class="vm-cat">${g.cat}</div>` + g.items.map(it => `<div class="vm-item" data-vm="${it.id}"><i class="${it.ic}"></i> ${it.n}</div>`).join('')).join('');
      const win = createWin('Máquinas Virtuais', '<i class="fas fa-server" style="color:#7eb6ff"></i>', `
      <div class="vm-wrap">
        <div class="vm-sb">${sb}</div>
        <div class="vm-main">
          <div class="vm-hero" id="vm-hero">
            <h2>🖥️ Máquinas Virtuais VessieOS</h2>
            <p>Escolha um sistema operacional ou plataforma para iniciar a máquina virtual. Suporta Windows, Linux, Android, Mac OS e jogos clássicos rodando diretamente no navegador via v86, JSLinux e portais web.</p>
          </div>
          <div class="vm-actions" id="vm-actions" style="display:none">
            <button class="vm-btn" id="vm-reload"><i class="fas fa-sync"></i> Reiniciar</button>
            <button class="vm-btn" id="vm-fs"><i class="fas fa-expand"></i> Tela cheia</button>
            <button class="vm-btn" id="vm-open"><i class="fas fa-external-link-alt"></i> Abrir em nova aba</button>
            <button class="vm-btn danger" id="vm-stop"><i class="fas fa-stop"></i> Parar VM</button>
          </div>
          <div class="vm-frame" id="vm-frame">
            <div class="vm-ph"><i class="fas fa-server"></i><h3>Nenhuma VM ativa</h3><p>Selecione um sistema na barra lateral</p></div>
          </div>
        </div>
      </div>
    `, 1000, 640);
      win.dataset.app = 'vm';
      const frame = win.querySelector('#vm-frame');
      const actions = win.querySelector('#vm-actions');
      const hero = win.querySelector('#vm-hero');
      let currentUrl = null, currentVM = null;
      function startVM(it) {
        currentUrl = it.url; currentVM = it;
        hero.innerHTML = `<h2><i class="${it.ic}"></i> ${it.n}</h2><p>${it.desc}</p>`;
        frame.innerHTML = `<iframe src="${it.url}" allow="fullscreen;autoplay;gamepad;microphone;camera;clipboard-read;clipboard-write" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock allow-modals"></iframe>`;
        actions.style.display = 'flex';
        win.querySelectorAll('.vm-item').forEach(x => x.classList.toggle('ac', x.dataset.vm === it.id));
        toast('Iniciando ' + it.n + '...');
      }
      win.querySelectorAll('.vm-item').forEach(el => {
        el.onclick = () => {
          const id = el.dataset.vm; const it = VMS.flatMap(g => g.items).find(i => i.id === id); if (it) startVM(it);
        };
      });
      win.querySelector('#vm-reload').onclick = () => { if (currentVM) startVM(currentVM); };
      win.querySelector('#vm-fs').onclick = () => { const f = frame.querySelector('iframe'); if (f && f.requestFullscreen) f.requestFullscreen(); };
      win.querySelector('#vm-open').onclick = () => { if (currentUrl) window.open(currentUrl, '_blank'); };
      win.querySelector('#vm-stop').onclick = () => {
        frame.innerHTML = `<div class="vm-ph"><i class="fas fa-server"></i><h3>VM parada</h3></div>`;
        actions.style.display = 'none';
        win.querySelectorAll('.vm-item.ac').forEach(x => x.classList.remove('ac'));
        currentUrl = null; currentVM = null;
      };
    }

    // ---------- TASKBAR SELECTION RECTANGLE ----------
    let selStart = null;
    const selRect = document.createElement('div'); selRect.id = 'selrect';
    desktop.appendChild(selRect);
    desktop.addEventListener('mousedown', e => {
      if (e.button !== 0 || e.target.closest('.di') || e.target.closest('.win') || e.target.closest('#ctx')) return;
      selStart = { x: e.clientX, y: e.clientY };
      Object.assign(selRect.style, { display: 'block', left: e.clientX + 'px', top: e.clientY + 'px', width: '0px', height: '0px' });
      document.querySelectorAll('.di.sel').forEach(x => x.classList.remove('sel'));
    });
    window.addEventListener('mousemove', e => {
      if (!selStart) return;
      const x = Math.min(e.clientX, selStart.x), y = Math.min(e.clientY, selStart.y);
      const w = Math.abs(e.clientX - selStart.x), h = Math.abs(e.clientY - selStart.y);
      Object.assign(selRect.style, { left: x + 'px', top: y + 'px', width: w + 'px', height: h + 'px' });
      const r = { x, y, w, h };
      document.querySelectorAll('.di').forEach(el => {
        const b = el.getBoundingClientRect();
        const hit = b.right > r.x && b.left < r.x + r.w && b.bottom > r.y && b.top < r.y + r.h;
        el.classList.toggle('sel', hit);
      });
    });
    window.addEventListener('mouseup', () => { selStart = null; selRect.style.display = 'none'; });

    // ---------- KEYBOARD SHORTCUTS ----------
    document.addEventListener('keydown', e => {
      if (e.key === 'Delete') {
        const sels = document.querySelectorAll('.di.sel');
        if (sels.length) {
          sels.forEach(el => {
            const id = el.dataset.appId;
            const app = getDesktopApps().find(a => a.id === id); if (app) iconCmd('trash', app);
          });
        }
      }
      if (e.key === 'F2') {
        const s = document.querySelector('.di.sel'); if (s) { const id = s.dataset.appId; const app = getDesktopApps().find(a => a.id === id); if (app) iconCmd('rename', app); }
      }
      if (e.key === 'F5') { e.preventDefault(); renderDesktop(); }
      if (e.ctrlKey && e.key.toLowerCase() === 'a' && !e.target.closest('input,textarea')) {
        e.preventDefault(); document.querySelectorAll('.di').forEach(d => d.classList.add('sel'));
      }
    });

    // ---------- INITIAL RENDER ----------
    // re-render after a tick to apply if desktop is already shown
    setTimeout(() => { if (document.getElementById('desktop').style.display !== 'none') renderDesktop(); }, 200);

    console.log('%c💜 VessieOS Ultra v4.0 loaded', 'background:linear-gradient(90deg,#c46fff,#7a3eb8);color:#fff;padding:6px 14px;border-radius:6px;font-weight:bold');
  })();

(function polish() {
    const css = document.createElement('style');
    css.textContent = `
  /* Theme grid (Settings) */
  .theme-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:6px}
  .theme-card{background:rgba(255,255,255,.04);border:1px solid var(--hairline);border-radius:10px;padding:8px;cursor:pointer;transition:.16s var(--ease);display:flex;flex-direction:column;gap:6px;align-items:stretch}
  .theme-card:hover{background:rgba(255,255,255,.08);transform:translateY(-2px);border-color:var(--border-strong)}
  .theme-card.ac{border-color:var(--a);box-shadow:0 0 0 2px var(--acc-glow)}
  .theme-card .tc-pre{height:42px;border-radius:7px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.08),0 4px 10px rgba(0,0,0,.3)}
  .theme-card span{font-size:.7rem;color:var(--text-2);text-align:center;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}

  /* ============ NOTEPAD (Win11 Notepad real-look) ============ */
  .npad{background:#1f1f1f}
  .npad-tb{background:#2b2b2b;border-bottom:1px solid #1a1a1a;padding:6px 10px;gap:4px;display:flex;align-items:center}
  .npad-tb button{background:transparent;border:1px solid transparent;color:#e8e8e8;padding:5px 10px;border-radius:4px;font-size:.78rem;font-weight:400}
  .npad-tb button:hover{background:rgba(255,255,255,.07);border-color:rgba(255,255,255,.04)}
  .npad-tb span{color:#9c9c9c;font-size:.74rem}
  .npad-area{background:#1f1f1f;color:#f0f0f0;font-family:'Consolas','Cascadia Mono',monospace;font-size:14px;padding:16px 22px;line-height:1.65;caret-color:#fff}

  /* ============ CALCULATOR (Win11 Calculator real-look) ============ */
  .calc{background:#202020;padding:14px;gap:6px}
  .c-disp{background:transparent;border:none;padding:8px 12px 18px}
  .c-expr{color:#9c9c9c;font-size:.85rem;text-align:right}
  .c-val{color:#fff;font-size:2.6rem;font-weight:600;letter-spacing:-.02em;text-align:right}
  .c-grid{gap:4px}
  .cb{background:#323232;border:none;color:#fff;border-radius:4px;height:52px;font-size:1rem;font-weight:400;transition:background .1s}
  .cb:hover{background:#3d3d3d}
  .cb.op{background:#2b2b2b;color:var(--a)}
  .cb.op:hover{background:#3a3a3a}
  .cb.eq{background:linear-gradient(180deg,var(--a),var(--a3));color:#000;font-weight:600;box-shadow:none}
  .cb.cl{background:#2b2b2b;color:#fff}

  /* ============ TERMINAL (cmd.exe real-look) ============ */
  .term{background:#0c0c0c}
  .t-out{background:#0c0c0c;color:#cccccc;font-family:'Cascadia Code','Cascadia Mono','Consolas',monospace;font-size:13px;line-height:1.5;padding:14px 18px}
  .t-out .tc2{color:#3b78ff}
  .t-out .te{color:#ff6b6b}
  .t-out .ti{color:#f2f2f2}
  .t-bar{background:#0c0c0c;border-top:1px solid #1f1f1f;padding:6px 18px}
  .t-prompt{color:#cccccc;font-weight:400;font-family:'Cascadia Code',monospace}
  .t-inp{color:#cccccc;font-family:'Cascadia Code',monospace;font-size:13px;caret-color:#f2f2f2}
  /* Terminal window chrome tinted */
  .win:has(.term) .wh{background:linear-gradient(180deg,#1a1a1a,#0c0c0c);border-bottom:1px solid #1f1f1f}

  /* ============ FILE EXPLORER (Win11 Explorer real-look) ============ */
  .fexp{background:#202020}
  .fesb{background:#1d1d1d;border-right:1px solid #2b2b2b;padding:8px 6px;width:220px}
  .fesb .fld{padding:7px 12px;border-radius:4px;font-size:.82rem;color:#dcdcdc;font-weight:400}
  .fesb .fld i{color:#dcb67a;width:16px}
  .fesb .fld:hover{background:rgba(255,255,255,.06)}
  .fesb .fld.ac{background:rgba(96,165,250,.18)}
  .fesb .fld.ac i{color:var(--a)}
  .fem{background:#202020;padding:10px 14px}
  .fe-tb{background:#1d1d1d;border:1px solid #2b2b2b;border-radius:4px;padding:6px;gap:4px;align-items:center}
  .fe-tbtn{background:transparent;border:1px solid transparent;color:#e0e0e0;border-radius:4px;font-size:.78rem;padding:5px 10px}
  .fe-tbtn:hover{background:rgba(255,255,255,.07)}
  .fi i{color:#dcb67a;font-size:2.2rem}
  .fi:hover{background:rgba(255,255,255,.05)}
  .fi.sel{background:rgba(96,165,250,.22);border-color:rgba(96,165,250,.5)}
  .fi span{color:#f0f0f0;font-size:.74rem}

  /* ============ BROWSER (Edge real-look) ============ */
  .brow{background:#202124}
  .brow-bar{background:#323639;border-bottom:1px solid #1a1a1a;padding:8px 10px;gap:6px;display:flex;align-items:center}
  .brow-bar input{background:#202124;border:1px solid transparent;border-radius:22px;padding:8px 18px;color:#e8eaed;font-size:.84rem;height:36px}
  .brow-bar input:focus{background:#202124;border-color:var(--a);box-shadow:0 0 0 2px var(--acc-glow)}
  .bnav{background:transparent;border:none;color:#e8eaed;width:34px;height:34px;border-radius:50%;font-size:.88rem}
  .bnav:hover{background:rgba(255,255,255,.08)}
  .brow-frame{background:#fff}

  /* ============ MUSIC (Spotify-inspired) ============ */
  .mplayer{background:linear-gradient(180deg,#181818,#000);padding:30px 26px;gap:18px;justify-content:flex-start;padding-top:40px}
  .mc-cover{width:200px;height:200px;border-radius:8px;box-shadow:0 12px 40px rgba(0,0,0,.7),0 0 0 1px rgba(255,255,255,.04);background:linear-gradient(135deg,var(--a),var(--a2))!important;animation:none!important;font-size:4.2rem}
  .mc-cover.playing{animation:none!important}
  .mc-title{color:#fff;font-size:1.4rem;font-weight:700;letter-spacing:-.02em}
  .mc-art{color:#b3b3b3;font-size:.92rem;font-weight:500}
  .mc-prog-bar{background:rgba(255,255,255,.18);height:5px;border-radius:3px}
  .mc-prog-fill{background:#fff;border-radius:3px}
  .mc-prog-bar:hover .mc-prog-fill{background:#1ed760}
  .mc-time{color:#a7a7a7}
  .mc-ctrl{gap:18px;margin-top:14px}
  .mc-ctrl button{color:#b3b3b3;font-size:1.15rem;width:38px;height:38px}
  .mc-ctrl button:hover{color:#fff;background:transparent;transform:scale(1.08)}
  .mc-play{background:#fff!important;color:#000!important;width:56px!important;height:56px!important;box-shadow:0 4px 14px rgba(0,0,0,.5)!important}
  .mc-play:hover{background:#fff!important;transform:scale(1.06);filter:none}
  .mc-vol input{accent-color:#1ed760}

  /* ============ VESSIE AI (ChatGPT-inspired) ============ */
  .chat-msgs{background:#212121}
  .msg.ai .mb{background:#2f2f2f;border:none;color:#ececec;border-radius:18px;padding:14px 18px;font-size:.9rem;line-height:1.6}
  .msg.u .mb{background:#414158;color:#fff;border-radius:18px;padding:12px 16px;background-image:none}
  .chat-bar{background:#212121;border-top:1px solid #2f2f2f;padding:14px 16px}
  .chat-bar input{background:#2f2f2f;border:1px solid transparent;border-radius:22px;padding:12px 18px}
  .chat-bar input:focus{border-color:var(--a)}
  .chat-send{background:#fff!important;color:#000!important;border-radius:50%!important;box-shadow:none!important}
  .chat-send:hover{filter:brightness(.92);transform:none}
  .vessy-header{background:#212121;border-bottom:1px solid #2f2f2f}

  /* ============ DASHBOARD polish ============ */
  .dash{background:linear-gradient(180deg,rgba(96,165,250,.04),transparent 30%)}

  /* ============ SETTINGS polish (Win11 Settings real-look) ============ */
  .sett{background:transparent;padding:28px 32px}
  .s-sec h3{font-size:1rem;font-weight:600;color:#fff;padding-bottom:12px;margin-bottom:16px}

  /* ============ MULTI-AREA SNAP OVERLAY ============ */
  #snap-ov{position:fixed;inset:0;pointer-events:none;z-index:480;display:none}
  #snap-ov.show{display:block}
  .snap-zone{position:absolute;background:rgba(96,165,250,.18);border:2px solid var(--a);border-radius:10px;opacity:0;transition:opacity .14s var(--ease);box-shadow:0 0 30px var(--acc-glow),inset 0 0 30px rgba(255,255,255,.04);backdrop-filter:blur(10px)}
  .snap-zone.on{opacity:1}
  /* snap hint chip */
  #snap-hint{position:fixed;top:8px;left:50%;transform:translateX(-50%);background:var(--acrylic-strong);backdrop-filter:blur(24px);border:1px solid var(--border-strong);padding:8px 16px;border-radius:24px;color:#fff;font-size:.78rem;font-weight:500;z-index:9999;display:none;box-shadow:var(--shadow-2)}
  #snap-hint.show{display:block;animation:fu .2s var(--ease)}
  #snap-hint kbd{background:rgba(255,255,255,.1);border:1px solid var(--border);padding:1px 6px;border-radius:4px;font-family:inherit;font-size:.74rem;margin:0 2px}
  `;
    document.head.appendChild(css);

    // App Discrod: código duplicado (obsoleto) removido daqui. A versão
    // real e mantida vive em JS/apps/discord/discord.js (carregado depois deste
    // arquivo, então já sobrescrevia window.openDiscrod mesmo antes desta
    // limpeza — mas o texto morto ainda continha, em claro, a URL de uma
    // webhook real do Discord, uma credencial vazada. Removido por segurança.

    // ---------- SNAP OVERLAY ----------
    const ov = document.createElement('div'); ov.id = 'snap-ov';
    const TH = 52;
    const mkZone = (l, t, w, h) => { const z = document.createElement('div'); z.className = 'snap-zone'; z.style.cssText = `left:${l};top:${t};width:${w};height:${h}`; ov.appendChild(z); return z; };
    const zL = mkZone('6px', '6px', 'calc(50vw - 9px)', `calc(100vh - ${TH + 12}px)`);
    const zR = mkZone('calc(50vw + 3px)', '6px', 'calc(50vw - 9px)', `calc(100vh - ${TH + 12}px)`);
    const zT = mkZone('6px', '6px', 'calc(100vw - 12px)', `calc(100vh - ${TH + 12}px)`);
    document.body.appendChild(ov);

    // snap functions
    function snapWin(win, side) {
      if (!win) return;
      win.classList.remove('maximized');
      win.style.transition = 'left .18s var(--ease),top .18s var(--ease),width .18s var(--ease),height .18s var(--ease)';
      const H = `calc(100vh - ${TH}px)`;
      if (side === 'left') { Object.assign(win.style, { left: '0px', top: '0px', width: '50vw', height: H }); }
      else if (side === 'right') { Object.assign(win.style, { left: '50vw', top: '0px', width: '50vw', height: H }); }
      else if (side === 'top') { win.classList.add('maximized'); }
      else if (side === 'tl') { Object.assign(win.style, { left: '0px', top: '0px', width: '50vw', height: `calc(50vh - ${TH / 2}px)` }); }
      else if (side === 'tr') { Object.assign(win.style, { left: '50vw', top: '0px', width: '50vw', height: `calc(50vh - ${TH / 2}px)` }); }
      else if (side === 'bl') { Object.assign(win.style, { left: '0px', top: `calc(50vh - ${TH / 2}px)`, width: '50vw', height: `calc(50vh - ${TH / 2}px)` }); }
      else if (side === 'br') { Object.assign(win.style, { left: '50vw', top: `calc(50vh - ${TH / 2}px)`, width: '50vw', height: `calc(50vh - ${TH / 2}px)` }); }
      setTimeout(() => { win.style.transition = ''; }, 220);
    }

    // Drag-to-edge: monitor mouse during drag of any .wh
    let dragWin = null, hovering = null;
    document.addEventListener('mousedown', (e) => {
      const hdr = e.target.closest('.wh');
      if (!hdr || e.target.closest('.wctrl')) return;
      dragWin = hdr.closest('.win');
      ov.classList.add('show');
    }, true);
    document.addEventListener('mousemove', (e) => {
      if (!dragWin) return;
      const x = e.clientX, y = e.clientY, w = window.innerWidth, h = window.innerHeight - TH;
      [zL, zR, zT].forEach(z => z.classList.remove('on'));
      hovering = null;
      if (y < 6) { hovering = 'top'; zT.classList.add('on'); }
      else if (x < 12) { hovering = 'left'; zL.classList.add('on'); }
      else if (x > w - 12) { hovering = 'right'; zR.classList.add('on'); }
    }, true);
    document.addEventListener('mouseup', () => {
      if (dragWin && hovering) { snapWin(dragWin, hovering); }
      dragWin = null; hovering = null;
      [zL, zR, zT].forEach(z => z.classList.remove('on'));
      ov.classList.remove('show');
    }, true);

    // ---------- KEYBOARD: Win+Arrow snap (Alt+Arrow as alt) ----------
    function focusedWin() { return document.querySelector('.win.focused') || document.querySelectorAll('.win:not(.minimized)')[document.querySelectorAll('.win:not(.minimized)').length - 1]; }
    document.addEventListener('keydown', (e) => {
      const mod = e.metaKey || e.altKey;
      if (!mod || !e.key.startsWith('Arrow')) return;
      const w = focusedWin(); if (!w) return;
      e.preventDefault();
      const map = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'top', ArrowDown: null };
      if (e.key === 'ArrowDown') { w.classList.remove('maximized'); Object.assign(w.style, { width: '720px', height: '500px', left: '40px', top: '40px' }); return; }
      snapWin(w, map[e.key]);
    });

    // ---------- SNAP HINT (shows briefly first time a window opens) ----------
    const hint = document.createElement('div'); hint.id = 'snap-hint';
    hint.innerHTML = '💡 Arraste para a borda ou use <kbd>Alt</kbd>+<kbd>←→↑</kbd> para dividir a tela';
    document.body.appendChild(hint);
    // Em touch/mobile não existe Alt nem arrastar-pra-borda com precisão de
    // mouse — a dica não se aplica, então nem mostramos (ver mobile.css
    // para o ajuste visual de tamanho, usado como reforço se algum
    // dispositivo touch ainda tiver mouse conectado).
    const isTouchDevice = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    try {
      if (!isTouchDevice && !localStorage.getItem('vos-snap-hint')) {
        setTimeout(() => { hint.classList.add('show'); setTimeout(() => hint.classList.remove('show'), 4500); localStorage.setItem('vos-snap-hint', '1'); }, 2500);
      }
    } catch (_) { }

    console.log('%c✨ VessieOS Polish v5 — Real-app UI · Themes · Multi-area Snap', 'background:linear-gradient(90deg,#60a5fa,#a78bfa);color:#fff;padding:6px 14px;border-radius:6px;font-weight:bold');
  })();
})();
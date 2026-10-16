/**
 * VessieOmniKernel – Núcleo Onipresente do VessieOS (v2.0)
 * 
 * Integra todos os sistemas do VessieOS em um único ponto de controle,
 * oferecendo auto‑cura, detecção dinâmica de módulos, eventos em tempo real,
 * pipelines de execução, monitoramento contínuo e segurança.
 * 
 * @version 2.0.0
 * @author VessieOS Team
 */

class VessieOmniKernel {
    constructor(config = {}) {
        // Configuração com defaults
        this.config = {
            enableHotReload: config.enableHotReload ?? true,
            monitoringInterval: config.monitoringInterval ?? 5000,
            cacheExpiry: config.cacheExpiry ?? 3600000,
            enableAutoHeal: config.enableAutoHeal ?? true,
            corsProxy: config.corsProxy || 'https://cors-anywhere.herokuapp.com/',
            scriptFallback: config.scriptFallback || 'https://cdn.jsdelivr.net/npm/',
            logLevel: config.logLevel || 'info',
            maxLogs: config.maxLogs || 500,
            ...config
        };

        // Registro de sistemas (instâncias)
        this.systems = new Map();
        // Componentes reativos (UI, plug‑ins)
        this.components = new Map();
        // Eventos internos
        this.eventHandlers = new Map();
        // Métricas agregadas
        this.metrics = {
            uptime: 0,
            systemsLoaded: 0,
            processes: 0,
            memoryUsage: 0,
            events: 0,
            healedErrors: 0,
            logsCount: 0
        };
        // Logs centralizados
        this.logs = [];
        // Estado do kernel
        this.isIgniting = false;
        this.isRunning = false;
        this.startTime = null;
        // Registro de curas realizadas (para debug)
        this._healRegistry = new Map();
        // Referência para os intervalos
        this._monitorInterval = null;
        this._hotReloadInterval = null;
        // Sistema de arquivos virtual
        this._vfs = null;
        // AutoHealer interno
        this._autoHealer = null;

        // Ativa o auto‑healer se configurado
        if (this.config.enableAutoHeal) {
            this._initAutoHeal();
        }
    }

    // ================================================================
    //  AUTO‑CURA (Intercepta e corrige erros comuns)
    // ================================================================
    _initAutoHeal() {
        // 1. Erros de carregamento de script e imagem
        document.addEventListener('error', (e) => {
            const target = e.target;
            if (target.tagName === 'SCRIPT') {
                const src = target.src;
                if (src && !this._healRegistry.has(src)) {
                    this._healScript(src, target);
                }
            }
            if (target.tagName === 'IMG') {
                const src = target.src;
                if (src && !this._healRegistry.has(src)) {
                    this._healImage(src, target);
                }
            }
        }, true);

        // 2. Interceptação de fetch para corrigir CORS e file://
        const originalFetch = window.fetch;
        window.fetch = async (input, init) => {
            let url = typeof input === 'string' ? input : input.url;
            if (url.startsWith('file://')) {
                url = this._fixFileUrl(url);
            }
            if (this._needsCorsProxy(url)) {
                url = this.config.corsProxy + encodeURIComponent(url);
            }
            if (url.endsWith('.js') && !url.includes('cdn')) {
                const fallback = await this._tryScriptFallback(url);
                if (fallback) url = fallback;
            }
            return originalFetch.call(this, url, init);
        };

        // 3. Interceptação de XMLHttpRequest
        const XHR = window.XMLHttpRequest;
        const originalOpen = XHR.prototype.open;
        XHR.prototype.open = function (method, url, async, user, password) {
            let fixedUrl = url;
            if (typeof url === 'string') {
                if (url.startsWith('file://')) {
                    fixedUrl = this._fixFileUrl(url);
                }
                if (this._needsCorsProxy(fixedUrl)) {
                    fixedUrl = this.config.corsProxy + encodeURIComponent(fixedUrl);
                }
            }
            return originalOpen.call(this, method, fixedUrl, async !== false, user, password);
        }.bind(this);

        // 4. Observa mudanças no DOM para imagens dinâmicas
        this._observeDomForImages();

        this.log('🛠️ Módulo de auto‑cura ativado.', 'info');
    }

    _fixFileUrl(url) {
        // Converte file:///C:/... para caminho relativo
        const path = url.replace(/^file:\/\/\/[A-Z]:/i, '').replace(/\\/g, '/');
        return path.startsWith('/') ? path.slice(1) : path;
    }

    _needsCorsProxy(url) {
        if (!url || !url.startsWith('http')) return false;
        try {
            const u = new URL(url);
            if (u.origin !== window.location.origin &&
                !url.includes('cors-anywhere') &&
                !url.includes('allorigins')) {
                return true;
            }
        } catch (_) { /* ignora URLs inválidas */ }
        return false;
    }

    async _healScript(scriptEl, originalSrc) {
        this.log(`🔧 Curando script: ${originalSrc}`, 'warn');
        try {
            const fileName = originalSrc.split('/').pop();
            const cdnUrl = this.config.scriptFallback + fileName;
            const response = await fetch(cdnUrl, { mode: 'no-cors' });
            if (response.ok) {
                const newScript = document.createElement('script');
                newScript.src = cdnUrl;
                scriptEl.parentNode.replaceChild(newScript, scriptEl);
                this._healRegistry.set(originalSrc, { fixed: cdnUrl, method: 'cdn' });
                this.metrics.healedErrors++;
                this.log(`✅ Script curado via CDN: ${cdnUrl}`, 'success');
                return;
            }
            // Fallback: stub vazio
            const stub = this._generateStub(fileName);
            if (stub) {
                const newScript = document.createElement('script');
                newScript.textContent = stub;
                scriptEl.parentNode.replaceChild(newScript, scriptEl);
                this._healRegistry.set(originalSrc, { fixed: 'inline-stub', method: 'stub' });
                this.metrics.healedErrors++;
                this.log(`✅ Script substituído por stub inline.`, 'success');
            }
        } catch (e) {
            this.log(`❌ Falha ao curar script: ${e.message}`, 'error');
        }
    }

    _healImage(imgEl, originalSrc) {
        this.log(`🔧 Curando imagem: ${originalSrc}`, 'warn');
        const proxyUrl = this.config.corsProxy + encodeURIComponent(originalSrc);
        imgEl.src = proxyUrl;
        this._healRegistry.set(originalSrc, { fixed: proxyUrl, method: 'cors-proxy' });
        this.metrics.healedErrors++;
        this.log(`✅ Imagem curada via proxy CORS.`, 'success');
    }

    async _tryScriptFallback(url) {
        const fileName = url.split('/').pop();
        if (fileName) {
            const cdnUrl = this.config.scriptFallback + fileName;
            try {
                const res = await fetch(cdnUrl, { method: 'HEAD' });
                if (res.ok) return cdnUrl;
            } catch (_) { }
        }
        return null;
    }

    _generateStub(fileName) {
        const name = fileName.replace('.js', '');
        return `// Stub gerado para ${name}\nwindow.${name} = class ${name} {};`;
    }

    _observeDomForImages() {
        const observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
                if (m.type === 'attributes' && m.attributeName === 'src') {
                    const img = m.target;
                    if (img.tagName === 'IMG') {
                        const src = img.getAttribute('src');
                        if (src && this._needsCorsProxy(src) && !this._healRegistry.has(src)) {
                            this._healImage(img, src);
                        }
                    }
                }
            }
        });
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['src'],
            subtree: true
        });
    }

    // ================================================================
    //  INICIALIZAÇÃO PRINCIPAL (IGNITE)
    // ================================================================
    async ignite() {
        if (this.isIgniting) return;
        this.isIgniting = true;
        this.startTime = Date.now();

        this.log('🔥 Ignitando VessieOmniKernel...');
        this.log('═══════════════════════════════════════');

        try {
            // 1. Registrar sistemas internos (core)
            await this._registerCoreSystems();

            // 2. Detectar sistemas externos (window.VessieOS.*)
            await this._discoverExternalSystems();

            // 3. Inicializar cada sistema registrado
            for (const [name, system] of this.systems) {
                if (typeof system.init === 'function') {
                    await system.init();
                    this.log(`✓ Sistema inflamado: ${name}`);
                } else if (typeof system.boot === 'function') {
                    await system.boot();
                    this.log(`✓ Sistema inflamado (boot): ${name}`);
                }
            }

            // 4. Registrar módulos padrão via ModuleSystem
            await this._registerDefaultModules();

            // 5. Configurar monitoramento e hot‑reload
            if (this.config.enableHotReload) {
                this.startHotReload();
            }
            this.startRealTimeMonitoring();

            // 6. Iniciar AutoHealer (se disponível e não iniciado)
            this._startAutoHealer();

            this.isRunning = true;
            this.isIgniting = false;
            this.metrics.systemsLoaded = this.systems.size;

            this.log('═══════════════════════════════════════');
            this.log(`✨ OmniKernel em órbita! (${this.systems.size} sistemas ativos)`);
            this.emit('kernel:ready', { systems: this.listSystems() });

            return true;
        } catch (error) {
            this.log(`❌ Falha na ignição: ${error.message}`, 'error');
            this.isIgniting = false;
            throw error;
        }
    }

    // ----------------------------------------------------------------
    //  REGISTRO DE SISTEMAS INTERNOS (core)
    // ----------------------------------------------------------------
    async _registerCoreSystems() {
        // Responsive Renderer
        if (typeof ResponsiveRenderer !== 'undefined') {
            this.systems.set('responsive', new ResponsiveRenderer());
        }

        // Windows Executor
        if (typeof WindowsExecutor !== 'undefined') {
            const executor = new WindowsExecutor({
                timeout: 30000,
                maxConcurrent: 3
            });
            await executor.checkAvailability();
            this.systems.set('executor', executor);
        }

        // Module System
        if (typeof ModuleSystem !== 'undefined') {
            const modules = new ModuleSystem({ modulePath: './Module' });
            if (this.systems.has('executor')) {
                modules.setExecutor(this.systems.get('executor'));
            }
            this.systems.set('modules', modules);
        }

        // LM Studio AI
        if (typeof LMStudioIntegration !== 'undefined') {
            const ai = new LMStudioIntegration({
                host: 'http://localhost:1234'
            });
            await ai.checkConnection();
            this.systems.set('ai', ai);
        }

        // Game Hub Collector
        if (typeof GameHubCollector !== 'undefined') {
            this.systems.set('gameHub', new GameHubCollector());
        }

        // Web Content Fetcher
        if (typeof WebContentFetcher !== 'undefined') {
            this.systems.set('webFetcher', new WebContentFetcher());
        }

        // Kernel nativo (se existir)
        if (window.VessieOS?.kernel) {
            this.systems.set('nativeKernel', window.VessieOS.kernel);
        }

        // FileSystem
        if (window.VessieOS?.FileSystem) {
            this.systems.set('fileSystem', window.VessieOS.FileSystem);
            this._vfs = window.VessieOS.FileSystem;
        }

        // ProcessManager
        if (window.VessieOS?.ProcessManager) {
            this.systems.set('processManager', window.VessieOS.ProcessManager);
        }

        // Security
        if (window.VessieOS?.Security) {
            this.systems.set('security', window.VessieOS.Security);
        }

        // Logger
        if (window.VessieOS?.Logger) {
            this.systems.set('logger', window.VessieOS.Logger);
        }

        // Monitor
        if (window.VessieOS?.Monitor) {
            this.systems.set('monitor', window.VessieOS.Monitor);
        }

        // Registry
        if (window.VessieOS?.Registry) {
            this.systems.set('registry', window.VessieOS.Registry);
        }

        // Loader
        if (window.VessieOS?.Loader) {
            this.systems.set('loader', window.VessieOS.Loader);
        }
    }

    // ----------------------------------------------------------------
    //  DESCOBERTA DE SISTEMAS EXTERNOS
    // ----------------------------------------------------------------
    async _discoverExternalSystems() {
        const external = window.VessieOS || {};
        for (const key in external) {
            if (key === 'kernel' || key === 'Kernel') continue; // já registrado
            if (this.systems.has(key)) continue; // já registrado internamente
            const candidate = external[key];
            if (candidate && typeof candidate === 'object') {
                // Se for uma classe, instancia
                if (typeof candidate === 'function' && candidate.prototype) {
                    try {
                        const instance = new candidate();
                        if (!this.systems.has(key)) {
                            this.systems.set(key, instance);
                            this.log(`🔍 Sistema externo detectado: ${key}`);
                        }
                    } catch (_) {
                        if (!this.systems.has(key)) {
                            this.systems.set(key, candidate);
                            this.log(`🔍 Sistema externo (objeto) detectado: ${key}`);
                        }
                    }
                } else {
                    // Objeto literal
                    if (!this.systems.has(key)) {
                        this.systems.set(key, candidate);
                        this.log(`🔍 Sistema externo (objeto) detectado: ${key}`);
                    }
                }
            }
        }
    }

    // ----------------------------------------------------------------
    //  REGISTRO DE MÓDULOS PADRÃO
    // ----------------------------------------------------------------
    async _registerDefaultModules() {
        const modSys = this.systems.get('modules');
        if (!modSys || typeof modSys.registerModule !== 'function') return;

        // SystemManager (já existe no sistema de módulos, mas vamos registrar)
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

        // GameHub
        const gameHubModule = {
            name: 'GameHub',
            version: '1.0.0',
            dependencies: [],
            validate: () => this.systems.has('gameHub'),
            execute: async (context) => {
                const gh = this.systems.get('gameHub');
                if (!gh) throw new Error('GameHub not available');
                context.logger('Starting auto game collection...');
                const results = await gh.collectAll();
                const stats = gh.getStats();
                context.logger(`Games collected: ${stats.totalGames}`);
                return { success: true, stats };
            }
        };

        // AIEngine
        const aiModule = {
            name: 'AIEngine',
            version: '1.0.0',
            dependencies: [],
            validate: () => this.systems.has('ai'),
            execute: async (context) => {
                const ai = this.systems.get('ai');
                if (!ai) throw new Error('AI not available');
                context.logger('AI Engine ready');
                const status = ai.getStatus();
                context.logger(`Models: ${status.availableModels.length}`);
                return { success: true, status };
            }
        };

        // WebSystemGenerator
        const webModule = {
            name: 'WebSystemGenerator',
            version: '1.0.0',
            dependencies: [],
            validate: () => this.systems.has('webFetcher'),
            execute: async (context) => {
                const fetcher = this.systems.get('webFetcher');
                if (!fetcher) throw new Error('WebFetcher not available');
                context.logger('Generating web systems...');
                const topics = ['VessieOS Development', 'JavaScript Game Engines'];
                const results = [];
                for (const topic of topics) {
                    const system = await fetcher.generateSystem(topic);
                    results.push(system);
                }
                return { success: true, systems: results };
            }
        };

        try {
            modSys.registerModule('SystemManager', systemManager);
            modSys.registerModule('GameHub', gameHubModule);
            modSys.registerModule('AIEngine', aiModule);
            modSys.registerModule('WebSystemGenerator', webModule);
        } catch (error) {
            this.log(`Error registering modules: ${error.message}`, 'error');
        }
    }

    // ----------------------------------------------------------------
    //  AUTOHEALER INTEGRADO
    // ----------------------------------------------------------------
    _startAutoHealer() {
        if (window.VessieOS?.kernel?.AutoHealer) {
            try {
                const healer = window.VessieOS.kernel.AutoHealer;
                if (typeof healer.start === 'function') {
                    healer.start();
                    this._autoHealer = healer;
                    this.log('✅ AutoHealer iniciado com sucesso.', 'info');
                }
            } catch (e) {
                this.log(`Erro ao iniciar AutoHealer: ${e.message}`, 'error');
            }
        } else {
            // Fallback: criar um autohealer simples
            this._createSimpleAutoHealer();
        }
    }

    _createSimpleAutoHealer() {
        this._autoHealer = {
            checks: 0,
            fixes: 0,
            start: () => {
                this._autoHealer._interval = setInterval(() => {
                    this._autoHealer.checks++;
                    // Verifica memória do kernel
                    const mem = this.metrics.memoryUsage;
                    if (mem > 800) {
                        this.log('⚠️ Uso de memória alto, tentando limpeza...', 'warn');
                        if (window.gc) try { window.gc(); } catch (_) { }
                        this._autoHealer.fixes++;
                    }
                    // Verifica processos
                    const procCount = this.metrics.processes;
                    if (procCount > 50) {
                        this.log(`⚠️ Muitos processos (${procCount}), finalizando alguns...`, 'warn');
                        const k = this.systems.get('nativeKernel');
                        if (k && typeof k.listProcesses === 'function') {
                            const procs = k.listProcesses();
                            const toKill = procs.slice(0, Math.floor(procs.length * 0.3));
                            for (const p of toKill) {
                                if (p.pid !== 1 && typeof k.terminateProcess === 'function') {
                                    k.terminateProcess(p.pid);
                                }
                            }
                            this._autoHealer.fixes++;
                        }
                    }
                }, 10000);
                this.log('✅ AutoHealer simples iniciado.', 'info');
            },
            stop: () => {
                if (this._autoHealer._interval) {
                    clearInterval(this._autoHealer._interval);
                    this._autoHealer._interval = null;
                }
            },
            getStats: () => ({
                checks: this._autoHealer.checks,
                fixes: this._autoHealer.fixes
            })
        };
        this._autoHealer.start();
    }

    // ================================================================
    //  API PÚBLICA – SISTEMAS E COMPONENTES
    // ================================================================
    listSystems() {
        return Array.from(this.systems.keys());
    }

    getSystem(name) {
        return this.systems.get(name) || null;
    }

    searchSystems(query) {
        const q = query.toLowerCase();
        const results = [];
        for (const [name, system] of this.systems) {
            if (name.toLowerCase().includes(q)) {
                results.push({ name, system, match: 'name' });
                continue;
            }
            const meta = system?.metadata || system?.config || {};
            const desc = meta.description || meta.name || '';
            if (desc.toLowerCase().includes(q)) {
                results.push({ name, system, match: 'description' });
            }
        }
        return results;
    }

    registerComponent(name, component) {
        if (!component || typeof component !== 'object') {
            throw new Error('Componente inválido');
        }
        this.components.set(name, component);
        if (typeof component.mount === 'function') {
            component.mount(this);
        }
        this.emit('component:registered', { name, component });
        return this;
    }

    getComponent(name) {
        return this.components.get(name) || null;
    }

    // ================================================================
    //  SISTEMA DE EVENTOS
    // ================================================================
    on(event, callback) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, []);
        }
        this.eventHandlers.get(event).push(callback);
        return this;
    }

    off(event, callback) {
        if (!this.eventHandlers.has(event)) return;
        const handlers = this.eventHandlers.get(event);
        const idx = handlers.indexOf(callback);
        if (idx !== -1) handlers.splice(idx, 1);
        return this;
    }

    emit(event, data) {
        this.metrics.events++;
        const handlers = this.eventHandlers.get(event) || [];
        for (const fn of handlers) {
            try {
                fn(data, event);
            } catch (e) {
                this.log(`Erro no handler do evento ${event}: ${e.message}`, 'error');
            }
        }
        // Dispara evento DOM para integração com a UI
        document.dispatchEvent(new CustomEvent(`kernel:${event}`, { detail: data }));
    }

    // ================================================================
    //  MONITORAMENTO EM TEMPO REAL
    // ================================================================
    startRealTimeMonitoring() {
        if (this._monitorInterval) return;
        this._monitorInterval = setInterval(() => {
            this._collectMetrics();
            this.emit('monitor:tick', this.metrics);
        }, this.config.monitoringInterval);
        this.log('📊 Monitoramento em tempo real ativado.');
    }

    stopRealTimeMonitoring() {
        if (this._monitorInterval) {
            clearInterval(this._monitorInterval);
            this._monitorInterval = null;
            this.log('⏹ Monitoramento parado.');
        }
    }

    _collectMetrics() {
        this.metrics.uptime = Date.now() - this.startTime;
        let totalProcesses = 0;
        let totalMemory = 0;

        // Coleta de processos via executor
        const exec = this.systems.get('executor');
        if (exec && typeof exec.getQueueStatus === 'function') {
            const q = exec.getQueueStatus();
            totalProcesses += q.runningProcesses || 0;
        }

        // Módulos
        const mod = this.systems.get('modules');
        if (mod && typeof mod.listModules === 'function') {
            totalProcesses += mod.listModules().length;
        }

        // Kernel nativo
        const k = this.systems.get('nativeKernel');
        if (k) {
            if (typeof k.listProcesses === 'function') {
                totalProcesses += k.listProcesses().length;
            }
            if (k.health && typeof k.health === 'function') {
                const h = k.health();
                if (h.memory) totalMemory = h.memory.used || 0;
            }
        }

        // ProcessManager
        const pm = this.systems.get('processManager');
        if (pm && typeof pm.list === 'function') {
            const procs = pm.list();
            totalProcesses += procs.length;
        }

        this.metrics.processes = totalProcesses;
        this.metrics.memoryUsage = totalMemory;
        this.metrics.logsCount = this.logs.length;
    }

    // ================================================================
    //  HOT‑RELOAD (detecção de novos sistemas)
    // ================================================================
    startHotReload() {
        if (this._hotReloadInterval) return;
        this._hotReloadInterval = setInterval(async () => {
            await this._discoverExternalSystems();
            // Também recarrega módulos se possível
            const modSys = this.systems.get('modules');
            if (modSys && typeof modSys.loadModulesFromFS === 'function') {
                try {
                    await modSys.loadModulesFromFS();
                } catch (_) { }
            }
        }, 10000);
        this.log('🔄 Hot‑reload ativado (varredura a cada 10s).');
    }

    stopHotReload() {
        if (this._hotReloadInterval) {
            clearInterval(this._hotReloadInterval);
            this._hotReloadInterval = null;
            this.log('⏹ Hot‑reload desativado.');
        }
    }

    // ================================================================
    //  EXECUÇÃO DE PIPELINES
    // ================================================================
    async runPipeline(name, moduleNames) {
        if (!this.systems.has('modules')) {
            throw new Error('ModuleSystem não disponível');
        }
        const modSys = this.systems.get('modules');
        if (typeof modSys.createPipeline !== 'function') {
            throw new Error('ModuleSystem não suporta pipelines');
        }
        const pipeline = modSys.createPipeline(name, moduleNames);
        return await modSys.executePipeline(modSys.pipelines.length - 1, true);
    }

    // ================================================================
    //  SISTEMA DE ARQUIVOS VIRTUAL
    // ================================================================
    getVFS() {
        return this._vfs || this.systems.get('fileSystem') || null;
    }

    // ================================================================
    //  LOGGING CENTRALIZADO
    // ================================================================
    log(message, level = 'info') {
        // Filtra por nível
        const levels = { debug: 0, info: 1, warn: 2, error: 3 };
        if (levels[level] < levels[this.config.logLevel]) return;

        const entry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            source: 'OmniKernel'
        };
        this.logs.unshift(entry);
        if (this.logs.length > this.config.maxLogs) this.logs.pop();
        console.log(`[${level.toUpperCase()}] ${message}`);
        this.emit('log', entry);
    }

    getLogs(limit = 50) {
        return this.logs.slice(0, limit);
    }

    // ================================================================
    //  MÉTRICAS E SNAPSHOT
    // ================================================================
    getMetrics() {
        return { ...this.metrics };
    }

    snapshot() {
        return {
            status: this.isRunning ? 'orbital' : 'offline',
            uptime: Date.now() - this.startTime,
            systems: this.listSystems(),
            components: Array.from(this.components.keys()),
            metrics: this.getMetrics(),
            healedErrors: this.metrics.healedErrors,
            healRegistry: Array.from(this._healRegistry.entries()),
            logs: this.getLogs(10),
            autoHealer: this._autoHealer ? this._autoHealer.getStats() : null,
            vfs: this._vfs ? 'available' : 'unavailable'
        };
    }

    // ================================================================
    //  SEGURANÇA
    // ================================================================
    validateModule(name, payload) {
        const sec = this.systems.get('security');
        if (sec && typeof sec.validateModule === 'function') {
            return sec.validateModule(name, payload);
        }
        // Fallback
        if (!name || typeof name !== 'string') return { ok: false, reason: 'Invalid module name.' };
        if (!payload || typeof payload !== 'object') return { ok: false, reason: 'Module payload is invalid.' };
        return { ok: true };
    }

    validateExecutable(name) {
        const sec = this.systems.get('security');
        if (sec && typeof sec.validateExecutable === 'function') {
            return sec.validateExecutable(name);
        }
        // Fallback
        const safe = typeof name === 'string' ? name.trim() : '';
        if (!safe) return { ok: false, reason: 'Executable name is required.' };
        if (/[^a-zA-Z0-9_.\- ]/.test(safe)) return { ok: false, reason: 'Executable contains invalid characters.' };
        return { ok: true, value: safe };
    }

    // ================================================================
    //  LOADER
    // ================================================================
    loadExecutable(executable) {
        const loader = this.systems.get('loader');
        if (loader && typeof loader.loadExecutable === 'function') {
            return loader.loadExecutable(executable);
        }
        // Fallback: carrega via kernel nativo
        const k = this.systems.get('nativeKernel');
        if (k && typeof k.createProcess === 'function') {
            const validation = this.validateExecutable(executable && executable.name);
            if (!validation.ok) {
                throw new Error(validation.reason || 'Executable is not valid.');
            }
            return k.createProcess({
                name: executable.name,
                path: executable.path || `C:/Executables/${executable.name}.exe`,
                memory: executable.memory || 64,
                owner: executable.owner || 'user',
                cpu: executable.cpu || 3,
                metadata: executable.metadata || {}
            });
        }
        throw new Error('Loader não disponível');
    }

    // ================================================================
    //  SHUTDOWN
    // ================================================================
    async shutdown() {
        this.log('🛑 Encerrando OmniKernel...');
        this.stopRealTimeMonitoring();
        this.stopHotReload();

        // Para o AutoHealer
        if (this._autoHealer && typeof this._autoHealer.stop === 'function') {
            this._autoHealer.stop();
        }

        for (const [name, system] of this.systems) {
            if (typeof system.destroy === 'function') {
                try {
                    await system.destroy();
                    this.log(`Sistema ${name} destruído.`);
                } catch (e) {
                    this.log(`Erro ao destruir ${name}: ${e.message}`, 'error');
                }
            } else if (typeof system.shutdown === 'function') {
                try {
                    await system.shutdown();
                    this.log(`Sistema ${name} desligado.`);
                } catch (e) {
                    this.log(`Erro ao desligar ${name}: ${e.message}`, 'error');
                }
            }
        }

        this.systems.clear();
        this.components.clear();
        this.eventHandlers.clear();
        this.isRunning = false;
        this.emit('kernel:shutdown', {});
        this.log('✅ Kernel desligado.');
    }
}

// ================================================================
//  EXPOSIÇÃO GLOBAL
// ================================================================
if (typeof window !== 'undefined') {
    window.VessieOmniKernel = VessieOmniKernel;
    // Instância única global (opcional)
    if (!window.__vessieOmni) {
        window.__vessieOmni = new VessieOmniKernel();
    }
}

// Export para Node.js (caso seja usado em bundlers)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VessieOmniKernel;
}
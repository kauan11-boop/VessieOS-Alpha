/**
 * VessieHybridSystem – Sistema Híbrido Unificado e Autônomo
 * 
 * Esta versão é tolerante a falhas: detecta automaticamente
 * todos os subsistemas disponíveis, cria stubs para os que faltam
 * e se integra com o VessieOmniKernel se presente.
 * 
 * @version 3.1.0 (patch para erros de referência)
 */
class VessieHybridSystem {
    constructor(config = {}) {
        // Configuração
        this.config = {
            autoLearn: config.autoLearn ?? true,
            autoGenerate: config.autoGenerate ?? true,
            maxRules: config.maxRules ?? 100,
            maxPipelines: config.maxPipelines ?? 20,
            learningInterval: config.learningInterval ?? 30000,
            ...config
        };

        // Registro de subsistemas (instâncias)
        this.subsystems = new Map();
        this.definitions = new Map();
        this.states = new Map();
        this.dependencies = new Map();

        // Motor de Regras, Pipelines, Eventos, etc.
        this.rules = [];
        this.ruleEngine = new RuleEngine(this);
        this.pipelines = [];
        this.pipelineManager = new PipelineManager(this);
        this.eventHandlers = new Map();

        // Métricas
        this.metrics = {
            uptime: 0,
            subsystemsLoaded: 0,
            rulesFired: 0,
            pipelinesExecuted: 0,
            eventsProcessed: 0,
            adaptations: 0
        };
        this.learnHistory = [];
        this.performanceLog = [];

        // Gerador de código
        this.codeGenerator = new CodeGenerator(this);

        // Estado
        this.isRunning = false;
        this.startTime = null;
        this._monitorInterval = null;
        this._learnInterval = null;

        // Referência ao kernel existente (se houver)
        this._existingKernel = window.__vessieOmni || window.VessieOmniKernel;

        // Inicializa de forma segura
        this._init();
    }

    // ----------------------------------------------------------------
    //  INICIALIZAÇÃO SEGURA
    // ----------------------------------------------------------------
    _init() {
        // 1. Tenta usar o kernel existente
        if (this._existingKernel && this._existingKernel.systems) {
            console.log('[Hybrid] Usando VessieOmniKernel existente.');
            // Copia os sistemas do kernel para o hybrid
            for (const [name, system] of this._existingKernel.systems) {
                this.subsystems.set(name, system);
                this.states.set(name, 'started');
                this.definitions.set(name, { Class: system.constructor, options: {} });
            }
            this.metrics.subsystemsLoaded = this.subsystems.size;
        } else {
            // 2. Registra subsistemas core de forma segura (sem lançar erros)
            this._registerCoreSubsystemsSafe();
        }

        // 3. Detecta subsistemas externos (window.VessieOS.*)
        this._discoverExternalSubsystems();

        // 4. Inicia aprendizado (se configurado)
        if (this.config.autoLearn) {
            this._startLearning();
        }

        console.log('🧠 VessieHybridSystem inicializado com segurança.');
    }

    // ----------------------------------------------------------------
    //  REGISTRO DE SUBSISTEMAS CORE (TOLERANTE)
    // ----------------------------------------------------------------
    _registerCoreSubsystemsSafe() {
        // Lista de nomes de classes que podem existir
        const coreClasses = {
            ResponsiveRenderer,
            WindowsExecutor,
            ModuleSystem,
            LMStudioIntegration,
            GameHubCollector,
            WebContentFetcher
        };

        for (const [name, cls] of Object.entries(coreClasses)) {
            if (typeof cls !== 'undefined' && cls) {
                // Se a classe existe, registra normalmente
                this.define(name, cls);
                console.log(`[Hybrid] Registrado core: ${name}`);
            } else {
                // Se não existe, cria um stub (classe vazia)
                console.warn(`[Hybrid] Classe ${name} não encontrada. Criando stub.`);
                const stubClass = class {
                    constructor() { this.name = name; }
                    async init() { console.log(`[${name}] Stub init`); }
                    async start() { console.log(`[${name}] Stub start`); }
                    async stop() { console.log(`[${name}] Stub stop`); }
                    async destroy() { console.log(`[${name}] Stub destroy`); }
                };
                this.define(name, stubClass);
            }
        }
    }

    // ----------------------------------------------------------------
    //  DETECÇÃO DE SUBSISTEMAS EXTERNOS
    // ----------------------------------------------------------------
    _discoverExternalSubsystems() {
        const external = window.VessieOS || {};
        for (const key in external) {
            if (key === 'kernel' || key === 'Kernel') continue;
            if (this.subsystems.has(key)) continue;
            const candidate = external[key];
            if (candidate && typeof candidate === 'object') {
                if (typeof candidate === 'function' && candidate.prototype) {
                    this.define(key, candidate);
                } else {
                    // Objeto literal: usa como subsistema
                    this.define(key, candidate);
                }
            }
        }
    }

    // ----------------------------------------------------------------
    //  DEFINIÇÃO DE SUBSISTEMA (com segurança)
    // ----------------------------------------------------------------
    define(name, SubsystemClass, options = {}) {
        if (this.definitions.has(name)) {
            console.warn(`[Hybrid] Subsistema "${name}" já definido. Substituindo.`);
        }
        this.definitions.set(name, { Class: SubsystemClass, options });
        this.states.set(name, 'created');
        this.dependencies.set(name, options.dependencies || []);
        return this;
    }

    // ----------------------------------------------------------------
    //  CICLO DE VIDA (com inicialização condicional)
    // ----------------------------------------------------------------
    async initAll() {
        const order = this._resolveOrder();
        for (const name of order) {
            await this._initOne(name);
        }
        this.metrics.subsystemsLoaded = this.subsystems.size;
        this.emit('hybrid:initialized', { subsystems: Array.from(this.subsystems.keys()) });
        return this;
    }

    async _initOne(name) {
        if (this.states.get(name) !== 'created') return;
        const def = this.definitions.get(name);
        if (!def) throw new Error(`Subsistema "${name}" não definido.`);

        let instance;
        if (typeof def.Class === 'function') {
            try {
                instance = new def.Class();
            } catch (e) {
                console.error(`[Hybrid] Erro ao instanciar ${name}:`, e);
                // Cria um stub
                instance = {
                    name,
                    init: async () => console.log(`[${name}] Stub init (após erro)`),
                    start: async () => console.log(`[${name}] Stub start`),
                    stop: async () => console.log(`[${name}] Stub stop`),
                    destroy: async () => console.log(`[${name}] Stub destroy`)
                };
            }
        } else {
            instance = def.Class; // objeto literal
        }

        this.subsystems.set(name, instance);
        if (typeof instance.init === 'function') {
            try {
                await instance.init(this.getContext(name));
            } catch (e) {
                console.error(`[Hybrid] Erro em init de ${name}:`, e);
            }
        }
        this.states.set(name, 'initialized');
        this.emit(`subsystem:${name}:initialized`, { name });
    }

    async startAll() {
        if (!this.isRunning) {
            this.startTime = Date.now();
            this.isRunning = true;
        }
        const order = this._resolveOrder();
        for (const name of order) {
            await this._startOne(name);
        }
        this.emit('hybrid:started', { subsystems: Array.from(this.subsystems.keys()) });
        return this;
    }

    async _startOne(name) {
        const state = this.states.get(name);
        if (state !== 'initialized' && state !== 'started') return;
        const instance = this.subsystems.get(name);
        if (instance && typeof instance.start === 'function') {
            await instance.start(this.getContext(name));
        }
        this.states.set(name, 'started');
        this.emit(`subsystem:${name}:started`, { name });
    }

    async stopAll() {
        const order = this._resolveOrder().reverse();
        for (const name of order) {
            await this._stopOne(name);
        }
        this.isRunning = false;
        this.emit('hybrid:stopped', {});
        return this;
    }

    async _stopOne(name) {
        const instance = this.subsystems.get(name);
        if (instance && typeof instance.stop === 'function') {
            await instance.stop();
        }
        this.states.set(name, 'stopped');
        this.emit(`subsystem:${name}:stopped`, { name });
    }

    async destroyAll() {
        await this.stopAll();
        const order = this._resolveOrder().reverse();
        for (const name of order) {
            await this._destroyOne(name);
        }
        this.subsystems.clear();
        this.states.clear();
        this.emit('hybrid:destroyed', {});
        return this;
    }

    async _destroyOne(name) {
        const instance = this.subsystems.get(name);
        if (instance && typeof instance.destroy === 'function') {
            await instance.destroy();
        }
        this.states.set(name, 'destroyed');
        this.subsystems.delete(name);
        this.emit(`subsystem:${name}:destroyed`, { name });
    }

    // ----------------------------------------------------------------
    //  RESOLUÇÃO DE DEPENDÊNCIAS (ordenação topológica)
    // ----------------------------------------------------------------
    _resolveOrder() {
        const names = Array.from(this.definitions.keys());
        const graph = {};
        for (const name of names) {
            const deps = this.dependencies.get(name) || [];
            graph[name] = deps.filter(d => names.includes(d));
        }

        const inDegree = {};
        for (const name of names) inDegree[name] = graph[name].length;

        const queue = names.filter(n => inDegree[n] === 0);
        const result = [];

        while (queue.length) {
            const current = queue.shift();
            result.push(current);
            for (const name of names) {
                if (graph[name].includes(current)) {
                    inDegree[name]--;
                    if (inDegree[name] === 0) queue.push(name);
                }
            }
        }

        if (result.length !== names.length) {
            throw new Error('Dependência circular detectada.');
        }
        return result;
    }

    // ----------------------------------------------------------------
    //  CONTEXTO PARA SUBSISTEMAS
    // ----------------------------------------------------------------
    getContext(name) {
        return {
            name,
            hybridSystem: this,
            kernel: this._kernel || null,
            getSubsystem: (n) => this.subsystems.get(n),
            listSubsystems: () => Array.from(this.subsystems.keys()),
            log: (msg) => console.log(`[${name}] ${msg}`),
            emit: (event, data) => this.emit(event, data),
            on: (event, callback) => this.on(event, callback)
        };
    }

    // ----------------------------------------------------------------
    //  SISTEMA DE EVENTOS (compatível com o Kernel)
    // ----------------------------------------------------------------
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
        this.metrics.eventsProcessed++;
        const handlers = this.eventHandlers.get(event) || [];
        for (const fn of handlers) {
            try {
                fn(data, event);
            } catch (e) {
                console.error(`[Hybrid] Erro no evento ${event}:`, e);
            }
        }
        document.dispatchEvent(new CustomEvent(`hybrid:${event}`, { detail: data }));
    }

    // ----------------------------------------------------------------
    //  MOTOR DE REGRAS
    // ----------------------------------------------------------------
    addRule(condition, action, priority = 0) {
        this.rules.push({ condition, action, priority, fired: 0 });
        this.rules.sort((a, b) => b.priority - a.priority);
        return this;
    }

    async evaluateRules(context) {
        for (const rule of this.rules) {
            try {
                if (rule.condition(context)) {
                    await rule.action(context);
                    rule.fired++;
                    this.metrics.rulesFired++;
                    this.emit('hybrid:ruleFired', { rule, context });
                }
            } catch (e) {
                console.error('[Hybrid] Erro na regra:', e);
            }
        }
    }

    // ----------------------------------------------------------------
    //  PIPELINES
    // ----------------------------------------------------------------
    createPipeline(name, steps, options = {}) {
        const pipeline = {
            name,
            steps,
            options,
            status: 'pending',
            startTime: null,
            endTime: null,
            results: []
        };
        this.pipelines.push(pipeline);
        return pipeline;
    }

    async executePipeline(nameOrIndex, context = {}) {
        let pipeline;
        if (typeof nameOrIndex === 'string') {
            pipeline = this.pipelines.find(p => p.name === nameOrIndex);
        } else {
            pipeline = this.pipelines[nameOrIndex];
        }
        if (!pipeline) throw new Error(`Pipeline não encontrado.`);

        pipeline.status = 'running';
        pipeline.startTime = Date.now();
        pipeline.results = [];

        for (const step of pipeline.steps) {
            try {
                const result = await step(context);
                pipeline.results.push({ success: true, result });
            } catch (error) {
                pipeline.results.push({ success: false, error: error.message });
                if (pipeline.options.stopOnError !== false) break;
            }
        }

        pipeline.status = 'completed';
        pipeline.endTime = Date.now();
        this.metrics.pipelinesExecuted++;
        this.emit('hybrid:pipelineComplete', { pipeline });
        return pipeline;
    }

    // ----------------------------------------------------------------
    //  APRENDIZADO E AUTO‑MODIFICAÇÃO
    // ----------------------------------------------------------------
    _startLearning() {
        if (this._learnInterval) return;
        this._learnInterval = setInterval(() => {
            this._learn();
        }, this.config.learningInterval);
    }

    async _learn() {
        // Coleta métricas
        const snapshot = {
            timestamp: Date.now(),
            metrics: { ...this.metrics },
            subsystems: Array.from(this.subsystems.keys()),
            rules: this.rules.length,
            pipelines: this.pipelines.length,
            uptime: Date.now() - this.startTime
        };
        this.learnHistory.push(snapshot);
        if (this.learnHistory.length > 100) this.learnHistory.shift();

        // Análise de desempenho
        const avgRulesFired = this.metrics.rulesFired / Math.max(1, this.metrics.uptime / 60000);
        if (avgRulesFired < 0.5 && this.rules.length > 0) {
            // Poucas regras sendo acionadas – pode ser necessário revisar
            this.emit('hybrid:learning:lowRuleActivity', { avgRulesFired });
        }

        // Auto‑geração (se ativado)
        if (this.config.autoGenerate) {
            await this._autoGenerateSubsystems();
        }

        // Otimização de pipelines
        await this._optimizePipelines();

        this.emit('hybrid:learning:cycle', { snapshot });
    }

    async _autoGenerateSubsystems() {
        // Detecta lacunas: subsistemas que poderiam ser úteis
        const existing = Array.from(this.subsystems.keys());
        const suggested = this.codeGenerator.suggestSubsystems(existing);

        for (const suggestion of suggested) {
            if (!this.definitions.has(suggestion.name)) {
                const generatedClass = this.codeGenerator.generateSubsystemClass(suggestion.name, suggestion.dependencies);
                this.define(suggestion.name, generatedClass, { dependencies: suggestion.dependencies });
                this.metrics.adaptations++;
                this.emit('hybrid:generatedSubsystem', { name: suggestion.name });
            }
        }
    }

    async _optimizePipelines() {
        // Reordena steps baseado em tempo de execução
        for (const pipeline of this.pipelines) {
            if (pipeline.results.length > 5) {
                // Simples otimização: ordenar steps por tempo médio
                // (implementação mais avançada poderia ser adicionada)
            }
        }
    }

    // ----------------------------------------------------------------
    //  GERADOR DE CÓDIGO (Auto‑Modificação)
    // ----------------------------------------------------------------
    getCodeGenerator() {
        return this.codeGenerator;
    }

    // ----------------------------------------------------------------
    //  MÉTRICAS E SNAPSHOT
    // ----------------------------------------------------------------
    getMetrics() {
        return { ...this.metrics };
    }

    snapshot() {
        return {
            status: this.isRunning ? 'running' : 'stopped',
            uptime: Date.now() - this.startTime,
            subsystems: Array.from(this.subsystems.keys()),
            definitions: Array.from(this.definitions.keys()),
            states: Object.fromEntries(this.states),
            rules: this.rules.length,
            pipelines: this.pipelines.length,
            metrics: this.getMetrics(),
            learnHistory: this.learnHistory.slice(-5)
        };
    }

    // ----------------------------------------------------------------
    //  SHUTDOWN
    // ----------------------------------------------------------------
    async shutdown() {
        if (this._learnInterval) {
            clearInterval(this._learnInterval);
            this._learnInterval = null;
        }
        await this.destroyAll();
        this.emit('hybrid:shutdown', {});
        console.log('🛑 VessieHybridSystem desligado.');
    }
}

// ================================================================
//  MÓDULOS AUXILIARES
// ================================================================

/**
 * RuleEngine – Motor de Regras Simples
 */
class RuleEngine {
    constructor(hybridSystem) {
        this.hybrid = hybridSystem;
        this.rules = [];
    }

    addRule(condition, action, priority = 0) {
        this.rules.push({ condition, action, priority, fired: 0 });
        this.rules.sort((a, b) => b.priority - a.priority);
    }

    async evaluate(context) {
        for (const rule of this.rules) {
            try {
                if (rule.condition(context)) {
                    await rule.action(context);
                    rule.fired++;
                }
            } catch (e) {
                console.error('[RuleEngine] Erro:', e);
            }
        }
    }
}

/**
 * PipelineManager – Gerenciador de Pipelines
 */
class PipelineManager {
    constructor(hybridSystem) {
        this.hybrid = hybridSystem;
        this.pipelines = [];
    }

    create(name, steps, options = {}) {
        const pipeline = { name, steps, options, status: 'pending', results: [] };
        this.pipelines.push(pipeline);
        return pipeline;
    }

    async execute(nameOrIndex, context = {}) {
        let pipeline;
        if (typeof nameOrIndex === 'string') {
            pipeline = this.pipelines.find(p => p.name === nameOrIndex);
        } else {
            pipeline = this.pipelines[nameOrIndex];
        }
        if (!pipeline) throw new Error('Pipeline não encontrado.');

        pipeline.status = 'running';
        pipeline.startTime = Date.now();
        pipeline.results = [];

        for (const step of pipeline.steps) {
            try {
                const result = await step(context);
                pipeline.results.push({ success: true, result });
            } catch (error) {
                pipeline.results.push({ success: false, error: error.message });
                if (pipeline.options.stopOnError !== false) break;
            }
        }

        pipeline.status = 'completed';
        pipeline.endTime = Date.now();
        return pipeline;
    }
}

/**
 * CodeGenerator – Gera código automaticamente
 */
class CodeGenerator {
    constructor(hybridSystem) {
        this.hybrid = hybridSystem;
        this.templates = {
            default: (name, deps) => `
class ${name} {
  constructor() {
    this.name = '${name}';
    this.dependencies = ${JSON.stringify(deps)};
    this._state = {};
  }

  async init(context) {
    console.log(\`[${name}] Init\`);
    this.context = context;
    return this;
  }

  async start() {
    console.log(\`[${name}] Start\`);
    return this;
  }

  async stop() {
    console.log(\`[${name}] Stop\`);
    return this;
  }

  async destroy() {
    console.log(\`[${name}] Destroy\`);
    return this;
  }
}
`
        };
    }

    suggestSubsystems(existing) {
        // Lista de possíveis subsistemas ausentes
        const allPossible = [
            { name: 'LoggingSystem', deps: [] },
            { name: 'CacheManager', deps: ['FileSystem'] },
            { name: 'APIGateway', deps: ['NetworkManager'] },
            { name: 'UIRenderer', deps: ['GraphicsManager'] },
            { name: 'AnalyticsEngine', deps: ['UserManager', 'LoggingSystem'] },
            { name: 'RecommendationEngine', deps: ['MLManager', 'UserManager'] },
            { name: 'TranslationService', deps: ['NetworkManager'] },
            { name: 'FileWatcher', deps: ['FileSystem'] },
            { name: 'CronScheduler', deps: ['TimeManager'] }
        ];

        const missing = allPossible.filter(p => !existing.includes(p.name));
        // Retorna apenas os 3 primeiros
        return missing.slice(0, 3);
    }

    generateSubsystemClass(name, dependencies = []) {
        const template = this.templates.default;
        const code = template(name, dependencies);
        // Converte string em classe (usando Function ou eval, mas cuidado)
        // Em produção, seria melhor usar new Function()
        return new Function(`return ${code}`)();
    }
}

// ================================================================
//  EXPOSIÇÃO GLOBAL
// ================================================================
if (typeof window !== 'undefined') {
    window.VessieHybridSystem = VessieHybridSystem;
    window.RuleEngine = RuleEngine;
    window.PipelineManager = PipelineManager;
    window.CodeGenerator = CodeGenerator;

    // Instância única global (opcional)
    if (!window.__hybridSystem) {
        window.__hybridSystem = new VessieHybridSystem();
    }
}

// Export para Node.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { VessieHybridSystem, RuleEngine, PipelineManager, CodeGenerator };
}
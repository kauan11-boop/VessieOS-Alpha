/**
 * VessieOS Subsystem Manager
 * 
 * Permite criar, registrar e gerenciar múltiplos subsistemas com ciclo de vida,
 * comunicação e dependências. Cada subsistema é uma classe que implementa
 * os métodos: init(), start(), stop(), destroy().
 * 
 * Exemplo de uso:
 * 
 * const manager = new SubsystemManager();
 * manager.register('meuSubsistema', MeuSubsistema, { dependencias: ['outro'] });
 * await manager.initAll();
 * await manager.startAll();
 * 
 * @version 1.0.0
 */
class SubsystemManager {
    constructor(config = {}) {
        this.subsystems = new Map();      // nome -> instância
        this.definitions = new Map();     // nome -> definição (classe + opções)
        this.states = new Map();          // nome -> 'created'|'initialized'|'started'|'stopped'|'destroyed'
        this.dependencies = new Map();    // nome -> [nomes dependentes]
        this.eventBus = config.eventBus || null; // pode ser o eventBus do kernel
        this._initialized = false;
        this._started = false;
    }

    /**
     * Registra uma definição de subsistema (sem instanciar)
     */
    define(name, SubsystemClass, options = {}) {
        if (this.definitions.has(name)) {
            throw new Error(`Subsystem "${name}" já definido.`);
        }
        this.definitions.set(name, { Class: SubsystemClass, options });
        this.states.set(name, 'created');
        this.dependencies.set(name, options.dependencies || []);
        return this;
    }

    /**
     * Instancia e inicializa todos os subsistemas registrados
     * (respeitando a ordem de dependências)
     */
    async initAll() {
        if (this._initialized) return;

        // Ordenação topológica simples (respeita dependências)
        const order = this._resolveOrder();
        for (const name of order) {
            await this._initOne(name);
        }
        this._initialized = true;
        this.emit('subsystems:initialized', { subsystems: Array.from(this.subsystems.keys()) });
        return this;
    }

    async _initOne(name) {
        if (this.states.get(name) !== 'created') return;

        const def = this.definitions.get(name);
        if (!def) throw new Error(`Subsystem "${name}" não definido.`);

        // Instancia
        const instance = new def.Class();
        this.subsystems.set(name, instance);

        // Se tiver método init, chama
        if (typeof instance.init === 'function') {
            await instance.init(this.getContext(name));
        }
        this.states.set(name, 'initialized');
        this.emit(`subsystem:${name}:initialized`, { name, instance });
    }

    /**
     * Inicia todos os subsistemas (após inicializados)
     */
    async startAll() {
        if (this._started) return;
        if (!this._initialized) await this.initAll();

        const order = this._resolveOrder();
        for (const name of order) {
            await this._startOne(name);
        }
        this._started = true;
        this.emit('subsystems:started', { subsystems: Array.from(this.subsystems.keys()) });
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
        this.emit(`subsystem:${name}:started`, { name, instance });
    }

    /**
     * Para todos os subsistemas (na ordem inversa)
     */
    async stopAll() {
        if (!this._started) return;
        const order = this._resolveOrder().reverse();
        for (const name of order) {
            await this._stopOne(name);
        }
        this._started = false;
        this.emit('subsystems:stopped', {});
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

    /**
     * Destroi todos os subsistemas (libera recursos)
     */
    async destroyAll() {
        await this.stopAll();
        const order = this._resolveOrder().reverse();
        for (const name of order) {
            await this._destroyOne(name);
        }
        this.subsystems.clear();
        this.states.clear();
        this._initialized = false;
        this._started = false;
        this.emit('subsystems:destroyed', {});
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

    /**
     * Obtém uma instância de subsistema
     */
    get(name) {
        return this.subsystems.get(name);
    }

    /**
     * Lista todos os subsistemas registrados
     */
    list() {
        return Array.from(this.definitions.keys());
    }

    /**
     * Obtém o contexto para um subsistema (inclui métodos auxiliares)
     */
    getContext(name) {
        return {
            name,
            kernel: this._kernel || null,
            eventBus: this.eventBus,
            getSubsystem: (n) => this.get(n),
            listSubsystems: () => this.list(),
            log: (msg) => console.log(`[${name}] ${msg}`)
        };
    }

    /**
     * Resolve a ordem de inicialização baseada em dependências
     */
    _resolveOrder() {
        const names = Array.from(this.definitions.keys());
        const graph = {};
        for (const name of names) {
            const deps = this.dependencies.get(name) || [];
            graph[name] = deps.filter(d => names.includes(d));
        }

        // Algoritmo de ordenação topológica (Kahn)
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
            throw new Error('Dependência circular detectada entre subsistemas.');
        }
        return result;
    }

    /**
     * Emite eventos (se eventBus estiver disponível)
     */
    emit(event, data) {
        if (this.eventBus && typeof this.eventBus.emit === 'function') {
            this.eventBus.emit(event, data);
        }
        // Fallback para CustomEvent
        document.dispatchEvent(new CustomEvent(event, { detail: data }));
    }

    /**
     * Injeta o kernel para acesso global
     */
    setKernel(kernel) {
        this._kernel = kernel;
        return this;
    }
}
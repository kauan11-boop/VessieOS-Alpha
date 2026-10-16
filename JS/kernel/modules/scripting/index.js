/**
 * ScriptingManager – Integra o motor VessieScript (linguagem própria do
 * ecossistema VessieOS, ver assets/vessiescript/SPEC.md) ao pipeline de
 * módulos do kernel.
 *
 * IMPORTANTE — mesmo padrão já usado para o Vessie3DProEngine em
 * `modules/index.js`: o motor real (`lib/vessiescript.js`) é um script UMD
 * clássico que se auto-instancia em `window.VessieScript` (ele precisa
 * rodar tanto no navegador quanto standalone via Node/CLI, então não usa
 * `export` de módulo ES). Este módulo apenas localiza esse global já
 * carregado por um `<script>` clássico antes do grafo de módulos ES, e
 * expõe uma API de alto nível (`run`, apps/mods como `.vessie`) para o
 * resto do kernel — igual ao GraphicsHub faz com `window.Vessie3DPro`.
 */
class ScriptingManager {
    constructor(deps = {}) {
        this._resourceManager = deps.ResourceManager || null;
        this._engine = null; // referência a window.VessieScript
        this._loadedScripts = new Map(); // caminho/id -> { source, interpreter }
        this._listeners = [];
    }

    async init() {
        // Espera defensiva: o motor (`lib/vessiescript.js`) é carregado via
        // <script> clássico separado (ver index.html / NEW-MODULES.md) — na
        // prática ele sempre termina antes deste módulo ES rodar, mas damos
        // uma margem curta de retentativa para não depender de timing exato
        // de rede, no mesmo espírito defensivo do autohealer.js do kernel.
        this._engine = window.VessieScript || await this._waitForEngine();
        if (!this._engine) {
            // eslint-disable-next-line no-console
            console.warn('[ScriptingManager] window.VessieScript não encontrado — inclua '
                + 'JS/kernel/modules/scripting/lib/vessiescript.js via <script> clássico antes '
                + 'deste módulo. O suporte a .vessie ficará indisponível, sem quebrar o boot.');
        }
    }

    async _waitForEngine(timeoutMs = 3000, stepMs = 50) {
        const start = Date.now();
        while (Date.now() - start < timeoutMs) {
            if (window.VessieScript) return window.VessieScript;
            // eslint-disable-next-line no-await-in-loop
            await new Promise((resolve) => setTimeout(resolve, stepMs));
        }
        return window.VessieScript || null;
    }

    isAvailable() { return !!this._engine; }

    /**
     * Executa um script VessieScript, injetando ganchos do próprio VessieOS
     * como hostAPI (print vai para o console/terminal, entidades declaradas
     * disparam eventos do kernel, etc.), a menos que o chamador sobrescreva.
     */
    async run(source, { id = null, hostAPI = {} } = {}) {
        if (!this._engine) throw new Error('[ScriptingManager] Motor VessieScript indisponível');

        const mergedHostAPI = {
            print: (text) => this._emit('print', { id, text }),
            onEntity: (name, components) => this._emit('entity-declared', { id, name, components }),
            onUI: (tree) => this._emit('ui-declared', { id, tree }),
            ...hostAPI,
        };

        try {
            const interpreter = await this._engine.run(source, mergedHostAPI);
            if (id) this._loadedScripts.set(id, { source, interpreter });
            this._emit('script-loaded', { id });
            return interpreter;
        } catch (error) {
            this._emit('script-error', { id, message: error.message });
            throw error;
        }
    }

    /** Carrega um .vessie a partir do VFS real do VessieOS (Terminal/Explorador
     * de Arquivos e VessieScript compartilham o mesmo filesystem — ver
     * `window.VessieOS.FileSystem`, unificado em `JS/core/main.js`). */
    async runFromFile(path, { hostAPI = {}, filesystem = null } = {}) {
        const fs = filesystem || window.VessieOS?.FileSystem;
        if (!fs || typeof fs.read !== 'function') {
            throw new Error('[ScriptingManager] Filesystem do kernel indisponível para ler .vessie');
        }
        const source = fs.read(path);
        if (source === null || source === undefined) {
            throw new Error(`[ScriptingManager] Arquivo não encontrado: ${path}`);
        }
        return this.run(source, { id: path, hostAPI });
    }

    getLoadedScript(id) { return this._loadedScripts.get(id) || null; }
    unload(id) { return this._loadedScripts.delete(id); }

    on(event, callback) { this._listeners.push({ event, callback }); }

    _emit(event, data) {
        for (const l of this._listeners) {
            if (l.event === event) { try { l.callback(data); } catch (e) { /* isola falhas */ } }
        }
        document.dispatchEvent(new CustomEvent(`vessie:scripting:${event}`, { detail: data }));
    }

    destroy() {
        this._loadedScripts.clear();
        this._listeners = [];
    }
}

export default ScriptingManager;

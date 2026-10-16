/**
 * VessieLangManager — Módulo do Kernel do VessieOS
 * ---------------------------------------------------------------
 * Integra a linguagem de programação própria do Kauan, VessieLang
 * (dialetos B1/J3/G5/FULL — ver lib/), ao pipeline de módulos ES do
 * kernel, seguindo a mesma convenção dos demais módulos deste projeto
 * (classe ES6, `constructor(deps)`, `init()`/`destroy()`, `on()/_emit()`
 * disparando também um CustomEvent em `document` no namespace
 * `vessie:vessielang:<evento>`).
 *
 * Assim como o Vessie3DProEngine (motor 3D) e o LMStudioIntegration (IA),
 * o motor real do VessieLang é uma cadeia de scripts clássicos que se
 * auto-registram em globais — por depender de rodar também fora do
 * navegador (CLI standalone via Node, ver VessieLang/Vessie/runner.node.js
 * no projeto original) ele não usa `export` de módulo ES. Por isso os
 * scripts (B1_Lang.js, J3_Lang.js, G5_Lang.js, VL_Full.js, dispatcher.js,
 * vl-*.js, runtime-bridge.js) são carregados via <script> classico pelo
 * boot loader (JS/systems/desktop/main.js), ANTES deste módulo ES rodar —
 * este módulo só localiza `window.VessieLangRuntime` já pronto.
 */
export default class VessieLangManager {
    constructor(deps = {}) {
        this.deps = deps;
        this._listeners = new Map();
        this._history = []; // { id, nome, nivel, entrada, saida, quando, erro }
        this._runtime = null;
        this._examplesCache = null;
    }

    // ------------------------------------------------------------
    //  Ciclo de vida do módulo
    // ------------------------------------------------------------
    async init() {
        this._runtime = (typeof window !== 'undefined' && window.VessieLangRuntime) || null;

        if (!this._runtime) {
            // O carregamento clássico pode ainda não ter terminado — espera
            // com timeout, do mesmo jeito que o GraphicsHub espera o
            // window.Vessie3DPro aparecer.
            await this._waitForRuntime(8000);
        }

        if (this._runtime) {
            window.VessieOS = window.VessieOS || {};
            window.VessieOS.vessielang = this; // acesso global, ex: window.VessieOS.vessielang.run(codigo)
            this._emit('ready', { versao: this._runtime.versao });
            console.log(`[VessieLangManager] Pronto (runtime v${this._runtime.versao}).`);
        } else {
            console.warn('[VessieLangManager] window.VessieLangRuntime não encontrado — a linguagem não estará disponível nesta sessão. Verifique se os scripts de JS/kernel/modules/vessielang/lib/ foram carregados no boot.');
        }
        return this;
    }

    async start() { return this; }

    destroy() {
        this._listeners.clear();
    }

    _waitForRuntime(timeoutMs) {
        return new Promise((resolve) => {
            const start = Date.now();
            const check = () => {
                if (typeof window !== 'undefined' && window.VessieLangRuntime) {
                    this._runtime = window.VessieLangRuntime;
                    return resolve(this._runtime);
                }
                if (Date.now() - start > timeoutMs) return resolve(null);
                setTimeout(check, 150);
            };
            check();
        });
    }

    // ------------------------------------------------------------
    //  Eventos (vessie:vessielang:<evento>)
    // ------------------------------------------------------------
    on(event, callback) {
        if (!this._listeners.has(event)) this._listeners.set(event, new Set());
        this._listeners.get(event).add(callback);
        return () => this._listeners.get(event)?.delete(callback);
    }

    _emit(event, detail) {
        this._listeners.get(event)?.forEach((cb) => {
            try { cb(detail); } catch (e) { console.error(`[VessieLangManager] listener "${event}" falhou:`, e); }
        });
        try {
            document.dispatchEvent(new CustomEvent(`vessie:vessielang:${event}`, { detail }));
        } catch (e) { /* ambiente sem DOM (ex: testes) */ }
    }

    // ------------------------------------------------------------
    //  API pública
    // ------------------------------------------------------------
    isAvailable() {
        return !!this._runtime;
    }

    /** Detecta o dialeto (B1/J3/G5/FULL) sem executar o código. */
    detect(codigo) {
        if (!this._runtime) throw new Error('VessieLang não está disponível.');
        return this._runtime.detectar(codigo);
    }

    /**
     * Executa código-fonte .vl e devolve a saída (string) already
     * capturada pelo interpretador (equivalente a "stdout").
     */
    run(codigo, opts = {}) {
        if (!this._runtime) throw new Error('VessieLang não está disponível — verifique o carregamento dos scripts do motor.');
        const nome = opts.nome || opts.name || `script_${Date.now()}`;
        const entrada = { id: nome, nome, entrada: codigo, quando: new Date().toISOString() };
        this._emit('run', entrada);
        try {
            const nivel = this._runtime.detectar(codigo);
            const saida = this._runtime.executar(nome, codigo);
            const erro = typeof saida === 'string' && saida.startsWith('ERRO');
            const registro = { ...entrada, nivel, saida, erro };
            this._history.push(registro);
            if (this._history.length > 200) this._history.shift();
            this._emit(erro ? 'error' : 'output', registro);
            return registro;
        } catch (e) {
            const registro = { ...entrada, nivel: 'desconhecido', saida: 'ERRO: ' + e.message, erro: true };
            this._history.push(registro);
            this._emit('error', registro);
            return registro;
        }
    }

    /**
     * Lê um arquivo .vl do filesystem real do VessieOS
     * (window.VessieOS.FileSystem) OU do disco virtual do próprio
     * VessieLang (window.FS, localStorage) e executa.
     */
    async runFile(caminho) {
        let codigo = null;

        // 1) tenta o disco virtual do VessieLang (tem conteúdo de arquivo real)
        try {
            if (window.FS && typeof window.FS.exists === 'function' && window.FS.exists(caminho)) {
                codigo = window.FS.readFile(caminho);
            }
        } catch (e) { /* segue para a próxima fonte */ }

        // 2) tenta o filesystem "oficial" do VessieOS (nó com .value)
        if (codigo === null && window.VessieOS?.FileSystem?.resolve) {
            const node = window.VessieOS.FileSystem.resolve(caminho);
            if (node && node.type === 'file' && typeof node.value === 'string') codigo = node.value;
        }

        if (codigo === null) throw new Error(`Arquivo não encontrado: ${caminho}`);
        return this.run(codigo, { nome: caminho });
    }

    /** Histórico de execuções nesta sessão (mais recentes primeiro). */
    getHistory(limit = 50) {
        return this._history.slice(-limit).reverse();
    }

    /** Relatório JSON completo (delegado ao dispatcher original do VessieLang). */
    getReport() {
        return this._runtime ? this._runtime.relatorio() : '{}';
    }

    // -- Ponte direta para as novas APIs (útil para painéis/consoles JS) --
    askAI(prompt) { return this._runtime?.ai?.ask(prompt); }
    fetchUrl(url) { return this._runtime?.net?.get(url); }
    postUrl(url, body) { return this._runtime?.net?.post(url, body); }
    collectGames(source) { return this._runtime?.collector?.games(source); }
    collectWeb(query) { return this._runtime?.collector?.web(query); }
}

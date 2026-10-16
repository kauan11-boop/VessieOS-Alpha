/**
 * GraphicsHub – Ponto de entrada ES do pipeline gráfico.
 *
 * Antes, `JS/kernel/modules/index.js` tentava
 * `import Vessie3DProEngine from './graphics/Vessie3DProEngine.js'`
 * diretamente. Isso nunca funcionou: `Vessie3DProEngine.js` é um script
 * clássico (usa `window.THREE`, se auto-instancia como `window.Vessie3DPro`
 * no final do arquivo) e não possui nenhum `export` — importar um módulo
 * sem exports quebra a resolução de TODO o grafo de módulos ES com
 * SyntaxError, derrubando o kernel de módulos inteiro silenciosamente.
 *
 * Este arquivo resolve isso: o motor 3D continua sendo carregado como
 * script clássico (ver `JS/systems/desktop/main.js`), e este `GraphicsHub`
 * apenas localiza `window.Vessie3DPro` já pronto (com espera defensiva) e
 * o expõe ao pipeline de módulos, além de gerenciar os motores extras
 * (GameHubRenderer em Three.js).
 */
import GameHubRenderer from './engines/GameHubRenderer.js';

export default class GraphicsHub {
    constructor(deps = {}) {
        this.performanceManager = deps.PerformanceManager || null;
        this.engine = null;       // window.Vessie3DPro
        this.gameHubRenderer = null;
        this._ready = false;
    }

    async init() {
        await this._waitForEngine();
        this.gameHubRenderer = new GameHubRenderer({ performanceManager: this.performanceManager });
        return this;
    }

    async start() {
        this._ready = true;
        if (window.VessieOS?.EventBus) {
            window.VessieOS.EventBus.emit('graphics:ready', { engine: !!this.engine });
        }
    }

    _waitForEngine() {
        return new Promise((resolve) => {
            const check = () => {
                if (window.Vessie3DPro) {
                    this.engine = window.Vessie3DPro;
                    return true;
                }
                return false;
            };
            if (check()) return resolve();
            let attempts = 0;
            const interval = setInterval(() => {
                attempts++;
                if (check() || attempts > 30) {
                    clearInterval(interval);
                    resolve();
                }
            }, 150);
        });
    }

    /**
     * Ativa a cena Three.js de fundo do Game Hub para um <canvas> específico.
     * Chamado pelo app Game Hub (gamehub/index.js) quando a janela abre.
     */
    mountGameHubScene(canvas, options) {
        return this.gameHubRenderer?.mount(canvas, options);
    }

    unmountGameHubScene() {
        return this.gameHubRenderer?.unmount();
    }

    isReady() {
        return this._ready;
    }
}

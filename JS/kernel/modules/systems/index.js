/**
 * SystemsRuntime — motor central dos 155 micro-sistemas do VessieOS.
 *
 * Cada micro-sistema é uma unidade pequena e independente (efeito visual,
 * ajuste de acessibilidade, utilitário de produtividade, diagnóstico...)
 * com um contrato uniforme: `{ id, category, name, description, enable(),
 * disable(), enabledByDefault }`. Isso permite:
 *
 *   - Ligar/desligar qualquer sistema em runtime (persistido em localStorage)
 *   - Listar tudo por categoria (para uma futura tela de "Configurações do
 *     Sistema" no Painel de Controle)
 *   - Registrar novos sistemas sem tocar no runtime — basta adicionar um
 *     item no array exportado por um arquivo em `systems/registry/*.js`
 *
 * As 10 categorias (visual, performance, ux, accessibility, security,
 * productivity, gamehub, ai, network, diagnostics) somam exatamente 155
 * sistemas — ver `registry/index.js` para a contagem por categoria.
 */
import * as helpers from './lib/helpers.js';
import { buildRegistry, EXPECTED_TOTAL } from './registry/index.js';
import { storageGet, storageSet } from './lib/helpers.js';

export default class SystemsRuntime {
    constructor(deps = {}) {
        this.deps = deps; // { PerformanceManager, AccessibilityManager, ResourceManager, ... }
        this.systems = new Map(); // id -> descriptor
        this._active = new Set();
    }

    async init() {
        const ctx = { ...this.deps, helpers, toast: helpers.toast };
        let built = 0;
        let descriptors = [];
        try {
            descriptors = buildRegistry(ctx);
        } catch (e) {
            console.error('[SystemsRuntime] Falha ao construir o registro de sistemas:', e);
        }
        for (const descriptor of descriptors) {
            if (!descriptor || !descriptor.id) continue;
            this.systems.set(descriptor.id, descriptor);
            built++;
        }
        if (built !== EXPECTED_TOTAL) {
            console.warn(`[SystemsRuntime] Esperava ${EXPECTED_TOTAL} sistemas, ${built} foram construídos com sucesso.`);
        } else {
            console.log(`[SystemsRuntime] ${built} micro-sistemas registrados.`);
        }
        return this;
    }

    async start() {
        for (const [id, sys] of this.systems) {
            const persisted = storageGet(`enabled:${id}`, null);
            const shouldEnable = persisted === null ? !!sys.enabledByDefault : !!persisted;
            if (shouldEnable) this.enable(id, { silent: true });
        }
        if (window.VessieOS?.EventBus) {
            window.VessieOS.EventBus.emit('systems:ready', { count: this.systems.size });
        }
        return this;
    }

    enable(id, { silent = false } = {}) {
        const sys = this.systems.get(id);
        if (!sys || this._active.has(id)) return false;
        try {
            sys.enable?.();
            this._active.add(id);
            storageSet(`enabled:${id}`, true);
            if (!silent) helpers.toast(`${sys.name} ativado`, 'success');
            return true;
        } catch (e) {
            console.error(`[SystemsRuntime] Erro ao ativar "${id}":`, e);
            return false;
        }
    }

    disable(id, { silent = false } = {}) {
        const sys = this.systems.get(id);
        if (!sys || !this._active.has(id)) return false;
        try {
            sys.disable?.();
            this._active.delete(id);
            storageSet(`enabled:${id}`, false);
            if (!silent) helpers.toast(`${sys.name} desativado`, 'info');
            return true;
        } catch (e) {
            console.error(`[SystemsRuntime] Erro ao desativar "${id}":`, e);
            return false;
        }
    }

    toggle(id) {
        return this._active.has(id) ? this.disable(id) : this.enable(id);
    }

    isEnabled(id) {
        return this._active.has(id);
    }

    get(id) {
        return this.systems.get(id) || null;
    }

    list(category = null) {
        const all = [...this.systems.values()];
        return category ? all.filter(s => s.category === category) : all;
    }

    listCategories() {
        return [...new Set([...this.systems.values()].map(s => s.category))];
    }

    count() {
        return this.systems.size;
    }
}

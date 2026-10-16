/**
 * SpotlightSearch – Busca universal (apps, arquivos, configurações, comandos)
 *
 * Complementa o CommandPalette (que executa comandos digitados) com um
 * índice pesquisável por *conteúdo*: nomes de apps, caminhos de arquivos
 * indexados pelo FileSystem do kernel, entradas de configurações e
 * atalhos registrados por outros módulos. Abre com Ctrl+Espaço (padrão
 * configurável) e faz fuzzy match simples (subsequência, sem libs externas).
 */
class SpotlightSearch {
    constructor(deps = {}) {
        this._resourceManager = deps.ResourceManager || null;
        this._index = []; // [{ id, type, label, keywords, action }]
        this._listeners = [];
        this._open = false;
        this._shortcut = { key: ' ', ctrlKey: true };
        this._keydownHandler = null;
    }

    async init() {
        this._keydownHandler = (e) => {
            if (e.key === this._shortcut.key && e.ctrlKey === this._shortcut.ctrlKey) {
                e.preventDefault();
                this.toggle();
            }
            if (e.key === 'Escape' && this._open) this.close();
        };
        if (this._resourceManager && typeof this._resourceManager.addEventListener === 'function') {
            this._resourceManager.addEventListener(document, 'keydown', this._keydownHandler);
        } else {
            document.addEventListener('keydown', this._keydownHandler);
        }
    }

    /** Registra um item pesquisável. action(query) é chamado ao selecionar. */
    register(item) {
        if (!item || !item.id || !item.label || typeof item.action !== 'function') {
            throw new Error('[SpotlightSearch] item precisa de {id, label, action}');
        }
        this._index = this._index.filter((i) => i.id !== item.id);
        this._index.push({
            type: item.type || 'geral',
            keywords: (item.keywords || []).map((k) => k.toLowerCase()),
            ...item,
        });
        this._emit('registered', { id: item.id });
    }

    unregister(id) {
        this._index = this._index.filter((i) => i.id !== id);
    }

    /** Fuzzy match por subsequência (rápido, sem dependências). */
    search(query) {
        const q = (query || '').toLowerCase().trim();
        if (!q) return this._index.slice(0, 10);

        const score = (text) => {
            text = text.toLowerCase();
            if (text === q) return 100;
            if (text.startsWith(q)) return 80;
            if (text.includes(q)) return 60;
            // subsequência: todas as letras de q aparecem em ordem em text
            let ti = 0;
            for (const ch of q) {
                ti = text.indexOf(ch, ti);
                if (ti === -1) return -1;
                ti++;
            }
            return 30;
        };

        const results = this._index
            .map((item) => {
                const labelScore = score(item.label);
                const keywordScore = Math.max(-1, ...item.keywords.map(score));
                return { item, score: Math.max(labelScore, keywordScore) };
            })
            .filter((r) => r.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 20)
            .map((r) => r.item);

        this._emit('query', { query: q, resultCount: results.length });
        return results;
    }

    select(itemOrId) {
        const item = typeof itemOrId === 'string'
            ? this._index.find((i) => i.id === itemOrId)
            : itemOrId;
        if (!item) return false;
        item.action();
        this._emit('open', { id: item.id, type: item.type });
        this.close();
        return true;
    }

    open() { this._open = true; this._emit('opened', {}); }
    close() { this._open = false; this._emit('closed', {}); }
    toggle() { this._open ? this.close() : this.open(); }
    isOpen() { return this._open; }

    on(event, callback) { this._listeners.push({ event, callback }); }

    _emit(event, data) {
        for (const l of this._listeners) {
            if (l.event === event) { try { l.callback(data); } catch (e) { /* isola falhas */ } }
        }
        document.dispatchEvent(new CustomEvent(`vessie:spotlight:${event}`, { detail: data }));
    }

    destroy() {
        if (this._keydownHandler) document.removeEventListener('keydown', this._keydownHandler);
        this._index = [];
        this._listeners = [];
    }
}

export default SpotlightSearch;

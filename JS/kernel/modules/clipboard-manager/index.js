/**
 * ClipboardManager – Histórico de área de transferência (estilo Win+V).
 *
 * Escuta o evento `copy` do documento, guarda um histórico limitado
 * (com itens fixados/pinned imunes ao limite), e permite colar de volta
 * qualquer item do histórico. Persiste em localStorage entre sessões.
 */
const STORAGE_KEY = 'vessieos:clipboard-manager:history';
const DEFAULT_MAX_ITEMS = 25;

class ClipboardManager {
    constructor(deps = {}) {
        this._resourceManager = deps.ResourceManager || null;
        this._history = []; // [{ id, text, pinned, timestamp }]
        this._maxItems = DEFAULT_MAX_ITEMS;
        this._listeners = [];
        this._copyHandler = null;
    }

    async init() {
        this._loadHistory();
        this._copyHandler = () => {
            // Lido de forma assíncrona pois navigator.clipboard.readText() é a
            // única forma confiável de obter o texto copiado após o evento —
            // window.getSelection() não reflete conteúdo colado de fora da página.
            if (navigator.clipboard && navigator.clipboard.readText) {
                navigator.clipboard.readText().then((text) => {
                    if (text) this.addItem(text);
                }).catch(() => { /* permissão negada — histórico simplesmente não recebe este item */ });
            }
        };
        document.addEventListener('copy', this._copyHandler);
    }

    _loadHistory() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) this._history = JSON.parse(raw);
        } catch (e) {
            this._history = [];
        }
    }

    _saveHistory() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this._history));
        } catch (e) { /* quota excedida — histórico continua funcionando só em memória */ }
    }

    addItem(text) {
        if (!text || !text.trim()) return null;
        // evita duplicar o item mais recente idêntico (copiar a mesma coisa 2x)
        if (this._history[0] && this._history[0].text === text) return this._history[0];

        const item = { id: `clip_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, text, pinned: false, timestamp: Date.now() };
        this._history.unshift(item);
        this._trim();
        this._saveHistory();
        this._emit('item-added', { id: item.id });
        return item;
    }

    _trim() {
        const pinned = this._history.filter((i) => i.pinned);
        const unpinned = this._history.filter((i) => !i.pinned).slice(0, this._maxItems);
        this._history = [...pinned, ...unpinned].sort((a, b) => b.timestamp - a.timestamp);
    }

    pin(id, pinned = true) {
        const item = this._history.find((i) => i.id === id);
        if (!item) return false;
        item.pinned = pinned;
        this._saveHistory();
        this._emit('item-pinned', { id, pinned });
        return true;
    }

    remove(id) {
        const before = this._history.length;
        this._history = this._history.filter((i) => i.id !== id);
        if (this._history.length !== before) {
            this._saveHistory();
            this._emit('item-removed', { id });
            return true;
        }
        return false;
    }

    clear(keepPinned = true) {
        this._history = keepPinned ? this._history.filter((i) => i.pinned) : [];
        this._saveHistory();
        this._emit('history-cleared', { keepPinned });
    }

    /** Copia um item do histórico de volta para a área de transferência real. */
    async pasteItem(id) {
        const item = this._history.find((i) => i.id === id);
        if (!item) return false;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(item.text);
        }
        this._emit('item-pasted', { id });
        return true;
    }

    list() { return [...this._history]; }
    setMaxItems(n) { this._maxItems = n; this._trim(); this._saveHistory(); }

    on(event, callback) { this._listeners.push({ event, callback }); }

    _emit(event, data) {
        for (const l of this._listeners) {
            if (l.event === event) { try { l.callback(data); } catch (e) { /* isola falhas */ } }
        }
        document.dispatchEvent(new CustomEvent(`vessie:clipboard:${event}`, { detail: data }));
    }

    destroy() {
        if (this._copyHandler) document.removeEventListener('copy', this._copyHandler);
        this._listeners = [];
    }
}

export default ClipboardManager;

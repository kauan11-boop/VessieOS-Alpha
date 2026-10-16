/**
 * WidgetsBoard – Painel de widgets estilo Win11 (relógio, notas rápidas, etc.)
 *
 * Não renderiza HTML diretamente (isso é responsabilidade do módulo `ui`/da
 * camada de apresentação) — mantém o *estado* do board: quais widgets estão
 * ativos, em que ordem, e o dado de cada um. Persiste em localStorage.
 */
const STORAGE_KEY = 'vessieos:widgets-board:layout';

class WidgetsBoard {
    constructor(deps = {}) {
        this._memoryManager = deps.MemoryManager || null;
        this._widgets = new Map(); // id -> { id, type, data, order }
        this._listeners = [];
        this._built = false;
    }

    async init() {
        this._loadLayout();
        this._built = true;
    }

    _loadLayout() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) return;
            const saved = JSON.parse(raw);
            for (const w of saved) this._widgets.set(w.id, w);
        } catch (e) {
            // layout corrompido ou indisponível — começa vazio, sem quebrar o boot
        }
    }

    _saveLayout() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.list()));
        } catch (e) { /* quota excedida ou storage bloqueado: ignora silenciosamente */ }
    }

    /** Adiciona (ou atualiza, se já existir) um widget. */
    add(id, type, data = {}) {
        const order = this._widgets.has(id) ? this._widgets.get(id).order : this._widgets.size;
        this._widgets.set(id, { id, type, data, order });
        this._saveLayout();
        this._emit('widget-added', { id, type });
    }

    remove(id) {
        const existed = this._widgets.delete(id);
        if (existed) {
            this._saveLayout();
            this._emit('widget-removed', { id });
        }
        return existed;
    }

    /** Atualiza apenas os dados de um widget já existente (ex.: tick do relógio). */
    updateData(id, data) {
        const widget = this._widgets.get(id);
        if (!widget) return false;
        widget.data = { ...widget.data, ...data };
        this._emit('widget-updated', { id, data: widget.data });
        return true;
    }

    reorder(orderedIds) {
        orderedIds.forEach((id, index) => {
            const widget = this._widgets.get(id);
            if (widget) widget.order = index;
        });
        this._saveLayout();
        this._emit('layout-changed', { order: orderedIds });
    }

    list() {
        return Array.from(this._widgets.values()).sort((a, b) => a.order - b.order);
    }

    get(id) { return this._widgets.get(id) || null; }

    on(event, callback) { this._listeners.push({ event, callback }); }

    _emit(event, data) {
        for (const l of this._listeners) {
            if (l.event === event) { try { l.callback(data); } catch (e) { /* isola falhas */ } }
        }
        document.dispatchEvent(new CustomEvent(`vessie:widgets:${event}`, { detail: data }));
    }

    destroy() {
        this._widgets.clear();
        this._listeners = [];
    }
}

export default WidgetsBoard;

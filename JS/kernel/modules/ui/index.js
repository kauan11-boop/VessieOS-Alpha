/**
 * UIStateManager – Gerencia estado visual da interface
 * 
 * Controla temas, animações e sincroniza com acessibilidade e performance.
 */
class UIStateManager {
    constructor(eventManager, accessibilityManager) {
        this.eventManager = eventManager;
        this.accessibilityManager = accessibilityManager;
        this._state = {
            theme: 'dark',
            animations: true,
            motionBlur: true,
            reducedMotion: false,
            performanceMode: 'balanced'
        };
        this._listeners = [];
    }

    init() {
        // Carrega estado persistido
        this._loadState();

        // Sincroniza com preferências de acessibilidade
        if (this.accessibilityManager) {
            this.accessibilityManager.on('reduced-motion-change', (prefers) => {
                this.setState('reducedMotion', prefers);
                if (prefers) {
                    this.setState('motionBlur', false);
                    this.setState('animations', false);
                }
            });
        }

        // Escuta eventos de performance
        document.addEventListener('vessie:performance:mode', (e) => {
            this.setState('performanceMode', e.detail.mode);
        });
    }

    _loadState() {
        try {
            const saved = localStorage.getItem('vessie_ui_state');
            if (saved) {
                const parsed = JSON.parse(saved);
                for (const key in parsed) {
                    if (key in this._state) {
                        this._state[key] = parsed[key];
                    }
                }
            }
        } catch (_) { }
    }

    _saveState() {
        try {
            localStorage.setItem('vessie_ui_state', JSON.stringify(this._state));
        } catch (_) { }
    }

    /**
     * Altera um estado e notifica listeners
     */
    setState(key, value) {
        if (!(key in this._state)) return;
        const old = this._state[key];
        this._state[key] = value;
        this._saveState();
        if (old !== value) {
            this._emit('state:change', { key, oldValue: old, newValue: value });
        }
        // Emite evento específico
        this._emit(`state:${key}`, { value });
    }

    getState(key) {
        return this._state[key];
    }

    getAllState() {
        return { ...this._state };
    }

    on(event, callback) {
        this._listeners.push({ event, callback });
    }

    _emit(event, data) {
        for (const listener of this._listeners) {
            if (listener.event === event) {
                try { listener.callback(data); } catch (e) { }
            }
        }
        document.dispatchEvent(new CustomEvent(`vessie:ui:${event}`, { detail: data }));
        if (this.eventManager) {
            this.eventManager.emit(`ui:${event}`, data);
        }
    }

    destroy() {
        this._listeners = [];
        this._saveState();
    }
}

export default UIStateManager;
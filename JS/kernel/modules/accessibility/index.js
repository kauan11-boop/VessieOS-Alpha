/**
 * AccessibilityManager – Gerencia preferências de acessibilidade
 * 
 * Detecta prefers-reduced-motion, contraste, etc. e emite eventos.
 */
class AccessibilityManager {
    constructor() {
        this._prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        this._prefersContrast = window.matchMedia('(prefers-contrast: high)').matches;
        this._listeners = [];
        this._started = false;
        this._mediaQueryListener = null;
    }

    init() {
        if (this._started) return;
        this._started = true;
        // Escuta mudanças
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        this._mediaQueryListener = (e) => {
            const old = this._prefersReducedMotion;
            this._prefersReducedMotion = e.matches;
            if (old !== this._prefersReducedMotion) {
                this._emit('reduced-motion-change', this._prefersReducedMotion);
            }
        };
        if (mq.addEventListener) {
            mq.addEventListener('change', this._mediaQueryListener);
        } else {
            // Fallback
            mq.addListener(this._mediaQueryListener);
        }
    }

    get prefersReducedMotion() {
        return this._prefersReducedMotion;
    }

    get prefersHighContrast() {
        return this._prefersContrast;
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
        // Dispara evento DOM
        document.dispatchEvent(new CustomEvent(`vessie:accessibility:${event}`, { detail: data }));
    }

    destroy() {
        this._started = false;
        if (this._mediaQueryListener) {
            const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
            if (mq.removeEventListener) {
                mq.removeEventListener('change', this._mediaQueryListener);
            } else {
                mq.removeListener(this._mediaQueryListener);
            }
        }
        this._listeners = [];
    }
}

export default AccessibilityManager;
/**
 * EventManager – Central de eventos internos do kernel de módulos ES.
 *
 * Este arquivo existia vazio (0 bytes) no projeto original: como
 * `JS/kernel/modules/index.js` faz `import EventManager from './events/index.js'`,
 * o import resolvia para `undefined` e derrubava a pipeline inteira de
 * módulos assim que `new EventManager()` era chamado.
 *
 * Em vez de reinventar um barramento de eventos do zero, este módulo faz
 * ponte com `window.VessieOS.EventBus` (já implementado em
 * `resources/lib/event-bus.js`, non-module e carregado cedo no boot) —
 * assim qualquer parte do sistema (ES module ou script clássico) escuta
 * e emite os mesmos eventos, sem duplicar estado.
 */
export default class EventManager {
    constructor() {
        this._local = new Map(); // fallback caso o EventBus global ainda não exista
        this._bridged = false;
    }

    async init() {
        this._tryBridge();
        if (!this._bridged) {
            let attempts = 0;
            const retry = setInterval(() => {
                attempts++;
                this._tryBridge();
                if (this._bridged || attempts > 20) clearInterval(retry);
            }, 100);
        }
        return this;
    }

    _tryBridge() {
        if (typeof window !== 'undefined' && window.VessieOS?.EventBus) {
            this._bus = window.VessieOS.EventBus;
            this._bridged = true;
        }
    }

    on(event, fn) {
        if (this._bus) return this._bus.on(event, fn);
        if (!this._local.has(event)) this._local.set(event, new Set());
        this._local.get(event).add(fn);
        return () => this.off(event, fn);
    }

    once(event, fn) {
        if (this._bus) return this._bus.once(event, fn);
        const unsubscribe = this.on(event, (...args) => {
            unsubscribe();
            fn(...args);
        });
        return unsubscribe;
    }

    off(event, fn) {
        if (this._bus) return this._bus.off(event, fn);
        this._local.get(event)?.delete(fn);
    }

    emit(event, payload) {
        if (this._bus) return this._bus.emit(event, payload);
        this._local.get(event)?.forEach((fn) => {
            try { fn(payload); } catch (e) { console.error(`[EventManager] listener de "${event}" falhou:`, e); }
        });
    }

    eventNames() {
        if (this._bus) return this._bus.eventNames();
        return [...this._local.keys()].filter((e) => this._local.get(e).size > 0);
    }
}

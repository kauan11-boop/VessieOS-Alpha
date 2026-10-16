/**
 * PowerManager – Estado de energia (bateria real via Battery API quando
 * disponível, com fallback simulado) e transições sleep/hibernate/wake.
 *
 * Integra com IdleScheduler (detecção de inatividade já existente no
 * kernel) para disparar sleep automático após N minutos ociosos, mas
 * também expõe API manual (sleep()/wake()) para o usuário via menu.
 */
class PowerManager {
    constructor(deps = {}) {
        this._idleScheduler = deps.IdleScheduler || null;
        this._resourceManager = deps.ResourceManager || null;
        this._battery = null; // referência ao BatteryManager nativo, se disponível
        this._simulated = { level: 1, charging: true }; // fallback quando API indisponível
        this._state = 'awake'; // 'awake' | 'sleeping' | 'hibernating'
        this._autoSleepMinutes = 15;
        this._idleTimerId = null;
        this._listeners = [];
    }

    async init() {
        if (navigator.getBattery) {
            try {
                this._battery = await navigator.getBattery();
                this._battery.addEventListener('levelchange', () => this._onBatteryChange());
                this._battery.addEventListener('chargingchange', () => this._onBatteryChange());
            } catch (e) {
                this._battery = null; // API presente mas falhou (ex.: permissão) — usa fallback simulado
            }
        }

        if (this._idleScheduler && typeof this._idleScheduler.onIdle === 'function') {
            this._idleScheduler.onIdle(this._autoSleepMinutes * 60 * 1000, () => this.sleep('idle'));
        }
    }

    _onBatteryChange() {
        this._emit('battery-change', this.getBatteryInfo());
        if (this._battery.level <= 0.1 && !this._battery.charging) {
            this._emit('battery-critical', this.getBatteryInfo());
        }
    }

    getBatteryInfo() {
        if (this._battery) {
            return {
                level: this._battery.level,
                charging: this._battery.charging,
                simulated: false,
            };
        }
        return { ...this._simulated, simulated: true };
    }

    /** Só útil quando não há Battery API real — permite demos/dev drenar a bateria simulada. */
    setSimulatedBattery(level, charging) {
        this._simulated = { level: Math.max(0, Math.min(1, level)), charging: !!charging };
        this._emit('battery-change', this.getBatteryInfo());
    }

    sleep(reason = 'manual') {
        if (this._state === 'sleeping') return;
        this._state = 'sleeping';
        this._emit('sleep', { reason });
    }

    hibernate(reason = 'manual') {
        this._state = 'hibernating';
        this._emit('hibernate', { reason });
    }

    wake() {
        if (this._state === 'awake') return;
        const previous = this._state;
        this._state = 'awake';
        this._emit('wake', { from: previous });
    }

    getState() { return this._state; }

    setAutoSleepMinutes(minutes) {
        this._autoSleepMinutes = minutes;
        this._emit('auto-sleep-changed', { minutes });
    }

    on(event, callback) { this._listeners.push({ event, callback }); }

    _emit(event, data) {
        for (const l of this._listeners) {
            if (l.event === event) { try { l.callback(data); } catch (e) { /* isola falhas */ } }
        }
        document.dispatchEvent(new CustomEvent(`vessie:power:${event}`, { detail: data }));
    }

    destroy() {
        this._listeners = [];
        this._battery = null;
    }
}

export default PowerManager;

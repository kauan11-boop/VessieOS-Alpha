/**
 * Performance Manager – Central de otimização e adaptação
 * 
 * Integra FrameMonitor e IdleScheduler, define modos de performance
 * e ajusta qualidade visual conforme a carga do sistema.
 */
import { FrameMonitor } from './lib/frame-monitor.js';
import { IdleScheduler } from './lib/idle-scheduler.js';
import { PerformanceBooster } from './lib/booster.js';

export { FrameMonitor, IdleScheduler, PerformanceBooster };

const PERFORMANCE_MODES = {
    ULTRA: 'ultra',
    HIGH: 'high',
    BALANCED: 'balanced',
    LOW: 'low',
    POWER_SAVING: 'power-saving'
};

export class PerformanceManager {
    constructor(frameMonitor, idleScheduler, accessibilityManager) {
        this.frameMonitor = frameMonitor;
        this.idleScheduler = idleScheduler;
        this.accessibilityManager = accessibilityManager;
        this.mode = PERFORMANCE_MODES.BALANCED;
        this._targetFPS = 60;
        this._adaptive = true;
        this._listeners = [];
        this._hysteresis = 0;
        this._lastMode = this.mode;
        this._qualityLevels = {
            [PERFORMANCE_MODES.ULTRA]: { blurMax: 4, animationDuration: 1, effects: 1 },
            [PERFORMANCE_MODES.HIGH]: { blurMax: 3, animationDuration: 0.8, effects: 0.8 },
            [PERFORMANCE_MODES.BALANCED]: { blurMax: 2, animationDuration: 0.6, effects: 0.6 },
            [PERFORMANCE_MODES.LOW]: { blurMax: 1, animationDuration: 0.4, effects: 0.3 },
            [PERFORMANCE_MODES.POWER_SAVING]: { blurMax: 0, animationDuration: 0.2, effects: 0.1 }
        };
        this._currentQuality = this._qualityLevels[this.mode];
        this._started = false;
    }

    start() {
        if (this._started) return;
        this._started = true;
        this.frameMonitor.start();

        // Monitora FPS e ajusta modo
        this.frameMonitor.onFrame((metrics) => {
            if (!this._adaptive) return;
            const fps = metrics.fps;
            let newMode = this.mode;

            if (fps >= 55) {
                newMode = this._lastMode !== PERFORMANCE_MODES.ULTRA ? PERFORMANCE_MODES.HIGH : PERFORMANCE_MODES.ULTRA;
            } else if (fps >= 45) {
                newMode = PERFORMANCE_MODES.BALANCED;
            } else if (fps >= 35) {
                newMode = PERFORMANCE_MODES.LOW;
            } else {
                newMode = PERFORMANCE_MODES.POWER_SAVING;
            }

            // Hysteresis para evitar oscilação
            if (newMode !== this.mode) {
                this._hysteresis++;
                if (this._hysteresis > 3) {
                    this.setMode(newMode);
                    this._hysteresis = 0;
                }
            } else {
                this._hysteresis = 0;
            }
        });

        // Emite evento de modo alterado
        this._emit('performance:mode-change', { mode: this.mode, quality: this._currentQuality });
    }

    stop() {
        this._started = false;
        this.frameMonitor.stop();
    }

    /**
     * Define o modo de performance manualmente
     */
    setMode(mode) {
        if (!PERFORMANCE_MODES[mode.toUpperCase()]) {
            throw new Error(`Modo inválido: ${mode}`);
        }
        this.mode = mode;
        this._currentQuality = this._qualityLevels[mode];
        this._emit('performance:mode-change', { mode, quality: this._currentQuality });
        // Notifica módulos dependentes
        document.dispatchEvent(new CustomEvent('vessie:performance:mode', { detail: { mode, quality: this._currentQuality } }));
    }

    /**
     * Obtém a qualidade atual (objeto com parâmetros)
     */
    getQuality() {
        return { ...this._currentQuality };
    }

    /**
     * Ativa/desativa adaptação automática
     */
    setAdaptive(enabled) {
        this._adaptive = enabled;
        if (!enabled) {
            this.setMode(PERFORMANCE_MODES.BALANCED);
        }
    }

    /**
     * Define FPS alvo
     */
    setTargetFPS(fps) {
        this._targetFPS = fps;
    }

    /**
     * Obtém métricas atuais
     */
    getMetrics() {
        return {
            mode: this.mode,
            targetFPS: this._targetFPS,
            adaptive: this._adaptive,
            quality: { ...this._currentQuality },
            frame: this.frameMonitor.getMetrics()
        };
    }

    _emit(event, data) {
        if (window.VessieOS?.events) {
            window.VessieOS.events.emit(event, data);
        }
        for (const listener of this._listeners) {
            try { listener(event, data); } catch (e) { }
        }
    }

    on(event, callback) {
        this._listeners.push(callback);
    }

    destroy() {
        this.stop();
        this._listeners = [];
    }
}
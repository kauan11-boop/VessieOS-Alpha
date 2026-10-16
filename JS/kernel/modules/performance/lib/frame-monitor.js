/**
 * FrameMonitor – Monitora FPS, frame time e long frames
 * 
 * Utiliza requestAnimationFrame para calcular métricas de performance
 * e emite eventos quando detecta degradação.
 */
export class FrameMonitor {
    constructor(idleScheduler) {
        this.idleScheduler = idleScheduler;
        this._running = false;
        this._rafId = null;
        this._frames = [];
        this._maxSamples = 60;
        this._lastTimestamp = 0;
        this._droppedFrames = 0;
        this._longFrames = 0;
        this._fps = 60;
        this._frameTime = 16.67;
        this._onFrameCallback = null;
    }

    /**
     * Inicia o monitoramento
     */
    start() {
        if (this._running) return;
        this._running = true;
        this._lastTimestamp = performance.now();
        this._tick();
    }

    /**
     * Para o monitoramento
     */
    stop() {
        this._running = false;
        if (this._rafId) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
    }

    _tick() {
        if (!this._running) return;
        this._rafId = requestAnimationFrame((timestamp) => {
            const delta = timestamp - this._lastTimestamp;
            this._lastTimestamp = timestamp;

            // Acumula amostras
            this._frames.push({ timestamp, delta });
            if (this._frames.length > this._maxSamples) {
                this._frames.shift();
            }

            // Calcula métricas
            this._calculateMetrics();

            // Detecta long frames (> 50ms)
            if (delta > 50) {
                this._longFrames++;
                this._emitIfNeeded('longframe', { delta, timestamp });
            }

            // Detecta dropped frames (delta > 33.3ms)
            if (delta > 33.3) {
                this._droppedFrames++;
            }

            if (this._onFrameCallback) {
                this._onFrameCallback({ delta, fps: this._fps, frameTime: this._frameTime });
            }

            this._tick();
        });
    }

    _calculateMetrics() {
        if (this._frames.length < 2) {
            this._fps = 60;
            this._frameTime = 16.67;
            return;
        }
        const totalTime = this._frames[this._frames.length - 1].timestamp - this._frames[0].timestamp;
        const count = this._frames.length - 1;
        if (totalTime > 0) {
            this._fps = Math.round((count * 1000) / totalTime);
        }
        // Frame time médio
        const deltas = this._frames.slice(1).map((f, i) => f.delta);
        const avgDelta = deltas.reduce((a, b) => a + b, 0) / deltas.length;
        this._frameTime = Math.round(avgDelta * 100) / 100;
    }

    _emitIfNeeded(event, data) {
        // Emite evento via EventManager ou CustomEvent
        if (window.VessieOS?.events) {
            window.VessieOS.events.emit(`frame:${event}`, data);
        }
        document.dispatchEvent(new CustomEvent(`vessie:frame:${event}`, { detail: data }));
    }

    /**
     * Define um callback para cada frame
     */
    onFrame(callback) {
        this._onFrameCallback = callback;
    }

    /**
     * Obtém métricas atuais
     */
    getMetrics() {
        return {
            fps: this._fps,
            frameTime: this._frameTime,
            droppedFrames: this._droppedFrames,
            longFrames: this._longFrames,
            samples: this._frames.length
        };
    }

    /**
     * Verifica se a performance está degradada (FPS < 30)
     */
    isDegraded() {
        return this._fps < 30;
    }

    /**
     * Verifica se a performance está baixa (FPS < 45)
     */
    isLow() {
        return this._fps < 45;
    }

    destroy() {
        this.stop();
        this._frames = [];
    }
}
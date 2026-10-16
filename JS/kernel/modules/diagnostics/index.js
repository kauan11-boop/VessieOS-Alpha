/**
 * DiagnosticsManager – Fornece diagnóstico completo do sistema
 * 
 * Coleta informações de todos os módulos e APIs expostas.
 */
class DiagnosticsManager {
    constructor() {
        this._started = false;
    }

    init() {
        this._started = true;
    }

    /**
     * Obtém diagnóstico completo
     */
    getStatus() {
        const modules = this._getModulesInfo();
        const performance = this._getPerformanceInfo();
        const motionBlur = this._getMotionBlurInfo();
        const memory = this._getMemoryInfo();
        const errors = this._getErrors();

        return {
            timestamp: Date.now(),
            kernel: {
                version: window.VessieOS?.kernel?.version || 'unknown',
                state: window.VessieOS?.kernel?.state || 'unknown',
                uptime: window.VessieOS?.kernel?.bootTime ? Date.now() - window.VessieOS.kernel.bootTime : 0
            },
            modules,
            performance,
            motionBlur,
            memory,
            errors,
            runtime: {
                fps: this._getFPS(),
                frameTime: this._getFrameTime()
            }
        };
    }

    _getModulesInfo() {
        const moduleSystem = window.VessieOS?.modules || window.VessieOS?.kernel?.modules;
        if (!moduleSystem) return { registered: 0, active: [] };
        const list = moduleSystem.listModules ? moduleSystem.listModules() : [];
        return {
            registered: list.length,
            active: list.filter(name => {
                const mod = moduleSystem.getModule(name);
                return mod && mod._state === 'RUNNING';
            })
        };
    }

    _getPerformanceInfo() {
        const perfManager = window.VessieOS?.kernel?.performanceManager;
        if (!perfManager) return null;
        return perfManager.getMetrics();
    }

    _getMotionBlurInfo() {
        const motionBlur = window.VessieOS?.kernel?.motionBlurEngine;
        if (!motionBlur) return null;
        return motionBlur.getStatus();
    }

    _getMemoryInfo() {
        const memManager = window.VessieOS?.kernel?.memoryManager;
        if (!memManager) return null;
        return memManager.getStats();
    }

    _getErrors() {
        // Coleta erros do ErrorManager se existir
        if (window.VessieOS?.errors) {
            return window.VessieOS.errors.list();
        }
        return [];
    }

    _getFPS() {
        const monitor = window.VessieOS?.kernel?.frameMonitor;
        if (!monitor) return 0;
        return monitor.getMetrics().fps || 0;
    }

    _getFrameTime() {
        const monitor = window.VessieOS?.kernel?.frameMonitor;
        if (!monitor) return 0;
        return monitor.getMetrics().frameTime || 0;
    }

    /**
     * Retorna apenas um resumo
     */
    getSummary() {
        const full = this.getStatus();
        return {
            status: full.kernel.state,
            modules: full.modules.registered,
            fps: full.runtime.fps,
            memory: full.memory ? full.memory.used : 0,
            errors: full.errors.length
        };
    }

    destroy() {
        this._started = false;
    }
}

export default DiagnosticsManager;
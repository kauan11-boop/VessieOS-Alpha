/**
 * IdleScheduler – Agenda tarefas em momentos ociosos
 * 
 * Utiliza requestIdleCallback com fallback para setTimeout.
 * Permite prioridades e cancelamento.
 */
export class IdleScheduler {
    constructor() {
        this._tasks = [];
        this._running = false;
        this._idleId = null;
        this._timeoutId = null;
        this._useIdleCallback = typeof requestIdleCallback === 'function';
    }

    /**
     * Agenda uma tarefa para execução em momento ocioso
     * @param {Function} task - Função a ser executada
     * @param {Object} options - { priority, timeout, deadline }
     * @returns {Object} { cancel: Function, id: number }
     */
    schedule(task, options = {}) {
        const id = Date.now() + '_' + Math.random().toString(36).slice(2, 6);
        const entry = {
            id,
            task,
            priority: options.priority || 0,
            timeout: options.timeout || null,
            deadline: options.deadline || null,
            cancelled: false,
            executed: false
        };
        this._tasks.push(entry);
        this._tasks.sort((a, b) => b.priority - a.priority);
        if (!this._running) {
            this._running = true;
            this._scheduleNext();
        }
        return {
            cancel: () => {
                entry.cancelled = true;
            },
            id
        };
    }

    _scheduleNext() {
        if (this._idleId) {
            cancelIdleCallback(this._idleId);
            this._idleId = null;
        }
        if (this._timeoutId) {
            clearTimeout(this._timeoutId);
            this._timeoutId = null;
        }

        // Se não houver tarefas, para
        if (this._tasks.length === 0 || this._tasks.every(t => t.cancelled || t.executed)) {
            this._running = false;
            return;
        }

        // Filtra tarefas canceladas
        this._tasks = this._tasks.filter(t => !t.cancelled && !t.executed);

        if (this._tasks.length === 0) {
            this._running = false;
            return;
        }

        const entry = this._tasks[0];
        const execute = () => {
            if (entry.cancelled || entry.executed) {
                this._scheduleNext();
                return;
            }
            try {
                entry.task();
                entry.executed = true;
            } catch (e) {
                console.error('[IdleScheduler] Erro na tarefa:', e);
            }
            // Executa mais se houver tempo
            if (this._tasks.some(t => !t.cancelled && !t.executed)) {
                // Continua agendando
                this._scheduleNext();
            } else {
                this._running = false;
            }
        };

        if (this._useIdleCallback) {
            const options = {};
            if (entry.timeout) options.timeout = entry.timeout;
            this._idleId = requestIdleCallback((deadline) => {
                if (deadline.timeRemaining() > 0) {
                    execute();
                } else {
                    // Reagenda para o próximo idle
                    this._scheduleNext();
                }
            }, options);
        } else {
            // Fallback: setTimeout com atraso de 0
            this._timeoutId = setTimeout(execute, 0);
        }
    }

    /**
     * Cancela todas as tarefas pendentes
     */
    cancelAll() {
        for (const task of this._tasks) {
            task.cancelled = true;
        }
        this._tasks = [];
        this._running = false;
        if (this._idleId) {
            cancelIdleCallback(this._idleId);
            this._idleId = null;
        }
        if (this._timeoutId) {
            clearTimeout(this._timeoutId);
            this._timeoutId = null;
        }
    }

    /**
     * Obtém estatísticas
     */
    getStats() {
        const pending = this._tasks.filter(t => !t.cancelled && !t.executed).length;
        const executed = this._tasks.filter(t => t.executed).length;
        return { pending, executed, total: this._tasks.length };
    }

    destroy() {
        this.cancelAll();
    }
}
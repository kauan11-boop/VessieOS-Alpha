/**
 * TaskScheduler – Agendador de tarefas com prioridades
 * 
 * Permite agendar, cancelar e priorizar tarefas, utilizando
 * IdleScheduler para tarefas em background.
 */
class TaskScheduler {
    constructor(idleScheduler, performanceManager) {
        this.idleScheduler = idleScheduler;
        this.performanceManager = performanceManager;
        this.tasks = new Map();
        this._nextId = 0;
        this._running = false;
        this._intervalId = null;
    }

    /**
     * Agenda uma tarefa com prioridade
     * @param {Function} task - Função a ser executada
     * @param {Object} options - { priority, delay, recurring, context }
     * @returns {Object} { cancel, id }
     */
    schedule(task, options = {}) {
        const id = this._nextId++;
        const entry = {
            id,
            task,
            priority: options.priority || 0,
            delay: options.delay || 0,
            recurring: options.recurring || false,
            context: options.context || null,
            cancelled: false,
            executed: false,
            lastRun: null,
            nextRun: Date.now() + (options.delay || 0)
        };
        this.tasks.set(id, entry);
        this._processQueue();
        return {
            cancel: () => { entry.cancelled = true; },
            id
        };
    }

    /**
     * Processa a fila de tarefas (executa as que estão agendadas)
     */
    _processQueue() {
        if (this._running) return;
        this._running = true;
        this._intervalId = setInterval(() => {
            const now = Date.now();
            const toExecute = [];
            for (const [id, entry] of this.tasks) {
                if (entry.cancelled || entry.executed) continue;
                if (entry.nextRun <= now) {
                    toExecute.push(entry);
                }
            }
            // Ordena por prioridade (maior primeiro)
            toExecute.sort((a, b) => b.priority - a.priority);
            for (const entry of toExecute) {
                if (entry.cancelled) continue;
                try {
                    entry.task(entry.context);
                    entry.executed = true;
                    entry.lastRun = now;
                    if (entry.recurring) {
                        // Reagenda
                        entry.executed = false;
                        entry.nextRun = now + entry.delay;
                    } else {
                        this.tasks.delete(entry.id);
                    }
                } catch (e) {
                    console.error('[TaskScheduler] Erro na tarefa:', e);
                    this.tasks.delete(entry.id);
                }
            }
            // Se não houver tarefas, para o intervalo
            if (this.tasks.size === 0) {
                this._stopProcessing();
            }
        }, 100);
    }

    _stopProcessing() {
        if (this._intervalId) {
            clearInterval(this._intervalId);
            this._intervalId = null;
            this._running = false;
        }
    }

    /**
     * Cancela uma tarefa
     */
    cancel(id) {
        const entry = this.tasks.get(id);
        if (entry) {
            entry.cancelled = true;
            this.tasks.delete(id);
            return true;
        }
        return false;
    }

    /**
     * Cancela todas as tarefas
     */
    cancelAll() {
        this.tasks.clear();
        this._stopProcessing();
    }

    /**
     * Obtém estatísticas
     */
    getStats() {
        const pending = Array.from(this.tasks.values()).filter(t => !t.cancelled && !t.executed).length;
        return { pending, total: this.tasks.size };
    }

    destroy() {
        this.cancelAll();
        this._stopProcessing();
    }
}

export default TaskScheduler;
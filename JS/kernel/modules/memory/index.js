/**
 * MemoryManager – Gerenciador de memória virtual
 * 
 * Mantém alocações e libera recursos quando módulos são destruídos.
 * Integra com ResourceManager para rastrear alocações.
 */
class MemoryManager {
    constructor(resourceManager) {
        this.resourceManager = resourceManager;
        this.allocations = new Map();
        this._nextId = 0;
        this._totalAllocated = 0;
        this._maxMemory = 1024; // MB virtual
    }

    /**
     * Aloca memória para um módulo
     * @param {string} moduleId - Identificador do módulo
     * @param {number} size - Tamanho em MB
     * @param {any} data - Dados a serem armazenados
     * @returns {number} ID da alocação
     */
    allocate(moduleId, size, data = null) {
        if (this._totalAllocated + size > this._maxMemory) {
            throw new Error(`Memória insuficiente (${this._totalAllocated}/${this._maxMemory} MB)`);
        }
        const id = this._nextId++;
        const entry = {
            id,
            moduleId,
            size,
            data,
            allocatedAt: Date.now()
        };
        this.allocations.set(id, entry);
        this._totalAllocated += size;
        // Rastreia para cleanup
        if (this.resourceManager) {
            const ctx = this.resourceManager.createContext(moduleId);
            ctx.track({
                clearTimeout: () => {
                    this.free(id);
                }
            });
        }
        return id;
    }

    /**
     * Libera uma alocação
     */
    free(id) {
        const entry = this.allocations.get(id);
        if (!entry) return false;
        this._totalAllocated -= entry.size;
        this.allocations.delete(id);
        return true;
    }

    /**
     * Libera todas as alocações de um módulo
     */
    freeByModule(moduleId) {
        const ids = [];
        for (const [id, entry] of this.allocations) {
            if (entry.moduleId === moduleId) {
                ids.push(id);
            }
        }
        for (const id of ids) {
            this.free(id);
        }
        return ids.length;
    }

    /**
     * Lê dados de uma alocação
     */
    read(id) {
        const entry = this.allocations.get(id);
        return entry ? entry.data : null;
    }

    /**
     * Escreve dados em uma alocação
     */
    write(id, data) {
        const entry = this.allocations.get(id);
        if (!entry) return false;
        entry.data = data;
        return true;
    }

    /**
     * Obtém estatísticas
     */
    getStats() {
        return {
            total: this._maxMemory,
            used: this._totalAllocated,
            free: this._maxMemory - this._totalAllocated,
            allocations: this.allocations.size
        };
    }

    /**
     * Libera tudo
     */
    clear() {
        this.allocations.clear();
        this._totalAllocated = 0;
        this._nextId = 0;
    }
}

export default MemoryManager;
/**
 * ResourceManager – Gerencia recursos alocados para evitar vazamentos
 * 
 * Mantém listas de observers, listeners, timeouts, animation frames
 * e permite liberá-los em lote quando um módulo é destruído.
 */
class ResourceManager {
    constructor() {
        this.resources = new Map(); // moduleId -> Set de recursos
        this._idCounter = 0;
    }

    /**
     * Cria um contexto de recursos para um módulo
     * @param {string} moduleId - Identificador do módulo
     * @returns {Object} API para gerenciar recursos
     */
    createContext(moduleId) {
        if (!this.resources.has(moduleId)) {
            this.resources.set(moduleId, new Set());
        }
        const context = {
            track: (resource) => {
                const set = this.resources.get(moduleId);
                if (set) set.add(resource);
                return resource;
            },
            untrack: (resource) => {
                const set = this.resources.get(moduleId);
                if (set) set.delete(resource);
            },
            release: () => {
                this.release(moduleId);
            }
        };
        return context;
    }

    /**
     * Libera todos os recursos de um módulo
     * @param {string} moduleId 
     */
    release(moduleId) {
        const set = this.resources.get(moduleId);
        if (!set) return;
        for (const resource of set) {
            if (resource && typeof resource === 'object') {
                // Remove listeners
                if (resource.removeEventListener) {
                    resource.removeEventListener();
                }
                // Desconecta observers
                if (resource.disconnect) {
                    resource.disconnect();
                }
                // Cancela timers
                if (resource.clearTimeout) {
                    resource.clearTimeout();
                }
                // Cancela animation frames
                if (resource.cancelAnimationFrame) {
                    resource.cancelAnimationFrame();
                }
            }
        }
        set.clear();
        this.resources.delete(moduleId);
    }

    /**
     * Libera todos os recursos de todos os módulos
     */
    releaseAll() {
        for (const moduleId of this.resources.keys()) {
            this.release(moduleId);
        }
    }

    /**
     * Obtém estatísticas de recursos
     */
    getStats() {
        let total = 0;
        for (const set of this.resources.values()) {
            total += set.size;
        }
        return {
            modules: this.resources.size,
            resources: total
        };
    }
}

export default ResourceManager;
/**
 * VessieOS Module System
 * Manages automatic execution of complex systems and commands
 */

class ModuleSystem {
  constructor(config = {}) {
    this.modulePath = config.modulePath || './Module';
    this.modules = new Map();
    this.pipelines = [];
    this.isRunning = false;
    this.executedModules = [];
    this.executionLog = [];
    this.errorHandlers = [];
    this.successHandlers = [];
    this.executor = null;
  }

  setExecutor(executor) {
    this.executor = executor;
  }

  /**
   * Register a new module
   */
  registerModule(name, module) {
    if (typeof module !== 'object' || !module.execute) {
      throw new Error(`Invalid module: ${name} must have execute method`);
    }

    this.modules.set(name, {
      name,
      version: module.version || '1.0.0',
      dependencies: module.dependencies || [],
      execute: module.execute,
      validate: module.validate || (() => true),
      metadata: module.metadata || {}
    });

    this.log(`[Module] Registered: ${name}`);
    return true;
  }

  /**
   * Create an execution pipeline
   */
  createPipeline(name, modules) {
    const pipeline = {
      name,
      modules,
      status: 'pending',
      startTime: null,
      endTime: null,
      results: {},
      errors: []
    };

    // Validate pipeline
    for (const moduleName of modules) {
      if (!this.modules.has(moduleName)) {
        throw new Error(`Module not found: ${moduleName}`);
      }
    }

    this.pipelines.push(pipeline);
    return pipeline;
  }

  /**
   * Execute a pipeline with all modules running
   */
  async executePipeline(pipelineIndex, concurrent = true) {
    if (pipelineIndex >= this.pipelines.length) {
      return { error: 'Pipeline not found' };
    }

    this.isRunning = true;
    const pipeline = this.pipelines[pipelineIndex];
    pipeline.status = 'running';
    pipeline.startTime = Date.now();

    try {
      if (concurrent) {
        await this.executeConcurrent(pipeline);
      } else {
        await this.executeSequential(pipeline);
      }

      pipeline.status = 'completed';
      pipeline.endTime = Date.now();
      
      this.callSuccessHandlers(pipeline);
      return { success: true, pipeline };
      
    } catch (error) {
      pipeline.status = 'error';
      pipeline.endTime = Date.now();
      pipeline.errors.push(error.message);
      
      this.callErrorHandlers(pipeline, error);
      return { error: error.message, pipeline };
      
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Execute modules concurrently
   */
  async executeConcurrent(pipeline) {
    const promises = [];

    for (const moduleName of pipeline.modules) {
      const module = this.modules.get(moduleName);
      
      promises.push(
        this.executeModule(module, pipeline).catch(error => {
          pipeline.errors.push(`${moduleName}: ${error.message}`);
        })
      );
    }

    await Promise.all(promises);
  }

  /**
   * Execute modules sequentially
   */
  async executeSequential(pipeline) {
    for (const moduleName of pipeline.modules) {
      const module = this.modules.get(moduleName);
      await this.executeModule(module, pipeline);
    }
  }

  /**
   * Execute a single module
   */
  async executeModule(module, pipeline) {
    this.log(`[Pipeline] Executing module: ${module.name}`);

    if (!module.validate()) {
      throw new Error(`Module validation failed: ${module.name}`);
    }

    const startTime = Date.now();

    try {
      const result = await module.execute({
        executor: this.executor,
        pipeline,
        logger: (msg) => this.log(`[${module.name}] ${msg}`)
      });

      const duration = Date.now() - startTime;
      
      pipeline.results[module.name] = {
        success: true,
        result,
        duration
      };

      this.executedModules.push(module.name);
      this.log(`[Pipeline] ${module.name} completed in ${duration}ms`);

      return result;
      
    } catch (error) {
      throw new Error(`Module execution failed: ${module.name} - ${error.message}`);
    }
  }

  /**
   * Auto-execute all pipelines
   */
  async executeAll() {
    const results = [];

    for (let i = 0; i < this.pipelines.length; i++) {
      const result = await this.executePipeline(i, true);
      results.push(result);
    }

    return results;
  }

  /**
   * Load modules from filesystem (if available)
   */
  async loadModulesFromFS() {
    try {
      const response = await fetch(`/api/modules/list?path=${this.modulePath}`);
      
      if (!response.ok) {
        throw new Error('Cannot load modules from filesystem');
      }

      const files = await response.json();
      
      for (const file of files) {
        if (file.endsWith('.js')) {
          const moduleName = file.replace('.js', '');
          const moduleCode = await fetch(`/api/modules/load?name=${moduleName}`).then(r => r.text());
          
          // Dynamic import
          const module = new Function('return ' + moduleCode)();
          this.registerModule(moduleName, module);
        }
      }

      return true;
    } catch (error) {
      console.error('[ModuleSystem] Cannot load from FS:', error.message);
      return false;
    }
  }

  /**
   * Get pipeline status
   */
  getPipelineStatus(index) {
    return this.pipelines[index] || null;
  }

  /**
   * Get all pipelines
   */
  getAllPipelines() {
    return this.pipelines;
  }

  /**
   * Register error handler
   */
  onError(handler) {
    this.errorHandlers.push(handler);
  }

  /**
   * Register success handler
   */
  onSuccess(handler) {
    this.successHandlers.push(handler);
  }

  /**
   * Call error handlers
   */
  callErrorHandlers(pipeline, error) {
    this.errorHandlers.forEach(handler => {
      try {
        handler(pipeline, error);
      } catch (e) {
        console.error('Error handler failed:', e);
      }
    });
  }

  /**
   * Call success handlers
   */
  callSuccessHandlers(pipeline) {
    this.successHandlers.forEach(handler => {
      try {
        handler(pipeline);
      } catch (e) {
        console.error('Success handler failed:', e);
      }
    });
  }

  /**
   * Log a message
   */
  log(message) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      message
    };
    this.executionLog.push(logEntry);
    console.log(message);
  }

  /**
   * Get execution log
   */
  getExecutionLog(limit = 100) {
    return this.executionLog.slice(-limit);
  }

  /**
   * Clear execution log
   */
  clearExecutionLog() {
    this.executionLog = [];
    this.executedModules = [];
  }

  /**
   * Get the raw registered module entry (mutável — usado para guardar
   * referências como `_instance` depois que um módulo é instanciado).
   * Sem isso, o pipeline de `JS/kernel/modules/index.js` chamava um
   * método inexistente e a inicialização de todo o kernel de módulos
   * ES falhava silenciosamente.
   */
  getModule(name) {
    return this.modules.get(name) || null;
  }

  /**
   * Get module info
   */
  getModuleInfo(name) {
    const module = this.modules.get(name);
    return module ? {
      name: module.name,
      version: module.version,
      dependencies: module.dependencies,
      metadata: module.metadata
    } : null;
  }

  /**
   * List all modules
   */
  listModules() {
    return Array.from(this.modules.keys());
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ModuleSystem;
}

// Instancia e expõe globalmente em window.VessieOS.moduleSystem.
//
// IMPORTANTE — namespace deliberadamente diferente de `window.VessieOS.modules`:
// esse outro nome já é usado em todo o projeto (apps.js, taskbar.js,
// notifications.js, windows.js, execute-exes.js...) como um dicionário
// simples `{ nomeDoModulo: { init() {...} } }` sincronizado por
// `JS/systems/desktop/main.js` (syncModules). Se esta instância de
// ModuleSystem (baseada em pipelines com registerModule/executePipeline)
// fosse colocada na mesma chave, uma sobrescreveria a outra dependendo da
// ordem de carregamento — os dois sistemas de módulos nunca deveriam
// competir pelo mesmo nome. Antes desta correção, isso nunca tinha sido
// percebido porque este arquivo nem chegava a ser carregado no boot.
if (typeof window !== 'undefined') {
  window.VessieOS = window.VessieOS || {};
  if (!window.VessieOS.moduleSystem) {
    window.VessieOS.moduleSystem = new ModuleSystem();
    if (window.VessieOS.executor) {
      window.VessieOS.moduleSystem.setExecutor(window.VessieOS.executor);
    }
    document.dispatchEvent(new CustomEvent('vessieos:modulesystem-ready'));
  }
  window.VessieModuleSystem = ModuleSystem;
}

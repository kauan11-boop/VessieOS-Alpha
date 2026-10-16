(function () {
  const kernel = {
    bootTime: Date.now(),
    processId: 1000,
    processes: new Map(),
    services: new Map(),
    modules: new Map(),
    logs: [],
    memory: {
      total: 1024,
      used: 0,
      map: new Map()
    },
    boot() {
      this.log('info', 'Kernel booted successfully.', 'Kernel');
      this.registerService('kernel', this);
      return this;
    },
    registerService(name, service) {
      if (!name || !service) return null;
      this.services.set(name, service);
      return service;
    },
    getService(name) {
      return this.services.get(name) || null;
    },
    registerModule(name, module) {
      if (!name || !module) return null;
      this.modules.set(name, module);
      return module;
    },
    getModule(name) {
      return this.modules.get(name) || null;
    },
    log(level, message, source = 'Kernel') {
      const entry = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        level,
        source,
        message,
        stamp: new Date().toISOString()
      };
      this.logs.unshift(entry);
      if (this.logs.length > 200) this.logs.pop();
      return entry;
    },
    createProcess(definition) {
      const spec = {
        pid: this.processId++,
        name: definition.name || 'unknown.exe',
        path: definition.path || `C:/Program Files/${definition.name || 'App'}/${definition.name || 'App'}.exe`,
        state: definition.state || 'running',
        memory: definition.memory || 32,
        owner: definition.owner || 'system',
        cpu: definition.cpu || 0,
        startedAt: Date.now(),
        metadata: definition.metadata || {}
      };

      this.memory.used += spec.memory;
      spec.memoryUsed = spec.memory;
      this.processes.set(spec.pid, spec);
      this.log('info', `Process ${spec.name} started with PID ${spec.pid}.`, 'ProcessManager');
      return spec;
    },
    terminateProcess(pid) {
      const process = this.processes.get(pid);
      if (!process) return false;
      this.memory.used = Math.max(0, this.memory.used - (process.memory || 0));
      this.processes.delete(pid);
      this.log('warning', `Process ${process.name} terminated (PID ${pid}).`, 'ProcessManager');
      return true;
    },
    listProcesses() {
      return [...this.processes.values()].map((process) => ({
        pid: process.pid,
        name: process.name,
        path: process.path,
        state: process.state,
        memory: process.memory,
        owner: process.owner,
        cpu: process.cpu,
        startedAt: process.startedAt
      }));
    },
    health() {
      return {
        uptime: Date.now() - this.bootTime,
        processCount: this.processes.size,
        memory: {
          total: this.memory.total,
          used: this.memory.used,
          free: Math.max(0, this.memory.total - this.memory.used)
        },
        services: this.services.size,
        modules: this.modules.size
      };
    },
    reset() {
      this.processes.clear();
      this.logs.length = 0;
      this.memory.used = 0;
      this.log('info', 'Kernel reset invoked.', 'Kernel');
      return this;
    }
  };

  window.VessieOS = window.VessieOS || {};
  window.VessieOS.Kernel = kernel;
  window.VessieOS.kernel = kernel;
})();

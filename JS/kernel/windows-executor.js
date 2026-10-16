/**
 * Windows Executable Executor
 * Executes Windows .exe files with secure sandboxing
 */

class WindowsExecutor {
  constructor(config = {}) {
    this.executorPath = config.executorPath || 'VessieExecutor.exe';
    this.isAvailable = false;
    this.processQueue = [];
    this.isProcessing = false;
    this.timeout = config.timeout || 30000;
    this.workDir = config.workDir || 'C:\\VessieOS\\bin';
    this.maxConcurrent = config.maxConcurrent || 3;
    this.runningProcesses = 0;
    this.processCache = new Map();
  }

  async checkAvailability() {
    try {
      // Check if executor is available via local API
      const response = await fetch('/api/executor/check', { method: 'GET', timeout: 5000 });
      this.isAvailable = response.ok;
      return this.isAvailable;
    } catch (error) {
      console.warn('[WindowsExecutor] Executor not available:', error.message);
      this.isAvailable = false;
      return false;
    }
  }

  async execute(exePath, args = [], options = {}) {
    if (!this.isAvailable) {
      return { error: 'Windows Executor not available' };
    }

    const processId = this.generateProcessId();
    
    const process = {
      id: processId,
      exePath,
      args,
      options: { ...options, timeout: options.timeout || this.timeout },
      status: 'queued',
      createdAt: Date.now(),
      result: null
    };

    this.processQueue.push(process);
    this.processCache.set(processId, process);

    // Process queue if we haven't reached max concurrent
    if (this.runningProcesses < this.maxConcurrent) {
      this.processNext();
    }

    return { processId, status: 'queued' };
  }

  async processNext() {
    if (this.processQueue.length === 0 || this.runningProcesses >= this.maxConcurrent) {
      return;
    }

    this.isProcessing = true;
    const process = this.processQueue.shift();
    
    try {
      this.runningProcesses++;
      process.status = 'running';

      const payload = {
        executable: process.exePath,
        arguments: process.args,
        workingDirectory: process.options.workDir || this.workDir,
        timeout: process.options.timeout,
        environment: process.options.env || {},
        captureOutput: process.options.captureOutput !== false
      };

      const response = await fetch('/api/executor/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      process.status = 'completed';
      process.result = result;

      document.dispatchEvent(new CustomEvent('process-completed', {
        detail: { processId: process.id, result }
      }));

    } catch (error) {
      process.status = 'error';
      process.result = { error: error.message };

      document.dispatchEvent(new CustomEvent('process-error', {
        detail: { processId: process.id, error: error.message }
      }));
    } finally {
      this.runningProcesses--;
      this.processNext();
    }
  }

  async executeSync(exePath, args = [], options = {}) {
    const result = await this.execute(exePath, args, options);
    
    if (result.error) {
      return result;
    }

    return new Promise((resolve) => {
      const checkStatus = async () => {
        const process = this.processCache.get(result.processId);
        
        if (process && process.status === 'completed') {
          resolve(process.result);
        } else if (process && process.status === 'error') {
          resolve(process.result);
        } else {
          setTimeout(checkStatus, 100);
        }
      };

      checkStatus();
    });
  }

  async executeAsync(exePath, args = [], options = {}) {
    return this.execute(exePath, args, { ...options, async: true });
  }

  getProcessStatus(processId) {
    const process = this.processCache.get(processId);
    return process ? {
      id: process.id,
      status: process.status,
      result: process.result,
      createdAt: process.createdAt
    } : null;
  }

  cancelProcess(processId) {
    const process = this.processCache.get(processId);
    
    if (process && process.status === 'running') {
      // Send cancel request to executor
      fetch('/api/executor/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processId })
      });

      process.status = 'cancelled';
      return true;
    }
    return false;
  }

  getQueueStatus() {
    return {
      queueLength: this.processQueue.length,
      runningProcesses: this.runningProcesses,
      maxConcurrent: this.maxConcurrent,
      totalCached: this.processCache.size
    };
  }

  generateProcessId() {
    return `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  clearProcessCache() {
    this.processCache.clear();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = WindowsExecutor;
}

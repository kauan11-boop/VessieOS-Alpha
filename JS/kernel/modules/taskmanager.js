// taskmanager.js — Gerenciador de Tarefas do VessieOS
// Mostra processos, performance e recursos do sistema
// Dependências: window.S, window.VessieRuntime, window.RuntimeMetrics

(function () {
  "use strict";

  // Lista de processos do sistema
  let processes = [
    { pid: 0, name: 'System Idle Process', cpu: 0, mem: 0, status: 'running' },
    { pid: 4, name: 'System', cpu: 0.1, mem: 0.5, status: 'running' },
    { pid: 88, name: 'Registry', cpu: 0.2, mem: 1.2, status: 'running' },
    { pid: 100, name: 'VessieOS Kernel', cpu: 1.5, mem: 8.3, status: 'running' },
    { pid: 200, name: 'Desktop Window Manager', cpu: 3.2, mem: 45.6, status: 'running' },
    { pid: 300, name: 'Taskbar', cpu: 0.8, mem: 12.4, status: 'running' },
    { pid: 400, name: 'Start Menu', cpu: 0.5, mem: 8.9, status: 'running' },
    { pid: 500, name: 'VessieIA Engine', cpu: 2.1, mem: 128.5, status: 'running' },
    { pid: 600, name: 'Terminal', cpu: 0.3, mem: 5.2, status: 'running' },
    { pid: 700, name: 'Emulator (DOSBox)', cpu: 5.2, mem: 64.8, status: 'idle' }
  ];

  let nextPid = 800;

  // Adicionar processo
  function addProcess(name, cpu = 0, mem = 0) {
    const process = {
      pid: nextPid++,
      name,
      cpu,
      mem,
      status: 'running',
      startTime: Date.now()
    };
    processes.push(process);
    return process;
  }

  // Remover processo
  function removeProcess(pid) {
    const idx = processes.findIndex(p => p.pid === pid);
    if (idx >= 0) {
      processes.splice(idx, 1);
      return true;
    }
    return false;
  }

  // Finalizar processo (kill)
  function killProcess(pid) {
    const process = processes.find(p => p.pid === pid);
    if (process) {
      if (process.pid <= 4) {
        return { success: false, error: 'Não é possível finalizar processos do sistema.' };
      }
      removeProcess(pid);
      return { success: true, message: `Processo ${pid} (${process.name}) finalizado.` };
    }
    return { success: false, error: 'Processo não encontrado.' };
  }

  // Listar processos
  function listProcesses() {
    return [...processes];
  }

  // Obter informações de performance
  function getPerformance() {
    const totalCpu = processes.reduce((sum, p) => sum + p.cpu, 0);
    const totalMem = processes.reduce((sum, p) => sum + p.mem, 0);

    return {
      cpu: {
        usage: Math.min(totalCpu, 100),
        cores: 8,
        model: 'Intel Core i9-14900K'
      },
      memory: {
        total: 32768, // 32GB
        used: totalMem,
        free: 32768 - totalMem,
        usage: (totalMem / 32768) * 100
      },
      disk: {
        total: 1000, // 1TB
        used: 450,
        free: 550,
        usage: 45
      },
      uptime: Date.now() - (window.VessieRuntime?.started || Date.now())
    };
  }

  // Obter detalhes de um processo
  function getProcess(pid) {
    return processes.find(p => p.pid === pid) || null;
  }

  // Atualizar uso de CPU/MEM (simulação)
  function tick() {
    processes.forEach(p => {
      if (p.pid > 4) {
        // Variação aleatória no uso
        const cpuVariation = (Math.random() - 0.5) * 2;
        p.cpu = Math.max(0, Math.min(100, p.cpu + cpuVariation));
      }
    });
  }

  // Iniciar atualização periódica
  let tickInterval = null;
  function startMonitoring() {
    if (tickInterval) return;
    tickInterval = setInterval(tick, 3000);
  }

  function stopMonitoring() {
    if (tickInterval) {
      clearInterval(tickInterval);
      tickInterval = null;
    }
  }

  // Exportar
  window.VessieTaskManager = {
    addProcess,
    removeProcess,
    killProcess,
    listProcesses,
    getPerformance,
    getProcess,
    startMonitoring,
    stopMonitoring
  };

  // Auto-iniciar monitoramento
  try {
    startMonitoring();
  } catch (e) { }

})();
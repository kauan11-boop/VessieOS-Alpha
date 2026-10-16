/* Vessie/kernel.js - processos PID, background, IPC, sysinfo */
(function (global) {
'use strict';
const Kernel = {
  pidSeq: 1000, procs: {},
  boot() { this.mk('kernel', true); this.mk('fs-watcher', true); this.mk('gui-server', true); this.mk('network-service', true); return '[kernel] VessieOS boot OK'; },
  mk(nome, sistema, script) { const pid = ++this.pidSeq; this.procs[pid] = { pid, nome, estado: 'Running', cpu: 1 + Math.floor(Math.random() * 9), mem: 64 + Math.floor(Math.random() * 512), user: (global.Security ? global.Security.user : 'admin'), sistema: !!sistema, script: script || '', bg: false }; return pid; },
  start(nome, script, bg) { const pid = this.mk(nome, false, script); this.procs[pid].bg = !!bg; return pid; },
  kill(pid) { const p = this.procs[pid]; if (!p) return false; if (p.sistema && global.Security && global.Security.role !== 'admin') return false; delete this.procs[pid]; return true; },
  list() { return Object.values(this.procs); },
  sysinfo() { return { so: 'VessieOS 5.0', procs: Object.keys(this.procs).length, user: global.Security ? global.Security.user : 'admin', online: (typeof navigator !== 'undefined') ? navigator.onLine : true }; }
};
global.Kernel = Kernel;
if (typeof module !== 'undefined' && module.exports) module.exports = Kernel;
})(typeof window !== 'undefined' ? window : globalThis);

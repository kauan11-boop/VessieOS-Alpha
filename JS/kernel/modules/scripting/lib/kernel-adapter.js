/*!
 * VessieScript Kernel Adapter — "Adaptador de Kernel Real"
 * ----------------------------------------------------------------
 * Faz a ponte entre os comandos `fs.*`, `proc.*`, `registry.*` e
 * `log.*` do VessieScript (ver vessiescript-extensions.js) e o
 * KERNEL DE VERDADE do VessieOS (assets/vessieos-kernel/JS/kernel/):
 *
 *   window.VessieOS.FileSystem     <- JS/kernel/filesystem.js
 *   window.VessieOS.ProcessManager <- JS/kernel/process-manager.js
 *   window.VessieOS.Registry       <- JS/kernel/registry.js
 *   window.VessieOS.Logger         <- JS/kernel/logging.js
 *   window.VessieOS.kernel         <- JS/kernel/kernel.js (createProcess,
 *                                      terminateProcess, listProcesses, log, logs)
 *
 * Este arquivo é 100% opcional e não-destrutivo: se carregado ANTES ou
 * DEPOIS de vessiescript-extensions.js, o resultado é o mesmo, porque
 * `resolveBackend()` em vessiescript-extensions.js consulta
 * `window.VessieKernelAdapter` em tempo de chamada, não em tempo de
 * carregamento.
 *
 * - Se `window.VessieOS.*` já existir (rodando dentro do VessieOS real,
 *   com filesystem.js/process-manager.js/registry.js/logging.js
 *   carregados) → todo comando `fs/proc/registry/log` do VessieScript
 *   passa a operar sobre o kernel de verdade (VFS real, tabela de
 *   processos real do kernel, registry real, log real).
 * - Se `window.VessieOS.*` NÃO existir (script rodando isolado, num
 *   playground, ou via CLI Node) → cai automaticamente para um backend
 *   local equivalente (mesma interface), para que o mesmo `.vessie`
 *   funcione em ambos os contextos sem alterações.
 *
 * Uso dentro do kernel modular (Nível 2, `assets/vessieos-kernel/`):
 *   Adicione este arquivo como módulo do pipeline de scripting, seguindo
 *   a convenção de `JS/kernel/modules/scripting/index.js` — ele já
 *   assume que window.VessieOS foi populado pelos módulos do kernel
 *   antes do boot do interpretador VessieScript (ver kernel/loader.js).
 */
(function (root) {
  'use strict';

  const isBrowser = typeof window !== 'undefined';
  const globalObj = isBrowser ? window : (typeof global !== 'undefined' ? global : {});

  function getKernelNamespace() {
    return (globalObj.VessieOS) || null;
  }

  // -------------------------------------------------------------------------
  // Backend "kernel real" — só é usado quando window.VessieOS.* existe.
  // -------------------------------------------------------------------------
  function buildRealBackend(VessieOS) {
    const FS = VessieOS.FileSystem;
    const PM = VessieOS.ProcessManager;
    const REG = VessieOS.Registry;
    const KERNEL = VessieOS.kernel;

    return {
      meta: { kind: 'real-kernel' },
      fs: (function () {
        // Filesystem real do desktop (JS/core/main.js `VFS`, exposto em
        // window.VessieOS.FileSystem) — mesmos nomes de método que os
        // comandos fs.* do VessieScript já usam, então repassamos direto.
        // Terminal, Explorador de Arquivos e fs.* passam a compartilhar o
        // MESMO filesystem real (não duas simulações paralelas).
        if (typeof FS.read === 'function' && typeof FS.write === 'function') {
          return {
            read(path) { return FS.read(path); },
            write(path, content) { return FS.write(path, String(content)); },
            exists(path) { return FS.exists(path); },
            delete(path) { return FS.delete(path); },
            list(path) { return FS.list(path); },
            mkdir(path) { return FS.mkdir(path); },
          };
        }
        // Forma alternativa (filesystem.js standalone, fora do desktop real):
        // nós {type,value,children} via resolve()/add()/list().
        return {
          read(path) {
            if (!FS) return null;
            const node = FS.resolve(path);
            if (!node || node.type !== 'file') return null;
            return node.value === null || node.value === undefined ? '' : String(node.value);
          },
          write(path, content) {
            if (!FS) return false;
            return FS.add(path, { name: path.split('/').pop(), type: 'file', value: String(content), children: null });
          },
          exists(path) { return !!(FS && FS.resolve(path)); },
          delete(path) {
            // filesystem.js (versão de referência) não expõe remove(); fazemos
            // best-effort limpando o valor e deixando o node como "tombstone".
            if (!FS) return false;
            const node = FS.resolve(path);
            if (!node) return false;
            node.value = null;
            return true;
          },
          list(path) { return FS ? FS.list(path || 'SystemDrive') : []; },
          mkdir(path) { return FS ? FS.add(path, { name: path.split('/').pop(), type: 'folder', value: null, children: {} }) : false; },
        };
      }()),
      proc: {
        spawn(name, opts = {}) {
          if (PM) return PM.spawnExecutable({ name, ...opts });
          if (KERNEL) return KERNEL.createProcess({ name, ...opts });
          return null;
        },
        kill(pid) {
          if (PM) return PM.terminate(pid);
          if (KERNEL) return KERNEL.terminateProcess(pid);
          return false;
        },
        list() {
          if (PM) return PM.list();
          if (KERNEL) return KERNEL.listProcesses();
          return [];
        },
      },
      registry: {
        get(name) { return REG ? REG.get(name) : null; },
        set(name, value) { return REG ? REG.register(name, value) : value; },
        all() { return REG ? REG.all() : []; },
      },
      log: {
        write(level, message, source = 'VessieScript') {
          if (KERNEL && typeof KERNEL.log === 'function') return KERNEL.log(level, message, source);
          if (VessieOS.Logger && typeof VessieOS.Logger.add === 'function') return VessieOS.Logger.add(level, message, source);
          const fn = level === 'error' ? console.error : level === 'warning' ? console.warn : console.log;
          fn(`[${source}] ${message}`);
          return null;
        },
        list(n = 25) {
          if (VessieOS.Logger && typeof VessieOS.Logger.list === 'function') return VessieOS.Logger.list().slice(0, n);
          if (KERNEL && Array.isArray(KERNEL.logs)) return KERNEL.logs.slice(0, n);
          return [];
        },
      },
    };
  }

  // -------------------------------------------------------------------------
  // Backend local de reserva — usado quando window.VessieOS.* está ausente.
  // Mesma interface do backend real, para que o mesmo código VessieScript
  // funcione idêntico dentro ou fora do VessieOS.
  // -------------------------------------------------------------------------
  function buildFallbackBackend() {
    const hasLS = isBrowser && typeof window.localStorage !== 'undefined';
    const VFS_KEY = 'vessiescript:kerneladapter:vfs';
    let vfs = {};
    if (hasLS) {
      try { vfs = JSON.parse(window.localStorage.getItem(VFS_KEY) || '{}'); } catch (e) { vfs = {}; }
    }
    const persist = () => { if (hasLS) { try { window.localStorage.setItem(VFS_KEY, JSON.stringify(vfs)); } catch (e) { /* noop */ } } };

    let processes = [];
    let nextPid = 2000;
    const logs = [];
    const registry = {};

    return {
      meta: { kind: 'kernel-adapter-fallback (window.VessieOS ausente)' },
      fs: {
        read(path) { return Object.prototype.hasOwnProperty.call(vfs, path) ? vfs[path] : null; },
        write(path, content) { vfs[path] = String(content); persist(); return true; },
        exists(path) { return Object.prototype.hasOwnProperty.call(vfs, path); },
        delete(path) { const had = Object.prototype.hasOwnProperty.call(vfs, path); delete vfs[path]; persist(); return had; },
        list(prefix = '') { return Object.keys(vfs).filter((p) => p.startsWith(prefix || '')); },
        mkdir(path) { vfs[`${path.replace(/\/$/, '')}/.keep`] = ''; persist(); return true; },
      },
      proc: {
        spawn(name, opts = {}) {
          const p = { pid: nextPid++, name, state: 'running', memory: opts.memory || 32, owner: opts.owner || 'user', startedAt: Date.now() };
          processes.push(p);
          return p;
        },
        kill(pid) { const before = processes.length; processes = processes.filter((p) => p.pid !== pid); return processes.length < before; },
        list() { return processes.slice(); },
      },
      registry: {
        get(name) { return Object.prototype.hasOwnProperty.call(registry, name) ? registry[name] : null; },
        set(name, value) { registry[name] = value; return value; },
        all() { return Object.keys(registry).map((k) => ({ key: k, value: registry[k] })); },
      },
      log: {
        write(level, message, source = 'VessieScript') {
          const entry = { level, message, source, ts: Date.now() };
          logs.unshift(entry);
          if (logs.length > 500) logs.length = 500;
          const fn = level === 'error' ? console.error : level === 'warning' ? console.warn : console.log;
          fn(`[${source}] ${message}`);
          return entry;
        },
        list(n = 25) { return logs.slice(0, n); },
      },
    };
  }

  const fallback = buildFallbackBackend();

  /**
   * `window.VessieKernelAdapter` — este é o objeto que
   * `vessiescript-extensions.js` procura automaticamente. Reavalia a cada
   * chamada se o kernel real do VessieOS apareceu no meio tempo (ex.: script
   * carregado antes do resto do OS inicializar), então nunca fica "preso"
   * no fallback se o kernel de verdade subir depois.
   */
  function currentBackend() {
    const VessieOS = getKernelNamespace();
    const hasRealKernel = VessieOS && (VessieOS.FileSystem || VessieOS.ProcessManager || VessieOS.Registry || VessieOS.kernel);
    return hasRealKernel ? buildRealBackend(VessieOS) : fallback;
  }

  const proxy = {
    get meta() { return currentBackend().meta; },
    get fs() { return currentBackend().fs; },
    get proc() { return currentBackend().proc; },
    get registry() { return currentBackend().registry; },
    get log() { return currentBackend().log; },
    isRealKernelActive() { return currentBackend().meta.kind === 'real-kernel'; },
  };

  globalObj.VessieKernelAdapter = proxy;
  if (typeof module === 'object' && module.exports) module.exports = proxy;
}(typeof self !== 'undefined' ? self : (typeof global !== 'undefined' ? global : this)));

/*!
 * VessieScript Extensions — "Comandos Reais" para o VessieScript
 * ----------------------------------------------------------------
 * NÃO reimplementa o motor (Lexer/Parser/Interpreter continuam em
 * js/vessiescript.js, sem alterações). Este arquivo apenas ESTENDE
 * `Interpreter.prototype.installBuiltins`, adicionando bibliotecas
 * padrão novas como namespaces reais (`fs.*`, `proc.*`, `net.*`,
 * `json.*`, `string.*`, `math.*`, `time.*`, `events.*`, `storage.*`,
 * `registry.*`, `log.*`) mais funções globais de alta ordem
 * (`map`, `filter`, `reduce`, `sort`, `assert`, `clone`, `typeOf`).
 *
 * Cada comando aqui é uma função real (não um placeholder): `fs.write`
 * de fato grava dado (localStorage/IndexedDB/VFS do kernel conforme o
 * ambiente), `net.get` de fato faz um `fetch()`, `math.*` de fato usa
 * `Math`, etc. Os únicos comandos que dependem de o host prover algo
 * (ex.: escrever num disco de verdade) são os que fazem bridge para o
 * kernel real do VessieOS — ver `kernel-adapter.js`.
 *
 * Carregamento (ordem importa):
 *   <script src="vessiescript.js"></script>
 *   <script src="kernel-adapter.js"></script>   <!-- opcional, mas recomendado -->
 *   <script src="vessiescript-extensions.js"></script>
 *   <script src="csharp-adapter.js"></script>   <!-- opcional -->
 *
 * Funciona tanto no navegador (`window.VessieScript`) quanto em Node
 * (`require('./vessiescript.js')` + `require('./vessiescript-extensions.js')`).
 */
(function (root) {
  'use strict';

  const isBrowser = typeof window !== 'undefined';
  const globalObj = isBrowser ? window : (typeof global !== 'undefined' ? global : {});

  function loadEngine() {
    if (isBrowser && window.VessieScript) return window.VessieScript;
    if (typeof module === 'object' && module.exports) {
      // eslint-disable-next-line global-require
      return require('./vessiescript.js').VessieScript;
    }
    throw new Error('[VessieScript Extensions] motor vessiescript.js não encontrado — carregue-o antes.');
  }

  const VessieScript = loadEngine();
  const Interpreter = VessieScript.Interpreter;
  const native = (fn) => ({ __native: true, call: fn });
  const arg = (args, i, fallback = null) => (args[i] !== undefined ? args[i] : fallback);

  // ===========================================================================
  // Backend local (fallback) para fs / proc / registry / log quando o VessieOS
  // real não estiver presente. Se `kernel-adapter.js` tiver sido carregado,
  // `window.VessieKernelAdapter` assume prioridade automaticamente — ver
  // `resolveBackend()` abaixo.
  // ===========================================================================
  const LocalBackend = (function () {
    const hasLS = isBrowser && typeof window.localStorage !== 'undefined';
    const VFS_KEY = 'vessiescript:vfs';
    const REG_KEY = 'vessiescript:registry';

    function loadJSON(key, fallback) {
      if (!hasLS) return fallback;
      try {
        const raw = window.localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
      } catch (e) { return fallback; }
    }
    function saveJSON(key, value) {
      if (!hasLS) return;
      try { window.localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* quota etc */ }
    }

    let vfs = loadJSON(VFS_KEY, {});
    let registry = loadJSON(REG_KEY, {});
    let processes = [];
    let nextPid = 1000;
    const logs = [];

    return {
      fs: {
        read(path) { return Object.prototype.hasOwnProperty.call(vfs, path) ? vfs[path] : null; },
        write(path, content) { vfs[path] = String(content); saveJSON(VFS_KEY, vfs); return true; },
        exists(path) { return Object.prototype.hasOwnProperty.call(vfs, path); },
        delete(path) { const had = Object.prototype.hasOwnProperty.call(vfs, path); delete vfs[path]; saveJSON(VFS_KEY, vfs); return had; },
        list(prefix = '') {
          return Object.keys(vfs).filter((p) => p.startsWith(prefix));
        },
        mkdir(path) { const marker = `${path.replace(/\/$/, '')}/.keep`; vfs[marker] = ''; saveJSON(VFS_KEY, vfs); return true; },
      },
      proc: {
        spawn(name, opts = {}) {
          const p = { pid: nextPid++, name, state: 'running', memory: opts.memory || 32, owner: opts.owner || 'user', startedAt: Date.now() };
          processes.push(p);
          return p;
        },
        kill(pid) {
          const before = processes.length;
          processes = processes.filter((p) => p.pid !== pid);
          return processes.length < before;
        },
        list() { return processes.slice(); },
      },
      registry: {
        get(name) { return Object.prototype.hasOwnProperty.call(registry, name) ? registry[name] : null; },
        set(name, value) { registry[name] = value; saveJSON(REG_KEY, registry); return value; },
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
      meta: { kind: 'local-fallback' },
    };
  }());

  function resolveBackend() {
    if (globalObj.VessieKernelAdapter) return globalObj.VessieKernelAdapter;
    return LocalBackend;
  }

  // ===========================================================================
  // installExtendedBuiltins — chamado a partir de installBuiltins (patch abaixo)
  // ===========================================================================
  Interpreter.prototype.installExtendedBuiltins = function installExtendedBuiltins() {
    const self = this;
    const define = (name, value) => self.globals.define(name, value);

    // ---- fs.* (arquivos — real via kernel adapter ou VFS local persistido) ----
    define('fs', {
      read: native(async (a) => resolveBackend().fs.read(arg(a, 0))),
      write: native(async (a) => resolveBackend().fs.write(arg(a, 0), arg(a, 1, ''))),
      exists: native(async (a) => resolveBackend().fs.exists(arg(a, 0))),
      delete: native(async (a) => resolveBackend().fs.delete(arg(a, 0))),
      list: native(async (a) => resolveBackend().fs.list(arg(a, 0, ''))),
      mkdir: native(async (a) => resolveBackend().fs.mkdir(arg(a, 0))),
      backend: native(async () => (resolveBackend().meta && resolveBackend().meta.kind) || 'unknown'),
    });

    // ---- proc.* (processos — real via ProcessManager do kernel ou tabela local) ----
    define('proc', {
      spawn: native(async (a) => jsToVessie(resolveBackend().proc.spawn(arg(a, 0, 'processo'), vessieToJs(arg(a, 1, {}))))),
      kill: native(async (a) => resolveBackend().proc.kill(arg(a, 0))),
      list: native(async () => jsToVessie(resolveBackend().proc.list())),
    });

    // ---- registry.* (registro chave/valor persistente, real via kernel ou Map local) ----
    define('registry', {
      get: native(async (a) => jsToVessie(resolveBackend().registry.get(arg(a, 0)))),
      set: native(async (a) => resolveBackend().registry.set(arg(a, 0), vessieToJs(arg(a, 1)))),
      all: native(async () => jsToVessie(resolveBackend().registry.all())),
    });

    // ---- log.* (log real — kernel.log real ou console + buffer local) ----
    define('log', {
      info: native(async (a) => jsToVessie(resolveBackend().log.write('info', a.map((x) => self.stringify(x)).join(' ')))),
      warn: native(async (a) => jsToVessie(resolveBackend().log.write('warning', a.map((x) => self.stringify(x)).join(' ')))),
      error: native(async (a) => jsToVessie(resolveBackend().log.write('error', a.map((x) => self.stringify(x)).join(' ')))),
      debug: native(async (a) => jsToVessie(resolveBackend().log.write('debug', a.map((x) => self.stringify(x)).join(' ')))),
      list: native(async (a) => jsToVessie(resolveBackend().log.list(arg(a, 0, 25)))),
    });

    // ---- net.* (rede real via fetch — sujeita a CORS, como qualquer fetch do navegador) ----
    define('net', {
      get: native(async (a) => {
        const url = arg(a, 0);
        const res = await fetch(url, { method: 'GET' });
        const text = await res.text();
        return { status: res.status, ok: res.ok, body: text };
      }),
      post: native(async (a) => {
        const url = arg(a, 0);
        const body = vessieToJs(arg(a, 1, {}));
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: typeof body === 'string' ? body : JSON.stringify(body),
        });
        const text = await res.text();
        return { status: res.status, ok: res.ok, body: text };
      }),
    });

    // ---- json.* (real: usa JSON.parse/stringify do próprio motor JS) ----
    define('json', {
      parse: native(async (a) => {
        const parsed = JSON.parse(arg(a, 0));
        return jsToVessie(parsed);
      }),
      stringify: native(async (a) => JSON.stringify(vessieToJs(arg(a, 0)), null, arg(a, 1) ? 2 : 0)),
    });

    // ---- string.* (manipulação de texto real) ----
    define('string', {
      upper: native(async (a) => String(arg(a, 0, '')).toUpperCase()),
      lower: native(async (a) => String(arg(a, 0, '')).toLowerCase()),
      trim: native(async (a) => String(arg(a, 0, '')).trim()),
      split: native(async (a) => String(arg(a, 0, '')).split(arg(a, 1, ''))),
      join: native(async (a) => (Array.isArray(arg(a, 0)) ? arg(a, 0) : []).map((x) => self.stringify(x)).join(arg(a, 1, ''))),
      replace: native(async (a) => String(arg(a, 0, '')).split(arg(a, 1, '')).join(arg(a, 2, ''))),
      includes: native(async (a) => String(arg(a, 0, '')).includes(arg(a, 1, ''))),
      startsWith: native(async (a) => String(arg(a, 0, '')).startsWith(arg(a, 1, ''))),
      endsWith: native(async (a) => String(arg(a, 0, '')).endsWith(arg(a, 1, ''))),
      repeat: native(async (a) => String(arg(a, 0, '')).repeat(Math.max(0, Number(arg(a, 1, 0))))),
      padStart: native(async (a) => String(arg(a, 0, '')).padStart(Number(arg(a, 1, 0)), arg(a, 2, ' '))),
      padEnd: native(async (a) => String(arg(a, 0, '')).padEnd(Number(arg(a, 1, 0)), arg(a, 2, ' '))),
      format: native(async (a) => {
        const [tmpl, ...rest] = a;
        return String(tmpl).replace(/\{(\d+)\}/g, (m, i) => self.stringify(rest[Number(i)]));
      }),
    });

    // ---- math.* (real: Math nativo do JS) ----
    define('math', {
      abs: native(async (a) => Math.abs(Number(arg(a, 0)))),
      min: native(async (a) => Math.min(...a.map(Number))),
      max: native(async (a) => Math.max(...a.map(Number))),
      pow: native(async (a) => Math.pow(Number(arg(a, 0)), Number(arg(a, 1)))),
      sqrt: native(async (a) => Math.sqrt(Number(arg(a, 0)))),
      round: native(async (a) => Math.round(Number(arg(a, 0)))),
      ceil: native(async (a) => Math.ceil(Number(arg(a, 0)))),
      sin: native(async (a) => Math.sin(Number(arg(a, 0)))),
      cos: native(async (a) => Math.cos(Number(arg(a, 0)))),
      clamp: native(async (a) => Math.min(Math.max(Number(arg(a, 0)), Number(arg(a, 1))), Number(arg(a, 2)))),
      PI: Math.PI,
    });

    // ---- time.* (real: Date/performance do JS) ----
    define('time', {
      now: native(async () => Date.now()),
      isoNow: native(async () => new Date().toISOString()),
      format: native(async (a) => new Date(Number(arg(a, 0, Date.now()))).toLocaleString()),
      sleepMs: native(async (a) => new Promise((r) => setTimeout(r, Number(arg(a, 0, 0))))),
    });

    // ---- storage.* (persistência key/value — localStorage real no navegador) ----
    define('storage', (function () {
      const mem = new Map();
      const ls = isBrowser && typeof window.localStorage !== 'undefined' ? window.localStorage : null;
      return {
        get: native(async (a) => {
          const key = `vessiescript:kv:${arg(a, 0)}`;
          if (ls) { const v = ls.getItem(key); return v === null ? null : JSON.parse(v); }
          return mem.has(key) ? mem.get(key) : null;
        }),
        set: native(async (a) => {
          const key = `vessiescript:kv:${arg(a, 0)}`;
          const value = arg(a, 1);
          if (ls) ls.setItem(key, JSON.stringify(vessieToJs(value))); else mem.set(key, value);
          return value;
        }),
        remove: native(async (a) => {
          const key = `vessiescript:kv:${arg(a, 0)}`;
          if (ls) ls.removeItem(key); else mem.delete(key);
          return true;
        }),
      };
    }()));

    // ---- events.* (barramento de eventos runtime — IPC entre scripts/janelas) ----
    define('events', (function () {
      const bus = self._eventBus || (self._eventBus = new Map());
      return {
        on: native(async (a) => {
          const [name, handler] = a;
          if (!bus.has(name)) bus.set(name, []);
          bus.get(name).push(handler);
          return true;
        }),
        off: native(async (a) => {
          const [name, handler] = a;
          if (!bus.has(name)) return false;
          const list = bus.get(name).filter((h) => h !== handler);
          bus.set(name, list);
          return true;
        }),
        emit: native(async (a) => {
          const [name, ...rest] = a;
          const handlers = bus.get(name) || [];
          const out = [];
          for (const h of handlers) out.push(await self.callFunction(h, rest));
          return out;
        }),
      };
    }()));

    // ---- Funções globais de alta ordem (usam func values reais do VessieScript) ----
    define('map', native(async (a) => {
      const [array, fn] = a;
      const out = [];
      for (let i = 0; i < array.length; i++) out.push(await self.callFunction(fn, [array[i], i]));
      return out;
    }));
    define('filter', native(async (a) => {
      const [array, fn] = a;
      const out = [];
      for (let i = 0; i < array.length; i++) {
        if (self.constructor === Interpreter && truthyLocal(await self.callFunction(fn, [array[i], i]))) out.push(array[i]);
      }
      return out;
    }));
    define('reduce', native(async (a) => {
      const [array, fn, init] = a;
      let acc = init;
      for (let i = 0; i < array.length; i++) acc = await self.callFunction(fn, [acc, array[i], i]);
      return acc;
    }));
    define('sort', native(async (a) => {
      const [array, fn] = a;
      const copy = array.slice();
      if (!fn) { copy.sort(); return copy; }
      // insertion sort estável, usando comparador async definido em VessieScript
      for (let i = 1; i < copy.length; i++) {
        const item = copy[i];
        let j = i - 1;
        // eslint-disable-next-line no-await-in-loop
        while (j >= 0 && (await self.callFunction(fn, [copy[j], item])) > 0) { copy[j + 1] = copy[j]; j--; }
        copy[j + 1] = item;
      }
      return copy;
    }));
    define('assert', native(async (a) => {
      const [cond, msg] = a;
      if (!truthyLocal(cond)) self.error(`Assertion falhou${msg ? `: ${self.stringify(msg)}` : ''}`);
      return true;
    }));
    define('clone', native(async (a) => jsToVessie(JSON.parse(JSON.stringify(vessieToJs(arg(a, 0)))))));
    define('typeOf', native(async (a) => {
      const v = arg(a, 0);
      if (v === null || v === undefined) return 'null';
      if (Array.isArray(v)) return 'array';
      if (v instanceof Map) return 'map';
      if (typeof v === 'number') return 'number';
      if (typeof v === 'string') return 'string';
      if (typeof v === 'boolean') return 'bool';
      if (v.__native || (v.decl && v.closure !== undefined)) return 'function';
      return 'object';
    }));

    function truthyLocal(v) {
      if (v === null || v === undefined) return false;
      if (Array.isArray(v)) return v.length > 0;
      return !!v;
    }

    function vessieToJs(v) {
      if (v instanceof Map) {
        const o = {};
        for (const [k, val] of v.entries()) o[k] = vessieToJs(val);
        return o;
      }
      if (Array.isArray(v)) return v.map(vessieToJs);
      return v;
    }
    function jsToVessie(v) {
      if (Array.isArray(v)) return v.map(jsToVessie);
      if (v && typeof v === 'object') {
        const m = new Map();
        for (const k of Object.keys(v)) m.set(k, jsToVessie(v[k]));
        return m;
      }
      return v;
    }

    this._vessieToJs = vessieToJs;
    this._jsToVessie = jsToVessie;
  };

  // ---- Patch não-destrutivo: installBuiltins original + extendida --------
  const originalInstallBuiltins = Interpreter.prototype.installBuiltins;
  Interpreter.prototype.installBuiltins = function patchedInstallBuiltins() {
    originalInstallBuiltins.call(this);
    this.installExtendedBuiltins();
  };

  if (isBrowser) window.VessieScriptExtensions = { installed: true, resolveBackend, LocalBackend };
  if (typeof module === 'object' && module.exports) module.exports = { installed: true, resolveBackend, LocalBackend };
}(typeof self !== 'undefined' ? self : (typeof global !== 'undefined' ? global : this)));

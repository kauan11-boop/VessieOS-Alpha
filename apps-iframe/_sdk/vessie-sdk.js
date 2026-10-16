/**
 * Vessie SDK — roda DENTRO do iframe do app. Único caminho para o sistema operacional.
 *
 *   await Vessie.ready                                   // handshake (traz permissões e tema)
 *   await Vessie.run('text.upper', { s: 'oi' })          // 'OI'
 *   await Vessie.run('math.add', [2, 3])                 // argumentos posicionais também valem → 5
 *   await Vessie.cmd.window.self.title({ title: 'X' })   // mesmo comando, em forma de objeto
 *   Vessie.on('vessieos:app-opened', d => ...)           // eventos do sistema (permissão "kernel")
 *   const todos = await Vessie.commands('text')          // catálogo (filtra por namespace)
 */
(function () {
  'use strict';
  const pending = new Map(), handlers = {};
  let seq = 0, info = null, resolveReady;
  const ready = new Promise(r => resolveReady = r);
  const post = m => parent.postMessage(Object.assign({ vessie: 1 }, m), '*');

  window.addEventListener('message', e => {
    if (e.source !== parent) return;
    const m = e.data; if (!m || m.vessie !== 1) return;
    if (m.hello) {
      info = m.app; Object.entries(m.tokens || {}).forEach(([k, v]) => v && document.documentElement.style.setProperty(k, v));
      return resolveReady(Object.assign({ commandCount: m.count }, m.app));
    }
    if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); clearTimeout(p.t); return m.ok ? p.res(m.result) : p.rej(new Error(m.error)); }
    if (m.event) (handlers[m.event] || []).forEach(f => { try { f(m.data); } catch (_) { } });
  });

  function run(cmd, args, timeout) {
    return new Promise((res, rej) => {
      const id = ++seq;
      pending.set(id, { res, rej, t: setTimeout(() => { pending.delete(id); rej(new Error('tempo esgotado: ' + cmd)); }, timeout || 30000) });
      post({ id, cmd, args });
    });
  }
  const chain = path => new Proxy(function () { }, {
    get: (_, k) => chain(path.concat(String(k))),
    apply: (_, __, a) => run(path.join('.'), a.length === 1 && a[0] && typeof a[0] === 'object' && !Array.isArray(a[0]) ? a[0] : a),
  });

  const Vessie = {
    ready, run, cmd: chain([]),
    get app() { return info; },
    commands: ns => run('cmd.list', { ns }),
    on(event, fn) { (handlers[event] = handlers[event] || []).push(fn); return run('kernel.subscribe', { name: event }); },
    off(event, fn) { handlers[event] = (handlers[event] || []).filter(f => f !== fn); if (!handlers[event].length) return run('kernel.unsubscribe', { name: event }); },
    /** Tenta o comando e devolve `fallback` se falhar (ex.: sem permissão). */
    try: (cmd, args, fallback) => run(cmd, args).catch(() => fallback),
  };
  window.Vessie = Vessie;
  post({ hello: true });
})();

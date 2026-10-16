/**
 * Vessie App Host — abre aplicativos separados (HTML + CSS + JS) em <iframe> isolado.
 *
 *  • Cada app vive em apps-iframe/<id>/ (index.html + style.css + app.js) e é registrado em apps-iframe/registry.js
 *  • O iframe usa sandbox SEM allow-same-origin: o app não enxerga o DOM, o localStorage nem o VFS do sistema
 *  • Tudo que mexe no SO vira COMANDO (commands.js / system-commands.js), chamado por postMessage
 *  • Permissões por namespace vêm do manifesto; comandos `danger` exigem "admin" + confirmação do usuário
 *  • Apps criados pelo usuário (App Builder) ficam em localStorage e abrem via srcdoc, com as mesmas regras
 */
(function () {
  'use strict';
  const V = window.VessieCommands; if (!V) { console.warn('[AppHost] commands.js ausente'); return; }
  const SRC = (document.currentScript && document.currentScript.src) || location.href;
  const ROOT = new URL('../../../../', SRC).href;
  const USER_KEY = 'vessieos:userapps';
  const frames = new WeakMap();     // contentWindow -> ctx
  const SYSTEM_NS = new Set(['system', 'window', 'app', 'fs', 'storage', 'clipboard', 'notify', 'theme', 'audio', 'net', 'ai', 'neural', 'power', 'kernel']);

  const builtin = () => (window.VESSIE_APP_REGISTRY || []).map(a => Object.assign({ user: false }, a));
  const users = () => { try { return JSON.parse(localStorage.getItem(USER_KEY) || '[]'); } catch (_) { return []; } };
  const saveUsers = l => localStorage.setItem(USER_KEY, JSON.stringify(l));
  const find = id => builtin().find(a => a.id === id) || users().map(u => Object.assign({ user: true }, u)).find(a => a.id === id);
  const sdkUrl = ROOT + 'apps-iframe/_sdk/vessie-sdk.js', uiUrl = ROOT + 'apps-iframe/_sdk/vessie-ui.css';

  function list() {
    return builtin().concat(users().map(u => Object.assign({ user: true }, u))).map(a => ({ id: a.id, name: a.name, icon: a.icon, user: !!a.user, permissions: a.permissions || [], cat: a.cat || 'util' }));
  }

  /* ---------- srcdoc dos apps do usuário ---------- */
  const esc = s => String(s).replace(/<\/(script|style)/gi, '<\\/$1');
  function srcdocOf(u) {
    return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="stylesheet" href="${uiUrl}"><style>${esc(u.css || '')}</style></head><body>${u.html || ''}
<script src="${sdkUrl}"><\/script><script>${esc(u.js || '')}<\/script></body></html>`;
  }

  /* ---------- abrir ---------- */
  function open(id) {
    const spec = find(id); if (!spec) return null;
    const [w, h] = spec.size || [860, 600];
    const perms = new Set(spec.permissions || []);
    const attrs = 'class="vapp-frame" sandbox="allow-scripts allow-forms allow-modals allow-downloads" style="border:0;width:100%;height:100%;display:block;background:transparent" title="' + spec.name.replace(/"/g, '') + '"';
    const win = window.createWin(spec.name, '<i class="fas ' + (spec.icon || 'fa-cube') + '"></i>', '<iframe ' + attrs + '></iframe>', w, h);
    const frame = win.querySelector('iframe');
    const ctx = { app: { id: spec.id, name: spec.name, permissions: perms, user: !!spec.user }, win, frame, host: API, subs: new Map(), calls: [] };
    frames.set(frame.contentWindow, ctx);
    if (spec.user) frame.srcdoc = srcdocOf(spec); else frame.src = ROOT + 'apps-iframe/' + spec.id + '/index.html';
    win.dataset.app = spec.id;
    return win;
  }

  /* ---------- execução de comandos ---------- */
  function limited(ctx) { const now = Date.now(); ctx.calls = ctx.calls.filter(t => now - t < 1000); if (ctx.calls.length >= 150) return true; ctx.calls.push(now); return false; }
  async function run(ctx, name, args) {
    const c = V.registry.get(name); if (!c) throw new Error('comando inexistente: ' + name);
    const p = ctx.app.permissions;
    if (!V.PURE.has(c.ns) && !p.has(c.ns) && !p.has('*')) throw new Error('sem permissão "' + c.ns + '" para ' + name);
    if (c.danger) {
      if (!p.has('admin')) throw new Error(name + ' exige a permissão "admin"');
      if (!API.confirm(ctx, c)) throw new Error('negado pelo usuário');
    }
    if (Array.isArray(args)) args = Object.fromEntries(c.args.map((k, i) => [k, args[i]]));
    return c.fn(args || {}, ctx);
  }
  const clean = v => { if (v === undefined) return null; try { return JSON.parse(JSON.stringify(v)); } catch (_) { return String(v); } };

  window.addEventListener('message', async e => {
    const ctx = frames.get(e.source), m = e.data;
    if (!ctx || !m || m.vessie !== 1) return;                 // só aceita mensagens dos iframes que ESTE host abriu
    const reply = o => { try { e.source.postMessage(Object.assign({ vessie: 1 }, o), '*'); } catch (_) { } };
    if (m.hello) { let tokens = {}; try { tokens = V.registry.get('theme.tokens').fn(); } catch (_) { } return reply({ hello: true, app: { id: ctx.app.id, name: ctx.app.name, permissions: [...ctx.app.permissions] }, tokens, count: V.count() }); }
    if (typeof m.cmd !== 'string') return;
    if (limited(ctx)) return reply({ id: m.id, ok: false, error: 'limite de chamadas excedido (150/s)' });
    try { reply({ id: m.id, ok: true, result: clean(await run(ctx, m.cmd, m.args)) }); }
    catch (err) { reply({ id: m.id, ok: false, error: (err && err.message) || String(err) }); }
  });

  /* ---------- eventos do sistema → app ---------- */
  function subscribe(ctx, name) {
    if (!/^(vessieos|vessie):/.test(name)) throw new Error('só eventos vessieos:* ou vessie:*');
    if (ctx.subs.has(name)) return true;
    const h = ev => {
      if (!document.body.contains(ctx.win)) { document.removeEventListener(name, h); return; }   // janela fechada: limpa
      try { ctx.frame.contentWindow.postMessage({ vessie: 1, event: name, data: clean(ev.detail) }, '*'); } catch (_) { }
    };
    ctx.subs.set(name, h); document.addEventListener(name, h); return true;
  }
  function unsubscribe(ctx, name) { const h = ctx.subs.get(name); if (h) { document.removeEventListener(name, h); ctx.subs.delete(name); } return !!h; }

  /* ---------- apps do usuário ---------- */
  const KNOWN = new Set([...SYSTEM_NS, 'admin', '*']);
  function install(app) {
    app = app || {};
    if (!/^[a-z0-9-]{2,32}$/.test(app.id || '')) throw new Error('id inválido (use a–z, 0–9 e hífen, 2–32 caracteres)');
    if (builtin().some(b => b.id === app.id)) throw new Error('esse id pertence a um app do sistema');
    const rec = { id: app.id, name: String(app.name || app.id).slice(0, 40), icon: /^fa-[\w-]+$/.test(app.icon || '') ? app.icon : 'fa-cube', html: String(app.html || ''), css: String(app.css || ''), js: String(app.js || ''), permissions: (app.permissions || []).filter(p => KNOWN.has(p)), size: [860, 600] };
    const l = users().filter(u => u.id !== rec.id); l.push(rec); saveUsers(l);
    syncStartMenu(); document.dispatchEvent(new CustomEvent('vessieos:apps-changed', { detail: { id: rec.id } }));
    return { id: rec.id, permissions: rec.permissions };
  }
  function uninstall(id) {
    const l = users(); if (!l.some(u => u.id === id)) throw new Error('app do usuário não encontrado');
    saveUsers(l.filter(u => u.id !== id));
    if (Array.isArray(window.APPS)) { const i = window.APPS.findIndex(a => a.id === id); if (i >= 0) window.APPS.splice(i, 1); }
    syncStartMenu(); return true;
  }
  function source(id) { const u = users().find(x => x.id === id); if (!u) throw new Error('app do usuário não encontrado'); return u; }
  function syncStartMenu() {
    if (!Array.isArray(window.APPS)) return;
    users().forEach(u => { const a = { id: u.id, n: u.name, ic: '<i class="fas ' + u.icon + '"></i>', cat: 'util' }; const i = window.APPS.findIndex(x => x.id === u.id); if (i >= 0) window.APPS[i] = a; else window.APPS.push(a); });
    if (typeof window.renderStartMenu === 'function') try { window.renderStartMenu(); } catch (_) { }
  }
  document.addEventListener('vessieos:startmenu-rendered', () => { if (Array.isArray(window.APPS) && users().some(u => !window.APPS.some(a => a.id === u.id))) syncStartMenu(); });

  // Confirmação de comandos perigosos; substituível (ex.: por um diálogo próprio do sistema ou nos testes).
  const confirmDanger = (ctx, c) => window.confirm('O app "' + ctx.app.name + '" quer executar:\n\n' + c.name + ' — ' + c.desc + '\n\nPermitir?');
  const API = { open, list, source, install, uninstall, subscribe, unsubscribe, run, confirm: confirmDanger, root: ROOT, frames };
  window.VessieAppHost = API;
})();

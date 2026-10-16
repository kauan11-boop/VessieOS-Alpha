/**
 * Comandos de SISTEMA do VessieOS — tudo que mexe no SO ou interage com ele.
 * Cada comando pertence a um namespace que o app precisa declarar em `permissions` no manifesto.
 * Handlers recebem (args, ctx): ctx = { app:{id,name,permissions}, win, frame, host }.
 */
(function () {
  'use strict';
  const V = window.VessieCommands; if (!V) return;
  const def = V.def, D = (n, d, a, f) => def(n, d, a, f, { danger: true });
  const num = Number, W = () => window.VessieWM;
  const winEl = id => { const e = document.getElementById(id); if (!e || !e.classList.contains('win')) throw new Error('janela inexistente: ' + id); return e; };
  const wInfo = e => { const r = e.getBoundingClientRect(); return { id: e.id, title: (e.querySelector('.w-title') || {}).textContent || '', app: e.dataset.app || null, x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height), maximized: e.classList.contains('maximized'), focused: e.classList.contains('focused') }; };
  const ownId = ctx => { if (!ctx.win) throw new Error('este app não tem janela própria'); return ctx.win.id; };
  const click = (e, act) => { const b = e.querySelector(`[data-act="${act}"]`); if (b) b.click(); return !!b; };
  const sk = (ctx, k) => 'vessieos:app:' + ctx.app.id + ':' + k;
  const SH = 'vessieos:shared:';
  const jget = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (_) { return d; } };
  const lm = () => (localStorage.getItem('vessie_local_ip') || 'http://localhost:1234').replace(/\/$/, '');
  const timed = (ms) => { const c = new AbortController(); setTimeout(() => c.abort(), ms); return c.signal; };
  let audioCtx; const ac = () => audioCtx || (audioCtx = new (window.AudioContext || window.webkitAudioContext)());

  /* ---------- system ---------- */
  def('system.info', 'Resumo do sistema', '', () => ({ os: 'VessieOS', version: '1.0.3', user: (window.S && S.user) || 'Visitante', lang: navigator.language, platform: navigator.platform, cores: navigator.hardwareConcurrency || null, memoryGB: navigator.deviceMemory || null, online: navigator.onLine, windows: document.querySelectorAll('.win').length }));
  def('system.version', 'Versão do VessieOS', '', () => '1.0.3');
  def('system.user', 'Nome do usuário', '', () => (window.S && S.user) || 'Visitante');
  def('system.uptime', 'Tempo ligado (s)', '', () => Math.round(performance.now() / 1000));
  def('system.locale', 'Idioma', '', () => navigator.language);
  def('system.timezone', 'Fuso horário', '', () => Intl.DateTimeFormat().resolvedOptions().timeZone);
  def('system.online', 'Há internet?', '', () => navigator.onLine);
  def('system.cores', 'Núcleos de CPU', '', () => navigator.hardwareConcurrency || null);
  def('system.memory', 'Memória (GB aprox. + heap JS)', '', () => ({ deviceGB: navigator.deviceMemory || null, heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null }));
  def('system.screen', 'Tela', '', () => ({ w: screen.width, h: screen.height, dpr: window.devicePixelRatio, colorDepth: screen.colorDepth }));
  def('system.viewport', 'Área útil do desktop', '', () => ({ w: innerWidth, h: innerHeight }));
  def('system.battery', 'Bateria', '', async () => { if (!navigator.getBattery) return null; const b = await navigator.getBattery(); return { level: Math.round(b.level * 100), charging: b.charging }; });
  def('system.fullscreen', 'Entra/sai de tela cheia', 'on', async ({ on = true }) => { if (on) await document.documentElement.requestFullscreen(); else if (document.fullscreenElement) await document.exitFullscreen(); return !!document.fullscreenElement; });
  def('system.vibrate', 'Vibra (celular)', 'ms', ({ ms = 100 }) => !!(navigator.vibrate && navigator.vibrate(Math.min(num(ms), 2000))));
  def('system.prefersReducedMotion', 'Usuário prefere menos movimento?', '', () => matchMedia('(prefers-reduced-motion: reduce)').matches);
  D('system.reload', 'Recarrega o VessieOS', '', () => { setTimeout(() => location.reload(), 150); return true; });

  /* ---------- window ---------- */
  def('window.list', 'Janelas abertas', '', () => [...document.querySelectorAll('.win')].map(wInfo));
  def('window.count', 'Quantidade de janelas', '', () => document.querySelectorAll('.win').length);
  def('window.info', 'Dados de uma janela', 'id', ({ id }) => wInfo(winEl(id)));
  def('window.focus', 'Traz janela para frente', 'id', ({ id }) => { winEl(id); window.focusWin(id); return true; });
  def('window.close', 'Fecha janela', 'id', ({ id }) => { winEl(id); W().close(id); return true; });
  def('window.minimize', 'Minimiza janela', 'id', ({ id }) => { winEl(id); W().minimize(id); return true; });
  def('window.restore', 'Restaura janela', 'id', ({ id }) => { winEl(id); W().restore(id); return true; });
  def('window.maximize', 'Alterna maximizar', 'id', ({ id }) => click(winEl(id), 'max'));
  def('window.move', 'Move janela', 'id x y', ({ id, x, y }) => { const e = winEl(id); e.style.left = num(x) + 'px'; e.style.top = num(y) + 'px'; return wInfo(e); });
  def('window.resize', 'Redimensiona janela', 'id w h', ({ id, w, h }) => { const e = winEl(id); e.style.width = Math.max(280, num(w)) + 'px'; e.style.height = Math.max(180, num(h)) + 'px'; return wInfo(e); });
  def('window.title', 'Muda título', 'id title', ({ id, title }) => { const t = winEl(id).querySelector('.w-title'); if (t) t.textContent = String(title); return true; });
  def('window.byApp', 'Janelas de um app', 'app', ({ app }) => [...document.querySelectorAll('.win')].filter(e => e.dataset.app === app).map(wInfo));
  def('window.cascade', 'Organiza em cascata', '', () => { [...document.querySelectorAll('.win:not(.maximized)')].forEach((e, i) => { e.style.left = 40 + i * 32 + 'px'; e.style.top = 30 + i * 32 + 'px'; }); return true; });
  def('window.tile', 'Organiza lado a lado', '', () => { const l = [...document.querySelectorAll('.win:not(.maximized)')], n = l.length || 1, c = Math.ceil(Math.sqrt(n)), r = Math.ceil(n / c), w = innerWidth / c, h = (innerHeight - 52) / r; l.forEach((e, i) => { Object.assign(e.style, { left: (i % c) * w + 'px', top: Math.floor(i / c) * h + 'px', width: w + 'px', height: h + 'px' }); }); return n; });
  D('window.closeAll', 'Fecha todas as janelas', '', () => { const l = [...document.querySelectorAll('.win')]; l.forEach(e => W().close(e.id)); return l.length; });
  def('window.self.info', 'Dados da própria janela', '', (a, c) => wInfo(winEl(ownId(c))));
  def('window.self.close', 'Fecha a própria janela', '', (a, c) => { W().close(ownId(c)); return true; });
  def('window.self.minimize', 'Minimiza a própria janela', '', (a, c) => { W().minimize(ownId(c)); return true; });
  def('window.self.maximize', 'Alterna maximizar a própria janela', '', (a, c) => click(winEl(ownId(c)), 'max'));
  def('window.self.focus', 'Foca a própria janela', '', (a, c) => { window.focusWin(ownId(c)); return true; });
  def('window.self.move', 'Move a própria janela', 'x y', ({ x, y }, c) => R('window.move', { id: ownId(c), x, y }));
  def('window.self.resize', 'Redimensiona a própria janela', 'w h', ({ w, h }, c) => R('window.resize', { id: ownId(c), w, h }));
  def('window.self.title', 'Muda o título da própria janela', 'title', ({ title }, c) => R('window.title', { id: ownId(c), title }));
  const R = (n, a) => V.registry.get(n).fn(a);

  /* ---------- app ---------- */
  def('app.list', 'Todos os apps instalados', '', (a, c) => c.host.list());
  def('app.running', 'Apps em execução', '', () => [...new Set([...document.querySelectorAll('.win')].map(e => e.dataset.app).filter(Boolean))]);
  def('app.exists', 'App existe?', 'id', ({ id }, c) => c.host.list().some(x => x.id === id));
  def('app.info', 'Dados de um app', 'id', ({ id }, c) => c.host.list().find(x => x.id === id) || null);
  def('app.open', 'Abre um app', 'id', ({ id }, c) => { window.openApp(id); return true; });
  def('app.close', 'Fecha as janelas de um app', 'id', ({ id }) => { const l = [...document.querySelectorAll('.win')].filter(e => e.dataset.app === id); l.forEach(e => W().close(e.id)); return l.length; });
  def('app.self', 'Dados do app que chamou', '', (a, c) => ({ id: c.app.id, name: c.app.name, permissions: [...c.app.permissions] }));
  def('app.userApps', 'Apps criados pelo usuário', '', (a, c) => c.host.list().filter(x => x.user));
  def('app.source', 'Código-fonte (html/css/js) de um app do usuário', 'id', ({ id }, c) => c.host.source(id));
  def('app.install', 'Instala/atualiza app do usuário', 'app', ({ app }, c) => c.host.install(app));
  D('app.uninstall', 'Remove app do usuário', 'id', ({ id }, c) => c.host.uninstall(id));

  /* ---------- fs (VFS do VessieOS) ---------- */
  const F = () => window.VFS;
  const isFolder = p => { const n = F().read(p); return n !== null && typeof n === 'object'; };
  def('fs.home', 'Pasta do usuário', '', () => F().userRoot());
  def('fs.exists', 'Existe?', 'path', ({ path }) => F().exists(path));
  def('fs.list', 'Lista uma pasta', 'path', ({ path }) => { const l = F().list(path); if (l === null) throw new Error('acesso bloqueado'); return l; });
  def('fs.read', 'Lê arquivo de texto', 'path', ({ path }) => { const v = F().read(path); if (v === null || v === undefined) throw new Error('arquivo não encontrado'); if (typeof v === 'object') throw new Error('é uma pasta'); return v; });
  def('fs.write', 'Grava arquivo', 'path data', ({ path, data }) => { if (F().isLocked(path)) throw new Error('acesso bloqueado'); F().write(path, String(data)); return true; });
  def('fs.append', 'Acrescenta ao arquivo', 'path data', ({ path, data }) => { const v = F().read(path); F().write(path, (typeof v === 'string' ? v : '') + String(data)); return true; });
  def('fs.mkdir', 'Cria pasta', 'path', ({ path }) => { F().mkdir(path); return F().exists(path); });
  def('fs.delete', 'Apaga arquivo/pasta', 'path', ({ path }) => { if (F().isLocked(path)) throw new Error('acesso bloqueado'); F().delete(path); return !F().exists(path); });
  def('fs.stat', 'Metadados', 'path', ({ path }) => F().stat(path));
  def('fs.copy', 'Copia arquivo', 'from to', ({ from, to }) => { const v = F().read(from); if (typeof v !== 'string') throw new Error('só arquivos de texto'); F().write(to, v); return true; });
  def('fs.move', 'Move arquivo', 'from to', ({ from, to }) => { const v = F().read(from); if (typeof v !== 'string') throw new Error('só arquivos de texto'); F().write(to, v); F().delete(from); return true; });
  def('fs.readJson', 'Lê arquivo JSON', 'path', ({ path }) => JSON.parse(R('fs.read', { path })));
  def('fs.writeJson', 'Grava objeto como JSON', 'path data', ({ path, data }) => R('fs.write', { path, data: JSON.stringify(data, null, 2) }));
  def('fs.tree', 'Árvore de uma pasta', 'path depth', ({ path, depth = 2 }) => { const walk = (p, d) => { const n = F().read(p); if (n === null || typeof n !== 'object') return null; return d <= 0 ? '…' : Object.fromEntries(Object.keys(n).filter(k => !k.startsWith('__')).map(k => [k, walk(p + '/' + k, d - 1)])); }; return walk(path, num(depth)); });

  /* ---------- storage (isolado por app) ---------- */
  def('storage.set', 'Guarda texto (do app)', 'key value', ({ key, value }, c) => { localStorage.setItem(sk(c, key), String(value)); return true; });
  def('storage.get', 'Lê texto (do app)', 'key', ({ key }, c) => localStorage.getItem(sk(c, key)));
  def('storage.has', 'Chave existe?', 'key', ({ key }, c) => localStorage.getItem(sk(c, key)) !== null);
  def('storage.remove', 'Apaga chave', 'key', ({ key }, c) => { localStorage.removeItem(sk(c, key)); return true; });
  def('storage.setJson', 'Guarda objeto', 'key value', ({ key, value }, c) => { localStorage.setItem(sk(c, key), JSON.stringify(value)); return true; });
  def('storage.getJson', 'Lê objeto', 'key default', ({ key, default: d = null }, c) => jget(sk(c, key), d));
  def('storage.keys', 'Chaves do app', '', (a, c) => { const p = sk(c, ''); return Object.keys(localStorage).filter(k => k.startsWith(p)).map(k => k.slice(p.length)); });
  def('storage.size', 'Bytes usados pelo app', '', (a, c) => { const p = sk(c, ''); return Object.keys(localStorage).filter(k => k.startsWith(p)).reduce((s, k) => s + k.length + localStorage.getItem(k).length, 0); });
  D('storage.clear', 'Apaga todos os dados do app', '', (a, c) => { const p = sk(c, ''); const k = Object.keys(localStorage).filter(x => x.startsWith(p)); k.forEach(x => localStorage.removeItem(x)); return k.length; });
  def('storage.sharedSet', 'Guarda dado compartilhado entre apps', 'key value', ({ key, value }) => { localStorage.setItem(SH + key, JSON.stringify(value)); return true; });
  def('storage.sharedGet', 'Lê dado compartilhado', 'key', ({ key }) => jget(SH + key, null));

  /* ---------- clipboard ---------- */
  def('clipboard.read', 'Lê a área de transferência', '', () => navigator.clipboard.readText());
  def('clipboard.write', 'Copia texto', 'text', async ({ text }) => { await navigator.clipboard.writeText(String(text)); return true; });
  def('clipboard.history', 'Histórico de cópias', '', () => jget('vessieos:clipboard-manager:history', []).map(i => i.text));
  D('clipboard.clearHistory', 'Apaga o histórico de cópias', '', () => { localStorage.removeItem('vessieos:clipboard-manager:history'); return true; });

  /* ---------- notify ---------- */
  def('notify.toast', 'Aviso na tela', 'msg type title', ({ msg, type = 'default', title = '' }) => { window.toast(String(msg), type, title); return true; });
  def('notify.success', 'Aviso de sucesso', 'msg', ({ msg }) => { window.toast(String(msg), 'success'); return true; });
  def('notify.error', 'Aviso de erro', 'msg', ({ msg }) => { window.toast(String(msg), 'error'); return true; });
  def('notify.permission', 'Pede permissão de notificação nativa', '', () => Notification.requestPermission());
  def('notify.native', 'Notificação nativa do navegador', 'title body', ({ title, body = '' }) => { if (Notification.permission !== 'granted') throw new Error('permissão negada'); new Notification(String(title), { body: String(body) }); return true; });

  /* ---------- theme ---------- */
  const css = () => document.documentElement;
  def('theme.accentGet', 'Cor de destaque', '', () => getComputedStyle(css()).getPropertyValue('--a').trim());
  def('theme.accentSet', 'Define cor de destaque', 'hex', ({ hex }) => { if (!V.registry.get('valid.hexColor').fn({ s: hex })) throw new Error('cor inválida'); css().style.setProperty('--a', hex); return hex; });
  def('theme.tokenGet', 'Lê um token CSS (--nome)', 'name', ({ name }) => getComputedStyle(css()).getPropertyValue(String(name)).trim());
  def('theme.tokenSet', 'Define um token CSS (--nome)', 'name value', ({ name, value }) => { if (!/^--[\w-]+$/.test(name)) throw new Error('nome deve começar com --'); css().style.setProperty(name, String(value)); return true; });
  def('theme.tokens', 'Tokens principais', '', () => Object.fromEntries(['--a', '--a2', '--a3', '--ai', '--text', '--text-2', '--dim', '--border', '--surface', '--surface-2', '--mica', '--r-md', '--r-lg', '--font-ui', '--font-mono'].map(k => [k, getComputedStyle(css()).getPropertyValue(k).trim()])));
  def('theme.wallpaperSet', 'Troca o papel de parede', 'url', ({ url }) => { if (!/^(https?:|data:image)/i.test(url)) throw new Error('URL inválida'); window.setWall(url); return true; });
  def('theme.blurGet', 'Intensidade do vidro', '', () => getComputedStyle(css()).getPropertyValue('--vsys-frost-blur').trim());
  def('theme.blurSet', 'Define intensidade do vidro (px)', 'px', ({ px }) => { css().style.setProperty('--vsys-frost-blur', Math.max(0, Math.min(60, num(px))) + 'px'); return true; });
  def('theme.reset', 'Remove ajustes de tema feitos por apps', '', () => { ['--a', '--vsys-frost-blur'].forEach(k => css().style.removeProperty(k)); return true; });

  /* ---------- audio ---------- */
  const slider = () => document.getElementById('tw-vol-slider');
  def('audio.volumeGet', 'Volume do sistema (0–100)', '', () => slider() ? num(slider().value) : null);
  def('audio.volumeSet', 'Define volume do sistema', 'n', ({ n }) => { const s = slider(); if (!s) throw new Error('controle de volume indisponível'); s.value = Math.max(0, Math.min(100, num(n))); s.dispatchEvent(new Event('input', { bubbles: true })); return num(s.value); });
  def('audio.tone', 'Toca um tom', 'freq ms type', ({ freq = 440, ms = 200, type = 'sine' }) => { const c = ac(), o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = num(freq); g.gain.value = .08; o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + Math.min(num(ms), 3000) / 1000); return true; });
  def('audio.beep', 'Bip curto', '', () => R('audio.tone', { freq: 880, ms: 120 }));
  def('audio.speak', 'Fala um texto', 'text lang', ({ text, lang = 'pt-BR' }) => { const u = new SpeechSynthesisUtterance(String(text).slice(0, 1000)); u.lang = lang; speechSynthesis.speak(u); return true; });
  def('audio.stopSpeak', 'Para a fala', '', () => { speechSynthesis.cancel(); return true; });
  def('audio.voices', 'Vozes disponíveis', '', () => speechSynthesis.getVoices().map(v => ({ name: v.name, lang: v.lang })));

  /* ---------- net ---------- */
  def('net.online', 'Online?', '', () => navigator.onLine);
  def('net.fetch', 'Requisição HTTP (http/https)', 'url method headers body as', async ({ url, method = 'GET', headers, body, as = 'text' }) => { if (!/^https?:\/\//i.test(url)) throw new Error('só http/https'); const r = await fetch(url, { method, headers, body, signal: timed(10000) }); const data = as === 'json' ? await r.json() : await r.text(); return { status: r.status, ok: r.ok, data }; });
  def('net.json', 'GET que devolve JSON', 'url', async ({ url }) => (await R('net.fetch', { url, as: 'json' })).data);
  def('net.ping', 'Mede latência (ms)', 'url', async ({ url }) => { const t = performance.now(); await fetch(url, { mode: 'no-cors', cache: 'no-store', signal: timed(8000) }); return Math.round(performance.now() - t); });

  /* ---------- ai (Vessie-AI via LM Studio local) ---------- */
  def('ai.ping', 'LM Studio está no ar?', '', async () => { try { return (await fetch(lm() + '/v1/models', { signal: timed(3000) })).ok; } catch (_) { return false; } });
  def('ai.models', 'Modelos carregados', '', async () => ((await (await fetch(lm() + '/v1/models', { signal: timed(5000) })).json()).data || []).map(m => m.id));
  def('ai.chat', 'Pergunta ao modelo local', 'prompt system model max_tokens', async ({ prompt, system = 'Responda em português, de forma direta.', model, max_tokens = 400 }) => { if (!model) model = (await R('ai.models', {}))[0]; const r = await fetch(lm() + '/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: timed(60000), body: JSON.stringify({ model, max_tokens: Math.min(num(max_tokens), 2000), messages: [{ role: 'system', content: system }, { role: 'user', content: String(prompt) }] }) }); return (await r.json()).choices[0].message.content; });

  /* ---------- neural (motor de aprendizado) ---------- */
  const N = () => { const a = window.VessieNeural && VessieNeural.autonomy; if (!a || !a.ready) throw new Error('motor neural ainda não iniciou'); return a; };
  def('neural.stats', 'Estatísticas do agente', '', () => { const a = N(); return { hit: +a.agent.hitEma.toFixed(3), steps: a.agent.steps, eps: +a.agent.eps.toFixed(3), loss: +a.agent.loss.toFixed(4), memory: a.agent.memory.size }; });
  def('neural.suggest', 'Apps sugeridos agora', '', () => N().recs.slice());
  def('neural.simulate', 'Treino com rotina simulada', 'n', ({ n = 500 }) => N().simulateRoutine(Math.min(num(n), 3000)));
  def('neural.config', 'Lê/ajusta autonomia, notificações e resumo por IA', 'autonomy notify llm', (o) => { const a = N(); ['autonomy', 'notify', 'llm'].forEach(k => { if (typeof o[k] === 'boolean') a.cfg[k] = o[k]; }); a.saveCfg(); return Object.assign({}, a.cfg); });
  D('neural.reset', 'Apaga o que o modelo aprendeu', '', () => { N().reset(); return true; });

  /* ---------- power ---------- */
  const pw = act => () => { const b = document.querySelector(`#sm-pw-menu [data-act="${act}"]`); if (!b) throw new Error('menu de energia indisponível'); b.click(); return true; };
  D('power.sleep', 'Suspende o sistema', '', pw('sleep'));
  D('power.restart', 'Reinicia o sistema', '', pw('restart'));
  D('power.shutdown', 'Desliga o sistema', '', pw('shutdown'));

  /* ---------- kernel ---------- */
  const LOG = window.__vessieAppLog = window.__vessieAppLog || [];
  def('kernel.log', 'Registra mensagem no log do sistema', 'msg level', ({ msg, level = 'info' }, c) => { LOG.push({ t: Date.now(), app: c.app.id, level, msg: String(msg) }); if (LOG.length > 300) LOG.shift(); console.log('[app:' + c.app.id + ']', msg); return true; });
  def('kernel.logs', 'Lê o log dos apps', 'n', ({ n = 50 }) => LOG.slice(-num(n)));
  def('kernel.emit', 'Emite evento para outros apps', 'name data', ({ name, data }) => { document.dispatchEvent(new CustomEvent('vessieos:app:' + name, { detail: data })); return true; });
  def('kernel.subscribe', 'Recebe um evento do sistema (vessieos:* / vessie:*)', 'name', ({ name }, c) => c.host.subscribe(c, String(name)));
  def('kernel.unsubscribe', 'Cancela inscrição em evento', 'name', ({ name }, c) => c.host.unsubscribe(c, String(name)));
})();

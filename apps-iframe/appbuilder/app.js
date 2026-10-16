(async function () {
  const $ = id => document.getElementById(id), R = Vessie.run;
  await Vessie.ready;
  const NS = ['system', 'window', 'app', 'fs', 'storage', 'clipboard', 'notify', 'theme', 'audio', 'net', 'ai', 'neural', 'kernel', 'admin'];
  $('perms').innerHTML = NS.map(n => `<label><input type="checkbox" value="${n}" ${['notify', 'storage'].includes(n) ? 'checked' : ''}>${n}</label>`).join('');
  const STARTER = {
    html: '<main class="app">\n  <h1>Meu app</h1>\n  <p class="dim">Este app roda em um iframe isolado e fala com o VessieOS por comandos.</p>\n  <div class="row"><input id="txt" value="olá, vessieos"><button id="go" class="primary">Executar</button></div>\n  <pre id="out"></pre>\n</main>',
    css: '.app { padding: 16px; display: grid; gap: 12px; max-width: 560px; }\nh1 { margin: 0; font-size: 1.3rem; }',
    js: "Vessie.ready.then(() => {\n  document.getElementById('go').onclick = async () => {\n    const s = document.getElementById('txt').value;\n    const up = await Vessie.run('text.upper', { s });          // comando puro\n    document.getElementById('out').textContent = up;\n    await Vessie.run('notify.toast', { msg: up });              // comando de sistema (permissão \"notify\")\n  };\n});",
  };
  const src = Object.assign({}, STARTER); let tab = 'html';
  const say = (t, c) => { $('st').textContent = t; $('st').className = c || 'dim'; };
  const show = () => { $('code').value = src[tab]; document.querySelectorAll('nav button').forEach(b => b.classList.toggle('on', b.dataset.t === tab)); };
  document.querySelector('nav').onclick = e => { if (e.target.dataset.t) { src[tab] = $('code').value; tab = e.target.dataset.t; show(); } };
  $('code').addEventListener('keydown', e => { if (e.key === 'Tab') { e.preventDefault(); const t = e.target, s = t.selectionStart; t.setRangeText('  ', s, t.selectionEnd, 'end'); } });
  show();

  const perms = () => [...document.querySelectorAll('#perms input:checked')].map(i => i.value);
  const record = () => { src[tab] = $('code').value; return { id: $('id').value.trim(), name: $('name').value.trim(), icon: $('icon').value.trim(), permissions: perms(), html: src.html, css: src.css, js: src.js }; };
  async function mine() { const l = await R('app.userApps'); $('mine').innerHTML = '<option value="">— novo —</option>' + l.map(a => `<option value="${a.id}">${a.name}</option>`).join(''); }
  async function save() { const r = await R('app.install', { app: record() }); say('Instalado: ' + r.id, 'ok'); await mine(); $('mine').value = r.id; return r.id; }
  $('save').onclick = () => save().catch(e => say(e.message, 'err'));
  $('run').onclick = async () => { try { const id = await save(); await R('app.close', { id }); await R('app.open', { id }); } catch (e) { say(e.message, 'err'); } };
  $('mine').onchange = async e => {
    if (!e.target.value) { Object.assign(src, STARTER); $('id').value = 'meu-app'; $('name').value = 'Meu app'; return show(); }
    const a = await R('app.source', { id: e.target.value });
    Object.assign(src, { html: a.html, css: a.css, js: a.js }); $('id').value = a.id; $('name').value = a.name; $('icon').value = a.icon;
    document.querySelectorAll('#perms input').forEach(i => i.checked = a.permissions.includes(i.value)); show();
  };
  $('remove').onclick = async () => { const id = $('mine').value; if (!id) return say('Selecione um app seu', 'err'); try { await R('app.uninstall', { id }); say('Removido', 'ok'); await mine(); $('mine').value = ''; } catch (e) { say(e.message, 'err'); } };
  $('export').onclick = async () => {
    try {
      const r = record(), home = await R('fs.home'); let d = home + '/Documentos';
      for (const p of ['Apps', r.id]) { d += '/' + p; if (!(await R('fs.exists', { path: d }))) await R('fs.mkdir', { path: d }); }
      const index = `<!doctype html>\n<html lang="pt-BR"><head><meta charset="utf-8"><title>${r.name}</title>\n<link rel="stylesheet" href="style.css"></head>\n<body>\n${r.html}\n<script src="app.js"></script>\n</body></html>`;
      const manifest = { id: r.id, name: r.name, icon: r.icon, permissions: r.permissions, entry: 'index.html' };
      await R('fs.write', { path: d + '/index.html', data: index }); await R('fs.write', { path: d + '/style.css', data: r.css });
      await R('fs.write', { path: d + '/app.js', data: r.js }); await R('fs.writeJson', { path: d + '/manifest.json', data: manifest });
      say('Exportado em ' + d, 'ok');
    } catch (e) { say(e.message, 'err'); }
  };
  let t; $('find').oninput = () => { clearTimeout(t); t = setTimeout(async () => { const q = $('find').value.trim(); const l = q ? await R('cmd.search', { q }) : await R('cmd.list', { ns: 'text' }); $('cmds').innerHTML = l.slice(0, 60).map(c => `<li data-n="${c.name}" data-a="${c.args.join(',')}">${c.name}<small>${c.desc}</small></li>`).join(''); }, 120); };
  $('cmds').onclick = e => { const li = e.target.closest('li'); if (!li) return; if (tab !== 'js') { src[tab] = $('code').value; tab = 'js'; show(); } const a = li.dataset.a ? li.dataset.a.split(',') : [], t = $('code'); t.setRangeText(`await Vessie.run('${li.dataset.n}'${a.length ? ', { ' + a.map(x => x + ': ').join(', ') + ' }' : ''});\n`, t.selectionStart, t.selectionEnd, 'end'); t.focus(); };
  $('find').oninput(); mine();
})();

(async function () {
  const $ = id => document.getElementById(id), R = Vessie.run;
  await Vessie.ready;
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  async function refresh() {
    const [i, mem, up, bat] = await Promise.all([R('system.info'), R('system.memory'), R('system.uptime'), Vessie.try('system.battery', {}, null)]);
    $('sys').innerHTML = [['Usuário', i.user], ['Versão', 'VessieOS ' + i.version], ['CPU', (i.cores || '?') + ' núcleos'], ['Memória', (mem.deviceGB ? mem.deviceGB + ' GB' : '?') + (mem.heapMB ? ' · heap ' + mem.heapMB + ' MB' : '')], ['Ligado há', await R('date.format', { d: Date.now() - up * 1000, fmt: 'HH:mm:ss' }) + ' (' + up + ' s)'], ['Rede', i.online ? 'online' : 'offline'], ['Bateria', bat ? bat.level + '%' + (bat.charging ? ' ⚡' : '') : '—']].map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('');
    const w = await R('window.list'); $('wc').textContent = '(' + w.length + ')';
    $('wins').innerHTML = w.map(x => `<tr><td>${esc(x.title)}</td><td class="dim">${x.w}×${x.h}</td><td><button data-f="${x.id}">Focar</button> <button class="danger" data-c="${x.id}">Fechar</button></td></tr>`).join('');
    const n = await Vessie.try('neural.stats', {}, null), s = await Vessie.try('neural.suggest', {}, []);
    $('neu').innerHTML = n ? `acerto <b class="ok">${Math.round(n.hit * 100)}%</b> · ${n.steps} passos · ε ${n.eps} · ${n.memory} experiências<br>Sugestões: ${s.map(esc).join(', ') || '—'}` : 'Motor neural ainda não iniciou.';
  }
  $('wins').onclick = async e => { const f = e.target.dataset.f, c = e.target.dataset.c; if (f) await R('window.focus', { id: f }); if (c) await R('window.close', { id: c }); refresh(); };
  const v = await Vessie.try('audio.volumeGet', {}, null); if (v !== null) { $('vol').value = v; $('volv').textContent = v + '%'; }
  $('vol').oninput = async e => { $('volv').textContent = e.target.value + '%'; await Vessie.try('audio.volumeSet', { n: +e.target.value }); };
  $('acc').value = (await R('theme.accentGet')).replace(/^(?!#).*$/, '#8e8ff0') || '#8e8ff0';
  $('acc').oninput = e => R('theme.accentSet', { hex: e.target.value });
  $('accReset').onclick = () => R('theme.reset');
  $('tile').onclick = () => R('window.tile'); $('cascade').onclick = () => R('window.cascade');
  $('beep').onclick = () => R('audio.beep');
  refresh(); setInterval(refresh, 2500);
})();

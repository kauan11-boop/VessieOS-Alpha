(async function () {
  const $ = id => document.getElementById(id);
  const info = await Vessie.ready;
  const all = await Vessie.commands();
  const nss = [...new Set(all.map(c => c.ns))].sort();
  $('ns').innerHTML += nss.map(n => `<option>${n}</option>`).join('');
  $('count').textContent = `${all.length} comandos · ${nss.length} namespaces`;
  let sel = null;

  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  function renderList() {
    const q = $('q').value.toLowerCase(), ns = $('ns').value;
    const items = all.filter(c => (!ns || c.ns === ns) && (c.name + ' ' + c.desc).toLowerCase().includes(q));
    $('list').innerHTML = items.map(c => `<li data-n="${c.name}" class="${sel && sel.name === c.name ? 'on' : ''}"><span>${c.name}</span><small>${c.pure ? '' : 'SO'}</small></li>`).join('') || '<li class="dim">Nada encontrado</li>';
  }
  function show(c) {
    sel = c; renderList();
    $('detail').innerHTML = `<h2>${c.name}${c.pure ? '' : '<span class="badge">sistema</span>'}${c.danger ? '<span class="badge warn">perigoso</span>' : ''}</h2>
      <p class="dim" style="margin:0">${esc(c.desc)}</p>
      <div class="args">${c.args.map(a => `<label for="a-${a}" class="mono">${a}</label><input id="a-${a}" data-arg="${a}" placeholder="valor (JSON ou texto)">`).join('') || '<span class="dim">Sem argumentos.</span>'}</div>
      <div class="row"><button class="primary" id="run">Executar</button><span id="st" class="dim"></span></div>
      <pre id="out" aria-live="polite"></pre>
      <p class="dim mono" style="margin:0">await Vessie.run('${c.name}', {${c.args.map(a => a + ': …').join(', ')}})</p>`;
    $('run').onclick = go;
    document.querySelectorAll('[data-arg]').forEach(i => i.addEventListener('keydown', e => e.key === 'Enter' && go()));
  }
  const parse = v => { try { return JSON.parse(v); } catch (_) { return v; } };
  async function go() {
    const args = {}; document.querySelectorAll('[data-arg]').forEach(i => { if (i.value !== '') args[i.dataset.arg] = parse(i.value); });
    $('st').textContent = 'executando…'; const t = performance.now();
    try { const r = await Vessie.run(sel.name, args); $('out').className = ''; $('out').textContent = typeof r === 'string' ? r : JSON.stringify(r, null, 2); $('st').textContent = `ok · ${Math.round(performance.now() - t)} ms`; }
    catch (e) { $('out').className = 'err'; $('out').textContent = e.message; $('st').textContent = 'erro'; }
  }
  $('list').addEventListener('click', e => { const li = e.target.closest('li[data-n]'); if (li) show(all.find(c => c.name === li.dataset.n)); });
  $('q').oninput = $('ns').onchange = renderList;
  renderList();
})();

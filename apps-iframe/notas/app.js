(async function () {
  const $ = id => document.getElementById(id), R = Vessie.run;
  await Vessie.ready;
  const home = await R('fs.home'), dir = home + '/Documentos/Notas';
  for (const p of [home + '/Documentos', dir]) if (!(await R('fs.exists', { path: p }))) await R('fs.mkdir', { path: p });
  $('where').textContent = dir;
  let cur = null;
  const say = (t, c) => { $('st').textContent = t; $('st').className = c || 'dim'; };
  const count = async () => $('cnt').textContent = (await R('text.wordCount', { s: $('text').value })) + ' palavras';
  async function load() {
    const names = (await R('fs.list', { path: dir })).filter(n => n.endsWith('.txt')).sort();
    $('list').innerHTML = names.map(n => `<li data-n="${n}" class="${n === cur ? 'on' : ''}">${n.replace(/\.txt$/, '')}</li>`).join('') || '<li class="dim">Nenhuma nota ainda</li>';
  }
  async function openNote(n) { cur = n; $('title').value = n.replace(/\.txt$/, ''); $('text').value = await R('fs.read', { path: dir + '/' + n }); say(''); count(); load(); }
  $('list').onclick = e => { const li = e.target.closest('li[data-n]'); if (li) openNote(li.dataset.n); };
  $('new').onclick = () => { cur = null; $('title').value = ''; $('text').value = ''; $('title').focus(); say(''); load(); };
  $('save').onclick = async () => {
    const name = (await R('text.slug', { s: $('title').value || 'sem-titulo' })) + '.txt';
    await R('fs.write', { path: dir + '/' + name, data: $('text').value });
    if (cur && cur !== name) await R('fs.delete', { path: dir + '/' + cur });
    cur = name; say('Salvo', 'ok'); await Vessie.try('notify.success', { msg: 'Nota salva' }); load();
  };
  $('del').onclick = async () => { if (!cur || !confirm('Apagar esta nota?')) return; await R('fs.delete', { path: dir + '/' + cur }); $('new').click(); };
  $('text').oninput = count;
  load();
})();

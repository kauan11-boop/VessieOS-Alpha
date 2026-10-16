(function () {
  "use strict";

  // Pesquisa global da lupa da taskbar: interface própria (não é o Menu
  // Iniciar) com 3 motores — aplicativos, sites/web (navegador do sistema)
  // e configurações/ações reais. Sem resultados simulados: tudo que aparece
  // abre de verdade ao clicar (ou Enter abre o primeiro).
  let searchOpen = false;
  let lastItems = [];

  const SITES = [
    { n: 'Google', url: 'https://www.google.com', ic: '<i class="fab fa-google" style="color:#4285f4"></i>' },
    { n: 'YouTube', url: 'https://www.youtube.com', ic: '<i class="fab fa-youtube" style="color:#ef4444"></i>' },
    { n: 'GitHub', url: 'https://github.com', ic: '<i class="fab fa-github" style="color:#fff"></i>' },
    { n: 'Wikipedia', url: 'https://pt.wikipedia.org', ic: '<i class="fab fa-wikipedia-w" style="color:#fff"></i>' },
    { n: 'Stack Overflow', url: 'https://stackoverflow.com', ic: '<i class="fab fa-stack-overflow" style="color:#f97316"></i>' },
    { n: 'MDN Web Docs', url: 'https://developer.mozilla.org', ic: '<i class="fas fa-book" style="color:#0ea5e9"></i>' },
    { n: 'Spotify Web', url: 'https://open.spotify.com', ic: '<i class="fab fa-spotify" style="color:#22c55e"></i>' },
    { n: 'ChatGPT', url: 'https://chat.openai.com', ic: '<i class="fas fa-robot" style="color:#10a37f"></i>' }
  ];

  // Ações de configuração reais: abrem o app ou disparam o controle de verdade.
  const SETTINGS = [
    { n: 'Configurações', keys: 'config ajuste preferencia', run: () => window.openApp('settings') },
    { n: 'Papel de parede', keys: 'wallpaper fundo tela personalizar', run: () => openSettingsCat('personalizacao') },
    { n: 'IA Vessie', keys: 'ia vessie lm studio modelo', run: () => openSettingsCat('ia') },
    { n: 'Online e Discord', keys: 'online discord conta', run: () => openSettingsCat('online') },
    { n: 'Sistema', keys: 'sistema desempenho', run: () => openSettingsCat('sistema') },
    { n: 'Área de Trabalho', keys: 'area trabalho icones', run: () => openSettingsCat('area') },
    { n: 'Armazenamento', keys: 'armazenamento disco espaco', run: () => openSettingsCat('armazenamento') },
    { n: 'Sobre o VessieOS', keys: 'sobre versao', run: () => openSettingsCat('sobre') },
    { n: 'Central de Notificações', keys: 'notificacao alerta sino', run: () => document.getElementById('np')?.classList.add('open') },
    { n: 'Terminal', keys: 'terminal console comando', run: () => window.openApp('terminal') },
    { n: 'Wi-Fi (ligar/desligar)', keys: 'wifi rede internet', run: () => document.querySelector('[data-qt="wifi"]')?.click() },
    { n: 'Bluetooth (ligar/desligar)', keys: 'bluetooth bt', run: () => document.querySelector('[data-qt="bt"]')?.click() },
    { n: 'Não Perturbe (ligar/desligar)', keys: 'nao perturbe dnd foco silencio', run: () => document.querySelector('[data-qt="dnd"]')?.click() },
    { n: 'Som (ligar/desligar)', keys: 'som volume audio mudo', run: () => document.querySelector('[data-qt="vol"]')?.click() }
  ];

  function openSettingsCat(cat) {
    try { window.openSettings ? window.openSettings() : window.openApp('settings'); } catch (_) { window.openApp('settings'); }
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      const item = document.querySelector(`.vset-nav-item[data-cat="${cat}"]`);
      if (item) { clearInterval(timer); item.click(); }
      else if (tries >= 8) clearInterval(timer);
    }, 400);
  }

  function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function row(kind, idx, icon, name, tag) {
    return `<div class="gs-item" data-k="${kind}" data-i="${idx}">`
      + `<div class="ai">${icon}</div><span>${esc(name)}</span><small>${tag}</small></div>`;
  }

  function render(raw) {
    const q = (raw || '').trim().toLowerCase();
    const box = document.getElementById('gsearch-results');
    if (!box) return;
    const allApps = (window.APPS && window.APPS.length) ? window.APPS : [];
    const onStore = (a) => !window.VessieStore || window.VessieStore.isInstalled(a.id);
    const apps = allApps.filter(a =>
      onStore(a) && (!q || (a.n || '').toLowerCase().includes(q) || (a.id || '').toLowerCase().includes(q)));
    const sites = SITES.filter(s => !q || s.n.toLowerCase().includes(q));
    const sets = SETTINGS.filter(s =>
      !q || s.n.toLowerCase().includes(q) || (s.keys || '').toLowerCase().includes(q));
    lastItems = [
      ...apps.map(a => ({ kind: 'app', id: a.id, n: a.n, ic: a.ic || '📦' })),
      ...sites.map(s => ({ kind: 'site', n: s.n, url: s.url, ic: s.ic })),
      ...sets.map(s => ({ kind: 'set', n: s.n, run: s.run }))
    ];
    let h = '';
    const appRows = lastItems.map((it, i) => ({ it, i })).filter(x => x.it.kind === 'app');
    const siteRows = lastItems.map((it, i) => ({ it, i })).filter(x => x.it.kind === 'site');
    const setRows = lastItems.map((it, i) => ({ it, i })).filter(x => x.it.kind === 'set');
    if (appRows.length) h += '<div class="gs-ttl">Aplicativos</div>'
      + appRows.map(({ it, i }) => row('app', i, it.ic, it.n, 'App')).join('');
    if (siteRows.length) h += '<div class="gs-ttl">Sites</div>'
      + siteRows.map(({ it, i }) => row('site', i, it.ic, it.n, 'Site')).join('');
    if (setRows.length) h += '<div class="gs-ttl">Configurações</div>'
      + setRows.map(({ it, i }) => row('set', i,
        '<i class="fas fa-gear" style="color:#a78bfa"></i>', it.n, 'Sistema')).join('');
    if (q) {
      h += '<div class="gs-ttl">Web</div>'
        + `<div class="gs-item" data-k="web" data-i="-1">`
        + '<div class="ai"><i class="fas fa-globe" style="color:#0ea5e9"></i></div>'
        + `<span>Buscar "${esc(raw.trim())}" na web</span><small>Web</small></div>`;
    }
    if (!h) h = '<div class="gs-empty">Nada encontrado. Tente outra palavra.</div>';
    box.innerHTML = h;
  }

  function openItem(kind, idx, raw) {
    close();
    if (kind === 'app') {
      const it = lastItems[idx];
      if (it && typeof window.openApp === 'function') window.openApp(it.id);
    } else if (kind === 'site') {
      const it = lastItems[idx];
      if (!it) return;
      if (typeof window.openBrowserWith === 'function') window.openBrowserWith(it.url, it.n);
      else window.openApp('browser');
    } else if (kind === 'set') {
      const it = lastItems[idx];
      try { it && it.run(); } catch (_) { /* ação indisponível */ }
    } else if (kind === 'web') {
      const q = (raw || '').trim();
      const url = /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(q) && !q.includes(' ')
        ? (/^https?:\/\//i.test(q) ? q : 'https://' + q)
        : 'https://www.google.com/search?q=' + encodeURIComponent(q);
      if (typeof window.openBrowserWith === 'function') window.openBrowserWith(url, 'Pesquisa: ' + q);
      else window.openApp('browser');
    }
  }

  function toggle(force) {
    const el = document.getElementById('gsearch');
    if (!el) return;
    const want = typeof force === 'boolean' ? force : !searchOpen;
    if (want) {
      try { window.closeStartMenu && window.closeStartMenu(); } catch (_) {}
      document.getElementById('np')?.classList.remove('open');
      searchOpen = true;
      el.classList.add('open');
      const inp = document.getElementById('gsearch-input');
      render(inp ? inp.value : '');
      setTimeout(() => inp && inp.focus(), 30);
    } else {
      searchOpen = false;
      el.classList.remove('open');
    }
  }

  function close() { if (searchOpen) toggle(false); }

  function init() {
    const btn = document.getElementById('tb-search');
    if (btn) btn.onclick = (e) => { e.stopPropagation(); toggle(); };
    const inp = document.getElementById('gsearch-input');
    if (inp) {
      inp.oninput = () => render(inp.value);
      inp.onkeydown = (e) => {
        if (e.key !== 'Enter') return;
        if (lastItems.length) openItem(lastItems[0].kind, 0, inp.value);
        else if (inp.value.trim()) openItem('web', -1, inp.value);
      };
    }
    document.getElementById('gsearch-close').onclick = close;
    document.getElementById('gsearch-results').addEventListener('click', (e) => {
      const it = e.target.closest('.gs-item');
      if (!it) return;
      openItem(it.dataset.k, +it.dataset.i, document.getElementById('gsearch-input').value);
    });
    document.addEventListener('click', (e) => {
      if (!searchOpen) return;
      if (e.target.closest('#gsearch') || e.target.closest('#tb-search')) return;
      close();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  window.toggleSearchPanel = toggle;
  window.VessieOS = window.VessieOS || {};
  window.VessieOS.modules = window.VessieOS.modules || {};
  window.VessieOS.modules.search = { init };
})();

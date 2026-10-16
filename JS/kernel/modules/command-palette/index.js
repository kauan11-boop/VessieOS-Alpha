/**
 * VessieOS Kernel Module — Command Palette (Ctrl+K)
 *
 * Busca rápida por apps sem precisar abrir o Menu Iniciar. Reaproveita o
 * mesmo registro global (window.APPS / window.openApp) que o Menu Iniciar
 * expõe (ver JS/core/main.js e JS/kernel/modules/start-menu/index.js) — não
 * duplica dados, só oferece outra forma de chegar neles.
 *
 * Ativado pelo boot loader (JS/systems/desktop/main.js), que chama
 * window.VessieOS.modules.commandPalette.init() depois que todos os
 * scripts carregam.
 */
(function () {
  let overlay = null;
  let input = null;
  let list = null;
  let selectedIndex = 0;

  function injectStyles() {
    if (document.getElementById('cp-style')) return;
    const style = document.createElement('style');
    style.id = 'cp-style';
    style.textContent = `
      #cp-overlay{position:fixed;inset:0;background:rgba(5,6,10,.55);backdrop-filter:blur(4px);
        display:none;align-items:flex-start;justify-content:center;z-index:9500;padding-top:14vh}
      #cp-overlay.open{display:flex}
      #cp-box{width:min(560px,90vw);background:rgba(20,21,28,.96);border:1px solid rgba(255,255,255,.1);
        border-radius:16px;box-shadow:0 24px 60px rgba(0,0,0,.5);overflow:hidden}
      #cp-input{width:100%;box-sizing:border-box;background:transparent;border:none;border-bottom:1px solid rgba(255,255,255,.08);
        color:#fff;font-size:1rem;padding:16px 18px;outline:none}
      #cp-list{max-height:340px;overflow-y:auto;padding:8px}
      .cp-item{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:10px;cursor:pointer;color:#e5e7eb;font-size:.92rem}
      .cp-item .cp-ic{width:26px;text-align:center;font-size:1.1rem}
      .cp-item.active,.cp-item:hover{background:rgba(96,165,250,.16)}
      .cp-empty{padding:24px;text-align:center;color:#8a90a0;font-size:.88rem}
      .cp-hint{padding:10px 18px;border-top:1px solid rgba(255,255,255,.08);color:#6b7280;font-size:.74rem;
        display:flex;justify-content:space-between}
    `;
    document.head.appendChild(style);
  }

  function buildOverlay() {
    overlay = document.createElement('div');
    overlay.id = 'cp-overlay';
    overlay.innerHTML = `
      <div id="cp-box">
        <input id="cp-input" type="text" placeholder="Digite para buscar um app... (Esc para fechar)" autocomplete="off">
        <div id="cp-list"></div>
        <div class="cp-hint"><span>↑↓ navegar</span><span>Enter abrir</span><span>Esc fechar</span></div>
      </div>
    `;
    document.body.appendChild(overlay);
    input = overlay.querySelector('#cp-input');
    list = overlay.querySelector('#cp-list');

    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    input.addEventListener('input', () => render(input.value));
    input.addEventListener('keydown', onKeydown);
  }

  function getApps() {
    const all = window.APPS || [];
    return window.VessieStore ? all.filter(a => window.VessieStore.isInstalled(a.id)) : all;
  }

  function render(query) {
    const q = (query || '').trim().toLowerCase();
    const apps = getApps();
    const filtered = q
      ? apps.filter((a) => a.n.toLowerCase().includes(q) || a.id.toLowerCase().includes(q))
      : apps;

    selectedIndex = 0;

    if (!apps.length) {
      list.innerHTML = '<div class="cp-empty">Faça login no VessieOS para listar os apps.</div>';
      return;
    }
    if (!filtered.length) {
      list.innerHTML = '<div class="cp-empty">Nenhum app encontrado</div>';
      return;
    }

    list.innerHTML = filtered.map((app, i) => `
      <div class="cp-item${i === 0 ? ' active' : ''}" data-app-id="${app.id}">
        <span class="cp-ic">${app.ic}</span><span>${app.n}</span>
      </div>
    `).join('');

    list.querySelectorAll('.cp-item').forEach((el) => {
      el.addEventListener('click', () => launch(el.dataset.appId));
    });
  }

  function launch(appId) {
    if (appId && typeof window.openApp === 'function') window.openApp(appId);
    close();
  }

  function onKeydown(e) {
    const items = Array.from(list.querySelectorAll('.cp-item'));
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
      updateActive(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, 0);
      updateActive(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const active = items[selectedIndex];
      if (active) launch(active.dataset.appId);
    } else if (e.key === 'Escape') {
      close();
    }
  }

  function updateActive(items) {
    items.forEach((el, i) => el.classList.toggle('active', i === selectedIndex));
    if (items[selectedIndex]) items[selectedIndex].scrollIntoView({ block: 'nearest' });
  }

  function open() {
    if (!overlay) buildOverlay();
    // Fecha o Menu Iniciar caso esteja aberto, pra não sobrepor os dois
    if (typeof window.closeStartMenu === 'function') window.closeStartMenu();
    else { const sm = document.getElementById('sm'); if (sm) sm.classList.remove('open'); }

    overlay.classList.add('open');
    input.value = '';
    render('');
    setTimeout(() => input.focus(), 0);
  }

  function close() {
    if (overlay) overlay.classList.remove('open');
  }

  function init() {
    injectStyles();
    document.addEventListener('keydown', (e) => {
      const isK = e.key === 'k' || e.key === 'K';
      if ((e.ctrlKey || e.metaKey) && isK) {
        e.preventDefault();
        if (overlay && overlay.classList.contains('open')) close();
        else open();
      }
    });
  }

  window.VessieOS = window.VessieOS || {};
  window.VessieOS.modules = window.VessieOS.modules || {};
  window.VessieOS.modules.commandPalette = { init, open, close };
})();

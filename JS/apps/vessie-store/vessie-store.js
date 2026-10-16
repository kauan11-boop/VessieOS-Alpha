// vessie-store/vessie-store.js — Vessie-Store: instalar/gerenciar aplicativos
// Shell em view.html (+view.css via bridge); fallback = modelo verbatim.
// O CSS também vai embutido em VS_CSS e é injetado via <style>: no file://
// o fetch do bridge falha, e sem isso a loja abriria sem estilo.
// Estado de instalação = lista de NÃO instalados em localStorage; tudo que
// não está nela é considerado instalado (apps novos já nascem instalados),
// exceto OPT_IN, que nascem desinstalados até serem instalados aqui.
// Menu Iniciar, busca, desktop e openApp respeitam esse estado.
(function () {
  "use strict";

  const UN_KEY = 'vessieos_store_uninstalled';
  const ON_KEY = 'vessieos_store_installed';
  // Essenciais do sistema: não podem ser desinstalados.
  const CORE = ['vstore', 'settings', 'explorer', 'terminal'];
  // Apps que NÃO vêm instalados: só aparecem (menu/desktop) depois de
  // instalados pela Vessie-Store.
  const OPT_IN = ['vessie', 'vessielang', 'painel', 'dashboard', 'edu', 'automation', 'chrome', 'nvidia', 'games', 'framework', 'vm', 'vcoinstore', 'errorcenter'];

  const DESC = {
    vessie: 'Assistente de IA do sistema.',
    vessielang: 'Ambiente para programar em VessieLang.',
    painel: 'Painel de comando e hubs do sistema.',
    dashboard: 'Visão geral e estatísticas.',
    edu: 'Conteúdo educacional.',
    automation: 'Automações e fluxos.',
    explorer: 'Gerenciador de arquivos (essencial).',
    chrome: 'Navegador web do sistema.',
    nvidia: 'Painel de GPU Nvidia.',
    games: 'Loja e biblioteca de jogos (Steam).',
    framework: 'Ferramentas do Vessie Framework.',
    vm: 'Gerenciador de máquinas virtuais.',
    notepad: 'Bloco de notas.',
    calc: 'Calculadora.',
    music: 'Reprodutor de música.',
    terminal: 'Terminal do sistema (essencial).',
    settings: 'Configurações do sistema (essencial).',
    discord: 'Cliente Discord.',
    camera: 'Câmera e captura.',
    word: 'Editor de texto.',
    vcoinstore: 'Loja de cosméticos VessieCoin.',
    errorcenter: 'Central de erros do sistema.',
    vstore: 'Loja de aplicativos (essencial).'
  };

  // CSS da loja (espelho de view.css): injetado via <style> para a loja
  // funcionar com estilo também em file://, onde o fetch do bridge falha.
  // Se mudar view.css, atualize este bloco junto.
  const VS_CSS = `
.vstore{display:flex;flex-direction:column;gap:12px;height:100%;padding:16px 18px;overflow:hidden}
.vstore-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.vstore-title{display:flex;align-items:center;gap:12px}
.vstore-title>i{font-size:1.6rem;color:#a78bfa}
.vstore-title strong{display:block;font-size:1.05rem;color:#fff}
.vstore-title span{font-size:.74rem;color:var(--dim)}
.vstore-search{display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.05);border:1px solid var(--hairline);border-radius:10px;padding:8px 12px;min-width:220px;flex:1;max-width:320px}
.vstore-search i{color:var(--dim);font-size:.8rem}
.vstore-search input{flex:1;background:none;border:none;outline:none;color:#fff;font-size:.85rem}
.vstore-chips{display:flex;gap:8px}
.vstore-chip{background:rgba(255,255,255,.05);border:1px solid var(--hairline);color:var(--text-2);font-size:.76rem;border-radius:999px;padding:6px 14px;cursor:pointer}
.vstore-chip.ac{background:rgba(167,139,250,.18);border-color:rgba(167,139,250,.5);color:#fff}
.vstore-grid{flex:1;overflow-y:auto;display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px;align-content:start;padding-bottom:8px}
.vs-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:14px;display:flex;flex-direction:column;gap:8px}
.vs-card:hover{border-color:rgba(167,139,250,.4)}
.vs-top{display:flex;align-items:center;gap:10px}
.vs-ic{width:42px;height:42px;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:1.3rem;background:rgba(167,139,250,.12);flex-shrink:0;overflow:hidden}
.vs-top strong{display:block;font-size:.9rem;color:#fff}
.vs-top small{font-size:.68rem;color:var(--dim)}
.vs-desc{font-size:.76rem;color:var(--text-2);line-height:1.45;min-height:33px}
.vs-meta{font-size:.68rem;color:var(--muted,#5b6172)}
.vs-actions{display:flex;gap:8px;margin-top:auto}
.vs-btn{flex:1;border:none;border-radius:9px;padding:8px;font-size:.78rem;font-weight:700;cursor:pointer}
.vs-install{background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff}
.vs-open{background:rgba(74,222,128,.14);border:1px solid rgba(74,222,128,.4);color:#4ade80}
.vs-uninst{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:var(--text-2)}
.vs-core{font-size:.68rem;color:var(--dim);border:1px dashed var(--hairline);border-radius:9px;padding:8px;text-align:center}
.vs-prog{height:8px;border-radius:5px;background:rgba(255,255,255,.1);overflow:hidden}
.vs-prog i{display:block;height:100%;width:0;border-radius:5px;background:linear-gradient(90deg,#a78bfa,#60a5fa);transition:width .12s}
.vs-prog-lbl{font-size:.7rem;color:var(--dim);text-align:center}
.vs-empty{grid-column:1/-1;text-align:center;color:var(--muted,#5b6172);font-size:.85rem;padding:40px 0}`;

  function ensureCss() {
    if (document.querySelector('style[data-vstore]')) return;
    const st = document.createElement('style');
    st.setAttribute('data-vstore', '1');
    st.textContent = VS_CSS;
    document.head.appendChild(st);
  }

  function strList(key) {
    try {
      const a = JSON.parse(localStorage.getItem(key));
      if (Array.isArray(a)) return a.filter(x => typeof x === 'string');
    } catch (_) { /* ignore */ }
    return [];
  }

  function uninstalledIds() {
    return strList(UN_KEY);
  }

  function saveUninstalled(list) {
    try { localStorage.setItem(UN_KEY, JSON.stringify(list)); } catch (_) { /* ignore */ }
  }

  function explicitInstalled() {
    return strList(ON_KEY);
  }

  function saveExplicit(list) {
    try { localStorage.setItem(ON_KEY, JSON.stringify(list)); } catch (_) { /* ignore */ }
  }

  function isInstalled(id) {
    if (explicitInstalled().includes(id)) return true;
    if (uninstalledIds().includes(id)) return false;
    return !OPT_IN.includes(id);
  }

  function toastMsg(msg, type) {
    try {
      if (typeof window.toast === 'function') window.toast(msg, type || 'success');
    } catch (_) { /* ignore */ }
  }

  function refreshShells() {
    // Usa window.* porque main.js é um IIFE (bare names não vazam).
    try { if (typeof window.renderPinnedGrid === 'function') window.renderPinnedGrid(); } catch (_) {}
    try { if (typeof window.renderAllAppsGrid === 'function') window.renderAllAppsGrid(); } catch (_) {}
    try { if (typeof window.renderRecentApps === 'function') window.renderRecentApps(); } catch (_) {}
    try { if (typeof window.renderDesktop === 'function') window.renderDesktop(); } catch (_) {}
    try { if (typeof window.renderTaskbarPins === 'function') window.renderTaskbarPins(); } catch (_) {}
  }

  function closeAppWindows(id) {
    document.querySelectorAll(`.win[data-app="${id}"]`).forEach(el => {
      try {
        if (window.VessieWM && typeof window.VessieWM.close === 'function') window.VessieWM.close(el.id);
        else el.remove();
      } catch (_) { /* ignore */ }
    });
  }

  const installing = new Set();

  function install(id) {
    if (!id || isInstalled(id) || installing.has(id) || CORE.includes(id)) return;
    installing.add(id);
    paintCard(id);
    let pct = 0;
    const timer = setInterval(() => {
      pct = Math.min(100, pct + 9 + Math.floor(Math.random() * 14));
      const bar = document.querySelector(`[data-vsprog="${id}"] i`);
      const lbl = document.querySelector(`[data-vsprog="${id}"] + .vs-prog-lbl`);
      if (bar) bar.style.width = pct + '%';
      if (lbl) lbl.textContent = 'Instalando… ' + pct + '%';
      if (pct >= 100) {
        clearInterval(timer);
        installing.delete(id);
        saveUninstalled(uninstalledIds().filter(x => x !== id));
        const on = explicitInstalled();
        if (!on.includes(id)) { on.push(id); saveExplicit(on); }
        toastMsg('📦 Aplicativo instalado!');
        refreshShells();
        paintGrid();
      }
    }, 120);
  }

  function uninstall(id) {
    if (CORE.includes(id)) { toastMsg('Esse aplicativo é essencial do sistema.', 'error'); return; }
    if (!isInstalled(id)) return;
    closeAppWindows(id);
    const list = uninstalledIds();
    if (!list.includes(id)) list.push(id);
    saveUninstalled(list);
    saveExplicit(explicitInstalled().filter(x => x !== id));
    toastMsg('Aplicativo desinstalado.');
    refreshShells();
    paintGrid();
  }

  function open(id) {
    if (typeof window.openApp === 'function') window.openApp(id);
  }

  // ---- UI ----
  let filter = 'all';
  let query = '';
  let gridEl = null;

  function apps() {
    return (typeof window.APPS !== 'undefined' && Array.isArray(window.APPS)) ? window.APPS : [];
  }

  function catOf(app) {
    try {
      if (typeof window.smCatMeta === 'function') return window.smCatMeta(app.cat).label;
    } catch (_) {}
    return 'Utilitários';
  }

  function cardHtml(app) {
    const installed = isInstalled(app.id);
    const core = CORE.includes(app.id);
    const busy = installing.has(app.id);
    let actions;
    if (busy) {
      actions = `<div class="vs-prog" data-vsprog="${app.id}"><i></i></div><div class="vs-prog-lbl">Instalando… 0%</div>`;
    } else if (!installed) {
      actions = `<button class="vs-btn vs-install" onclick="window.storeInstall('${app.id}')">Instalar</button>`;
    } else if (core) {
      actions = `<div class="vs-core">App do sistema</div>`;
    } else {
      actions = `<button class="vs-btn vs-open" onclick="window.storeOpen('${app.id}')">Abrir</button>`
        + `<button class="vs-btn vs-uninst" onclick="window.storeUninstall('${app.id}')">Desinstalar</button>`;
    }
    return `<div class="vs-card" data-vscard="${app.id}">
      <div class="vs-top"><div class="vs-ic">${app.ic}</div>
      <div><strong>${app.n}</strong><small>${catOf(app)} · v1.0 · Integrado</small></div></div>
      <div class="vs-desc">${DESC[app.id] || 'Aplicativo do VessieOS.'}</div>
      <div class="vs-meta">${installed ? (core ? 'Instalado · essencial' : 'Instalado') : 'Não instalado'}</div>
      <div class="vs-actions">${actions}</div>
    </div>`;
  }

  function paintCard(id) {
    const card = gridEl && gridEl.querySelector(`[data-vscard="${id}"]`);
    if (!card) return;
    const app = apps().find(a => a.id === id);
    if (!app) return;
    card.outerHTML = cardHtml(app);
  }

  function paintGrid() {
    if (!gridEl || !document.body.contains(gridEl)) return;
    const q = query.trim().toLowerCase();
    const list = apps().filter(a =>
      (!q || (a.n || '').toLowerCase().includes(q) || (a.id || '').toLowerCase().includes(q)) &&
      (filter === 'all' || (filter === 'installed') === isInstalled(a.id)));
    gridEl.innerHTML = list.length
      ? list.map(cardHtml).join('')
      : '<div class="vs-empty">Nenhum aplicativo encontrado.</div>';
  }

  const VS_FALLBACK_HTML = `
    <div class="vstore">
      <div class="vstore-head">
        <div class="vstore-title"><i class="fas fa-store"></i><div><strong>Vessie-Store</strong><span>Instale e gerencie os aplicativos do sistema</span></div></div>
        <div class="vstore-search"><i class="fas fa-magnifying-glass"></i><input id="vs-q" placeholder="Buscar aplicativos..." autocomplete="off"></div>
      </div>
      <div class="vstore-chips">
        <button class="vstore-chip ac" data-vsfilter="all">Todos</button>
        <button class="vstore-chip" data-vsfilter="installed">Instalados</button>
        <button class="vstore-chip" data-vsfilter="available">Não instalados</button>
      </div>
      <div class="vstore-grid" id="vs-grid"></div>
    </div>`;

  function wire(win) {
    ensureCss();
    gridEl = win.querySelector('#vs-grid');
    const q = win.querySelector('#vs-q');
    if (q) q.oninput = () => { query = q.value; paintGrid(); };
    win.querySelectorAll('[data-vsfilter]').forEach(b => {
      b.onclick = () => {
        filter = b.dataset.vsfilter;
        win.querySelectorAll('[data-vsfilter]').forEach(x => x.classList.toggle('ac', x === b));
        paintGrid();
      };
    });
    paintGrid();
    const box = win.querySelector('.vstore-search');
    if (box && q) box.onclick = () => q.focus();
  }

  function openVessieStore() {
    // Reseta filtros a cada abertura.
    filter = 'all'; query = '';
    ensureCss();
    if (typeof window.createWin !== 'function') { toastMsg('Núcleo de janelas indisponível.', 'error'); return null; }
    const win = window.createWin('Vessie-Store', '<i class="fas fa-store" style="color:#a78bfa"></i>', '<div class="app-loading">Carregando…</div>', 760, 560);
    if (window.VessieBridge && typeof window.VessieBridge.loadView === 'function') {
      window.VessieBridge.loadView('vessie-store', { html: VS_FALLBACK_HTML }, {}).then(({ html }) => {
        if (!document.body.contains(win)) return;
        win.querySelector('.wb').innerHTML = html;
        wire(win);
      }).catch(() => {
        if (!document.body.contains(win)) return;
        win.querySelector('.wb').innerHTML = VS_FALLBACK_HTML;
        wire(win);
      });
    } else {
      win.querySelector('.wb').innerHTML = VS_FALLBACK_HTML;
      wire(win);
    }
    return win;
  }

  window.openVessieStore = openVessieStore;
  window.storeInstall = install;
  window.storeUninstall = uninstall;
  window.storeOpen = open;
  window.VessieStore = { isInstalled, install, uninstall, CORE, OPT_IN };

  // Auto-cura: se o login renderizou menus/desktop antes deste módulo
  // carregar (sem filtrar opt-in), reaplica os filtros agora.
  try { refreshShells(); } catch (_) { /* desktop ainda não existe */ }
})();

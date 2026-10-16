// coin-store/coin-store.js — Loja VessieCoin (pasta com view.html + view.css + coin-store.js)
// Shell em view.html; fallback = modelo original verbatim (só sem fetch).
// Catálogo e render dinâmico permanecem no JS, inalterados.
(function () {
  "use strict";

const VC_FALLBACK_HTML = `
      <div style="padding:18px;height:100%;overflow-y:auto;background:#0d0d12;color:#eee;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
          <h2 style="margin:0;font-size:1.1rem;"><i class="fas fa-coins" style="color:#f6c343;"></i> Loja VessieCoin</h2>
          <div style="background:rgba(246,195,67,.12);border:1px solid rgba(246,195,67,.3);color:#f6c343;padding:6px 14px;border-radius:20px;font-weight:700;font-size:.9rem;">
            <i class="fas fa-coins"></i> <span id="vcstore-balance">0</span>
          </div>
        </div>
        <p style="color:#8fa0bf;font-size:.85rem;margin-bottom:16px;">Ganhe moedas jogando no Steam/Game Hub e troque por cosméticos reais para o seu desktop.</p>
        <div id="vcstore-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;"></div>
      </div>
    `;

function openVessieCoinStore() {
    const win = createWin('Loja VessieCoin', '🪙', '<div class="app-loading">Carregando…</div>', 720, 520);
    const wire = () => wireCoinStore(win);
    if (window.VessieBridge && typeof window.VessieBridge.loadView === 'function') {
      window.VessieBridge.loadView('coin-store', { html: VC_FALLBACK_HTML }, {}).then(({ html }) => {
        if (!document.body.contains(win)) return;
        win.querySelector('.wb').innerHTML = html;
        wire();
      });
    } else {
      win.querySelector('.wb').innerHTML = VC_FALLBACK_HTML;
      wire();
    }
    return win;
  }

function wireCoinStore(win) {
    const CATALOG = [
      { id: 'visual.crt', name: 'Modo CRT', desc: 'Monitor antigo com scanlines.', price: 40, icon: 'fa-tv' },
      { id: 'visual.holographic-shimmer', name: 'Brilho Holográfico', desc: 'Reflexo iridescente nas janelas.', price: 60, icon: 'fa-gem' },
      { id: 'visual.neon-boost', name: 'Neon Intensificado', desc: 'Glows mais fortes na UI.', price: 35, icon: 'fa-bolt' },
      { id: 'visual.cursor-trail', name: 'Trilha do Cursor', desc: 'Rastro de partículas no mouse.', price: 25, icon: 'fa-wand-magic-sparkles' },
      { id: 'visual.cursor-glow-ring', name: 'Anel de Luz do Cursor', desc: 'Anel neon acompanhando o cursor.', price: 25, icon: 'fa-circle-notch' },
      { id: 'visual.particles-overlay', name: 'Partículas Ambiente', desc: 'Partículas flutuantes no desktop.', price: 45, icon: 'fa-star' },
      { id: 'visual.animated-gradient-bg', name: 'Gradiente Animado', desc: 'Papel de parede com gradiente vivo.', price: 50, icon: 'fa-palette' },
      { id: 'visual.parallax-wallpaper', name: 'Paralaxe do Papel de Parede', desc: 'Profundidade ao mover o mouse.', price: 30, icon: 'fa-layer-group' },
      { id: 'visual.window-shadow-depth', name: 'Sombras Profundas', desc: 'Janelas com mais profundidade visual.', price: 20, icon: 'fa-cube' },
      { id: 'visual.chromatic-aberration', name: 'Aberração Cromática', desc: 'Efeito sutil nas janelas em foco.', price: 30, icon: 'fa-droplet' },
    ];

    function render() {
      const balanceEl = win.querySelector('#vcstore-balance');
      const grid = win.querySelector('#vcstore-grid');
      if (balanceEl) balanceEl.textContent = window.VessieCoin?.getBalance() ?? 0;
      if (!grid) return;
      grid.innerHTML = CATALOG.map(item => {
        const owned = window.VessieCoin?.isUnlocked(item.id);
        const active = window.VessieOS?.systemsRuntime?.isEnabled(item.id);
        return `
        <div style="background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:14px;">
          <div style="font-size:1.6rem;color:#f6c343;margin-bottom:8px;"><i class="fas ${item.icon}"></i></div>
          <div style="font-weight:600;margin-bottom:4px;">${item.name}</div>
          <div style="color:#8fa0bf;font-size:.78rem;margin-bottom:10px;min-height:32px;">${item.desc}</div>
          ${owned
            ? `<button onclick="window.__vcstoreToggle('${item.id}')" style="width:100%;background:${active ? 'rgba(74,222,128,.15)' : 'rgba(255,255,255,.06)'};border:1px solid ${active ? '#4ade80' : 'rgba(255,255,255,.1)'};color:${active ? '#4ade80' : '#eee'};padding:8px;border-radius:8px;cursor:pointer;font-size:.8rem;font-weight:600;">${active ? '✓ Ativado' : 'Ativar'}</button>`
            : `<button onclick="window.__vcstoreBuy('${item.id}', ${item.price})" style="width:100%;background:linear-gradient(135deg,#f6c343,#c98b1f);border:none;color:#1a1200;padding:8px;border-radius:8px;cursor:pointer;font-size:.8rem;font-weight:700;"><i class="fas fa-coins"></i> ${item.price}</button>`
          }
        </div>`;
      }).join('');
    }

    window.__vcstoreBuy = function (itemId, price) {
      const item = CATALOG.find(i => i.id === itemId);
      if (!item) return;
      const ok = window.VessieCoin?.spend(price, `Comprou ${item.name}`, { itemId });
      if (ok) { window.VessieOS?.systemsRuntime?.enable(itemId); render(); }
    };
    window.__vcstoreToggle = function (itemId) {
      window.VessieOS?.systemsRuntime?.toggle(itemId);
      render();
    };

    window.VessieCoin?.onChange(render);
    render();
  }
window.openVessieCoinStore = openVessieCoinStore;
})();

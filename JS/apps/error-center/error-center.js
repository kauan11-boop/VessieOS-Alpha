// error-center/error-center.js — Central de Erros (pasta com view.html + view.css + error-center.js)
// Shell em view.html; fallback = modelo original verbatim (só sem fetch).
// Render dinâmico (health/log) permanece no JS, inalterado.
(function () {
  "use strict";

const EC_FALLBACK_HTML = `
      <div style="padding:18px;height:100%;overflow-y:auto;background:#0d0d12;color:#eee;font-size:.85rem;">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
          <h2 style="margin:0;font-size:1.1rem;"><i class="fas fa-triangle-exclamation" style="color:#f59e0b;"></i> Central de Erros</h2>
          <button id="ec-export" style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:#eee;padding:6px 12px;border-radius:8px;cursor:pointer;font-size:.75rem;"><i class="fas fa-download"></i> Exportar relatório</button>
        </div>
        <div id="ec-health" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px;margin-bottom:18px;"></div>
        <div style="font-weight:600;margin-bottom:8px;">Erros recentes</div>
        <div id="ec-log" style="background:rgba(0,0,0,.25);border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:10px;max-height:280px;overflow-y:auto;font-family:monospace;font-size:.75rem;"></div>
      </div>
    `;

function openErrorCenter() {
    const win = createWin('Central de Erros', '🚨', '<div class="app-loading">Carregando…</div>', 640, 560);
    const wire = () => wireErrorCenter(win);
    if (window.VessieBridge && typeof window.VessieBridge.loadView === 'function') {
      window.VessieBridge.loadView('error-center', { html: EC_FALLBACK_HTML }, {}).then(({ html }) => {
        if (!document.body.contains(win)) return;
        win.querySelector('.wb').innerHTML = html;
        wire();
      });
    } else {
      win.querySelector('.wb').innerHTML = EC_FALLBACK_HTML;
      wire();
    }
    return win;
  }

function wireErrorCenter(win) {

    function render() {
      const health = window.__vsysHealthCheck?.() || {};
      const healthEl = win.querySelector('#ec-health');
      if (healthEl) {
        healthEl.innerHTML = Object.entries(health).map(([key, ok]) => `
          <div style="background:rgba(255,255,255,.04);border:1px solid ${ok ? 'rgba(74,222,128,.3)' : 'rgba(239,68,68,.3)'};border-radius:8px;padding:8px 10px;">
            <div style="font-size:.7rem;color:#8fa0bf;text-transform:uppercase;">${key}</div>
            <div style="color:${ok ? '#4ade80' : '#ef4444'};font-weight:700;">${ok ? 'OK' : 'Indisponível'}</div>
          </div>`).join('');
      }
      let log = [];
      try { log = JSON.parse(localStorage.getItem('vessieos_sys_crash-log') || '[]'); } catch (e) { }
      const logEl = win.querySelector('#ec-log');
      if (logEl) {
        logEl.innerHTML = log.length ? log.map(entry => `
          <div style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05);">
            <span style="color:#5b6680;">${new Date(entry.at).toLocaleTimeString('pt-BR')}</span>
            <span style="color:#ef4444;"> ${entry.type || 'error'}</span> — ${entry.message}
          </div>`).join('') : '<div style="color:#5b6680;">Nenhum erro registrado. 🎉</div>';
      }
    }

    win.querySelector('#ec-export').addEventListener('click', () => window.__vsysExportDiagnostics?.());
    render();
    const interval = setInterval(() => {
      if (!document.body.contains(win)) { clearInterval(interval); return; }
      render();
    }, 5000);
  }
window.openErrorCenter = openErrorCenter;
})();

// automation/automation.js — Automação (pasta com view.html + view.css + automation.js)
// Shell estático em view.html; fallback inline idêntico (só usado sem fetch).
(function () {
  "use strict";

const AUTOMATION_FALLBACK_HTML = `<div class="auto-shell">
  <div class="auto-hero">
    <div>
      <div class="status-pill"><i class="fas fa-robot"></i> Assistente ativo</div>
      <h3>Organize o sistema com um clique</h3>
      <p>Limpeza, otimização, backup e monitoramento em uma experiência visual simples.</p>
    </div>
    <button class="auto-main-btn" onclick="window.refreshAutoReport()">Atualizar</button>
  </div>
  <div class="auto-grid">
    <div class="auto-card">
      <h4>🧹 Limpeza</h4>
      <p>Remove arquivos temporários e melhora a performance.</p>
      <button onclick="window.runAutoCleanup()">Executar</button>
    </div>
    <div class="auto-card">
      <h4>⚡ Otimizar</h4>
      <p>Ajusta memória e prioriza tarefas mais importantes.</p>
      <button onclick="window.runAutoOptimize()">Executar</button>
    </div>
    <div class="auto-card">
      <h4>☁️ Backup</h4>
      <p>Cria um resumo de arquivos e preferências do sistema.</p>
      <button onclick="window.runAutoBackup()">Executar</button>
    </div>
    <div class="auto-card">
      <h4>📈 Relatório</h4>
      <p>Mostra status, saúde e recomendações do ambiente.</p>
      <button onclick="window.runAutoReport()">Executar</button>
    </div>
  </div>
  <div class="auto-report" id="auto-report"></div>
</div>`;

function openAutomation() {
    const win = createWin('Automação', '🤖', '<div class="app-loading">Carregando…</div>', 720, 560);
    const wire = () => window.refreshAutoReport();
    if (window.VessieBridge && typeof window.VessieBridge.loadView === 'function') {
      window.VessieBridge.loadView('automation', { html: AUTOMATION_FALLBACK_HTML }, {}).then(({ html }) => {
        if (!document.body.contains(win)) return;
        win.querySelector('.wb').innerHTML = html;
        wire();
      });
    } else {
      win.querySelector('.wb').innerHTML = AUTOMATION_FALLBACK_HTML;
      wire();
    }
    return win;
  }
window.openAutomation = openAutomation;
})();

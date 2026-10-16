// task-manager.js — Gerenciador de Tarefas com dados REAIS do VessieOS.
// Processos = janelas reais do VessieWM (Finalizar fecha de verdade, mesmo
// app travado, pois o fechamento é imposto pelo WM via remoção do DOM).
// Métricas = heap JS real, localStorage real, rede real, núcleos reais.
// Sem processos simulados: o que não dá para medir no navegador é
// rotulado honestamente (ex.: % de CPU por processo não é exposto).
// Depende de utilitários globais do kernel: S, VFS, toast, createWin, etc.
(function () {
  "use strict";

function openTaskManager() {
    // ---------- DADOS REAIS ----------
    function realProcs() {
      let list = [];
      try {
        if (window.VessieWM && typeof window.VessieWM.list === 'function') list = window.VessieWM.list() || [];
      } catch (_) { list = []; }
      return list.map(w => {
        let nodes = 0;
        try {
          const el = document.getElementById(w.id);
          const wb = el && el.querySelector('.wb');
          nodes = wb ? wb.getElementsByTagName('*').length : 0;
        } catch (_) { nodes = 0; }
        return {
          id: w.id, pid: w.pid, title: w.title || w.id, app: w.app || '',
          minimized: !!w.minimized, maximized: !!w.maximized, focused: !!w.focused,
          nodes
        };
      });
    }

    function statusOf(p) {
      if (p.focused) return 'Em foco';
      if (p.minimized) return 'Minimizada';
      if (p.maximized) return 'Maximizada';
      return 'Ativa';
    }

    function sysMetrics() {
      const heap = (typeof performance !== 'undefined' && performance.memory)
        ? { used: performance.memory.usedJSHeapSize, total: performance.memory.totalJSHeapSize }
        : null;
      let lsUsed = 0;
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          const v = localStorage.getItem(k) || '';
          lsUsed += (k.length + v.length) * 2;
        }
      } catch (_) {}
      const conn = (typeof navigator !== 'undefined' && (navigator.connection || navigator.mozConnection)) || null;
      return {
        heap,
        lsUsed, lsTotal: 5 * 1024 * 1024,
        cores: (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || '?',
        online: typeof navigator === 'undefined' ? true : navigator.onLine,
        net: conn ? { type: conn.effectiveType || '—', down: conn.downlink, rtt: conn.rtt } : null
      };
    }

    function fmtMB(bytes) {
      return (bytes / 1048576).toFixed(1) + ' MB';
    }

    function bootTime() {
      try {
        return new Date(performance.timeOrigin).toLocaleString('pt-BR');
      } catch (_) { return '—'; }
    }

    // ---------- RENDERIZA TABELA ----------
    function renderProcesses() {
      const tbody = document.getElementById('taskmgr-tbody');
      if (!tbody) return;
      const procs = realProcs();
      if (!procs.length) {
        tbody.innerHTML = '<tr><td colspan="5" style="padding:16px;text-align:center;color:#5b6680;">Nenhuma janela aberta além desta.</td></tr>';
      } else {
        tbody.innerHTML = procs.map(p => `
      <tr data-win-id="${p.id}" style="border-bottom:1px solid rgba(255,255,255,.04);${p.minimized ? 'opacity:.55;' : ''}">
        <td style="padding:9px 12px;display:flex;align-items:center;gap:8px;">
          <i class="fas fa-window-maximize" style="color:${p.focused ? 'var(--a)' : '#5b6680'};width:16px;"></i>
          <span><strong>${p.title.replace(/</g, '&lt;')}</strong><br><small style="color:#5b6680;">PID ${p.pid ?? '—'}${p.app ? ' · ' + p.app.replace(/</g, '&lt;') : ''}</small></span>
        </td>
        <td style="padding:9px 12px;text-align:center;">${p.nodes} nós</td>
        <td style="padding:9px 12px;text-align:center;">
          <span style="color:${p.focused ? '#4caf50' : '#9fb3c8'};font-size:.75rem;">●</span>
          ${statusOf(p)}
        </td>
        <td style="padding:9px 12px;text-align:center;white-space:nowrap;">
          ${p.app ? `<button onclick="restartProcess('${p.id}')" title="Fechar e reabrir" style="background:rgba(96,165,250,.15);border:none;color:#7dd3fc;padding:4px 10px;border-radius:6px;font-size:.7rem;cursor:pointer;margin-right:4px;"><i class="fas fa-rotate-right"></i></button>` : ''}
          <button onclick="endProcess('${p.id}')" title="Finalizar (funciona mesmo travado)" style="background:rgba(244,67,54,.15);border:none;color:#f44336;padding:4px 12px;border-radius:6px;font-size:.7rem;cursor:pointer;"><i class="fas fa-times"></i> Finalizar</button>
        </td>
      </tr>
    `).join('');
      }
      updateSystemStats(procs);
    }

    // ---------- ESTATÍSTICAS DO SISTEMA (reais) ----------
    function updateSystemStats(procs) {
      const m = sysMetrics();
      const list = procs || realProcs();
      const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
      set('taskmgr-proc-count', String(list.length));
      set('taskmgr-ram', m.heap ? ((m.heap.used / m.heap.total) * 100).toFixed(0) + '%' : 'n/d');
      set('taskmgr-disk', ((m.lsUsed / m.lsTotal) * 100).toFixed(1) + '%');
      set('taskmgr-net', m.online ? ((m.net && m.net.type) || 'online') : 'offline');
    }

    // ---------- FINALIZAR / REINICIAR (reais, via WM) ----------
    window.endProcess = function (winId) {
      let ok = false;
      try {
        if (window.VessieWM && typeof window.VessieWM.close === 'function') {
          window.VessieWM.close(winId);
          ok = !document.getElementById(winId);
        } else {
          document.getElementById(winId)?.remove();
          ok = true;
        }
      } catch (_) { ok = false; }
      if (ok) {
        addHistory(`❌ Janela "${winId}" finalizada`, 'error');
        try { toast('Janela finalizada.', 'error'); } catch (_) {}
      } else {
        addHistory(`⚠️ Falha ao finalizar "${winId}"`, 'error');
      }
      setTimeout(() => { renderProcesses(); }, 220);
    };

    window.restartProcess = function (winId) {
      let app = '';
      try {
        const el = document.getElementById(winId);
        app = (el && el.dataset && el.dataset.app) || '';
        if (!app && window.VessieWM && typeof window.VessieWM.list === 'function') {
          const found = (window.VessieWM.list() || []).find(w => w.id === winId);
          app = (found && found.app) || '';
        }
      } catch (_) {}
      if (!app) { try { toast('Sem app associado para reiniciar.', 'error'); } catch (_) {} return; }
      try {
        if (window.VessieWM && typeof window.VessieWM.close === 'function') window.VessieWM.close(winId);
        else document.getElementById(winId)?.remove();
      } catch (_) {}
      addHistory(`🔄 "${app}" reiniciado`, 'success');
      setTimeout(() => {
        try { if (typeof window.openApp === 'function') window.openApp(app); } catch (_) {}
        renderProcesses();
      }, 250);
    };

    // ---------- CRIA A JANELA (shell em view.html; fallback verbatim) ----------
    const tmFallback = `
    <style>
      .taskmgr-container {
        display:flex;
        flex-direction:column;
        height:100%;
        background:#1a1a2e;
        color:#eef2ff;
        overflow:hidden;
        font-family:'Segoe UI',system-ui,sans-serif;
      }
      .taskmgr-tabs {
        display:flex;
        gap:0;
        background:rgba(0,0,0,.2);
        border-bottom:1px solid rgba(255,255,255,.05);
        padding:0 12px;
        flex-shrink:0;
      }
      .taskmgr-tab {
        padding:10px 18px;
        font-size:.78rem;
        font-weight:500;
        color:var(--dim);
        cursor:pointer;
        border-bottom:2px solid transparent;
        transition:.14s;
        background:transparent;
        border-top:none;
        border-left:none;
        border-right:none;
        font-family:inherit;
      }
      .taskmgr-tab:hover {
        color:#fff;
        background:rgba(255,255,255,.04);
      }
      .taskmgr-tab.active {
        color:#fff;
        border-bottom-color:var(--a);
        background:rgba(96,165,250,.08);
      }
      .taskmgr-content {
        flex:1;
        overflow:auto;
        padding:12px 16px;
        background:rgba(0,0,0,.15);
      }
      .taskmgr-content::-webkit-scrollbar { width:6px; }
      .taskmgr-content::-webkit-scrollbar-thumb { background:var(--a); border-radius:3px; }
      .taskmgr-stats {
        display:grid;
        grid-template-columns:repeat(auto-fit,minmax(120px,1fr));
        gap:10px;
        margin-bottom:16px;
        background:rgba(255,255,255,.03);
        border-radius:10px;
        padding:12px 16px;
        border:1px solid rgba(255,255,255,.05);
      }
      .taskmgr-stat-item {
        text-align:center;
      }
      .taskmgr-stat-item .label {
        font-size:.65rem;
        text-transform:uppercase;
        color:var(--dim);
        letter-spacing:.05em;
      }
      .taskmgr-stat-item .value {
        font-size:1.2rem;
        font-weight:600;
        color:#fff;
        margin-top:2px;
      }
      .taskmgr-table {
        width:100%;
        border-collapse:collapse;
        font-size:.82rem;
      }
      .taskmgr-table thead th {
        text-align:left;
        padding:8px 12px;
        color:var(--dim);
        border-bottom:1px solid rgba(255,255,255,.06);
        font-weight:600;
        font-size:.7rem;
        text-transform:uppercase;
        letter-spacing:.05em;
        position:sticky;
        top:0;
        background:#1a1a2e;
        z-index:2;
      }
      .taskmgr-table tbody tr {
        transition:.1s;
      }
      .taskmgr-table tbody tr:hover {
        background:rgba(255,255,255,.04);
      }
      .taskmgr-table tbody td {
        padding:8px 12px;
        border-bottom:1px solid rgba(255,255,255,.03);
      }
      .taskmgr-perf {
        display:grid;
        grid-template-columns:repeat(auto-fit,minmax(160px,1fr));
        gap:12px;
        margin-top:16px;
      }
      .taskmgr-perf-card {
        background:rgba(255,255,255,.04);
        border:1px solid rgba(255,255,255,.06);
        border-radius:10px;
        padding:14px 16px;
      }
      .taskmgr-perf-card .label {
        font-size:.7rem;
        color:var(--dim);
        text-transform:uppercase;
        letter-spacing:.04em;
      }
      .taskmgr-perf-card .value {
        font-size:1.5rem;
        font-weight:600;
        color:#fff;
        margin-top:2px;
      }
      .taskmgr-perf-card .bar {
        height:4px;
        background:rgba(255,255,255,.08);
        border-radius:2px;
        margin-top:6px;
        overflow:hidden;
      }
      .taskmgr-perf-card .bar .fill {
        height:100%;
        border-radius:2px;
        transition:width .8s ease;
        width:0%;
      }
      .taskmgr-actions {
        display:flex;
        gap:8px;
        margin-top:12px;
        flex-wrap:wrap;
      }
      .taskmgr-actions button {
        background:rgba(255,255,255,.06);
        border:1px solid rgba(255,255,255,.06);
        color:#fff;
        padding:6px 14px;
        border-radius:6px;
        font-size:.78rem;
        cursor:pointer;
        transition:.14s;
      }
      .taskmgr-actions button:hover {
        background:rgba(255,255,255,.12);
      }
      @media (max-width:640px) {
        .taskmgr-stats { grid-template-columns:repeat(2,1fr); }
        .taskmgr-perf { grid-template-columns:1fr; }
        .taskmgr-table { font-size:.72rem; }
        .taskmgr-table thead th, .taskmgr-table tbody td { padding:6px 8px; }
      }
    </style>

    <div class="taskmgr-container">
      <!-- Abas -->
      <div class="taskmgr-tabs">
        <button class="taskmgr-tab active" data-tab="processos" onclick="switchTaskTab('processos')"><i class="fas fa-list"></i> Processos</button>
        <button class="taskmgr-tab" data-tab="desempenho" onclick="switchTaskTab('desempenho')"><i class="fas fa-chart-bar"></i> Desempenho</button>
        <button class="taskmgr-tab" data-tab="usuarios" onclick="switchTaskTab('usuarios')"><i class="fas fa-users"></i> Usuários</button>
        <button class="taskmgr-tab" data-tab="historico" onclick="switchTaskTab('historico')"><i class="fas fa-clock"></i> Histórico</button>
      </div>

      <!-- Conteúdo -->
      <div class="taskmgr-content" id="taskmgr-content">
        <!-- ABA PROCESSOS -->
        <div id="taskmgr-panel-processos">
          <div class="taskmgr-stats">
            <div class="taskmgr-stat-item">
              <div class="label">Processos</div>
              <div class="value" id="taskmgr-proc-count">0</div>
            </div>
            <div class="taskmgr-stat-item">
              <div class="label">RAM</div>
              <div class="value" id="taskmgr-ram">—</div>
            </div>
            <div class="taskmgr-stat-item">
              <div class="label">Disco</div>
              <div class="value" id="taskmgr-disk">—</div>
            </div>
            <div class="taskmgr-stat-item">
              <div class="label">Rede</div>
              <div class="value" id="taskmgr-net" style="font-size:.95rem;">—</div>
            </div>
          </div>

          <table class="taskmgr-table">
            <thead>
              <tr>
                <th>Processo</th>
                <th style="text-align:center;">Nós DOM</th>
                <th style="text-align:center;">Status</th>
                <th style="text-align:center;">Ação</th>
              </tr>
            </thead>
            <tbody id="taskmgr-tbody"></tbody>
          </table>

          <div class="taskmgr-actions">
            <button onclick="refreshProcesses()"><i class="fas fa-sync-alt"></i> Atualizar</button>
          </div>
          <p style="font-size:.7rem;color:#5b6680;margin-top:8px;">Janelas reais do VessieWM. Finalizar remove a janela mesmo que o app tenha travado.</p>
        </div>

        <!-- ABA DESEMPENHO -->
        <div id="taskmgr-panel-desempenho" style="display:none;">
          <div class="taskmgr-perf">
            <div class="taskmgr-perf-card">
              <div class="label">CPU · núcleos</div>
              <div class="value" id="perf-cpu">—</div>
              <div class="bar"><div class="fill" id="perf-cpu-bar" style="width:0%;background:var(--a);"></div></div>
            </div>
            <div class="taskmgr-perf-card">
              <div class="label">RAM · heap JS</div>
              <div class="value" id="perf-ram">—</div>
              <div class="bar"><div class="fill" id="perf-ram-bar" style="width:0%;background:var(--a2);"></div></div>
            </div>
            <div class="taskmgr-perf-card">
              <div class="label">Disco · localStorage</div>
              <div class="value" id="perf-disk">—</div>
              <div class="bar"><div class="fill" id="perf-disk-bar" style="width:0%;background:var(--a3);"></div></div>
            </div>
            <div class="taskmgr-perf-card">
              <div class="label">Rede</div>
              <div class="value" id="perf-net" style="font-size:1.05rem;">—</div>
            </div>
            <div class="taskmgr-perf-card">
              <div class="label">Processos ativos</div>
              <div class="value" id="perf-proc">0</div>
            </div>
          </div>
          <div style="margin-top:16px;background:rgba(255,255,255,.03);border-radius:10px;padding:14px;border:1px solid rgba(255,255,255,.05);">
            <div style="font-size:.8rem;color:var(--dim);">📊 Janelas por peso (nós DOM reais)</div>
            <div id="perf-mem-details" style="margin-top:8px;font-size:.75rem;color:var(--text-2);"></div>
          </div>
          <p style="font-size:.7rem;color:#5b6680;margin-top:8px;">% de CPU por processo não é exposto pelo navegador; fluidez = quadros por segundo da interface.</p>
        </div>

        <!-- ABA USUÁRIOS -->
        <div id="taskmgr-panel-usuarios" style="display:none;">
          <div class="taskmgr-perf">
            <div class="taskmgr-perf-card">
              <div class="label">Sessão ativa</div>
              <div class="value" id="tmg-user" style="font-size:1.15rem;">—</div>
            </div>
            <div class="taskmgr-perf-card">
              <div class="label">Sessão desde</div>
              <div class="value" id="tmg-since" style="font-size:.95rem;">—</div>
            </div>
          </div>
          <p style="font-size:.74rem;color:var(--dim);margin-top:12px;">O VessieOS roda uma sessão por navegador; o nome vem do login e a persistência, do armazenamento local.</p>
        </div>

        <!-- ABA HISTÓRICO -->
        <div id="taskmgr-panel-historico" style="display:none;">
          <div style="background:rgba(255,255,255,.03);border-radius:10px;padding:14px;border:1px solid rgba(255,255,255,.05);">
            <div style="font-size:.8rem;color:var(--dim);">📋 Histórico de ações</div>
            <div id="taskmgr-history-list" style="margin-top:8px;font-size:.78rem;color:var(--text-2);max-height:300px;overflow-y:auto;">
              <div style="color:#5b6680;padding:4px 0;">Nenhuma ação registrada.</div>
            </div>
          </div>
          <div class="taskmgr-actions">
            <button onclick="clearHistory()"><i class="fas fa-trash"></i> Limpar histórico</button>
          </div>
        </div>
      </div>
    </div>
  `;
    const tmData = {};
    const win = createWin('Gerenciador de Tarefas', '📊', '<div class="app-loading">Carregando…</div>', 700, 520, 'taskmanager');
    const wire = () => wireTaskMgr(win);
    if (window.VessieBridge && typeof window.VessieBridge.loadView === 'function') {
      window.VessieBridge.loadView('task-manager', { html: tmFallback }, tmData).then(({ html }) => {
        if (!document.body.contains(win)) return;
        win.querySelector('.wb').innerHTML = html;
        wire();
      });
    } else {
      win.querySelector('.wb').innerHTML = tmFallback;
      wire();
    }
    return win;
  }

function wireTaskMgr(win) {

    // ---------- FUNÇÕES DE ABA ----------
    window.switchTaskTab = function (tab) {
      document.querySelectorAll('.taskmgr-tab').forEach(el => el.classList.remove('active'));
      document.querySelector(`.taskmgr-tab[data-tab="${tab}"]`).classList.add('active');
      document.querySelectorAll('#taskmgr-content > div').forEach(el => el.style.display = 'none');
      document.getElementById(`taskmgr-panel-${tab}`).style.display = 'block';
      if (tab === 'desempenho') updatePerfPanel();
      if (tab === 'usuarios') updateUsersPanel();
      if (tab === 'historico') updateHistoryPanel();
    };

    // ---------- HISTÓRICO ----------
    let historyLog = [];

    function addHistory(message, type = 'info') {
      const time = new Date().toLocaleTimeString('pt-BR');
      historyLog.unshift({ time, message, type });
      if (historyLog.length > 50) historyLog.pop();
      updateHistoryPanel();
    }

    function updateHistoryPanel() {
      const container = document.getElementById('taskmgr-history-list');
      if (!container) return;
      if (!historyLog.length) {
        container.innerHTML = '<div style="color:#5b6680;padding:4px 0;">Nenhuma ação registrada.</div>';
        return;
      }
      container.innerHTML = historyLog.map(h => `
      <div style="padding:4px 0;border-bottom:1px solid rgba(255,255,255,.03);display:flex;gap:10px;font-size:.78rem;">
        <span style="color:#5b6680;font-size:.65rem;">${h.time}</span>
        <span style="color:${h.type === 'error' ? '#f87171' : h.type === 'success' ? '#4ade80' : 'var(--text-2)'};">${h.message}</span>
      </div>
    `).join('');
    }

    window.clearHistory = function () {
      historyLog = [];
      updateHistoryPanel();
      toast('Histórico limpo', 'default');
    };

    window.refreshProcesses = function () {
      renderProcesses();
      addHistory('🔄 Lista de processos atualizada', 'info');
      toast('🔄 Processos atualizados', 'default');
    };

    // ---------- FLUIDEZ (fps real via rAF) ----------
    let fpsFrames = 0, fpsLast = performance.now(), fpsValue = 60;
    let rafId = null;
    function fpsTick(now) {
      fpsFrames++;
      if (now - fpsLast >= 1000) {
        fpsValue = Math.round(fpsFrames * 1000 / (now - fpsLast));
        fpsFrames = 0;
        fpsLast = now;
      }
      rafId = requestAnimationFrame(fpsTick);
    }
    rafId = requestAnimationFrame(fpsTick);

    // ---------- ABA DESEMPENHO ----------
    function updatePerfPanel() {
      const m = sysMetrics();
      const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
      const bar = (id, pct) => { const el = document.getElementById(id); if (el) el.style.width = Math.max(0, Math.min(100, pct)) + '%'; };
      set('perf-cpu', String(m.cores));
      bar('perf-cpu-bar', (fpsValue / 60) * 100);
      const ramPct = m.heap ? (m.heap.used / m.heap.total) * 100 : 0;
      set('perf-ram', m.heap ? fmtMB(m.heap.used) + ' / ' + fmtMB(m.heap.total) : 'n/d');
      bar('perf-ram-bar', ramPct);
      const diskPct = (m.lsUsed / m.lsTotal) * 100;
      set('perf-disk', fmtMB(m.lsUsed) + ' / ' + fmtMB(m.lsTotal));
      bar('perf-disk-bar', diskPct);
      const netTxt = !m.online ? 'offline' : (m.net ? `${m.net.type || ''} ${m.net.down != null ? m.net.down + 'Mb/s' : ''}`.trim() || 'online' : 'online');
      set('perf-net', netTxt);
      const procs = realProcs();
      set('perf-proc', String(procs.length));
      const details = document.getElementById('perf-mem-details');
      if (details) {
        const top = procs
          .map(p => ({ p, nodes: p.nodes }))
          .sort((a, b) => b.nodes - a.nodes)
          .slice(0, 6);
        details.innerHTML = top.length
          ? top.map(({ p, nodes }) => `<div style="display:flex;justify-content:space-between;padding:2px 0;"><span>${p.title.replace(/</g, '&lt;')}</span><span>${nodes} nós</span></div>`).join('')
          : '<div style="color:#5b6680;">Nenhuma janela aberta.</div>';
      }
    }

    // ---------- ABA USUÁRIOS ----------
    function updateUsersPanel() {
      const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };
      let user = 'Visitante';
      try { user = (window.S && window.S.user) || (window.VessieOS && window.VessieOS.currentUser) || 'Visitante'; } catch (_) {}
      set('tmg-user', user);
      set('tmg-since', bootTime());
    }

    // ---------- INICIALIZAÇÃO ----------
    renderProcesses();
    updateUsersPanel();
    window.renderProcesses = renderProcesses;

    // Atualização em tempo real (a cada 2 segundos)
    const interval = setInterval(() => {
      if (!document.body.contains(win)) { clearInterval(interval); return; }
      renderProcesses();
      const perfPanel = document.getElementById('taskmgr-panel-desempenho');
      if (perfPanel && perfPanel.style.display !== 'none') {
        updatePerfPanel();
      }
    }, 2000);

    // ---------- LIMPEZA ----------
    win.addEventListener('remove', () => {
      clearInterval(interval);
      if (rafId) cancelAnimationFrame(rafId);
      delete window.endProcess;
      delete window.restartProcess;
      delete window.switchTaskTab;
      delete window.refreshProcesses;
      delete window.clearHistory;
    });

    // ---------- PATCH: Fechar janela ao clicar no X ----------
    const closeBtn = win.querySelector('.cl');
    if (closeBtn) {
      const originalClick = closeBtn.onclick;
      closeBtn.onclick = function (e) {
        if (originalClick) originalClick.call(this, e);
        clearInterval(interval);
        if (rafId) cancelAnimationFrame(rafId);
      };
    }
  }
window.openTaskManager = openTaskManager;
})();

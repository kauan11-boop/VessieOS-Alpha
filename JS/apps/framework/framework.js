// framework.js — extraído de JS/core/main.js (VessieOS)
// Depende de utilitários globais do kernel: S, VFS, toast, createWin, persistState, etc. (expostos em main.js)
(function () {
  "use strict";

function openFramework() {
    // ---------- ESTADO DO FRAMEWORK ----------
    const fwState = {
      optimizationCount: 0,
      vmCount: 0,
      logs: [],
      startTime: Date.now(),
      metrics: {
        cpu: 0,
        ram: 0,
        disk: 0,
        uptime: 0
      },
      modules: [],
      services: [],
      optimizations: [
        'Lazy loading de iframes',
        'Cache e snapshot de VMs',
        'Falha tolerante para LM Studio',
        'Scheduler de render e eventos',
        'Sandbox reforçado para jogos',
        'Compressão de dados em memória',
        'Prefetch de assets',
        'GC otimizado para jogos'
      ],
      running: true
    };

    // ---------- FUNÇÕES AUXILIARES ----------
    function formatUptime(ms) {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
      if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
      if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
      return `${seconds}s`;
    }

    function addLog(message, type = 'info') {
      const time = new Date().toLocaleTimeString('pt-BR');
      fwState.logs.unshift({ time, message, type });
      if (fwState.logs.length > 100) fwState.logs.pop();
      updateLogs();
    }

    function updateLogs() {
      const container = document.getElementById('fw-logs');
      if (!container) return;
      container.innerHTML = fwState.logs.slice(0, 20).map(log => `
      <div style="padding:3px 0;font-size:.72rem;color:${log.type === 'error' ? '#f87171' : log.type === 'success' ? '#4ade80' : 'var(--dim)'};border-bottom:1px solid rgba(255,255,255,.02);">
        <span style="color:#5b6680;">${log.time}</span> ${log.message}
      </div>
    `).join('');
    }

    function updateMetrics() {
      fwState.metrics.cpu = 2 + Math.random() * 18;
      fwState.metrics.ram = 25 + Math.random() * 30;
      fwState.metrics.disk = 45 + Math.random() * 20;
      fwState.metrics.uptime = Date.now() - fwState.startTime;

      document.getElementById('fw-cpu').textContent = fwState.metrics.cpu.toFixed(1) + '%';
      document.getElementById('fw-cpu-bar').style.width = fwState.metrics.cpu + '%';
      document.getElementById('fw-ram').textContent = fwState.metrics.ram.toFixed(0) + '%';
      document.getElementById('fw-ram-bar').style.width = fwState.metrics.ram + '%';
      document.getElementById('fw-disk').textContent = fwState.metrics.disk.toFixed(1) + '%';
      document.getElementById('fw-disk-bar').style.width = fwState.metrics.disk + '%';
      document.getElementById('fw-uptime').textContent = formatUptime(fwState.metrics.uptime);
    }

    // ---------- AÇÕES DO FRAMEWORK ----------
    window.fwApplyOptimization = function () {
      fwState.optimizationCount++;
      const opt = fwState.optimizations[fwState.optimizationCount % fwState.optimizations.length];
      addLog(`⚡ Otimização aplicada: ${opt}`, 'success');
      document.getElementById('fw-opt-count').textContent = fwState.optimizationCount;
      toast(`⚡ Otimização "${opt}" aplicada!`, 'success');
    };

    window.fwCreateVM = function () {
      fwState.vmCount++;
      VessieVMManager.create(`VM-${fwState.vmCount}`, 'sandbox');
      addLog(`🧠 VM criada: VM-${fwState.vmCount}`, 'success');
      document.getElementById('fw-vm-count').textContent = fwState.vmCount;
      toast(`🧠 VM criada com sucesso!`, 'success');
    };

    window.fwClearCache = function () {
      if (!confirm('Limpar cache do framework?')) return;
      fwState.logs = [];
      updateLogs();
      addLog('🧹 Cache limpo', 'info');
      toast('🧹 Cache limpo com sucesso!', 'success');
    };

    window.fwExportReport = function () {
      const data = {
        timestamp: new Date().toISOString(),
        uptime: formatUptime(fwState.metrics.uptime),
        optimizationCount: fwState.optimizationCount,
        vmCount: fwState.vmCount,
        metrics: fwState.metrics,
        logs: fwState.logs.slice(0, 20),
        modules: fwState.modules,
        services: fwState.services
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `framework_report_${Date.now()}.json`;
      a.click();
      addLog('📤 Relatório exportado', 'info');
      toast('📤 Relatório exportado com sucesso!', 'success');
    };

    window.fwRestartFramework = function () {
      if (!confirm('Reiniciar o Framework?')) return;
      addLog('🔄 Reiniciando Framework...', 'info');
      toast('🔄 Reiniciando...', 'default');
      setTimeout(() => {
        fwState.startTime = Date.now();
        fwState.optimizationCount = 0;
        fwState.vmCount = 0;
        fwState.logs = [];
        document.getElementById('fw-opt-count').textContent = 0;
        document.getElementById('fw-vm-count').textContent = 0;
        updateLogs();
        addLog('✅ Framework reiniciado com sucesso!', 'success');
        toast('✅ Framework reiniciado!', 'success');
      }, 1000);
    };

    window.fwSimulateLoad = function () {
      addLog('🔥 Simulando carga pesada...', 'info');
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 100) {
          clearInterval(interval);
          addLog('✅ Carga simulada concluída', 'success');
          toast('✅ Carga simulada concluída!', 'success');
          return;
        }
        fwState.metrics.cpu = 30 + Math.random() * 60;
        fwState.metrics.ram = 50 + Math.random() * 40;
        updateMetrics();
      }, 300);
    };

    // ---------- CONSTRÓI A INTERFACE ----------
    const report = VessieFramework.report();
    const runtime = VessieRuntime.snapshot();
    const ai = VessieAIEngine.describe();

    // Atualiza módulos e serviços
    fwState.modules = report.modules || ['Nenhum módulo ainda'];
    fwState.services = report.services || ['Nenhum serviço ainda'];

    const fwData = {
      fwOnline: report.initialized ? '✅ Online' : '⏳ Iniciando',
      fwUptime: formatUptime(runtime.uptimeMs || 0),
      fwAi: ai.provider || 'LM Studio',
      fwVms: runtime.counters.vms || 0,
      fwBootUptime: formatUptime(Date.now() - fwState.startTime),
      fwModules: (fwState.modules && fwState.modules.length) ? fwState.modules.map(m => `<span class="fw-tag">${m}</span>`).join('') : '<span class="fw-sec-empty">Nenhum módulo ativo</span>',
      fwServices: (fwState.services && fwState.services.length) ? fwState.services.map(s => `<span class="fw-tag">${s}</span>`).join('') : '<span class="fw-sec-empty">Nenhum serviço ativo</span>',
      fwOpts: fwState.optimizations.map(opt => `<li>${opt}</li>`).join('')
    };
    const fwFallback = `
    <style>
      .fw-container {
        display:flex;
        flex-direction:column;
        height:100%;
        background:linear-gradient(180deg,#0a0c14,#141824);
        color:#eef2ff;
        overflow:hidden;
        font-family:'Segoe UI',system-ui,sans-serif;
      }
      .fw-top {
        display:grid;
        grid-template-columns:repeat(auto-fit,minmax(140px,1fr));
        gap:10px;
        padding:14px 18px;
        background:rgba(0,0,0,.3);
        border-bottom:1px solid rgba(255,255,255,.05);
        flex-shrink:0;
      }
      .fw-card {
        background:rgba(255,255,255,.04);
        border:1px solid rgba(255,255,255,.06);
        border-radius:10px;
        padding:12px 14px;
        text-align:center;
        transition:.14s;
      }
      .fw-card:hover {
        background:rgba(255,255,255,.07);
        transform:translateY(-2px);
      }
      .fw-card .fw-label {
        font-size:.62rem;
        text-transform:uppercase;
        color:var(--dim);
        letter-spacing:.05em;
      }
      .fw-card .fw-value {
        font-size:1.15rem;
        font-weight:600;
        color:#fff;
        margin-top:2px;
      }
      .fw-card .fw-value.green { color:#4ade80; }
      .fw-card .fw-value.blue { color:#60a5fa; }
      .fw-card .fw-value.purple { color:#a78bfa; }
      .fw-card .fw-value.gold { color:#fbbf24; }

      .fw-body {
        display:flex;
        flex:1;
        overflow:hidden;
      }
      .fw-main {
        flex:1;
        overflow-y:auto;
        padding:14px 18px;
      }
      .fw-main::-webkit-scrollbar { width:4px; }
      .fw-main::-webkit-scrollbar-thumb { background:var(--a); border-radius:4px; }

      .fw-sidebar {
        width:220px;
        background:rgba(0,0,0,.25);
        border-left:1px solid rgba(255,255,255,.04);
        padding:12px 14px;
        overflow-y:auto;
        flex-shrink:0;
      }
      .fw-sidebar::-webkit-scrollbar { width:4px; }
      .fw-sidebar::-webkit-scrollbar-thumb { background:var(--a2); border-radius:4px; }

      .fw-metric {
        margin-bottom:12px;
      }
      .fw-metric .fw-metric-label {
        display:flex;
        justify-content:space-between;
        font-size:.72rem;
        color:var(--dim);
      }
      .fw-metric .fw-metric-bar {
        height:4px;
        background:rgba(255,255,255,.06);
        border-radius:2px;
        margin-top:3px;
        overflow:hidden;
      }
      .fw-metric .fw-metric-bar .fw-metric-fill {
        height:100%;
        border-radius:2px;
        transition:width .6s ease;
        width:0%;
      }
      .fw-metric .fw-metric-bar .fw-metric-fill.cpu { background:linear-gradient(90deg,#60a5fa,#a78bfa); }
      .fw-metric .fw-metric-bar .fw-metric-fill.ram { background:linear-gradient(90deg,#34d399,#22d3ee); }
      .fw-metric .fw-metric-bar .fw-metric-fill.disk { background:linear-gradient(90deg,#fbbf24,#f59e0b); }

      .fw-section {
        background:rgba(255,255,255,.03);
        border:1px solid rgba(255,255,255,.05);
        border-radius:10px;
        padding:14px 16px;
        margin-bottom:12px;
      }
      .fw-section .fw-section-title {
        font-size:.78rem;
        font-weight:600;
        color:#fff;
        margin-bottom:8px;
        display:flex;
        align-items:center;
        gap:8px;
      }
      .fw-section .fw-section-title i { color:var(--a2); }

      .fw-module-list, .fw-service-list {
        display:flex;
        flex-wrap:wrap;
        gap:6px;
      }
      .fw-module-list .fw-tag, .fw-service-list .fw-tag {
        background:rgba(96,165,250,.12);
        border:1px solid rgba(96,165,250,.2);
        border-radius:6px;
        padding:3px 10px;
        font-size:.72rem;
        color:#93c5fd;
        white-space:nowrap;
      }
      .fw-service-list .fw-tag {
        background:rgba(167,139,250,.12);
        border-color:rgba(167,139,250,.2);
        color:#c4b5fd;
      }

      .fw-actions {
        display:flex;
        flex-wrap:wrap;
        gap:8px;
        margin-top:12px;
      }
      .fw-actions button {
        background:rgba(255,255,255,.06);
        border:1px solid rgba(255,255,255,.08);
        color:#fff;
        padding:7px 14px;
        border-radius:8px;
        font-size:.78rem;
        cursor:pointer;
        transition:.14s;
        display:flex;
        align-items:center;
        gap:6px;
      }
      .fw-actions button:hover {
        background:rgba(255,255,255,.12);
        border-color:rgba(255,255,255,.15);
        transform:translateY(-1px);
      }
      .fw-actions button.primary {
        background:linear-gradient(135deg,var(--a),var(--a2));
        border-color:transparent;
      }
      .fw-actions button.primary:hover {
        filter:brightness(1.1);
      }
      .fw-actions button.danger {
        background:rgba(239,68,68,.15);
        border-color:rgba(239,68,68,.2);
        color:#f87171;
      }
      .fw-actions button.danger:hover {
        background:rgba(239,68,68,.25);
      }
      .fw-actions button.success {
        background:rgba(74,222,128,.15);
        border-color:rgba(74,222,128,.2);
        color:#4ade80;
      }
      .fw-actions button.success:hover {
        background:rgba(74,222,128,.25);
      }

      .fw-logs-container {
        max-height:180px;
        overflow-y:auto;
        background:rgba(0,0,0,.2);
        border-radius:8px;
        padding:8px 12px;
        font-size:.72rem;
        font-family:'Consolas',monospace;
      }
      .fw-logs-container::-webkit-scrollbar { width:3px; }
      .fw-logs-container::-webkit-scrollbar-thumb { background:var(--a); border-radius:3px; }

      .fw-optimization-list {
        display:grid;
        grid-template-columns:1fr 1fr;
        gap:4px 16px;
        font-size:.72rem;
        color:var(--dim);
      }
      .fw-optimization-list li {
        list-style:none;
        padding:2px 0;
      }
      .fw-optimization-list li::before {
        content:'✅ ';
        color:#4ade80;
      }

      @media (max-width:768px) {
        .fw-body { flex-direction:column; }
        .fw-sidebar { width:100%; border-left:none; border-top:1px solid rgba(255,255,255,.04); max-height:200px; }
        .fw-top { grid-template-columns:repeat(2,1fr); }
        .fw-optimization-list { grid-template-columns:1fr; }
      }
    </style>

    <div class="fw-container">
      <!-- TOPO: Cards de status -->
      <div class="fw-top">
        <div class="fw-card">
          <div class="fw-label">Framework</div>
          <div class="fw-value green">${report.initialized ? '✅ Online' : '⏳ Iniciando'}</div>
        </div>
        <div class="fw-card">
          <div class="fw-label">Runtime</div>
          <div class="fw-value blue">${formatUptime(runtime.uptimeMs || 0)}</div>
        </div>
        <div class="fw-card">
          <div class="fw-label">IA</div>
          <div class="fw-value purple">${ai.provider || 'LM Studio'}</div>
        </div>
        <div class="fw-card">
          <div class="fw-label">VMs</div>
          <div class="fw-value gold" id="fw-vm-count">${runtime.counters.vms || 0}</div>
        </div>
        <div class="fw-card">
          <div class="fw-label">Otimizações</div>
          <div class="fw-value blue" id="fw-opt-count">0</div>
        </div>
        <div class="fw-card">
          <div class="fw-label">Uptime</div>
          <div class="fw-value gold" id="fw-uptime">${formatUptime(Date.now() - fwState.startTime)}</div>
        </div>
      </div>

      <!-- CORPO: Principal + Sidebar -->
      <div class="fw-body">
        <div class="fw-main">
          <!-- Módulos e Serviços -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="fw-section">
              <div class="fw-section-title"><i class="fas fa-puzzle-piece"></i> Módulos</div>
              <div class="fw-module-list">
                ${(fwState.modules && fwState.modules.length) ? fwState.modules.map(m => `<span class="fw-tag">${m}</span>`).join('') : '<span style="color:var(--dim);font-size:.78rem;">Nenhum módulo ativo</span>'}
              </div>
            </div>
            <div class="fw-section">
              <div class="fw-section-title"><i class="fas fa-cogs"></i> Serviços</div>
              <div class="fw-service-list">
                ${(fwState.services && fwState.services.length) ? fwState.services.map(s => `<span class="fw-tag">${s}</span>`).join('') : '<span style="color:var(--dim);font-size:.78rem;">Nenhum serviço ativo</span>'}
              </div>
            </div>
          </div>

          <!-- Otimizações -->
          <div class="fw-section">
            <div class="fw-section-title"><i class="fas fa-bolt" style="color:#fbbf24;"></i> Otimizações ativas</div>
            <ul class="fw-optimization-list">
              ${fwState.optimizations.map(opt => `<li>${opt}</li>`).join('')}
            </ul>
          </div>

          <!-- Logs -->
          <div class="fw-section">
            <div class="fw-section-title"><i class="fas fa-terminal" style="color:#60a5fa;"></i> Logs do sistema</div>
            <div class="fw-logs-container" id="fw-logs">
              <div style="color:#5b6680;font-size:.72rem;">Nenhum log registrado.</div>
            </div>
          </div>

          <!-- Ações -->
          <div class="fw-actions">
            <button class="primary" onclick="fwApplyOptimization()"><i class="fas fa-rocket"></i> Aplicar otimização</button>
            <button class="success" onclick="fwCreateVM()"><i class="fas fa-server"></i> Criar VM</button>
            <button onclick="openApp('vm')" style="background:rgba(167,139,250,.15);border-color:rgba(167,139,250,.2);color:#c4b5fd;"><i class="fas fa-cubes"></i> VM Manager</button>
            <button onclick="fwSimulateLoad()" style="background:rgba(251,191,36,.15);border-color:rgba(251,191,36,.2);color:#fbbf24;"><i class="fas fa-fire"></i> Simular carga</button>
            <button onclick="fwExportReport()" style="background:rgba(96,165,250,.15);border-color:rgba(96,165,250,.2);color:#60a5fa;"><i class="fas fa-download"></i> Exportar relatório</button>
            <button onclick="fwClearCache()" class="danger"><i class="fas fa-broom"></i> Limpar cache</button>
            <button onclick="fwRestartFramework()" style="background:rgba(244,67,54,.15);border-color:rgba(244,67,54,.2);color:#f87171;"><i class="fas fa-sync-alt"></i> Reiniciar</button>
          </div>
        </div>

        <!-- SIDEBAR: Métricas em tempo real -->
        <div class="fw-sidebar">
          <div style="font-size:.7rem;text-transform:uppercase;color:var(--dim);letter-spacing:.05em;margin-bottom:12px;">📊 Métricas do sistema</div>

          <div class="fw-metric">
            <div class="fw-metric-label"><span>CPU</span><span id="fw-cpu">0%</span></div>
            <div class="fw-metric-bar"><div class="fw-metric-fill cpu" id="fw-cpu-bar" style="width:0%;"></div></div>
          </div>

          <div class="fw-metric">
            <div class="fw-metric-label"><span>RAM</span><span id="fw-ram">0%</span></div>
            <div class="fw-metric-bar"><div class="fw-metric-fill ram" id="fw-ram-bar" style="width:0%;"></div></div>
          </div>

          <div class="fw-metric">
            <div class="fw-metric-label"><span>Disco</span><span id="fw-disk">0%</span></div>
            <div class="fw-metric-bar"><div class="fw-metric-fill disk" id="fw-disk-bar" style="width:0%;"></div></div>
          </div>

          <div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,.04);">
            <div style="font-size:.7rem;color:var(--dim);">
              <div>🧠 IA: <span style="color:#a78bfa;">${ai.provider}</span></div>
              <div>📦 VMs: <span id="fw-vm-count-side">${runtime.counters.vms || 0}</span></div>
              <div>⚡ Otimizações: <span id="fw-opt-count-side">0</span></div>
              <div style="margin-top:4px;font-size:.65rem;color:#5b6680;">Uptime: <span id="fw-uptime-side">${formatUptime(Date.now() - fwState.startTime)}</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
    const win = createWin('Vessie Framework', '⚙️', '<div class="app-loading">Carregando…</div>', 880, 680);
    const wire = () => wireFramework(win);
    if (window.VessieBridge && typeof window.VessieBridge.loadView === 'function') {
      window.VessieBridge.loadView('framework', { html: fwFallback }, fwData).then(({ html }) => {
        if (!document.body.contains(win)) return;
        win.querySelector('.wb').innerHTML = html;
        wire();
      });
    } else {
      win.querySelector('.wb').innerHTML = fwFallback;
      wire();
    }
    return win;
  }

function wireFramework(win) {

    // ---------- INICIALIZAÇÃO ----------
    addLog('🚀 Framework inicializado', 'success');
    addLog(`📦 ${fwState.modules.length} módulos carregados`, 'info');
    addLog(`🔧 ${fwState.services.length} serviços disponíveis`, 'info');

    // Atualiza contadores
    document.getElementById('fw-opt-count').textContent = fwState.optimizationCount;
    document.getElementById('fw-opt-count-side').textContent = fwState.optimizationCount;
    document.getElementById('fw-vm-count').textContent = fwState.vmCount;
    document.getElementById('fw-vm-count-side').textContent = fwState.vmCount;

    // Atualiza métricas a cada 2 segundos
    const metricInterval = setInterval(() => {
      if (!fwState.running) return;
      updateMetrics();
      // Atualiza uptime
      const uptime = formatUptime(Date.now() - fwState.startTime);
      document.getElementById('fw-uptime').textContent = uptime;
      document.getElementById('fw-uptime-side').textContent = uptime;
    }, 2000);

    // ---------- LIMPEZA ----------
    win.addEventListener('remove', () => {
      fwState.running = false;
      clearInterval(metricInterval);
      // Remove funções globais
      delete window.fwApplyOptimization;
      delete window.fwCreateVM;
      delete window.fwClearCache;
      delete window.fwExportReport;
      delete window.fwRestartFramework;
      delete window.fwSimulateLoad;
    });

    // Patch no fechamento da janela
    const closeBtn = win.querySelector('.cl');
    if (closeBtn) {
      const originalClick = closeBtn.onclick;
      closeBtn.onclick = function (e) {
        if (originalClick) originalClick.call(this, e);
        fwState.running = false;
        clearInterval(metricInterval);
      };
    }
  }
window.openFramework = openFramework;
})();

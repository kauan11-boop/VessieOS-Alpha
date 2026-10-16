// nvidia.js — extraído de JS/core/main.js (VessieOS)
// Depende de utilitários globais do kernel: S, VFS, toast, createWin, persistState, etc. (expostos em main.js)
(function () {
  "use strict";

function openNvidia() {
    // ---------- ESTADO INTERNO ----------
    const state = {
      drivers: {
        version: '572.83',
        studio: '572.70',
        gameReady: '572.83',
        lastCheck: Date.now() - 86400000,
        installed: '572.83',
        history: ['572.83 (30/05/2026)', '572.60 (15/05/2026)', '572.42 (28/04/2026)', '572.16 (10/04/2026)']
      },
      gpu: {
        name: 'NVIDIA GeForce RTX 5080',
        vram: '16 GB GDDR7',
        temp: 42,
        maxTemp: 82,
        fanSpeed: 38,
        usage: 12,
        memoryUsage: 18,
        power: 68,
        clock: 2670,
        memoryClock: 11250,
        voltage: 0.985
      },
      overclock: {
        coreOffset: 0,
        memoryOffset: 0,
        powerLimit: 100,
        tempLimit: 83
      },
      settings: {
        autoUpdate: true,
        notifications: true,
        lowLatency: true,
        gsync: true,
        dlss: true,
        reflex: true,
        hdr: true,
        vSync: false,
        shadowPlay: true,
        experimental: false
      },
      redeemed: [
        { code: 'NVIDIA-2026-GIFT', date: '15/05/2026', game: 'Cyberpunk 2077: Phantom Liberty' },
        { code: 'DLSS-PROMO', date: '10/05/2026', game: 'Alan Wake 2' }
      ],
      notifications: []
    };

    // ---------- FUNÇÕES AUXILIARES ----------
    function addNotification(msg, type = 'info') {
      state.notifications.unshift({ msg, type, time: Date.now() });
      if (state.notifications.length > 20) state.notifications.pop();
      updateNotifications();
    }

    function updateNotifications() {
      const container = document.getElementById('nvidia-notifications');
      if (!container) return;
      container.innerHTML = state.notifications.length ? state.notifications.slice(0, 5).map(n =>
        `<div style="padding:6px 10px;background:rgba(255,255,255,.04);border-left:2px solid ${n.type === 'success' ? '#4ade80' : n.type === 'error' ? '#ef4444' : '#66c0f4'};margin-bottom:4px;border-radius:4px;font-size:.78rem;">
        ${n.msg}
      </div>`
      ).join('') : '<div style="color:#5b6680;font-size:.78rem;">Nenhuma notificação</div>';
    }

    function simulateGPU() {
      state.gpu.temp = 38 + Math.random() * 15;
      state.gpu.fanSpeed = 30 + Math.random() * 25;
      state.gpu.usage = 5 + Math.random() * 25;
      state.gpu.memoryUsage = 10 + Math.random() * 20;
      state.gpu.power = 50 + Math.random() * 30;
      state.gpu.clock = 2640 + Math.random() * 60;
      updateMetrics();
    }

    function updateMetrics() {
      const t = document.getElementById('gpu-temp');
      const f = document.getElementById('gpu-fan');
      const u = document.getElementById('gpu-usage');
      const m = document.getElementById('gpu-memory');
      const p = document.getElementById('gpu-power');
      const c = document.getElementById('gpu-clock');
      if (t) t.textContent = state.gpu.temp.toFixed(1) + '°C';
      if (f) f.textContent = state.gpu.fanSpeed.toFixed(0) + '%';
      if (u) {
        u.textContent = state.gpu.usage.toFixed(1) + '%';
        u.style.width = state.gpu.usage + '%';
      }
      if (m) {
        m.textContent = state.gpu.memoryUsage.toFixed(1) + '%';
        m.style.width = state.gpu.memoryUsage + '%';
      }
      if (p) p.textContent = state.gpu.power.toFixed(0) + 'W';
      if (c) c.textContent = state.gpu.clock.toFixed(0) + ' MHz';
    }

    // ---------- FUNÇÕES DE NAVEGAÇÃO ----------
    function navigateTo(section) {
      document.querySelectorAll('.nvidia-section').forEach(el => el.style.display = 'none');
      document.querySelectorAll('.nvidia-nav-item').forEach(el => el.classList.remove('active'));
      const target = document.getElementById('nvidia-' + section);
      if (target) target.style.display = 'block';
      const nav = document.querySelector(`.nvidia-nav-item[data-section="${section}"]`);
      if (nav) nav.classList.add('active');
    }

    // ---------- DRIVERS ----------
    function checkDrivers() {
      const btn = document.getElementById('nvidia-check-drivers');
      const status = document.getElementById('nvidia-driver-status');
      if (!btn || !status) return;
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verificando...';
      status.textContent = '🔍 Verificando atualizações...';
      setTimeout(() => {
        const hasUpdate = Math.random() > 0.65;
        if (hasUpdate) {
          const newVer = (572.8 + Math.random() * 0.5).toFixed(2);
          status.innerHTML = `✅ Nova versão disponível: <strong>${newVer}</strong> (atual: ${state.drivers.version})`;
          addNotification(`Nova versão do driver ${newVer} disponível!`, 'success');
        } else {
          status.innerHTML = `✅ Você está usando a versão mais recente (${state.drivers.version})`;
          addNotification('Drivers atualizados', 'info');
        }
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sync-alt"></i> Verificar';
        state.drivers.lastCheck = Date.now();
      }, 2000);
    }

    function installDriver() {
      const status = document.getElementById('nvidia-driver-status');
      if (!status) return;
      status.innerHTML = '⬇️ Baixando driver... (25%)';
      let progress = 25;
      const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 100) {
          clearInterval(interval);
          const newVer = (572.8 + Math.random() * 0.5).toFixed(2);
          state.drivers.installed = newVer;
          state.drivers.version = newVer;
          state.drivers.history.unshift(`${newVer} (${new Date().toLocaleDateString('pt-BR')})`);
          status.innerHTML = `✅ Driver ${newVer} instalado com sucesso! Reinicie o sistema para aplicar.`;
          addNotification(`Driver ${newVer} instalado!`, 'success');
          document.getElementById('nvidia-driver-version').textContent = newVer;
          document.getElementById('nvidia-driver-history').innerHTML = state.drivers.history.map(h => `<div>${h}</div>`).join('');
        } else {
          status.innerHTML = `⬇️ Instalando driver... (${Math.round(progress)}%)`;
        }
      }, 400);
    }

    // ---------- RESGATAR ----------
    function redeemCode() {
      const input = document.getElementById('nvidia-redeem-input');
      const status = document.getElementById('nvidia-redeem-status');
      if (!input || !status) return;
      const code = input.value.trim();
      if (!code) { status.textContent = '❌ Digite um código para resgatar.'; return; }
      status.textContent = '🔍 Verificando código...';
      setTimeout(() => {
        const valid = code.length >= 6 && (code.includes('NVIDIA') || code.includes('GIFT') || code.includes('DLSS'));
        if (valid) {
          const games = ['Cyberpunk 2077: Phantom Liberty', 'Alan Wake 2', 'Starfield', 'Diablo IV', 'Forza Motorsport'];
          const game = games[Math.floor(Math.random() * games.length)];
          state.redeemed.unshift({ code, date: new Date().toLocaleDateString('pt-BR'), game });
          status.innerHTML = `✅ Código <strong>${code}</strong> resgatado! Você recebeu <strong>${game}</strong>.`;
          input.value = '';
          document.getElementById('nvidia-redeemed-list').innerHTML = state.redeemed.map(r =>
            `<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:.8rem;">
            <span>🎮 ${r.game}</span>
            <span style="color:#5b6680;">${r.code} · ${r.date}</span>
          </div>`
          ).join('');
          addNotification(`Código ${code} resgatado! 🎮`, 'success');
        } else {
          status.textContent = '❌ Código inválido. Tente novamente.';
          addNotification('Código inválido', 'error');
        }
      }, 1500);
    }

    // ---------- OVERCLOCK ----------
    function applyOverclock() {
      const core = document.getElementById('nvidia-oc-core');
      const mem = document.getElementById('nvidia-oc-mem');
      const power = document.getElementById('nvidia-oc-power');
      const temp = document.getElementById('nvidia-oc-temp');
      if (!core || !mem || !power || !temp) return;
      state.overclock.coreOffset = parseInt(core.value);
      state.overclock.memoryOffset = parseInt(mem.value);
      state.overclock.powerLimit = parseInt(power.value);
      state.overclock.tempLimit = parseInt(temp.value);
      document.getElementById('nvidia-oc-core-val').textContent = core.value + ' MHz';
      document.getElementById('nvidia-oc-mem-val').textContent = mem.value + ' MHz';
      document.getElementById('nvidia-oc-power-val').textContent = power.value + '%';
      document.getElementById('nvidia-oc-temp-val').textContent = temp.value + '°C';

      // Empurrar TODOS os limites ao máximo simultaneamente = instabilidade.
      // Isso é puramente cosmético (uma simulação de tela azul dentro do
      // próprio VessieOS) — nada aqui toca hardware real.
      const coreMax = parseInt(core.max), memMax = parseInt(mem.max), powerMax = parseInt(power.max);
      const isMaxedOut = state.overclock.coreOffset >= coreMax && state.overclock.memoryOffset >= memMax && state.overclock.powerLimit >= powerMax;
      if (isMaxedOut) {
        addNotification('Instabilidade crítica detectada na GPU!', 'error');
        window.__vsysTriggerBSOD?.('OVERCLOCK_INSTABILITY_DETECTED', 'nvidia-settings.exe');
        return;
      }

      addNotification(`Overclock aplicado: Core +${core.value} MHz, Memória +${mem.value} MHz`, 'success');
      toast('Overclock aplicado! ⚡', 'success');
    }

    // ---------- CONFIGURAÇÕES ----------
    function toggleSetting(key) {
      state.settings[key] = !state.settings[key];
      const el = document.getElementById('nvidia-toggle-' + key);
      if (el) {
        el.querySelector('input').checked = state.settings[key];
        el.querySelector('.toggle-label').textContent = state.settings[key] ? 'Ativado' : 'Desativado';
      }
      addNotification(`${key} ${state.settings[key] ? 'ativado' : 'desativado'}`, 'info');
    }

    // ---------- DADOS DO SHELL (tokens {{tN}} do view.html) ----------
    const nvData = {
      t1: state.gpu.name,
      t2: state.drivers.version,
      t3: state.gpu.name,
      t4: state.gpu.vram,
      t5: state.gpu.temp > 75 ? '#ef4444' : state.gpu.temp > 60 ? '#fbbf24' : '#4ade80',
      t6: state.gpu.temp.toFixed(1),
      t7: state.gpu.maxTemp,
      t8: state.gpu.usage.toFixed(1),
      t9: state.gpu.usage,
      t10: state.gpu.fanSpeed.toFixed(0),
      t11: state.gpu.memoryUsage.toFixed(1),
      t12: state.gpu.memoryUsage,
      t13: state.gpu.power.toFixed(0),
      t14: state.gpu.clock.toFixed(0),
      t15: state.drivers.version,
      t16: new Date(state.drivers.lastCheck).toLocaleString('pt-BR'),
      t17: state.drivers.history.map(h => `<div style="padding:4px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:.8rem;">${h}</div>`).join(''),
      t18: state.gpu.temp.toFixed(1),
      t19: state.gpu.maxTemp,
      t20: state.gpu.clock.toFixed(0),
      t21: state.gpu.memoryClock.toFixed(0),
      t22: state.gpu.vram,
      t23: state.gpu.power.toFixed(0),
      t24: state.gpu.usage.toFixed(1),
      t25: state.gpu.usage,
      t26: state.gpu.memoryUsage.toFixed(1),
      t27: state.gpu.memoryUsage,
      t28: state.gpu.name,
      t29: state.gpu.vram,
      t30: state.drivers.version,
      t31: state.redeemed.length ? state.redeemed.map(r => `
                <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:.8rem;">
                  <span>🎮 ${r.game}</span>
                  <span style="color:#5b6680;">${r.code} · ${r.date}</span>
                </div>
              `).join('') : '<div style="color:#5b6680;font-size:.8rem;">Nenhum código resgatado ainda.</div>',
      t32: Object.entries(state.settings).map(([key, val]) => `
              <div class="nvidia-stat" id="nvidia-toggle-${key}">
                <span>${key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</span>
                <label class="nvidia-toggle">
                  <span class="toggle-label" style="font-size:.8rem;color:#8fa0bf;">${val ? 'Ativado' : 'Desativado'}</span>
                  <input type="checkbox" ${val ? 'checked' : ''} onchange="nvidiaToggle('${key}')">
                </label>
              </div>
            `).join('')
    };
    const nvFallback = `
    <style>
      .nvidia-nav-item {
        padding: 10px 14px;
        border-radius: 8px;
        cursor: pointer;
        transition: .14s;
        display: flex;
        align-items: center;
        gap: 10px;
        color: #8fa0bf;
        font-size: .85rem;
      }
      .nvidia-nav-item:hover {
        background: rgba(255,255,255,.06);
        color: #eef2ff;
      }
      .nvidia-nav-item.active {
        background: rgba(102,192,244,.15);
        color: #66c0f4;
        box-shadow: inset 3px 0 0 #66c0f4;
      }
      .nvidia-nav-item i { width: 18px; text-align: center; }
      .nvidia-section { display: none; animation: fu .25s ease; }
      .nvidia-section.active { display: block; }
      .nvidia-card {
        background: rgba(255,255,255,.04);
        border: 1px solid rgba(255,255,255,.08);
        border-radius: 12px;
        padding: 16px;
        margin-bottom: 14px;
        transition: .14s;
      }
      .nvidia-card:hover {
        border-color: rgba(255,255,255,.15);
      }
      .nvidia-stat {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 0;
        border-bottom: 1px solid rgba(255,255,255,.05);
      }
      .nvidia-stat:last-child { border-bottom: none; }
      .nvidia-progress-bar {
        height: 6px;
        background: rgba(255,255,255,.08);
        border-radius: 3px;
        overflow: hidden;
        margin-top: 4px;
      }
      .nvidia-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #66c0f4, #4f94c9);
        border-radius: 3px;
        transition: width .6s ease;
        width: 0%;
      }
      .nvidia-slider {
        width: 100%;
        accent-color: #66c0f4;
        cursor: pointer;
      }
      .nvidia-toggle {
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
      }
      .nvidia-toggle input[type="checkbox"] {
        appearance: none;
        width: 40px;
        height: 22px;
        background: rgba(255,255,255,.15);
        border-radius: 11px;
        position: relative;
        transition: .2s;
        cursor: pointer;
        flex-shrink: 0;
      }
      .nvidia-toggle input[type="checkbox"]:checked {
        background: #66c0f4;
      }
      .nvidia-toggle input[type="checkbox"]::after {
        content: '';
        position: absolute;
        width: 18px;
        height: 18px;
        background: #fff;
        border-radius: 50%;
        top: 2px;
        left: 2px;
        transition: .2s;
      }
      .nvidia-toggle input[type="checkbox"]:checked::after {
        left: 20px;
      }
      .nvidia-badge {
        background: #c0392b;
        color: #fff;
        border-radius: 50%;
        padding: 0 6px;
        font-size: .65rem;
        margin-left: auto;
      }
    </style>

    <div style="display:flex;height:100%;background:linear-gradient(135deg,#090b10,#101722);color:#eef2ff;font-family:'Segoe UI',sans-serif;overflow:hidden;">
      
      <!-- SIDEBAR -->
      <div style="width:220px;background:rgba(0,0,0,.35);border-right:1px solid rgba(255,255,255,.06);padding:16px 10px;display:flex;flex-direction:column;flex-shrink:0;overflow-y:auto;">
        <div style="display:flex;align-items:center;gap:10px;padding:0 4px 16px;border-bottom:1px solid rgba(255,255,255,.06);margin-bottom:12px;">
          <span style="font-size:1.6rem;background:linear-gradient(135deg,#66c0f4,#4f94c9);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-weight:800;">NVIDIA</span>
          <span style="font-size:.65rem;color:#5b6680;background:rgba(255,255,255,.06);padding:2px 8px;border-radius:10px;">APP</span>
        </div>
        <div class="nvidia-nav-item active" data-section="home" onclick="nvidiaNavigate('home')"><i class="fas fa-home"></i> Página inicial</div>
        <div class="nvidia-nav-item" data-section="drivers" onclick="nvidiaNavigate('drivers')"><i class="fas fa-microchip"></i> Drivers</div>
        <div class="nvidia-nav-item" data-section="performance" onclick="nvidiaNavigate('performance')"><i class="fas fa-chart-line"></i> Desempenho</div>
        <div class="nvidia-nav-item" data-section="overclock" onclick="nvidiaNavigate('overclock')"><i class="fas fa-tachometer-alt"></i> Overclock</div>
        <div class="nvidia-nav-item" data-section="system" onclick="nvidiaNavigate('system')"><i class="fas fa-desktop"></i> Sistema</div>
        <div class="nvidia-nav-item" data-section="redeem" onclick="nvidiaNavigate('redeem')"><i class="fas fa-gift"></i> Resgatar</div>
        <div class="nvidia-nav-item" data-section="settings" onclick="nvidiaNavigate('settings')"><i class="fas fa-cog"></i> Configurações</div>
        <div style="margin-top:auto;padding-top:12px;border-top:1px solid rgba(255,255,255,.06);font-size:.7rem;color:#5b6680;text-align:center;">
          <div>NVIDIA App v1.2.0</div>
          <div style="margin-top:2px;">GPU: ${state.gpu.name}</div>
        </div>
      </div>

      <!-- MAIN CONTENT -->
      <div style="flex:1;padding:20px 24px;overflow-y:auto;">

        <!-- NOTIFICAÇÕES (topo) -->
        <div id="nvidia-notifications" style="margin-bottom:16px;padding:8px 12px;background:rgba(0,0,0,.2);border-radius:8px;border:1px solid rgba(255,255,255,.04);min-height:36px;"></div>

        <!-- HOME -->
        <div class="nvidia-section active" id="nvidia-home">
          <h2 style="font-size:1.25rem;margin:0 0 4px;">Centro NVIDIA</h2>
          <p style="color:#8fa0bf;font-size:.9rem;line-height:1.6;margin:0 0 18px;">Painel de controle avançado para drivers, performance e experiências de jogos com IA.</p>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;">
            <div class="nvidia-card">
              <div style="font-size:.7rem;text-transform:uppercase;color:#5b6680;">Driver</div>
              <div style="font-size:1.1rem;font-weight:600;margin-top:4px;" id="nvidia-driver-version">${state.drivers.version}</div>
              <div style="font-size:.75rem;color:#66c0f4;">Game Ready</div>
            </div>
            <div class="nvidia-card">
              <div style="font-size:.7rem;text-transform:uppercase;color:#5b6680;">GPU</div>
              <div style="font-size:1.1rem;font-weight:600;margin-top:4px;">${state.gpu.name}</div>
              <div style="font-size:.75rem;color:#8fa0bf;">${state.gpu.vram}</div>
            </div>
            <div class="nvidia-card">
              <div style="font-size:.7rem;text-transform:uppercase;color:#5b6680;">Temperatura</div>
              <div style="font-size:1.5rem;font-weight:600;margin-top:4px;color:${state.gpu.temp > 75 ? '#ef4444' : state.gpu.temp > 60 ? '#fbbf24' : '#4ade80'};" id="gpu-temp">${state.gpu.temp.toFixed(1)}°C</div>
              <div style="font-size:.75rem;color:#8fa0bf;">Máx: ${state.gpu.maxTemp}°C</div>
            </div>
            <div class="nvidia-card">
              <div style="font-size:.7rem;text-transform:uppercase;color:#5b6680;">Uso</div>
              <div style="font-size:1.5rem;font-weight:600;margin-top:4px;" id="gpu-usage">${state.gpu.usage.toFixed(1)}%</div>
              <div class="nvidia-progress-bar"><div class="nvidia-progress-fill" id="gpu-usage" style="width:${state.gpu.usage}%;"></div></div>
            </div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-top:12px;">
            <div class="nvidia-card"><div style="font-size:.7rem;text-transform:uppercase;color:#5b6680;">Fan</div><div style="font-size:1.1rem;font-weight:600;" id="gpu-fan">${state.gpu.fanSpeed.toFixed(0)}%</div></div>
            <div class="nvidia-card"><div style="font-size:.7rem;text-transform:uppercase;color:#5b6680;">Memória</div><div style="font-size:1.1rem;font-weight:600;" id="gpu-memory">${state.gpu.memoryUsage.toFixed(1)}%</div><div class="nvidia-progress-bar"><div class="nvidia-progress-fill" id="gpu-memory" style="width:${state.gpu.memoryUsage}%;"></div></div></div>
            <div class="nvidia-card"><div style="font-size:.7rem;text-transform:uppercase;color:#5b6680;">Potência</div><div style="font-size:1.1rem;font-weight:600;" id="gpu-power">${state.gpu.power.toFixed(0)}W</div></div>
            <div class="nvidia-card"><div style="font-size:.7rem;text-transform:uppercase;color:#5b6680;">Clock</div><div style="font-size:1.1rem;font-weight:600;" id="gpu-clock">${state.gpu.clock.toFixed(0)} MHz</div></div>
          </div>
          <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap;">
            <button onclick="nvidiaCheckDrivers()" id="nvidia-check-drivers" style="background:#66c0f4;border:none;color:#090b10;padding:8px 18px;border-radius:8px;font-weight:600;cursor:pointer;transition:.14s;"><i class="fas fa-sync-alt"></i> Verificar drivers</button>
            <button onclick="nvidiaSimulate()" style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:#eef2ff;padding:8px 18px;border-radius:8px;cursor:pointer;transition:.14s;"><i class="fas fa-chart-bar"></i> Simular carga</button>
          </div>
          <div id="nvidia-driver-status" style="margin-top:10px;font-size:.85rem;color:#8fa0bf;"></div>
        </div>

        <!-- DRIVERS -->
        <div class="nvidia-section" id="nvidia-drivers">
          <h2 style="font-size:1.1rem;margin:0 0 4px;"><i class="fas fa-microchip" style="color:#66c0f4;"></i> Drivers</h2>
          <p style="color:#8fa0bf;font-size:.85rem;margin:0 0 16px;">Gerencie seus drivers NVIDIA.</p>
          <div class="nvidia-card">
            <div class="nvidia-stat"><span>Versão instalada</span><span style="font-weight:600;" id="nvidia-driver-version">${state.drivers.version}</span></div>
            <div class="nvidia-stat"><span>Tipo</span><span>Game Ready</span></div>
            <div class="nvidia-stat"><span>Última verificação</span><span>${new Date(state.drivers.lastCheck).toLocaleString('pt-BR')}</span></div>
            <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
              <button onclick="nvidiaCheckDrivers()" style="background:#66c0f4;border:none;color:#090b10;padding:6px 16px;border-radius:6px;font-weight:600;cursor:pointer;"><i class="fas fa-sync-alt"></i> Verificar</button>
              <button onclick="nvidiaInstallDriver()" style="background:rgba(102,192,244,.15);border:1px solid rgba(102,192,244,.3);color:#66c0f4;padding:6px 16px;border-radius:6px;cursor:pointer;"><i class="fas fa-download"></i> Instalar</button>
            </div>
            <div id="nvidia-driver-status" style="margin-top:8px;font-size:.85rem;color:#8fa0bf;"></div>
          </div>
          <div class="nvidia-card">
            <div style="font-weight:600;margin-bottom:8px;">Histórico de drivers</div>
            <div id="nvidia-driver-history">
              ${state.drivers.history.map(h => `<div style="padding:4px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:.8rem;">${h}</div>`).join('')}
            </div>
          </div>
        </div>

        <!-- PERFORMANCE -->
        <div class="nvidia-section" id="nvidia-performance">
          <h2 style="font-size:1.1rem;margin:0 0 4px;"><i class="fas fa-chart-line" style="color:#66c0f4;"></i> Desempenho</h2>
          <p style="color:#8fa0bf;font-size:.85rem;margin:0 0 16px;">Monitoramento em tempo real da sua GPU.</p>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;">
            <div class="nvidia-card"><div style="font-size:.7rem;text-transform:uppercase;color:#5b6680;">Temperatura</div><div style="font-size:1.8rem;font-weight:600;" id="gpu-temp-perf">${state.gpu.temp.toFixed(1)}°C</div><div style="font-size:.75rem;color:#8fa0bf;">Máx: ${state.gpu.maxTemp}°C</div></div>
            <div class="nvidia-card"><div style="font-size:.7rem;text-transform:uppercase;color:#5b6680;">Clock GPU</div><div style="font-size:1.8rem;font-weight:600;" id="gpu-clock-perf">${state.gpu.clock.toFixed(0)} MHz</div><div style="font-size:.75rem;color:#8fa0bf;">Base: 2640 MHz</div></div>
            <div class="nvidia-card"><div style="font-size:.7rem;text-transform:uppercase;color:#5b6680;">Memória</div><div style="font-size:1.8rem;font-weight:600;" id="gpu-mem-perf">${state.gpu.memoryClock.toFixed(0)} MHz</div><div style="font-size:.75rem;color:#8fa0bf;">${state.gpu.vram}</div></div>
            <div class="nvidia-card"><div style="font-size:.7rem;text-transform:uppercase;color:#5b6680;">Potência</div><div style="font-size:1.8rem;font-weight:600;" id="gpu-power-perf">${state.gpu.power.toFixed(0)} W</div><div style="font-size:.75rem;color:#8fa0bf;">TDP: 320W</div></div>
          </div>
          <div class="nvidia-card">
            <div style="font-weight:600;margin-bottom:8px;">Uso da GPU</div>
            <div class="nvidia-stat"><span>Utilização</span><span id="gpu-usage-label">${state.gpu.usage.toFixed(1)}%</span></div>
            <div class="nvidia-progress-bar"><div class="nvidia-progress-fill" id="gpu-usage-bar" style="width:${state.gpu.usage}%;"></div></div>
            <div class="nvidia-stat" style="margin-top:8px;"><span>Memória VRAM</span><span id="gpu-memory-label">${state.gpu.memoryUsage.toFixed(1)}%</span></div>
            <div class="nvidia-progress-bar"><div class="nvidia-progress-fill" id="gpu-memory-bar" style="width:${state.gpu.memoryUsage}%;"></div></div>
          </div>
        </div>

        <!-- OVERCLOCK -->
        <div class="nvidia-section" id="nvidia-overclock">
          <h2 style="font-size:1.1rem;margin:0 0 4px;"><i class="fas fa-tachometer-alt" style="color:#66c0f4;"></i> Overclock</h2>
          <p style="color:#8fa0bf;font-size:.85rem;margin:0 0 16px;">Ajuste fino para extrair o máximo da sua GPU.</p>
          <div class="nvidia-card">
            <div style="margin-bottom:12px;">
              <div style="display:flex;justify-content:space-between;"><span>Offset do Core</span><span id="nvidia-oc-core-val">0 MHz</span></div>
              <input type="range" id="nvidia-oc-core" min="-100" max="300" value="0" class="nvidia-slider" oninput="document.getElementById('nvidia-oc-core-val').textContent=this.value+' MHz'">
            </div>
            <div style="margin-bottom:12px;">
              <div style="display:flex;justify-content:space-between;"><span>Offset da Memória</span><span id="nvidia-oc-mem-val">0 MHz</span></div>
              <input type="range" id="nvidia-oc-mem" min="-200" max="500" value="0" class="nvidia-slider" oninput="document.getElementById('nvidia-oc-mem-val').textContent=this.value+' MHz'">
            </div>
            <div style="margin-bottom:12px;">
              <div style="display:flex;justify-content:space-between;"><span>Limite de Potência</span><span id="nvidia-oc-power-val">100%</span></div>
              <input type="range" id="nvidia-oc-power" min="80" max="120" value="100" class="nvidia-slider" oninput="document.getElementById('nvidia-oc-power-val').textContent=this.value+'%'">
            </div>
            <div style="margin-bottom:12px;">
              <div style="display:flex;justify-content:space-between;"><span>Limite de Temperatura</span><span id="nvidia-oc-temp-val">83°C</span></div>
              <input type="range" id="nvidia-oc-temp" min="70" max="90" value="83" class="nvidia-slider" oninput="document.getElementById('nvidia-oc-temp-val').textContent=this.value+'°C'">
            </div>
            <button onclick="nvidiaApplyOC()" style="background:#66c0f4;border:none;color:#090b10;padding:8px 24px;border-radius:8px;font-weight:600;cursor:pointer;width:100%;"><i class="fas fa-bolt"></i> Aplicar Overclock</button>
          </div>
        </div>

        <!-- SISTEMA -->
        <div class="nvidia-section" id="nvidia-system">
          <h2 style="font-size:1.1rem;margin:0 0 4px;"><i class="fas fa-desktop" style="color:#66c0f4;"></i> Sistema</h2>
          <p style="color:#8fa0bf;font-size:.85rem;margin:0 0 16px;">Informações detalhadas do seu sistema.</p>
          <div class="nvidia-card">
            <div class="nvidia-stat"><span>GPU</span><span>${state.gpu.name}</span></div>
            <div class="nvidia-stat"><span>VRAM</span><span>${state.gpu.vram}</span></div>
            <div class="nvidia-stat"><span>Driver</span><span id="nvidia-sys-driver">${state.drivers.version}</span></div>
            <div class="nvidia-stat"><span>DirectX</span><span>12 Ultimate</span></div>
            <div class="nvidia-stat"><span>Resizable BAR</span><span>Ativado</span></div>
            <div class="nvidia-stat"><span>G-SYNC</span><span>Compatível</span></div>
            <div class="nvidia-stat"><span>DLSS</span><span>3.5 com Frame Generation</span></div>
            <div class="nvidia-stat"><span>Ray Tracing</span><span>Ativado</span></div>
          </div>
        </div>

        <!-- RESGATAR -->
        <div class="nvidia-section" id="nvidia-redeem">
          <h2 style="font-size:1.1rem;margin:0 0 4px;"><i class="fas fa-gift" style="color:#66c0f4;"></i> Resgatar</h2>
          <p style="color:#8fa0bf;font-size:.85rem;margin:0 0 16px;">Resgate códigos promocionais e ganhe jogos.</p>
          <div class="nvidia-card">
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              <input id="nvidia-redeem-input" placeholder="Código promocional" style="flex:1;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:8px 14px;color:#eef2ff;outline:none;font-size:.85rem;min-width:200px;">
              <button onclick="nvidiaRedeem()" style="background:#66c0f4;border:none;color:#090b10;padding:8px 18px;border-radius:8px;font-weight:600;cursor:pointer;"><i class="fas fa-check"></i> Resgatar</button>
            </div>
            <div id="nvidia-redeem-status" style="margin-top:8px;font-size:.85rem;color:#8fa0bf;"></div>
          </div>
          <div class="nvidia-card">
            <div style="font-weight:600;margin-bottom:8px;">Histórico de resgates</div>
            <div id="nvidia-redeemed-list">
              ${state.redeemed.length ? state.redeemed.map(r => `
                <div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid rgba(255,255,255,.05);font-size:.8rem;">
                  <span>🎮 ${r.game}</span>
                  <span style="color:#5b6680;">${r.code} · ${r.date}</span>
                </div>
              `).join('') : '<div style="color:#5b6680;font-size:.8rem;">Nenhum código resgatado ainda.</div>'}
            </div>
          </div>
        </div>

        <!-- CONFIGURAÇÕES -->
        <div class="nvidia-section" id="nvidia-settings">
          <h2 style="font-size:1.1rem;margin:0 0 4px;"><i class="fas fa-cog" style="color:#66c0f4;"></i> Configurações</h2>
          <p style="color:#8fa0bf;font-size:.85rem;margin:0 0 16px;">Personalize sua experiência NVIDIA.</p>
          <div class="nvidia-card">
            ${Object.entries(state.settings).map(([key, val]) => `
              <div class="nvidia-stat" id="nvidia-toggle-${key}">
                <span>${key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</span>
                <label class="nvidia-toggle">
                  <span class="toggle-label" style="font-size:.8rem;color:#8fa0bf;">${val ? 'Ativado' : 'Desativado'}</span>
                  <input type="checkbox" ${val ? 'checked' : ''} onchange="nvidiaToggle('${key}')">
                </label>
              </div>
            `).join('')}
          </div>
          <div class="nvidia-card" style="border-color:rgba(239,68,68,.2);">
            <div style="font-weight:600;color:#f87171;margin-bottom:8px;">Área restrita</div>
            <button onclick="if(confirm('Restaurar configurações padrão?')){location.reload();}" style="background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.2);color:#f87171;padding:6px 16px;border-radius:6px;cursor:pointer;"><i class="fas fa-undo-alt"></i> Restaurar padrões</button>
          </div>
        </div>

      </div>
    </div>
  `;
    const win = createWin('NVIDIA APP', '🖥️', '<div class="app-loading">Carregando…</div>', 900, 680);
    const wire = () => wireNvidia(win);
    if (window.VessieBridge && typeof window.VessieBridge.loadView === 'function') {
      window.VessieBridge.loadView('nvidia', { html: nvFallback }, nvData).then(({ html }) => {
        if (!document.body.contains(win)) return;
        win.querySelector('.wb').innerHTML = html;
        wire();
      });
    } else {
      win.querySelector('.wb').innerHTML = nvFallback;
      wire();
    }
    return win;
  }

function wireNvidia(win) {

    // ---------- EXPORTA FUNÇÕES GLOBAIS ----------
    window.nvidiaNavigate = function (section) {
      navigateTo(section);
    };

    window.nvidiaCheckDrivers = function () {
      checkDrivers();
    };

    window.nvidiaInstallDriver = function () {
      installDriver();
    };

    window.nvidiaApplyOC = function () {
      applyOverclock();
    };

    window.nvidiaRedeem = function () {
      redeemCode();
    };

    window.nvidiaToggle = function (key) {
      toggleSetting(key);
    };

    window.nvidiaSimulate = function () {
      const interval = setInterval(() => {
        state.gpu.usage = 20 + Math.random() * 70;
        state.gpu.temp = 45 + Math.random() * 25;
        state.gpu.fanSpeed = 35 + Math.random() * 40;
        state.gpu.power = 60 + Math.random() * 50;
        state.gpu.clock = 2640 + Math.random() * 80;
        updateMetrics();
        // Atualiza também os elementos na aba Performance
        const tempPerf = document.getElementById('gpu-temp-perf');
        const clockPerf = document.getElementById('gpu-clock-perf');
        const memPerf = document.getElementById('gpu-mem-perf');
        const powerPerf = document.getElementById('gpu-power-perf');
        const usageLabel = document.getElementById('gpu-usage-label');
        const memLabel = document.getElementById('gpu-memory-label');
        const usageBar = document.getElementById('gpu-usage-bar');
        const memBar = document.getElementById('gpu-memory-bar');
        if (tempPerf) tempPerf.textContent = state.gpu.temp.toFixed(1) + '°C';
        if (clockPerf) clockPerf.textContent = state.gpu.clock.toFixed(0) + ' MHz';
        if (memPerf) memPerf.textContent = state.gpu.memoryClock.toFixed(0) + ' MHz';
        if (powerPerf) powerPerf.textContent = state.gpu.power.toFixed(0) + ' W';
        if (usageLabel) usageLabel.textContent = state.gpu.usage.toFixed(1) + '%';
        if (memLabel) memLabel.textContent = state.gpu.memoryUsage.toFixed(1) + '%';
        if (usageBar) usageBar.style.width = state.gpu.usage + '%';
        if (memBar) memBar.style.width = state.gpu.memoryUsage + '%';
      }, 500);
      setTimeout(() => clearInterval(interval), 8000);
      addNotification('Simulação de carga iniciada 🔥', 'info');
      toast('Simulação de GPU iniciada!', 'default');
    };

    // ---------- INICIALIZA ----------
    setTimeout(() => {
      updateNotifications();
      updateMetrics();
      addNotification('NVIDIA App carregado com sucesso 💚', 'success');
    }, 300);

    // ---------- LIMPEZA ----------
    win.addEventListener('remove', () => {
      delete window.nvidiaNavigate;
      delete window.nvidiaCheckDrivers;
      delete window.nvidiaInstallDriver;
      delete window.nvidiaApplyOC;
      delete window.nvidiaRedeem;
      delete window.nvidiaToggle;
      delete window.nvidiaSimulate;
    });
  }
window.openNvidia = openNvidia;
})();

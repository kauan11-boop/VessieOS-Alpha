(function () {
  "use strict";

  // Bandeja: um menu próprio por ícone (Wi-Fi, volume, bateria). Onde o
  // navegador permite, os dados vêm DO COMPUTADOR DE VERDADE:
  //  - Wi-Fi: navigator.onLine + NetworkInformation (tipo/velocidade reais).
  //    Listar redes é impossível no browser — o menu mostra o status real.
  //  - Volume: slider/mudo aplicados de verdade a cada <audio>/<video> da
  //    página (ex.: o player de música) e salvos em S.volume.
  //  - Bateria: Battery Status API (nível + carregando reais, Chromium).
  // Sem permissão/suporte, cada menu diz isso honestamente em vez de
  // inventar número.
  let open = null;

  const VOL_KEY = 'vessieos_tray_vol';

  function volState() {
    let st = { level: 70, muted: false };
    try {
      const raw = JSON.parse(localStorage.getItem(VOL_KEY) || 'null');
      if (raw && typeof raw === 'object') st = { level: +raw.level || 0, muted: !!raw.muted };
    } catch (_) {}
    if (typeof window.S !== 'undefined' && typeof window.S.volume === 'number') {
      st.level = window.S.volume;
    }
    return st;
  }

  function applyVolume() {
    const st = volState();
    try {
      if (typeof window.S !== 'undefined') window.S.volume = st.muted ? 0 : st.level;
      if (typeof window.persistState === 'function') window.persistState();
    } catch (_) {}
    document.querySelectorAll('audio, video').forEach(m => {
      try {
        m.volume = Math.max(0, Math.min(1, (st.muted ? 0 : st.level) / 100));
        m.muted = st.muted;
      } catch (_) {}
    });
    const icon = document.querySelector('#tsy-vol i');
    if (icon) {
      icon.className = st.muted ? 'fas fa-volume-mute'
        : st.level === 0 ? 'fas fa-volume-off'
        : st.level < 40 ? 'fas fa-volume-down' : 'fas fa-volume-up';
    }
    const btn = document.getElementById('tsy-vol');
    if (btn) btn.title = 'Volume · ' + (st.muted ? 'mudo' : st.level + '%');
    const qt = document.querySelector('[data-qt="vol"]');
    if (qt) qt.classList.toggle('on', !st.muted);
    const slider = document.getElementById('tw-vol-slider');
    if (slider) { slider.value = st.level; slider.disabled = st.muted; }
    const label = document.getElementById('tw-vol-label');
    if (label) label.textContent = st.muted ? 'Mudo' : st.level + '%';
    const mute = document.getElementById('tw-vol-mute');
    if (mute) mute.textContent = st.muted ? '🔇' : (st.level < 40 ? '🔈' : '🔊');
  }

  function saveVol(level, muted) {
    try { localStorage.setItem(VOL_KEY, JSON.stringify({ level, muted })); } catch (_) {}
    applyVolume();
  }

  function connInfo() {
    const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!c) return '';
    const parts = [];
    if (c.effectiveType) parts.push(c.effectiveType.toUpperCase());
    if (typeof c.downlink === 'number') parts.push(c.downlink + ' Mb/s');
    if (c.saveData) parts.push('economia de dados');
    return parts.join(' · ');
  }

  function updateWifi() {
    const online = navigator.onLine;
    const btn = document.getElementById('tsy-wifi');
    const icon = btn && btn.querySelector('i');
    if (icon) icon.className = online ? 'fas fa-wifi' : 'fas fa-wifi-slash';
    if (btn) {
      btn.classList.toggle('off', !online);
      btn.title = online ? 'Wi-Fi · conectado' : 'Wi-Fi · sem conexão';
    }
    const state = document.getElementById('tw-wifi-state');
    if (state) state.textContent = online ? 'Conectado' : 'Sem conexão';
    const dot = document.getElementById('tw-wifi-dot');
    if (dot) dot.classList.toggle('off', !online);
    const type = document.getElementById('tw-wifi-type');
    if (type) type.textContent = online ? (connInfo() || 'Rede ativa') : 'Verifique o cabo ou o Wi-Fi do computador.';
  }

  function updateBat(level, charging, timeStr) {
    const pct = Math.round(level * 100);
    const icon = document.querySelector('#tsy-bat i');
    if (icon) {
      icon.className = pct > 87 ? 'fas fa-battery-full'
        : pct > 62 ? 'fas fa-battery-three-quarters'
        : pct > 37 ? 'fas fa-battery-half'
        : pct > 12 ? 'fas fa-battery-quarter' : 'fas fa-battery-empty';
    }
    const btn = document.getElementById('tsy-bat');
    if (btn) {
      btn.classList.toggle('low', pct < 25 && !charging);
      btn.title = 'Bateria · ' + pct + '%' + (charging ? ' (carregando)' : '');
    }
    const big = document.getElementById('tw-bat-pct');
    if (big) big.textContent = pct + '%';
    const fill = document.getElementById('tw-bat-fill');
    if (fill) { fill.style.width = pct + '%'; fill.classList.toggle('low', pct < 25 && !charging); }
    const sub = document.getElementById('tw-bat-sub');
    if (sub) sub.textContent = charging ? ('Carregando… ' + (timeStr || '')) : (timeStr || (pct < 25 ? 'Nível baixo — conecte o carregador.' : 'Descarregando.'));
  }

  function fmtTime(sec) {
    if (!Number.isFinite(sec) || sec < 0) return '';
    const h = Math.floor(sec / 3600), m = Math.round((sec % 3600) / 60);
    return h > 0 ? `~${h}h${m ? ' ' + m + 'min' : ''} restantes` : `~${m}min restantes`;
  }

  function watchBattery() {
    if (!navigator.getBattery) {
      const sub = document.getElementById('tw-bat-sub');
      if (sub) sub.textContent = 'Sensor indisponível neste navegador.';
      const note = document.getElementById('tw-bat-note');
      if (note) note.textContent = 'Este navegador não expõe a bateria (disponível no Chrome/Edge). Nenhum valor é inventado.';
      return;
    }
    navigator.getBattery().then(b => {
      const paint = () => updateBat(b.level, b.charging,
        b.charging ? fmtTime(b.chargingTime) : fmtTime(b.dischargingTime));
      b.addEventListener('levelchange', paint);
      b.addEventListener('chargingchange', paint);
      paint();
    }).catch(() => {
      const sub = document.getElementById('tw-bat-sub');
      if (sub) sub.textContent = 'Sem permissão para ler a bateria.';
    });
  }

  function toggle(which) {
    const was = open;
    close();
    document.getElementById('np')?.classList.remove('open');
    try { if (was !== which && window.closeStartMenu) window.closeStartMenu(); } catch (_) {}
    if (was !== which) {
      open = which;
      document.getElementById('fly-' + which)?.classList.add('open');
      if (which === 'wifi') updateWifi();
      if (which === 'vol') applyVolume();
    }
  }

  function close() {
    open = null;
    document.querySelectorAll('.fly.open').forEach(f => f.classList.remove('open'));
  }

  function init() {
    const wifi = document.getElementById('tsy-wifi');
    const vol = document.getElementById('tsy-vol');
    const bat = document.getElementById('tsy-bat');
    if (!wifi || !vol || !bat) return;
    wifi.onclick = (e) => { e.stopPropagation(); toggle('wifi'); };
    vol.onclick = (e) => { e.stopPropagation(); toggle('vol'); };
    bat.onclick = (e) => { e.stopPropagation(); toggle('bat'); };

    document.querySelectorAll('[data-fly-close]').forEach(b => {
      b.onclick = (e) => { e.stopPropagation(); close(); };
    });
    document.getElementById('tw-wifi-open').onclick = () => {
      close();
      document.getElementById('np')?.classList.add('open');
    };

    const slider = document.getElementById('tw-vol-slider');
    if (slider) {
      slider.oninput = () => {
        const v = +slider.value;
        saveVol(v, v === 0);
      };
    }
    const mute = document.getElementById('tw-vol-mute');
    if (mute) mute.onclick = () => { const st = volState(); saveVol(st.level, !st.muted); };

    // O toggle rápido de som do painel (#np) passa a usar o mesmo estado.
    const qtVol = document.querySelector('[data-qt="vol"]');
    if (qtVol) {
      qtVol.onclick = () => {
        const st = volState();
        const muted = qtVol.classList.contains('on');
        qtVol.classList.toggle('on');
        saveVol(st.level, muted);
      };
    }

    document.addEventListener('click', (e) => {
      if (!open) return;
      if (e.target.closest('.fly') || e.target.closest('.tsy')) return;
      close();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });

    window.addEventListener('online', updateWifi);
    window.addEventListener('offline', updateWifi);
    try {
      const c = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (c && c.addEventListener) c.addEventListener('change', updateWifi);
    } catch (_) {}

    updateWifi();
    applyVolume();
    watchBattery();
  }

  window.toggleTray = toggle;
  window.closeTray = close;
  window.VessieOS = window.VessieOS || {};
  window.VessieOS.modules = window.VessieOS.modules || {};
  window.VessieOS.modules.tray = { init };
})();

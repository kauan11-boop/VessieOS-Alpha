// emulator.js — Emulador de executáveis do VessieOS
// Janela funcional aberta pelo Explorador (pastas sincronizadas/Remote-Device ou
// Disco Local) e pelo Terminal (`open programa.exe` via VessieBridge).
// Abas: Executar (DOSBox real para MZ/COM/BAT) · Inspeção (análise PE/MZ de verdade)
// · Compatibilidade (varredura das pastas sincronizadas).
// Depende de: createWin, toast, VFS (opcional), window.VessieEmulator (kernel).
(function () {
  "use strict";

  const FORMAT_BADGES = {
    'mz-dos': ['DOS', '#34d399'], 'dos-com': ['DOS', '#34d399'], batch: ['LOTE', '#34d399'],
    pe32: ['PE32', '#60a5fa'], pe64: ['PE64', '#a78bfa'],
    ne: ['NE 16-bit', '#fbbf24'], le: ['LE', '#fbbf24'], lx: ['LX', '#fbbf24'],
    elf: ['ELF', '#fb7185'], 'msi-ole': ['MSI', '#fbbf24'], macho: ['Mach-O', '#fb7185'],
    unknown: ['?', '#8d97a9'], unreadable: ['!', '#ef5350']
  };

  const handleCache = new Map();
  let handleSeq = 0;

  function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function badge(format) {
    const [label, color] = FORMAT_BADGES[format] || FORMAT_BADGES.unknown;
    return `<span class="emu-badge" style="border-color:${color};color:${color}">${esc(label)}</span>`;
  }

  function fmtSize(bytes) {
    if (bytes === null || bytes === undefined || bytes < 0) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  function openEmulator(bytes, fileName, sourceLabel, opts) {
    const emu = window.VessieEmulator;
    if (!emu) {
      if (typeof toast === 'function') toast('Módulo de emulação do kernel indisponível.', 'error');
      return null;
    }
    const options = opts || {};
    const raw = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes || []);
    const name = String(fileName || 'programa.exe');
    const report = emu.analyze(raw, name);
    const runnable = report.runnable === 'dos' && options.allowRun !== false && raw.length <= emu.MAX_RUN_BYTES;

    let savedProfile = null;
    try { savedProfile = localStorage.getItem('vessie_emu_profile'); } catch { savedProfile = null; }
    if (savedProfile && !emu.PROFILES[savedProfile]) savedProfile = null;
    const machine = emu.createMachine(savedProfile || options.profile || 'xt', {});
    machine.mountFloppy(name);
    machine.log('info', `Análise de ${name}: formato ${report.format.toUpperCase()} (${report.arch}).`, 'EMU');
    if (options.truncated) machine.log('aviso', 'Arquivo maior que a fatia de análise: bytes além de 4 MB ignorados.', 'EMU');
    if (options.approx) machine.log('aviso', 'Bytes aproximados (valor do VFS é texto). Execução desativada.', 'EMU');

    const win = createWin(`Emulador — ${name}`, '⚙️', `
      <div class="emu">
        <header class="emu-head">
          <span class="emu-icon">⚙️</span>
          <div class="emu-title"><strong></strong><small></small></div>
          ${badge(report.format)}
        </header>
        <nav class="emu-tabs">
          <button type="button" data-tab="run" class="${runnable ? 'ac' : ''}">▶ Executar</button>
          <button type="button" data-tab="hw">🖥 Hardware</button>
          <button type="button" data-tab="inspect" class="${runnable ? '' : 'ac'}">🔍 Inspeção</button>
          <button type="button" data-tab="log">📋 Log</button>
          <button type="button" data-tab="compat">🗂 Compatibilidade</button>
        </nav>
        <section class="emu-tab" data-pane="run" ${runnable ? '' : 'hidden'}>
          <div class="emu-runbox">
            <canvas class="emu-screen" width="640" height="400"></canvas>
            <div class="emu-status" data-emu-status>${emu.BIOS_VERSION}. Motor: ${window.VessieEmulator && window.VessieEmulator.engineStatusGet && window.VessieEmulator.engineStatusGet().status || 'não carregado'}</div>
            <div class="emu-actions">
              <button type="button" class="primary" data-act="start">⏻ Ligar máquina</button>
              <button type="button" data-act="engine">Verificar motor</button>
              <span class="emu-engine-status" style="margin-left:10px; font-size:.75em; color:#666;">${window.VessieEmulator && window.VessieEmulator.engineStatusGet && window.VessieEmulator.engineStatusGet().status || 'não carregado'}</span>
            </div>
            <p class="emu-note">Sequência: POST da BIOS (DEL = Setup) → boot pelo FDD → programa no DOSBox. Teclado capturado pelo canvas durante POST/Setup/execução.</p>
            <div class="emu-loading" style="display:none; margin:10px 0; padding:8px; background:#0c0c0c; color:#ccc;">
              <span>Carregando motor DOS (js-dos)...</span>
              <div class="progress-bar" style="width:0%; height:4px; background:#34d399; margin-top:4px;"></div>
            </div>
          </div>
        </section>
        <section class="emu-tab" data-pane="hw" hidden>
          <div class="emu-hw" data-emu-hw></div>
        </section>
        <section class="emu-tab" data-pane="inspect" ${runnable ? 'hidden' : ''}>
          <div class="emu-inspect"></div>
        </section>
        <section class="emu-tab" data-pane="log" hidden>
          <div class="emu-logbar">
            <select data-log-filter aria-label="Filtrar nível">
              <option value="all">todos os níveis</option>
              <option value="info">info</option>
              <option value="ok">ok</option>
              <option value="aviso">aviso</option>
              <option value="erro">erro</option>
              <option value="porta">porta (E/S)</option>
            </select>
            <label class="emu-autoscroll"><input type="checkbox" data-log-auto checked> rolagem automática</label>
            <button type="button" data-act="log-export">⬇ Exportar .log</button>
            <button type="button" data-act="log-clear">Limpar</button>
          </div>
          <div class="emu-log" data-emu-log></div>
        </section>
        <section class="emu-tab" data-pane="compat" hidden>
          <p class="emu-note">Varre as pastas sincronizadas (Remote-Device) procurando executáveis e classifica cada um.</p>
          <div class="emu-actions"><button type="button" data-act="scan">🔎 Escanear pastas sincronizadas</button></div>
          <div class="emu-compat" data-emu-compat><span class="emu-note">Nenhuma varredura ainda.</span></div>
        </section>
      </div>`, 920, 640);

    win.querySelector('.emu-title strong').textContent = name;
    win.querySelector('.emu-title small').textContent =
      `${sourceLabel || 'origem desconhecida'} · ${fmtSize(options.fullSize || raw.length)}${options.truncated ? ' (prévia dos primeiros MB)' : ''}${options.approx ? ' · bytes aproximados (armazenado como texto)' : ''}`;

    // tabs
    win.querySelectorAll('.emu-tabs [data-tab]').forEach((btn) => {
      btn.onclick = () => {
        win.querySelectorAll('.emu-tabs [data-tab]').forEach((b) => b.classList.toggle('ac', b === btn));
        win.querySelectorAll('.emu-tab').forEach((pane) => { pane.hidden = pane.dataset.pane !== btn.dataset.tab; });
      };
    });

    renderInspect(win, report, raw, name);
    renderHardware(win, machine, emu);
    initLogTab(win, machine);

    const statusEl = win.querySelector('[data-emu-status]');
    const canvas = win.querySelector('.emu-screen');
    const setStatus = (msg) => { if (statusEl) statusEl.textContent = msg; };
    // callbacks da máquina só valem com a janela viva
    const isAlive = () => document.body.contains(win);

    if (!runnable) {
      const box = win.querySelector('.emu-runbox');
      if (box) {
        box.querySelector('.emu-actions')?.remove();
        const note = document.createElement('p');
        note.className = 'emu-note';
        note.textContent = report.runnable === 'pc'
          ? 'Este é um executável Windows de 32/64-bit: ele roda no PC real, não no navegador. Use a aba Inspeção para ver o conteúdo real do binário, ou execute o arquivo diretamente na pasta sincronizada do seu computador.'
          : (report.note || 'Este formato não é executável no emulador. Veja a aba Inspeção.');
        box.prepend(note);
      }
    }

    let booted = false;
    const engineStatusSpan = win.querySelector('.emu-engine-status');
    const loadingBar = win.querySelector('.emu-loading .progress-bar');
    
    function updateEngineStatus(status) {
      if (engineStatusSpan) {
        engineStatusSpan.textContent = status;
      }
      if (loadingBar) {
        let width = 0;
        if (status === 'loaded') width = '100%';
        else if (status === 'loading') width = '30%';
        else if (status === 'error') width = '0%';
        loadingBar.style.width = width;
      }
    }
    
    win.querySelector('[data-act="start"]')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      if (booted) {
        setStatus('Máquina já ligada. Feche e reabra para reiniciar.');
        return;
      }
      btn.disabled = true;
      try {
        const result = await machine.powerOn(canvas, async () => {
          setStatus('POST OK. Inicializando motor DOS (js-dos)…');
          machine.log('info', 'Carregando motor DOS do CDN', 'EMU');
          updateEngineStatus('loading');
          await emu.runDos(canvas, raw, name);
          updateEngineStatus('loaded');
          setStatus('Em execução. Clique no canvas para capturar o teclado.');
          machine.log('ok', 'Programa entregue ao DOSBox.', 'EMU');
        }, name, isAlive);
        booted = result && result.booted;
        if (booted) renderHardware(win, machine, emu);
        else { setStatus('Máquina desligada sem boot. Clique em Ligar para tentar de novo.'); btn.disabled = false; }
      } catch (err) {
        updateEngineStatus('error');
        machine.log('erro', `Falha no boot: ${err?.message || 'erro desconhecido'}`, 'EMU');
        setStatus(`Não foi possível ligar: ${err?.message || 'erro desconhecido'}`);
        btn.disabled = false;
      }
    });
    win.querySelector('[data-act="engine"]')?.addEventListener('click', async () => {
      setStatus('Verificando motor DOS…');
      updateEngineStatus('loading');
      try {
        const ok = await emu.ensureEngine().catch(() => false);
        const st = emu.statusGet ? emu.statusGet() : emu.status();
        const statusText = ok ? `Motor pronto: ${st.engine || st.engine || 'js-dos'}` : 'Motor indisponível';
        machine.log(ok ? 'ok' : 'erro', ok ? `Motor pronto.` : 'Motor indisponível (sem internet para o CDN?).', 'EMU');
        setStatus(ok ? `Motor pronto: ${st.engine || 'js-dos'}.` : 'Motor indisponível. Use a aba Inspeção ou verifique a conexão.');
        if (engineStatusSpan) updateEngineStatus(ok ? 'loaded' : 'error');
      } catch (e) {
        updateEngineStatus('error');
        machine.log('erro', `Erro ao verificar motor: ${e?.message || 'erro desconhecido'}`, 'EMU');
        setStatus(`Erro ao verificar motor: ${e?.message || 'erro desconhecido'}`);
      }
    });
    win.querySelector('[data-act="scan"]')?.addEventListener('click', () => scanCompat(win));

    return win;
  }

  const LOG_LEVEL_COLORS = { info: '#9fd0ff', ok: '#34d399', aviso: '#ffd88a', erro: '#ff9b9b', porta: '#c4b5fd' };

  function logLine(entry) {
    const line = document.createElement('div');
    line.className = 'emu-logline';
    line.dataset.level = entry.level;
    const time = document.createElement('span');
    time.className = 'emu-logtime';
    try { time.textContent = entry.t.toLocaleTimeString('pt-BR', { hour12: false }) + '.' + String(entry.t.getMilliseconds()).padStart(3, '0'); }
    catch { time.textContent = ''; }
    const level = document.createElement('span');
    level.className = 'emu-loglevel';
    level.style.color = LOG_LEVEL_COLORS[entry.level] || '#9fd0ff';
    level.textContent = `[${entry.level}]`;
    const src = document.createElement('span');
    src.className = 'emu-logsrc';
    src.textContent = `(${entry.src})`;
    const msg = document.createElement('span');
    msg.textContent = entry.msg;
    line.append(time, level, src, msg);
    return line;
  }

  function initLogTab(win, machine) {
    const box = win.querySelector('[data-emu-log]');
    const filter = win.querySelector('[data-log-filter]');
    const auto = win.querySelector('[data-log-auto]');
    if (!box) return;
    const render = () => {
      const level = filter ? filter.value : 'all';
      box.replaceChildren();
      machine.logs
        .filter((e) => level === 'all' || e.level === level)
        .forEach((e) => box.appendChild(logLine(e)));
      if (auto && auto.checked) box.scrollTop = box.scrollHeight;
    };
    if (filter) filter.onchange = render;
    render();
    const off = machine.onLog((entry) => {
      if (!document.body.contains(win)) { off(); return; }
      const level = filter ? filter.value : 'all';
      if (level !== 'all' && entry.level !== level) return;
      box.appendChild(logLine(entry));
      if (auto && auto.checked) box.scrollTop = box.scrollHeight;
    });
    win.querySelector('[data-act="log-clear"]')?.addEventListener('click', () => {
      machine.logs.length = 0;
      render();
    });
    win.querySelector('[data-act="log-export"]')?.addEventListener('click', () => {
      try {
        const lines = machine.logs.map((e) => {
          let ts = '';
          try { ts = e.t.toISOString(); } catch { ts = ''; }
          return `[${ts}] [${e.level}] (${e.src}) ${e.msg}`;
        });
        const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        a.href = url;
        a.download = `vessie-emu-${stamp}.log`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      } catch { /* ignore */ }
    });
  }

  function renderHardware(win, machine, emu) {
    const box = win.querySelector('[data-emu-hw]');
    if (!box) return;
    box.replaceChildren();
    const profTitle = document.createElement('h4');
    profTitle.textContent = 'Perfil da máquina (aplica no próximo boot)';
    box.appendChild(profTitle);
    const profRow = document.createElement('div');
    profRow.className = 'emu-profiles';
    Object.values(emu.PROFILES).forEach((p) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'emu-profile' + (machine.profileId === p.id ? ' ac' : '');
      const strong = document.createElement('strong');
      strong.textContent = p.label;
      const small = document.createElement('small');
      small.textContent = `${p.ramKb >= 1024 ? `${p.ramKb / 1024} MB` : `${p.ramKb}K`} RAM · ciclos ${p.cycles}`;
      b.append(strong, small);
      b.title = p.cpu;
      b.onclick = () => {
        try { localStorage.setItem('vessie_emu_profile', p.id); } catch { /* ignore */ }
        machine.log('info', `Perfil ${p.label} será usado no próximo Emulador aberto.`, 'HW');
        if (typeof toast === 'function') toast(`Perfil ${p.label} salvo para os próximos boots.`, 'success');
        renderHardware(win, machine, emu);
      };
      profRow.appendChild(b);
    });
    box.appendChild(profRow);
    const savedProfile = (() => { try { return localStorage.getItem('vessie_emu_profile'); } catch { return null; } })();
    if (savedProfile && emu.PROFILES[savedProfile] && savedProfile !== machine.profileId) {
      const hint = document.createElement('p');
      hint.className = 'emu-note';
      hint.textContent = `Perfil salvo: ${emu.PROFILES[savedProfile].label}. Reabra o executável para aplicá-lo (a máquina atual já nasceu com ${machine.profile.label}).`;
      box.appendChild(hint);
    }
    const devTitle = document.createElement('h4');
    devTitle.textContent = 'Dispositivos virtuais';
    box.appendChild(devTitle);
    const table = document.createElement('table');
    table.className = 'emu-table';
    machine.devices.forEach((dev) => {
      const tr = document.createElement('tr');
      const name = document.createElement('td'); name.textContent = dev.label;
      const detail = document.createElement('td'); detail.textContent = dev.detail || '';
      const state = document.createElement('td');
      if (dev.toggle) {
        const t = document.createElement('button');
        t.type = 'button';
        t.className = 'emu-toggle' + (dev.enabled ? ' on' : '');
        t.textContent = dev.enabled ? 'ON' : 'OFF';
        t.onclick = () => { machine.setDevice(dev.id, !dev.enabled); renderHardware(win, machine, emu); };
        state.appendChild(t);
      } else {
        state.textContent = dev.enabled ? 'presente' : 'ausente';
      }
      tr.append(name, detail, state);
      table.appendChild(tr);
    });
    box.appendChild(table);
    const setup = machine.getSetup();
    const setupLine = document.createElement('p');
    setupLine.className = 'emu-note';
    setupLine.textContent = `Setup da BIOS: boot ${setup.bootOrder === 'hdd' ? 'HDD,FDD' : 'FDD,HDD'} · alto-falante ${setup.speaker === false ? 'OFF' : 'ON'} · POST ${setup.fastPost ? 'rápido' : 'completo'}. Altere no Setup real (DEL durante o POST) ou pelos botões acima. Backend de CPU: DOSBox via js-dos (sob demanda).`;
    box.appendChild(setupLine);
  }

  function renderInspect(win, report, raw, name) {
    const box = win.querySelector('.emu-inspect');
    if (!box) return;
    box.replaceChildren();
    const note = document.createElement('p');
    note.className = 'emu-note';
    note.textContent = report.note || '';
    box.appendChild(note);
    if (report.warnings && report.warnings.length) {
      const warn = document.createElement('p');
      warn.className = 'emu-note emu-warn';
      warn.textContent = 'Avisos: ' + report.warnings.join(' ');
      box.appendChild(warn);
    }
    const table = document.createElement('table');
    table.className = 'emu-table';
    (report.fields || []).forEach(([k, v]) => {
      const tr = document.createElement('tr');
      const th = document.createElement('th'); th.textContent = k;
      const td = document.createElement('td'); td.textContent = v;
      tr.append(th, td);
      table.appendChild(tr);
    });
    box.appendChild(table);
    if (report.sections && report.sections.length) {
      const h = document.createElement('h4'); h.textContent = `Seções (${report.sections.length})`;
      box.appendChild(h);
      const st = document.createElement('table');
      st.className = 'emu-table';
      const head = document.createElement('tr');
      ['Nome', 'VSize', 'VAddr', 'RawSize'].forEach((t) => { const th = document.createElement('th'); th.textContent = t; head.appendChild(th); });
      st.appendChild(head);
      report.sections.forEach((s) => {
        const tr = document.createElement('tr');
        [s.name, `0x${s.vsize.toString(16)}`, `0x${s.vaddr.toString(16)}`, `0x${s.rawsize.toString(16)}`].forEach((v) => {
          const td = document.createElement('td'); td.textContent = v; tr.appendChild(td);
        });
        st.appendChild(tr);
      });
      box.appendChild(st);
    }
    if (report.imports && report.imports.length) {
      const h = document.createElement('h4'); h.textContent = `DLLs importadas (${report.imports.length})`;
      box.appendChild(h);
      const chips = document.createElement('div');
      chips.className = 'emu-chips';
      report.imports.forEach((dll) => {
        const c = document.createElement('code'); c.textContent = dll; chips.appendChild(c);
      });
      box.appendChild(chips);
    }
    const strings = report.strings || { total: 0, sample: [] };
    if (strings.sample && strings.sample.length) {
      const details = document.createElement('details');
      details.className = 'emu-strings';
      const summary = document.createElement('summary');
      summary.textContent = `Strings legíveis (${strings.total} encontradas, mostrando ${strings.sample.length})`;
      details.appendChild(summary);
      const pre = document.createElement('pre');
      pre.textContent = strings.sample.join('\n');
      details.appendChild(pre);
      box.appendChild(details);
    }
  }

  async function scanCompat(win) {
    const box = win.querySelector('[data-emu-compat]');
    const emu = window.VessieEmulator;
    if (!box || !emu) return;
    box.replaceChildren();
    const loading = document.createElement('p');
    loading.className = 'emu-note';
    loading.textContent = 'Lendo pastas sincronizadas… (o navegador pode pedir permissão de leitura)';
    box.appendChild(loading);
    const devices = window.VessieRemoteDevices;
    if (!devices || !devices.size) {
      loading.textContent = 'Nenhum Remote Device conectado. Conecte uma pasta no Explorador para varrer executáveis.';
      return;
    }
    let total = 0;
    for (const device of devices.values()) {
      const group = document.createElement('div');
      group.className = 'emu-device-group';
      const title = document.createElement('h4');
      title.textContent = `${device.label} · origem: ${device.rootName || '?'}`;
      group.appendChild(title);
      try {
        try {
          if (device.handle.queryPermission) {
            const q = await device.handle.queryPermission({ mode: 'read' });
            if (q !== 'granted' && device.handle.requestPermission) {
              const r = await device.handle.requestPermission({ mode: 'read' });
              if (r !== 'granted') throw new Error('permissão negada');
            }
          }
        } catch (e) {
          if (String(e?.message || '').includes('negada')) throw e;
        }
        const found = await emu.scanFolder(device.handle, { max: 200 });
        total += found.length;
        if (!found.length) {
          const empty = document.createElement('p');
          empty.className = 'emu-note';
          empty.textContent = 'Nenhum .exe/.com/.bat/.msi na raiz desta pasta.';
          group.appendChild(empty);
        }
        found.forEach((item) => group.appendChild(compatRow(win, device, item)));
      } catch (err) {
        const fail = document.createElement('p');
        fail.className = 'emu-note emu-warn';
        fail.textContent = `Não foi possível ler: ${err?.message || 'erro de leitura'}`;
        group.appendChild(fail);
      }
      box.appendChild(group);
    }
    loading.remove();
    const summary = document.createElement('p');
    summary.className = 'emu-note';
    summary.textContent = total ? `${total} executável(is) encontrado(s).` : 'Nenhum executável encontrado nas pastas sincronizadas.';
    box.prepend(summary);
  }

  function compatRow(win, device, item) {
    const row = document.createElement('div');
    row.className = 'emu-compat-row';
    const icon = document.createElement('i');
    icon.className = 'fas fa-cog';
    const text = document.createElement('span');
    text.className = 'emu-compat-name';
    text.textContent = `${item.name} · ${fmtSize(item.size)}`;
    row.append(icon, text);
    const tmp = document.createElement('span');
    tmp.innerHTML = badge(item.format);
    row.appendChild(tmp);
    const open = document.createElement('button');
    open.type = 'button';
    open.textContent = item.runnable === 'dos' ? '▶ Abrir' : '🔍 Inspecionar';
    open.onclick = async () => {
      open.disabled = true;
      try {
        const file = await item.handle.getFile();
        const slice = await window.VessieEmulator.sliceForAnalysis(file);
        openEmulator(slice.bytes, item.name, `${device.label} · ${device.rootName || ''}`, {
          truncated: slice.truncated, fullSize: slice.fullSize
        });
      } catch (err) {
        if (typeof toast === 'function') toast(`Não foi possível abrir ${item.name}: ${err?.message || 'erro'}`, 'error');
      } finally {
        open.disabled = false;
      }
    };
    row.appendChild(open);
    return row;
  }

  // Abertura a partir do Disco Local (ponte): o VFS guarda texto, então os
  // bytes são aproximados — a Inspeção funciona, a execução é desativada.
  function openEmulatorForVfs(fullPath) {
    let value = null;
    try { value = VFS.read(fullPath); } catch { value = null; }
    if (typeof value !== 'string') return false;
    if (!/^(MZ)/.test(value) && !/\.(bat|cmd|com)$/i.test(fullPath)) return false;
    const bytes = new TextEncoder().encode(value);
    openEmulator(bytes, fullPath.split('/').pop(), `Disco Local · ${fullPath}`, { approx: true, allowRun: false });
    return true;
  }

  window.openEmulator = openEmulator;
  window.openEmulatorForVfs = openEmulatorForVfs;
})();

// exe-runner.js — Executor Windows do VessieOS
// Abre executáveis Windows de verdade: parser PE (MZ/COFF/seções/imports),
// inspetor MSI, interpretador batch (.bat/.cmd) funcional e ambiente de
// emulação compatível (execução simulada com stubs Win32 funcionais).
//
// HONESTIDADE TÉCNICA: o código x86 do binário NÃO é executado — seria
// necessário um emulador de CPU completo no navegador. O que é real:
// - leitura byte-a-byte do binário (cabeçalhos, seções, imports, strings);
// - interpretador batch que opera de verdade no VFS;
// - stubs Win32 funcionais (MessageBox, console, Beep via WebAudio...);
// - processos emulados visíveis e finalizáveis no Gerenciador de Tarefas.
(function () {
  "use strict";

  // ================= Registro de processos emulados =================
  const liveProcesses = new Map();
  let nextPid = 1000;

  function spawnProcess(info) {
    const pid = nextPid++;
    const entry = {
      pid,
      name: info.name || 'programa.exe',
      kind: info.kind || 'emulado',
      startedAt: new Date().toISOString(),
      mem: info.mem || 8,
      kill: typeof info.kill === 'function' ? info.kill : (() => {}),
      focus: typeof info.focus === 'function' ? info.focus : (() => {})
    };
    liveProcesses.set(pid, entry);
    return entry;
  }

  function killProcess(pid) {
    const entry = liveProcesses.get(Number(pid));
    if (!entry) return false;
    try { entry.kill(); } catch { /* ignore */ }
    liveProcesses.delete(Number(pid));
    return true;
  }

  function listProcesses() {
    return [...liveProcesses.values()].map((p) => ({ pid: p.pid, name: p.name, kind: p.kind, mem: p.mem, startedAt: p.startedAt }));
  }

  // ================= Utilidades binárias =================
  function base64ToBytes(b64) {
    const clean = String(b64).replace(/\s+/g, '');
    const bin = atob(clean);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function valueToBytes(value) {
    if (value instanceof ArrayBuffer) return new Uint8Array(value);
    if (value instanceof Uint8Array) return value;
    if (typeof value !== 'string') throw new Error('conteúdo vazio ou ilegível');
    const text = value;
    if (text.startsWith('data:')) {
      const comma = text.indexOf(',');
      if (comma < 0) throw new Error('data URL inválida');
      const meta = text.slice(5, comma);
      const payload = text.slice(comma + 1);
      if (/;base64/i.test(meta)) return base64ToBytes(decodeURIComponent(payload));
      return new TextEncoder().encode(decodeURIComponent(payload));
    }
    if (text.charCodeAt(0) === 0x4D && text.charCodeAt(1) === 0x5A) {
      // "MZ" como texto (binário colado como string) — bytes latin1
      const out = new Uint8Array(text.length);
      for (let i = 0; i < text.length; i++) out[i] = text.charCodeAt(i) & 0xFF;
      return out;
    }
    throw new Error('o arquivo não contém bytes de executável (traga o .exe via upload ou seletor)');
  }

  function fnv1a(bytes) {
    let hash = 0x811C9DC5;
    const stride = bytes.length > 4 * 1024 * 1024 ? 7 : 1;
    for (let i = 0; i < bytes.length; i += stride) {
      hash ^= bytes[i];
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return hash.toString(16).padStart(8, '0');
  }

  function readAscii(bytes, offset, maxLen) {
    let end = offset;
    const limit = Math.min(bytes.length, offset + maxLen);
    while (end < limit && bytes[end] !== 0) end++;
    let s = '';
    for (let i = offset; i < end; i++) s += String.fromCharCode(bytes[i]);
    return s;
  }

  function extractStrings(bytes, minLen, maxCount) {
    const found = [];
    let current = '';
    const push = () => {
      if (current.length >= minLen) found.push(current);
      current = '';
    };
    for (let i = 0; i < bytes.length && found.length < maxCount; i++) {
      const c = bytes[i];
      if (c >= 0x20 && c <= 0x7E) current += String.fromCharCode(c);
      else push();
    }
    push();
    return found;
  }

  // ================= Parser PE =================
  const MACHINES = {
    0x14C: 'i386 (32 bits)', 0x8664: 'x86-64 (64 bits)', 0x1C0: 'ARM',
    0xAA64: 'ARM64', 0x284: 'IA-64 (Itanium)', 0x162: 'MIPS', 0x166: 'MIPS16',
    0x169: 'MIPS + FPU', 0x266: 'MIPS16 + FPU', 0x184: 'Alpha', 0x1F0: 'PowerPC',
    0x1F1: 'PowerPCFP', 0x1F2: 'PowerPC64', 0x520: 'Infineon TriCore'
  };

  const SUBSYSTEMS = {
    0: 'Desconhecido', 1: 'Nativo (driver)', 2: 'Janela (GUI)', 3: 'Console (CUI)',
    5: 'Console OS/2', 7: 'POSIX (CUI)', 8: 'Windows 9x (motorista)', 9: 'Windows CE (GUI)',
    10: 'EFI (aplicativo)', 11: 'EFI (driver de boot)', 12: 'EFI (runtime)',
    13: 'EFI (ROM)', 14: 'XBOX', 16: 'Boot (aplicativo)'
  };

  function decodeCharacteristics(flags) {
    const out = [];
    if (flags & 0x0001) out.push('relocações removidas');
    if (flags & 0x0002) out.push('executável');
    if (flags & 0x2000) out.push('DLL');
    if (flags & 0x0100) out.push('32 bits');
    if (flags & 0x0020) out.push('large-address-aware');
    if (flags & 0x4000) out.push('DEP/NX');
    if (flags & 0x0040) out.push('ASLR/aleatorização');
    return out;
  }

  function sectionFlags(flags) {
    const out = [];
    if (flags & 0x00000020) out.push('código');
    if (flags & 0x00000040) out.push('dados');
    if (flags & 0x00000080) out.push('bss');
    if (flags & 0x02000000) out.push('descartável');
    if (flags & 0x20000000) out.push('X');
    if (flags & 0x40000000) out.push('R');
    if (flags & 0x80000000) out.push('W');
    return out.join(' ');
  }

  function parsePE(u8) {
    const view = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
    const need = (offset, size, what) => {
      if (offset < 0 || offset + size > u8.length) throw new Error(`binário truncado em ${what}`);
    };
    need(0, 64, 'cabeçalho DOS');
    if (view.getUint16(0, true) !== 0x5A4D) throw new Error('assinatura MZ ausente — não é um executável Windows');
    const eLfanew = view.getUint32(0x3C, true);
    need(eLfanew, 6, 'cabeçalho PE');
    if (view.getUint32(eLfanew, true) !== 0x00004550) throw new Error('assinatura PE ausente');
    const coff = eLfanew + 4;
    const machine = view.getUint16(coff, true);
    const numSections = view.getUint16(coff + 2, true);
    const timestamp = view.getUint32(coff + 4, true);
    const sizeOpt = view.getUint16(coff + 16, true);
    const characteristics = view.getUint16(coff + 18, true);
    if (numSections === 0 || numSections > 96) throw new Error('número de seções inválido');
    const opt = coff + 20;
    need(opt, sizeOpt, 'cabeçalho opcional');
    const magic = view.getUint16(opt, true);
    const is64 = magic === 0x20B;
    if (magic !== 0x10B && magic !== 0x20B) throw new Error('cabeçalho opcional desconhecido');
    const entryPoint = view.getUint32(opt + 16, true);
    const imageBase = is64 ? Number(view.getBigUint64(opt + 24, true)) : view.getUint32(opt + 28, true);
    const sectionAlign = view.getUint32(opt + 32, true);
    const fileAlign = view.getUint32(opt + 36, true);
    const sizeOfImage = view.getUint32(opt + 56, true);
    const subsystem = view.getUint16(opt + 68, true);
    const dllChars = view.getUint16(opt + 70, true);
    const dataDirBase = opt + (is64 ? 112 : 96);
    const importRVA = sizeOpt >= (is64 ? 120 : 104) ? view.getUint32(dataDirBase + 8, true) : 0;
    const importSize = sizeOpt >= (is64 ? 120 : 104) ? view.getUint32(dataDirBase + 12, true) : 0;

    const sections = [];
    let sectionsBase = opt + sizeOpt;
    for (let i = 0; i < numSections; i++) {
      const base = sectionsBase + i * 40;
      need(base, 40, `seção ${i}`);
      sections.push({
        name: readAscii(u8, base, 8) || `.s${i}`,
        vsize: view.getUint32(base + 8, true),
        vaddr: view.getUint32(base + 12, true),
        rawSize: view.getUint32(base + 16, true),
        rawPtr: view.getUint32(base + 20, true),
        flags: view.getUint32(base + 36, true)
      });
    }
    const rvaToOffset = (rva) => {
      for (const s of sections) {
        const span = Math.max(s.vsize, s.rawSize);
        if (rva >= s.vaddr && rva < s.vaddr + span) return s.rawPtr + (rva - s.vaddr);
      }
      return -1;
    };
    const readU32 = (rva) => {
      const off = rvaToOffset(rva);
      if (off < 0 || off + 4 > u8.length) throw new Error('RVA fora das seções');
      return view.getUint32(off, true);
    };
    const readStr = (rva, max = 256) => {
      const off = rvaToOffset(rva);
      if (off < 0) return '';
      return readAscii(u8, off, max);
    };

    const imports = [];
    if (importRVA && importSize) {
      for (let d = 0; d < 64; d++) {
        const base = rvaToOffset(importRVA + d * 20);
        if (base < 0) break;
        need(base, 20, 'descritor de import');
        const oft = view.getUint32(base, true);
        const nameRVA = view.getUint32(base + 12, true);
        const ft = view.getUint32(base + 16, true);
        if (!oft && !nameRVA && !ft) break;
        const dll = readStr(nameRVA) || '(sem nome)';
        const thunk = oft || ft;
        const funcs = [];
        if (thunk) {
          for (let t = 0; t < 2000; t++) {
            const entryRVA = thunk + t * (is64 ? 8 : 4);
            const entryOff = rvaToOffset(entryRVA);
            if (entryOff < 0) break;
            let entryVal;
            if (is64) {
              entryVal = Number(view.getBigUint64(entryOff, true));
              if (entryVal === 0) break;
              if (entryVal & 0x8000000000000000) { funcs.push(`ordinal@${entryVal & 0xFFFF}`); continue; }
            } else {
              entryVal = view.getUint32(entryOff, true);
              if (entryVal === 0) break;
              if (entryVal & 0x80000000) { funcs.push(`ordinal@${entryVal & 0xFFFF}`); continue; }
            }
            const nameOff = rvaToOffset(Number(entryVal) >>> 0);
            funcs.push(nameOff >= 0 ? (readAscii(u8, nameOff + 2, 128) || '(sem nome)') : '(inválido)');
            if (funcs.length >= 500) break;
          }
        }
        imports.push({ dll, functions: funcs });
        if (imports.length >= 64) break;
      }
    }

    let overlay = 0;
    let maxEnd = 0;
    sections.forEach((s) => { maxEnd = Math.max(maxEnd, s.rawPtr + s.rawSize); });
    if (u8.length > maxEnd) overlay = u8.length - maxEnd;

    let stubMsg = '';
    try {
      const stubEnd = Math.min(eLfanew, 512);
      let raw = '';
      for (let i = 0x40; i < stubEnd; i++) {
        const c = u8[i];
        raw += (c >= 0x20 && c <= 0x7E) ? String.fromCharCode(c) : ' ';
      }
      const m = raw.match(/This program[^\n$]{0,60}/);
      if (m) stubMsg = m[0].trim();
    } catch { /* ignore */ }

    let compiledAt = '—';
    if (timestamp > 631152000 && timestamp < 4102444800) {
      try { compiledAt = new Date(timestamp * 1000).toLocaleString('pt-BR'); } catch { /* ignore */ }
    }
    const totalImports = imports.reduce((n, d) => n + d.functions.length, 0);
    return {
      arch: MACHINES[machine] || `desconhecida (0x${machine.toString(16)})`,
      is64, isDll: !!(characteristics & 0x2000),
      numSections, timestamp, compiledAt, characteristics: decodeCharacteristics(characteristics),
      dllChars, entryPoint, imageBase, sectionAlign, fileAlign, sizeOfImage,
      subsystem, subsystemName: SUBSYSTEMS[subsystem] || `código ${subsystem}`,
      isGui: subsystem === 2 || subsystem === 9, isConsole: subsystem === 3,
      sections, imports, totalImports, overlay, stubMsg,
      fingerprint: fnv1a(u8), size: u8.length
    };
  }

  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function escHtml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ================= Janela: console virtual =================
  function createConsoleWindow(title, icon) {
    const win = createWin(title, icon || '💻', `
      <div class="vx-console">
        <div class="vx-console-out" aria-live="polite"></div>
        <div class="vx-console-in"><span class="vx-prompt">›</span><input class="vx-input" autocomplete="off" spellcheck="false" placeholder="digite e pressione Enter"></div>
      </div>`, 640, 460);
    const out = win.querySelector('.vx-console-out');
    const input = win.querySelector('.vx-input');
    let waiter = null;
    let closed = false;
    const api = {
      win,
      print(text, cls) {
        if (closed) return;
        const div = document.createElement('div');
        if (cls) div.className = cls;
        div.textContent = String(text ?? '');
        out.appendChild(div);
        out.scrollTop = out.scrollHeight;
      },
      printHtml(html) {
        if (closed) return;
        const div = document.createElement('div');
        div.innerHTML = html;
        out.appendChild(div);
        out.scrollTop = out.scrollHeight;
      },
      read(promptText) {
        return new Promise((resolve) => {
          if (closed) return resolve('');
          if (promptText) api.print(promptText, 'vx-dim');
          waiter = resolve;
          input.focus();
        });
      },
      clear() { out.innerHTML = ''; },
      close() {
        closed = true;
        if (waiter) { const w = waiter; waiter = null; w(''); }
        try { win.querySelector('[data-act="cls"]')?.click(); } catch { try { win.remove(); } catch {} }
      },
      get closed() { return closed; }
    };
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && waiter) {
        const w = waiter; waiter = null;
        const value = input.value;
        input.value = '';
        api.print(`› ${value}`, 'vx-echo');
        w(value);
      }
    });
    const observer = new MutationObserver(() => {
      if (!document.body.contains(win)) {
        closed = true;
        if (waiter) { const w = waiter; waiter = null; w(''); }
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return api;
  }

  // ================= Emulador compatível =================
  const EMULATED_APIS = {
    'MessageBoxA': { dll: 'user32', run: async (ctx, args) => { showEmulatedMessageBox(ctx, args.join(' ') || 'Mensagem do aplicativo'); return 1; } },
    'MessageBoxW': { dll: 'user32', run: async (ctx, args) => { showEmulatedMessageBox(ctx, args.join(' ') || 'Mensagem do aplicativo'); return 1; } },
    'GetTickCount': { dll: 'kernel32', run: async () => Date.now() % 4294967296 },
    'GetCurrentProcessId': { dll: 'kernel32', run: async (ctx) => ctx.proc.pid },
    'GetVersion': { dll: 'kernel32', run: async () => 0x0A000000 },
    'Sleep': { dll: 'kernel32', run: async (ctx, args) => { await new Promise((r) => setTimeout(r, Math.min(Number(args[0]) || 0, 3000))); return 0; } },
    'Beep': {
      dll: 'kernel32',
      run: async (ctx, args) => {
        const freq = Math.min(Math.max(Number(args[0]) || 440, 37), 8000);
        const dur = Math.min(Number(args[1]) || 200, 2000);
        try {
          const AC = window.AudioContext || window.webkitAudioContext;
          const ac = new AC();
          const osc = ac.createOscillator();
          const gain = ac.createGain();
          osc.frequency.value = freq;
          gain.gain.value = 0.12;
          osc.connect(gain).connect(ac.destination);
          osc.start();
          setTimeout(() => { try { osc.stop(); ac.close(); } catch {} }, dur);
        } catch { /* sem áudio */ }
        return 1;
      }
    },
    'GetComputerNameA': { dll: 'kernel32', run: async () => 'VESSIE-PC' },
    'GetUserNameA': { dll: 'kernel32', run: async () => { try { return S.user || 'Usuario'; } catch { return 'Usuario'; } } },
    'GetCommandLineA': { dll: 'kernel32', run: async (ctx) => ctx.name },
    'ExitProcess': { dll: 'kernel32', run: async (ctx, args) => { ctx.exit(Number(args[0]) || 0); return 0; } },
    'printf': { dll: 'msvcrt', run: async (ctx, args) => { ctx.console.print(args.join(' ')); return args.join(' ').length; } },
    'puts': { dll: 'msvcrt', run: async (ctx, args) => { ctx.console.print(args.join(' ')); return 0; } },
    'system': { dll: 'msvcrt', run: async (ctx, args) => { ctx.console.print(`[emulado] system("${args.join(' ')}") → 0`, 'vx-dim'); return 0; } }
  };

  function showEmulatedMessageBox(ctx, text) {
    const box = createWin(ctx.name, '💬', `
      <div class="vx-msgbox">
        <div class="vx-msgbox-body"><span class="vx-msgbox-icon">ℹ️</span><p></p></div>
        <div class="vx-msgbox-actions"><button type="button" data-ok>OK</button></div>
      </div>`, 420, 200);
    box.querySelector('.vx-msgbox-body p').textContent = String(text).slice(0, 500);
    box.querySelector('[data-ok]').onclick = () => {
      try { box.querySelector('[data-act="cls"]')?.click(); } catch { try { box.remove(); } catch {} }
    };
    ctx.console.print(`[user32] MessageBox → "${String(text).slice(0, 80)}"`, 'vx-dim');
  }

  function runEmulated(name, info) {
    const isGui = info.isGui || info.isDll;
    const proc = spawnProcess({ name, kind: 'emulado', mem: Math.max(4, Math.round(info.size / 1024 / 128)) });
    const ctx = { name, proc, info, exited: false };
    ctx.exit = (code) => {
      if (ctx.exited) return;
      ctx.exited = true;
      ctx.console.print(`[loader] processo encerrado (código ${code})`, 'vx-ok');
      setTimeout(() => { killProcess(proc.pid); ctx.console.close(); }, 2500);
    };
    proc.kill = () => { ctx.exited = true; try { ctx.console.close(); } catch {} };

    if (isGui) {
      const gui = createWin(name, '🪟', `
        <div class="vx-gui">
          <div class="vx-gui-bar"><span>Arquivo</span><span>Editar</span><span>Ajuda</span></div>
          <div class="vx-gui-main"><div class="vx-gui-icon">🪟</div><p><strong></strong></p><p class="vx-dim">Janela principal do aplicativo em modo de compatibilidade. O código x86 não é executado; chamadas Win32 são atendidas por stubs funcionais.</p></div>
          <div class="vx-gui-actions"><button type="button" data-msg>Mensagem de teste</button><button type="button" data-quit>Encerrar</button></div>
        </div>`, 480, 360);
      gui.querySelector('.vx-gui-main strong').textContent = name;
      const guiConsole = createConsoleWindow(`${name} — log de emulação`, '🧩');
      ctx.console = guiConsole;
      const prevKill = proc.kill;
      proc.kill = () => {
        ctx.exited = true;
        try { gui.querySelector('[data-act="cls"]')?.click(); } catch { try { gui.remove(); } catch {} }
        try { guiConsole.close(); } catch {}
        prevKill();
      };
      guiConsole.print(`[loader] ${name} (PID ${proc.pid})`, 'vx-ok');
      guiConsole.print(`[loader] subsistema GUI · ${info.arch}`, 'vx-dim');
      traceLoader(guiConsole, info);
      gui.querySelector('[data-msg]').onclick = () => showEmulatedMessageBox(ctx, `Olá do ${name}! (via user32.MessageBox emulado)`);
      gui.querySelector('[data-quit]').onclick = () => { ctx.exit(0); try { gui.querySelector('[data-act="cls"]')?.click(); } catch { try { gui.remove(); } catch {} } };
      const observer = new MutationObserver(() => {
        if (!document.body.contains(gui) && !ctx.exited) ctx.exit(0);
        if (!document.body.contains(gui)) observer.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    } else {
      const term = createConsoleWindow(`${name} — console emulado`, '💻');
      ctx.console = term;
      term.print(`Microsoft Windows [versão 10.0 · compatibilidade VessieOS]`, 'vx-dim');
      term.print(`Executando ${name} (PID ${proc.pid}) — digite "help" para os comandos da API.`, 'vx-dim');
      traceLoader(term, info);
      (async () => {
        while (!term.closed && !ctx.exited) {
          const line = await term.read();
          if (term.closed || ctx.exited) break;
          await handleApiCommand(ctx, String(line).trim());
        }
      })();
    }
    if (typeof toast === 'function') toast(`▶ ${name} em execução (PID ${proc.pid})`, 'success');
    return proc;
  }

  function traceLoader(term, info) {
    term.print(`[loader] imagem ${info.is64 ? 'PE32+' : 'PE32'} carregada em 0x${info.imageBase.toString(16)}`, 'vx-dim');
    term.print(`[loader] ponto de entrada: 0x${info.entryPoint.toString(16)} · ${info.numSections} seções mapeadas`, 'vx-dim');
    const dlls = info.imports.slice(0, 12).map((d) => d.dll).join(', ') || 'nenhuma (estático)';
    term.print(`[loader] ${info.imports.length} DLL(s): ${dlls}`, 'vx-dim');
    const matched = info.imports.reduce((n, d) => n + d.functions.filter((f) => EMULATED_APIS[f]).length, 0);
    term.print(`[loader] ${matched}/${info.totalImports} importações com stub funcional`, matched ? 'vx-ok' : 'vx-warn');
  }

  async function handleApiCommand(ctx, line) {
    const term = ctx.console;
    if (!line) return;
    const [cmd, ...args] = line.split(/\s+/);
    if (cmd === 'help') {
      term.print('Comandos: call <Api> [args] · apis · imports · exit', 'vx-dim');
      return;
    }
    if (cmd === 'apis') {
      term.print(Object.keys(EMULATED_APIS).join('  '), 'vx-dim');
      return;
    }
    if (cmd === 'imports') {
      ctx.info.imports.slice(0, 10).forEach((d) => term.print(`${d.dll}: ${d.functions.slice(0, 8).join(', ')}${d.functions.length > 8 ? ' …' : ''}`, 'vx-dim'));
      return;
    }
    if (cmd === 'exit' || cmd === 'quit') { ctx.exit(0); return; }
    if (cmd === 'call') {
      const api = EMULATED_APIS[args[0]];
      if (!api) { term.print(`API "${args[0] || ''}" sem stub (retornando 0). Use "apis".`, 'vx-warn'); return; }
      try {
        const ret = await api.run(ctx, args.slice(1));
        term.print(`[${api.dll}] ${args[0]} → ${ret}`, 'vx-ok');
      } catch (e) {
        term.print(`erro no stub: ${e?.message || e}`, 'vx-err');
      }
      return;
    }
    term.print(`comando desconhecido: ${cmd} (tente "help")`, 'vx-warn');
  }

  // ================= Analisador PE =================
  function openAnalyzer(name, bytes, origin) {
    let info;
    try {
      info = parsePE(bytes);
    } catch (error) {
      toast(`Não é um executável válido: ${error?.message || 'erro de leitura'}`, 'error');
      return null;
    }
    const tabId = `vx${Math.random().toString(36).slice(2, 7)}`;
    const win = createWin(`Analisador — ${name}`, '🔍', `
      <div class="vx-analyzer" id="${tabId}">
        <header class="vx-an-head">
          <div class="vx-an-title"><span class="vx-an-icon">⚙️</span><div><strong></strong><small></small></div></div>
          <div class="vx-an-actions">
            <button type="button" data-tab="run" class="primary">▶ Executar (emulado)</button>
            ${origin === 'memory' ? '<button type="button" data-tab="save">💾 Salvar no VFS</button>' : ''}
          </div>
        </header>
        <nav class="vx-an-tabs">
          <button type="button" data-vtab="resumo" class="ac">Resumo</button>
          <button type="button" data-vtab="cab">Cabeçalhos</button>
          <button type="button" data-vtab="sec">Seções</button>
          <button type="button" data-vtab="imp">Imports</button>
          <button type="button" data-vtab="str">Strings</button>
        </nav>
        <div class="vx-an-body"></div>
        <footer class="vx-an-foot">Emulação compatível: o código x86 não é executado de verdade; chamadas Win32 são atendidas por stubs.</footer>
      </div>`, 720, 540);
    win.querySelector('.vx-an-title strong').textContent = name;
    win.querySelector('.vx-an-title small').textContent = `${formatSize(bytes.length)} · ${info.isDll ? 'DLL' : 'EXE'} ${info.is64 ? '64 bits' : '32 bits'} · ${info.subsystemName}`;
    const body = win.querySelector('.vx-an-body');
    const kv = (rows) => `<table class="vx-kv">${rows.map(([k, v]) => `<tr><th></th><td></td></tr>`).join('')}</table>`;
    const fillKv = (table, rows) => {
      table.querySelectorAll('tr').forEach((tr, i) => {
        tr.children[0].textContent = rows[i][0];
        tr.children[1].textContent = rows[i][1];
      });
    };
    const renderResumo = () => {
      const rows = [
        ['Formato', `${info.isDll ? 'DLL' : 'EXE'} · ${info.is64 ? 'PE32+ (64 bits)' : 'PE32 (32 bits)'}`],
        ['Arquitetura', info.arch],
        ['Subsistema', info.subsystemName],
        ['Ponto de entrada', `0x${info.entryPoint.toString(16)}`],
        ['Base da imagem', `0x${info.imageBase.toString(16)}`],
        ['Seções', String(info.numSections)],
        ['Imports', `${info.totalImports} funções em ${info.imports.length} DLL(s)`],
        ['Compilado em', info.compiledAt],
        ['Overlay', info.overlay ? `${formatSize(info.overlay)} após as seções` : 'nenhum'],
        ['Impressão digital', `FNV-1a ${info.fingerprint}`]
      ];
      body.innerHTML = kv(rows);
      fillKv(body.querySelector('table'), rows);
      if (info.stubMsg) {
        const p = document.createElement('p');
        p.className = 'vx-dim';
        p.textContent = `Stub DOS: "${info.stubMsg}"`;
        body.appendChild(p);
      }
    };
    const renderCab = () => {
      const rows = [
        ['e_magic', 'MZ'],
        ['e_lfanew', `0x${'?'}`],
        ['Machine', info.arch],
        ['Characteristics', info.characteristics.join(', ') || '—'],
        ['EntryPoint', `0x${info.entryPoint.toString(16)}`],
        ['ImageBase', `0x${info.imageBase.toString(16)}`],
        ['SectionAlignment', `0x${info.sectionAlign.toString(16)}`],
        ['FileAlignment', `0x${info.fileAlign.toString(16)}`],
        ['SizeOfImage', `0x${info.sizeOfImage.toString(16)}`],
        ['Subsystem', `${info.subsystem} (${info.subsystemName})`]
      ];
      try {
        const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        rows[1][1] = `0x${v.getUint32(0x3C, true).toString(16)}`;
      } catch { /* ignore */ }
      body.innerHTML = kv(rows);
      fillKv(body.querySelector('table'), rows);
    };
    const renderSec = () => {
      const table = document.createElement('table');
      table.className = 'vx-table';
      table.innerHTML = '<thead><tr><th>Nome</th><th>VSize</th><th>VAddr</th><th>Raw</th><th>Flags</th></tr></thead>';
      const tb = document.createElement('tbody');
      info.sections.forEach((s) => {
        const tr = document.createElement('tr');
        [s.name, `0x${s.vsize.toString(16)}`, `0x${s.vaddr.toString(16)}`, formatSize(s.rawSize), sectionFlags(s.flags)].forEach((v) => {
          const td = document.createElement('td');
          td.textContent = v;
          tr.appendChild(td);
        });
        tb.appendChild(tr);
      });
      table.appendChild(tb);
      body.replaceChildren(table);
    };
    const renderImp = () => {
      body.replaceChildren();
      if (!info.imports.length) {
        body.textContent = 'Nenhuma tabela de imports (binário estático ou empacotado).';
        return;
      }
      info.imports.slice(0, 64).forEach((d) => {
        const det = document.createElement('details');
        det.className = 'vx-imp';
        const sum = document.createElement('summary');
        sum.textContent = `${d.dll} (${d.functions.length})`;
        det.appendChild(sum);
        const list = document.createElement('div');
        list.className = 'vx-imp-list';
        d.functions.slice(0, 200).forEach((f) => {
          const code = document.createElement('code');
          code.textContent = f;
          if (EMULATED_APIS[f]) code.className = 'vx-has-stub';
          code.title = EMULATED_APIS[f] ? 'stub funcional disponível' : 'sem stub (retorna 0)';
          list.appendChild(code);
        });
        if (d.functions.length > 200) {
          const more = document.createElement('span');
          more.className = 'vx-dim';
          more.textContent = `… +${d.functions.length - 200}`;
          list.appendChild(more);
        }
        det.appendChild(list);
        body.appendChild(det);
      });
    };
    const renderStr = () => {
      const strings = extractStrings(bytes, 5, 400);
      const pre = document.createElement('pre');
      pre.className = 'vx-strings';
      pre.textContent = strings.length ? strings.join('\n') : '(nenhuma string ASCII relevante)';
      body.replaceChildren(pre);
    };
    const views = { resumo: renderResumo, cab: renderCab, sec: renderSec, imp: renderImp, str: renderStr };
    win.querySelectorAll('[data-vtab]').forEach((btn) => {
      btn.onclick = () => {
        win.querySelectorAll('[data-vtab]').forEach((b) => b.classList.remove('ac'));
        btn.classList.add('ac');
        views[btn.dataset.vtab]();
      };
    });
    win.querySelector('[data-tab="run"]').onclick = () => runEmulated(name, info);
    const saveBtn = win.querySelector('[data-tab="save"]');
    if (saveBtn) {
      saveBtn.onclick = () => {
        if (bytes.length > 1.5 * 1024 * 1024 && !confirm(`"${name}" tem ${formatSize(bytes.length)}. Salvar no VFS pode estourar a cota do navegador. Continuar?`)) return;
        let b64 = '';
        for (let i = 0; i < bytes.length; i += 8192) b64 += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
        const target = prompt('Salvar em qual pasta local?', 'Downloads') || 'Downloads';
        const dir = String(target).trim().replace(/^\/+|\/+$/g, '') || 'Downloads';
        VFS.write(`${dir}/${name}`, `data:application/x-msdownload;base64,${btoa(b64)}`);
        try { persistState(); } catch {}
        toast(`"${name}" salvo em ${dir}.`, 'success');
      };
    }
    renderResumo();
    return { win, info };
  }

  // ================= Inspetor MSI =================
  function openMsi(name, bytes) {
    const isOle = bytes.length > 8 && bytes[0] === 0xD0 && bytes[1] === 0xCF && bytes[2] === 0x11 && bytes[3] === 0xE0;
    const isMz = bytes.length > 2 && bytes[0] === 0x4D && bytes[1] === 0x5A;
    if (isMz) {
      toast('É um instalador bootstrapper (EXE). Analisando como executável.', 'default');
      return openAnalyzer(name, bytes, 'memory');
    }
    const rows = [
      ['Arquivo', name],
      ['Tamanho', formatSize(bytes.length)],
      ['Contêiner', isOle ? 'OLE Compound Document (banco de dados do Installer)' : 'formato não reconhecido'],
      ['Instalação real', 'não suportada no navegador'],
      ['Impressão digital', `FNV-1a ${fnv1a(bytes)}`]
    ];
    const win = createWin(`Instalador — ${name}`, '📦', `
      <div class="vx-analyzer"><div class="vx-an-body" style="padding:16px">
        <table class="vx-kv">${rows.map(() => '<tr><th></th><td></td></tr>').join('')}</table>
        <p class="vx-dim" style="margin-top:12px">Pacotes .msi são bancos de dados OLE que exigem o serviço Windows Installer. O VessieOS mostra os metadados, mas não executa a instalação — extraia o conteúdo no Windows real ou converta para .bat/.zip.</p>
      </div></div>`, 520, 380);
    const trs = win.querySelectorAll('.vx-kv tr');
    trs.forEach((tr, i) => { tr.children[0].textContent = rows[i][0]; tr.children[1].textContent = rows[i][1]; });
    return win;
  }

  // ================= Interpretador batch (.bat/.cmd) =================
  function parseBatchArgs(args) {
    return (args || []).map(String);
  }

  async function runBatchText(name, text, baseDir, args) {
    const term = createConsoleWindow(`${name} — lote`, '📜');
    const state = {
      echo: true, vars: {}, errorlevel: 0, cwd: baseDir || '',
      title: name, args: parseBatchArgs(args)
    };
    const out = (s) => term.print(s);
    const err = (s) => term.print(s, 'vx-err');
    const resolvePath = (p) => {
      p = String(p || '').trim().replace(/^"|"$/g, '');
      if (/^[A-Za-z]:/.test(p)) p = p.replace(/^[A-Za-z]:[\\/]?/, '');
      p = p.replace(/\\/g, '/');
      if (p.startsWith('/')) return p.slice(1);
      return state.cwd ? `${state.cwd}/${p}` : p;
    };
    const expand = (s) => String(s).replace(/%([^%]+)%/g, (m, v) => {
      const up = v.toUpperCase();
      if (up === 'CD') return state.cwd || '';
      if (up === 'ERRORLEVEL') return String(state.errorlevel);
      if (/^[0-9]$/.test(v)) return v === '0' ? name : (state.args[Number(v) - 1] || '');
      if (up === 'USERNAME' || up === 'USER') { try { return S.user || 'Usuario'; } catch { return 'Usuario'; } }
      return state.vars[up] !== undefined ? state.vars[up] : m;
    });
    const splitRedirect = (line) => {
      const m = line.match(/^(.*?)(>>|>)\s*(\S+)\s*$/);
      if (!m) return { cmd: line, redir: null };
      return { cmd: m[1].trim(), redir: { append: m[2] === '>>', file: m[3] } };
    };
    const wildcardToRegex = (pattern) => new RegExp(`^${pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`, 'i');

    let pausedResolve = null;
    term.win.querySelector('.vx-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && pausedResolve) { const r = pausedResolve; pausedResolve = null; r(); }
    });

    const rawLines = String(text).split(/\r\n|\r|\n/);
    const labels = {};
    rawLines.forEach((ln, i) => {
      const t = ln.trim();
      if (t.startsWith(':') && !t.startsWith('::')) labels[t.slice(1).split(/\s/)[0].toLowerCase()] = i;
    });

    const execLine = async (rawLine) => {
      let line = rawLine.trim();
      if (!line || line.startsWith('::') || /^rem(\s|$)/i.test(line)) return 'next';
      let silent = false;
      if (line.startsWith('@')) { silent = true; line = line.slice(1).trim(); }
      const { cmd, redir } = splitRedirect(line);
      let printed = '';
      const emit = (s) => { printed += (printed ? '\n' : '') + s; };
      const flush = () => {
        if (redir) {
          const target = resolvePath(expand(redir.file));
          let prev = '';
          try { const v = VFS.read(target); if (typeof v === 'string') prev = v; } catch { prev = ''; }
          VFS.write(target, redir.append ? (prev ? `${prev}\n${printed}` : printed) : printed);
          try { persistState(); } catch {}
        } else if (printed) {
          printed.split('\n').forEach((l) => out(l));
        }
      };
      const show = silent ? false : state.echo;
      const tokens = cmd.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
      const verb = (tokens[0] || '').toLowerCase();
      const rest = cmd.slice(tokens[0]?.length || 0).trim();
      const arg = expand(rest).replace(/^"|"$/g, '');

      switch (verb) {
        case 'echo': {
          if (/^off$/i.test(rest)) { state.echo = false; return 'next'; }
          if (/^on$/i.test(rest)) { state.echo = true; return 'next'; }
          if (rest === '' || rest === '.') { emit(''); flush(); return 'next'; }
          emit(expand(rest.replace(/^\.|^ /, ''))); flush(); return 'next';
        }
        case 'title': state.title = arg; try { term.win.querySelector('.w-title').textContent = arg; } catch {} return 'next';
        case 'cls': term.clear(); return 'next';
        case 'cd':
        case 'chdir': {
          if (!arg) { out(state.cwd || ''); return 'next'; }
          const dest = resolvePath(arg);
          const node = VFS.resolve(dest);
          if (node && typeof node === 'object') { state.cwd = dest; }
          else { err(`O sistema não pode encontrar o caminho especificado: ${arg}`); state.errorlevel = 1; }
          return 'next';
        }
        case 'dir':
        case 'ls': {
          const dest = arg ? resolvePath(arg) : state.cwd;
          const node = VFS.resolve(dest);
          if (!node || typeof node !== 'object') { err(`Arquivo não encontrado: ${arg || dest}`); state.errorlevel = 1; return 'next'; }
          out(` Conteúdo de ${dest || '(raiz)'}`);
          Object.entries(node).forEach(([n, v]) => out(`${v && typeof v === 'object' ? '<DIR>' : '     '}  ${n}`));
          return 'next';
        }
        case 'md':
        case 'mkdir': {
          if (!arg) { err('Sintaxe incorreta.'); state.errorlevel = 1; return 'next'; }
          VFS.write(`${resolvePath(arg)}/.keep`, '');
          VFS.delete(`${resolvePath(arg)}/.keep`);
          VFS.mkdir(resolvePath(arg));
          try { persistState(); } catch {}
          return 'next';
        }
        case 'rd':
        case 'rmdir': {
          const node = VFS.resolve(resolvePath(arg));
          if (!node || typeof node !== 'object') { err(`Caminho não encontrado: ${arg}`); state.errorlevel = 1; return 'next'; }
          VFS.delete(resolvePath(arg));
          try { persistState(); } catch {}
          return 'next';
        }
        case 'del':
        case 'erase': {
          const full = resolvePath(arg);
          const slash = full.lastIndexOf('/');
          const dir = slash < 0 ? state.cwd : full.slice(0, slash);
          const pat = slash < 0 ? full : full.slice(slash + 1);
          const node = VFS.resolve(dir);
          if (!node || typeof node !== 'object') { err(`Caminho não encontrado: ${arg}`); state.errorlevel = 1; return 'next'; }
          const rx = wildcardToRegex(pat);
          let n = 0;
          Object.keys(node).forEach((k) => {
            const v = node[k];
            if (!(v && typeof v === 'object') && rx.test(k)) { VFS.delete(dir ? `${dir}/${k}` : k); n++; }
          });
          if (!n) { err(`Não foi possível encontrar ${arg}`); state.errorlevel = 1; }
          try { persistState(); } catch {}
          return 'next';
        }
        case 'copy': {
          const parts = (rest.match(/(?:[^\s"]+|"[^"]*")+/g) || []).map((s) => s.replace(/^"|"$/g, ''));
          if (parts.length < 2) { err('Sintaxe incorreta.'); state.errorlevel = 1; return 'next'; }
          const src = VFS.read(resolvePath(expand(parts[0])));
          if (typeof src !== 'string') { err(`Não foi possível encontrar ${parts[0]}`); state.errorlevel = 1; return 'next'; }
          VFS.write(resolvePath(expand(parts[1])), src);
          out(`        1 arquivo(s) copiado(s).`);
          try { persistState(); } catch {}
          return 'next';
        }
        case 'move':
        case 'ren':
        case 'rename': {
          const parts = (rest.match(/(?:[^\s"]+|"[^"]*")+/g) || []).map((s) => s.replace(/^"|"$/g, ''));
          if (parts.length < 2) { err('Sintaxe incorreta.'); state.errorlevel = 1; return 'next'; }
          const from = resolvePath(expand(parts[0]));
          const val = VFS.read(from);
          if (val === null || val === undefined) { err(`Não foi possível encontrar ${parts[0]}`); state.errorlevel = 1; return 'next'; }
          const toRaw = expand(parts[1]);
          const to = (toRaw.includes('/') || toRaw.includes('\\')) ? resolvePath(toRaw) : (state.cwd ? `${state.cwd}/${toRaw}` : toRaw);
          VFS.write(to, val);
          VFS.delete(from);
          try { persistState(); } catch {}
          return 'next';
        }
        case 'type': {
          const val = VFS.read(resolvePath(arg));
          if (typeof val !== 'string') { err(`Não foi possível encontrar ${arg}`); state.errorlevel = 1; return 'next'; }
          val.split('\n').forEach((l) => out(l));
          return 'next';
        }
        case 'set': {
          const m = rest.match(/^(?:\/p\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s?(.*)$/);
          if (/^\/p\s/i.test(rest) && m) {
            const answer = await term.read(m[1]);
            state.vars[m[1].toUpperCase()] = answer;
            return 'next';
          }
          if (m) { state.vars[m[1].toUpperCase()] = expand(m[2]); return 'next'; }
          Object.entries(state.vars).forEach(([k, v]) => out(`${k}=${v}`));
          return 'next';
        }
        case 'pause': {
          out('Pressione qualquer tecla para continuar. . .');
          await new Promise((resolve) => { pausedResolve = resolve; });
          return 'next';
        }
        case 'timeout': {
          const secs = Math.min(Number((arg.match(/\/t\s+(\d+)/i) || [])[1] || Number(arg) || 0), 30);
          await new Promise((r) => setTimeout(r, secs * 1000));
          return 'next';
        }
        case 'call': {
          const target = resolvePath(arg.split(/\s/)[0]);
          const val = VFS.read(target);
          if (typeof val !== 'string') { err(`Não foi possível encontrar ${arg}`); state.errorlevel = 1; return 'next'; }
          const slash = target.lastIndexOf('/');
          await runBatchText(target.split('/').pop(), val, slash < 0 ? '' : target.slice(0, slash), []);
          return 'next';
        }
        case 'start': {
          try {
            if (window.VessieBridge) window.VessieBridge.openFile(resolvePath(arg));
          } catch { err(`Não foi possível iniciar ${arg}`); state.errorlevel = 1; }
          return 'next';
        }
        case 'goto': {
          const dest = arg.replace(/^:/, '').toLowerCase();
          if (!(dest in labels)) { err(`Rótulo não encontrado: ${arg}`); state.errorlevel = 1; return 'next'; }
          return { jump: labels[dest] };
        }
        case 'if': {
          return handleIf(cmd);
        }
        case 'exit': {
          const code = Number((arg.match(/\/b\s+(\d+)/i) || [])[1] || 0);
          state.errorlevel = code;
          return { exit: true };
        }
        default: {
          err(`"${verb}" não é reconhecido como comando interno (goto/if/call/set suportados; "for" e pipes não).`);
          state.errorlevel = 9009;
          return 'next';
        }
      }

      async function handleIf(fullCmd) {
        let body = fullCmd.slice(2).trim();
        let neg = false;
        if (/^not\s/i.test(body)) { neg = true; body = body.replace(/^not\s/i, ''); }
        let cond = false;
        let m = body.match(/^exist\s+(\S+)\s+(.+)$/i);
        if (m) {
          const node = VFS.resolve(resolvePath(expand(m[1])));
          cond = node !== null && node !== undefined;
          body = m[2];
        } else if ((m = body.match(/^errorlevel\s+(\d+)\s+(.+)$/i))) {
          cond = state.errorlevel >= Number(m[1]);
          body = m[2];
        } else if ((m = body.match(/^"([^"]*)"\s*==\s*"([^"]*)"\s*(.+)$/))) {
          cond = expand(m[1]) === expand(m[2]);
          body = m[3];
        } else {
          err('Sintaxe do IF incorreta.');
          state.errorlevel = 1;
          return 'next';
        }
        if (neg) cond = !cond;
        if (cond) {
          const inner = body.trim();
          if (/^goto\s/i.test(inner)) {
            const dest = inner.slice(4).trim().replace(/^:/, '').toLowerCase();
            if (!(dest in labels)) { err(`Rótulo não encontrado: ${dest}`); state.errorlevel = 1; return 'next'; }
            return { jump: labels[dest] };
          }
          return execLine(inner);
        }
        return 'next';
      }
    };

    out(`Executando ${name} ...`);
    let pc = 0;
    let steps = 0;
    const MAX_STEPS = 5000;
    while (pc < rawLines.length && !term.closed) {
      if (++steps > MAX_STEPS) { err('Limite de 5000 instruções atingido (loop infinito?). Abortando.'); break; }
      const result = await execLine(rawLines[pc]);
      if (result && typeof result === 'object') {
        if (result.exit) break;
        if (typeof result.jump === 'number') { pc = result.jump + 1; continue; }
      }
      pc++;
    }
    try { persistState(); } catch {}
    if (!term.closed) out(`\n[lote concluído, errorlevel=${state.errorlevel}]`);
    return state.errorlevel;
  }

  // ================= Entradas públicas =================
  function extOfName(name) {
    const base = String(name || '').split('/').pop() || '';
    const dot = base.lastIndexOf('.');
    return dot > 0 ? base.slice(dot + 1).toLowerCase() : '';
  }

  async function openBuffer(name, buffer, origin) {
    let bytes;
    try {
      bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    } catch {
      toast('Não foi possível ler os bytes do arquivo.', 'error');
      return null;
    }
    const ext = extOfName(name);
    if (ext === 'msi') return openMsi(name, bytes);
    if (bytes.length > 2 && bytes[0] === 0x4D && bytes[1] === 0x5A) {
      return openAnalyzer(name, bytes, origin || 'memory');
    }
    toast(`"${name}" não é um executável PE válido.`, 'error');
    return null;
  }

  function openPath(vfsPath) {
    const ext = extOfName(vfsPath);
    if (ext === 'bat' || ext === 'cmd') return runBatch(vfsPath);
    let value = null;
    try { value = VFS.read(vfsPath); } catch { value = null; }
    if (typeof value !== 'string' || !value) {
      toast('Arquivo vazio ou ilegível. Traga o .exe via upload ou seletor de arquivos.', 'error');
      return null;
    }
    if (ext === 'msi') {
      try { return openMsi(vfsPath.split('/').pop(), valueToBytes(value)); }
      catch (e) { toast(e.message, 'error'); return null; }
    }
    try {
      const bytes = valueToBytes(value);
      return openBuffer(vfsPath.split('/').pop(), bytes.buffer, 'vfs');
    } catch (e) {
      toast(e.message, 'error');
      return null;
    }
  }

  function runBatch(vfsPath, args) {
    let value = null;
    try { value = VFS.read(vfsPath); } catch { value = null; }
    if (typeof value !== 'string') {
      toast('Script em lote vazio ou ilegível.', 'error');
      return Promise.resolve(1);
    }
    const slash = String(vfsPath).lastIndexOf('/');
    const base = slash < 0 ? '' : String(vfsPath).slice(0, slash);
    return runBatchText(vfsPath.split('/').pop(), value, base, args || []);
  }

  function openFromPicker() {
    const picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = '.exe,.dll,.msi,.bat,.cmd,.scr,.cpl,.ocx';
    picker.onchange = async () => {
      const file = picker.files && picker.files[0];
      picker.remove();
      if (!file) return;
      try {
        const buffer = await file.arrayBuffer();
        const ext = extOfName(file.name);
        if (ext === 'bat' || ext === 'cmd') {
          runBatchText(file.name, new TextDecoder().decode(buffer), '', []);
          return;
        }
        openBuffer(file.name, buffer, 'memory');
      } catch (e) {
        toast(`Não foi possível abrir: ${e?.message || 'erro de leitura'}`, 'error');
      }
    };
    picker.click();
  }

  async function openRemoteBuffer(name, handle) {
    try {
      const file = await handle.getFile();
      const buffer = await file.arrayBuffer();
      const ext = extOfName(name);
      if (ext === 'bat' || ext === 'cmd') {
        runBatchText(name, new TextDecoder().decode(buffer), '', []);
        return true;
      }
      openBuffer(name, buffer, 'remote');
      return true;
    } catch (e) {
      toast(`Não foi possível abrir ${name}: ${e?.message || 'erro de leitura'}`, 'error');
      return false;
    }
  }

  window.VessieExe = {
    parsePE, openPath, openFile: openPath, openBuffer, openFromPicker,
    openRemoteBuffer, runBatch, runBatchText, openMsi,
    processes: { spawn: spawnProcess, kill: killProcess, list: listProcesses }
  };
  window.VessieProcesses = window.VessieExe.processes;
})();

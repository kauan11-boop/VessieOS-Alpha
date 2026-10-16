// emulation/index.js — módulo de emulação do kernel do VessieOS
// Expõe window.VessieEmulator e registra o módulo/serviço `emulation` no kernel.
// Capacidades (100% locais, sem dependências):
//   detect(bytes, name)  -> identifica MZ/DOS, PE32/PE64, NE/LE/LX, ELF, MSI, batch...
//   analyze(bytes, name) -> inspeção real: cabeçalhos, seções, imports (DLLs), strings
// Execução (sob demanda, com internet):
//   runDos(canvas, bytes, filename) -> roda executáveis DOS (.exe/.com/.bat MZ ou COM)
//   via js-dos 6.22 (DOSBox) carregado preguiçosamente do CDN + ZIP montado em memória.
// Pastas sincronizadas:
//   scanFolder(dirHandle) -> lista executáveis com formato/tamanho para a Central de Compatibilidade.
(function () {
  "use strict";

  const SLICE_BYTES = 4 * 1024 * 1024;   // teto da fatia usada na inspeção
  const MAX_RUN_BYTES = 8 * 1024 * 1024; // teto para execução DOS
  const DOS_CDN = 'https://js-dos.com/6.22/current/js-dos.js';

  // ---------- leitores little-endian ----------
  function u16(b, o) { return (b[o] | (b[o + 1] << 8)) >>> 0; }
  function u32(b, o) {
    return ((b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0);
  }
  function cstr(b, o, max) {
    let s = '';
    const end = Math.min(b.length, o + (max || 256));
    for (let i = o; i < end; i++) {
      if (b[i] === 0) break;
      s += String.fromCharCode(b[i] > 126 ? 46 : b[i]);
    }
    return s;
  }

  const MACHINES = {
    0x14c: 'Intel i386', 0x8664: 'x86-64', 0xaa64: 'ARM64',
    0x1c0: 'ARM', 0x284: 'Intel Itanium', 0x162: 'MIPS',
    0x166: 'MIPS16', 0x169: 'MIPS + FPU', 0x266: 'MIPS16 + FPU',
    0x1f0: 'PowerPC', 0x1f1: 'PowerPC + FPU', 0x1f2: 'PowerPC64',
    0xebc: 'EFI Byte Code', 0x184: 'Alpha AXP', 0x520: 'Infineon TriCore'
  };
  const SUBSYSTEMS = {
    0: 'desconhecido', 1: 'nativo (driver/serviço)', 2: 'janela (GUI)',
    3: 'console (CUI)', 5: 'OS/2 console', 7: 'POSIX', 8: 'nativo Win9x',
    9: 'Windows CE', 10: 'EFI', 11: 'EFI boot service', 12: 'EFI runtime',
    13: 'EFI ROM', 14: 'Xbox', 16: 'boot application'
  };

  function extOf(name) {
    const base = String(name || '').split('/').pop() || '';
    const dot = base.lastIndexOf('.');
    return dot > 0 ? base.slice(dot + 1).toLowerCase() : '';
  }

  // ---------- detecção ----------
  function detect(input, name) {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input || []);
    const ext = extOf(name);
    const info = { ext, size: bytes.length, format: 'unknown', kind: 'unknown', runnable: 'no', arch: '—', subsystem: '—' };
    if (bytes.length >= 2 && bytes[0] === 0x4d && bytes[1] === 0x5a) {
      info.magic = 'MZ';
      let peOff = -1;
      if (bytes.length >= 0x40) {
        const v = u32(bytes, 0x3c);
        if (v > 0 && v < bytes.length - 6) peOff = v;
      }
      if (peOff >= 0) {
        const sig = String.fromCharCode(bytes[peOff], bytes[peOff + 1]);
        const tail = bytes[peOff + 2] === 0 && bytes[peOff + 3] === 0;
        if (sig === 'PE' && tail) {
          const machine = u16(bytes, peOff + 4);
          const nsec = u16(bytes, peOff + 6);
          const optOff = peOff + 24;
          const magic = bytes.length > optOff + 2 ? u16(bytes, optOff) : 0;
          const is64 = magic === 0x20b;
          const subs = bytes.length > optOff + 70 ? u16(bytes, optOff + 68) : 0;
          info.format = is64 ? 'pe64' : 'pe32';
          info.kind = 'windows';
          info.arch = MACHINES[machine] || (`0x${machine.toString(16)}`);
          info.machine = machine;
          info.sections = nsec;
          info.subsystem = SUBSYSTEMS[subs] || `código ${subs}`;
          info.subsystemCode = subs;
          info.is64 = is64;
          info.runnable = 'pc';
          info.note = is64
            ? 'Executável Windows 64-bit. Roda no PC real; no navegador, use a Inspeção.'
            : 'Executável Windows 32-bit. Roda no PC real; no navegador, use a Inspeção.';
          return info;
        }
        if (sig === 'NE' && tail) {
          info.format = 'ne'; info.kind = 'windows16'; info.arch = 'i286/i386 16-bit';
          info.note = 'Executável Windows 3.x/16-bit (NE). Não executa no navegador; use a Inspeção.';
          return info;
        }
        if ((sig === 'LE' || sig === 'LX') && tail) {
          info.format = sig.toLowerCase(); info.kind = 'legacy';
          info.note = 'Executável linear (OS/2/VxD). Não executa no navegador; use a Inspeção.';
          return info;
        }
      }
      info.format = 'mz-dos'; info.kind = 'dos'; info.arch = 'x86 16-bit (8086)';
      info.runnable = 'dos';
      info.note = 'Executável DOS real (cabeçalho MZ sem PE). Pode rodar no emulador DOS embutido.';
      return info;
    }
    if (bytes.length >= 4 && bytes[0] === 0x7f && bytes[1] === 0x45 && bytes[2] === 0x4c && bytes[3] === 0x46) {
      info.format = 'elf'; info.kind = 'linux';
      info.note = 'Binário Linux (ELF). Não executa no navegador; use a Inspeção.';
      return info;
    }
    if (bytes.length >= 4 && bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) {
      info.format = 'msi-ole'; info.kind = 'installer';
      info.note = 'Pacote/instalador (OLE). Instaladores não executam no navegador; use a Inspeção.';
      return info;
    }
    if (bytes.length >= 4 && ((bytes[0] === 0xcf && bytes[1] === 0xfa) || (bytes[0] === 0xfa && bytes[1] === 0xcf) || (bytes[0] === 0xca && bytes[1] === 0xfe))) {
      info.format = 'macho'; info.kind = 'macos';
      info.note = 'Binário macOS (Mach-O). Não executa no navegador; use a Inspeção.';
      return info;
    }
    if (ext === 'bat' || ext === 'cmd') {
      info.format = 'batch'; info.kind = 'dos-text'; info.arch = 'interpretado (COMMAND.COM)';
      info.runnable = 'dos';
      info.note = 'Script em lote. Pode rodar no emulador DOS embutido.';
      return info;
    }
    if (ext === 'com') {
      info.format = 'dos-com'; info.kind = 'dos'; info.arch = 'x86 16-bit (8086)';
      info.runnable = 'dos';
      info.note = 'Executável DOS (.COM, sem cabeçalho). Pode rodar no emulador DOS embutido.';
      return info;
    }
    info.note = 'Formato não reconhecido como executável suportado.';
    return info;
  }

  function rvaToRaw(sections, rva) {
    for (const s of sections) {
      const span = Math.max(s.vsize, s.rawsize);
      if (rva >= s.vaddr && rva < s.vaddr + span) {
        const raw = s.rawptr + (rva - s.vaddr);
        return raw;
      }
    }
    return -1;
  }

  // ---------- inspeção PE ----------
  function analyzePE(bytes, info) {
    const out = { fields: [], sections: [], imports: [], warnings: [] };
    let peOff = u32(bytes, 0x3c);
    const machine = u16(bytes, peOff + 4);
    const nsec = Math.min(u16(bytes, peOff + 6), 96);
    const timestamp = u32(bytes, peOff + 8);
    const characteristics = u16(bytes, peOff + 22);
    const optOff = peOff + 24;
    const is64 = info.is64;
    const entry = bytes.length > optOff + 20 ? u32(bytes, optOff + 16) : 0;
    let imageBase = '—';
    try {
      if (is64 && bytes.length > optOff + 32) {
        const lo = u32(bytes, optOff + 24), hi = u32(bytes, optOff + 28);
        imageBase = `0x${hi.toString(16)}${lo.toString(16).padStart(8, '0')}`;
      } else if (bytes.length > optOff + 32) {
        imageBase = `0x${u32(bytes, optOff + 28).toString(16)}`;
      }
    } catch { /* mantém — */ }
    const flags = [];
    if (characteristics & 0x0002) flags.push('executável');
    if (characteristics & 0x2000) flags.push('DLL');
    if (characteristics & 0x0100) flags.push('32-bit');
    if (characteristics & 0x0020) flags.push('large-address-aware');
    let date = '—';
    try { if (timestamp) date = new Date(timestamp * 1000).toLocaleString('pt-BR'); } catch { /* — */ }
    out.fields = [
      ['Formato', info.is64 ? 'PE32+ (64-bit)' : 'PE32 (32-bit)'],
      ['Arquitetura', info.arch],
      ['Subsistema', info.subsystem],
      ['Ponto de entrada', `RVA 0x${entry.toString(16)}`],
      ['Base da imagem', imageBase],
      ['Seções', String(nsec)],
      ['Compilado em', date],
      ['Atributos', flags.join(', ') || `0x${characteristics.toString(16)}`]
    ];
    // seções
    const secOff = optOff + (is64 ? 240 : 224);
    const sections = [];
    for (let i = 0; i < nsec; i++) {
      const o = secOff + i * 40;
      if (o + 40 > bytes.length) { out.warnings.push(`Tabela de seções truncada em ${i}/${nsec}.`); break; }
      let sname = '';
      for (let k = 0; k < 8; k++) { const c = bytes[o + k]; if (c === 0) break; sname += String.fromCharCode(c); }
      sections.push({
        name: sname || `.sec${i}`,
        vsize: u32(bytes, o + 8), vaddr: u32(bytes, o + 12),
        rawsize: u32(bytes, o + 16), rawptr: u32(bytes, o + 20)
      });
    }
    out.sections = sections;
    // imports (DLLs)
    try {
      const rvaCountOff = optOff + (is64 ? 108 : 92);
      if (bytes.length > rvaCountOff + 4) {
        const dirsOff = rvaCountOff + 4 + 8; // diretório #1 = imports
        if (bytes.length > dirsOff + 8) {
          const impRva = u32(bytes, dirsOff), impSize = u32(bytes, dirsOff + 4);
          if (impRva && impSize) {
            const impRaw = rvaToRaw(sections, impRva);
            if (impRaw >= 0) {
              for (let i = 0; i < 64; i++) {
                const e = impRaw + i * 20;
                if (e + 20 > bytes.length) break;
                const nameRva = u32(bytes, e + 12);
                const ilt = u32(bytes, e), iat = u32(bytes, e + 16);
                if (!nameRva && !ilt && !iat) break;
                if (!nameRva) continue;
                const nRaw = rvaToRaw(sections, nameRva);
                if (nRaw < 0) continue;
                const dll = cstr(bytes, nRaw, 128);
                if (dll) out.imports.push(dll);
                if (out.imports.length >= 48) break;
              }
            } else {
              out.warnings.push('Diretório de imports fora das seções mapeadas.');
            }
          } else {
            out.warnings.push('Binário sem tabela de imports (estático ou empacotado).');
          }
        }
      }
    } catch {
      out.warnings.push('Falha ao ler imports.');
    }
    return out;
  }

  function extractStrings(bytes, limit) {
    const cap = Math.min(bytes.length, 2 * 1024 * 1024);
    let text = '';
    const CHUNK = 65536;
    for (let o = 0; o < cap; o += CHUNK) {
      const end = Math.min(cap, o + CHUNK);
      let part = '';
      for (let i = o; i < end; i++) {
        const c = bytes[i];
        part += (c >= 32 && c < 127) || c === 10 || c === 13 ? String.fromCharCode(c) : '\n';
      }
      text += part;
    }
    const found = text.match(/[ -~]{5,}/g) || [];
    const interesting = found.filter((s) => /dll$|\.exe$|http|:\\|this program|error|fail|version|copyright|warning|kernel|system/i.test(s));
    const uniq = [...new Set(interesting)].slice(0, limit || 60);
    return { total: found.length, sample: uniq };
  }

  function analyze(input, name) {
    const bytes = input instanceof Uint8Array ? input : new Uint8Array(input || []);
    const info = detect(bytes, name);
    const report = { ...info, fields: [], sections: [], imports: [], strings: { total: 0, sample: [] }, warnings: [] };
    if (info.format === 'pe32' || info.format === 'pe64') {
      Object.assign(report, analyzePE(bytes, info));
    } else if (info.format === 'mz-dos' || info.format === 'dos-com') {
      report.fields = [
        ['Formato', info.format === 'mz-dos' ? 'MZ-DOS (16-bit)' : 'COM (16-bit)'],
        ['Arquitetura', 'x86 16-bit (8086)'],
        ['Execução', 'Suportada no emulador DOS embutido']
      ];
      if (info.format === 'mz-dos' && bytes.length >= 0x20) {
        try {
          const pages = u16(bytes, 4), lastBytes = u16(bytes, 2), relocs = u16(bytes, 6);
          report.fields.push(['Páginas (cabeçalho MZ)', String(pages)]);
          report.fields.push(['Relocações', String(relocs)]);
          report.fields.push(['Bytes na última página', String(lastBytes)]);
        } catch { /* — */ }
      }
    } else if (info.format === 'batch') {
      let text = '';
      try { text = new TextDecoder().decode(bytes.slice(0, 65536)); } catch { text = ''; }
      const lines = text.split(/\r?\n/);
      report.fields = [
        ['Formato', 'Script em lote (.bat/.cmd)'],
        ['Linhas (prévia)', String(lines.length)],
        ['Execução', 'Suportada no emulador DOS embutido']
      ];
      report.strings = { total: lines.length, sample: lines.filter((l) => l.trim()).slice(0, 20) };
      return report;
    } else {
      report.fields = [
        ['Formato', info.format.toUpperCase()],
        ['Observação', info.note || '—']
      ];
    }
    if (report.format !== 'batch') {
      try { report.strings = extractStrings(bytes, 60); }
      catch { report.strings = { total: 0, sample: [] }; }
    }
    return report;
  }

  // ---------- CRC32 + ZIP stored (para montar o disco do DOS) ----------
  const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(data) {
    let c = 0xffffffff;
    for (let i = 0; i < data.length; i++) c = CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function toDosName(filename) {
    const clean = String(filename || 'programa.exe').toUpperCase().replace(/[^A-Z0-9._-]/g, '_');
    const dot = clean.lastIndexOf('.');
    const stem = (dot > 0 ? clean.slice(0, dot) : clean).replace(/\./g, '_').slice(0, 8) || 'PROGRAMA';
    const ext = (dot > 0 ? clean.slice(dot + 1) : '').replace(/\./g, '').slice(0, 3);
    return ext ? `${stem}.${ext}` : stem;
  }
  function buildStoredZip(entryName, data) {
    const nameB = new TextEncoder().encode(entryName);
    const crc = crc32(data);
    const lhLen = 30 + nameB.length;
    const cdLen = 46 + nameB.length;
    const out = new Uint8Array(lhLen + data.length + cdLen + 22);
    const dv = new DataView(out.buffer);
    let o = 0;
    const w16 = (v) => { dv.setUint16(o, v, true); o += 2; };
    const w32 = (v) => { dv.setUint32(o, v >>> 0, true); o += 4; };
    w32(0x04034b50); w16(20); w16(0); w16(0); w16(0x21); w16(0x21);
    w32(crc); w32(data.length); w32(data.length); w16(nameB.length); w16(0);
    out.set(nameB, o); o += nameB.length;
    out.set(data, o); o += data.length;
    const cdOff = o;
    w32(0x02014b50); w16(20); w16(20); w16(0); w16(0); w16(0x21); w16(0x21);
    w32(crc); w32(data.length); w32(data.length); w16(nameB.length);
    w16(0); w16(0); w16(0); w16(0); w32(0x20); w32(0);
    out.set(nameB, o); o += nameB.length;
    w32(0x06054b50); w16(0); w16(0); w16(1); w16(1); w32(cdLen); w32(cdOff); w16(0);
    return out;
  }

  // ---------- motor DOS (js-dos / DOSBox, carregado sob demanda) ----------
  let dosPromise = null;
  let engineStatus = 'not-loaded';
  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url;
      s.async = true;
      s.onload = () => {
        engineStatus = 'loading';
        resolve(true);
      };
      s.onerror = () => {
        engineStatus = 'error';
        reject(new Error('falha ao baixar o motor'));
      };
      document.head.appendChild(s);
      setTimeout(() => {
        if (engineStatus !== 'loaded') {
          engineStatus = 'timeout';
          reject(new Error('tempo esgotado para carregar o motor'));
        }
      }, 45000);
    });
  }
  function ensureEngine() {
    if (window.Dos) {
      engineStatus = 'loaded';
      return Promise.resolve(true);
    }
    if (!dosPromise) {
      dosPromise = loadScript(DOS_CDN)
        .then(() => {
          engineStatus = 'loaded';
          return !!window.Dos
        })
        .catch(() => {
          engineStatus = 'error';
          return false;
        });
    }
    return dosPromise;
  }
  function runDos(canvas, bytes, filename) {
    return ensureEngine().then((ok) => {
      if (!ok || typeof window.Dos !== 'function') {
        throw new Error('Motor DOS indisponível. Verifique a internet (CDN js-dos) e tente de novo.');
      }
      if (bytes.length > MAX_RUN_BYTES) {
        throw new Error(`Arquivo grande demais para o emulador (${(bytes.length / 1048576).toFixed(1)} MB > 8 MB).`);
      }
      const dosName = toDosName(filename);
      const zip = buildStoredZip(dosName, bytes);
      const url = URL.createObjectURL(new Blob([zip.buffer], { type: 'application/zip' }));
      return new Promise((resolve, reject) => {
        try {
          window.Dos(canvas).ready((fs, main) => {
            fs.extract(url)
              .then(() => main(['-c', dosName]).then(resolve).catch(reject))
              .catch(reject);
          });
        } catch (e) { reject(e); }
      });
    });
  }
  function engineStatusGet() {
    return { status: engineStatus, engine: window.Dos ? 'js-dos (DOSBox)' : 'não carregado' };
  }

  // ---------- varredura de pastas sincronizadas ----------
  async function scanFolder(dirHandle, options) {
    const max = (options && options.max) || 200;
    const sliceKb = (options && options.sliceKb) || 1024;
    const out = [];
    for await (const [name, handle] of dirHandle.entries()) {
      if (handle.kind !== 'file') continue;
      if (!/\.(exe|com|bat|cmd|msi)$/i.test(name)) continue;
      try {
        const file = await handle.getFile();
        const part = file.slice(0, sliceKb * 1024);
        const buf = new Uint8Array(await part.arrayBuffer());
        const d = detect(buf, name);
        out.push({ name, handle, size: file.size, format: d.format, kind: d.kind, runnable: d.runnable, arch: d.arch });
      } catch {
        out.push({ name, handle, size: -1, format: 'unreadable', kind: 'unknown', runnable: 'no', arch: '—' });
      }
      if (out.length >= max) break;
    }
    return out;
  }

  function sliceForAnalysis(file) {
    const blob = file.size > SLICE_BYTES ? file.slice(0, SLICE_BYTES) : file;
    return blob.arrayBuffer().then((ab) => ({
      bytes: new Uint8Array(ab),
      truncated: file.size > SLICE_BYTES,
      fullSize: file.size
    }));
  }

  function status() {
    const kernel = window.VessieOS && window.VessieOS.kernel;
    return {
      registered: !!(kernel && kernel.getModule && kernel.getModule('emulation')),
      engine: window.Dos ? 'js-dos (DOSBox)' : 'não carregado (sob demanda)',
      sliceCapMb: SLICE_BYTES / 1048576,
      runCapMb: MAX_RUN_BYTES / 1048576
    };
  }

  // ================================================================
  // HARDWARE VIRTUAL — máquina PC/AT emulada (CPU/RAM/VGA/FDD/RTC/speaker)
  // + BIOS VessieBIOS com POST, Setup e sequência de boot reais.
  // O DOSBox (js-dos) continua sendo o backend de execução da CPU;
  // esta camada é o "ferro": POST na VGA texto 80x25, beep, CMOS,
  // portas de E/S com log e ordem de boot configurável.
  // ================================================================
  const BIOS_VERSION = 'VessieBIOS v1.0';
  const BIOS_SETUP_KEY = 'vessie_bios_setup';

  const PROFILES = {
    xt: { id: 'xt', label: 'PC-XT · 8086 4.77MHz', cpu: 'Intel 8086 @ 4.77MHz', ramKb: 640, cycles: '800' },
    at: { id: 'at', label: 'PC-AT · 80286 8MHz', cpu: 'Intel 80286 @ 8MHz', ramKb: 1024, cycles: '2000' },
    pentium: { id: 'pentium', label: 'Pentium · 100MHz', cpu: 'Intel Pentium @ 100MHz', ramKb: 16384, cycles: 'max' }
  };

  const POST_CODES = {
    0x01: 'Teste da CPU', 0x03: 'Teste de memória', 0x0d: 'Detecção VGA',
    0x2e: 'Detecção FDD', 0x31: 'Detecção HDD', 0x38: 'Leitura RTC/CMOS',
    0x3c: 'Teste do alto-falante', 0x70: 'Setup / boot order',
    0xff: 'Entrega ao boot'
  };

  const CGA = ['#000000', '#0000aa', '#00aa00', '#00aaaa', '#aa0000', '#aa00aa', '#aa5500', '#aaaaaa',
    '#555555', '#5555ff', '#55ff55', '#55ffff', '#ff5555', '#ff55ff', '#ffff55', '#ffffff'];

  function loadBiosSetup() {
    try {
      const raw = localStorage.getItem(BIOS_SETUP_KEY);
      if (raw) return { bootOrder: 'fdd', speaker: true, fastPost: false, ...JSON.parse(raw) };
    } catch { /* sem storage */ }
    return { bootOrder: 'fdd', speaker: true, fastPost: false };
  }
  function saveBiosSetup(setup) {
    try { localStorage.setItem(BIOS_SETUP_KEY, JSON.stringify(setup)); } catch { /* ignore */ }
  }

  function createVGA() {
    const COLS = 80, ROWS = 25;
    const cells = new Uint16Array(COLS * ROWS);
    function clear(attr) {
      const a = ((attr === undefined ? 0x07 : attr) << 8) | 0x20;
      for (let i = 0; i < cells.length; i++) cells[i] = a;
    }
    function write(row, col, text, attr) {
      const a = (attr === undefined ? 0x07 : attr) & 0xff;
      const s = String(text ?? '');
      for (let i = 0; i < s.length; i++) {
        const c = col + i;
        if (c < 0 || c >= COLS || row < 0 || row >= ROWS) continue;
        cells[row * COLS + c] = (a << 8) | (s.charCodeAt(i) & 0xff);
      }
    }
    function render(canvas) {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      let adv = 9;
      try { adv = Math.max(7, Math.ceil(ctx.measureText('M').width) || 9); } catch { adv = 9; }
      canvas.width = COLS * adv;
      canvas.height = ROWS * 16;
      ctx.font = '16px "Courier New", monospace';
      ctx.textBaseline = 'top';
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const cell = cells[r * COLS + c];
          const ch = cell & 0xff, attr = (cell >> 8) & 0xff;
          ctx.fillStyle = CGA[(attr >> 4) & 0x07];
          ctx.fillRect(c * adv, r * 16, adv, 16);
          if (ch !== 0x20) {
            ctx.fillStyle = CGA[attr & 0x0f];
            ctx.fillText(String.fromCharCode(ch), c * adv, r * 16);
          }
        }
      }
    }
    clear();
    return { COLS, ROWS, cells, clear, write, render };
  }

  function createMachine(profileId, opts) {
    const options = opts || {};
    const profile = PROFILES[profileId] || PROFILES.xt;
    const setup = { ...loadBiosSetup(), ...(options.setup || {}) };
    const logBuf = [];
    const subs = new Set();
    const delay = (ms) => new Promise((r) => setTimeout(r, options.fast ? 0 : ms));

    function log(level, msg, src) {
      const entry = { t: new Date(), level, msg: String(msg), src: src || 'HW' };
      logBuf.push(entry);
      if (logBuf.length > 1000) logBuf.shift();
      subs.forEach((f) => { try { f(entry); } catch { /* ignore */ } });
      return entry;
    }
    const onLog = (fn) => { subs.add(fn); return () => subs.delete(fn); };

    const regs = { AX: 0, BX: 0, CX: 0, DX: 0, SI: 0, DI: 0, BP: 0, SP: 0, CS: 0, DS: 0, ES: 0, SS: 0, IP: 0, FLAGS: 0x0202 };
    const ram = new Uint8Array(Math.max(64, profile.ramKb) * 1024);
    const vga = createVGA();
    const ports = new Map();
    let cycles = 0;

    function postCode(code) {
      ports.set(0x80, code);
      const label = POST_CODES[code] || `código 0x${code.toString(16)}`;
      log('porta', `POST 0x${code.toString(16).padStart(2, '0')} — ${label}`, 'POST');
    }
    function outb(port, value) {
      ports.set(port, value & 0xff);
      cycles++;
      if (port === 0x80) return;
      if (options.tracePorts) log('porta', `OUT 0x${port.toString(16)} <- 0x${(value & 0xff).toString(16)}`, 'IO');
    }
    function inb(port) {
      cycles++;
      if (port === 0x80) return ports.get(0x80) || 0;
      const v = ports.get(port);
      if (options.tracePorts) log('porta', `IN  0x${port.toString(16)} -> 0x${((v || 0) & 0xff).toString(16)}`, 'IO');
      return (v === undefined ? 0xff : v) & 0xff;
    }

    const devices = [
      { id: 'cpu', label: 'CPU', detail: profile.cpu, enabled: true, fixed: true },
      { id: 'ram', label: 'RAM', detail: profile.ramKb >= 1024 ? `${profile.ramKb / 1024} MB` : `${profile.ramKb} KB`, enabled: true, fixed: true },
      { id: 'vga', label: 'VGA', detail: 'texto 80x25', enabled: true, fixed: true },
      { id: 'fdd', label: 'FDD 0 (disquete)', detail: 'vazio', enabled: true, toggle: true },
      { id: 'hdd', label: 'HDD 0 (disco rígido)', detail: 'não montado', enabled: false, fixed: true },
      { id: 'spk', label: 'PC Speaker', detail: 'beep de POST', enabled: setup.speaker !== false, toggle: true },
      { id: 'rtc', label: 'RTC/CMOS', detail: 'relógio do navegador', enabled: true, fixed: true }
    ];
    function setDevice(id, enabled) {
      const dev = devices.find((d) => d.id === id);
      if (!dev || dev.fixed) return false;
      dev.enabled = !!enabled;
      if (id === 'spk') { setup.speaker = !!enabled; saveBiosSetup(setup); }
      log('info', `${dev.label} ${dev.enabled ? 'ativado' : 'desativado'}.`, 'SETUP');
      return true;
    }
    function mountFloppy(name) {
      const dev = devices.find((d) => d.id === 'fdd');
      if (dev) dev.detail = name || 'imagem montada';
    }

    function beep() {
      const dev = devices.find((d) => d.id === 'spk');
      if (!dev || !dev.enabled) return;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        const ctx = beep._ctx || (beep._ctx = new AC());
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.16);
      } catch { /* áudio indisponível */ }
    }

    function waitKey(isAlive, timeoutMs) {
      return new Promise((resolve) => {
        let done = false;
        let aliveTimer = null;
        const finish = (value) => {
          if (done) return;
          done = true;
          if (aliveTimer) clearInterval(aliveTimer);
          document.removeEventListener('keydown', onKey, true);
          resolve(value);
        };
        const onKey = (e) => {
          if (isAlive && !isAlive()) return finish(null);
          e.preventDefault();
          finish(e.key);
        };
        document.addEventListener('keydown', onKey, true);
        if (timeoutMs) setTimeout(() => finish(null), timeoutMs);
        // Se a janela morrer no meio da espera (ex.: halt com Emulador
        // fechado), resolve em vez de vazar promise + listener.
        if (typeof isAlive === 'function') {
          aliveTimer = setInterval(() => { if (!isAlive()) finish(null); }, 150);
        }
      });
    }

    async function runPost(canvas, programName, isAlive) {
      const fast = setup.fastPost || options.fast;
      vga.clear();
      vga.write(0, 0, `${BIOS_VERSION} - Verificacao do sistema`, 0x1f);
      vga.write(2, 0, `CPU: ${profile.cpu}`, 0x07);
      vga.render(canvas);
      postCode(0x01);
      await delay(fast ? 30 : 350);
      // contagem de memória
      postCode(0x03);
      const steps = fast ? [profile.ramKb] : [64, 128, 256, 512, profile.ramKb].filter((v, i, a) => v <= profile.ramKb && a.indexOf(v) === i);
      for (const kb of steps) {
        vga.write(3, 0, `Memoria: ${String(kb).padStart(5, ' ')}K OK   `, 0x07);
        vga.render(canvas);
        await delay(fast ? 20 : 160);
      }
      vga.write(5, 0, 'Detectando VGA ............ OK (texto 80x25)', 0x07);
      vga.render(canvas);
      postCode(0x0d);
      await delay(fast ? 20 : 250);
      const fdd = devices.find((d) => d.id === 'fdd');
      vga.write(6, 0, `FDD 0 ................... ${fdd && fdd.enabled ? 'OK (' + (programName || 'disco') + ')' : 'DESATIVADO'}`, 0x07);
      vga.render(canvas);
      postCode(0x2e);
      await delay(fast ? 20 : 250);
      vga.write(7, 0, 'HDD 0 ................... AUSENTE', 0x07);
      vga.render(canvas);
      postCode(0x31);
      await delay(fast ? 20 : 250);
      let rtc = '';
      try { rtc = new Date().toLocaleString('pt-BR'); } catch { rtc = ''; }
      vga.write(8, 0, `RTC ..................... OK (${rtc})`, 0x07);
      vga.render(canvas);
      postCode(0x38);
      await delay(fast ? 20 : 250);
      postCode(0x3c);
      beep();
      vga.write(10, 0, '1 beep: sistema OK', 0x0a);
      // janela do DEL
      const delMs = options.delMs === undefined ? 2500 : options.delMs;
      vga.write(12, 0, 'Pressione DEL para Setup...', 0x1e);
      vga.render(canvas);
      const key = await waitKey(isAlive, fast ? 400 : delMs);
      if (key === 'Delete' || key === 'Del') {
        log('info', 'DEL pressionado: entrando no Setup.', 'BIOS');
        return enterSetup(canvas, isAlive);
      }
      return { action: 'boot' };
    }

    async function enterSetup(canvas, isAlive) {
      postCode(0x70);
      const rows = [
        { id: 'boot', label: 'Ordem de boot', values: ['FDD,HDD', 'HDD,FDD'], value: setup.bootOrder === 'hdd' ? 'HDD,FDD' : 'FDD,HDD' },
        { id: 'speaker', label: 'Alto-falante (POST)', values: ['ON', 'OFF'], value: setup.speaker === false ? 'OFF' : 'ON' },
        { id: 'fast', label: 'POST rapido', values: ['OFF', 'ON'], value: setup.fastPost ? 'ON' : 'OFF' }
      ];
      let sel = 0;
      const draw = () => {
        vga.clear();
        vga.write(0, 0, `${BIOS_VERSION} Setup`, 0x1f);
        vga.write(2, 0, 'Use setas + Enter. F10 salva e sai. Esc sai sem salvar.', 0x07);
        rows.forEach((row, i) => {
          const mark = i === sel ? 0x70 : 0x07;
          vga.write(4 + i, 2, `${i === sel ? '>' : ' '} ${row.label}: <${row.value}>`, mark);
        });
        vga.write(9, 2, `Perfil: ${profile.label}`, 0x07);
        vga.write(10, 2, `RAM: ${profile.ramKb}K  CPU: ${profile.cpu}`, 0x07);
        vga.render(canvas);
      };
      draw();
      for (;;) {
        const key = await waitKey(isAlive, 0);
        if (key === null) return { action: 'boot', saved: false };
        if (key === 'ArrowUp' || key === 'ArrowDown') {
          sel = (sel + (key === 'ArrowDown' ? 1 : rows.length - 1)) % rows.length;
          draw();
        } else if (key === 'Enter' || key === ' ' || key === 'ArrowLeft' || key === 'ArrowRight') {
          const row = rows[sel];
          const dir = (key === 'ArrowLeft') ? -1 : 1;
          row.value = row.values[(row.values.indexOf(row.value) + dir + row.values.length) % row.values.length];
          draw();
        } else if (key === 'F10') {
          setup.bootOrder = rows[0].value === 'HDD,FDD' ? 'hdd' : 'fdd';
          setup.speaker = rows[1].value === 'ON';
          setup.fastPost = rows[2].value === 'ON';
          saveBiosSetup(setup);
          const spk = devices.find((d) => d.id === 'spk');
          if (spk) spk.enabled = setup.speaker;
          log('ok', `Setup salvo: boot=${rows[0].value} speaker=${rows[1].value} fast=${rows[2].value}.`, 'BIOS');
          return { action: 'boot', saved: true };
        } else if (key === 'Escape') {
          log('info', 'Setup descartado (Esc).', 'BIOS');
          return { action: 'boot', saved: false };
        }
      }
    }

    async function powerOn(canvas, starter, programName, isAlive) {
      const alive = typeof isAlive === 'function' ? isAlive : () => true;
      log('info', `${BIOS_VERSION} ligado (${profile.label}, ${profile.ramKb}K RAM).`, 'BIOS');
      const next = await runPost(canvas, programName, alive);
      if (!alive()) return { booted: false };
      if (next && next.action !== 'boot') return { booted: false };
      const order = setup.bootOrder === 'hdd' ? ['hdd', 'fdd'] : ['fdd', 'hdd'];
      postCode(0xff);
      for (const dev of order) {
        if (dev === 'fdd') {
          const fdd = devices.find((d) => d.id === 'fdd');
          if (!fdd || !fdd.enabled) { log('aviso', 'FDD desativado: pulando.', 'BIOS'); continue; }
          if (!starter) { log('erro', 'Sem imagem de boot no FDD.', 'BIOS'); continue; }
          vga.write(14, 0, 'Iniciando de FDD...', 0x0e);
          vga.render(canvas);
          log('ok', 'Boot pelo FDD: entregando ao motor DOS.', 'BIOS');
          await starter();
          return { booted: true, via: 'fdd' };
        }
        // HDD nunca tem imagem montada nesta versão: comportamento real de BIOS.
        vga.clear();
        vga.write(10, 10, 'Sem sistema operacional no disco rigido.', 0x0c);
        vga.write(12, 10, 'Pressione qualquer tecla para reiniciar...', 0x07);
        vga.render(canvas);
        log('erro', 'Boot pelo HDD: disco sem sistema. Aguardando tecla.', 'BIOS');
        await waitKey(alive, 0);
        if (!alive()) return { booted: false };
        return powerOn(canvas, starter, programName, isAlive);
      }
      vga.clear();
      vga.write(10, 10, 'Sem dispositivo inicializavel.', 0x0c);
      vga.render(canvas);
      log('erro', 'Nenhum dispositivo inicializável.', 'BIOS');
      return { booted: false };
    }

    return {
      profile, profileId: profile.id, regs, ram, vga, ports, devices,
      log, logs: logBuf, onLog, inb, outb, postCode,
      setDevice, mountFloppy, beep, powerOn, enterSetup,
      getSetup: () => ({ ...setup }),
      status: () => ({
        power: true, profile: profile.label, ramKb: profile.ramKb,
        cycles, logSize: logBuf.length,
        devices: devices.map((d) => ({ id: d.id, enabled: d.enabled }))
      })
    };
  }

  const api = {
    BIOS_VERSION, PROFILES, POST_CODES,
    loadBiosSetup, saveBiosSetup, createMachine, createVGA,
    SLICE_BYTES, MAX_RUN_BYTES,
    detect, analyze, extractStrings,
    toDosName, buildStoredZip,
    ensureEngine, runDos,
    scanFolder, sliceForAnalysis, status
  };

  function register() {
    try {
      const kernel = window.VessieOS && window.VessieOS.kernel;
      if (kernel) {
        if (typeof kernel.registerModule === 'function') kernel.registerModule('emulation', api);
        if (typeof kernel.registerService === 'function') kernel.registerService('emulation', api);
        if (typeof kernel.log === 'function') kernel.log('info', 'Módulo de emulação registrado (MZ/PE/DOS).', 'Emulation');
      }
    } catch { /* kernel ainda indisponível; a API global segue válida */ }
  }

  window.VessieEmulator = api;

  register();
  document.addEventListener('DOMContentLoaded', register);
  setTimeout(register, 3000);
})();

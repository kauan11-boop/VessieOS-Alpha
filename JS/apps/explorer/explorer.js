// explorer.js — extraído de JS/core/main.js (VessieOS)
// Depende de utilitários globais do kernel: S, VFS, toast, createWin, persistState, etc. (expostos em main.js)
(function () {
  "use strict";

const FILE_TYPES = {
    vl: { label: 'Script VessieLang', icon: 'fa-terminal', color: '#a78bfa', kind: 'vl' },
    html: { label: 'Documento HTML', icon: 'fa-file-code', color: '#e34c26', kind: 'html' },
    htm: { label: 'Documento HTML', icon: 'fa-file-code', color: '#e34c26', kind: 'html' },
    txt: { label: 'Documento de Texto', icon: 'fa-file-alt', color: '#7eb6ff', kind: 'text' },
    md: { label: 'Markdown', icon: 'fa-file-alt', color: '#7eb6ff', kind: 'text' },
    json: { label: 'Arquivo JSON', icon: 'fa-file-code', color: '#f1c40f', kind: 'text' },
    js: { label: 'Script JavaScript', icon: 'fa-file-code', color: '#f0db4f', kind: 'text' },
    css: { label: 'Folha de Estilo', icon: 'fa-file-code', color: '#2965f1', kind: 'text' },
    png: { label: 'Imagem PNG', icon: 'fa-file-image', color: '#a3e635', kind: 'image' },
    jpg: { label: 'Imagem JPEG', icon: 'fa-file-image', color: '#a3e635', kind: 'image' },
    jpeg: { label: 'Imagem JPEG', icon: 'fa-file-image', color: '#a3e635', kind: 'image' },
    gif: { label: 'Imagem GIF', icon: 'fa-file-image', color: '#a3e635', kind: 'image' },
    webp: { label: 'Imagem WebP', icon: 'fa-file-image', color: '#a3e635', kind: 'image' },
    mp4: { label: 'Vídeo MP4', icon: 'fa-file-video', color: '#fb7185', kind: 'video' },
    webm: { label: 'Vídeo WebM', icon: 'fa-file-video', color: '#fb7185', kind: 'video' },
    mp3: { label: 'Áudio MP3', icon: 'fa-file-audio', color: '#fbbf24', kind: 'audio' },
    wav: { label: 'Áudio WAV', icon: 'fa-file-audio', color: '#fbbf24', kind: 'audio' },
    exe: { label: 'Aplicativo Windows', icon: 'fa-cog', color: '#60a5fa', kind: 'exe' },
    com: { label: 'Executável DOS', icon: 'fa-cog', color: '#34d399', kind: 'exe' },
    bat: { label: 'Script em lote', icon: 'fa-terminal', color: '#34d399', kind: 'exe' },
    cmd: { label: 'Script em lote', icon: 'fa-terminal', color: '#34d399', kind: 'exe' },
    msi: { label: 'Instalador Windows', icon: 'fa-box', color: '#fbbf24', kind: 'exe' },
    default: { label: 'Documento', icon: 'fa-file-alt', color: '#7eb6ff', kind: 'text' }
  };

function feEscapeHtml(value) {
    return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

function buildLocalContextReport(path, content) {
    const text = String(content || '');
    const imports = [...text.matchAll(/(?:import\s+(?:[^'"]+?\s+from\s+)?|require\s*\()\s*['"]([^'"]+)['"]/g)]
      .map((match) => match[1])
      .filter((value, index, all) => all.indexOf(value) === index)
      .slice(0, 40);
    return {
      generatedBy: 'VessieOS local report (no AI)',
      path,
      extension: path.split('.').pop()?.toLowerCase() || '',
      characters: text.length,
      lines: text.split(/\r\n|\r|\n/).length,
      imports,
      editable: text.length <= 150000,
      note: 'Only the selected VessieOS file or folder context is included; no other local files are scanned.'
    };
  }

function getFileType(name) { const ext = VFS.getExt(name); return FILE_TYPES[ext] || FILE_TYPES.default; }

function userQuickAccess() {
  const u = (typeof VFS !== 'undefined' && VFS && typeof VFS.user === 'function') ? VFS.user() : (S.user || 'Usuário');
  const base = 'C:/Usuários/' + u;
  return [
    { path: base + '/Área de Trabalho', label: 'Área de Trabalho', icon: 'fa-desktop' },
    { path: base + '/Documentos', label: 'Documentos', icon: 'fa-file-alt' },
    { path: base + '/Downloads', label: 'Downloads', icon: 'fa-download' },
    { path: base + '/Imagens', label: 'Imagens', icon: 'fa-images' },
    { path: base + '/Música', label: 'Música', icon: 'fa-music' },
    { path: base + '/Vídeos', label: 'Vídeos', icon: 'fa-film' }
  ];
}

function pcDriveList() {
  const names = (typeof VFS !== 'undefined' && VFS) ? (VFS.list('C:') || []) : [];
  return names.map((k) => ({ path: 'C:/' + k, label: k }));
}

function quickAccessHtml() {
  return userQuickAccess()
    .filter((q) => { try { return VFS.exists(q.path); } catch (_) { return true; } })
    .map((q) => `<div class="fld" data-dir="${q.path}"><i class="fas ${q.icon}"></i> ${q.label}</div>`).join('');
}

function pcListHtml() {
  return pcDriveList()
    .map((d) => {
      const locked = (typeof VFS !== 'undefined' && VFS && typeof VFS.isLocked === 'function') ? VFS.isLocked('C:/' + d.label) : false;
      const icon = d.label === 'Windows' ? 'fa-lock' : (d.label === 'Usuários' ? 'fa-users' : 'fa-hdd');
      return `<div class="fld fld-sub" data-dir="${d.path}"><i class="fas ${icon}"></i> ${d.label === 'Windows' && locked ? 'Windows 🔒' : d.label}</div>`;
    }).join('');
}

const QUICK_ACCESS = null; // legado: usar userQuickAccess() (caminhos por usuário)

const remoteDevices = new Map();
// Visível para o Emulador (Central de Compatibilidade) e outros sistemas.
window.VessieRemoteDevices = remoteDevices;
let remoteBackupTarget = null;
let remoteBackupTimer = null;
let remoteBackupLastPayload = '';

function feFormatSize(bytes) {
    if (bytes === null || bytes === undefined) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

function feFormatDate(iso) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleString('pt-BR'); } catch { return '—'; }
  }

function openExplorer() {
    try { if (typeof window.ensureUserDirs === 'function') window.ensureUserDirs(false); } catch (_) { /* ignore */ }
    const feData = {
      quickAccess: quickAccessHtml(),
      fsList: pcListHtml()
    };
    const feFallback = `
    <div class="fexp">
      <div class="fesb">
        <div class="fesb-title">Acesso rápido</div>
        ${quickAccessHtml()}
        <div class="fesb-title fesb-pc-toggle" data-toggle="pc"><i class="fas fa-chevron-down chev"></i> Este Computador</div>
        <div class="fesb-pc-list">
          <div class="fld fld-drive" data-dir=""><i class="fas fa-hdd"></i> Este Computador</div>
          <div class="fld fld-drive" data-dir="C:"><i class="fas fa-hdd"></i> Disco Local (C:)</div>
          ${pcListHtml()}
        </div>
        <div class="fesb-title"><i class="fas fa-star" style="color:#f1c40f"></i> Favoritos</div>
        <div class="fe-favs" data-fe-favs></div>
        <div class="fesb-title fesb-remote-title"><span><i class="fas fa-plug"></i> Remote Device</span><span class="remote-device-count" data-remote-count></span></div>
        <div class="remote-device-list" data-remote-list></div>
        <small class="remote-device-note">Acesso limitado à pasta escolhida. Nada fora dela é lido, movido ou formatado.</small>
        <button class="fld fld-remote-connect" type="button" data-cmd="mountdevice">
          <i class="fas fa-folder-open"></i> Selecionar pasta...
        </button>
      </div>
      <div class="fem">
        <div class="fe-tb">
          <button class="fe-tbtn" data-cmd="back" title="Pasta acima"><i class="fas fa-arrow-left"></i></button>
          <button class="fe-tbtn" data-cmd="histback" title="Voltar no histórico"><i class="fas fa-chevron-left"></i></button>
          <button class="fe-tbtn" data-cmd="histfwd" title="Avançar no histórico"><i class="fas fa-chevron-right"></i></button>
          <button class="fe-tbtn" data-cmd="fav" title="Favoritar pasta atual"><i class="far fa-star"></i></button>
          <div class="fe-crumbs" id="fe-crumbs"></div>
          <input class="fe-search" id="fe-search" placeholder="Pesquisar nesta pasta">
          <button class="fe-tbtn" data-cmd="mountdevice" title="Conectar uma pasta do computador"><i class="fas fa-plug"></i> Remote Device</button>
          <button class="fe-tbtn" data-cmd="refresh" title="Atualizar pasta atual"><i class="fas fa-rotate-right"></i></button>
          <button class="fe-tbtn" data-cmd="upload" title="Enviar arquivos para a pasta atual"><i class="fas fa-upload"></i></button>
          <button class="fe-tbtn" data-cmd="newfolder"><i class="fas fa-folder-plus"></i> Pasta</button>
          <button class="fe-tbtn" data-cmd="newfile"><i class="fas fa-file-plus"></i> Arquivo</button>
          <button class="fe-tbtn" data-cmd="newvl" title="Novo script VessieLang" style="color:#a78bfa"><i class="fas fa-terminal"></i> .vl</button>
          <button class="fe-tbtn" data-cmd="template" title="Novo arquivo a partir de um modelo"><i class="fas fa-wand-magic-sparkles"></i> Modelo</button>
          <button class="fe-tbtn" data-cmd="view" title="Alternar grade/lista"><i class="fas fa-list"></i></button>
          <button class="fe-tbtn" data-cmd="sort" title="Ordenar: nome/tipo"><i class="fas fa-arrow-down-a-z"></i></button>
        </div>
        <div class="fem-body">
          <div class="fgrid" id="fe-grid" tabindex="0" title="Enter abre · F2 renomeia · Delete exclui · Ctrl+A seleciona tudo · Ctrl+C/X/V copiar/recortar/colar"></div>
          <div class="feprev" id="fe-preview">
            <h4>Visualização</h4>
            <div class="fp-media" id="fe-media"><span style="color:var(--dim)">Selecione um item para ver detalhes</span></div>
            <div class="fp-meta" id="fe-meta"></div>
            <div class="fp-actions" id="fe-actions"></div>
          </div>
        </div>
        <div class="fe-statusbar" id="fe-status"></div>
      </div>
    </div>
  `;
    const win = createWin('Explorador de Arquivos', '📁', '<div class="app-loading">Carregando…</div>', 860, 560);
    const wire = () => wireExplorer(win);
    if (window.VessieBridge && typeof window.VessieBridge.loadView === 'function') {
      window.VessieBridge.loadView('explorer', { html: feFallback }, feData).then(({ html }) => {
        if (!document.body.contains(win)) return;
        win.querySelector('.wb').innerHTML = html;
        wire();
      });
    } else {
      win.querySelector('.wb').innerHTML = feFallback;
      wire();
    }
    return win;
  }

function wireExplorer(win) {

    win.querySelectorAll('.fld').forEach((f) => {
      f.onclick = () => {
        win.querySelectorAll('.fld').forEach((x) => x.classList.remove('ac'));
        f.classList.add('ac');
        S.currentPath = f.dataset.dir;
        renderFileGrid(win, f.dataset.dir);
      };
    });
    win.querySelector('.fesb-pc-toggle').addEventListener('click', function () {
      this.classList.toggle('collapsed');
      win.querySelector('.fesb-pc-list').classList.toggle('collapsed');
    });
    win.querySelector('[data-cmd="back"]').onclick = () => feBack(win);
    win.querySelector('[data-cmd="histback"]').onclick = () => feHistGo(win, -1);
    win.querySelector('[data-cmd="histfwd"]').onclick = () => feHistGo(win, 1);
    win.querySelector('[data-cmd="fav"]').onclick = () => feToggleFav(win);
    win.querySelector('[data-cmd="refresh"]').onclick = () => refreshCurrentFolder(win);
    win.querySelector('[data-cmd="upload"]').onclick = () => uploadToCurrentFolder(win);
    win.querySelector('[data-cmd="newfolder"]').onclick = () => feNewFolder(win);
    win.querySelector('[data-cmd="newfile"]').onclick = () => feNewFile(win);
    win.querySelector('[data-cmd="newvl"]').onclick = () => feNewVlScript(win);
    win.querySelector('[data-cmd="template"]').onclick = () => feNewFromTemplate(win);
    win.querySelector('[data-cmd="view"]').onclick = (e) => {
      win.dataset.feView = win.dataset.feView === 'list' ? 'grid' : 'list';
      e.currentTarget.innerHTML = win.dataset.feView === 'list' ? '<i class="fas fa-grip"></i>' : '<i class="fas fa-list"></i>';
      renderFileGrid(win, currentExplorerPath(win), win.querySelector('#fe-search')?.value || '');
    };
    win.querySelector('[data-cmd="sort"]').onclick = (e) => {
      win.dataset.feSort = win.dataset.feSort === 'type' ? 'name' : 'type';
      e.currentTarget.title = `Ordenar: ${win.dataset.feSort === 'type' ? 'tipo' : 'nome'}`;
      renderFileGrid(win, currentExplorerPath(win), win.querySelector('#fe-search')?.value || '');
    };
    win.querySelectorAll('[data-cmd="mountdevice"]').forEach((button) => {
      button.onclick = () => mountRemoteDevice(win);
    });
    win.querySelector('#fe-search').addEventListener('input', (e) => renderFileGrid(win, win.dataset.selectedPath ?? S.currentPath, e.target.value));
    win.addEventListener('click', (event) => {
      const eject = event.target.closest('[data-remote-eject]');
      if (eject) {
        event.stopPropagation();
        disconnectRemoteDevice(win, eject.dataset.remoteEject);
        return;
      }
      const recheck = event.target.closest('[data-remote-recheck]');
      if (recheck) {
        event.stopPropagation();
        renderFileGrid(win, win.dataset.selectedPath ?? S.currentPath, win.querySelector('#fe-search')?.value || '');
      }
    });

    renderRemoteSidebar(win);
    renderFavorites(win);
    wireGridKeyboard(win);
    wireGridEmptyMenu(win);
    renderFileGrid(win, S.currentPath);
  }

function getFolderIcon(name) {
    const m = { 'Desktop': 'fa-desktop', 'Documentos': 'fa-file-alt', 'Downloads': 'fa-download', 'Imagens': 'fa-images', 'Videos': 'fa-film', 'Sistema': 'fa-cog', 'Programs': 'fa-box' };
    return m[name] || 'fa-folder';
  }

function feRenderCrumbs(win, path) {
    const box = win.querySelector('#fe-crumbs');
    if (!box) return;
    box.replaceChildren();
    const location = getRemoteLocation(path);
    const makeCrumb = (label, target, icon) => {
      const el = document.createElement('span');
      el.className = 'fe-crumb';
      el.dataset.path = target;
      if (icon) {
        const i = document.createElement('i');
        i.className = `fas ${icon}`;
        i.style.marginRight = '4px';
        el.appendChild(i);
      }
      el.append(document.createTextNode(label));
      el.onclick = () => { S.currentPath = target; renderFileGrid(win, target); };
      return el;
    };
    const sep = () => {
      const s = document.createElement('span');
      s.className = 'fe-crumb-sep';
      s.textContent = '›';
      return s;
    };
    if (location) {
      box.appendChild(makeCrumb(`🔌 ${location.label}`, location.label, 'fa-hard-drive'));
      let acc = location.label;
      location.parts.forEach((part) => {
        acc = `${acc}/${part}`;
        box.append(sep(), makeCrumb(part, acc));
      });
      return;
    }
    const parts = path ? path.split('/') : [];
    let acc = '';
    box.appendChild(makeCrumb('Este Computador', ''));
    parts.forEach((part) => {
      acc = acc ? `${acc}/${part}` : part;
      box.append(sep(), makeCrumb(part, acc));
    });
  }

// Volta para a pasta pai (botão Voltar da barra de ferramentas).
function feBack(win) {
    const cur = (win && win.dataset && win.dataset.selectedPath !== undefined)
      ? win.dataset.selectedPath
      : (S.currentPath || '');
    if (!cur) return;
    const parent = cur.split('/').slice(0, -1).join('/');
    S.currentPath = parent;
    renderFileGrid(win, parent);
  }

function renderFileGrid(win, path, filterTerm) {
    if (win) {
      win.dataset.selectedPath = path;
      delete win.dataset.selectedFile;
      // seleção múltipla sempre recomeça ao trocar/atualizar a grade
      win._feSel = [];
      win._feAnchor = -1;
      // histórico por janela (local + remoto): toda navegação passa por aqui
      if (!win._feHist) win._feHist = { current: undefined, back: [], fwd: [] };
      const hist = win._feHist;
      if (!win._feHistLock && hist.current !== undefined && hist.current !== path) {
        hist.back.push(hist.current);
        if (hist.back.length > 50) hist.back.shift();
        hist.fwd = [];
      }
      hist.current = path;
      syncHistButtons(win);
    }
    feRenderCrumbs(win, path);
    win.querySelectorAll('.fld').forEach((x) => x.classList.toggle('ac', x.dataset.dir === path));
    if (win.querySelector('.remote-device-item')) renderRemoteSidebarActive(win, path);
    syncToolbarForPath(win, path);
    syncFavButton(win, path);
    const grid = win.querySelector('#fe-grid'); if (!grid) return;
    grid.innerHTML = '';
    grid.classList.toggle('fe-list', win.dataset.feView === 'list');
    if (getRemoteLocation(path)) {
      renderRemoteFileGrid(win, path, filterTerm);
      return;
    }
    // Raiz ('') = Este Computador: mostra as unidades disponíveis.
    if (!path) {
      const drives = [
        { name: 'Disco Local (C:)', target: 'C:', icon: 'fa-hdd', color: '#60a5fa', sub: 'Sistema de arquivos VessieOS' }
      ];
      drives.forEach(({ name, target, icon, color, sub }) => {
        const el = document.createElement('div'); el.className = 'fi';
        el.innerHTML = `<i class="fas ${icon}" style="color:${color};font-size:1.6rem"></i><span>${name}</span><small>${sub}</small>`;
        el.ondblclick = () => { S.currentPath = target; renderFileGrid(win, target); };
        el.onclick = () => { document.querySelectorAll('.fi.sel', grid).forEach(x => x.classList.remove('sel')); el.classList.add('sel'); };
        grid.appendChild(el);
      });
      feUpdateStatus(win, 0, drives.length);
      return;
    }
    const folder = VFS.resolve(path);
    if (!folder || typeof folder !== 'object') {
      grid.innerHTML = '<p style="color:var(--dim);font-size:.85rem;padding:20px">Pasta vazia</p>';
      feUpdateStatus(win, 0, 0);
      return;
    }
    let entries = Object.entries(folder);
    if (filterTerm) entries = entries.filter(([name]) => name.toLowerCase().includes(filterTerm.toLowerCase()));
    // pastas primeiro, depois arquivos; ordenação nome (padrão) ou tipo
    const sortMode = win.dataset.feSort === 'type' ? 'type' : 'name';
    entries.sort(([an, av], [bn, bv]) => {
      const aDir = av && typeof av === 'object', bDir = bv && typeof bv === 'object';
      if (aDir !== bDir) return aDir ? -1 : 1;
      if (sortMode === 'type' && !aDir && !bDir) {
        const ae = VFS.getExt(an), be = VFS.getExt(bn);
        if (ae !== be) return ae.localeCompare(be, 'pt-BR');
      }
      return an.localeCompare(bn, 'pt-BR');
    });
    entries.forEach(([name, val], idx) => {
      const isDir = val && typeof val === 'object';
      const locked = VFS.isLockedNode(val);
      const fullPath = path ? `${path}/${name}` : name;
      const type = isDir ? null : getFileType(name);
      const stat = VFS.stat(fullPath);
      const el = document.createElement('div'); el.className = 'fi' + (locked ? ' fi-locked' : '');
      el.innerHTML = locked
        ? `<i class="fas fa-lock" style="color:#ef5350"></i><span>${feEscapeHtml(name)}</span><small>${stat.size} item(s) 🔒</small>`
        : isDir
        ? `<i class="fas fa-folder" style="color:#ffb74d"></i><span>${feEscapeHtml(name)}</span><small>${Object.keys(val).length} item(s)</small>`
        : `<i class="fas ${type.icon}" style="color:${type.color}"></i><span>${feEscapeHtml(name)}</span><small>${feFormatSize(stat.size)}</small>`;
      if (locked) {
        // Pedido explícito: tanto clique esquerdo quanto direito nesta
        // pasta mostram o aviso de acesso negado — nenhum dos dois
        // seleciona/abre normalmente, diferente de qualquer outro item.
        const showLockedPrompt = (e) => {
          e.preventDefault();
          const unlocked = requestAdminUnlock(`"${name}"`);
          if (unlocked) renderFileGrid(win, path, filterTerm);
        };
        el.onclick = showLockedPrompt;
        el.ondblclick = showLockedPrompt;
        el.oncontextmenu = showLockedPrompt;
      } else {
        el.ondblclick = () => { isDir ? (S.currentPath = fullPath, renderFileGrid(win, fullPath)) : openFileByType(win, name, path, val); };
        el.onclick = (ev) => feLocalSelect(win, path, name, idx, entries, ev || {});
        el.oncontextmenu = (e) => {
          e.preventDefault();
          const sel = feSelectedNames(win);
          if (sel.length > 1 && sel.includes(name)) {
            feShowBulkContextMenu(win, e.clientX, e.clientY, path);
            return;
          }
          feLocalSelect(win, path, name, idx, entries, {});
          feShowContextMenu(win, e.clientX, e.clientY, name, path, val);
        };
      }
      el.addEventListener('dragover', (e) => e.preventDefault());
      el.addEventListener('drop', (e) => {
        e.preventDefault();
        if (locked) return;
        const files = e.dataTransfer?.files;
        if (!files || !files.length) return;
        const reader = new FileReader();
        reader.onload = () => {
          VFS.write(`${path}/${files[0].name}`, typeof reader.result === 'string' ? reader.result : String(reader.result));
          renderFileGrid(win, path);
          toast(`Arquivo transferido para ${path}`, 'success');
          persistState();
        };
        reader.readAsText(files[0]);
      });
      grid.appendChild(el);
    });
    if (!entries.length) grid.innerHTML = `<p style="color:var(--dim);font-size:.85rem;padding:20px">${filterTerm ? 'Nenhum resultado para "' + filterTerm + '"' : 'Pasta vazia'}</p>`;
    feUpdateStatus(win, entries.filter(([, v]) => !(v && typeof v === 'object')).length, entries.filter(([, v]) => v && typeof v === 'object').length);
  }

function getRemoteLocation(path) {
    const parts = String(path || '').split('/').filter(Boolean);
    const device = remoteDevices.get(parts[0]);
    return device ? { device, label: parts[0], parts: parts.slice(1) } : null;
  }

function isRemotePath(path) {
    return !!getRemoteLocation(path);
  }

function currentExplorerPath(win) {
    return win?.dataset?.selectedPath ?? S.currentPath ?? '';
  }

function syncToolbarForPath(win, path) {
    const remote = isRemotePath(path);
    win.querySelectorAll('[data-cmd="upload"]').forEach((btn) => { btn.style.display = remote ? '' : 'none'; });
    const search = win.querySelector('#fe-search');
    if (search) search.placeholder = remote ? 'Pesquisar nesta pasta remota' : 'Pesquisar nesta pasta';
  }

function refreshCurrentFolder(win) {
    renderFileGrid(win, currentExplorerPath(win), win.querySelector('#fe-search')?.value || '');
  }

// ---------------- histórico por janela ----------------
function syncHistButtons(win) {
    const hist = win._feHist || { back: [], fwd: [] };
    win.querySelectorAll('[data-cmd="histback"]').forEach((b) => { b.disabled = !hist.back.length; b.style.opacity = hist.back.length ? '' : '.4'; });
    win.querySelectorAll('[data-cmd="histfwd"]').forEach((b) => { b.disabled = !hist.fwd.length; b.style.opacity = hist.fwd.length ? '' : '.4'; });
  }

function feHistGo(win, dir) {
    const hist = win._feHist;
    if (!hist) return;
    const from = dir < 0 ? hist.back : hist.fwd;
    const to = dir < 0 ? hist.fwd : hist.back;
    if (!from.length) return;
    to.push(hist.current);
    const target = from.pop();
    hist.current = target;
    S.currentPath = target;
    const search = win.querySelector('#fe-search');
    if (search) search.value = '';
    win._feHistLock = true;
    try { renderFileGrid(win, target); }
    finally { win._feHistLock = false; syncHistButtons(win); }
  }

// ---------------- favoritos ----------------
const FE_FAV_KEY = 'vessie_explorer_favs_v1';

function feGetFavs() {
    try {
      const raw = JSON.parse(localStorage.getItem(FE_FAV_KEY) || '[]');
      return Array.isArray(raw) ? raw.filter((p) => typeof p === 'string') : [];
    } catch { return []; }
  }

function feSaveFavs(list) {
    try { localStorage.setItem(FE_FAV_KEY, JSON.stringify(list)); } catch { /* quota */ }
  }

function feToggleFav(win) {
    const path = currentExplorerPath(win);
    if (isRemotePath(path)) {
      toast('Favoritos valem para o Disco Local nesta versão.', 'error');
      return;
    }
    let favs = feGetFavs();
    if (favs.includes(path)) {
      favs = favs.filter((p) => p !== path);
      toast('Removido dos favoritos.', 'success');
    } else {
      favs.push(path);
      toast('Pasta favoritada. ⭐', 'success');
    }
    feSaveFavs(favs);
    renderFavorites(win);
    syncFavButton(win, path);
  }

function syncFavButton(win, path) {
    const favs = feGetFavs();
    win.querySelectorAll('[data-cmd="fav"]').forEach((b) => {
      const on = favs.includes(path);
      b.innerHTML = `<i class="${on ? 'fas' : 'far'} fa-star"></i>`;
      b.style.color = on ? '#f1c40f' : '';
      b.title = on ? 'Remover dos favoritos' : 'Favoritar pasta atual';
    });
  }

function renderFavorites(win) {
    const box = win.querySelector('[data-fe-favs]');
    if (!box) return;
    box.replaceChildren();
    const favs = feGetFavs().filter((p) => {
      try { const node = VFS.resolve(p); return node && typeof node === 'object' && !VFS.isLockedNode(node); }
      catch { return false; }
    });
    if (!favs.length) {
      const empty = document.createElement('small');
      empty.className = 'remote-device-note';
      empty.textContent = 'Use a ★ na barra para favoritar a pasta atual.';
      box.appendChild(empty);
      return;
    }
    favs.forEach((p) => {
      const item = document.createElement('div');
      item.className = 'fld' + ((win.dataset.selectedPath ?? S.currentPath) === p ? ' ac' : '');
      item.dataset.dir = p;
      const icon = document.createElement('i');
      icon.className = 'fas fa-star';
      icon.style.cssText = 'color:#f1c40f;width:14px;text-align:center';
      const label = document.createElement('span');
      label.textContent = p === '' ? 'Disco Local (C:)' : p.split('/').pop();
      label.title = p === '' ? 'Disco Local (C:)' : p;
      item.append(icon, label);
      item.onclick = () => {
        win.querySelectorAll('.fld').forEach((x) => x.classList.remove('ac'));
        item.classList.add('ac');
        S.currentPath = p;
        renderFileGrid(win, p);
      };
      box.appendChild(item);
    });
  }

// ---------------- seleção múltipla ----------------
function feSelectedNames(win) {
    return [...(win._feSel || [])];
  }

function feApplySelection(win, path, name) {
    win.dataset.selectedFile = name;
    win.dataset.selectedPath = path;
    const folder = VFS.resolve(path);
    const val = folder && typeof folder === 'object' ? folder[name] : undefined;
    renderFilePreview(win, name, val);
  }

function feUpdateSelectionStatus(win, total) {
    const status = win.querySelector('#fe-status');
    if (!status) return;
    status.querySelector('[data-fe-selcount]')?.remove();
    const sel = feSelectedNames(win);
    if (sel.length > 1) {
      const span = document.createElement('span');
      span.dataset.feSelcount = '1';
      span.textContent = `· ${sel.length} de ${total} selecionados (Ctrl/Shift para ajustar)`;
      status.appendChild(span);
    }
  }

function feLocalSelect(win, path, name, idx, entries, ev) {
    if (!win._feSel) win._feSel = [];
    const sel = win._feSel;
    if (ev.shiftKey && win._feAnchor >= 0) {
      const a = Math.min(win._feAnchor, idx), b = Math.max(win._feAnchor, idx);
      sel.length = 0;
      entries.slice(a, b + 1).forEach(([n, v]) => {
        if (!VFS.isLockedNode(v)) sel.push(n);
      });
    } else if (ev.ctrlKey || ev.metaKey) {
      const i = sel.indexOf(name);
      if (i >= 0) sel.splice(i, 1);
      else { sel.push(name); win._feAnchor = idx; }
    } else {
      sel.length = 0;
      sel.push(name);
      win._feAnchor = idx;
    }
    const set = new Set(sel);
    win.querySelectorAll('#fe-grid .fi').forEach((f, i) => {
      f.classList.toggle('sel', set.has(entries[i] ? entries[i][0] : ''));
    });
    if (!sel.length) {
      delete win.dataset.selectedFile;
      renderFilePreview(win, null, null);
    } else if (sel.length === 1) {
      feApplySelection(win, path, sel[0]);
    } else {
      win.dataset.selectedFile = sel[sel.length - 1];
      win.dataset.selectedPath = path;
      renderMultiPreview(win, path, sel);
    }
    feUpdateSelectionStatus(win, entries.length);
  }

function feSelectAll(win, path) {
    const folder = VFS.resolve(path);
    if (!folder || typeof folder !== 'object') return;
    const names = Object.keys(folder).filter((n) => {
      try { return !VFS.isLockedNode(folder[n]); } catch { return false; }
    });
    win._feSel = names;
    win._feAnchor = -1;
    const set = new Set(names);
    win.querySelectorAll('#fe-grid .fi').forEach((f) => {
      if (f.classList.contains('fi-locked')) { f.classList.remove('sel'); return; }
      f.classList.toggle('sel', set.has(f.querySelector('span')?.textContent));
    });
    if (!names.length) return;
    if (names.length === 1) feApplySelection(win, path, names[0]);
    else {
      win.dataset.selectedFile = names[names.length - 1];
      win.dataset.selectedPath = path;
      renderMultiPreview(win, path, names);
    }
    feUpdateSelectionStatus(win, names.length);
    toast(`${names.length} item(ns) selecionado(s).`, 'success');
  }

function renderMultiPreview(win, path, names) {
    const media = win.querySelector('#fe-media');
    const meta = win.querySelector('#fe-meta');
    const actions = win.querySelector('#fe-actions');
    if (!media || !meta) return;
    media.replaceChildren();
    meta.replaceChildren();
    if (actions) actions.replaceChildren();
    const icon = document.createElement('i');
    icon.className = 'fas fa-copy';
    icon.style.cssText = 'font-size:2.6rem;color:#60a5fa';
    media.appendChild(icon);
    let bytes = 0, dirs = 0, files = 0;
    names.forEach((n) => {
      try {
        const st = VFS.stat(`${path}/${n}`);
        if (st.isDir) dirs++;
        else { files++; bytes += st.size || 0; }
      } catch { /* ignora */ }
    });
    const row = (k, v) => {
      const d = document.createElement('div');
      const t = document.createElement('strong'); t.textContent = k;
      const x = document.createElement('div'); x.textContent = v;
      d.append(t, x);
      meta.appendChild(d);
    };
    row('Seleção', `${names.length} itens`);
    row('Conteúdo', `${dirs} pasta(s), ${files} arquivo(s)`);
    row('Tamanho', feFormatSize(bytes));
    if (actions) {
      const del = document.createElement('button');
      del.innerHTML = '<i class="fas fa-trash"></i> Excluir';
      del.onclick = () => deleteSelectedFiles(win);
      const copy = document.createElement('button');
      copy.innerHTML = '<i class="fas fa-copy"></i> Copiar';
      copy.onclick = () => feClipboardCopy(win, path, names, false);
      actions.append(del, copy);
    }
  }

// ---------------- área de transferência interna (Disco Local) ----------------
function feDeepClone(v) {
    return v && typeof v === 'object' ? JSON.parse(JSON.stringify(v)) : v;
  }

function feContainsLocked(v) {
    if (!v || typeof v !== 'object') return false;
    try { if (VFS.isLockedNode(v)) return true; } catch { return true; }
    return Object.values(v).some(feContainsLocked);
  }

function feClipboardCopy(win, path, names, cut) {
    if (isRemotePath(path)) {
      toast('Copiar do remoto: use Importar no painel do arquivo.', 'error');
      return;
    }
    if (!names || !names.length) { toast('Selecione um item primeiro.', 'error'); return; }
    win._feClip = { mode: cut ? 'cut' : 'copy', srcPath: path, names: [...names] };
    toast(`${names.length} item(ns) ${cut ? 'recortado(s)' : 'copiado(s)'} — Cole com Ctrl+V.`, 'success');
  }

function feUniqueName(target, name) {
    const dot = name.lastIndexOf('.');
    const stem = dot > 0 ? name.slice(0, dot) : name;
    const ext = dot > 0 ? name.slice(dot) : '';
    const missing = (p) => {
      try {
        const v = VFS.resolve(p);
        return v === null || v === undefined;
      } catch { return true; }
    };
    if (missing(`${target}/${name}`)) return name;
    for (let i = 1; i < 100; i++) {
      const cand = `${stem} (cópia${i > 1 ? ` ${i}` : ''})${ext}`;
      if (missing(`${target}/${cand}`)) return cand;
    }
    return `${stem} (cópia ${Date.now()})${ext}`;
  }

function fePaste(win) {
    const clip = win._feClip;
    const target = currentExplorerPath(win);
    if (!clip || !clip.names || !clip.names.length) { toast('Nada para colar.', 'error'); return; }
    if (isRemotePath(target) || isRemotePath(clip.srcPath)) {
      toast('Colar entre remoto e local ainda não é suportado.', 'error');
      return;
    }
    let srcFolder = null;
    try { srcFolder = VFS.resolve(clip.srcPath); } catch { srcFolder = null; }
    if (!srcFolder || typeof srcFolder !== 'object') { toast('A origem não existe mais.', 'error'); return; }
    let done = 0, skipped = 0;
    clip.names.forEach((n) => {
      const val = srcFolder[n];
      if (val === undefined || feContainsLocked(val)) { skipped++; return; }
      if (clip.srcPath === target) {
        if (clip.mode === 'cut') { skipped++; return; }
        VFS.write(`${target}/${feUniqueName(target, n)}`, feDeepClone(val));
        done++;
        return;
      }
      VFS.write(`${target}/${feUniqueName(target, n)}`, feDeepClone(val));
      done++;
    });
    if (clip.mode === 'cut' && clip.srcPath !== target) {
      clip.names.forEach((n) => {
        try {
          const val = VFS.resolve(`${clip.srcPath}/${n}`);
          if (val !== undefined && val !== null && !feContainsLocked(val)) VFS.delete(`${clip.srcPath}/${n}`);
        } catch { /* segue */ }
      });
      win._feClip = null;
    }
    persistState();
    renderFileGrid(win, target, win.querySelector('#fe-search')?.value || '');
    toast(done ? `${done} item(ns) colado(s) em ${target || 'Disco Local'}.${skipped ? ` ${skipped} ignorado(s).` : ''}` : 'Nada foi colado.', done ? 'success' : 'error');
  }

// ---------------- menu em massa + menu da área vazia ----------------
function fePositionMenu(win, menu, x, y, rows) {
    win.appendChild(menu);
    const bounds = win.getBoundingClientRect();
    menu.style.left = Math.max(0, Math.min(x - bounds.left, bounds.width - 220)) + 'px';
    menu.style.top = Math.max(0, Math.min(y - bounds.top, bounds.height - rows * 36)) + 'px';
    const closeOnce = (e) => { if (!e.target.closest('.fectx')) { menu.remove(); document.removeEventListener('click', closeOnce); } };
    setTimeout(() => document.addEventListener('click', closeOnce), 0);
  }

function feShowBulkContextMenu(win, x, y, path) {
    win.querySelector('.fectx')?.remove();
    const n = feSelectedNames(win).length;
    const menu = document.createElement('div');
    menu.className = 'fectx';
    menu.innerHTML = `
      <div class="cti" data-act="copy"><i class="fas fa-copy"></i> Copiar ${n} itens</div>
      <div class="cti" data-act="cut"><i class="fas fa-cut"></i> Recortar ${n} itens</div>
      <hr>
      <div class="cti" data-act="delete"><i class="fas fa-trash"></i> Excluir ${n} itens</div>`;
    menu.querySelectorAll('[data-act]').forEach((el) => {
      el.onclick = () => {
        const act = el.dataset.act;
        menu.remove();
        if (act === 'copy') feClipboardCopy(win, path, feSelectedNames(win), false);
        else if (act === 'cut') feClipboardCopy(win, path, feSelectedNames(win), true);
        else if (act === 'delete') deleteSelectedFiles(win);
      };
    });
    fePositionMenu(win, menu, x, y, 3);
  }

function wireGridEmptyMenu(win) {
    const grid = win.querySelector('#fe-grid');
    if (!grid || grid.dataset.feEmptyMenu === '1') return;
    grid.dataset.feEmptyMenu = '1';
    grid.addEventListener('contextmenu', (e) => {
      if (e.target.closest('.fi')) return; // item tem menu próprio
      const clip = win._feClip;
      if (!clip || !clip.names || !clip.names.length) return;
      e.preventDefault();
      win.querySelector('.fectx')?.remove();
      const menu = document.createElement('div');
      menu.className = 'fectx';
      menu.innerHTML = `<div class="cti" data-act="paste"><i class="fas fa-paste"></i> Colar ${clip.names.length} item(ns) aqui</div>`;
      menu.querySelector('[data-act="paste"]').onclick = () => { menu.remove(); fePaste(win); };
      fePositionMenu(win, menu, e.clientX, e.clientY, 1);
    });
  }

// ---------------- teclado da grade ----------------
function wireGridKeyboard(win) {
    const grid = win.querySelector('#fe-grid');
    if (!grid || grid.dataset.feKeys === '1') return;
    grid.dataset.feKeys = '1';
    grid.addEventListener('keydown', (e) => {
      const path = currentExplorerPath(win);
      const remote = isRemotePath(path);
      const lower = (e.key || '').toLowerCase();
      if ((e.ctrlKey || e.metaKey) && lower === 'a' && !remote) {
        e.preventDefault();
        feSelectAll(win, path);
      } else if ((e.ctrlKey || e.metaKey) && lower === 'c') {
        const sel = feSelectedNames(win);
        if (sel.length && !remote) { e.preventDefault(); feClipboardCopy(win, path, sel, false); }
      } else if ((e.ctrlKey || e.metaKey) && lower === 'x') {
        const sel = feSelectedNames(win);
        if (sel.length && !remote) { e.preventDefault(); feClipboardCopy(win, path, sel, true); }
      } else if ((e.ctrlKey || e.metaKey) && lower === 'v') {
        e.preventDefault();
        fePaste(win);
      } else if (e.key === 'Delete') {
        e.preventDefault();
        deleteSelectedFiles(win);
      } else if (e.key === 'F2') {
        const name = win.dataset.selectedFile;
        if (!name) return;
        e.preventDefault();
        if (remote) remoteRename(win, path, name);
        else feRename(win, name, path);
      } else if (e.key === 'Enter' && !remote) {
        const name = win.dataset.selectedFile;
        if (!name) return;
        e.preventDefault();
        let val;
        try { val = VFS.resolve(`${path}/${name}`); } catch { val = undefined; }
        if (val === undefined || val === null) return;
        if (VFS.isLockedNode(val)) return;
        const fullPath = path ? `${path}/${name}` : name;
        if (val && typeof val === 'object') { S.currentPath = fullPath; renderFileGrid(win, fullPath); }
        else openFileByType(win, name, path, val);
      }
    });
  }

async function ensureRemotePermission(handle, mode = 'read') {
    try {
      const query = await handle.queryPermission?.({ mode });
      if (query === 'granted') return true;
      const result = await handle.requestPermission?.({ mode });
      return result === 'granted';
    } catch {
      return true;
    }
  }

async function resolveRemoteDir(device, parts) {
    let directory = device.handle;
    for (const segment of parts) directory = await directory.getDirectoryHandle(segment);
    return directory;
  }

function sanitizeRemoteName(name) {
    const clean = String(name || '').trim().replace(/[\\/:*?"<>|]/g, '_');
    return clean;
  }

function renderRemoteSidebar(win) {
    const list = win.querySelector('[data-remote-list]');
    const count = win.querySelector('[data-remote-count]');
    if (!list) return;
    list.replaceChildren();
    if (count) {
      count.textContent = remoteDevices.size ? `${remoteDevices.size}` : '';
      count.style.display = remoteDevices.size ? '' : 'none';
    }
    if (!remoteDevices.size) {
      const empty = document.createElement('div');
      empty.className = 'remote-device-empty';
      empty.textContent = 'Nenhum dispositivo conectado.';
      list.appendChild(empty);
      return;
    }
    const activePath = currentExplorerPath(win);
    [...remoteDevices.values()].forEach((device) => {
      const row = document.createElement('div');
      row.className = 'remote-device-item' + (activePath === device.label || activePath.startsWith(`${device.label}/`) ? ' ac' : '');
      const open = document.createElement('button');
      open.className = 'fld fld-remote';
      open.type = 'button';
      open.dataset.dir = device.label;
      open.title = `Pasta original: ${device.rootName}`;
      const icon = document.createElement('i');
      icon.className = 'fas fa-hard-drive';
      const text = document.createElement('span');
      text.className = 'remote-device-text';
      const name = document.createElement('strong');
      name.textContent = device.label;
      const origin = document.createElement('small');
      origin.textContent = device.rootName;
      text.append(name, origin);
      const dot = document.createElement('span');
      dot.className = 'remote-status-dot';
      dot.title = 'Conectado';
      open.append(icon, text, dot);
      open.onclick = () => {
        if (win.querySelector('.remote-device-list')) renderRemoteSidebarActive(win, device.label);
        S.currentPath = device.label;
        renderFileGrid(win, device.label);
      };
      const eject = document.createElement('button');
      eject.className = 'remote-eject';
      eject.type = 'button';
      eject.dataset.remoteEject = device.label;
      eject.title = `Desconectar ${device.label}`;
      eject.setAttribute('aria-label', `Desconectar ${device.label}`);
      eject.innerHTML = '<i class="fas fa-eject"></i>';
      row.append(open, eject);
      list.appendChild(row);
    });
  }

function renderRemoteSidebarActive(win, path) {
    win.querySelectorAll('.remote-device-item').forEach((row) => {
      const label = row.querySelector('[data-remote-eject]')?.dataset.remoteEject;
      row.classList.toggle('ac', path === label || String(path || '').startsWith(`${label}/`));
    });
    win.querySelectorAll('.fld').forEach((x) => x.classList.toggle('ac', x.dataset.dir === path));
  }

function disconnectRemoteDevice(win, label) {
    const device = remoteDevices.get(label);
    if (!device) return;
    if (!confirm(`Desconectar "${label}"?\nA pasta original "${device.rootName}" não será alterada.`)) return;
    remoteDevices.delete(label);
    if (device.backupHandles?.has?.(remoteBackupTarget)) {
      if (remoteBackupTimer) clearTimeout(remoteBackupTimer);
      remoteBackupTimer = null;
      remoteBackupTarget = null;
      remoteBackupLastPayload = '';
    }
    renderRemoteSidebar(win);
    document.querySelectorAll('.win [data-remote-list]').forEach((list) => {
      const other = list.closest('.win');
      if (other && other !== win) renderRemoteSidebar(other);
    });
    const current = currentExplorerPath(win);
    if (current === label || String(current).startsWith(`${label}/`)) {
      S.currentPath = '';
      win.querySelector('#fe-search').value = '';
      renderFileGrid(win, '');
    }
    toast(`${label} desconectado.`, 'success');
  }

async function mountRemoteDevice(win) {
    if (typeof window.showDirectoryPicker !== 'function') {
      toast('Este navegador não oferece acesso a pastas. Abra o VessieOS em um navegador compatível e em um contexto seguro (HTTPS).', 'error');
      return;
    }

    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      const choice = await chooseRemoteFolderMode(handle.name);
      if (choice === 'install') {
        await showRemoteInstallWizard(win, handle);
      } else if (choice === 'remote') {
        connectRemoteDevice(win, handle);
      }
    } catch (error) {
      if (error?.name === 'AbortError') return;
      // Em file://, showDirectoryPicker pode falhar devido a restrições de contexto seguro
      if (error?.message?.includes('Top-level') || error?.message?.includes('secure context')) {
        toast('Acesso a pastas bloqueado neste contexto. Para usar o seletor de pastas:', 'info');
        toast('1. Execute o VessieOS em um servidor local (python -m http.server)', 'info');
        toast('2. Ou use um navegador com HTTPS', 'info');
        toast('3. Ou arraste e solte arquivos diretamente na área do explorador', 'info');
      } else {
        toast(`Não foi possível conectar a pasta: ${error?.message || 'erro desconhecido'}`, 'error');
      }
    }
  }

function chooseRemoteFolderMode(folderName) {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'fe-setup-backdrop';
      overlay.setAttribute('role', 'presentation');
      overlay.innerHTML = `
        <section class="fe-setup-choice" role="dialog" aria-modal="true" aria-labelledby="fe-setup-title">
          <h2 id="fe-setup-title">Como deseja usar esta pasta?</h2>
          <p class="fe-setup-path"></p>
          <p class="fe-setup-warning">O navegador só poderá acessar a pasta escolhida. Não haverá formatação nem exclusão de dados.</p>
          <div class="fe-setup-options">
            <button class="fe-setup-option fe-setup-install" type="button">
              <strong>Instalar / preparar VessieOS</strong>
              <span>Cria uma estrutura nova ou adiciona apenas pastas e arquivos que ainda não existam.</span>
            </button>
            <button class="fe-setup-option" type="button">
              <strong>Usar como Remote Device</strong>
              <span>Navega pela pasta sem instalar ou alterar seu conteúdo.</span>
            </button>
          </div>
          <button class="fe-setup-cancel" type="button">Cancelar</button>
        </section>`;
      overlay.querySelector('.fe-setup-path').textContent = `Pasta selecionada: ${folderName}`;
      const close = (choice) => {
        overlay.remove();
        resolve(choice);
      };
      overlay.querySelector('.fe-setup-install').onclick = () => close('install');
      overlay.querySelectorAll('.fe-setup-option')[1].onclick = () => close('remote');
      overlay.querySelector('.fe-setup-cancel').onclick = () => close(null);
      overlay.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') close(null);
      });
      document.body.appendChild(overlay);
      overlay.querySelector('.fe-setup-install').focus();
    });
  }

function connectRemoteDevice(win, handle, initialSubpath = '') {
    let number;
    do {
      number = Math.floor(1000 + Math.random() * 9000);
    } while ([...remoteDevices.values()].some((device) => device.number === number));

    const label = `Remote Device (${number})`;
    const device = { number, label, handle, rootName: handle?.name || 'pasta selecionada', connectedAt: new Date().toISOString(), backupHandles: new Set() };
    remoteDevices.set(label, device);
    renderRemoteSidebar(win);
    document.querySelectorAll('.win [data-remote-list]').forEach((list) => {
      const other = list.closest('.win');
      if (other && other !== win) renderRemoteSidebar(other);
    });
    S.currentPath = initialSubpath ? `${label}/${initialSubpath}` : label;
    const search = win.querySelector('#fe-search');
    if (search) search.value = '';
    renderFileGrid(win, S.currentPath);
    toast(`${label} conectado a "${device.rootName}". O acesso fica restrito à pasta que você escolheu.`, 'success');
    return device;
  }

function createInstallScreen(handle) {
    const screen = document.createElement('div');
    screen.className = 'fe-install-screen';
    screen.innerHTML = `
      <section class="fe-install-panel" role="dialog" aria-modal="true" aria-labelledby="fe-install-title">
        <header class="fe-install-header">
          <span class="fe-install-mark">V</span>
          <div><strong>VessieOS Setup</strong><small class="fe-install-folder"></small></div>
          <button class="fe-install-close" type="button" aria-label="Fechar instalação">×</button>
        </header>
        <div class="fe-install-content"></div>
      </section>`;
    screen.querySelector('.fe-install-folder').textContent = handle.name;
    document.body.appendChild(screen);
    return screen;
  }

function showRemoteInstallWizard(win, handle) {
    return new Promise((resolve) => {
      const screen = createInstallScreen(handle);
      const content = screen.querySelector('.fe-install-content');
      let resetInstall = false;
      let backupEnabled = true;
      let finished = false;
      const finish = (result) => {
        if (finished) return;
        finished = true;
        screen.remove();
        resolve(result);
      };
      const renderConsent = () => {
        content.innerHTML = `
          <h1 id="fe-install-title">Preparar o VessieOS</h1>
          <p>Escolha como instalar. “Resetar” significa criar uma pasta de instalação separada; os dados existentes nunca são apagados ou substituídos.</p>
          <fieldset class="fe-install-reset">
            <legend>Deseja resetar a instalação?</legend>
            <label><input type="radio" name="fe-install-reset" value="new" ${resetInstall ? 'checked' : ''}> Sim — criar uma instalação separada, preservando a pasta antiga</label>
            <label><input type="radio" name="fe-install-reset" value="continue" ${resetInstall ? '' : 'checked'}> Não — continuar em <code>VessieOS</code>, criando apenas itens ausentes</label>
          </fieldset>
          <div class="fe-install-terms">
            <strong>Termos de instalação e permissões</strong>
            <ul>
              <li>O acesso fica limitado à pasta selecionada e às pastas de instalação criadas dentro dela.</li>
              <li>Nenhum arquivo ou pasta existente será excluído, movido ou sobrescrito.</li>
              <li>Scripts e outros arquivos encontrados serão apenas listados; eles nunca serão executados automaticamente.</li>
              <li>O VessieOS continua funcionando com o armazenamento local do navegador, mesmo sem selecionar uma pasta.</li>
              <li>O backup automático, quando habilitado, inclui configurações e arquivos virtuais, que podem conter dados privados; chaves de API e histórico de conversas do estado do sistema são excluídos.</li>
              <li>O LM Studio pode sugerir conteúdo; nada gerado será salvo ou executado sem revisão e confirmação.</li>
              <li>A permissão da pasta é controlada pelo navegador e pode precisar ser concedida novamente após fechar a página.</li>
            </ul>
          </div>
          <label class="fe-install-accept"><input type="checkbox"> Li e aceito os termos e entendo quais arquivos serão criados.</label>
          <label class="fe-install-backup"><input type="checkbox" ${backupEnabled ? 'checked' : ''}> Ativar backup automático do estado do VessieOS nesta instalação.</label>
          <div class="fe-install-actions">
            <button class="fe-install-cancel" type="button">Voltar</button>
            <button class="fe-install-continue" type="button" disabled>Continuar</button>
          </div>`;
        const accept = content.querySelector('.fe-install-accept input');
        const continueButton = content.querySelector('.fe-install-continue');
        content.querySelector('.fe-install-backup input').addEventListener('change', (event) => {
          backupEnabled = event.target.checked;
        });
        accept.addEventListener('change', () => { continueButton.disabled = !accept.checked; });
        content.querySelectorAll('input[name="fe-install-reset"]').forEach((input) => {
          input.addEventListener('change', () => { resetInstall = input.value === 'new'; });
        });
        content.querySelector('.fe-install-cancel').onclick = () => finish(null);
        continueButton.onclick = renderConfirmation;
      };
      const renderConfirmation = () => {
        const destination = resetInstall ? 'uma nova pasta de instalação' : 'a pasta VessieOS';
        content.innerHTML = `
          <h1>Tem certeza que deseja continuar?</h1>
          <p>O instalador criará pastas padrão e arquivos novos em ${destination}. Ele não formata o disco, não apaga dados e não executa scripts.</p>
          <div class="fe-install-confirm-box">
            <strong>Antes de iniciar</strong>
            <span>Destino: <code class="fe-install-destination"></code></span>
            <span>Backup automático: <strong class="fe-install-backup-status"></strong></span>
          </div>
          <div class="fe-install-actions">
            <button class="fe-install-back" type="button">Voltar</button>
            <button class="fe-install-start" type="button">Sim, iniciar instalação</button>
          </div>`;
        content.querySelector('.fe-install-destination').textContent = resetInstall ? 'nova pasta VessieOS-Reset-*' : 'VessieOS';
        content.querySelector('.fe-install-backup-status').textContent =
          backupEnabled ? 'ativado (sem chaves de API ou conversas)' : 'desativado';
        content.querySelector('.fe-install-back').onclick = renderConsent;
        content.querySelector('.fe-install-start').onclick = () => runRemoteInstallation(win, handle, {
          resetInstall,
          backupEnabled,
          screen,
          content,
          finish
        });
      };
      screen.querySelector('.fe-install-close').onclick = () => finish(null);
      screen.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !screen.classList.contains('is-installing')) finish(null);
      });
      renderConsent();
      screen.querySelector('.fe-install-close').focus();
    });
  }

async function getNonConflictingDirectoryName(parent, baseName) {
    for (let suffix = 0; suffix < 100; suffix++) {
      const name = suffix === 0 ? baseName : `${baseName}-${suffix + 1}`;
      try {
        await parent.getDirectoryHandle(name);
      } catch (error) {
        if (error?.name === 'NotFoundError') return name;
        throw error;
      }
    }
    throw new Error('não foi possível encontrar um nome de pasta livre');
  }

async function createFileIfMissing(directory, name, contents) {
    try {
      await directory.getFileHandle(name);
      return false;
    } catch (error) {
      if (error?.name !== 'NotFoundError') throw error;
    }
    const handle = await directory.getFileHandle(name, { create: true });
    const writer = await handle.createWritable();
    try {
      await writer.write(contents);
      await writer.close();
    } catch (error) {
      await writer.abort().catch(() => {});
      throw error;
    }
    return handle;
  }

async function createUniqueFile(directory, baseName, contents) {
    const extensionIndex = baseName.lastIndexOf('.');
    const stem = extensionIndex > 0 ? baseName.slice(0, extensionIndex) : baseName;
    const extension = extensionIndex > 0 ? baseName.slice(extensionIndex) : '';
    for (let suffix = 0; suffix < 100; suffix++) {
      const name = suffix === 0 ? baseName : `${stem}-${suffix + 1}${extension}`;
      let exists = false;
      try {
        await directory.getFileHandle(name);
        exists = true;
      } catch (error) {
        if (error?.name === 'NotFoundError') {
          const handle = await createFileIfMissing(directory, name, contents);
          if (handle) return { name, handle };
          exists = true;
        } else if (error?.name !== 'TypeMismatchError') {
          throw error;
        } else {
          exists = true;
        }
      }
      if (!exists) throw new Error(`não foi possível criar ${name}`);
    }
    throw new Error('não foi possível encontrar um nome de arquivo livre para o backup');
  }

function makeSystemBackup(state) {
    return JSON.stringify({
      schema: 'vessieos-state-v1',
      updatedAt: new Date().toISOString(),
      fs: state.fs || {},
      fsMeta: state.fsMeta || {},
      wallpaper: state.wallpaper,
      desktopIconSize: state.desktopIconSize,
      cursorSize: state.cursorSize,
      wallpapers: state.wallpapers || [],
      sounds: state.sounds,
      notificationsEnabled: state.notificationsEnabled !== false,
      animationsEnabled: state.animationsEnabled !== false,
      vocabulary: state.vocabulary || [],
      gameTemplates: state.gameTemplates || [],
      iconScale: state.iconScale || 1,
      pinnedApps: state.pinnedApps || [],
      recentApps: state.recentApps || []
    }, null, 2);
  }

function getSystemBackupSignature(state) {
    const snapshot = JSON.parse(makeSystemBackup(state));
    delete snapshot.updatedAt;
    return JSON.stringify(snapshot);
  }

function scheduleRemoteBackup(state) {
    if (!remoteBackupTarget) return;
    if (remoteBackupTimer) clearTimeout(remoteBackupTimer);
    remoteBackupTimer = setTimeout(async () => {
      remoteBackupTimer = null;
      try {
        const signature = getSystemBackupSignature(state);
        if (signature === remoteBackupLastPayload) return;
        const payload = makeSystemBackup(state);
        await writeRemoteFile(remoteBackupTarget, payload);
        remoteBackupLastPayload = signature;
      } catch (error) {
        remoteBackupTarget = null;
        toast(`Backup automático pausado: ${error?.message || 'falha de gravação'}`, 'error');
      }
    }, 1000);
  }

window.VessieRemoteStorageSync = scheduleRemoteBackup;

async function runRemoteInstallation(win, selectedHandle, options) {
    const { content, screen, finish, resetInstall, backupEnabled } = options;
    screen.classList.add('is-installing');
    content.innerHTML = `
      <h1>Instalando o VessieOS</h1>
      <p class="fe-install-progress-label">Preparando destino seguro...</p>
      <div class="fe-install-progress"><span></span></div>
      <pre class="fe-install-log" aria-live="polite"></pre>`;
    const label = content.querySelector('.fe-install-progress-label');
    const progress = content.querySelector('.fe-install-progress span');
    const log = content.querySelector('.fe-install-log');
    const report = (message, percent) => {
      log.textContent += `${message}\n`;
      log.scrollTop = log.scrollHeight;
      label.textContent = message;
      progress.style.width = `${percent}%`;
    };
    try {
      const installName = resetInstall
        ? await getNonConflictingDirectoryName(selectedHandle, `VessieOS-Reset-${new Date().toISOString().replace(/[:.]/g, '-')}`)
        : 'VessieOS';
      const root = await selectedHandle.getDirectoryHandle(installName, { create: true });
      report(`Destino confirmado: ${installName}`, 8);
      const folders = [
        'Desktop', 'Documentos', 'Downloads', 'Imagens', 'Projetos', 'Scripts',
        'Aplicativos', 'Bibliotecas', 'Configuracoes', 'Dados', 'Logs', 'Backups',
        'Sistema', 'Vessie', 'Vessie/Runtime', 'Vessie/Libraries', 'Vessie/Reports',
        'Vessie/Projects', 'Vessie/Commands'
      ];
      const directories = new Map([['', root]]);
      let completed = 0;
      for (const folderPath of folders) {
        const segments = folderPath.split('/');
        let current = root;
        let currentPath = '';
        for (const segment of segments) {
          currentPath = currentPath ? `${currentPath}/${segment}` : segment;
          current = await current.getDirectoryHandle(segment, { create: true });
          directories.set(currentPath, current);
        }
        completed++;
        report(`Pasta pronta: ${folderPath}`, 10 + Math.round(completed / folders.length * 65));
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      const config = directories.get('Configuracoes');
      const readme = [
        'VessieOS — estrutura de instalação local',
        '',
        'Os dados principais do aplicativo continuam salvos no localStorage do navegador.',
        'A pasta Dados pode receber um backup JSON do estado do VessieOS se o usuário habilitou essa opção. Arquivos virtuais são incluídos e podem conter dados privados.',
        'Chaves de API e histórico de conversas do estado do sistema são excluídos do backup.',
        'Arquivos e scripts encontrados não são executados automaticamente.',
        'Arquivos existentes nesta pasta não são apagados nem sobrescritos pela instalação.'
      ].join('\n');
      const configContents = JSON.stringify({
        product: 'VessieOS',
        schemaVersion: 1,
        installedAt: new Date().toISOString(),
        storage: 'browser-localStorage',
        remoteFolderAccess: 'user-selected-directory-only',
        automaticScriptExecution: false
      }, null, 2);
      await createFileIfMissing(config, 'system.json', configContents);
      report('Configuração inicial conferida (arquivos preexistentes preservados).', 82);
      await createFileIfMissing(root, 'LEIA-ME.txt', readme);
      report('Guia local criado ou preservado.', 90);

      if (backupEnabled) {
        const dataFolder = directories.get('Dados');
        const backupBase = `system-state-${Date.now()}.json`;
        const backup = await createUniqueFile(dataFolder, backupBase, makeSystemBackup(S));
        if (remoteBackupTimer) clearTimeout(remoteBackupTimer);
        remoteBackupTimer = null;
        remoteBackupTarget = backup.handle;
        remoteBackupLastPayload = getSystemBackupSignature(S);
        report(`Backup inicial criado em Dados/${backup.name} sem chaves de API ou histórico de conversas.`, 96);
      } else {
        if (remoteBackupTimer) clearTimeout(remoteBackupTimer);
        remoteBackupTimer = null;
        remoteBackupTarget = null;
        remoteBackupLastPayload = '';
      }
      const device = connectRemoteDevice(win, selectedHandle, installName);
      if (backupEnabled && remoteBackupTarget && device?.backupHandles) device.backupHandles.add(remoteBackupTarget);
      screen.classList.remove('is-installing');
      content.innerHTML = `
        <h1>Instalação concluída</h1>
        <p>A estrutura do VessieOS está pronta. Os arquivos anteriores foram preservados; nada foi executado.</p>
        <div class="fe-install-confirm-box"><strong>Destino</strong><code class="fe-install-result"></code></div>
        <div class="fe-install-actions"><button class="fe-install-start" type="button">Abrir pasta instalada</button></div>`;
      content.querySelector('.fe-install-result').textContent = `${selectedHandle.name}/${installName}`;
      content.querySelector('.fe-install-start').onclick = () => finish(device);
      report('Instalação concluída. O estado do sistema permanece disponível no localStorage.', 100);
    } catch (error) {
      screen.classList.remove('is-installing');
      content.innerHTML = `
        <h1>Não foi possível concluir a instalação</h1>
        <p class="fe-install-error"></p>
        <p>O instalador não remove nem substitui conteúdo existente. As pastas criadas antes da falha foram mantidas.</p>
        <div class="fe-install-actions"><button class="fe-install-cancel" type="button">Fechar</button></div>`;
      content.querySelector('.fe-install-error').textContent = error?.message || 'Erro de gravação ou permissão.';
      content.querySelector('.fe-install-cancel').onclick = () => finish(null);
      toast(`Instalação interrompida sem excluir dados: ${error?.message || 'erro de gravação'}`, 'error');
    }
  }

async function renderRemoteFileGrid(win, path, filterTerm) {
    const grid = win.querySelector('#fe-grid');
    const location = getRemoteLocation(path);
    if (!grid || !location) return;
    const renderToken = String((Number(win.dataset.remoteRenderToken) || 0) + 1);
    win.dataset.remoteRenderToken = renderToken;
    grid.innerHTML = '<p style="color:var(--dim);font-size:.85rem;padding:20px">Lendo pasta remota...</p>';
    clearRemotePreviewUrls(win);

    const canRead = await ensureRemotePermission(location.device.handle, 'read');
    if (!canRead) {
      if (win.dataset.remoteRenderToken !== renderToken) return;
      grid.replaceChildren();
      const err = document.createElement('div');
      err.className = 'remote-error';
      const title = document.createElement('strong');
      title.textContent = 'Permissão necessária';
      const text = document.createElement('p');
      text.textContent = 'O navegador precisa da sua autorização para ler esta pasta novamente.';
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'fe-tbtn';
      retry.innerHTML = '<i class="fas fa-key"></i> Solicitar acesso';
      retry.onclick = () => renderFileGrid(win, path, filterTerm);
      err.append(title, text, retry);
      grid.appendChild(err);
      feUpdateStatus(win, 0, 0, location);
      return;
    }

    try {
      const directory = await resolveRemoteDir(location.device, location.parts);
      const entries = [];
      for await (const [name, handle] of directory.entries()) {
        if (!filterTerm || name.toLocaleLowerCase('pt-BR').includes(filterTerm.toLocaleLowerCase('pt-BR'))) {
          entries.push([name, handle]);
        }
      }
      entries.sort(([aName, a], [bName, b]) => {
        if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
        return aName.localeCompare(bName, 'pt-BR');
      });
      if (win.dataset.remoteRenderToken !== renderToken) return;
      grid.innerHTML = '';
      const banner = document.createElement('div');
      banner.className = 'remote-banner';
      banner.innerHTML = '<i class="fas fa-hard-drive"></i>';
      const bannerText = document.createElement('span');
      bannerText.textContent = `🔌 ${location.device.label} · origem: ${location.device.rootName}${location.parts.length ? ` · /${location.parts.join('/')}` : ''} — somente esta pasta é acessível`;
      banner.appendChild(bannerText);
      grid.appendChild(banner);
      entries.forEach(([name, handle]) => {
        const fullPath = `${path}/${name}`;
        const type = handle.kind === 'file' ? getFileType(name) : null;
        const item = document.createElement('div');
        item.className = 'fi fi-remote';
        item.tabIndex = 0;
        const icon = document.createElement('i');
        icon.className = handle.kind === 'directory' ? 'fas fa-folder' : `fas ${type.icon}`;
        icon.style.color = handle.kind === 'directory' ? '#ffb74d' : type.color;
        const title = document.createElement('span');
        title.textContent = name;
        title.title = name;
        const detail = document.createElement('small');
        detail.textContent = handle.kind === 'directory' ? 'Pasta remota' : `${type.label} · remoto`;
        item.append(icon, title, detail);
        const select = () => {
          win.querySelectorAll('.fi').forEach((element) => element.classList.remove('sel'));
          item.classList.add('sel');
          win.dataset.selectedFile = name;
          win.dataset.selectedPath = path;
          renderRemotePreview(win, name, handle, path).catch((error) => {
            toast(`Não foi possível pré-visualizar ${name}: ${error?.message || 'erro de leitura'}`, 'error');
          });
        };
        item.onclick = select;
        item.onkeydown = (event) => {
          if (event.key === 'Enter') {
            if (handle.kind === 'directory') {
              S.currentPath = fullPath;
              renderFileGrid(win, fullPath);
            } else select();
          }
        };
        item.ondblclick = () => {
          if (handle.kind === 'directory') {
            S.currentPath = fullPath;
            renderFileGrid(win, fullPath);
          } else {
            openRemoteFile(win, name, handle, path);
          }
        };
        item.oncontextmenu = (event) => {
          event.preventDefault();
          select();
          feShowRemoteContextMenu(win, event.clientX, event.clientY, name, handle, path);
        };
        grid.appendChild(item);
      });
      if (!entries.length) {
        const empty = document.createElement('p');
        empty.style.cssText = 'color:var(--dim);font-size:.85rem;padding:20px;grid-column:1/-1';
        empty.textContent = filterTerm ? 'Nenhum resultado encontrado.' : 'Pasta vazia. Nenhum arquivo foi alterado. Use + Pasta, + Arquivo ou Enviar para adicionar itens.';
        grid.appendChild(empty);
      }
      enableRemoteDrop(win, grid, path);
      feUpdateStatus(win, entries.filter(([, handle]) => handle.kind === 'file').length, entries.filter(([, handle]) => handle.kind === 'directory').length, location);
    } catch (error) {
      if (win.dataset.remoteRenderToken !== renderToken) return;
      grid.innerHTML = '';
      const err = document.createElement('div');
      err.className = 'remote-error';
      const title = document.createElement('strong');
      title.textContent = 'Não foi possível ler a pasta';
      const text = document.createElement('p');
      text.textContent = String(error?.message || 'permissão necessária');
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'fe-tbtn';
      retry.innerHTML = '<i class="fas fa-rotate-right"></i> Tentar novamente';
      retry.onclick = () => renderFileGrid(win, path, filterTerm);
      err.append(title, text, retry);
      grid.appendChild(err);
      feUpdateStatus(win, 0, 0, location);
    }
  }

function clearRemotePreviewUrls(win) {
    (win._remoteUrls || []).forEach((url) => { try { URL.revokeObjectURL(url); } catch {} });
    win._remoteUrls = [];
  }

function trackRemoteUrl(win, url) {
    win._remoteUrls = win._remoteUrls || [];
    win._remoteUrls.push(url);
    return url;
  }

async function renderRemotePreview(win, name, handle, path) {
    const media = win.querySelector('#fe-media');
    const meta = win.querySelector('#fe-meta');
    const actions = win.querySelector('#fe-actions');
    if (!media || !meta || !actions) return;
    media.replaceChildren();
    meta.replaceChildren();
    actions.replaceChildren();
    clearRemotePreviewUrls(win);
    const fullPath = `${path}/${name}`;
    const addMeta = (label, value) => {
      const row = document.createElement('div');
      const title = document.createElement('strong');
      title.textContent = label;
      const text = document.createElement('div');
      text.textContent = value;
      row.append(title, text);
      meta.appendChild(row);
    };
    addMeta('Nome', name);
    addMeta('Caminho', fullPath);
    addMeta('Origem', getRemoteLocation(path)?.device.rootName || '—');

    if (handle.kind === 'directory') {
      const icon = document.createElement('i');
      icon.className = 'fas fa-folder';
      icon.style.cssText = 'font-size:2.6rem;color:#ffb74d';
      media.appendChild(icon);
      addMeta('Tipo', 'Pasta remota');
      const openBtn = document.createElement('button');
      openBtn.className = 'primary';
      openBtn.innerHTML = '<i class="fas fa-folder-open"></i> Abrir';
      openBtn.onclick = () => { S.currentPath = fullPath; renderFileGrid(win, fullPath); };
      const analyzeBtn = document.createElement('button');
      analyzeBtn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Analisar';
      analyzeBtn.onclick = () => feShowRemoteContextMenu(win, 0, 0, name, handle, path);
      actions.append(openBtn, analyzeBtn);
      return;
    }

    const type = getFileType(name);
    let file = null;
    try {
      file = await handle.getFile();
    } catch (error) {
      media.textContent = `Não foi possível ler: ${error?.message || 'erro de leitura'}`;
      return;
    }
    addMeta('Tipo', `${type.label} · remoto`);
    addMeta('Tamanho', feFormatSize(file.size));
    addMeta('Modificado', feFormatDate(file.lastModified ? new Date(file.lastModified).toISOString() : ''));
    const url = trackRemoteUrl(win, URL.createObjectURL(file));
    const lower = name.toLowerCase();
    if (/\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(lower) || (file.type || '').startsWith('image/')) {
      const img = document.createElement('img');
      img.src = url;
      img.alt = name;
      media.appendChild(img);
    } else if (/\.(mp4|webm|ogg)$/i.test(lower) || (file.type || '').startsWith('video/')) {
      const video = document.createElement('video');
      video.src = url;
      video.controls = true;
      video.muted = true;
      video.preload = 'metadata';
      media.appendChild(video);
    } else if (/\.(mp3|wav|ogg|m4a)$/i.test(lower) || (file.type || '').startsWith('audio/')) {
      const audio = document.createElement('audio');
      audio.src = url;
      audio.controls = true;
      audio.style.width = '100%';
      media.appendChild(audio);
    } else if (type.kind === 'text' || type.kind === 'html' || type.kind === 'vl') {
      const snippet = document.createElement('textarea');
      snippet.readOnly = true;
      try {
        const text = await file.text();
        snippet.value = text.length > 8000 ? `${text.slice(0, 8000)}\n… (prévia de 8 KB de ${feFormatSize(file.size)})` : text;
      } catch {
        snippet.value = '(não foi possível ler o texto)';
      }
      media.appendChild(snippet);
    } else {
      const icon = document.createElement('i');
      icon.className = `fas ${type.icon}`;
      icon.style.cssText = `font-size:2.6rem;color:${type.color}`;
      media.appendChild(icon);
    }
    const canEdit = type.kind === 'text' || type.kind === 'html' || type.kind === 'vl';
    if (canEdit) {
      const editButton = document.createElement('button');
      editButton.className = 'primary';
      editButton.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> Editar com Copilot';
      editButton.onclick = async () => {
        try {
          const content = await file.text();
          openCopilotEditor(name, fullPath, content, async (updated) => {
            await writeRemoteFile(handle, updated);
            renderFileGrid(win, path, win.querySelector('#fe-search')?.value || '');
          });
        } catch (error) {
          toast(`Não foi possível abrir o arquivo: ${error?.message || 'erro de leitura'}`, 'error');
        }
      };
      actions.appendChild(editButton);
    } else {
      const openBtn = document.createElement('button');
      openBtn.className = 'primary';
      const isExe = type.kind === 'exe';
      openBtn.innerHTML = isExe ? '<i class="fas fa-cog"></i> Abrir no Emulador' : '<i class="fas fa-eye"></i> Visualizar';
      openBtn.onclick = () => openRemoteFile(win, name, handle, path);
      actions.appendChild(openBtn);
      // Linha de formato real (MZ/PE/…) direto dos bytes, sem sair do preview.
      if (isExe && window.VessieEmulator) {
        const formatLine = document.createElement('div');
        formatLine.textContent = 'Analisando executável…';
        meta.appendChild(formatLine);
        handle.getFile().then(async (f) => {
          if (win.dataset.selectedFile !== name) return;
          try {
            const slice = await window.VessieEmulator.sliceForAnalysis(f);
            const info = window.VessieEmulator.detect(slice.bytes, name);
            if (win.dataset.selectedFile !== name) return;
            formatLine.textContent = `Formato: ${info.format.toUpperCase()} · ${info.arch}${info.runnable === 'dos' ? ' · roda no emulador' : info.runnable === 'pc' ? ' · roda no PC real' : ''}`;
          } catch {
            formatLine.textContent = 'Não foi possível analisar o formato.';
          }
        }).catch(() => { formatLine.textContent = 'Não foi possível analisar o formato.'; });
      }
    }
    const downloadBtn = document.createElement('button');
    downloadBtn.innerHTML = '<i class="fas fa-download"></i> Baixar';
    downloadBtn.onclick = () => remoteDownload(handle, name);
    const importBtn = document.createElement('button');
    importBtn.innerHTML = '<i class="fas fa-file-import"></i> Importar';
    importBtn.title = 'Copiar para o Disco Local (C:) do VessieOS';
    importBtn.onclick = () => remoteImportToVfs(win, handle, name);
    actions.append(downloadBtn, importBtn);
  }

async function openRemoteFile(win, name, handle, path) {
    if (handle.kind !== 'file') {
      S.currentPath = `${path}/${name}`;
      renderFileGrid(win, S.currentPath);
      return;
    }
    const type = getFileType(name);
    // Executáveis abrem de verdade no Emulador (kernel), direto da pasta sincronizada.
    if (type.kind === 'exe') {
      openRemoteExe(win, name, handle, path);
      return;
    }
    if (type.kind === 'text' || type.kind === 'html' || type.kind === 'vl') {
      try {
        const file = await handle.getFile();
        const content = await file.text();
        openCopilotEditor(name, `${path}/${name}`, content, async (updated) => {
          await writeRemoteFile(handle, updated);
          renderFileGrid(win, path, win.querySelector('#fe-search')?.value || '');
        });
      } catch (error) {
        toast(`Não foi possível abrir o arquivo: ${error?.message || 'erro de leitura'}`, 'error');
      }
      return;
    }
    try {
      const file = await handle.getFile();
      const url = URL.createObjectURL(file);
      const lower = name.toLowerCase();
      let body = '';
      if ((file.type || '').startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(lower)) {
        body = `<img src="${url}" alt="" style="max-width:100%;max-height:100%;object-fit:contain">`;
      } else if ((file.type || '').startsWith('video/') || /\.(mp4|webm|ogg)$/i.test(lower)) {
        body = `<video src="${url}" controls style="width:100%;height:100%;background:#000"></video>`;
      } else if ((file.type || '').startsWith('audio/') || /\.(mp3|wav|ogg|m4a)$/i.test(lower)) {
        body = `<div style="display:grid;place-items:center;height:100%;gap:10px"><i class="fas fa-file-audio" style="font-size:2.4rem;color:#fbbf24"></i><audio src="${url}" controls style="width:90%"></audio></div>`;
      } else {
        body = `<div style="display:grid;place-items:center;height:100%;gap:10px;color:var(--text-2)"><i class="fas ${type.icon}" style="font-size:2.4rem;color:${type.color}"></i><p>Sem visualização embutida. Use Baixar ou Importar pelo painel.</p></div>`;
      }
      const preview = createWin(name, '👁️', `<div class="remote-media-view">${body}</div>`, 640, 520);
      const observer = new MutationObserver(() => { if (!document.body.contains(preview)) { try { URL.revokeObjectURL(url); } catch {} observer.disconnect(); } });
      observer.observe(document.body, { childList: true, subtree: true });
    } catch (error) {
      toast(`Não foi possível abrir o arquivo: ${error?.message || 'erro de leitura'}`, 'error');
    }
  }

// Executável de pasta sincronizada (Remote-Device) aberto de verdade no
// Emulador do kernel: lê os bytes reais do disco e abre Inspeção/Execução.
async function openRemoteExe(win, name, handle, path) {
    if (typeof window.openEmulator !== 'function' || !window.VessieEmulator) {
      toast('O Emulador ainda não foi carregado — tente novamente em instantes.', 'error');
      return;
    }
    const location = getRemoteLocation(path);
    const source = location ? `${location.label} · ${location.device.rootName || ''}` : path;
    toast(`Lendo ${name} da pasta sincronizada…`, 'default');
    try {
      const file = await handle.getFile();
      const slice = await window.VessieEmulator.sliceForAnalysis(file);
      window.openEmulator(slice.bytes, name, source, {
        truncated: slice.truncated, fullSize: slice.fullSize
      });
    } catch (error) {
      toast(`Não foi possível abrir ${name}: ${error?.message || 'erro de leitura'}`, 'error');
    }
  }

async function writeRemoteFile(fileHandle, content) {
    const granted = await ensureRemotePermission(fileHandle, 'readwrite');
    if (!granted) throw new Error('o navegador não concedeu permissão de gravação');
    const writer = await fileHandle.createWritable();
    try {
      await writer.write(content);
      await writer.close();
    } catch (error) {
      await writer.abort().catch(() => {});
      throw error;
    }
  }

function remoteDownload(handle, name) {
    handle.getFile().then((file) => {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    }).catch((error) => {
      toast(`Não foi possível baixar ${name}: ${error?.message || 'erro de leitura'}`, 'error');
    });
  }

async function remoteImportToVfs(win, handle, name) {
    try {
      const file = await handle.getFile();
      const text = await file.text().catch(() => null);
      const targetDir = prompt('Importar para qual pasta local? (ex.: Downloads)', 'Downloads') || 'Downloads';
      const cleanDir = String(targetDir).trim().replace(/^\/+|\/+$/g, '') || 'Downloads';
      const payload = text !== null ? text : await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ''));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      VFS.write(`${cleanDir}/${name}`, payload);
      persistState();
      toast(`"${name}" importado para ${cleanDir}.`, 'success');
      if (!isRemotePath(currentExplorerPath(win))) renderFileGrid(win, currentExplorerPath(win));
    } catch (error) {
      toast(`Não foi possível importar ${name}: ${error?.message || 'erro de leitura'}`, 'error');
    }
  }

function feShowRemoteContextMenu(win, x, y, name, handle, path) {
    win.querySelector('.fectx')?.remove();
    const menu = document.createElement('div');
    menu.className = 'fectx';
    const isDir = handle.kind === 'directory';
    const type = isDir ? null : getFileType(name);
    const canEdit = !isDir && (type.kind === 'text' || type.kind === 'html' || type.kind === 'vl');
    const isExe = !isDir && type.kind === 'exe';
    const items = [];
    if (isExe) items.push(['exe', 'fa-cog', 'Abrir executável']);
    else items.push([isDir ? 'open' : canEdit ? 'edit' : 'view', isDir ? 'fa-folder-open' : 'fa-eye', isDir ? 'Abrir' : canEdit ? 'Editar com Copilot' : 'Visualizar']);
    if (!isDir) items.push(['download', 'fa-download', 'Baixar']);
    if (!isDir) items.push(['import', 'fa-file-import', 'Importar para Disco Local']);
    items.push([isDir ? 'ask-ai' : 'ask-ai-file', 'fa-wand-magic-sparkles', isDir ? 'Analisar pasta com Copilot' : 'Analisar arquivo com Copilot']);
    items.push(['sep']);
    items.push(['rename', 'fa-i-cursor', 'Renomear']);
    items.push(['delete', 'fa-trash', 'Excluir']);
    menu.innerHTML = items.map((it) => it[0] === 'sep' ? '<hr>' : `<div class="cti" data-act="${it[0]}"><i class="fas ${it[1]}"></i> ${it[2]}</div>`).join('');
    menu.querySelectorAll('[data-act]').forEach((el) => {
      el.onclick = async () => {
        const act = el.dataset.act;
        menu.remove();
        if (act === 'open') {
          S.currentPath = `${path}/${name}`;
          renderFileGrid(win, S.currentPath);
        } else if (act === 'exe') {
          openRemoteExe(win, name, handle, path);
        } else if (act === 'edit' || act === 'view') {
          openRemoteFile(win, name, handle, path);
        } else if (act === 'download') {
          remoteDownload(handle, name);
        } else if (act === 'import') {
          remoteImportToVfs(win, handle, name);
        } else if (act === 'ask-ai') {
          try {
            const location = getRemoteLocation(`${path}/${name}`);
            const summary = await readRemoteTree(location, 0, 2);
            openCopilotEditor(name, `${path}/${name}`, summary || '(pasta vazia)', null);
          } catch (error) {
            toast(`Não foi possível listar ${name}: ${error?.message || 'erro de leitura'}`, 'error');
          }
        } else if (act === 'ask-ai-file') {
          try {
            const file = await handle.getFile();
            const content = file.size > 150000 ? (await file.text()).slice(0, 150000) : await file.text();
            openCopilotEditor(name, `${path}/${name}`, content, async (updated) => {
              await writeRemoteFile(handle, updated);
              renderFileGrid(win, path, win.querySelector('#fe-search')?.value || '');
            });
          } catch (error) {
            toast(`Não foi possível ler ${name}: ${error?.message || 'erro de leitura'}`, 'error');
          }
        } else if (act === 'rename') {
          remoteRename(win, path, name);
        } else if (act === 'delete') {
          remoteDelete(win, path, name, handle);
        }
      };
    });
    win.appendChild(menu);
    const bounds = win.getBoundingClientRect();
    const mw = 240, mh = items.length * 36 + 16;
    menu.style.left = Math.max(0, Math.min((typeof x === 'number' ? x : bounds.width / 2) - bounds.left, bounds.width - mw)) + 'px';
    menu.style.top = Math.max(0, Math.min((typeof y === 'number' ? y : bounds.height / 2) - bounds.top, bounds.height - mh)) + 'px';
    const closeOnce = (event) => {
      if (!event.target.closest('.fectx')) {
        menu.remove();
        document.removeEventListener('click', closeOnce);
      }
    };
    setTimeout(() => document.addEventListener('click', closeOnce), 0);
  }

async function readRemoteTree(location, depth, maxDepth) {
    if (!location) return '';
    let directory = location.device.handle;
    for (const segment of location.parts) directory = await directory.getDirectoryHandle(segment);
    const lines = [];
    for await (const [name, handle] of directory.entries()) {
      lines.push(`${'  '.repeat(depth)}${handle.kind === 'directory' ? '[pasta]' : '[arquivo]'} ${name}`);
      if (handle.kind === 'directory' && depth < maxDepth) {
        const nested = await readRemoteTree({ device: location.device, parts: [...location.parts, name] }, depth + 1, maxDepth);
        if (nested) lines.push(nested);
      }
      if (lines.length >= 150) {
        lines.push('... listagem limitada a 150 entradas');
        break;
      }
    }
    return lines.join('\n');
  }

function openCopilotEditor(name, path, initialContent, saveContent) {
    const content = String(initialContent || '');
    if (content.length > 150000) {
      toast('Este arquivo excede o limite de 150 KB para edição assistida.', 'error');
      return;
    }
    const safe = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const assistant = createWin(`Copilot — ${name}`, '<i class="fas fa-wand-magic-sparkles"></i>', `
      <div class="fe-copilot">
        <header><strong>Vessie Copilot</strong><span>${safe(path)}</span></header>
        <div class="fe-copilot-body">
          <section class="fe-copilot-editor">
            <div class="fe-copilot-label">${saveContent ? 'Conteúdo atual' : 'Estrutura da pasta'}</div>
            <div class="fe-code-wrap"><pre class="fe-line-numbers"></pre><textarea class="fe-code" spellcheck="false">${safe(content)}</textarea></div>
          </section>
          <section class="fe-copilot-chat">
            <div class="fe-copilot-messages" aria-live="polite">Explique o que deseja alterar. A IA analisará o contexto; nenhuma alteração será salva sem sua confirmação.</div>
            <label class="fe-auto-evolve-control"><input class="fe-auto-evolve-toggle" type="checkbox"><span><strong>Auto-Evoluir</strong><small>Ativa análise proativa do item selecionado. Sugestões continuam exigindo revisão e confirmação manual.</small></span></label>
            <textarea class="fe-copilot-instruction" placeholder="Descreva a mudança desejada..."></textarea>
            <div class="fe-copilot-actions">
              <button class="fe-copilot-send" type="button">Perguntar ao LM Studio</button>
              <button class="fe-copilot-apply" type="button" ${saveContent ? '' : 'disabled'}>Aplicar edição</button>
            </div>
            <pre class="fe-copilot-result" aria-live="polite"></pre>
          </section>
        </div>
      </div>
    `, 1040, 680);
    const code = assistant.querySelector('.fe-code');
    const lines = assistant.querySelector('.fe-line-numbers');
    const messagesBox = assistant.querySelector('.fe-copilot-messages');
    const instruction = assistant.querySelector('.fe-copilot-instruction');
    const result = assistant.querySelector('.fe-copilot-result');
    const send = assistant.querySelector('.fe-copilot-send');
    const apply = assistant.querySelector('.fe-copilot-apply');
    const autoEvolveToggle = assistant.querySelector('.fe-auto-evolve-toggle');
    const updateLines = () => {
      const count = code.value.split('\n').length;
      lines.textContent = Array.from({ length: count }, (_, index) => index + 1).join('\n');
    };
    const chatHistory = [];
    let generatedContent = '';
    autoEvolveToggle.checked = localStorage.getItem('vessie_auto_evolve_enabled') === 'true';
    autoEvolveToggle.addEventListener('change', () => {
      localStorage.setItem('vessie_auto_evolve_enabled', String(autoEvolveToggle.checked));
      document.querySelectorAll('#vessie-auto-evolve').forEach((button) => {
        button.textContent = `Auto-Evoluir: ${autoEvolveToggle.checked ? 'ON' : 'OFF'}`;
        button.setAttribute('aria-pressed', String(autoEvolveToggle.checked));
      });
      document.querySelectorAll('.pm-auto-evolve-toggle').forEach((toggle) => {
        toggle.checked = autoEvolveToggle.checked;
      });
    });
    code.addEventListener('input', updateLines);
    code.addEventListener('scroll', () => { lines.scrollTop = code.scrollTop; });
    updateLines();
    if (!saveContent) code.readOnly = true;
    apply.disabled = true;

    send.onclick = async () => {
      const request = instruction.value.trim();
      if (!request) {
        toast('Descreva a alteração que deseja pedir.', 'error');
        return;
      }
      if (typeof window.VessieAIEngine?.chat !== 'function') {
        toast('A integração com LM Studio ainda não foi carregada.', 'error');
        return;
      }
      send.disabled = true;
      send.textContent = 'Consultando...';
      result.textContent = 'Conectando ao LM Studio...';
      const mode = saveContent
        ? `Retorne um resumo das mudanças e o arquivo completo atualizado em um bloco de código. Mantenha indentação, comentários e múltiplas linhas; não use reticências. Auto-Evoluir ${autoEvolveToggle.checked ? 'está ON: inclua também oportunidades de melhoria relacionadas ao item selecionado, cada uma com justificativa e validação proposta' : 'está OFF: limite-se ao pedido explícito'}. Em nenhum modo execute comandos, altere outros arquivos ou afirme que salvou alterações.`
        : 'Analise a estrutura fornecida e responda com um plano seguro e perguntas objetivas que faltarem. Não afirme que alterou arquivos.';
      const system = `Você é o assistente de código do VessieOS. Contexto selecionado: ${path}. Seja conciso e indique pressupostos. ${mode}`;
      const report = buildLocalContextReport(path, code.value);
      const userMessage = `RELATÓRIO LOCAL GERADO ANTES DA IA:\n${JSON.stringify(report, null, 2)}\n\nPedido: ${request}\n\nConteúdo atual:\n${code.value}`;
      messagesBox.textContent = `Relatório local criado (${report.lines} linhas, ${report.characters} caracteres).\n\nVocê: ${request}\nLM Studio: gerando resposta...`;
      try {
        const answer = await window.VessieAIEngine.chat([
          { role: 'system', content: system },
          ...chatHistory,
          { role: 'user', content: userMessage }
        ], { profile: 'balanced', maxTokens: 4096, temperature: 0.2 });
        chatHistory.push({ role: 'user', content: userMessage }, { role: 'assistant', content: answer });
        messagesBox.textContent = answer;
        const block = answer.match(/```[^\n]*\n([\s\S]*?)```/);
        generatedContent = block ? block[1].replace(/\n$/, '') : answer;
        result.textContent = generatedContent;
        apply.disabled = !saveContent || !block;
        if (saveContent && !block) {
          result.textContent = 'A resposta não contém um bloco de código completo. Peça à IA para retornar o arquivo atualizado entre crases triplas.';
        }
      } catch (error) {
        result.textContent = `Falha ao consultar LM Studio: ${error?.message || 'erro de conexão'}`;
        toast(`Falha ao consultar LM Studio: ${error?.message || 'erro de conexão'}`, 'error');
      } finally {
        send.disabled = false;
        send.textContent = 'Perguntar ao LM Studio';
      }
    };
    apply.onclick = async () => {
      if (!saveContent || !generatedContent) return;
      if (!confirm(`Aplicar a resposta da IA em "${path}"?`)) return;
      try {
        await saveContent(generatedContent);
        toast(`Alterações aplicadas em ${name}.`, 'success');
        assistant.querySelector('[data-act="cls"]')?.click();
      } catch (error) {
        toast(`Não foi possível salvar ${path}: ${error?.message || 'erro de gravação'}`, 'error');
      }
    };
    return assistant;
  }

function feUpdateStatus(win, fileCount, folderCount, location) {
    const status = win.querySelector('#fe-status');
    if (!status) return;
    status.replaceChildren();
    const counts = document.createElement('span');
    counts.textContent = `${folderCount} pasta(s), ${fileCount} arquivo(s)`;
    status.appendChild(counts);
    if (location) {
      const badge = document.createElement('span');
      badge.className = 'fe-remote-badge';
      badge.textContent = `🔌 ${location.device.label} · ${location.device.rootName}`;
      badge.title = `Pasta original: ${location.device.rootName}. O acesso fica restrito a ela.`;
      status.appendChild(badge);
    }
  }

function feShowContextMenu(win, x, y, name, path, val) {
    win.querySelector('.fectx')?.remove();
    const isDir = val && typeof val === 'object';
    const type = isDir ? null : getFileType(name);
    const menu = document.createElement('div');
    menu.className = 'fectx';
    const items = [];
    if (isDir) {
      items.push(['open', 'fa-folder-open', 'Abrir']);
      items.push(['ask-ai', 'fa-wand-magic-sparkles', 'Analisar pasta com Copilot']);
    } else if (type.kind === 'vl') {
      items.push(['run', 'fa-play', 'Executar']);
      items.push(['edit', 'fa-pen', 'Editar']);
      items.push(['ai', 'fa-wand-magic-sparkles', 'Editar com Copilot']);
    } else if (type.kind === 'html') {
      items.push(['run', 'fa-play', 'Abrir (renderizar)']);
      items.push(['edit', 'fa-pen', 'Editar como texto']);
      items.push(['ai', 'fa-wand-magic-sparkles', 'Editar com Copilot']);
    } else {
      items.push(['open', 'fa-eye', 'Abrir']);
      if (type.kind === 'text') items.push(['ai', 'fa-wand-magic-sparkles', 'Editar com Copilot']);
    }
    items.push(['rename', 'fa-i-cursor', 'Renomear']);
    if (!isDir) {
      // Alternativas da ponte de integração (VessieLang Studio, Navegador,
      // Editor de Texto, Music Player...) — só as capazes de abrir o arquivo.
      try {
        const fullPath = path ? `${path}/${name}` : name;
        const alternatives = window.VessieBridge ? window.VessieBridge.appsFor(fullPath) : [];
        alternatives.slice(0, 4).forEach((handler) => {
          items.push([`openwith:${handler.id}`, handler.icon || 'fa-external-link-alt', `Abrir com ${handler.label}`]);
        });
      } catch { /* menu segue sem alternativas */ }
    }
    items.push(['props', 'fa-circle-info', 'Propriedades']);
    items.push(['copy', 'fa-copy', 'Copiar']);
    items.push(['cut', 'fa-cut', 'Recortar']);
    if (win._feClip && win._feClip.names && win._feClip.names.length) {
      items.push(['paste', 'fa-paste', `Colar ${win._feClip.names.length} item(ns) aqui`]);
    }
    items.push(['sep']);
    items.push(['delete', 'fa-trash', 'Excluir']);
    menu.innerHTML = items.map((it) => it[0] === 'sep' ? '<hr>' : `<div class="cti" data-act="${it[0]}"><i class="fas ${it[1]}"></i> ${it[2]}</div>`).join('');
    win.appendChild(menu);
    const bounds = win.getBoundingClientRect();
    menu.style.left = Math.min(x - bounds.left, bounds.width - 200) + 'px';
    menu.style.top = Math.min(y - bounds.top, bounds.height - items.length * 34) + 'px';
    menu.querySelectorAll('[data-act]').forEach((el) => {
      el.onclick = () => {
        const act = el.dataset.act;
        menu.remove();
        if (act === 'open' || act === 'run') openFileByType(win, name, path, val, act === 'run');
        else if (act.startsWith('openwith:')) {
          const fullPath = path ? `${path}/${name}` : name;
          try {
            if (!window.VessieBridge.openWith(act.slice('openwith:'.length), fullPath)) {
              openFileByType(win, name, path, val);
            }
          } catch { openFileByType(win, name, path, val); }
        }
        else if (act === 'props') feShowProperties(win, name, path, val);
        else if (act === 'edit') openNotepadWithContent(name, val || '', path ? `${path}/${name}` : name);
        else if (act === 'ai' && typeof val === 'string') {
          const fullPath = path ? `${path}/${name}` : name;
          openCopilotEditor(name, fullPath, val, async (updated) => {
            VFS.write(fullPath, updated);
            persistState();
            renderFileGrid(win, path);
          });
        } else if (act === 'ask-ai' && isDir) {
          openCopilotEditor(name, path ? `${path}/${name}` : name, summarizeVfsFolder(val), null);
        }
        else if (act === 'rename') feRename(win, name, path);
        else if (act === 'copy') feClipboardCopy(win, path, [name], false);
        else if (act === 'cut') feClipboardCopy(win, path, [name], true);
        else if (act === 'paste') fePaste(win);
        else if (act === 'delete') deleteSelectedFiles(win);
      };
    });
    const closeOnce = (e) => { if (!e.target.closest('.fectx')) { menu.remove(); document.removeEventListener('click', closeOnce); } };
    setTimeout(() => document.addEventListener('click', closeOnce), 0);
  }

function summarizeVfsFolder(folder, depth = 0, lines = []) {
    if (!folder || typeof folder !== 'object' || depth > 3) return lines.join('\n');
    for (const [name, value] of Object.entries(folder)) {
      if (VFS.isLockedNode(value)) {
        lines.push(`${'  '.repeat(depth)}[bloqueado] ${name}`);
      } else if (value && typeof value === 'object') {
        lines.push(`${'  '.repeat(depth)}[pasta] ${name}`);
        summarizeVfsFolder(value, depth + 1, lines);
      } else {
        lines.push(`${'  '.repeat(depth)}[arquivo] ${name}`);
      }
      if (lines.length >= 150) {
        lines.push('... listagem limitada a 150 entradas');
        break;
      }
    }
    return lines.join('\n');
  }

function feRename(win, oldName, path) {
    const val = VFS.resolve(`${path}/${oldName}`);
    const novo = prompt('Novo nome:', oldName);
    if (!novo || !novo.trim() || novo === oldName) return;
    VFS.write(`${path}/${novo.trim()}`, val);
    VFS.delete(`${path}/${oldName}`);
    renderFileGrid(win, path);
    persistState();
    toast(`Renomeado para "${novo.trim()}"`, 'success');
  }

function openFileByType(win, name, path, val, forceRun) {
    const fullPath = path ? `${path}/${name}` : name;
    if (val && typeof val === 'object') { S.currentPath = fullPath; renderFileGrid(win, fullPath); return; }
    const type = getFileType(name);
    // HTML mantém a prévia embutida como ação padrão no Explorador;
    // o Navegador real aparece em "Abrir com" (e é o padrão fora daqui).
    if (type.kind === 'html' && forceRun !== false) { openHtmlPreviewWindow(name, val || ''); return; }
    // Roteamento pela ponte de integração (VessieLang Studio, Music Player,
    // Bloco de Notas...). Retorna true quando algum app assumiu o arquivo.
    try {
      if (window.VessieBridge && window.VessieBridge.openFile(fullPath)) return;
    } catch { /* cai para o comportamento legado abaixo */ }
    if (type.kind === 'vl') { runVlFile(fullPath, val || ''); return; }
    openNotepadWithContent(name, val || '', fullPath);
  }

function feShowProperties(win, name, path, val) {
    const fullPath = path ? `${path}/${name}` : name;
    const isDir = val && typeof val === 'object';
    const stat = VFS.stat(fullPath);
    const type = isDir ? null : getFileType(name);
    const rows = isDir
      ? [['Tipo', 'Pasta de arquivos'], ['Itens', String(Object.keys(val).length)], ['Caminho', fullPath]]
      : [['Tipo', `${type.label} (.${stat.ext || '?'})`], ['Tamanho', feFormatSize(stat.size)], ['Criado', feFormatDate(stat.created)], ['Modificado', feFormatDate(stat.modified)], ['Caminho', fullPath]];
    const props = createWin(`Propriedades — ${name}`, '📋', `
      <div class="fe-props">
        <div class="fe-props-head"><i class="fas ${isDir ? 'fa-folder' : type.icon}" style="color:${isDir ? '#ffb74d' : type.color}"></i><strong></strong></div>
        <table>${rows.map(([k, v]) => `<tr><th></th><td></td></tr>`).join('')}</table>
        <div class="fe-props-actions"><button type="button" data-act="reveal">Revelar no Explorador</button></div>
      </div>`, 380, 380);
    props.querySelector('.fe-props-head strong').textContent = name;
    const cells = props.querySelectorAll('.fe-props table tr');
    cells.forEach((tr, i) => {
      tr.children[0].textContent = rows[i][0];
      tr.children[1].textContent = rows[i][1];
    });
    const reveal = props.querySelector('[data-act="reveal"]');
    if (reveal) reveal.onclick = () => {
      try {
        if (window.VessieBridge) window.VessieBridge.revealInExplorer(fullPath);
        else { S.currentPath = path; renderFileGrid(win, path); }
      } catch { /* ignore */ }
    };
  }

function feNewFromTemplate(win) {
    const target = currentExplorerPath(win);
    if (isRemotePath(target)) {
      toast('Modelos estão disponíveis apenas para o Disco Local nesta versão.', 'error');
      return;
    }
    let models = [];
    try { models = VFS.list('Modelos') || []; } catch { models = []; }
    models = models.filter((n) => typeof VFS.read(`Modelos/${n}`) === 'string');
    if (!models.length) {
      toast('Nenhum modelo encontrado em Modelos/.', 'error');
      return;
    }
    const pick = prompt(`Modelos disponíveis:\n${models.map((m, i) => `${i + 1}. ${m}`).join('\n')}\n\nDigite o número do modelo:`);
    const idx = Number(pick) - 1;
    if (!models[idx]) return;
    const templateName = models[idx];
    const content = VFS.read(`Modelos/${templateName}`);
    const name = (prompt('Nome do novo arquivo:', templateName) || '').trim();
    if (!name) return;
    if (VFS.resolve(`${target}/${name}`) !== null && VFS.resolve(`${target}/${name}`) !== undefined) {
      if (!confirm(`"${name}" já existe. Substituir?`)) return;
    }
    VFS.write(`${target}/${name}`, content);
    persistState();
    renderFileGrid(win, target);
    toast(`"${name}" criado a partir do modelo ${templateName}.`, 'success');
  }

function runVlFile(path, content) {
    const manager = window.VessieOS && window.VessieOS.vessielang;
    if (!manager || !manager.isAvailable || !manager.isAvailable()) {
      toast('Motor VessieLang ainda não carregou — tente novamente em instantes', 'error');
      return;
    }
    const registro = manager.run(content, { nome: path });
    showVlOutputWindow(path, registro);
  }

function showVlOutputWindow(path, registro) {
    const win = createWin(`Console — ${path.split('/').pop()}`, '💻', `
      <div class="vlconsole" id="vlc-out">
        <div class="vlc-meta">Dialeto detectado: <strong>${registro.nivel || '?'}</strong> · ${path}</div>
        <div class="${registro.erro ? 'vlc-err' : 'vlc-ok'}"></div>
      </div>
    `, 460, 360);
    win.querySelector('.vlc-err, .vlc-ok').textContent = registro.saida || '(sem saída)';
  }

function openHtmlPreviewWindow(name, html) {
    const win = createWin(name, '🌐', `<iframe class="html-preview-frame" style="width:100%;height:100%;border:none;background:#fff"></iframe>`, 700, 560);
    win.querySelector('iframe').srcdoc = html;
  }

window.feNewFolder = function (win) {
    const target = currentExplorerPath(win);
    if (isRemotePath(target)) {
      remoteCreateFolder(win, target);
      return;
    }
    const n = prompt('Nome da pasta:');
    if (n && n.trim()) {
      VFS.write(`${target}/${n.trim()}`, {});
      renderFileGrid(win, target);
      persistState();
      toast(`Pasta "${n}" criada!`, 'success');
    }
  };

window.feNewFile = function (win) {
    const target = currentExplorerPath(win);
    if (isRemotePath(target)) {
      remoteCreateFile(win, target, '');
      return;
    }
    const n = prompt('Nome do arquivo:');
    if (n && n.trim()) {
      VFS.write(`${target}/${n.trim()}`, '');
      renderFileGrid(win, target);
      persistState();
      toast(`Arquivo "${n}" criado!`, 'success');
    }
  };

window.feNewVlScript = function (win) {
    let n = prompt('Nome do script VessieLang:', 'script.vl');
    if (!n || !n.trim()) return;
    n = n.trim();
    if (!n.toLowerCase().endsWith('.vl')) n += '.vl';
    const template = `// ${n} — script VessieLang\nescreva("Ola do VessieLang!");\ngui.notify("VessieLang", "Script iniciado", "success");\n`;
    const target = currentExplorerPath(win);
    if (isRemotePath(target)) {
      remoteCreateFile(win, target, template, n);
      return;
    }
    VFS.write(`${target}/${n}`, template);
    renderFileGrid(win, target);
    persistState();
    toast(`Script "${n}" criado! Clique duas vezes para executar.`, 'success');
  };

async function remoteCreateFolder(win, path) {
    const location = getRemoteLocation(path);
    if (!location) return;
    const raw = prompt('Nome da pasta remota:');
    const name = sanitizeRemoteName(raw);
    if (!name) return;
    try {
      const ok = await ensureRemotePermission(location.device.handle, 'readwrite');
      if (!ok) throw new Error('o navegador não concedeu permissão de gravação');
      const dir = await resolveRemoteDir(location.device, location.parts);
      try {
        await dir.getDirectoryHandle(name);
        toast(`"${name}" já existe nesta pasta.`, 'error');
        return;
      } catch (e) {
        if (e?.name !== 'NotFoundError') throw e;
      }
      await dir.getDirectoryHandle(name, { create: true });
      renderFileGrid(win, path, win.querySelector('#fe-search')?.value || '');
      toast(`Pasta remota "${name}" criada.`, 'success');
    } catch (error) {
      toast(`Não foi possível criar a pasta: ${error?.message || 'erro de gravação'}`, 'error');
    }
  }

async function remoteCreateFile(win, path, initialContent = '', suggestedName) {
    const location = getRemoteLocation(path);
    if (!location) return;
    const raw = suggestedName || prompt('Nome do arquivo remoto:');
    const name = sanitizeRemoteName(raw);
    if (!name) return;
    try {
      const ok = await ensureRemotePermission(location.device.handle, 'readwrite');
      if (!ok) throw new Error('o navegador não concedeu permissão de gravação');
      const dir = await resolveRemoteDir(location.device, location.parts);
      try {
        await dir.getFileHandle(name);
        toast(`"${name}" já existe nesta pasta.`, 'error');
        return;
      } catch (e) {
        if (e?.name !== 'NotFoundError' && e?.name !== 'TypeMismatchError') throw e;
      }
      const fileHandle = await dir.getFileHandle(name, { create: true });
      if (initialContent) await writeRemoteFile(fileHandle, initialContent);
      renderFileGrid(win, path, win.querySelector('#fe-search')?.value || '');
      toast(`Arquivo remoto "${name}" criado.`, 'success');
    } catch (error) {
      toast(`Não foi possível criar o arquivo: ${error?.message || 'erro de gravação'}`, 'error');
    }
  }

async function remoteRename(win, path, oldName) {
    const location = getRemoteLocation(path);
    if (!location) return;
    const raw = prompt('Novo nome:', oldName);
    const next = sanitizeRemoteName(raw);
    if (!next || next === oldName) return;
    try {
      const ok = await ensureRemotePermission(location.device.handle, 'readwrite');
      if (!ok) throw new Error('o navegador não concedeu permissão de gravação');
      const dir = await resolveRemoteDir(location.device, location.parts);
      let source;
      try {
        source = await dir.getDirectoryHandle(oldName).catch(() => null) || await dir.getFileHandle(oldName);
      } catch {
        toast(`"${oldName}" não foi encontrado.`, 'error');
        return;
      }
      const exists = await dir.getDirectoryHandle(next).then(() => true).catch(() => dir.getFileHandle(next).then(() => true).catch(() => false));
      if (exists) {
        toast(`"${next}" já existe nesta pasta.`, 'error');
        return;
      }
      if (source.kind === 'file') {
        const file = await source.getFile();
        const dest = await dir.getFileHandle(next, { create: true });
        await writeRemoteFile(dest, await file.arrayBuffer());
      } else {
        const dest = await dir.getDirectoryHandle(next, { create: true });
        await copyRemoteDir(source, dest);
      }
      await dir.removeEntry(oldName, { recursive: true });
      renderFileGrid(win, path, win.querySelector('#fe-search')?.value || '');
      toast(`Renomeado para "${next}".`, 'success');
    } catch (error) {
      toast(`Não foi possível renomear: ${error?.message || 'erro de gravação'}`, 'error');
    }
  }

async function copyRemoteDir(source, dest) {
    for await (const [name, handle] of source.entries()) {
      if (handle.kind === 'file') {
        const file = await handle.getFile();
        const target = await dest.getFileHandle(name, { create: true });
        await writeRemoteFile(target, await file.arrayBuffer());
      } else {
        const target = await dest.getDirectoryHandle(name, { create: true });
        await copyRemoteDir(handle, target);
      }
    }
  }

async function remoteDelete(win, path, name, handle) {
    const location = getRemoteLocation(path);
    if (!location) return;
    const isDir = (handle && handle.kind === 'directory') || (await resolveRemoteEntryKind(location, name)) === 'directory';
    if (!confirm(`Excluir "${name}" da pasta remota?\n${isDir ? 'Todo o conteúdo da pasta será excluído.' : 'Esta ação não pode ser desfeita.'}`)) return;
    try {
      const ok = await ensureRemotePermission(location.device.handle, 'readwrite');
      if (!ok) throw new Error('o navegador não concedeu permissão de gravação');
      const dir = await resolveRemoteDir(location.device, location.parts);
      await dir.removeEntry(name, { recursive: !!isDir });
      delete win.dataset.selectedFile;
      renderFileGrid(win, path, win.querySelector('#fe-search')?.value || '');
      renderRemotePreviewEmpty(win);
      toast(`"${name}" excluído do dispositivo remoto.`, 'success');
    } catch (error) {
      toast(`Não foi possível excluir: ${error?.message || 'erro de gravação'}`, 'error');
    }
  }

async function resolveRemoteEntryKind(location, name) {
    try {
      const dir = await resolveRemoteDir(location.device, location.parts);
      try {
        await dir.getDirectoryHandle(name);
        return 'directory';
      } catch {
        return 'file';
      }
    } catch {
      return 'file';
    }
  }

function renderRemotePreviewEmpty(win) {
    const media = win.querySelector('#fe-media');
    const meta = win.querySelector('#fe-meta');
    const actions = win.querySelector('#fe-actions');
    if (media) media.innerHTML = '<span style="color:var(--dim)">Selecione um item para ver detalhes</span>';
    if (meta) meta.innerHTML = '';
    if (actions) actions.innerHTML = '';
  }

function uploadToCurrentFolder(win) {
    const target = currentExplorerPath(win);
    if (!isRemotePath(target)) {
      toast('Selecione uma pasta Remote Device para enviar arquivos.', 'error');
      return;
    }
    const picker = document.createElement('input');
    picker.type = 'file';
    picker.multiple = true;
    picker.onchange = async () => {
      const files = [...(picker.files || [])];
      if (!files.length) return;
      await remoteUploadFiles(win, target, files);
      picker.remove();
    };
    picker.click();
  }

async function remoteUploadFiles(win, path, files) {
    const location = getRemoteLocation(path);
    if (!location) return;
    try {
      const ok = await ensureRemotePermission(location.device.handle, 'readwrite');
      if (!ok) throw new Error('o navegador não concedeu permissão de gravação');
      const dir = await resolveRemoteDir(location.device, location.parts);
      let saved = 0, skipped = 0;
      for (const file of files) {
        const name = sanitizeRemoteName(file.name);
        if (!name) { skipped++; continue; }
        try {
          const exists = await dir.getFileHandle(name).then(() => true).catch(() => false);
          if (exists) {
            if (!confirm(`"${name}" já existe. Substituir?`)) { skipped++; continue; }
          }
          const target = await dir.getFileHandle(name, { create: true });
          await writeRemoteFile(target, await file.arrayBuffer());
          saved++;
        } catch {
          skipped++;
        }
      }
      renderFileGrid(win, path, win.querySelector('#fe-search')?.value || '');
      toast(saved ? `${saved} arquivo(s) enviado(s).${skipped ? ` ${skipped} ignorado(s).` : ''}` : 'Nenhum arquivo foi enviado.', saved ? 'success' : 'error');
    } catch (error) {
      toast(`Não foi possível enviar: ${error?.message || 'erro de gravação'}`, 'error');
    }
  }

function enableRemoteDrop(win, grid, path) {
    if (grid.dataset.remoteDrop === '1') return;
    grid.dataset.remoteDrop = '1';
    grid.addEventListener('dragover', (event) => {
      const current = currentExplorerPath(win);
      if (!isRemotePath(current)) return;
      event.preventDefault();
    });
    grid.addEventListener('drop', (event) => {
      const current = currentExplorerPath(win);
      const location = getRemoteLocation(current);
      if (!location) return;
      const files = event.dataTransfer?.files;
      if (!files || !files.length) return;
      event.preventDefault();
      remoteUploadFiles(win, current, [...files]);
    });
  }

window.feBack = function (win) {
    if (!win || !win.querySelector) win = win.closest ? win.closest('.win') : win;
    if (S.currentPath && S.currentPath.includes('/')) {
      S.currentPath = S.currentPath.split('/').slice(0, -1).join('/');
    } else {
      S.currentPath = '';
    }
    if (win) renderFileGrid(win, S.currentPath);
  };

function renderFilePreview(win, name, val) {
    const media = win.querySelector('#fe-media');
    const meta = win.querySelector('#fe-meta');
    const actions = win.querySelector('#fe-actions');
    if (!media || !meta) return;
    media.innerHTML = '';
    meta.innerHTML = '';
    if (actions) actions.innerHTML = '';
    if (!name) {
      media.innerHTML = '<span style="color:var(--dim)">Selecione um item para ver detalhes</span>';
      return;
    }
    const path = win.dataset.selectedPath ?? S.currentPath;
    const fullPath = path ? `${path}/${name}` : name;
    const isDir = val && typeof val === 'object';
    const stat = VFS.stat(fullPath);

    if (isDir) {
      media.innerHTML = `<i class="fas fa-folder" style="font-size:2.6rem;color:#ffb74d"></i>`;
      meta.innerHTML = `
          <div><strong>Nome</strong><div>${feEscapeHtml(name)}</div></div>
        <div><strong>Tipo</strong><div>Pasta de arquivos</div></div>
        <div><strong>Itens</strong><div>${Object.keys(val).length}</div></div>
        <div><strong>Caminho</strong><div>${feEscapeHtml(fullPath)}</div></div>`;
      actions.innerHTML = `<button class="primary" data-act="open"><i class="fas fa-folder-open"></i> Abrir</button><button data-act="delete"><i class="fas fa-trash"></i> Excluir</button>`;
    } else {
      const type = getFileType(name);
      const lower = name.toLowerCase();
      if (type.kind === 'exe') {
        media.innerHTML = `<i class="fas ${type.icon}" style="font-size:2.6rem;color:${type.color}"></i>`;
      } else if (typeof val === 'string' && val.trim().match(/^https?:\/\//i)) {
        if (lower.match(/\.(gif|webp|jpe?g|png)(\?.*)?$/i)) { const img = document.createElement('img'); img.src = val; img.alt = name; media.appendChild(img); }
        else if (lower.match(/\.(mp4|webm|ogg)(\?.*)?$/i)) { const vid = document.createElement('video'); vid.src = val; vid.controls = true; vid.muted = true; media.appendChild(vid); }
        else { const iframe = document.createElement('iframe'); iframe.src = val; iframe.sandbox = 'allow-same-origin allow-scripts allow-popups'; media.appendChild(iframe); }
      } else if (typeof val === 'string' && val.startsWith('data:image')) {
        const img = document.createElement('img'); img.src = val; img.alt = name; media.appendChild(img);
      } else if (typeof val === 'string') {
        const txt = document.createElement('textarea'); txt.readOnly = true; txt.value = val; media.appendChild(txt);
      } else {
        media.innerHTML = `<i class="fas ${type.icon}" style="font-size:2.6rem;color:${type.color}"></i>`;
      }
      meta.innerHTML = `
        <div><strong>Nome</strong><div>${feEscapeHtml(name)}</div></div>
        <div><strong>Tipo</strong><div>${type.label}${type.kind === 'vl' ? ' (.vl)' : ''}</div></div>
        <div><strong>Tamanho</strong><div>${feFormatSize(stat.size)}</div></div>
        <div><strong>Criado</strong><div>${feFormatDate(stat.created)}</div></div>
        <div><strong>Modificado</strong><div>${feFormatDate(stat.modified)}</div></div>
        <div><strong>Caminho</strong><div>${feEscapeHtml(fullPath)}</div></div>`;
      if (type.kind === 'vl') actions.innerHTML = `<button class="primary" data-act="run"><i class="fas fa-play"></i> Executar</button><button data-act="studio"><i class="fas fa-code"></i> Studio</button><button data-act="edit"><i class="fas fa-pen"></i> Editar</button><button data-act="delete"><i class="fas fa-trash"></i> Excluir</button>`;
      else if (type.kind === 'html') actions.innerHTML = `<button class="primary" data-act="run"><i class="fas fa-play"></i> Abrir</button><button data-act="browser"><i class="fas fa-globe"></i> Navegador</button><button data-act="edit"><i class="fas fa-pen"></i> Editar</button><button data-act="delete"><i class="fas fa-trash"></i> Excluir</button>`;
      else if (type.kind === 'exe') actions.innerHTML = `<button class="primary" data-act="emu"><i class="fas fa-cog"></i> Abrir no Emulador</button><button data-act="delete"><i class="fas fa-trash"></i> Excluir</button>`;
      else actions.innerHTML = `<button class="primary" data-act="open"><i class="fas fa-eye"></i> Abrir</button><button data-act="delete"><i class="fas fa-trash"></i> Excluir</button>`;
    }
    actions?.querySelectorAll('[data-act]').forEach((btn) => {
      btn.onclick = () => {
        const act = btn.dataset.act;
        if (act === 'open') openFileByType(win, name, path, val);
        else if (act === 'emu') {
          try {
            if (!(window.VessieBridge && window.VessieBridge.openWith('emulator', fullPath))) toast('Emulador indisponível.', 'error');
          } catch { toast('Emulador indisponível.', 'error'); }
        }
        else if (act === 'run') openFileByType(win, name, path, val, true);
        else if (act === 'studio') {
          try {
            if (!(window.VessieBridge && window.VessieBridge.openWith('vessielang', fullPath))) openFileByType(win, name, path, val);
          } catch { openFileByType(win, name, path, val); }
        }
        else if (act === 'browser') {
          try {
            if (!(window.VessieBridge && window.VessieBridge.openWith('browser', fullPath))) openFileByType(win, name, path, val, true);
          } catch { openFileByType(win, name, path, val, true); }
        }
        else if (act === 'edit') openNotepadWithContent(name, val || '', fullPath);
        else if (act === 'delete') deleteSelectedFiles(win);
      };
    });
  }

window.deleteSelectedFiles = function (win) {
    const path = win.dataset.selectedPath ?? S.currentPath;
    const names = feSelectedNames(win);
    const single = names.length <= 1 ? (win.dataset.selectedFile || names[0]) : null;
    if (!names.length && !single) { toast('Selecione um item primeiro', 'error'); return; }
    const location = getRemoteLocation(path);
    // ---- remoto ----
    if (location) {
      if (names.length > 1) {
        if (!confirm(`Excluir ${names.length} itens da pasta remota?\nEsta ação não pode ser desfeita.`)) return;
        (async () => {
          try {
            const ok = await ensureRemotePermission(location.device.handle, 'readwrite');
            if (!ok) throw new Error('o navegador não concedeu permissão de gravação');
            const dir = await resolveRemoteDir(location.device, location.parts);
            let done = 0;
            for (const n of names) {
              try { await dir.removeEntry(n, { recursive: true }); done++; } catch { /* segue */ }
            }
            renderFileGrid(win, path, win.querySelector('#fe-search')?.value || '');
            renderRemotePreviewEmpty(win);
            toast(done ? `${done} item(ns) excluído(s).` : 'Nada foi excluído.', done ? 'success' : 'error');
          } catch (error) {
            toast(`Não foi possível excluir: ${error?.message || 'erro de gravação'}`, 'error');
          }
        })();
        return;
      }
      const name = single;
      if (!name) { toast('Selecione um item primeiro', 'error'); return; }
      resolveRemoteDir(location.device, location.parts).then(async (dir) => {
        let handle = null;
        try {
          handle = await dir.getDirectoryHandle(name).catch(() => null) || await dir.getFileHandle(name);
        } catch {
          handle = null;
        }
        remoteDelete(win, path, name, handle);
      }).catch((error) => {
        toast(`Não foi possível excluir: ${error?.message || 'erro de leitura'}`, 'error');
      });
      return;
    }
    // ---- local ----
    if (names.length > 1) {
      const locked = names.filter((n) => {
        try { return VFS.isLockedNode(VFS.resolve(`${path}/${n}`)); } catch { return true; }
      });
      const ok = names.filter((n) => !locked.includes(n));
      if (!ok.length) { toast('Nenhum item permitido para exclusão.', 'error'); return; }
      if (!confirm(`Excluir ${ok.length} ${ok.length === 1 ? 'item' : 'itens'} de ${path || 'Disco Local (C:)'}?`)) return;
      let done = 0;
      ok.forEach((n) => { try { VFS.delete(`${path}/${n}`); done++; } catch { /* segue */ } });
      renderFileGrid(win, path);
      renderFilePreview(win, null, null);
      persistState();
      toast(done ? `${done} item(ns) excluído(s).${locked.length ? ` ${locked.length} bloqueado(s) ignorado(s).` : ''}` : 'Nada foi excluído.', done ? 'success' : 'error');
      return;
    }
    const name = single;
    if (!name) { toast('Selecione um item primeiro', 'error'); return; }
    if (!confirm(`Excluir "${name}" de ${path || 'Disco Local (C:)'}?`)) return;
    VFS.delete(`${path}/${name}`);
    renderFileGrid(win, path);
    delete win.dataset.selectedFile;
    delete win.dataset.selectedPath;
    renderFilePreview(win, null, null);
    persistState();
    toast(`"${name}" excluído`, 'success');
  };
window.deleteSelectedFile = function (win) { window.deleteSelectedFiles(win); };
window.openExplorer = openExplorer;
})();

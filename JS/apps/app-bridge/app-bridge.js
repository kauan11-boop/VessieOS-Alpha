// app-bridge.js — ponte de integração entre aplicativos do VessieOS (Fase 1)
// Expõe window.VessieBridge:
//   registerHandler({ id, label, icon, exts, canOpen(path), open(path) })
//   appsFor(fullPath) -> handlers capazes de abrir o arquivo
//   openWith(id, fullPath) -> abre com um handler específico
//   openFile(fullPath) -> abre com o handler padrão (true) ou false
//   revealInExplorer(fullPath) -> mostra o item no Explorador
//   ensureStarterContent() -> cria Modelos/Projetos/Guias iniciais sem sobrescrever
// Depende apenas de globais do kernel (S, VFS, toast, persistState, openApp).
(function () {
  "use strict";

  const handlers = [];
  const STARTER_FLAG = 'vessie_starter_v1';

  function extOf(path) {
    const base = String(path || '').split('/').pop() || '';
    const dot = base.lastIndexOf('.');
    return dot > 0 ? base.slice(dot + 1).toLowerCase() : '';
  }

  function baseOf(path) {
    return String(path || '').split('/').pop() || String(path || '');
  }

  function parentOf(path) {
    const parts = String(path || '').split('/').filter(Boolean);
    parts.pop();
    return parts.join('/');
  }

  function readText(path) {
    try {
      const value = VFS.read(path);
      return typeof value === 'string' ? value : null;
    } catch {
      return null;
    }
  }

  function isPlayableAudioValue(value) {
    return typeof value === 'string' && /^(data:audio|https?:\/\/)/i.test(value.trim());
  }

  function isViewableBlobValue(value) {
    return typeof value === 'string' && /^(data:(image|video|audio|text\/html)|https?:\/\/)/i.test(value.trim());
  }

  function openWithApp(id, fullPath) {
    const handler = handlers.find((h) => h.id === id);
    if (!handler) return false;
    try {
      return handler.open(fullPath) !== false;
    } catch (error) {
      if (typeof toast === 'function') toast(`Não foi possível abrir: ${error?.message || 'erro'}`, 'error');
      return false;
    }
  }

  function appsFor(fullPath) {
    let node = null;
    try { node = VFS.resolve(fullPath); } catch { node = null; }
    if (node && typeof node === 'object') return [];
    return handlers.filter((handler) => {
      try {
        if (handler.exts && !handler.exts.includes(extOf(fullPath))) return false;
        return handler.canOpen ? !!handler.canOpen(fullPath) : true;
      } catch {
        return false;
      }
    });
  }

  function openFile(fullPath) {
    let node = null;
    try { node = VFS.resolve(fullPath); } catch { node = null; }
    if (node && typeof node === 'object') {
      revealInExplorer(fullPath);
      return true;
    }
    if (node === null || node === undefined) {
      if (typeof toast === 'function') toast(`Arquivo não encontrado: ${baseOf(fullPath)}`, 'error');
      return false;
    }
    const options = appsFor(fullPath);
    if (!options.length) return false;
    return openWithApp(options[0].id, fullPath);
  }

  function revealInExplorer(fullPath) {
    let node = null;
    try { node = VFS.resolve(fullPath); } catch { node = null; }
    const target = (node && typeof node === 'object') ? String(fullPath) : parentOf(fullPath);
    try { S.currentPath = target; } catch { /* sem estado global */ }
    try {
      if (typeof window.openApp === 'function') window.openApp('explorer');
      else if (typeof window.openExplorer === 'function') window.openExplorer();
      else return false;
      return true;
    } catch {
      return false;
    }
  }

  function registerDefaults() {
    // Bloco de Notas — texto simples
    registerHandler({
      id: 'notepad', label: 'Bloco de Notas', icon: 'fa-note-sticky',
      exts: ['txt', 'md', 'json', 'js', 'css', 'log', 'ini', 'cfg'],
      canOpen: (path) => typeof window.openNotepadWithContent === 'function' && readText(path) !== null,
      open: (path) => {
        window.openNotepadWithContent(baseOf(path), readText(path) || '', path);
        return true;
      }
    });
    // Word — documentos formatados
    registerHandler({
      id: 'word', label: 'Editor de Texto', icon: 'fa-file-word',
      exts: ['txt', 'md', 'html', 'htm'],
      canOpen: (path) => typeof window.openWordProcessor === 'function' && readText(path) !== null,
      open: (path) => {
        const text = readText(path) || '';
        const html = extOf(path) === 'html' || extOf(path) === 'htm'
          ? text
          : `<p>${text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '</p><p>')}</p>`;
        window.openWordProcessor(html, path);
        return true;
      }
    });
    // VessieLang Studio — scripts .vl
    registerHandler({
      id: 'vessielang', label: 'VessieLang Studio', icon: 'fa-code',
      exts: ['vl'],
      canOpen: (path) => (typeof window.openVessieLangStudioWith === 'function' || typeof window.openVessieLangStudio === 'function') && readText(path) !== null,
      open: (path) => {
        const content = readText(path) || '';
        if (typeof window.openVessieLangStudioWith === 'function') window.openVessieLangStudioWith(baseOf(path), content);
        else window.openVessieLangStudio();
        return true;
      }
    });
    // Navegador — páginas e mídia com dados
    registerHandler({
      id: 'browser', label: 'Navegador', icon: 'fa-globe',
      exts: ['html', 'htm', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4', 'webm'],
      canOpen: (path) => {
        if (typeof window.openBrowserWith !== 'function') return false;
        const value = readText(path);
        if (value === null) return false;
        if (['html', 'htm'].includes(extOf(path))) return true;
        return isViewableBlobValue(value);
      },
      open: (path) => {
        const value = readText(path) || '';
        const ext = extOf(path);
        let url = value.trim();
        if (ext === 'html' || ext === 'htm') {
          const blob = new Blob([value], { type: 'text/html;charset=utf-8' });
          url = URL.createObjectURL(blob);
        }
        window.openBrowserWith(url, baseOf(path));
        return true;
      }
    });
    // Music Player — áudios com fonte reproduzível
    registerHandler({
      id: 'music', label: 'Music Player', icon: 'fa-music',
      exts: ['mp3', 'wav', 'ogg', 'm4a'],
      canOpen: (path) => typeof window.openMusicWith === 'function' && isPlayableAudioValue(readText(path)),
      open: (path) => {
        window.openMusicWith(readText(path).trim(), baseOf(path));
        return true;
      }
    });
    // Emulador — executáveis Windows/DOS (kernel)
    registerHandler({
      id: 'emulator', label: 'Emulador', icon: 'fa-cog',
      exts: ['exe', 'com', 'bat', 'cmd', 'msi'],
      canOpen: (path) => {
        if (typeof window.openEmulatorForVfs !== 'function' || !window.VessieEmulator) return false;
        const value = readText(path);
        if (value === null) return false;
        const ext = extOf(path);
        if (ext === 'bat' || ext === 'cmd' || ext === 'com') return true;
        return value.startsWith('MZ');
      },
      open: (path) => window.openEmulatorForVfs(path)
    });
  }

  function registerHandler(info) {
    if (!info || !info.id || typeof info.open !== 'function') return null;
    const existing = handlers.findIndex((h) => h.id === info.id);
    if (existing >= 0) handlers[existing] = info;
    else handlers.push(info);
    return info;
  }

  // ---- Conteúdo inicial (nunca sobrescreve nada existente) ----
  const STARTER_FILES = {
    'Modelos/documento.txt': 'Título do documento\n===================\n\nEscreva aqui. Este é um modelo inicial do VessieOS.\n',
    'Modelos/notas.md': '# Notas\n\n- [ ] Primeira tarefa\n- [ ] Segunda tarefa\n\n> Dica: abra este arquivo no Bloco de Notas ou no Editor de Texto.\n',
    'Modelos/pagina.html': '<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n<title>Minha página</title>\n<style>\nbody { font-family: Segoe UI, sans-serif; padding: 32px; background: #0f172a; color: #e2e8f0; }\n</style>\n</head>\n<body>\n<h1>Olá, VessieOS!</h1>\n<p>Duplo-clique para visualizar, botão direito para abrir no Navegador.</p>\n</body>\n</html>\n',
    'Modelos/script.vl': '// modelo.vl — script VessieLang\nescreva("Ola do VessieLang!");\ngui.notify("VessieLang", "Script iniciado", "success");\n',
    'Projetos/MeuSite/index.html': '<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n<title>MeuSite</title>\n</head>\n<body>\n<h1>Meu primeiro projeto</h1>\n<p>Edite este arquivo e visualize no Navegador via "Abrir com".</p>\n</body>\n</html>\n',
    'Documentos/Projetos/exemplo.vl': '// exemplo.vl — abra no VessieLang Studio pelo Explorador\nescreva("Explore as APIs vessieos, ai, net e collector.");\n',
    'Documentos/Guias/Bem-vindo-ao-VessieOS.md': '# Bem-vindo ao VessieOS\n\n## O que há de novo\n\n- **Abrir com**: clique com o botão direito em qualquer arquivo do Explorador.\n- **Terminal**: digite `open <arquivo>` para abrir no app associado.\n- **Modelos**: use o botão Modelo no Explorador para criar arquivos a partir de templates.\n\n## Pastas\n\n- `Modelos/` — templates prontos de documento, página, script e notas.\n- `Projetos/MeuSite/` — projeto web de exemplo.\n- `Documentos/Projetos/` — scripts VessieLang listados no Studio.\n'
  };

  function ensureStarterContent() {
    try {
      if (localStorage.getItem(STARTER_FLAG) === '1') return false;
    } catch { /* sem localStorage */ }
    let created = 0;
    Object.entries(STARTER_FILES).forEach(([path, content]) => {
      try {
        if (typeof VFS.exists === 'function' ? VFS.exists(path) : VFS.resolve(path) !== null) return;
        if (VFS.write(path, content)) created++;
      } catch { /* ignora item individual */ }
    });
    if (created > 0) {
      try { if (typeof persistState === 'function') persistState(); } catch { /* ignore */ }
    }
    try { localStorage.setItem(STARTER_FLAG, '1'); } catch { /* ignore */ }
    return created > 0;
  }

  // ---- views por app (pasta JS/apps/<nome>/ com view.html + view.css) ----
  // loadView(app, fallback, data): busca view.html/view.css relativos ao
  // index (mesma origem do boot), injeta o CSS uma vez e devolve o HTML com
  // os {{tokens}} preenchidos por `data`. Se o fetch falhar (ex.: file://),
  // usa o fallback inline (modelos ${} avaliados pelo próprio app) — o app
  // abre idêntico nos dois caminhos. Cache em memória por app.
  const viewCache = new Map();

  function appFileUrl(app, file) {
    return new URL(`JS/apps/${app}/${file}`, document.baseURI).href;
  }

  function injectViewCss(app, css) {
    if (!css) return;
    if (document.querySelector(`style[data-app-view="${app}"]`)) return;
    const style = document.createElement('style');
    style.setAttribute('data-app-view', app);
    style.textContent = css;
    document.head.appendChild(style);
  }

  function fillTokens(html, data) {
    const dict = data || {};
    return String(html).replace(/\{\{(\w+)\}\}/g, (m, key) =>
      Object.prototype.hasOwnProperty.call(dict, key) ? String(dict[key] ?? '') : m);
  }

  async function fetchText(url) {
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.text();
  }

  function loadView(app, fallback, data) {
    const cached = viewCache.get(app);
    if (cached) {
      return Promise.resolve({
        html: fillTokens(cached.html, data),
        css: cached.css, fromCache: true, remote: true
      });
    }
    return Promise.all([
      fetchText(appFileUrl(app, 'view.html')),
      fetchText(appFileUrl(app, 'view.css')).catch(() => '')
    ]).then(([html, css]) => {
      viewCache.set(app, { html, css });
      injectViewCss(app, css);
      return { html: fillTokens(html, data), css, fromCache: false, remote: true };
    }).catch(() => {
      // file:// ou servidor sem os arquivos: fallback inline do próprio app
      if (fallback && fallback.css) injectViewCss(`${app}-fallback`, fallback.css);
      return { html: fillTokens(fallback ? fallback.html : '', data), css: '', fromCache: false, remote: false };
    });
  }

  function preloadViews(apps) {
    return Promise.allSettled((apps || []).map((app) =>
      loadView(app, null, null).catch(() => null)));
  }

  registerDefaults();

  window.VessieBridge = {
    registerHandler, appsFor, openWith: openWithApp, openFile,
    revealInExplorer, ensureStarterContent, extOf, baseOf,
    loadView, preloadViews, appFileUrl
  };

  try { ensureStarterContent(); } catch (error) {
    console.warn('[VessieBridge] starter content:', error);
  }
})();

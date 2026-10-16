// browser/browser.js — Compatible Browser (adapta comandos para navegadores Chrome, Firefox, Edge e customizados)
// Shell em view.html (token {{winUid}}); fallback = modelo original verbatim.
// Lógica de abas movida para wireBrowser(win, winUid), inalterada.
// Modo de compatibilidade: adapta comandos para diferentes navegadores.
(function () {
  "use strict";

  // Modo de compatibilidade atual (padrão: "chrome")
  // Pode ser definido como: "chrome", "firefox", "edge" ou um objeto de comandos customizado
  window.browserCompatMode = window.browserCompatMode || "chrome";

  // Mapeamento de comandos por modo de compatibilidade
  const browserCommands = {
    chrome: {
      back: (frame) => { try { frame?.contentWindow.history.back(); } catch (e) { /* cross-origin */ } },
      fwd: (frame) => { try { frame?.contentWindow.history.forward(); } catch (e) { /* cross-origin */ } },
      reload: (frame) => { if (frame) frame.src = frame.src; },
      home: (frame) => navigate('https://www.google.com/webhp?igu=1'),
      analyze: (tab) => { /* análise IA */ },
      go: (url) => navigate(url)
    },
    firefox: {
      back: (frame) => { try { frame?.contentWindow.history.back(); } catch (e) { /* cross-origin */ } },
      fwd: (frame) => { try { frame?.contentWindow.history.forward(); } catch (e) { /* cross-origin */ } },
      reload: (frame) => { if (frame) frame.src = frame.src; },
      home: (frame) => navigate('https://www.startpage.com/'), // Startpage como homepage padrão
      analyze: (tab) => { /* análise IA */ },
      go: (url) => navigate(url)
    },
    edge: {
      back: (frame) => { try { frame?.contentWindow.history.back(); } catch (e) { /* cross-origin */ } },
      fwd: (frame) => { try { frame?.contentWindow.history.forward(); } catch (e) { /* cross-origin */ } },
      reload: (frame) => { if (frame) frame.src = frame.src; },
      home: (frame) => navigate('https://www.bing.com/'), // Bing como homepage padrão
      analyze: (tab) => { /* análise IA */ },
      go: (url) => navigate(url)
    }
  };

  // Função para obter comando compatível pelo modo atual
  function getCommand(cmd, frame, tab) {
    const mode = browserCommands[window.browserCompatMode] || browserCommands.chrome;
    return mode[cmd] || browserCommands.chrome[cmd];
  }

function browserFallback(winUid) {
    return `
    <div class="brow" id="${winUid}">
      <div class="brow-tabs">
        <div class="brow-tabs-list"></div>
        <button class="brow-tab-new" title="Nova aba (Ctrl+T)"><i class="fas fa-plus"></i></button>
      </div>
      <div class="brow-bar">
        <button class="bnav" data-cmd="back"><i class="fas fa-arrow-left"></i></button>
        <button class="bnav" data-cmd="fwd"><i class="fas fa-arrow-right"></i></button>
        <button class="bnav" data-cmd="reload"><i class="fas fa-redo"></i></button>
        <button class="bnav" data-cmd="home"><i class="fas fa-home"></i></button>
        <input class="url-input" placeholder="Pesquisar no Google ou digitar um URL">
        <button class="bnav" data-cmd="go"><i class="fas fa-arrow-right" style="color:var(--a)"></i></button>
        <button class="bnav" data-cmd="analyze" title="Capturar esta página e analisar com IA"><i class="fas fa-wand-magic-sparkles"></i> IA</button>
      </div>
      <div class="brow-frames"></div>
    </div>
  `;
  }

function openBrowser(initialUrl, initialTitle) {
    const winUid = 'brow' + (++window.__winCounter.n);
    const win = createWin('Chrome', '🌐', '<div class="app-loading">Carregando…</div>', 860, 600);
    const wire = () => wireBrowser(win, winUid, { url: initialUrl, title: initialTitle });
    if (window.VessieBridge && typeof window.VessieBridge.loadView === 'function') {
      window.VessieBridge.loadView('browser', { html: browserFallback(winUid) }, { winUid }).then(({ html }) => {
        if (!document.body.contains(win)) return;
        win.querySelector('.wb').innerHTML = html;
        wire();
      });
    } else {
      win.querySelector('.wb').innerHTML = browserFallback(winUid);
      wire();
    }
    return win;
  }

  // Definir modo de compatibilidade
  window.setBrowserCompatMode = function(mode) {
    if (browserCommands[mode]) {
      window.browserCompatMode = mode;
      toast(`Modo de compatibilidade definido: ${mode}`, 'success');
    } else {
      toast(`Modo "${mode}" não reconhecido. Modos disponíveis: ${Object.keys(browserCommands).join(', ')}`, 'error');
    }
  };

  // Atalhos de teclado para mudar modo (Ctrl+Shift+M para Firefox, Ctrl+Shift+E para Edge)
  document.addEventListener('keydown', (e) => { // atalho global (antes: `root`, indefinido fora do openBrowser — quebrava o script inteiro)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'M') {
      e.preventDefault();
      window.setBrowserCompatMode('firefox');
    }
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
      e.preventDefault();
      window.setBrowserCompatMode('edge');
    }
  });

function wireBrowser(win, winUid, pendingNav) {

    const root = win.querySelector(`#${winUid}`);
    const tabsList = root.querySelector('.brow-tabs-list');
    const framesBox = root.querySelector('.brow-frames');
    const urlInput = root.querySelector('.url-input');
    const titleEl = win.querySelector('.w-title');

    const SHORTCUTS = [
      { name: 'Google', url: 'https://www.google.com/webhp?igu=1', icon: 'fab fa-google' },
      { name: 'YouTube', url: 'https://www.youtube.com', icon: 'fab fa-youtube' },
      { name: 'Wikipédia', url: 'https://pt.wikipedia.org', icon: 'fab fa-wikipedia-w' },
      { name: 'GitHub', url: 'https://github.com', icon: 'fab fa-github' }
    ];

    let tabs = [];
    let activeId = null;

    function newTabPageHTML() {
      return `<div class="brow-newtab">
        <div class="brow-newtab-logo"><i class="fas fa-circle-notch"></i> VessieOS</div>
        <input class="brow-newtab-search" placeholder="Pesquisar no Google ou digitar um URL">
        <div class="brow-newtab-shortcuts">
          ${SHORTCUTS.map((s) => `<div class="bnt-shortcut" data-url="${s.url}"><i class="${s.icon}"></i><span>${s.name}</span></div>`).join('')}
        </div>
      </div>`;
    }

    function makeTab(url) {
      const id = 'bt' + Math.random().toString(36).slice(2, 9);
      const tab = { id, url: url || '', title: url ? url : 'Nova aba' };
      tabs.push(tab);

      const tabBtn = document.createElement('div');
      tabBtn.className = 'brow-tab';
      tabBtn.dataset.id = id;
      tabBtn.innerHTML = `<i class="fas fa-file-alt"></i><span class="bt-title">${tab.title}</span><button class="bt-close"><i class="fas fa-times"></i></button>`;
      tabBtn.addEventListener('click', (e) => { if (!e.target.closest('.bt-close')) activateTab(id); });
      tabBtn.querySelector('.bt-close').addEventListener('click', () => closeTab(id));
      tabsList.appendChild(tabBtn);

      const frameWrap = document.createElement('div');
      frameWrap.className = 'brow-frame-wrap';
      frameWrap.dataset.id = id;
      if (url) {
        const iframe = document.createElement('iframe');
        iframe.className = 'brow-frame';
        iframe.src = url;
        iframe.title = 'Browser';
        iframe.sandbox = 'allow-forms allow-scripts allow-same-origin allow-popups allow-top-navigation-by-user-activation';
        VessieIframeRuntime.attach(iframe, { sandbox: iframe.sandbox, allow: 'fullscreen;autoplay;clipboard-read;clipboard-write' });
        iframe.addEventListener('load', () => { if (activeId === id) urlInput.value = iframe.src; });
        frameWrap.appendChild(iframe);
      } else {
        frameWrap.innerHTML = newTabPageHTML();
      }
      framesBox.appendChild(frameWrap);
      wireNewTabPage(frameWrap);
      return tab;
    }

    function wireNewTabPage(frameWrap) {
      const search = frameWrap.querySelector('.brow-newtab-search');
      if (search) search.addEventListener('keypress', (e) => { if (e.key === 'Enter') navigate(search.value); });
      frameWrap.querySelectorAll('.bnt-shortcut').forEach((el) => el.addEventListener('click', () => navigate(el.dataset.url)));
    }

    function activateTab(id) {
      activeId = id;
      root.querySelectorAll('.brow-tab').forEach((t) => t.classList.toggle('active', t.dataset.id === id));
      root.querySelectorAll('.brow-frame-wrap').forEach((f) => f.classList.toggle('active', f.dataset.id === id));
      const tab = tabs.find((t) => t.id === id);
      if (tab) {
        urlInput.value = tab.url || '';
        titleEl.textContent = (tab.title || 'Nova aba') + ' - Chrome';
        window.VessieCurrentPageUrl = tab.url || '';
      }
    }

    function closeTab(id) {
      const idx = tabs.findIndex((t) => t.id === id);
      if (idx === -1) return;
      tabs.splice(idx, 1);
      root.querySelector(`.brow-tab[data-id="${id}"]`)?.remove();
      root.querySelector(`.brow-frame-wrap[data-id="${id}"]`)?.remove();
      if (!tabs.length) { const t = makeTab(''); activateTab(t.id); return; }
      activateTab(tabs[Math.max(0, idx - 1)].id);
    }

    function getActiveFrame() { return root.querySelector(`.brow-frame-wrap[data-id="${activeId}"] .brow-frame`); }

    function navigate(rawUrl) {
      let url = (rawUrl || '').trim();
      if (!url) return;
      if (!/^https?:\/\//i.test(url)) {
        url = url.includes('.') && !url.includes(' ') ? 'https://' + url : `https://www.google.com/search?q=${encodeURIComponent(url)}&igu=1`;
      }
      const wrap = root.querySelector(`.brow-frame-wrap[data-id="${activeId}"]`);
      if (!wrap) return;
      wrap.innerHTML = '';
      const iframe = document.createElement('iframe');
      iframe.className = 'brow-frame';
      iframe.src = url;
      iframe.title = 'Browser';
      iframe.sandbox = 'allow-forms allow-scripts allow-same-origin allow-popups allow-top-navigation-by-user-activation';
      VessieIframeRuntime.attach(iframe, { sandbox: iframe.sandbox, allow: 'fullscreen;autoplay;clipboard-read;clipboard-write' });
      iframe.addEventListener('load', () => { if (activeId === tab.id) urlInput.value = iframe.src; });
      wrap.appendChild(iframe);
      const tab = tabs.find((t) => t.id === activeId);
      if (tab) {
        tab.url = url;
        tab.title = url.replace(/^https?:\/\//, '').split('/')[0];
        root.querySelector(`.brow-tab[data-id="${activeId}"] .bt-title`).textContent = tab.title;
        titleEl.textContent = tab.title + ' - Chrome';
        window.VessieCurrentPageUrl = url;
      }
      urlInput.value = url;
      toast('Navegando...', 'default');
    }

    root.querySelector('.brow-tab-new').addEventListener('click', () => activateTab(makeTab('').id));
    root.querySelectorAll('.brow-bar [data-cmd]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const frame = getActiveFrame();
        const cmd = btn.dataset.cmd;
        const command = getCommand(cmd, frame);
        if (cmd === 'back') { try { command(frame); } catch (e) { /* cross-origin */ } }
        else if (cmd === 'fwd') { try { command(frame); } catch (e) { /* cross-origin */ } }
        else if (cmd === 'reload') { if (frame) frame.src = frame.src; }
        else if (cmd === 'home') command(frame);
        else if (cmd === 'analyze') {
          const tab = tabs.find((item) => item.id === activeId);
          if (!tab?.url) {
            toast('Abra uma página antes de pedir a análise por IA.', 'error');
          } else if (typeof window.openPromptMasterStandalone !== 'function') {
            toast('O Prompt Master ainda não está carregado.', 'error');
          } else {
            window.openPromptMasterStandalone({
              site: tab.url,
              goal: 'Analise automaticamente o site capturado: descreva seu propósito, conteúdo, estrutura visível, tecnologias observáveis, requisitos e oportunidades de melhoria.',
              autoAnalyze: true
            });
          }
        }
        else if (cmd === 'go') navigate(btn.dataset.url || urlInput.value);
      });
    });
    urlInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') navigate(urlInput.value); });
    root.addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't') { e.preventDefault(); activateTab(makeTab('').id); } });

    const firstTab = makeTab('https://www.google.com/webhp?igu=1');
    activateTab(firstTab.id);
    // Navegação inicial (ponte "Abrir com"): executada após o shell existir.
    if (pendingNav && pendingNav.url) {
      try {
        urlInput.value = pendingNav.url;
        root.querySelector('.brow-bar [data-cmd="go"]')?.click();
        if (pendingNav.title && titleEl) titleEl.textContent = `${pendingNav.title} - Chrome`;
      } catch { /* página inicial como fallback */ }
    }
  }
window.openBrowser = openBrowser;

// Abertura dirigida pela ponte de integração (Explorer "Abrir com",
// Terminal `open`): abre o navegador já navegando para a URL.
function openBrowserWith(url, title) {
  return openBrowser(url, title);
}
window.openBrowserWith = openBrowserWith;
})();

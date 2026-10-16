(function () {
  const appName = 'Execute Exes';

  // ===========================================================================
  // Registro de caminhos/comandos (JSON) — persistido em localStorage
  // (rápido, síncrono, sempre disponível) com espelho em IndexedDB
  // (assíncrono, mais espaço, prepara o terreno pra crescer sem limite
  // dos ~5MB do localStorage). Cada item é exatamente o formato pedido:
  //   { "path": "C:\\Windows\\explorer.exe", "cmd": "Abrir Explorador" }
  // com um campo "origin" a mais pra distinguir os 2 padrões do sistema
  // dos que o usuário for cadastrando. "%User%" em qualquer campo do
  // item é resolvido pro usuário logado no momento da execução (ver
  // resolveUserTag) — assim um item pode apontar pra
  // "C:\Users\%User%\Desktop\..." e funcionar pra qualquer sessão.
  // ===========================================================================
  const STORAGE_KEY = 'vessieos:pathRegistry';
  const IDB_NAME = 'VessieOSRegistry';
  const IDB_STORE = 'entries';

  const DEFAULT_ENTRIES = [
    { id: 'default-explorer', path: 'C:\\Windows\\explorer.exe', cmd: 'Abrir Explorador de Arquivos', icon: '📁', origin: 'default', action: 'app:explorer' },
    { id: 'default-cmd', path: 'C:\\Windows\\System32\\cmd.exe', cmd: 'Abrir Terminal', icon: '💻', origin: 'default', action: 'app:terminal' }
  ];

  function resolveUserTag(value) {
    const user = (window.VessieOS && window.VessieOS.currentUser) || 'Usuario';
    return String(value ?? '').replace(/%user%/gi, () => user);
  }

  function openIDB() {
    if (!('indexedDB' in window)) return Promise.resolve(null);
    if (openIDB._p) return openIDB._p;
    openIDB._p = new Promise((resolve) => {
      try {
        const req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE, { keyPath: 'id' });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch (e) { resolve(null); }
    });
    return openIDB._p;
  }

  async function mirrorToIDB(list) {
    const db = await openIDB();
    if (!db) return false;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        store.clear();
        list.forEach((item) => store.put(item));
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      } catch (e) { resolve(false); }
    });
  }

  const PathRegistry = {
    _list: null,

    /** Carrega do localStorage (síncrono); IndexedDB fica só como espelho
     * de backup — localStorage é a fonte da verdade em tempo de leitura
     * pra não precisar tornar toda leitura assíncrona no resto do app. */
    load() {
      if (this._list) return this._list;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) { this._list = JSON.parse(raw); return this._list; }
      } catch (e) { /* localStorage indisponível ou JSON corrompido */ }
      this._list = DEFAULT_ENTRIES.map((e) => ({ ...e }));
      this.save();
      return this._list;
    },

    save() {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this._list)); } catch (e) { /* quota cheia etc */ }
      mirrorToIDB(this._list); // fire-and-forget, best-effort
    },

    list() { return this.load().map((e) => ({ ...e, path: resolveUserTag(e.path), cmd: resolveUserTag(e.cmd) })); },

    find(query) {
      const q = String(query || '').trim().toLowerCase();
      return this.list().find((e) => e.path.toLowerCase() === q || e.cmd.toLowerCase() === q || e.id === query);
    },

    /** Cadastra uma entrada de usuário. `%User%` em path/cmd é aceito e
     * fica salvo literal (só é resolvido na hora de listar/executar), pra
     * continuar válido mesmo se o nome de usuário mudar depois. */
    add(path, cmd, extra = {}) {
      if (!path || !cmd) throw new Error('path e cmd são obrigatórios.');
      const list = this.load();
      const id = `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const entry = { id, path: String(path), cmd: String(cmd), icon: extra.icon || '📄', origin: 'user', action: extra.action || null };
      list.push(entry);
      this.save();
      return entry;
    },

    /** Só remove entradas de usuário — os 2 padrões não podem ser apagados
     * (mesma regra dos atalhos "de fábrica" do Windows). */
    remove(id) {
      const list = this.load();
      const target = list.find((e) => e.id === id);
      if (!target) return false;
      if (target.origin === 'default') throw new Error('Entradas padrão do sistema não podem ser removidas.');
      this._list = list.filter((e) => e.id !== id);
      this.save();
      return true;
    },

    resetToDefaults() { this._list = DEFAULT_ENTRIES.map((e) => ({ ...e })); this.save(); return this._list; },

    /** Executa uma entrada: entradas com `action` conhecida abrem o app
     * real do desktop (mesmo caminho que um clique no ícone usaria).
     * Entradas de usuário sem ação associada apenas confirmam que foram
     * encontradas — ainda não há um jeito genérico de "rodar" um caminho
     * arbitrário sem saber que app ele representa. */
    execute(idOrQuery) {
      const entry = this.list().find((e) => e.id === idOrQuery) || this.find(idOrQuery);
      if (!entry) throw new Error(`Nenhuma entrada encontrada para "${idOrQuery}".`);
      if (entry.action && entry.action.startsWith('app:') && typeof window.openApp === 'function') {
        window.openApp(entry.action.slice(4));
      }
      return entry;
    }
  };

  window.VessieOS = window.VessieOS || {};
  window.VessieOS.PathRegistry = PathRegistry;

  const catalog = [
    { id: 'calc', name: 'Calculator.exe', path: 'C:/System32/Calculator.exe', icon: '🧮', type: 'native', memory: 48, description: 'Calculadora do sistema', owner: 'system' },
    { id: 'cmd', name: 'Command Prompt.exe', path: 'C:/Windows/System32/cmd.exe', icon: '💻', type: 'console', memory: 64, description: 'Prompt de comandos', owner: 'user' },
    { id: 'notepad', name: 'Notepad.exe', path: 'C:/Windows/System32/notepad.exe', icon: '📝', type: 'editor', memory: 52, description: 'Bloco de notas do Windows', owner: 'user' },
    { id: 'taskmgr', name: 'Task Manager.exe', path: 'C:/Windows/System32/taskmgr.exe', icon: '📊', type: 'monitor', memory: 96, description: 'Gerenciador de tarefas', owner: 'system' }
  ];

  function ensureKernel() {
    if (!window.VessieOS || !window.VessieOS.kernel) {
      return false;
    }
    return true;
  }

  function ensureDesktopIcon() {
    const area = document.getElementById('icons-area');
    if (area && !document.querySelector('[data-app="execute-exes"]')) {
      const icon = document.createElement('div');
      icon.className = 'di';
      icon.dataset.app = 'execute-exes';
      icon.innerHTML = `
        <div class="ic" title="${appName}">💼</div>
        <div class="label">${appName}</div>
      `;
      icon.addEventListener('dblclick', openWindow);
      area.appendChild(icon);
    }
    ensureStartMenuEntry();
  }

  // O grid do Menu Iniciar (#sm-grid) é limpo e reconstruído do zero por
  // JS/core/main.js sempre que o usuário faz login (renderStartMenu ->
  // grid.innerHTML = ''), o que apagava esta entrada. Reagimos ao evento
  // "vessieos:startmenu-rendered" (disparado por main.js) para reinserir o
  // item toda vez que isso acontece, e não só uma vez no boot.
  function ensureStartMenuEntry() {
    const startMenu = document.getElementById('sm-grid');
    if (!startMenu || startMenu.querySelector('[data-app-id="execute-exes"]')) return;
    const item = document.createElement('div');
    item.className = 'sm-app';
    item.dataset.appId = 'execute-exes';
    item.innerHTML = '<div class="ai">💼</div><span>Execute Exes</span>';
    item.addEventListener('click', () => {
      openWindow();
      if (typeof window.closeStartMenu === 'function') window.closeStartMenu();
      else { const sm = document.getElementById('sm'); if (sm) sm.classList.remove('open'); }
    });
    startMenu.appendChild(item);
  }

  function openWindow() {
    let windowEl = document.getElementById('execute-exes-window');
    if (!windowEl) {
      const desktop = document.getElementById('desktop');
      if (!desktop) return;

      windowEl = document.createElement('div');
      windowEl.id = 'execute-exes-window';
      windowEl.className = 'window execute-exes-window';
      windowEl.style.left = '18vw';
      windowEl.style.top = '12vh';
      windowEl.style.width = 'min(860px, 78vw)';
      windowEl.style.height = 'min(620px, 72vh)';
      windowEl.innerHTML = `
        <div class="window-header">
          <div class="window-controls">
            <span class="close"></span>
            <span class="min"></span>
            <span class="max"></span>
          </div>
          <div class="window-title">Execute Exes</div>
          <div style="width:72px"></div>
        </div>
        <div class="window-body execute-exes-body">
          <div class="execute-exes-sidebar">
            <div class="execute-exes-header-row">
              <strong>Executáveis</strong>
              <button class="execute-exes-button" id="execute-exes-refresh">Atualizar</button>
            </div>
            <div id="execute-exes-list" class="execute-exes-list"></div>

            <div class="execute-exes-header-row" style="margin-top:14px;">
              <strong>Registro (JSON)</strong>
              <button class="execute-exes-button" id="path-registry-add">+ Novo</button>
            </div>
            <div id="path-registry-list" class="execute-exes-list"></div>
          </div>
          <div class="execute-exes-panel">
            <div class="execute-exes-card">
              <div class="execute-exes-card-head">
                <span id="selected-exe-icon">💼</span>
                <div>
                  <h3 id="selected-exe-name">Calculator.exe</h3>
                  <small id="selected-exe-path">C:/System32/Calculator.exe</small>
                </div>
              </div>
              <p id="selected-exe-description">Calculadora do sistema</p>
              <div class="execute-exes-actions">
                <button id="execute-exe-launch" class="execute-exes-button primary">Executar</button>
                <button id="execute-exe-kernel" class="execute-exes-button">Kernel</button>
              </div>
            </div>

            <div class="execute-exes-metrics">
              <div class="metric-box">
                <label>PID</label>
                <strong id="metric-pid">-</strong>
              </div>
              <div class="metric-box">
                <label>Memória</label>
                <strong id="metric-memory">0 MB</strong>
              </div>
              <div class="metric-box">
                <label>Estado</label>
                <strong id="metric-state">idle</strong>
              </div>
            </div>

            <div class="execute-exes-log-box">
              <div class="execute-exes-log-header">
                <strong>Kernel logs</strong>
                <button class="execute-exes-button tiny" id="execute-exes-clear-log">Limpar</button>
              </div>
              <div id="execute-exes-log" class="execute-exes-log"></div>
            </div>
          </div>
        </div>
      `;

      desktop.appendChild(windowEl);
      bindWindowActions(windowEl);
    }

    windowEl.style.display = 'block';
    renderList();
    updateKernelInfo();
  }

  function bindWindowActions(windowEl) {
    const closeButton = windowEl.querySelector('.close');
    if (closeButton) {
      closeButton.addEventListener('click', () => { windowEl.style.display = 'none'; });
    }

    const launchButton = document.getElementById('execute-exe-launch');
    const kernelButton = document.getElementById('execute-exe-kernel');
    const refreshButton = document.getElementById('execute-exes-refresh');
    const clearLogButton = document.getElementById('execute-exes-clear-log');

    if (launchButton) {
      launchButton.addEventListener('click', () => {
        const selected = getSelectedExecutable();
        if (!selected) return;
        launchExecutable(selected);
      });
    }

    if (kernelButton) {
      kernelButton.addEventListener('click', () => {
        updateKernelInfo();
      });
    }

    if (refreshButton) {
      refreshButton.addEventListener('click', () => {
        renderList();
        updateKernelInfo();
      });
    }

    const addRegistryButton = document.getElementById('path-registry-add');
    if (addRegistryButton) {
      addRegistryButton.addEventListener('click', addPathRegistryEntry);
    }

    if (clearLogButton) {
      clearLogButton.addEventListener('click', () => {
        const kernel = window.VessieOS && window.VessieOS.kernel;
        if (kernel) kernel.logs = [];
        renderLogs();
      });
    }
  }

  function getSelectedExecutable() {
    const selected = document.querySelector('.exe-item.active');
    if (!selected) return catalog[0];
    const id = selected.dataset.exeId;
    return catalog.find((item) => item.id === id) || catalog[0];
  }

  /** Log simples e independente do kernel (o registry funciona mesmo se
   * o kernel real não estiver disponível), no mesmo estilo visual das
   * entradas de log já usadas pelo restante desta janela. */
  function appendLog(message) {
    const log = document.getElementById('execute-exes-log');
    if (!log) return;
    const entry = document.createElement('div');
    entry.className = 'execute-log-entry info';
    entry.textContent = `[${new Date().toLocaleTimeString('pt-BR')}] ${message}`;
    log.prepend(entry);
  }

  function renderList() {
    const list = document.getElementById('execute-exes-list');
    if (!list) return;

    list.innerHTML = catalog.map((item, index) => `
      <button class="exe-item ${index === 0 ? 'active' : ''}" data-exe-id="${item.id}">
        <span>${item.icon}</span>
        <div>
          <strong>${item.name}</strong>
          <small>${item.type}</small>
        </div>
      </button>
    `).join('');

    list.querySelectorAll('.exe-item').forEach((button) => {
      button.addEventListener('click', () => {
        list.querySelectorAll('.exe-item').forEach((item) => item.classList.remove('active'));
        button.classList.add('active');
        const exe = catalog.find((entry) => entry.id === button.dataset.exeId) || catalog[0];
        updateSelectedInfo(exe);
      });
    });

    const first = catalog[0];
    if (first) updateSelectedInfo(first);
    renderPathRegistry();
  }

  /** Lista os itens do JSON registry (2 padrão + os que o usuário cadastrar),
   * com "%User%" já resolvido pro nome de usuário atual (ver resolveUserTag).
   * Item padrão não tem botão de remover — mesma regra de "atalhos de
   * fábrica" do Windows, que também não dá pra apagar do menu Executar. */
  function renderPathRegistry() {
    const list = document.getElementById('path-registry-list');
    if (!list) return;
    const entries = PathRegistry.list();
    list.innerHTML = entries.map((item) => `
      <button class="exe-item" data-reg-id="${item.id}" title="${item.path}">
        <span>${item.icon || '📄'}</span>
        <div>
          <strong>${item.cmd}</strong>
          <small>${item.path}${item.origin === 'default' ? ' · padrão' : ' · usuário'}</small>
        </div>
        ${item.origin === 'user' ? `<span class="path-registry-remove" data-remove-id="${item.id}" title="Remover">✕</span>` : ''}
      </button>
    `).join('') || '<div style="padding:10px;color:var(--muted);font-size:.82rem;">Nenhuma entrada.</div>';

    list.querySelectorAll('.exe-item').forEach((button) => {
      button.addEventListener('click', (e) => {
        if (e.target.classList.contains('path-registry-remove')) return; // tratado abaixo
        try {
          PathRegistry.execute(button.dataset.regId);
          appendLog(`✅ Executado via registro: ${button.dataset.regId}`);
        } catch (err) {
          appendLog(`❌ ${err.message}`);
        }
      });
    });
    list.querySelectorAll('.path-registry-remove').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        try {
          PathRegistry.remove(btn.dataset.removeId);
          renderPathRegistry();
          appendLog('🗑️ Entrada removida do registro.');
        } catch (err) {
          appendLog(`❌ ${err.message}`);
        }
      });
    });
  }

  function addPathRegistryEntry() {
    const path = prompt('Caminho (ex.: C:\\Users\\%User%\\Desktop\\script.vl):');
    if (!path) return;
    const cmd = prompt('Nome do comando (ex.: "Abrir meu script"):');
    if (!cmd) return;
    try {
      PathRegistry.add(path, cmd);
      renderPathRegistry();
      appendLog(`➕ Registrado: ${path} -> ${cmd}`);
    } catch (err) {
      appendLog(`❌ ${err.message}`);
    }
  }

  function updateSelectedInfo(exe) {
    const label = document.getElementById('selected-exe-name');
    const path = document.getElementById('selected-exe-path');
    const description = document.getElementById('selected-exe-description');
    const icon = document.getElementById('selected-exe-icon');

    if (label) label.textContent = exe.name;
    if (path) path.textContent = exe.path;
    if (description) description.textContent = exe.description;
    if (icon) icon.textContent = exe.icon;
  }

  function launchExecutable(executable) {
    const kernel = window.VessieOS && window.VessieOS.kernel;
    if (!kernel) {
      alert('Kernel do VessieOS indisponível.');
      return;
    }

    const process = kernel.createProcess({
      name: executable.name,
      path: executable.path,
      memory: executable.memory || 48,
      owner: executable.owner || 'user',
      state: 'running',
      cpu: 4,
      metadata: {
        type: executable.type,
        launchedFrom: 'Execute Exes',
        signed: true
      }
    });

    const log = document.getElementById('execute-exes-log');
    if (log) {
      const entry = document.createElement('div');
      entry.className = 'execute-log-entry';
      entry.textContent = `[${new Date().toLocaleTimeString('pt-BR')}] ${executable.name} -> PID ${process.pid}`;
      log.prepend(entry);
    }

    updateKernelInfo();
    kernel.log('info', `${executable.name} foi executado pelo Execute Exes.`, 'ExecuteExes');
    renderLogs();
  }

  function renderLogs() {
    const log = document.getElementById('execute-exes-log');
    if (!log) return;
    const kernel = window.VessieOS && window.VessieOS.kernel;
    const entries = kernel ? kernel.logs.slice(0, 14) : [];
    log.innerHTML = entries.map((entry) => `
      <div class="execute-log-entry ${entry.level || 'info'}">
        <span class="log-tag">${entry.level || 'info'}</span>
        <span>${entry.message}</span>
      </div>
    `).join('');
  }

  function updateKernelInfo() {
    const kernel = window.VessieOS && window.VessieOS.kernel;
    const pid = document.getElementById('metric-pid');
    const memory = document.getElementById('metric-memory');
    const state = document.getElementById('metric-state');

    if (!kernel) {
      if (pid) pid.textContent = 'n/a';
      if (memory) memory.textContent = '0 MB';
      if (state) state.textContent = 'offline';
      return;
    }

    const first = kernel.listProcesses()[0] || null;
    if (pid) pid.textContent = first ? String(first.pid) : '0';
    if (memory) memory.textContent = `${kernel.memory.used || 0} MB`;
    if (state) state.textContent = first ? first.state : 'idle';

    renderLogs();
  }

  function init() {
    if (window.VessieOS && window.VessieOS.kernel && typeof window.VessieOS.kernel.boot === 'function') {
      if (!window.VessieOS.kernel.booted) {
        window.VessieOS.kernel.booted = true;
        window.VessieOS.kernel.boot();
      }
    }

    if (window.VessieOS && window.VessieOS.Registry && typeof window.VessieOS.Registry.register === 'function') {
      window.VessieOS.Registry.register('app.execute-exes', {
        name: appName,
        type: 'desktop-app',
        description: 'Executor virtual de aplicativos Windows em ambiente web.',
        load: openWindow
      });
    }

    ensureKernel();
    ensureDesktopIcon();
    renderLogs();
    updateKernelInfo();

    document.addEventListener('vessieos:startmenu-rendered', ensureStartMenuEntry);
  }

  window.VessieOS = window.VessieOS || {};
  window.VessieOS.modules = window.VessieOS.modules || {};
  window.VessieOS.modules.executeExes = { init, open: openWindow, launchExecutable };
  window.VessieOS.ExecuteExes = {
    catalog,
    open: openWindow,
    launchExecutable,
    getSelectedExecutable,
    init
  };

  document.addEventListener('DOMContentLoaded', init);
})();

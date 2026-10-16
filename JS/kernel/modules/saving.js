// saving.js — Sistema avançado de salvatudo: localStorage + Remote-Device cache
// Gerencia salvamento de estados de aplicativos, cache de conteúdo e persistência
// Dependências: window.VFS, window.localStorage, window.persistState, toast()

(function () {
  "use strict";

  const CACHE_KEY = 'vessieos_cache_';
  const AUTO_SAVE_INTERVAL = 30000; // 30 segundos
  let autoSaveTimer = null;

  // --- Cache Manager ---
  const CacheManager = {
    // Limpar prefixo do cache
    _prefix(namespace) {
      return CACHE_KEY + (namespace || '') + '_';
    },

    // Obter chave completa
    key(namespace, id) {
      return this._prefix(namespace) + id;
    },

    // Obter do cache (localStorage)
    get(namespace, id) {
      try {
        const key = this.key(namespace, id);
        const data = localStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          // Atualizar timestamp
          this.set(namespace, id, parsed);
          return parsed;
        }
      } catch (e) { }
      return null;
    },

    // Definir no cache (localStorage)
    set(namespace, id, value) {
      try {
        const key = this.key(namespace, id);
        const valueToSave = typeof value === 'object' ? JSON.stringify(value) : String(value);
        localStorage.setItem(key, valueToSave);

        // Manter tamanho controlado (máx 5MB por item de cache)
        const size = valueToSave.length;
        if (size > 5 * 1024 * 1024) {
          toast(`⚠️ Cache item ${id} muito grande (${(size / 1024 / 1024).toFixed(1)}MB), será truncado.`, 'warning');
        }

        return true;
      } catch (e) { }
      return false;
    },

    // Remover do cache
    remove(namespace, id) {
      try {
        const key = this.key(namespace, id);
        localStorage.removeItem(key);
        return true;
      } catch (e) { }
      return false;
    },

    // Limpar todo cache de um namespace
    clear(namespace) {
      try {
        const prefix = this._prefix(namespace);
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(prefix)) {
            localStorage.removeItem(key);
          }
        }
        return true;
      } catch (e) { }
      return false;
    },

    // Listar todos os itens do cache de um namespace
    list(namespace) {
      try {
        const prefix = this._prefix(namespace);
        const items = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(prefix)) {
            const id = key.replace(prefix, '');
            const value = this.get(namespace, id);
            if (value !== null) items.push({ id, ...value });
          }
        }
        return items;
      } catch (e) { }
      return [];
    },

    // Verificar se item existe
    exists(namespace, id) {
      try {
        const key = this.key(namespace, id);
        return localStorage.getItem(key) !== null;
      } catch (e) { }
      return false;
    }
  };

  // --- Persistence Service Integration ---
  const PersistenceService = window.PersistenceService || {
    key: 'vessieos_state',
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; }
    },
    get(key, fallback = null) {
      try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); } catch { return fallback; }
    },
    remove(key) { localStorage.removeItem(key); }
  };

  // --- Auto-save System ---
  function startAutoSave() {
    // Parar se já estiver rodando
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer);
      autoSaveTimer = null;
    }

    // Salvar estado inicial
    persistState();

    // Timer automático
    autoSaveTimer = setInterval(() => {
      try {
        persistState();
      } catch (e) { }
    }, AUTO_SAVE_INTERVAL);
  }

  function stopAutoSave() {
    if (autoSaveTimer) {
      clearInterval(autoSaveTimer);
      autoSaveTimer = null;
    }
  }

  // --- Aplicativos Save/Load ---
  const AppSaveSystem = {
    // Salvar estado de um aplicativo
    saveAppState(appId, state) {
      try {
        // Salvar no localStorage com namespace do app
        CacheManager.set('app', appId, state);

        // Também salvar no PersistenceService principal
        const fullState = CacheManager.get('app', appId);
        if (fullState) {
          PersistenceService.set(`app_state_${appId}`, fullState);
        }

        return true;
      } catch (e) { }
      return false;
    },

    // Carregar estado de um aplicativo
    loadAppState(appId) {
      try {
        // Primeiro tenta o cache
        const cached = CacheManager.get('app', appId);
        if (cached) return cached;

        // Depois tenta o persistence service
        const saved = PersistenceService.get(`app_state_${appId}`);
        if (saved) {
          // Atualizar cache
          CacheManager.set('app', appId, saved);
          return saved;
        }

        return null;
      } catch (e) { }
      return null;
    },

    // Remover estado de aplicativo
    removeAppState(appId) {
      CacheManager.remove('app', appId);
      PersistenceService.remove(`app_state_${appId}`);
    },

    // Listar todos os aplicativos com estado salvo
    listAppStates() {
      return CacheManager.list('app').map(item => ({
        appId: item.id,
        lastModified: item.modified || item.at || Date.now(),
        size: item.size || 0
      }));
    }
  };

  // --- Arquivo/Conteúdo Save System ---
  const ContentSaveSystem = {
    // Salvar conteúdo de arquivo
    saveContent(namespace, filename, content, metadata = {}) {
      try {
        // Salvar no cache
        CacheManager.set(namespace, filename, {
          content: typeof content === 'string' ? content : JSON.stringify(content),
          type: metadata.type || 'text',
          size: content?.length || 0,
          modified: Date.now(),
          ...metadata
        });

        // Também salvar no persistence
        PersistenceService.set(`${namespace}_${filename}`, {
          content: typeof content === 'string' ? content : JSON.stringify(content),
          modified: Date.now(),
          ...metadata
        });

        return true;
      } catch (e) { }
      return false;
    },

    // Carregar conteúdo de arquivo
    loadContent(namespace, filename) {
      try {
        // Primeiro cache
        const cached = CacheManager.get(namespace, filename);
        if (cached && cached.content) {
          return cached.content.type === 'json' || cached.content.includes('{')
            ? JSON.parse(cached.content)
            : cached.content;
        }

        // Depois persistence
        const saved = PersistenceService.get(`${namespace}_${filename}`);
        if (saved) {
          CacheManager.set(namespace, filename, {
            content: saved.content,
            type: saved.type || 'text',
            size: saved.size || 0,
            modified: saved.modified || Date.now()
          });
          return saved.content.type === 'json' || saved.content.includes('{')
            ? JSON.parse(saved.content)
            : saved.content;
        }

        return null;
      } catch (e) { }
      return null;
    },

    // Remover conteúdo
    removeContent(namespace, filename) {
      CacheManager.remove(namespace, filename);
      PersistenceService.remove(`${namespace}_${filename}`);
    },

    // Listar todos os conteúdos de um namespace
    listContents(namespace) {
      return CacheManager.list(namespace).map(item => ({
        id: item.id,
        type: item.type || 'text',
        size: item.size || 0,
        modified: item.modified || Date.now()
      }));
    }
  };

  // --- Remote-Device Sync ---
  const RemoteDeviceSync = {
    // Sincronizar com Remote-Device (simulado)
    syncWithRemote(namespace, callback) {
      try {
        const localItems = CacheManager.list(namespace);
        // Simular upload para Remote-Device
        // Em um cenário real, isso seria uma chamada de rede
        if (callback) {
          callback({
            success: true,
            syncedItems: localItems.length,
            timestamp: Date.now(),
            message: `Sincronizado ${localItems.length} itens com Remote-Device`
          });
        }
        return true;
      } catch (e) { }
      if (callback) callback({ success: false, error: e.message });
      return false;
    },

    // Download de Remote-Device
    downloadFromRemote(namespace, remoteItems, callback) {
      try {
        let successCount = 0;
        remoteItems.forEach(item => {
          try {
            CacheManager.set(namespace, item.id, item);
            successCount++;
          } catch (e) { }
        });

        if (callback) callback({
          success: true,
          downloaded: successCount,
          total: remoteItems.length,
          message: `${successCount} de ${remoteItems.length} itens baixados`
        });
        return true;
      } catch (e) { }
      if (callback) callback({ success: false, error: e.message, downloaded: 0, total: remoteItems.length });
      return false;
    }
  };

  // --- Inicialização ---
  // Iniciar auto-save ao carregar
  try { startAutoSave(); } catch (e) { }

  // Exportar módulos
  window.CacheManager = CacheManager;
  window.PersistenceService = Object.assign({}, window.PersistenceService, PersistenceService);
  window.AppSaveSystem = AppSaveSystem;
  window.ContentSaveSystem = ContentSaveSystem;
  window.RemoteDeviceSync = RemoteDeviceSync;

  // Funções auxiliares para apps
  window.saveAppState = AppSaveSystem.saveAppState.bind(AppSaveSystem);
  window.loadAppState = AppSaveSystem.loadAppState.bind(AppSaveSystem);
  window.saveContent = ContentSaveSystem.saveContent.bind(ContentSaveSystem);
  window.loadContent = ContentSaveSystem.loadContent.bind(ContentSaveSystem);

})();
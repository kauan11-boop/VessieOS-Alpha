// search.js — Sistema de Pesquisa do VessieOS
// Pesquisa em arquivos, apps, configurações e web
// Dependências: window.VFS, window.S, window.ServiceLocator

(function () {
  "use strict";

  // Índice de pesquisa
  const searchIndex = new Map();

  // Indexar arquivo
  function indexFile(path, content) {
    if (!path || !content) return;
    const terms = String(content).toLowerCase().split(/\s+/);
    terms.forEach(term => {
      if (term.length < 2) return;
      if (!searchIndex.has(term)) {
        searchIndex.set(term, new Set());
      }
      searchIndex.get(term).add(path);
    });
  }

  // Indexar estrutura do VFS
  function indexVFS() {
    searchIndex.clear();

    function walkNode(node, path = '') {
      if (!node || typeof node !== 'object') return;

      Object.keys(node).forEach(key => {
        const item = node[key];
        const itemPath = path ? `${path}/${key}` : key;

        if (item && typeof item === 'object') {
          // É pasta
          indexFile(itemPath, key);
          walkNode(item, itemPath);
        } else {
          // É arquivo
          indexFile(itemPath, item || '');
        }
      });
    }

    if (window.S && window.S.fs) {
      walkNode(window.S.fs);
    }
  }

  // Pesquisar no VFS
  function searchFiles(query) {
    if (!query) return [];

    const terms = query.toLowerCase().split(/\s+/);
    const results = new Set();

    // Busca por termo
    terms.forEach(term => {
      if (term.length < 2) return;

      // Busca exata
      if (searchIndex.has(term)) {
        searchIndex.get(term).forEach(path => results.add(path));
      }

      // Busca parcial
      searchIndex.forEach((paths, indexTerm) => {
        if (indexTerm.includes(term)) {
          paths.forEach(path => results.add(path));
        }
      });
    });

    return Array.from(results).slice(0, 20);
  }

  // Pesquisar apps
  function searchApps(query) {
    const apps = [
      { id: 'explorer', name: 'Explorador de Arquivos', icon: '📁' },
      { id: 'terminal', name: 'Terminal', icon: '💻' },
      { id: 'emulator', name: 'Emulador', icon: '⚙️' },
      { id: 'browser', name: 'Navegador', icon: '🌐' },
      { id: 'calculator', name: 'Calculadora', icon: '🧮' },
      { id: 'notepad', name: 'Bloco de Notas', icon: '📝' },
      { id: 'games', name: 'Jogos', icon: '🎮' },
      { id: 'steam', name: 'Steam', icon: '🎮' },
      { id: 'discord', name: 'Discord', icon: '💬' },
      { id: 'settings', name: 'Configurações', icon: '⚙️' },
      { id: 'vessielang', name: 'VessieLang Studio', icon: '💜' },
      { id: 'vessie-ai', name: 'Vessie IA', icon: '🤖' },
      { id: 'camera', name: 'Câmera', icon: '📷' },
      { id: 'word-processor', name: 'Editor de Texto', icon: '📄' }
    ];

    if (!query) return apps;
    return apps.filter(app =>
      app.name.toLowerCase().includes(query.toLowerCase()) ||
      app.id.toLowerCase().includes(query.toLowerCase())
    );
  }

  // Pesquisar comandos do terminal
  function searchCommands(query) {
    const commands = [
      'ls', 'cd', 'pwd', 'cat', 'touch', 'rm', 'rmdir', 'mv', 'cp', 'mkdir',
      'echo', 'date', 'cal', 'clear', 'history', 'alias', 'unalias', 'export',
      'env', 'whoami', 'uname', 'uptime', 'ps', 'kill', 'neofetch', 'nano',
      'open', 'ping', 'curl', 'grep', 'find', 'chmod', 'sudo', 'su', 'exit',
      'reboot', 'shutdown', 'df', 'du', 'free', 'top', 'head', 'tail', 'sort',
      'sleep', 'yes', 'jobs', 'fg', 'bg', 'coin', 'vsys', 'errors', 'aimodel',
      'adaptivecolor', 'vessie', 'vscript', 'reg', 'dir', 'cls', 'type', 'del',
      'copy', 'move', 'ren', 'md', 'rd', 'hostname', 'ver', 'start', 'wget'
    ];

    if (!query) return commands;
    return commands.filter(cmd =>
      cmd.toLowerCase().includes(query.toLowerCase())
    );
  }

  // Pesquisa universal
  function universalSearch(query) {
    const results = {
      files: searchFiles(query),
      apps: searchApps(query),
      commands: searchCommands(query),
      web: query ? `https://www.google.com/search?q=${encodeURIComponent(query)}` : null
    };

    return results;
  }

  // Atualizar índice
  function updateIndex() {
    indexVFS();
    return searchIndex.size;
  }

  // Exportar
  window.VessieSearch = {
    searchFiles,
    searchApps,
    searchCommands,
    universalSearch,
    updateIndex,
    indexFile,
    indexVFS
  };

  // Auto-indexar ao carregar
  try {
    setTimeout(() => {
      const count = updateIndex();
      console.log('VessieSearch: índice criado com', count, 'termos');
    }, 1000);
  } catch (e) { }

})();
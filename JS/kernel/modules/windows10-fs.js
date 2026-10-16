// windows10-fs.js — Arquitetura de diretórios estilo Windows 10 para VessieOS
// Redesenha a estrutura de pastas do explorer para ser mais parecida com o Windows 10
// Dependências: window.VFS, window.S, window.toast

(function () {
  "use strict";

  // --- Estrutura de Pastas Windows 10 ---
  // O VFS agora usa esta estrutura padrão ao iniciar

  const WIN10_FOLDERS = {
    // Pastas do usuário (%User%)
    UserProfile: {
      name: 'Usuário',
      path: 'Users',
      special: {
        Desktop: 'Desktop',
        Documentos: 'Documentos',
        Downloads: 'Downloads',
        Imagens: 'Imagens',
        Videos: 'Videos',
        Música: 'Música',
        'AppData-Roaming': 'AppData\\Roaming',
        'AppData-Local': 'AppData\\Local'
      }
    },

    // Sistema Windows
    System: {
      name: 'Sistema',
      path: 'Sistema',
      __locked: true, // Bloqueado por padrão
      special: {
        Windows: 'Windows',
        System32: 'System32',
        SysWOW64: 'SysWOW64',
        ProgramFiles: 'Program Files',
        Users: 'Users',
        WindowsApps: 'WindowsApps',
        'ProgramData': 'ProgramData'
      }
    },

    // Dispositivos
    Devices: {
      name: 'Dispositivos',
      path: 'Dispositivos',
      drives: ['C:'], // Unidades mapeadas
      removable: []
    }
  };

  // --- Inicialização da estrutura no VFS (árvore C:/... canônica) ---
  function initWin10Structure() {
    try {
      // Verificar se estrutura já existe
      if (VFS && VFS.fs) {
        // Garantir pastas do usuário (C:/Usuários/<nome>/...)
        const userFolders = WIN10_FOLDERS.UserProfile.special;
        let created = 0;

        Object.entries(userFolders).forEach(([folderName, folderPath]) => {
          const fullPath = `C:/Usuários/${S.user || 'Vessie'}/${folderName}`;
          if (!VFS.exists(fullPath)) {
            VFS.mkdir(fullPath);
            created++;
          }
        });

        // Garantir pastas do Sistema (bloqueadas até unlock admin)
        const sysFolders = WIN10_FOLDERS.System.special;
        if (S.windowsUnlocked) {
          Object.entries(sysFolders).forEach(([folderName, folderPath]) => {
            const fullPath = `C:/Windows/${folderName}`;
            if (!VFS.exists(fullPath)) {
              VFS.mkdir(fullPath);
              // Adicionar arquivos iniciais
              if (folderName === 'System32') {
                VFS.write(`${fullPath}\\cmd.exe`, '@echo off\n:: Sistema Windows 10 simulado');
                VFS.write(`${fullPath}\\powershell.ps1`, '# PowerShell simulado do VessieOS');
              }
              if (folderName === 'Users') {
                VFS.write(`${fullPath}\\README.txt`, 'Pasta de usuários do Windows 10');
              }
              created++;
            }
          });
        }

        if (created > 0) {
          // Persistir estado
          try { persistState(); } catch (e) { }
        }

        return true;
      }
    } catch (e) { console.error('Erro ao inicializar estrutura Windows 10:', e); }
    return false;
  }

  // --- Mapeamento de caminhos Windows <-> Vessie ---
  // Delega para VFS.normalize (árvore C:/... canônica): só remove o
  // prefixo da unidade e converte barras; o resto é com o núcleo.
  function winToVessie(winPath) {
    if (!winPath) return null;
    let path = String(winPath).replace(/^C:\\/i, '').replace(/\\/g, '/');
    path = path.replace(/^\/+/, '').replace(/\/+$/, '');
    return path || null;
  }

  // Converter caminho interno do Vessie para estilo Windows
  function vessieToWin(vessiePath) {
    if (!vessiePath) return 'C:\\';
    let path = String(vessiePath);
    if (!/^C:\//i.test(path)) path = 'C:/' + path.replace(/^\/+/, '');
    return path.replace(/\//g, '\\');
  }

  // --- Ícones estilo Windows 10 ---
  const WIN10_ICONS = {
    folder: '📁',
    folderOpen: '📂',
    drive: '💿',
    document: '📄',
    exe: '🖥',
    folderOpened: '📂',
    recycler: '🗑️',
    controlPanel: '🎛',
    settings: '⚙️',
    user: '👤',
    computer: '💻'
  };

  // --- Explorer View Generator ---
  // Gera a visualização de pasta estilo Windows 10
  function generateFolderView(folderPath, items, selectedPath = null) {
    const vessiePath = winToVessie(folderPath) || folderPath;
    const node = VFS.resolve(vessiePath) || VFS.fs;

    // Se pasta não existir, criar estrutura básica
    if (!node || typeof node !== 'object') {
      VFS.mkdir(vessiePath);
      // Adicionar subpastas padrão
      const user = S.user || 'Vessie';
      ['Desktop', 'Documentos', 'Downloads', 'Imagens'].forEach(folder => {
        VFS.mkdir(`${vessiePath}/${folder}`);
      });
    }

    // Re-resolver após criação
    const resolvedNode = VFS.resolve(vessiePath) || VFS.fs;

    // Gerar output HTML estilo Explorer Windows 10
    let html = '';
    let dirCount = 0;
    let fileCount = 0;

    if (resolvedNode && typeof resolvedNode === 'object') {
      html += `<div class="win10-folder-view">`;
      html += `<div class="win10-pathbar">`;
      html += `<span class="win10-path">${vessieToWin(vessiePath)}</span>`;
      html += `</div>`;

      // Header da pasta
      html += `<div class="win10-folder-header">`;
      html += `<span class="win10-folder-icon">${WIN10_ICONS.folder}</span>`;
      html += `<span class="win10-folder-name">${folderPath || 'Pastas Recentes'}</span>`;
      html += `</div>`;

      // Lista de itens
      html += `<div class="win10-file-list">`;

      // Pastas primeiro
      const folders = [];
      const files = [];

      Object.keys(resolvedNode).forEach(name => {
        const item = resolvedNode[name];
        const isDir = item && typeof item === 'object' && !Array.isArray(item);

        if (isDir) {
          folders.push({ name, item });
          dirCount++;
        } else {
          files.push({ name, item, size: item?.length || 0 });
          fileCount++;
        }
      });

      // Pastas
      if (folders.length > 0) {
        html += `<div class="win10-folder-section">`;
        html += `<div class="win10-section-header">`;
        html += `<span>Pastas (${dirCount})</span>`;
        html += `</div>`;
        folders.forEach(f => {
          const icon = WIN10_ICONS.folder;
          const isSelected = selectedPath && selectedPath.includes(f.name);
          html += `
            <div class="win10-item ${isSelected ? 'win10-item-selected' : ''}" 
                 onclick="VSSieOS.navigateTo('${f.name}')"
                 oncontextmenu="event.preventDefault(); VSSieOS.openFolder('${f.name}')">
              <span class="win10-item-icon">${icon}</span>
              <span class="win10-item-name">${f.name}</span>
            </div>`;
        });
        html += `</div>`;
      }

      // Arquivos
      if (files.length > 0) {
        html += `<div class="win10-file-section">`;
        html += `<div class="win10-section-header">`;
        html += `<span>Arquivos (${fileCount})</span>`;
        html += `</div>`;
        files.forEach(f => {
          const ext = (f.name.match(/\.([^.]+)$/) || [])[1].toLowerCase();
          const icon = WIN10_ICONS.document; // default
          const isSelected = selectedPath && selectedPath === f.name;
          html += `
            <div class="win10-item ${isSelected ? 'win10-item-selected' : ''}"
                 onclick="VSSieOS.openFile('${f.name}')"
                 oncontextmenu="event.preventDefault(); VSSieOS.showFileDetails('${f.name}')">
              <span class="win10-item-icon">${icon}</span>
              <span class="win10-item-name">${f.name}</span>
              <span class="win10-item-size">${f.size > 0 ? Math.round(f.size / 1024) + ' KB' : '—'}</span>
            </div>`;
        });
        html += `</div>`;
      }

      html += `</div>`; // fechar win10-file-list
      html += `</div>`; // fechar win10-folder-view
    }

    return html;
  }

  // --- Menu Iniciar estilo Windows 10 ---
  function generateStartMenu() {
    const user = S.user || 'Vessie';
    return `
      <div class="win10-start-menu">
        <div class="win10-start-left">
          <div class="win10-user-section">
            <span class="win10-user-icon">${WIN10_ICONS.user}</span>
            <span class="win10-user-name">${user}</span>
          </div>
          <hr style="margin:8px 0;">
          <div class="win10-app-list">
            <button class="win10-start-btn" onclick="VSSieOS.openApp('explorer')">Explorador</button>
            <button class="win10-start-btn" onclick="VSSieOS.openApp('terminal')">Terminal</button>
            <button class="win10-start-btn" onclick="VSSieOS.openApp('emulator')">Emulador</button>
            <button class="win10-start-btn" onclick="VSSieOS.openApp('games')">Jogos</button>
            <button class="win10-start-btn" onclick="VSSieOS.openApp('settings')">Configurações</button>
            <button class="win10-start-btn" onclick="VSSieOS.openApp('steam')">Steam</button>
            <button class="win10-start-btn" style="border-color:rgba(255,0,0,0.3)" onclick="VSSieOS.logout()">Sair</button>
          </div>
        </div>
        <div class="win10-start-right">
          <span>Pinned:</span>
          <button class="win10-pinned-app">Nav.</button>
          <button class="win10-pinned-app">Arc.</button>
          <button class="win10-pinned-app">Doc.</button>
        </div>
        <hr style="margin:8px 0;">
        <button class="win10-power-btn" onclick="VSSieOS.shutdown()">Desligar</button>
        <button class="win10-power-btn" onclick="VSSieOS.reboot()">Reiniciar</button>
      </div>
    `;
  }

  // --- Exportar para window ---
  window.Vin10 = {
    initWin10Structure,
    winToVessie,
    vessieToWin,
    WIN10_FOLDERS,
    WIN10_ICONS,
    generateFolderView,
    generateStartMenu,
    UserFolders: WIN10_FOLDERS.UserProfile.special,
    SystemFolders: WIN10_FOLDERS.System.special
  };

  // Auto-inicializar ao carregar
  try { setTimeout(initWin10Structure, 500); } catch (e) { }

})();
// shortcuts.js — Atalhos de Teclado do VessieOS
// Atalhos estilo Windows 10 para o sistema
// Dependências: document, window

(function () {
  "use strict";

  // Lista de atalhos do sistema
  const SHORTCUTS = [
    // Atalhos globais
    { keys: 'Win', action: 'Abrir Menu Iniciar', category: 'Geral' },
    { keys: 'Win + E', action: 'Abrir Explorador de Arquivos', category: 'Geral' },
    { keys: 'Win + R', action: 'Abrir Executar', category: 'Geral' },
    { keys: 'Win + D', action: 'Mostrar Área de Trabalho', category: 'Geral' },
    { keys: 'Win + L', action: 'Bloquear', category: 'Geral' },
    { keys: 'Win + Tab', action: 'Exibir Exibição de Tarefas', category: 'Geral' },
    { keys: 'Win + PrtScn', action: 'Capturar tela', category: 'Geral' },

    // Terminal
    { keys: 'Ctrl + C', action: 'Copiar / Interromper', category: 'Terminal' },
    { keys: 'Ctrl + V', action: 'Colar', category: 'Terminal' },
    { keys: 'Tab', action: 'Autocompletar', category: 'Terminal' },
    { keys: '↑ / ↓', action: 'Histórico de comandos', category: 'Terminal' },
    { keys: '!!', action: 'Repetir último comando', category: 'Terminal' },
    { keys: 'Ctrl + S', action: 'Salvar (editor)', category: 'Terminal' },
    { keys: 'Ctrl + Q', action: 'Sair do editor', category: 'Terminal' },

    // Janelas
    { keys: 'Alt + F4', action: 'Fechar janela', category: 'Janelas' },
    { keys: 'Alt + Tab', action: 'Alternar janelas', category: 'Janelas' },
    { keys: 'F11', action: '最大化/最小化', category: 'Janelas' },
    { keys: 'Win + ↑', action: 'Maximizar', category: 'Janelas' },
    { keys: 'Win + ↓', action: 'Minimizar', category: 'Janelas' },
    { keys: 'Win + ←', action: 'Encostar à esquerda', category: 'Janelas' },
    { keys: 'Win + →', action: 'Encostar à direita', category: 'Janelas' },

    // Sistema
    { keys: 'Ctrl + Shift + Esc', action: 'Abrir Gerenciador de Tarefas', category: 'Sistema' },
    { keys: 'Ctrl + Shift + Del', action: 'Abrir Segurança', category: 'Sistema' },
    { keys: 'F1', action: 'Ajuda', category: 'Sistema' },
    { keys: 'F2', action: 'Renomear', category: 'Sistema' },
    { keys: 'F3', action: 'Pesquisar', category: 'Sistema' },
    { keys: 'F5', action: 'Atualizar', category: 'Sistema' },
    { keys: 'F10', action: 'Menu de contexto', category: 'Sistema' },

    // Edição
    { keys: 'Ctrl + A', action: 'Selecionar tudo', category: 'Edição' },
    { keys: 'Ctrl + X', action: 'Recortar', category: 'Edição' },
    { keys: 'Ctrl + Z', action: 'Desfazer', category: 'Edição' },
    { keys: 'Ctrl + Y', action: 'Refazer', category: 'Edição' },
    { keys: 'Ctrl + F', action: 'Localizar', category: 'Edição' },
    { keys: 'Ctrl + S', action: 'Salvar', category: 'Edição' },

    // VessieOS específicos
    { keys: 'Ctrl + `', action: 'Abrir Terminal', category: 'VessieOS' },
    { keys: 'Ctrl + Shift + P', action: 'Paleta de Comandos', category: 'VessieOS' },
    { keys: 'Ctrl + B', action: 'Alternar Barra Lateral', category: 'VessieOS' },
    { keys: 'Ctrl + N', action: 'Nova Janela', category: 'VessieOS' },
    { keys: 'Ctrl + W', action: 'Fechar Janela', category: 'VessieOS' },
    { keys: 'Ctrl + Shift + N', action: 'Nova Pasta', category: 'VessieOS' }
  ];

  // Registrar atalho global
  function registerShortcut(keys, action, handler) {
    const shortcut = { keys, action, handler };
    registeredShortcuts.push(shortcut);
    return shortcut;
  }

  const registeredShortcuts = [];

  // Processar tecla pressionada
  function handleKeyDown(e) {
    const key = e.key;
    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;
    const alt = e.altKey;

    // Montar sequência de teclas
    let keys = [];
    if (ctrl) keys.push('Ctrl');
    if (shift) keys.push('Shift');
    if (alt) keys.push('Alt');
    keys.push(key);

    const keysStr = keys.join(' + ');

    // Atalhos do sistema
    if (key === 'F1') {
      e.preventDefault();
      if (typeof toast === 'function') toast('💜 VessieOS - Ajuda em breve', 'info');
      return;
    }

    if (key === 'F3' || (ctrl && key === 'f')) {
      e.preventDefault();
      if (window.VessieSearch) {
        const query = prompt('🔍 Pesquisar no VessieOS:');
        if (query) {
          const results = window.VessieSearch.universalSearch(query);
          if (results.apps.length > 0) {
            toast(`📦 ${results.apps.length} apps encontrados`, 'info');
          }
          if (results.commands.length > 0) {
            toast(`⌨️ ${results.commands.length} comandos encontrados`, 'info');
          }
        }
      }
      return;
    }

    if (ctrl && key === '`') {
      e.preventDefault();
      if (typeof window.openTerminal === 'function') {
        window.openTerminal();
        toast('💻 Terminal aberto', 'info');
      }
      return;
    }

    if (ctrl && shift && key === 'P') {
      e.preventDefault();
      const cmd = prompt('⚡ Paleta de Comandos:');
      if (cmd && window.executeCommand) {
        window.executeCommand(cmd);
      }
      return;
    }

    // Atalhos registrados
    registeredShortcuts.forEach(shortcut => {
      if (shortcut.keys === keysStr && typeof shortcut.handler === 'function') {
        e.preventDefault();
        shortcut.handler();
      }
    });
  }

  // Inicializar atalhos
  function initShortcuts() {
    document.addEventListener('keydown', handleKeyDown);
  }

  // Listar atalhos por categoria
  function getShortcutsByCategory() {
    const categories = {};
    SHORTCUTS.forEach(shortcut => {
      const cat = shortcut.category || 'Outros';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(shortcut);
    });
    return categories;
  }

  // Gerar help de atalhos
  function generateShortcutsHelp() {
    const categories = getShortcutsByCategory();
    let html = '<div style="padding: 16px; max-height: 400px; overflow-y: auto;">';

    Object.entries(categories).forEach(([cat, shortcuts]) => {
      html += `<h3 style="margin-top: 16px; margin-bottom: 8px; color: #1e293b;">${cat}</h3>`;
      html += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px;">';
      shortcuts.forEach(s => {
        html += `
          <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #f1f5f9;">
            <kbd style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; color: #1e293b;">${s.keys}</kbd>
            <span style="font-size: 0.8rem; color: #64748b;">${s.action}</span>
          </div>
        `;
      });
      html += '</div>';
    });

    html += '</div>';
    return html;
  }

  // Mostrar janela de atalhos
  function showShortcutsWindow() {
    const win = createWin('Atalhos de Teclado', '⌨️', generateShortcutsHelp(), 600, 500);
    return win;
  }

  // Auto-inicializar
  try {
    initShortcuts();
  } catch (e) {
    console.error('Erro ao inicializar atalhos:', e);
  }

  // Exportar
  window.VessieShortcuts = {
    SHORTCUTS,
    registerShortcut,
    getShortcutsByCategory,
    generateShortcutsHelp,
    showShortcutsWindow
  };

})();
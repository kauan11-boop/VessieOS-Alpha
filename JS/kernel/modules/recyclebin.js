// recyclebin.js — Lixeira do VessieOS
// Sistema de lixeira estilo Windows 10
// Dependências: window.VFS, window.S, window.toast, localStorage

(function () {
  "use strict";

  const RECYCLE_KEY = 'vessieos_recycle_bin';
  const MAX_ITEMS = 1000;

  // Carregar itens da lixeira
  function loadItems() {
    try {
      const data = localStorage.getItem(RECYCLE_KEY);
      if (data) return JSON.parse(data);
    } catch (e) { }
    return [];
  }

  // Salvar itens da lixeira
  function saveItems(items) {
    try {
      localStorage.setItem(RECYCLE_KEY, JSON.stringify(items));
      return true;
    } catch (e) { }
    return false;
  }

  // Mover arquivo/pasta para a lixeira
  function moveToRecycle(path) {
    if (!path) return false;

    // Verificar se existe no VFS
    const node = VFS.resolve(path);
    if (node === null || node === undefined) {
      if (typeof toast === 'function') toast('❌ Arquivo não encontrado', 'error');
      return false;
    }

    // Obter informações do item
    const stat = VFS.stat(path);
    const name = stat.name || path.split('/').pop();

    // Criar item da lixeira
    const recycleItem = {
      id: Date.now().toString(36),
      originalPath: path,
      name: name,
      type: stat.isDir ? 'folder' : 'file',
      size: stat.size || 0,
      deletedAt: Date.now(),
      content: typeof node === 'string' ? node : null,
      children: stat.isDir ? JSON.parse(JSON.stringify(node)) : null
    };

    // Adicionar à lixeira
    const items = loadItems();
    items.unshift(recycleItem);

    // Limitar tamanho da lixeira
    while (items.length > MAX_ITEMS) {
      items.pop();
    }

    if (saveItems(items)) {
      // Remover do VFS original
      VFS.delete(path);
      try { persistState(); } catch (e) { }

      if (typeof toast === 'function') {
        toast(`🗑️ "${name}" movido para a lixeira`, 'success');
      }
      return true;
    }

    return false;
  }

  // Restaurar item da lixeira
  function restoreItem(itemId) {
    const items = loadItems();
    const idx = items.findIndex(i => i.id === itemId);

    if (idx < 0) {
      if (typeof toast === 'function') toast('❌ Item não encontrado na lixeira', 'error');
      return false;
    }

    const item = items[idx];

    // Restaurar no VFS
    if (item.type === 'folder' && item.children) {
      // Restaurar pasta com conteúdo
      const parts = item.originalPath.split('/');
      const parentPath = parts.slice(0, -1).join('/') || ((typeof VFS !== 'undefined' && VFS && typeof VFS.userDir === 'function') ? VFS.userDir('Área de Trabalho') : 'Desktop');
      VFS.mkdir(item.originalPath);
      Object.entries(item.children).forEach(([key, value]) => {
        VFS.write(`${item.originalPath}/${key}`, value);
      });
    } else if (item.content !== null) {
      // Restaurar arquivo
      VFS.write(item.originalPath, item.content);
    } else {
      // Criar arquivo vazio se não tem conteúdo
      VFS.write(item.originalPath, '');
    }

    // Remover da lixeira
    items.splice(idx, 1);
    saveItems(items);

    try { persistState(); } catch (e) { }

    if (typeof toast === 'function') {
      toast(`♻️ "${item.name}" restaurado`, 'success');
    }
    return true;
  }

  // Deletar permanentemente item da lixeira
  function deletePermanently(itemId) {
    const items = loadItems();
    const idx = items.findIndex(i => i.id === itemId);

    if (idx < 0) return false;

    const item = items[idx];
    items.splice(idx, 1);
    saveItems(items);

    if (typeof toast === 'function') {
      toast(`❌ "${item.name}" excluído permanentemente`, 'warning');
    }
    return true;
  }

  // Esvaziar lixeira
  function emptyRecycleBin() {
    const count = loadItems().length;
    saveItems([]);

    if (typeof toast === 'function') {
      toast(`🗑️ Lixeira esvaziada (${count} itens removidos)`, 'success');
    }
    return count;
  }

  // Listar itens da lixeira
  function listItems() {
    return loadItems();
  }

  // Obter tamanho total da lixeira
  function getTotalSize() {
    return loadItems().reduce((sum, item) => sum + (item.size || 0), 0);
  }

  // Gerar visualização da lixeira
  function generateRecycleView() {
    const items = loadItems();
    const totalSize = getTotalSize();

    let html = '<div style="padding: 24px;">';

    // Header
    html += `
      <div style="background: linear-gradient(135deg, #a78bfa 0%, #e9e4f5 100%); padding: 20px; border-radius: 12px; margin-bottom: 24px;">
        <h2 style="margin: 0; color: #1e293b;">🗑️ Lixeira</h2>
        <p style="color: #64748b; margin-top: 8px;">${items.length} itens · ${formatBytes(totalSize)}</p>
      </div>
    `;

    // Ações
    html += `
      <div style="display: flex; gap: 8px; margin-bottom: 16px;">
        <button onclick="VessieRecycleBin.empty()" style="background: #ef4444; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">Esvaziar Lixeira</button>
        <button onclick="VessieRecycleBin.refresh()" style="background: #f1f5f9; border: 1px solid #e2e8f0; padding: 8px 16px; border-radius: 6px; cursor: pointer;">Atualizar</button>
      </div>
    `;

    // Itens
    if (items.length === 0) {
      html += '<div style="text-align: center; padding: 48px; color: #64748b;">A lixeira está vazia</div>';
    } else {
      html += '<div style="display: flex; flex-direction: column; gap: 8px;">';
      items.forEach(item => {
        const icon = item.type === 'folder' ? '📁' : '📄';
        const date = new Date(item.deletedAt).toLocaleDateString('pt-BR');
        const size = formatBytes(item.size);

        html += `
          <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; display: flex; align-items: center; gap: 12px;">
            <span style="font-size: 24px;">${icon}</span>
            <div style="flex: 1;">
              <div style="font-weight: 500; color: #1e293b;">${item.name}</div>
              <div style="font-size: 0.75rem; color: #64748b;">${date} · ${size} · De: ${item.originalPath}</div>
            </div>
            <button onclick="VessieRecycleBin.restore('${item.id}')" style="background: #22c55e; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">Restaurar</button>
            <button onclick="VessieRecycleBin.deletePermanent('${item.id}')" style="background: #ef4444; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.8rem;">Deletar</button>
          </div>
        `;
      });
      html += '</div>';
    }

    html += '</div>';
    return html;
  }

  // Formatar bytes
  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    return (bytes / 1073741824).toFixed(1) + ' GB';
  }

  // Abrir janela da lixeira
  function openRecycleBin() {
    const win = createWin('Lixeira', '🗑️', generateRecycleView(), 700, 500);
    return win;
  }

  // Refresh view
  function refresh() {
    // Regenerar visualização se janela estiver aberta
    const win = document.querySelector('.wb');
    if (win) {
      // Simplified refresh - just reopen
      openRecycleBin();
    }
  }

  // Exportar
  window.VessieRecycleBin = {
    moveToRecycle,
    restoreItem,
    deletePermanently,
    emptyRecycleBin,
    listItems,
    getTotalSize,
    generateRecycleView,
    openRecycleBin,
    refresh,
    restore: restoreItem,
    deletePermanent: deletePermanently,
    empty: emptyRecycleBin
  };

  // Integrar com terminal - adicionar comando 'trash'
  // (será registrado no terminal.js via window.VessieRecycleBin)

})();
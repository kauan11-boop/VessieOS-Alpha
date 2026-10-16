// controlpanel.js — Painel de Controle do VessieOS
// Interface de configurações estilo Windows 10
// Dependências: window.S, window.ThemeManager, window.VFS, toast

(function () {
  "use strict";

  // Categorias do Painel de Controle
  const CATEGORIES = [
    { id: 'system', name: 'Sistema', icon: '💻', desc: 'Hardware, performance e configurações do sistema' },
    { id: 'devices', name: 'Dispositivos', icon: '🖨️', desc: 'Impressoras, scanners e dispositivos conectados' },
    { id: 'network', name: 'Rede e Internet', icon: '🌐', desc: 'Conexões de rede e configurações de internet' },
    { id: 'personalization', name: 'Personalização', icon: '🎨', desc: 'Aparência, temas e papel de parede' },
    { id: 'accounts', name: 'Contas', icon: '👤', desc: 'Perfis de usuário e opções de login' },
    { id: 'time', name: 'Hora e Idioma', icon: '🕐', desc: 'Fuso horário, idioma e formatos regionais' },
    { id: 'accessibility', name: 'Facilidade de Acesso', icon: '♿', desc: 'Configurações de acessibilidade' },
    { id: 'privacy', name: 'Privacidade', icon: '🔒', desc: 'Controle de dados e permissões' },
    { id: 'update', name: 'Atualização e Segurança', icon: '🛡️', desc: 'Windows Update e segurança do sistema' }
  ];

  // Gerar interface do Painel de Controle
  function generateControlPanel() {
    let html = '<div class="control-panel">';

    // Header
    html += `
      <div class="cp-header" style="background: linear-gradient(135deg, #a78bfa 0%, #e9e4f5 100%); padding: 24px; border-radius: 12px 12px 0 0;">
        <h2 style="margin: 0; color: #1e293b;">Painel de Controle</h2>
        <p style="color: #64748b; margin-top: 8px;">Gerencie as configurações do VessieOS</p>
      </div>
    `;

    // Categorias
    html += '<div class="cp-categories" style="padding: 24px; display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px;">';

    CATEGORIES.forEach(cat => {
      html += `
        <div class="cp-category" onclick="VessieControlPanel.openCategory('${cat.id}')" style="background: #f8fafc; border-radius: 12px; padding: 16px; cursor: pointer; transition: all 0.2s; border: 1px solid #e2e8f0;">
          <span style="font-size: 32px;">${cat.icon}</span>
          <h3 style="margin: 8px 0 4px; color: #1e293b; font-size: 1rem;">${cat.name}</h3>
          <p style="color: #64748b; font-size: 0.8rem; margin: 0;">${cat.desc}</p>
        </div>
      `;
    });

    html += '</div>';

    // Detalhes da categoria selecionada
    html += '<div id="cp-details" style="margin-top: 24px; padding: 24px; background: #f8fafc; border-radius: 12px; display: none;"></div>';

    html += '</div>';

    return html;
  }

  // Abrir categoria específica
  function openCategory(categoryId) {
    const category = CATEGORIES.find(c => c.id === categoryId);
    if (!category) return;

    const details = document.getElementById('cp-details');
    if (details) {
      details.style.display = 'block';
      details.innerHTML = `
        <h3 style="margin-top: 0; color: #1e293b;">${category.icon} ${category.name}</h3>
        <p style="color: #64748b;">${category.desc}</p>
        <hr style="border-color: #e2e8f0;">
        <div id="cp-content">${generateCategoryContent(categoryId)}</div>
      `;
    }

    // Notificar
    if (typeof toast === 'function') {
      toast(`📂 Abrindo: ${category.name}`, 'info');
    }
  }

  // Gerar conteúdo por categoria
  function generateCategoryContent(categoryId) {
    switch (categoryId) {
      case 'system':
        return `
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
            <div>
              <h4>Sistema</h4>
              <p>Dispositivo: VessieOS PC</p>
              <p>Processador: Intel Core i9-14900K</p>
              <p>RAM: 32 GB DDR5</p>
              <p>Sistema: VessieOS 3.0 (64-bit)</p>
            </div>
            <div>
              <h4>Performance</h4>
              <button onclick="VessieControlPanel.openTaskManager()" style="background: #1d4ed8; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">Abrir Gerenciador de Tarefas</button>
            </div>
          </div>
        `;

      case 'personalization':
        return `
          <h4>Temas Disponíveis</h4>
          <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px;">
            ${['VessieOS', 'Nebula', 'Solarized', 'Dracula', 'Aurora'].map(theme => `
              <button onclick="VessieControlPanel.applyTheme('${theme}')" style="background: #f1f5f9; border: 1px solid #e2e8f0; padding: 8px 16px; border-radius: 6px; cursor: pointer;">${theme}</button>
            `).join('')}
          </div>
        `;

      case 'accounts':
        return `
          <h4>Contas de Usuário</h4>
          <p>Usuário atual: <strong>${S.user || 'Vessie'}</strong></p>
          <p>Perfis disponíveis via VessieSteam:</p>
          <button onclick="VessieSteam.reloadProfiles(); VessieControlPanel.refresh();" style="background: #1d4ed8; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; margin-top: 8px;">Atualizar Perfis</button>
        `;

      case 'update':
        return `
          <h4>Windows Update</h4>
          <p>Status: <span style="color: #22c55e;">✓ Atualizado</span></p>
          <p>Última atualização: ${new Date().toLocaleDateString('pt-BR')}</p>
          <button onclick="VessieControlPanel.checkUpdates()" style="background: #1d4ed8; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; margin-top: 8px;">Verificar Atualizações</button>
        `;

      default:
        return '<p style="color: #64748b;">Configurações desta categoria em breve.</p>';
    }
  }

  // Aplicar tema
  function applyTheme(themeName) {
    if (window.ThemeManager && typeof window.ThemeManager.apply === 'function') {
      window.ThemeManager.apply(themeName);
      if (typeof toast === 'function') {
        toast(`🎨 Tema aplicado: ${themeName}`, 'success');
      }
    }
  }

  // Abrir Gerenciador de Tarefas
  function openTaskManager() {
    if (window.VessieTaskManager) {
      const perf = window.VessieTaskManager.getPerformance();
      const win = createWin('Gerenciador de Tarefas', '📊', `
        <div style="padding: 24px;">
          <h3 style="margin-top: 0;">Performance</h3>
          <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 16px;">
            <div>
              <h4>CPU</h4>
              <p>Uso: ${perf.cpu.usage.toFixed(1)}%</p>
              <p>Núcleos: ${perf.cpu.cores}</p>
              <p>Modelo: ${perf.cpu.model}</p>
            </div>
            <div>
              <h4>Memória</h4>
              <p>Uso: ${(perf.memory.usage).toFixed(1)}%</p>
              <p>Usada: ${perf.memory.used.toFixed(1)} MB</p>
              <p>Livre: ${perf.memory.free.toFixed(1)} MB</p>
            </div>
            <div>
              <h4>Disco</h4>
              <p>Uso: ${perf.disk.usage}%</p>
              <p>Usado: ${perf.disk.used} GB</p>
              <p>Livre: ${perf.disk.free} GB</p>
            </div>
          </div>
          <h3 style="margin-top: 24px;">Processos (${window.VessieTaskManager.listProcesses().length})</h3>
          <div style="max-height: 300px; overflow-y: auto; margin-top: 8px;">
            ${window.VessieTaskManager.listProcesses().map(p => `
              <div style="display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #e2e8f0;">
                <span>${p.name}</span>
                <span>${p.cpu.toFixed(1)}% CPU · ${p.mem.toFixed(1)} MB</span>
              </div>
            `).join('')}
          </div>
        </div>
      `, 700, 500);
      return win;
    }
    return null;
  }

  // Verificar atualizações
  function checkUpdates() {
    if (typeof toast === 'function') {
      toast('🔄 Verificando atualizações...', 'info');
    }
    setTimeout(() => {
      if (typeof toast === 'function') {
        toast('✅ Seu VessieOS está atualizado!', 'success');
      }
    }, 2000);
  }

  // Exportar
  window.VessieControlPanel = {
    generateControlPanel,
    openCategory,
    applyTheme,
    openTaskManager,
    checkUpdates,
    CATEGORIES
  };

})();
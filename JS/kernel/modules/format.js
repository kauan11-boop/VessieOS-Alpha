// format.js — Sistema de Formatação e Reset do Remote-Device
// Formata o dispositivo removendo todos os dados e reinstalando a estrutura
// padrão do Windows 10 com interface aprimorada
// Dependências: window.VFS, window.CacheManager, window.RemoteDeviceSync, window.toast

(function () {
  "use strict";

  // --- Configurações de Formatação ---
  const FORMAT_CONFIG = {
    // Nome da pasta criada após format
    resetFolderName: 'Vessie-Reset',
    // Background da interface
    backgroundColor: '#e9e4f5', // Roxo claro
    // Animação de loading
    loadingColor: '#a78bfa', // Roxo médio
    successColor: '#f472b6', // Rosa sucesso
    errorColor: '#ef4444'    // Vermelho erro
  };

  // --- Estrutura Padrão Windows 10 ---
  // Esta estrutura será criada após a formatação
  const WINDOWS_10_STRUCTURE = {
    // Pastas do sistema raiz
    system32: {
      name: 'Windows',
      path: 'Windows',
      files: [
        'system.ini',
        'registry.hiv',
        'ntoskrnl.exe',
        'hal.dll'
      ]
    },
    programFiles: {
      name: 'Program Files',
      path: 'Program Files',
      is64bit: true,
      files: []
    },
    programFilesX86: {
      name: 'Program Files (x86)',
      path: 'Program Files (x86)',
      is64bit: false,
      files: []
    },
    users: {
      name: 'Users',
      path: 'Users',
      // Subpastas padrão por usuário serão criadas na hora
      defaultFolders: ['Desktop', 'Documentos', 'Downloads', 'Imagens', 'Músicas', 'Vídeos']
    }
  };

  // --- Elementos da Interface de Formatação ---
  let formatWin = null;
  let formatStep = 'welcome'; // welcome | terms | confirm | running | complete
  let formatProgress = 0;

  // --- Criar Janela de Formatação ---
  function createFormatWindow() {
    // Background roxo geral
    formatWin = createWin(
      'Formatação de Disco',
      '💿',
      `<div style="background: var(--a); min-height: 100%; color: #1e293b; padding: 24px;">
        <div style="background: linear-gradient(135deg, #a78bfa 0%, #e9e4f5 100%); border-radius: 16px; padding: 32px; margin: -24px -24px 24px -24px; text-align: center;">
          <div style="width: 80px; height: 80px; background: #f472b6; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 32px; color: white;">⚡</span>
          </div>
          <h2 style="color: #1e293b; margin-bottom: 8px;">Formatação de Disco</h2>
          <p style="color: #64748b; font-size: 0.875rem;">Seus dados serão removidos permanentemente.</p>
        </div>
        
        <!-- Etapa atual -->
        <div id="format-step-indicator" style="margin: 24px 0; padding: 12px; background: #f1f5f9; border-radius: 8; display: none;">
          <span id="format-step-text">Digite 'allow' para confirmar formatação.</span>
        </div>

        <!-- Menu de Termos e Condições -->
        <div id="format-terms" style="margin: 24px 0; max-height: 200px; overflow-y: auto; display: none; background: #f8fafc; border-radius: 8; padding: 16px; border: 1px solid #e2e8f0;">
          <h3 style="margin-top: 0; color: #1e293b;">Termos e Condições</h3>
          <p style="color: #64748b; margin-bottom: 16px;">Ao prosseguir, você concorda que:</p>
          <ul style="color: #64748b; margin-bottom: 16px; padding-left: 20px;">
            <li>Todos os arquivos neste dispositivo serão permanentemente removidos.</li>
            <li>Esta ação não pode ser desfeita.</li>
            <li>O sistema será reinstalado com a estrutura padrão do Windows 10.</li>
            <li>Dados sincronizados no Remote-Device serão perdidos.</li>
          </ul>
          <div style="display: flex; gap: 12px; justify-content: flex-end;">
            <button id="terms-decline" style="background: #e2e8f0; color: #64748b; border: none; padding: 8px 16px; border-radius: 6; font-size: 0.875rem; cursor: pointer;">

              Recusar
            </button>
            <button id="terms-accept" style="background: #a78bfa; color: white; border: none; padding: 8px 16px; border-radius: 6; font-size: 0.875rem; cursor: pointer; font-weight: 500;">
              Concordo
            </button>
          </div>
        </div>

        <!-- Botão Continuar -->
        <div id="format-continor" style="margin: 24px 0; display: none; justify-content: flex-end;">
          <button id="format-continue" style="background: #1d4ed8; color: white; border: none; padding: 10px 24px; border-radius: 6; font-size: 1rem; font-weight: 500; cursor: pointer;">
            Continuar
          </button>
        </div>

        <!-- Progresso -->
        <div id="format-progress" style="margin: 24px 0; display: none;">
          <div style="background: #cbd5e1; border-radius: 6; height: 8px; width: 100%; overflow: hidden;">
            <div id="format-progress-bar" style="background: #1d4ed8; height: 100%; width: 0%; transition: width 0.3s;></div>
          </div>
          <span id="format-progress-text">0%</span>
        </div>

        <!-- Resultado -->
        <div id="format-result" style="margin: 24px 0; display: none; padding: 16px; border-radius: 8;></div>
      </div>`,
      520, 420
    );

    // Elementos da interface
    const stepIndicator = formatWin.querySelector('#format-step-indicator');
    const termsDiv = formatWin.querySelector('#format-terms');
    const continueDiv = formatWin.querySelector('#format-continor');
    const resultDiv = formatWin.querySelector('#format-result');
    const progressDiv = formatWin.querySelector('#format-progress');
    const progressBar = formatWin.querySelector('#format-progress-bar');
    const progressText = formatWin.querySelector('#format-progress-text');

    // Botões
    const allowBtn = formatWin.querySelector('[data-act="format-allow"]');
    const termsDecline = formatWin.querySelector('#terms-decline');
    const termsAccept = formatWin.querySelector('#terms-accept');
    const formatContinue = formatWin.querySelector('#format-continue');

    // Eventos
    // Allow button - passo inicial
    if (allowBtn) {
      allowBtn.addEventListener('click', () => {
        stageTerms();
      });
    }

    // Terms - decline
    if (termsDecline) {
      termsDecline.addEventListener('click', () => {
        closeFormatWindow('cancelled');
      });
    }

    // Terms - accept
    if (termsAccept) {
      termsAccept.addEventListener('click', () => {
        stageConfirm();
      });
    }

    // Continue button
    if (formatContinue) {
      formatContinue.addEventListener('click', () => {
        startFormat();
      });
    }

    return formatWin;
  }

  // --- Etapas da Formatação ---

  // Etapa 1: Digite allow
  function stageWelcome() {
    formatStep = 'welcome';
    const stepIndicator = document.getElementById('format-step-indicator');
    const termsDiv = document.getElementById('format-terms');
    const continueDiv = document.getElementById('format-continor');
    const resultDiv = document.getElementById('format-result');
    const progressDiv = document.getElementById('format-progress');

    stepIndicator.style.display = 'block';
    termsDiv.style.display = 'none';
    continueDiv.style.display = 'none';
    resultDiv.style.display = 'none';
    progressDiv.style.display = 'none';

    // Atualizar texto
    const stepText = stepIndicator.querySelector('#format-step-text');
    if (stepText) stepText.textContent = 'Digite \'allow\' para confirmar formatação.';
  }

  // Etapa 2: Termos e Condições
  function stageTerms() {
    formatStep = 'terms';
    const stepIndicator = document.getElementById('format-step-indicator');
    const termsDiv = document.getElementById('format-terms');
    const continueDiv = document.getElementById('format-continor');
    const resultDiv = document.getElementById('format-result');
    const progressDiv = document.getElementById('format-progress');

    stepIndicator.style.display = 'none';
    termsDiv.style.display = 'block';
    continueDiv.style.display = 'none';
    resultDiv.style.display = 'none';
    progressDiv.style.display = 'none';

    // Foco no botão aceitar
    const termsAccept = termsDiv.querySelector('#terms-accept');
    if (termsAccept) termsAccept.focus();
  }

  // Etapa 3: Confirmar formatação
  function stageConfirm() {
    formatStep = 'confirm';
    const stepIndicator = document.getElementById('format-step-indicator');
    const termsDiv = document.getElementById('format-terms');
    const continueDiv = document.getElementById('format-continor');
    const resultDiv = document.getElementById('format-result');
    const progressDiv = document.getElementById('format-progress');

    stepIndicator.style.display = 'none';
    termsDiv.style.display = 'none';
    continueDiv.style.display = 'block';
    resultDiv.style.display = 'none';
    progressDiv.style.display = 'none';
  }

  // Etapa 4: Em andamento
  function stageRunning() {
    formatStep = 'running';
    const stepIndicator = document.getElementById('format-step-indicator');
    const termsDiv = document.getElementById('format-terms');
    const continueDiv = document.getElementById('format-continor');
    const resultDiv = document.getElementById('format-result');
    const progressDiv = document.getElementById('format-progress');

    stepIndicator.style.display = 'none';
    termsDiv.style.display = 'none';
    continueDiv.style.display = 'none';
    resultDiv.style.display = 'block';
    progressDiv.style.display = 'block';

    // Reset progress
    formatProgress = 0;
    if (progressBar) progressBar.style.width = '0%';
    if (progressText) progressText.textContent = '0%';

    // Iniciar progresso
    runFormatProgress();
  }

  // Etapa 5: Concluído
  function stageComplete(success) {
    formatStep = 'complete';
    const stepIndicator = document.getElementById('format-step-indicator');
    const termsDiv = document.getElementById('format-terms');
    const continueDiv = document.getElementById('format-continor');
    const resultDiv = document.getElementById('format-result');
    const progressDiv = document.getElementById('format-progress');

    stepIndicator.style.display = 'none';
    termsDiv.style.display = 'none';
    continueDiv.style.display = 'none';
    resultDiv.style.display = 'block';
    progressDiv.style.display = 'none';

    if (success) {
      resultDiv.innerHTML = `<div style="background: #f0abf5; color: #1e293b; border-radius: 8; padding: 16px;">
        <span style="font-size: 24px; margin-right: 8px;">✅</span>
        <strong>Formatação Concluída!</strong><br>
        <span style="color: #64748b;">Estrutura do Windows 10 reinstalada com sucesso.</span>
      </div>`;
      // Tocar som de sucesso ou fazer toast
      if (typeof toast === 'function') {
        toast('📁 Disco formatado e reinstalado com sucesso!', 'success');
      }
    } else {
      resultDiv.innerHTML = `<div style="background: #fca5a5; color: #1e293b; border-radius: 8; padding: 16px;">
        <span style="font-size: 24px; margin-right: 8px;">❌</span>
        <strong>Erro na Formatação</strong><br>
        <span style="color: #64748b;">Não foi possível concluir a formatação.</span>
      </div>`;
      if (typeof toast === 'function') {
        toast('❌ Erro na formatação do disco.', 'error');
      }
    }
  }

  // --- Executar Formatação ---
  async function startFormat() {
    // Verificar se é pasta Remote-Device
    const raw = document.getElementById('t-inp')?.value.trim() || '';
    if (raw.toLowerCase() !== 'allow') {
      if (typeof toast === 'function') toast('Digite \'allow\' para iniciar a formatação.', 'error');
      return;
    }

    // Solicitar confirmação final
    if (!confirm('⚠️ TODOS OS DADOS SERÃO PERMANENTMENTE REMOVIDOS. Tem certeza que deseja formatar?')) {
      if (typeof toast === 'function') toast('Formatação cancelada.', 'warning');
      return;
    }

    stageRunning();

    try {
      // 1. Limpar VFS deste dispositivo (simular Remote-Device)
      await formatRemoteDevice();

      // 2. Criar estrutura Windows 10
      await createWindows10Structure();

      // 3. Atualizar progresso
      if (progressBar) progressBar.style.width = '100%';
      if (progressText) progressText.textContent = '100%';

      // 4. Concluir
      stageComplete(true);

      // Auto-fechar após 3 segundos
      setTimeout(() => {
        if (formatWin) formatWin.querySelector('[data-act="cls"]')?.click();
      }, 3000);

    } catch (err) {
      console.error('Formatação erro:', err);
      stageComplete(false);
    }
  }

  // Formatar o Remote-Device (limpar VFS)
  async function formatRemoteDevice() {
    // Lista todas as chaves do localStorage que começam com dispositivos
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('vessieos_fs') || key.includes('remote') || key.includes('device'))) {
        keysToRemove.push(key);
      }
    }

    // Remover chaves relacionadas ao VFS
    keysToRemove.forEach(key => localStorage.removeItem(key));

    // Também limpar metadados
    if (window.S && window.S.fsMeta) {
      const metaKeys = Object.keys(window.S.fsMeta).filter(k => k.includes('remote') || k.includes('device'));
      metaKeys.forEach(k => delete window.S.fsMeta[k]);
    }

    // Persistir estado
    try { persistState(); } catch (e) { }

    return true;
  }

  // Criar estrutura Windows 10
  function createWindows10Structure() {
    const user = S.user || 'Vessie';

    // 1. Criar pasta Windows (sistema)
    const windowsPath = `Users/${user}/`;
    if (VFS) {
      VFS.mkdir(windowsPath);
      // Criar algumas pastas do sistema
      VFS.mkdir(`${windowsPath}System32/`);
      VFS.mkdir(`${windowsPath}SysWOW64/`);
    }

    // 2. Criar Program Files
    if (VFS) {
      VFS.mkdir('Program Files/');
      VFS.mkdir('Program Files (x86)/');
    }

    // 3. Criar usuários com pastas padrão
    const userFolders = WINDOWS_10_STRUCTURE.users.defaultFolders;
    userFolders.forEach(folder => {
      if (VFS) {
        VFS.mkdir(`Users/${user}/${folder}/`);
      }
    });

    // 4. Criar pasta Vessie-Reset na raiz
    if (VFS) {
      VFS.mkdir(FORMAT_CONFIG.resetFolderName + '/');
    }

    // Persistir estado
    try { persistState(); } catch (e) { }

    return true;
  }

  // Barra de progresso animada
  function runFormatProgress() {
    if (formatProgress >= 100) return;

    formatProgress += Math.random() * 15 + 5; // 5-20 por passo
    if (formatProgress > 100) formatProgress = 100;

    if (progressBar) progressBar.style.width = `${formatProgress}%`;
    if (progressText) progressText.textContent = `${Math.round(formatProgress)}%`;

    // Agenda próximo passo
    setTimeout(runFormatProgress, 100 + Math.random() * 100);
  }

  // --- Exportar ---
  window.Vin10Format = {
    createFormatWindow,
    startFormat,
    stageWelcome,
    stageTerms,
    stageConfirm,
    stageRunning,
    stageComplete,
    FORMAT_CONFIG
  };

  // Auto-criar janela ao chamar
  // window.Vin10Format.createFormatWindow();

})();
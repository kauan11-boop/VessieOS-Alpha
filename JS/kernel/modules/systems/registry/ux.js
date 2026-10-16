/**
 * Categoria: UX (16 sistemas)
 * Pequenos utilitários de interação: histórico de clipboard, snap de
 * janelas, modo foco, workspace virtual, etc. Vários criam widgets
 * flutuantes reais (persistidos em localStorage).
 */
export default function buildUXSystems({ helpers }) {
    const { createWidget, storageGet, storageSet, toast } = helpers;
    const systems = [];

    // --- Histórico de área de transferência ---
    systems.push((function clipboardHistory() {
        let handler = null;
        return {
            id: 'ux.clipboard-history', category: 'ux', name: 'Histórico da Área de Transferência',
            description: 'Guarda os últimos itens copiados para reutilização rápida (Ctrl+Shift+V).',
            enabledByDefault: true,
            enable() {
                handler = () => {
                    const text = window.getSelection?.().toString();
                    if (!text) return;
                    const history = storageGet('clipboard-history', []);
                    history.unshift({ text, at: Date.now() });
                    storageSet('clipboard-history', history.slice(0, 20));
                };
                document.addEventListener('copy', handler);
            },
            disable() { document.removeEventListener('copy', handler); }
        };
    })());

    // --- Snap de janelas em grade ao arrastar perto das bordas ---
    systems.push({
        id: 'ux.window-snap-grid', category: 'ux', name: 'Encaixe de Janelas',
        description: 'Arrastar uma janela até a borda da tela a encaixa automaticamente em metade/quadrante.',
        enabledByDefault: true,
        enable() { document.documentElement.classList.add('vsys-window-snap-enabled'); },
        disable() { document.documentElement.classList.remove('vsys-window-snap-enabled'); }
    });

    // --- Modo Foco (Não Perturbe) ---
    systems.push({
        id: 'ux.focus-mode', category: 'ux', name: 'Modo Foco',
        description: 'Silencia notificações e esconde widgets de distração temporariamente.',
        enabledByDefault: false,
        enable() { document.documentElement.classList.add('vsys-focus-mode'); },
        disable() { document.documentElement.classList.remove('vsys-focus-mode'); }
    });

    // --- Escala de zoom da UI ---
    systems.push({
        id: 'ux.ui-zoom-scale', category: 'ux', name: 'Escala da Interface',
        description: 'Permite ajustar o tamanho geral da UI via variável CSS (--vsys-ui-scale).',
        enabledByDefault: false,
        enable() { document.documentElement.style.setProperty('--vsys-ui-scale', storageGet('ui-scale-value', '1.1')); },
        disable() { document.documentElement.style.removeProperty('--vsys-ui-scale'); }
    });

    // --- Notas adesivas (widget persistente) ---
    systems.push((function stickyNotes() {
        let widget = null;
        return {
            id: 'ux.sticky-notes', category: 'ux', name: 'Notas Adesivas',
            description: 'Um bloco de notas flutuante que salva automaticamente no navegador.',
            enabledByDefault: false,
            enable() {
                widget = createWidget({ id: 'vsys-sticky-notes', title: 'Notas', icon: 'fa-note-sticky', className: 'vsys-sticky-notes' });
                const textarea = document.createElement('textarea');
                textarea.value = storageGet('sticky-notes-text', '');
                textarea.placeholder = 'Escreva algo...';
                textarea.addEventListener('input', () => storageSet('sticky-notes-text', textarea.value));
                widget.body.appendChild(textarea);
            },
            disable() { widget?.el.remove(); }
        };
    })());

    // --- Breadcrumb de navegação no Explorador ---
    systems.push({
        id: 'ux.breadcrumb-nav', category: 'ux', name: 'Navegação por Trilha',
        description: 'Mostra o caminho completo de pastas no topo do Explorador de Arquivos.',
        enabledByDefault: true,
        enable() { document.documentElement.classList.add('vsys-breadcrumb-enabled'); },
        disable() { document.documentElement.classList.remove('vsys-breadcrumb-enabled'); }
    });

    // --- Undo/redo genérico para operações de arquivo ---
    systems.push((function undoRedoStack() {
        return {
            id: 'ux.file-ops-undo-redo', category: 'ux', name: 'Desfazer/Refazer Operações',
            description: 'Mantém uma pilha de ações recentes de arquivos para desfazer com Ctrl+Z.',
            enabledByDefault: true,
            enable() {
                window.__vsysUndoStack = window.__vsysUndoStack || [];
                window.__vsysPushUndo = (action) => { window.__vsysUndoStack.push(action); if (window.__vsysUndoStack.length > 50) window.__vsysUndoStack.shift(); };
            },
            disable() { delete window.__vsysUndoStack; delete window.__vsysPushUndo; }
        };
    })());

    // --- Multi-seleção com shift-click ---
    systems.push({
        id: 'ux.multi-select-shift-click', category: 'ux', name: 'Multi-seleção com Shift',
        description: 'Permite selecionar um intervalo de itens segurando Shift no Explorador de Arquivos.',
        enabledByDefault: true,
        enable() { document.documentElement.classList.add('vsys-multiselect-enabled'); },
        disable() { document.documentElement.classList.remove('vsys-multiselect-enabled'); }
    });

    // --- Menu de contexto aprimorado ---
    systems.push({
        id: 'ux.context-menu-enhancer', category: 'ux', name: 'Menu de Contexto Aprimorado',
        description: 'Adiciona ícones e atalhos visíveis ao menu de botão direito.',
        enabledByDefault: true,
        enable() { document.documentElement.classList.add('vsys-context-menu-enhanced'); },
        disable() { document.documentElement.classList.remove('vsys-context-menu-enhanced'); }
    });

    // --- Ajuste de atraso do tooltip ---
    systems.push({
        id: 'ux.tooltip-delay-tuning', category: 'ux', name: 'Atraso de Dicas Reduzido',
        description: 'Faz as dicas de ferramenta (tooltips) aparecerem mais rápido.',
        enabledByDefault: false,
        enable() { document.documentElement.style.setProperty('--vsys-tooltip-delay', '80ms'); },
        disable() { document.documentElement.style.removeProperty('--vsys-tooltip-delay'); }
    });

    // --- Restauração de sessão (janelas abertas) ---
    systems.push((function sessionRestore() {
        let handler = null;
        return {
            id: 'ux.session-restore', category: 'ux', name: 'Restaurar Sessão',
            description: 'Lembra quais apps estavam abertos e oferece reabri-los no próximo login.',
            enabledByDefault: true,
            enable() {
                handler = () => {
                    const openApps = [...document.querySelectorAll('.window')].map(w => w.dataset.app).filter(Boolean);
                    storageSet('last-session-apps', openApps);
                };
                window.addEventListener('beforeunload', handler);
            },
            disable() { window.removeEventListener('beforeunload', handler); }
        };
    })());

    // --- Trocador de workspace (mesas virtuais) ---
    systems.push((function workspaceSwitcher() {
        return {
            id: 'ux.workspace-switcher', category: 'ux', name: 'Áreas de Trabalho Virtuais',
            description: 'Permite alternar entre até 4 áreas de trabalho independentes (Ctrl+Alt+setas).',
            enabledByDefault: false,
            enable() {
                window.__vsysWorkspace = window.__vsysWorkspace || 0;
                document.documentElement.setAttribute('data-vsys-workspace', String(window.__vsysWorkspace));
            },
            disable() { document.documentElement.removeAttribute('data-vsys-workspace'); }
        };
    })());

    // --- Bloqueio automático por inatividade ---
    systems.push((function inactivityLock() {
        let dispose = null;
        return {
            id: 'ux.inactivity-auto-lock', category: 'ux', name: 'Bloqueio por Inatividade',
            description: 'Bloqueia a tela automaticamente após 10 minutos sem atividade do usuário.',
            enabledByDefault: false,
            enable() {
                dispose = helpers.createIdleTimer(10 * 60 * 1000, () => {
                    document.dispatchEvent(new CustomEvent('vessieos:lock-requested', { detail: { reason: 'inactivity' } }));
                });
            },
            disable() { dispose?.(); }
        };
    })());

    // --- Emoji picker rápido ---
    systems.push({
        id: 'ux.quick-emoji-picker', category: 'ux', name: 'Seletor Rápido de Emoji',
        description: 'Atalho (Win+.) para inserir emojis em qualquer campo de texto focado.',
        enabledByDefault: false,
        enable() { document.documentElement.classList.add('vsys-emoji-picker-enabled'); },
        disable() { document.documentElement.classList.remove('vsys-emoji-picker-enabled'); }
    });

    // --- Acesso rápido a arquivos recentes ---
    systems.push({
        id: 'ux.recent-files-quick-access', category: 'ux', name: 'Arquivos Recentes',
        description: 'Lista os arquivos abertos recentemente no menu Iniciar.',
        enabledByDefault: true,
        enable() { document.documentElement.classList.add('vsys-recent-files-enabled'); },
        disable() { document.documentElement.classList.remove('vsys-recent-files-enabled'); }
    });

    // --- Maximizar com duplo-clique na barra de título ---
    systems.push({
        id: 'ux.titlebar-double-click-maximize', category: 'ux', name: 'Maximizar com Duplo-clique',
        description: 'Dar duplo-clique na barra de título de uma janela a maximiza/restaura.',
        enabledByDefault: true,
        enable() { document.documentElement.classList.add('vsys-titlebar-dblclick-enabled'); },
        disable() { document.documentElement.classList.remove('vsys-titlebar-dblclick-enabled'); }
    });

    return systems;
}

/**
 * Categoria: PRODUCTIVITY (16 sistemas)
 * Widgets flutuantes e utilitários reais: pomodoro, notas rápidas,
 * calculadora, conversor de unidades, checklist de tarefas, etc.
 */
export default function buildProductivitySystems({ helpers }) {
    const { createWidget, storageGet, storageSet, toast } = helpers;
    const systems = [];

    // --- Timer Pomodoro real (25min foco / 5min pausa) ---
    systems.push((function pomodoro() {
        let widget = null, interval = null, remaining = 25 * 60, phase = 'foco';
        const render = () => {
            if (!widget) return;
            const m = String(Math.floor(remaining / 60)).padStart(2, '0');
            const s = String(remaining % 60).padStart(2, '0');
            widget.body.querySelector('.vsys-pomodoro-time').textContent = `${m}:${s}`;
            widget.body.querySelector('.vsys-pomodoro-phase').textContent = phase === 'foco' ? 'Foco' : 'Pausa';
        };
        return {
            id: 'productivity.pomodoro-timer', category: 'productivity', name: 'Timer Pomodoro',
            description: 'Ciclo de foco de 25 minutos e pausa de 5 minutos, com widget flutuante.',
            enabledByDefault: false,
            enable() {
                widget = createWidget({ id: 'vsys-pomodoro', title: 'Pomodoro', icon: 'fa-clock', className: 'vsys-pomodoro' });
                widget.body.innerHTML = `<div class="vsys-pomodoro-phase">Foco</div><div class="vsys-pomodoro-time">25:00</div>
                    <button class="vsys-pomodoro-toggle">Iniciar</button>`;
                widget.body.querySelector('.vsys-pomodoro-toggle').addEventListener('click', (e) => {
                    if (interval) { clearInterval(interval); interval = null; e.target.textContent = 'Iniciar'; return; }
                    e.target.textContent = 'Pausar';
                    interval = setInterval(() => {
                        remaining--;
                        if (remaining <= 0) {
                            phase = phase === 'foco' ? 'pausa' : 'foco';
                            remaining = phase === 'foco' ? 25 * 60 : 5 * 60;
                            toast(`Hora de ${phase === 'foco' ? 'focar' : 'fazer uma pausa'}!`, 'info');
                        }
                        render();
                    }, 1000);
                });
                render();
            },
            disable() { clearInterval(interval); widget?.el.remove(); }
        };
    })());

    // --- Notas rápidas (diferente das sticky notes: uma lista com timestamp) ---
    systems.push((function quickNotes() {
        let widget = null;
        const renderList = () => {
            const notes = storageGet('quick-notes', []);
            widget.body.querySelector('.vsys-notes-list').innerHTML = notes.map((n, i) =>
                `<div class="vsys-note-item">${n.text}<button data-i="${i}">&times;</button></div>`).join('');
            widget.body.querySelectorAll('.vsys-note-item button').forEach(btn => btn.addEventListener('click', () => {
                const notes = storageGet('quick-notes', []); notes.splice(Number(btn.dataset.i), 1);
                storageSet('quick-notes', notes); renderList();
            }));
        };
        return {
            id: 'productivity.quick-notes-capture', category: 'productivity', name: 'Notas Rápidas',
            description: 'Capture ideias rapidamente numa lista persistente com um clique.',
            enabledByDefault: false,
            enable() {
                widget = createWidget({ id: 'vsys-quick-notes', title: 'Notas Rápidas', icon: 'fa-list', className: 'vsys-quick-notes' });
                widget.body.innerHTML = `<div class="vsys-notes-input"><input placeholder="Nova nota..."><button>+</button></div><div class="vsys-notes-list"></div>`;
                const input = widget.body.querySelector('input');
                widget.body.querySelector('button').addEventListener('click', () => {
                    if (!input.value.trim()) return;
                    const notes = storageGet('quick-notes', []);
                    notes.unshift({ text: input.value.trim(), at: Date.now() });
                    storageSet('quick-notes', notes); input.value = ''; renderList();
                });
                renderList();
            },
            disable() { widget?.el.remove(); }
        };
    })());

    // --- Calculadora rápida sobreposta ---
    systems.push((function quickCalc() {
        let widget = null;
        return {
            id: 'productivity.quick-calculator-overlay', category: 'productivity', name: 'Calculadora Rápida',
            description: 'Um cálculo rápido sem precisar abrir o app Calculadora completo.',
            enabledByDefault: false,
            enable() {
                widget = createWidget({ id: 'vsys-quick-calc', title: 'Cálculo Rápido', icon: 'fa-calculator', className: 'vsys-quick-calc' });
                widget.body.innerHTML = `<input class="vsys-calc-input" placeholder="ex: 12 * (4 + 1)"><div class="vsys-calc-result"></div>`;
                const input = widget.body.querySelector('input');
                input.addEventListener('input', () => {
                    const result = widget.body.querySelector('.vsys-calc-result');
                    try {
                        if (!/^[0-9+\-*/().\s]*$/.test(input.value)) throw new Error('inválido');
                        result.textContent = input.value ? String(Function(`"use strict";return (${input.value})`)()) : '';
                    } catch (e) { result.textContent = '—'; }
                });
            },
            disable() { widget?.el.remove(); }
        };
    })());

    // --- Conversor de unidades ---
    systems.push((function unitConverter() {
        let widget = null;
        const rates = { 'km->mi': 0.621371, 'mi->km': 1.60934, 'kg->lb': 2.20462, 'lb->kg': 0.453592, 'c->f': (c) => c * 9 / 5 + 32, 'f->c': (f) => (f - 32) * 5 / 9 };
        return {
            id: 'productivity.unit-converter', category: 'productivity', name: 'Conversor de Unidades',
            description: 'Converte rapidamente entre km/mi, kg/lb e °C/°F.',
            enabledByDefault: false,
            enable() {
                widget = createWidget({ id: 'vsys-unit-conv', title: 'Conversor', icon: 'fa-right-left', className: 'vsys-unit-conv' });
                widget.body.innerHTML = `
                    <select><option value="km->mi">km → mi</option><option value="mi->km">mi → km</option>
                    <option value="kg->lb">kg → lb</option><option value="lb->kg">lb → kg</option>
                    <option value="c->f">°C → °F</option><option value="f->c">°F → °C</option></select>
                    <input type="number" placeholder="Valor"><div class="vsys-conv-result"></div>`;
                const recalc = () => {
                    const mode = widget.body.querySelector('select').value;
                    const val = parseFloat(widget.body.querySelector('input').value);
                    const rate = rates[mode];
                    const out = isNaN(val) ? '' : (typeof rate === 'function' ? rate(val) : val * rate);
                    widget.body.querySelector('.vsys-conv-result').textContent = out === '' ? '' : out.toFixed(2);
                };
                widget.body.querySelector('select').addEventListener('change', recalc);
                widget.body.querySelector('input').addEventListener('input', recalc);
            },
            disable() { widget?.el.remove(); }
        };
    })());

    // --- Checklist de tarefas ---
    systems.push((function taskChecklist() {
        let widget = null;
        const render = () => {
            const tasks = storageGet('task-checklist', []);
            widget.body.querySelector('.vsys-task-list').innerHTML = tasks.map((t, i) =>
                `<label class="vsys-task-item"><input type="checkbox" data-i="${i}" ${t.done ? 'checked' : ''}> <span class="${t.done ? 'done' : ''}">${t.text}</span></label>`).join('');
            widget.body.querySelectorAll('input[type=checkbox]').forEach(cb => cb.addEventListener('change', () => {
                const tasks = storageGet('task-checklist', []); tasks[Number(cb.dataset.i)].done = cb.checked;
                storageSet('task-checklist', tasks); render();
            }));
        };
        return {
            id: 'productivity.task-checklist-widget', category: 'productivity', name: 'Checklist de Tarefas',
            description: 'Uma lista de tarefas simples com marcação de concluído, salva localmente.',
            enabledByDefault: false,
            enable() {
                widget = createWidget({ id: 'vsys-tasks', title: 'Tarefas', icon: 'fa-check-square', className: 'vsys-tasks' });
                widget.body.innerHTML = `<div class="vsys-notes-input"><input placeholder="Nova tarefa..."><button>+</button></div><div class="vsys-task-list"></div>`;
                const input = widget.body.querySelector('input');
                widget.body.querySelector('button').addEventListener('click', () => {
                    if (!input.value.trim()) return;
                    const tasks = storageGet('task-checklist', []);
                    tasks.push({ text: input.value.trim(), done: false });
                    storageSet('task-checklist', tasks); input.value = ''; render();
                });
                render();
            },
            disable() { widget?.el.remove(); }
        };
    })());

    // --- Frase do dia ---
    systems.push({
        id: 'productivity.daily-quote-widget', category: 'productivity', name: 'Frase do Dia',
        description: 'Mostra uma frase motivacional diferente a cada dia no menu Iniciar.',
        enabledByDefault: false,
        enable() {
            const quotes = ['Feito é melhor que perfeito.', 'Pequenos passos todo dia.', 'Foque no processo, não só no resultado.', 'Progresso, não perfeição.'];
            const dayIndex = new Date().getDate() % quotes.length;
            storageSet('daily-quote', quotes[dayIndex]);
        },
        disable() { }
    });

    // --- Folha de atalhos de teclado ---
    systems.push((function shortcutCheatsheet() {
        let widget = null;
        return {
            id: 'productivity.keyboard-shortcuts-cheatsheet', category: 'productivity', name: 'Atalhos de Teclado',
            description: 'Painel de referência rápida com os atalhos do sistema (abra com Win+/).',
            enabledByDefault: true,
            enable() {
                window.__vsysShowCheatsheet = () => {
                    widget = createWidget({ id: 'vsys-cheatsheet', title: 'Atalhos de Teclado', icon: 'fa-keyboard', className: 'vsys-cheatsheet' });
                    widget.body.innerHTML = `<ul>
                        <li><b>Win</b> — Menu Iniciar</li><li><b>Win+.</b> — Emojis</li>
                        <li><b>Ctrl+Shift+V</b> — Histórico da área de transferência</li>
                        <li><b>Ctrl+Alt+Setas</b> — Trocar área de trabalho</li>
                        <li><b>Alt+clique</b> — Ler texto em voz alta</li></ul>`;
                };
            },
            disable() { delete window.__vsysShowCheatsheet; widget?.el.remove(); }
        };
    })());

    // --- Presets de layout de janelas ---
    systems.push({
        id: 'productivity.window-layout-presets', category: 'productivity', name: 'Layouts de Janela Salvos',
        description: 'Salva e restaura a posição/tamanho das janelas abertas (window-layout-1).',
        enabledByDefault: false,
        enable() {
            window.__vsysSaveLayout = () => {
                const layout = [...document.querySelectorAll('.window')].map(w => ({
                    app: w.dataset.app, left: w.style.left, top: w.style.top, width: w.style.width, height: w.style.height
                }));
                storageSet('window-layout-1', layout);
                toast('Layout de janelas salvo', 'success');
            };
        },
        disable() { delete window.__vsysSaveLayout; }
    });

    // --- Alternador de apps recentes (estilo Alt+Tab) ---
    systems.push((function recentAppsSwitcher() {
        let handler = null;
        return {
            id: 'productivity.recent-apps-switcher', category: 'productivity', name: 'Alternador de Apps Recentes',
            description: 'Pressione Alt+Tab para alternar rapidamente entre as janelas abertas mais recentes.',
            enabledByDefault: true,
            enable() {
                handler = (e) => {
                    if (e.altKey && e.key === 'Tab') {
                        e.preventDefault();
                        const wins = [...document.querySelectorAll('.window')];
                        if (wins.length < 2) return;
                        const current = wins.findIndex(w => w.classList.contains('active'));
                        const next = wins[(current + 1) % wins.length];
                        next?.dispatchEvent(new CustomEvent('vsys:focus-request'));
                        next?.classList.add('active');
                    }
                };
                window.addEventListener('keydown', handler);
            },
            disable() { window.removeEventListener('keydown', handler); }
        };
    })());

    // --- Busca universal (arquivos + apps + configurações) ---
    systems.push({
        id: 'productivity.universal-search', category: 'productivity', name: 'Busca Universal',
        description: 'Disponibiliza window.__vsysUniversalSearch(termo) combinando apps, arquivos e configurações.',
        enabledByDefault: true,
        enable() {
            window.__vsysUniversalSearch = (term = '') => {
                const t = term.toLowerCase();
                const apps = (window.VessieOS?.apps?.list || []).filter(a => a.toLowerCase().includes(t));
                return { apps, term };
            };
        },
        disable() { delete window.__vsysUniversalSearch; }
    });

    // --- Sistema de tags para arquivos ---
    systems.push({
        id: 'productivity.file-tagging', category: 'productivity', name: 'Etiquetas de Arquivo',
        description: 'Permite marcar arquivos com etiquetas coloridas persistidas (window.__vsysTagFile).',
        enabledByDefault: false,
        enable() {
            window.__vsysTagFile = (path, tag) => {
                const tags = storageGet('file-tags', {});
                tags[path] = tag; storageSet('file-tags', tags);
            };
            window.__vsysGetFileTag = (path) => storageGet('file-tags', {})[path] || null;
        },
        disable() { delete window.__vsysTagFile; delete window.__vsysGetFileTag; }
    });

    // --- Estatísticas de tempo de foco ---
    systems.push((function focusStats() {
        let start = null;
        return {
            id: 'productivity.focus-timer-stats', category: 'productivity', name: 'Estatísticas de Foco',
            description: 'Registra quanto tempo o sistema ficou em uso ativo hoje.',
            enabledByDefault: true,
            enable() {
                start = Date.now();
                this._interval = setInterval(() => {
                    const key = `focus-time:${new Date().toISOString().slice(0, 10)}`;
                    const total = storageGet(key, 0) + 10;
                    storageSet(key, total);
                }, 10000);
            },
            disable() { clearInterval(this._interval); }
        };
    })());

    // --- Preview de markdown ---
    systems.push({
        id: 'productivity.markdown-quick-preview', category: 'productivity', name: 'Pré-visualização de Markdown',
        description: 'Disponibiliza window.__vsysRenderMarkdown() para uma conversão simples de Markdown em HTML no Bloco de Notas.',
        enabledByDefault: true,
        enable() {
            window.__vsysRenderMarkdown = (md = '') => md
                .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                .replace(/\*\*(.*?)\*\*/gim, '<b>$1</b>')
                .replace(/\*(.*?)\*/gim, '<i>$1</i>')
                .replace(/\n/gim, '<br>');
        },
        disable() { delete window.__vsysRenderMarkdown; }
    });

    // --- Snippet library (trechos de texto reutilizáveis) ---
    systems.push({
        id: 'productivity.snippet-library', category: 'productivity', name: 'Biblioteca de Snippets',
        description: 'Guarda trechos de texto reutilizáveis (assinaturas, respostas prontas) acessíveis via window.__vsysSnippets.',
        enabledByDefault: false,
        enable() {
            window.__vsysSnippets = {
                list: () => storageGet('snippets', []),
                add: (text) => { const s = storageGet('snippets', []); s.push(text); storageSet('snippets', s); }
            };
        },
        disable() { delete window.__vsysSnippets; }
    });

    // --- Lembretes recorrentes ---
    systems.push((function reminderPing() {
        let interval = null;
        return {
            id: 'productivity.reminder-ping', category: 'productivity', name: 'Lembretes Recorrentes',
            description: 'Dispara um lembrete configurável a cada intervalo definido (padrão: 1h) para pausas/hidratação.',
            enabledByDefault: false,
            enable() {
                const minutes = storageGet('reminder-interval-min', 60);
                interval = setInterval(() => toast('Hora de uma pausa rápida 💧', 'info'), minutes * 60 * 1000);
            },
            disable() { clearInterval(interval); }
        };
    })());

    // --- Exportar notas/tarefas em bloco (backup local em .json) ---
    systems.push({
        id: 'productivity.workspace-export', category: 'productivity', name: 'Exportar Espaço de Trabalho',
        description: 'Disponibiliza window.__vsysExportWorkspace() para baixar notas e tarefas como um arquivo .json.',
        enabledByDefault: false,
        enable() {
            window.__vsysExportWorkspace = () => {
                const data = { notes: storageGet('quick-notes', []), tasks: storageGet('task-checklist', []), exportedAt: new Date().toISOString() };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob); a.download = 'vessieos-workspace.json'; a.click();
            };
        },
        disable() { delete window.__vsysExportWorkspace; }
    });

    return systems;
}

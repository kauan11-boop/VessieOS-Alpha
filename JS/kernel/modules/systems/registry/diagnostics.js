/**
 * Categoria: DIAGNOSTICS (15 sistemas)
 * Ferramentas reais de diagnóstico: captura de erros globais, HUD de
 * performance, monitor de armazenamento, perfil de tempo de boot,
 * verificador de saúde dos módulos do kernel.
 */
export default function buildDiagnosticsSystems({ helpers, DiagnosticsManager }) {
    const { storageGet, storageSet, formatBytes, createWidget } = helpers;
    const systems = [];

    // --- Capturador de erros globais (crash reporter) ---
    systems.push((function crashReporter() {
        let onError = null, onRejection = null;
        return {
            id: 'diagnostics.crash-reporter', category: 'diagnostics', name: 'Relator de Erros',
            description: 'Captura erros não tratados e promessas rejeitadas, guardando um log local para depuração.',
            enabledByDefault: true,
            enable() {
                onError = (e) => {
                    const log = storageGet('crash-log', []);
                    log.unshift({ message: e.message, source: e.filename, line: e.lineno, at: Date.now() });
                    storageSet('crash-log', log.slice(0, 40));
                };
                onRejection = (e) => {
                    const log = storageGet('crash-log', []);
                    log.unshift({ message: String(e.reason), type: 'unhandledrejection', at: Date.now() });
                    storageSet('crash-log', log.slice(0, 40));
                };
                window.addEventListener('error', onError);
                window.addEventListener('unhandledrejection', onRejection);
            },
            disable() {
                window.removeEventListener('error', onError);
                window.removeEventListener('unhandledrejection', onRejection);
            }
        };
    })());

    // --- Visualizador de logs de console sobreposto ---
    systems.push((function consoleOverlay() {
        let widget = null, originalLog = null;
        return {
            id: 'diagnostics.console-log-viewer', category: 'diagnostics', name: 'Visualizador de Console',
            description: 'Mostra um painel flutuante com as últimas mensagens de console.log/warn/error.',
            enabledByDefault: false,
            enable() {
                widget = createWidget({ id: 'vsys-console-viewer', title: 'Console', icon: 'fa-terminal', className: 'vsys-console-viewer' });
                originalLog = console.log;
                console.log = (...args) => {
                    originalLog(...args);
                    const line = document.createElement('div');
                    line.textContent = args.map(String).join(' ');
                    widget.body.appendChild(line);
                    widget.body.scrollTop = widget.body.scrollHeight;
                };
            },
            disable() { if (originalLog) console.log = originalLog; widget?.el.remove(); }
        };
    })());

    // --- HUD de performance (fps, memória, latência de eventos) ---
    systems.push((function perfHud() {
        let raf = null, el = null, last = performance.now(), frames = 0;
        return {
            id: 'diagnostics.performance-hud', category: 'diagnostics', name: 'HUD de Performance',
            description: 'Painel com FPS, memória usada e uptime, sempre visível no canto da tela.',
            enabledByDefault: false,
            enable() {
                el = document.createElement('div');
                el.className = 'vsys-perf-hud';
                document.body.appendChild(el);
                const start = Date.now();
                const tick = () => {
                    frames++;
                    const now = performance.now();
                    if (now - last >= 1000) {
                        const mem = performance.memory ? formatBytes(performance.memory.usedJSHeapSize) : 'n/d';
                        const uptime = Math.floor((Date.now() - start) / 1000);
                        el.innerHTML = `FPS: ${frames}<br>Memória: ${mem}<br>Uptime: ${uptime}s`;
                        frames = 0; last = now;
                    }
                    raf = requestAnimationFrame(tick);
                };
                tick();
            },
            disable() { if (raf) cancelAnimationFrame(raf); el?.remove(); }
        };
    })());

    // --- Toasts para erros de fronteira (error boundary simplificado) ---
    systems.push({
        id: 'diagnostics.error-boundary-toasts', category: 'diagnostics', name: 'Avisos de Erro',
        description: 'Mostra um toast amigável (em vez de travar silenciosamente) quando um app encontra um erro.',
        enabledByDefault: true,
        enable() {
            this._handler = (e) => {
                if (typeof window.toast === 'function') window.toast('Algo deu errado em um app. Veja o console para detalhes.', 'error');
            };
            window.addEventListener('error', this._handler);
        },
        disable() { window.removeEventListener('error', this._handler); }
    });

    // --- Gráfico simples de uso de memória ---
    systems.push((function memoryGraph() {
        let interval = null;
        return {
            id: 'diagnostics.memory-usage-graph', category: 'diagnostics', name: 'Gráfico de Memória',
            description: 'Registra o uso de memória JS ao longo do tempo para análise de tendência.',
            enabledByDefault: false,
            enable() {
                if (!performance.memory) return;
                interval = setInterval(() => {
                    const history = storageGet('memory-history', []);
                    history.push(performance.memory.usedJSHeapSize);
                    storageSet('memory-history', history.slice(-60));
                }, 5000);
            },
            disable() { clearInterval(interval); }
        };
    })());

    // --- Monitor de cota de armazenamento ---
    systems.push({
        id: 'diagnostics.storage-quota-monitor', category: 'diagnostics', name: 'Monitor de Armazenamento',
        description: 'Verifica quanto espaço de armazenamento local o VessieOS está usando (Storage API).',
        enabledByDefault: true,
        async enable() {
            if (!navigator.storage?.estimate) return;
            const estimate = await navigator.storage.estimate();
            storageSet('storage-estimate', { usage: estimate.usage, quota: estimate.quota });
        },
        disable() { }
    });

    // --- Checklist de saúde dos módulos do kernel ---
    systems.push({
        id: 'diagnostics.module-health-checklist', category: 'diagnostics', name: 'Saúde dos Módulos',
        description: 'Verifica se as peças-chave do kernel (moduleSystem, EventBus, GraphicsHub, SystemsRuntime) estão de pé.',
        enabledByDefault: true,
        enable() {
            window.__vsysHealthCheck = () => ({
                moduleSystem: !!window.VessieOS?.moduleSystem,
                eventBus: !!window.VessieOS?.EventBus,
                graphics: !!window.VessieOS?.graphics,
                systemsRuntime: !!window.VessieOS?.systemsRuntime,
                ai: !!window.VessieOS?.ai,
                threeJS: typeof THREE !== 'undefined'
            });
        },
        disable() { delete window.__vsysHealthCheck; }
    });

    // --- Perfil de tempo de boot ---
    systems.push({
        id: 'diagnostics.boot-time-profiler', category: 'diagnostics', name: 'Perfil de Tempo de Boot',
        description: 'Mede quanto tempo o sistema levou para carregar, do início da navegação até o DOM pronto.',
        enabledByDefault: true,
        enable() {
            try {
                const nav = performance.getEntriesByType('navigation')[0];
                if (nav) storageSet('boot-profile', { domContentLoaded: nav.domContentLoadedEventEnd, loadComplete: nav.loadEventEnd });
            } catch (e) { /* Navigation Timing indisponível */ }
        },
        disable() { }
    });

    // --- Inspetor de feature flags (o próprio SystemsRuntime) ---
    systems.push({
        id: 'diagnostics.feature-flag-inspector', category: 'diagnostics', name: 'Inspetor de Sistemas Ativos',
        description: 'Disponibiliza window.__vsysListActiveSystems() para ver quais dos 155 sistemas estão ligados agora.',
        enabledByDefault: true,
        enable() {
            window.__vsysListActiveSystems = () => window.VessieOS?.systemsRuntime?.list().filter(s => window.VessieOS.systemsRuntime.isEnabled(s.id)).map(s => s.id) || [];
        },
        disable() { delete window.__vsysListActiveSystems; }
    });

    // --- Monitor de atividade do barramento de eventos ---
    systems.push((function eventBusMonitor() {
        let count = 0, original = null;
        return {
            id: 'diagnostics.event-bus-activity-monitor', category: 'diagnostics', name: 'Monitor do Barramento de Eventos',
            description: 'Conta quantos eventos passam pelo EventBus interno, útil para detectar loops ou vazamentos de listener.',
            enabledByDefault: false,
            enable() {
                const bus = window.VessieOS?.EventBus;
                if (!bus?.emit) return;
                original = bus.emit.bind(bus);
                bus.emit = (...args) => { count++; storageSet('event-bus-count', count); return original(...args); };
            },
            disable() { const bus = window.VessieOS?.EventBus; if (bus && original) bus.emit = original; }
        };
    })());

    // --- Contador de uptime da sessão ---
    systems.push({
        id: 'diagnostics.uptime-counter', category: 'diagnostics', name: 'Contador de Uptime',
        description: 'Disponibiliza window.__vsysUptime() com o tempo decorrido desde o boot desta sessão.',
        enabledByDefault: true,
        enable() {
            const start = Date.now();
            window.__vsysUptime = () => Math.floor((Date.now() - start) / 1000);
        },
        disable() { delete window.__vsysUptime; }
    });

    // --- Rodada de auto-teste rápido do sistema ---
    systems.push({
        id: 'diagnostics.self-test-suite', category: 'diagnostics', name: 'Auto-teste do Sistema',
        description: 'Roda uma bateria rápida de verificações (localStorage funcional, WebGL, IA acessível) sob demanda.',
        enabledByDefault: false,
        enable() {
            window.__vsysSelfTest = async () => {
                const results = {};
                try { localStorage.setItem('__vsys_test', '1'); localStorage.removeItem('__vsys_test'); results.localStorage = true; } catch (e) { results.localStorage = false; }
                results.webgl = !!document.createElement('canvas').getContext('webgl');
                results.aiReachable = !!(await window.VessieOS?.ai?.checkConnection?.().catch(() => false));
                return results;
            };
        },
        disable() { delete window.__vsysSelfTest; }
    });

    // --- Exportador de relatório de diagnóstico completo ---
    systems.push({
        id: 'diagnostics.export-report', category: 'diagnostics', name: 'Exportar Relatório de Diagnóstico',
        description: 'Reúne health-check, crash log e informações de armazenamento num único .json para suporte técnico.',
        enabledByDefault: true,
        enable() {
            window.__vsysExportDiagnostics = () => {
                const report = {
                    health: window.__vsysHealthCheck?.() || {},
                    crashLog: storageGet('crash-log', []),
                    storage: storageGet('storage-estimate', null),
                    bootProfile: storageGet('boot-profile', null),
                    generatedAt: new Date().toISOString()
                };
                const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob); a.download = 'vessieos-diagnostics.json'; a.click();
            };
        },
        disable() { delete window.__vsysExportDiagnostics; }
    });

    // --- Changelog viewer (lê um manifesto estático de versão) ---
    systems.push({
        id: 'diagnostics.changelog-viewer', category: 'diagnostics', name: 'Visualizador de Changelog',
        description: 'Mostra as últimas mudanças do sistema a partir de um pequeno manifesto local.',
        enabledByDefault: false,
        enable() {
            window.__vsysChangelog = [
                { version: '3.1.0', notes: 'Motor de módulos ES corrigido; 155 novos micro-sistemas; fundo 3D em Three.js no Game Hub.' }
            ];
        },
        disable() { delete window.__vsysChangelog; }
    });

    // --- Visualizador de dependências entre módulos ---
    systems.push({
        id: 'diagnostics.dependency-graph-viewer', category: 'diagnostics', name: 'Grafo de Dependências',
        description: 'Lista os módulos registrados no ModuleSystem e suas dependências declaradas, para depuração da ordem de boot.',
        enabledByDefault: false,
        enable() {
            window.__vsysDependencyGraph = () => {
                const ms = window.VessieOS?.moduleSystem;
                if (!ms?.listModules) return [];
                return ms.listModules().map(name => {
                    const info = ms.getModuleInfo(name);
                    return { name, dependencies: info?.dependencies || [] };
                });
            };
        },
        disable() { delete window.__vsysDependencyGraph; }
    });

    return systems;
}

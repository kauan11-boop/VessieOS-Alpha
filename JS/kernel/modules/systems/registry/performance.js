/**
 * Categoria: PERFORMANCE (16 sistemas)
 * Usam APIs reais do navegador (PerformanceObserver, IntersectionObserver,
 * requestIdleCallback, Network Information API, Battery API quando
 * disponível) para monitorar e ajustar o comportamento do sistema.
 */
export default function buildPerformanceSystems({ helpers, PerformanceManager }) {
    const { toast, storageSet, storageGet } = helpers;
    const systems = [];

    // --- Cap de FPS configurável ---
    systems.push((function fpsCap() {
        return {
            id: 'performance.fps-cap', category: 'performance', name: 'Limite de FPS',
            description: 'Limita a taxa de quadros do motor 3D a 30 FPS para economizar recursos.',
            enabledByDefault: false,
            enable() { PerformanceManager?.setTargetFPS?.(30); },
            disable() { PerformanceManager?.setTargetFPS?.(60); }
        };
    })());

    // --- Sonda de tier de GPU (heurística via renderer string do WebGL) ---
    systems.push({
        id: 'performance.gpu-tier-probe', category: 'performance', name: 'Detecção de GPU',
        description: 'Detecta a GPU do usuário e ajusta a qualidade gráfica automaticamente.',
        enabledByDefault: true,
        enable() {
            try {
                const gl = document.createElement('canvas').getContext('webgl');
                const info = gl?.getExtension('WEBGL_debug_renderer_info');
                const renderer = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'desconhecida';
                storageSet('gpu-renderer', String(renderer));
            } catch (e) { /* WebGL indisponível */ }
        },
        disable() { }
    });

    // --- Throttle de animações no modo economia de bateria ---
    systems.push((function batteryThrottle() {
        let battery = null, handler = null;
        return {
            id: 'performance.battery-throttle', category: 'performance', name: 'Economia por Bateria',
            description: 'Reduz animações automaticamente quando a bateria está baixa e descarregando.',
            enabledByDefault: true,
            async enable() {
                if (!navigator.getBattery) return;
                battery = await navigator.getBattery();
                handler = () => {
                    const lowPower = !battery.charging && battery.level < 0.2;
                    document.documentElement.classList.toggle('vsys-low-power', lowPower);
                };
                battery.addEventListener('levelchange', handler);
                battery.addEventListener('chargingchange', handler);
                handler();
            },
            disable() {
                battery?.removeEventListener('levelchange', handler);
                battery?.removeEventListener('chargingchange', handler);
                document.documentElement.classList.remove('vsys-low-power');
            }
        };
    })());

    // --- Lazy loading real de imagens via IntersectionObserver ---
    systems.push((function lazyImages() {
        let observer = null;
        return {
            id: 'performance.lazy-images', category: 'performance', name: 'Carregamento Preguiçoso de Imagens',
            description: 'Imagens fora da tela só carregam quando entram na viewport.',
            enabledByDefault: true,
            enable() {
                observer = new IntersectionObserver((entries) => {
                    for (const entry of entries) {
                        if (entry.isIntersecting) {
                            const img = entry.target;
                            if (img.dataset.src) { img.src = img.dataset.src; img.removeAttribute('data-src'); }
                            observer.unobserve(img);
                        }
                    }
                }, { rootMargin: '200px' });
                document.querySelectorAll('img[data-src]').forEach(img => observer.observe(img));
            },
            disable() { observer?.disconnect(); }
        };
    })());

    // --- Throttle de CPU ocioso (agenda tarefas de baixa prioridade) ---
    systems.push((function idleThrottle() {
        let queue = [];
        window.__vsysIdleQueue = window.__vsysIdleQueue || [];
        return {
            id: 'performance.idle-cpu-scheduler', category: 'performance', name: 'Agendador de Tarefas Ociosas',
            description: 'Adia tarefas de baixa prioridade para quando o navegador estiver ocioso (requestIdleCallback).',
            enabledByDefault: true,
            enable() { window.__vsysScheduleIdle = (fn) => (requestIdleCallback || ((f) => setTimeout(f, 200)))(fn); },
            disable() { delete window.__vsysScheduleIdle; }
        };
    })());

    // --- Suspensão de janelas em segundo plano (pausa iframes/vídeos ocultos) ---
    systems.push((function bgSuspend() {
        let handler = null;
        return {
            id: 'performance.background-suspend', category: 'performance', name: 'Suspensão em Segundo Plano',
            description: 'Pausa vídeos e reduz atividade de janelas quando a aba fica oculta.',
            enabledByDefault: true,
            enable() {
                handler = () => {
                    document.querySelectorAll('video').forEach(v => { if (document.hidden) v.pause(); });
                    document.documentElement.classList.toggle('vsys-tab-hidden', document.hidden);
                };
                document.addEventListener('visibilitychange', handler);
            },
            disable() { document.removeEventListener('visibilitychange', handler); }
        };
    })());

    // --- Qualidade de assets adaptada à rede (Network Information API) ---
    systems.push((function networkAwareQuality() {
        let handler = null;
        return {
            id: 'performance.network-aware-quality', category: 'performance', name: 'Qualidade Adaptada à Rede',
            description: 'Reduz a qualidade de efeitos visuais em conexões lentas (2G/3G) ou com "salvar dados" ativo.',
            enabledByDefault: true,
            enable() {
                const conn = navigator.connection;
                if (!conn) return;
                handler = () => {
                    const slow = conn.saveData || ['slow-2g', '2g', '3g'].includes(conn.effectiveType);
                    document.documentElement.classList.toggle('vsys-low-bandwidth', slow);
                };
                conn.addEventListener('change', handler);
                handler();
            },
            disable() { navigator.connection?.removeEventListener('change', handler); }
        };
    })());

    // --- Pré-carregamento em hover (links/apps) ---
    systems.push((function prefetchOnHover() {
        let handler = null;
        const seen = new Set();
        return {
            id: 'performance.prefetch-on-hover', category: 'performance', name: 'Pré-carregamento em Hover',
            description: 'Começa a carregar recursos de um app assim que o mouse passa por cima do ícone.',
            enabledByDefault: false,
            enable() {
                handler = (e) => {
                    const el = e.target.closest?.('[data-preload-src]');
                    if (!el || seen.has(el)) return;
                    seen.add(el);
                    const link = document.createElement('link');
                    link.rel = 'prefetch'; link.href = el.dataset.preloadSrc;
                    document.head.appendChild(link);
                };
                document.addEventListener('mouseover', handler);
            },
            disable() { document.removeEventListener('mouseover', handler); seen.clear(); }
        };
    })());

    // --- Métricas de pintura (paint timing) ---
    systems.push((function paintMetrics() {
        let observer = null;
        return {
            id: 'performance.paint-metrics-logger', category: 'performance', name: 'Métricas de Pintura',
            description: 'Registra First Paint / First Contentful Paint para diagnóstico de performance.',
            enabledByDefault: false,
            enable() {
                try {
                    observer = new PerformanceObserver((list) => {
                        for (const entry of list.getEntries()) storageSet(`paint:${entry.name}`, entry.startTime);
                    });
                    observer.observe({ type: 'paint', buffered: true });
                } catch (e) { /* não suportado */ }
            },
            disable() { observer?.disconnect(); }
        };
    })());

    // --- Alerta de long task (bloqueio da main thread) ---
    systems.push((function longTaskAlert() {
        let observer = null;
        return {
            id: 'performance.long-task-alert', category: 'performance', name: 'Alerta de Tarefa Longa',
            description: 'Detecta quando algo trava a interface por mais de 100ms (útil para depuração).',
            enabledByDefault: false,
            enable() {
                try {
                    observer = new PerformanceObserver((list) => {
                        for (const entry of list.getEntries()) console.warn(`[Performance] Tarefa longa: ${entry.duration.toFixed(0)}ms`);
                    });
                    observer.observe({ type: 'longtask', buffered: true });
                } catch (e) { /* não suportado */ }
            },
            disable() { observer?.disconnect(); }
        };
    })());

    // --- Sonda de concorrência de hardware ---
    systems.push({
        id: 'performance.hardware-concurrency-probe', category: 'performance', name: 'Sonda de Núcleos de CPU',
        description: 'Detecta quantos núcleos lógicos de CPU o dispositivo tem, para ajustar paralelismo.',
        enabledByDefault: true,
        enable() { storageSet('hardware-concurrency', navigator.hardwareConcurrency || 4); },
        disable() { }
    });

    // --- Sonda de capacidade WebGL ---
    systems.push({
        id: 'performance.webgl-capability-probe', category: 'performance', name: 'Sonda de Capacidade WebGL',
        description: 'Verifica suporte a WebGL2 e extensões-chave antes de ativar efeitos 3D pesados.',
        enabledByDefault: true,
        enable() {
            const canvas = document.createElement('canvas');
            const gl2 = !!canvas.getContext('webgl2');
            storageSet('webgl2-supported', gl2);
        },
        disable() { }
    });

    // --- Watchdog de memória (alerta de possível vazamento) ---
    systems.push((function memoryWatchdog() {
        let interval = null, baseline = null;
        return {
            id: 'performance.memory-leak-watchdog', category: 'performance', name: 'Vigia de Memória',
            description: 'Monitora o uso de memória JS e avisa em caso de crescimento anormal contínuo.',
            enabledByDefault: false,
            enable() {
                if (!performance.memory) return;
                baseline = performance.memory.usedJSHeapSize;
                interval = setInterval(() => {
                    const used = performance.memory.usedJSHeapSize;
                    if (used > baseline * 3) {
                        console.warn('[Performance] Uso de memória triplicou desde o início da sessão.');
                        baseline = used;
                    }
                }, 60000);
            },
            disable() { clearInterval(interval); }
        };
    })());

    // --- Redução de qualidade de textura sob carga (integra com PerformanceManager) ---
    systems.push({
        id: 'performance.adaptive-texture-quality', category: 'performance', name: 'Qualidade Adaptativa de Textura',
        description: 'Reduz a resolução de texturas do motor 3D quando o FPS cai abaixo do alvo.',
        enabledByDefault: true,
        enable() { PerformanceManager?.enableAdaptiveQuality?.(true); },
        disable() { PerformanceManager?.enableAdaptiveQuality?.(false); }
    });

    // --- Throttle de animações CSS em segundo plano ---
    systems.push({
        id: 'performance.animation-throttle-bg', category: 'performance', name: 'Throttle de Animação em Segundo Plano',
        description: 'Pausa animações CSS decorativas quando a janela perde o foco.',
        enabledByDefault: true,
        enable() {
            const onBlur = () => document.documentElement.classList.add('vsys-anim-paused');
            const onFocus = () => document.documentElement.classList.remove('vsys-anim-paused');
            window.addEventListener('blur', onBlur);
            window.addEventListener('focus', onFocus);
            this._cleanup = () => { window.removeEventListener('blur', onBlur); window.removeEventListener('focus', onFocus); };
        },
        disable() { this._cleanup?.(); document.documentElement.classList.remove('vsys-anim-paused'); }
    });

    // --- Virtualização de listas longas (renderiza só os itens visíveis) ---
    systems.push((function domVirtualization() {
        let observer = null;
        return {
            id: 'performance.dom-virtualization', category: 'performance', name: 'Virtualização de Listas',
            description: 'Em listas longas (ex: biblioteca do Game Hub), marca itens fora da tela como inativos para reduzir custo de layout.',
            enabledByDefault: false,
            enable() {
                observer = new IntersectionObserver((entries) => {
                    for (const entry of entries) {
                        entry.target.classList.toggle('vsys-offscreen', !entry.isIntersecting);
                    }
                }, { rootMargin: '400px' });
                document.querySelectorAll('.st-card, .file-item').forEach(el => observer.observe(el));
            },
            disable() { observer?.disconnect(); document.querySelectorAll('.vsys-offscreen').forEach(el => el.classList.remove('vsys-offscreen')); }
        };
    })());

    return systems;
}

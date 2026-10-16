/**
 * PerformanceBooster – Otimização automática de desempenho
 * 
 * Funciona sem comandos manuais:
 * - Detecta automaticamente imagens e aplica lazy loading.
 * - Aplica will-change em elementos animados.
 * - Virtualiza listas grandes automaticamente.
 * - Cacheia elementos reutilizáveis.
 * - Pré-carrega recursos preditivamente.
 * - Otimiza eventos globalmente.
 * - Monitora memória e adapta-se ao modo de performance.
 * 
 * Tudo é feito via observers e eventos, sem necessidade de chamadas explícitas.
 */
export class PerformanceBooster {
    constructor(frameMonitor, performanceManager, resourceManager) {
        this.frameMonitor = frameMonitor;
        this.performanceManager = performanceManager;
        this.resourceManager = resourceManager;

        // Configuração (pode ser alterada, mas funciona com defaults)
        this.config = {
            enabled: true,
            lazyLoadThreshold: 0.2,
            preloadCount: 3,
            virtualizeThreshold: 60, // itens
            cacheMaxSize: 50,
            eventThrottle: 16,
            memoryWarningThreshold: 0.8,
            monitorInterval: 5000
        };

        // Estado interno
        this._cache = new WeakMap();
        this._lazyObserver = null;
        this._virtualizedLists = new Map();
        this._preloadQueue = [];
        this._started = false;
        this._rafId = null;
        this._monitorInterval = null;
        this._resourceContext = resourceManager.createContext('PerformanceBooster');
        this._mutationObserver = null;
        this._scrollHandler = null;

        // Inicializa automaticamente ao construir
        this._autoInit();
    }

    // ================================================================
    // INICIALIZAÇÃO AUTOMÁTICA
    // ================================================================

    _autoInit() {
        if (this._started) return;
        this._started = true;

        // Aguarda DOM pronto
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this._start());
        } else {
            this._start();
        }

        // Se o kernel já estiver pronto, inicia imediatamente
        if (window.VessieOS?.kernel?.state === 'RUNNING') {
            this._start();
        } else {
            document.addEventListener('kernel:ready', () => this._start());
        }
    }

    _start() {
        if (this._initialized) return;
        this._initialized = true;

        // Aplica otimizações iniciais
        this._optimizeExistingElements();
        this._setupLazyLoading();
        this._setupPreloading();
        this._setupVirtualization();
        this._optimizeEvents();
        this._startMemoryMonitoring();
        this._observeNewElements();
        this._setupScrollOptimizations();

        // Escuta mudanças de performance
        if (this.performanceManager) {
            this.performanceManager.on('performance:mode-change', (data) => {
                this._applyPerformanceMode(data.mode);
            });
        }

        console.log('[PerformanceBooster] Automático inicializado.');
    }

    // ================================================================
    // 1. LAZY LOADING AUTOMÁTICO
    // ================================================================

    _setupLazyLoading() {
        if (!window.IntersectionObserver) {
            console.warn('[PerformanceBooster] IntersectionObserver não disponível.');
            return;
        }

        this._lazyObserver = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting) {
                    const el = entry.target;
                    // Carrega imagem/iframe
                    if (el.dataset.src) {
                        el.src = el.dataset.src;
                        delete el.dataset.src;
                        el.classList.add('vessie-loaded');
                    }
                    if (el.dataset.href) {
                        el.href = el.dataset.href;
                        delete el.dataset.href;
                    }
                    this._lazyObserver.unobserve(el);
                }
            }
        }, {
            rootMargin: `${this.config.lazyLoadThreshold * 100}% 0px`
        });

        // Observa elementos existentes com data-lazy-*
        document.querySelectorAll('[data-lazy-src], [data-lazy-href], img[data-src]').forEach(el => {
            this._lazyObserver.observe(el);
        });

        this._resourceContext.track(this._lazyObserver);
    }

    // ================================================================
    // 2. PRÉ-CARREGAMENTO PREDITIVO AUTOMÁTICO
    // ================================================================

    _setupPreloading() {
        // Pré-carrega quando o navegador está ocioso
        if (typeof requestIdleCallback === 'function') {
            requestIdleCallback(() => this._preloadResources(), { timeout: 2000 });
        } else {
            setTimeout(() => this._preloadResources(), 100);
        }

        // Pré-carrega ao passar o mouse sobre links
        document.addEventListener('mouseover', (e) => {
            const link = e.target.closest('a[href]');
            if (link && link.href && !link.href.startsWith('#')) {
                this._preloadResource(link.href);
            }
        }, { passive: true });
    }

    _preloadResources() {
        const urls = [];
        // Coleta links de preload/prefetch já existentes
        document.querySelectorAll('link[rel="preload"], link[rel="prefetch"]').forEach(link => {
            const href = link.getAttribute('href');
            if (href) urls.push(href);
        });
        // Coleta imagens com data-src
        document.querySelectorAll('img[data-src]').forEach(img => {
            const src = img.dataset.src;
            if (src) urls.push(src);
        });
        // Limita e processa
        const toLoad = urls.slice(0, this.config.preloadCount * 2);
        for (const url of toLoad) {
            this._preloadResource(url);
        }
    }

    _preloadResource(url) {
        if (this._preloadQueue.includes(url)) return;
        this._preloadQueue.push(url);
        if (this._preloadQueue.length >= 5) {
            this._processPreloadQueue();
        }
    }

    _processPreloadQueue() {
        const toLoad = this._preloadQueue.splice(0, 5);
        for (const url of toLoad) {
            const link = document.createElement('link');
            link.rel = 'prefetch';
            link.href = url;
            document.head.appendChild(link);
        }
    }

    // ================================================================
    // 3. VIRTUALIZAÇÃO AUTOMÁTICA DE LISTAS
    // ================================================================

    _setupVirtualization() {
        // Detecta listas com muitos filhos e aplica virtualização
        const checkLists = () => {
            document.querySelectorAll('[data-virtualize], .virtual-list, ul, ol, .list').forEach(container => {
                // Evita reaplicar
                if (this._virtualizedLists.has(container)) return;

                const items = container.children;
                if (items.length > this.config.virtualizeThreshold) {
                    this._virtualizeList(container);
                }
            });
        };

        // Verifica periodicamente (a cada 2s) e após mudanças no DOM
        const interval = setInterval(checkLists, 2000);
        this._resourceContext.track({ clearTimeout: () => clearInterval(interval) });

        // Também verifica após mutations
        const observer = new MutationObserver(() => checkLists());
        observer.observe(document.body, { childList: true, subtree: true });
        this._resourceContext.track(observer);

        // Primeira verificação
        setTimeout(checkLists, 100);
    }

    _virtualizeList(container) {
        const items = Array.from(container.children);
        const itemHeight = items[0]?.offsetHeight || 40;
        const totalHeight = items.length * itemHeight;

        // Guarda os dados originais
        const itemData = items.map(el => el.cloneNode(true));
        container.innerHTML = '';

        // Cria wrapper
        const wrapper = document.createElement('div');
        wrapper.style.height = totalHeight + 'px';
        wrapper.style.position = 'relative';
        container.appendChild(wrapper);

        let startIndex = 0;
        let endIndex = 0;
        let rendered = [];

        const render = () => {
            const rect = container.getBoundingClientRect();
            const scrollTop = container.scrollTop || 0;
            const viewportHeight = container.clientHeight || window.innerHeight;

            startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - 3);
            endIndex = Math.min(items.length, Math.ceil((scrollTop + viewportHeight) / itemHeight) + 3);

            // Remove itens fora
            for (const el of rendered) {
                if (el._index < startIndex || el._index >= endIndex) {
                    el.remove();
                }
            }
            rendered = rendered.filter(el => el._index >= startIndex && el._index < endIndex);

            // Adiciona novos
            for (let i = startIndex; i < endIndex; i++) {
                if (!rendered.some(el => el._index === i)) {
                    const el = itemData[i].cloneNode(true);
                    el.style.position = 'absolute';
                    el.style.top = (i * itemHeight) + 'px';
                    el.style.left = '0';
                    el.style.width = '100%';
                    el._index = i;
                    wrapper.appendChild(el);
                    rendered.push(el);
                }
            }
        };

        container.addEventListener('scroll', render, { passive: true });
        const resizeObserver = new ResizeObserver(render);
        resizeObserver.observe(container);
        this._resourceContext.track(resizeObserver);

        render();
        this._virtualizedLists.set(container, {
            render, destroy: () => {
                container.removeEventListener('scroll', render);
                resizeObserver.disconnect();
                wrapper.remove();
                this._virtualizedLists.delete(container);
            }
        });
    }

    // ================================================================
    // 4. CACHE AUTOMÁTICO DE ELEMENTOS
    // ================================================================

    _cacheElement(key, element) {
        if (!this.config.enabled) return;
        const cache = this._cache.get(key) || [];
        if (cache.length >= this.config.cacheMaxSize) {
            cache.shift();
        }
        cache.push(element);
        this._cache.set(key, cache);
    }

    _getCachedElement(key) {
        const cache = this._cache.get(key);
        if (cache && cache.length > 0) {
            return cache.pop();
        }
        return null;
    }

    // ================================================================
    // 5. OTIMIZAÇÃO DE EVENTOS (global automática)
    // ================================================================

    _optimizeEvents() {
        // Aplica passive listeners para eventos de scroll/touch
        const events = ['scroll', 'touchstart', 'touchmove', 'wheel'];
        for (const event of events) {
            document.addEventListener(event, () => { }, { passive: true });
        }

        // Throttle para resize e scroll (via eventos customizados)
        let lastResize = 0;
        window.addEventListener('resize', () => {
            const now = Date.now();
            if (now - lastResize > 100) {
                lastResize = now;
                document.dispatchEvent(new CustomEvent('vessie:throttled:resize'));
            }
        }, { passive: true });

        let lastScroll = 0;
        document.addEventListener('scroll', () => {
            const now = Date.now();
            if (now - lastScroll > 16) {
                lastScroll = now;
                document.dispatchEvent(new CustomEvent('vessie:throttled:scroll'));
            }
        }, { passive: true });
    }

    // ================================================================
    // 6. MONITORAMENTO DE MEMÓRIA AUTOMÁTICO
    // ================================================================

    _startMemoryMonitoring() {
        this._monitorInterval = setInterval(() => {
            if (!this.config.enabled) return;
            // Estima uso de memória
            const totalElements = document.querySelectorAll('*').length;
            const totalObservers = this._lazyObserver ? 1 : 0;
            const totalVirtualized = this._virtualizedLists.size;
            const estimate = (totalElements * 0.1) + (totalVirtualized * 2) + (totalObservers * 0.5);
            if (estimate > 200) {
                // Sugere limpeza
                this._emit('memory:warning', { estimate, elements: totalElements });
                // Limpa cache se necessário
                if (totalElements > 5000) {
                    this._cache = new WeakMap();
                }
            }
        }, this.config.monitorInterval);
        this._resourceContext.track({ clearTimeout: () => clearInterval(this._monitorInterval) });
    }

    // ================================================================
    // 7. OTIMIZAÇÃO DE RENDERIZAÇÃO (will-change automático)
    // ================================================================

    _optimizeExistingElements() {
        // Aplica will-change em elementos com classes de animação
        document.querySelectorAll('.window, .dialog, .menu, .animated, .vessie-motion-tracked, [data-animate]').forEach(el => {
            el.style.willChange = 'transform, opacity';
            el.style.contain = 'layout style paint';
        });
    }

    // ================================================================
    // 8. OBSERVAÇÃO DE NOVOS ELEMENTOS (DOM automático)
    // ================================================================

    _observeNewElements() {
        this._mutationObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const el = node;
                        // Otimiza elementos com classes de animação
                        if (el.matches && el.matches('.window, .dialog, .menu, .animated')) {
                            el.style.willChange = 'transform, opacity';
                            el.style.contain = 'layout style paint';
                        }
                        // Lazy loading para imagens
                        if (el.tagName === 'IMG' && el.dataset.src) {
                            if (this._lazyObserver) this._lazyObserver.observe(el);
                        }
                        // Elementos com data-lazy-src
                        if (el.dataset && (el.dataset.lazySrc || el.dataset.lazyHref)) {
                            if (this._lazyObserver) this._lazyObserver.observe(el);
                        }
                        // Listas virtualizáveis
                        if (el.matches && el.matches('[data-virtualize], .virtual-list')) {
                            setTimeout(() => this._virtualizeList(el), 50);
                        }
                        // Pré-carregamento de links
                        if (el.tagName === 'A' && el.href) {
                            el.addEventListener('mouseenter', () => {
                                this._preloadResource(el.href);
                            }, { passive: true });
                        }
                    }
                }
            }
        });
        this._mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['data-src', 'data-lazy-src', 'data-lazy-href']
        });
        this._resourceContext.track(this._mutationObserver);
    }

    // ================================================================
    // 9. OTIMIZAÇÃO DE SCROLL (debounce automático)
    // ================================================================

    _setupScrollOptimizations() {
        // Aplica sticky/contain em elementos com posição fixa
        document.querySelectorAll('.sticky, .fixed').forEach(el => {
            el.style.contain = 'layout';
        });
    }

    // ================================================================
    // 10. ADAPTAÇÃO AO MODO DE PERFORMANCE (automática)
    // ================================================================

    _applyPerformanceMode(mode) {
        const quality = (typeof this.performanceManager?.getQuality === 'function')
            ? this.performanceManager.getQuality()
            : {};
        const effects = quality.effects || 1;

        if (mode === 'power-saving' || mode === 'low') {
            this.config.enabled = false;
            // Remove will-change de elementos para economizar
            document.querySelectorAll('[style*="will-change"]').forEach(el => {
                el.style.willChange = 'auto';
            });
        } else {
            this.config.enabled = true;
            // Reaplica will-change
            this._optimizeExistingElements();
        }

        // Ajusta threshold de lazy loading
        this.config.lazyLoadThreshold = effects > 0.6 ? 0.2 : 0.5;
    }

    // ================================================================
    // 11. EMISSÃO DE EVENTOS
    // ================================================================

    _emit(event, data) {
        document.dispatchEvent(new CustomEvent(`vessie:performance:${event}`, { detail: data }));
        if (window.VessieOS?.events) {
            window.VessieOS.events.emit(`performance:${event}`, data);
        }
    }

    // ================================================================
    // 12. DESTRUIÇÃO AUTOMÁTICA (chamada pelo ModuleSystem)
    // ================================================================

    destroy() {
        this._started = false;
        this._initialized = false;
        if (this._monitorInterval) {
            clearInterval(this._monitorInterval);
            this._monitorInterval = null;
        }
        if (this._rafId) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
        if (this._lazyObserver) {
            this._lazyObserver.disconnect();
            this._lazyObserver = null;
        }
        if (this._mutationObserver) {
            this._mutationObserver.disconnect();
            this._mutationObserver = null;
        }
        for (const [, list] of this._virtualizedLists) {
            if (list.destroy) list.destroy();
        }
        this._virtualizedLists.clear();
        this._cache = new WeakMap();
        this._preloadQueue = [];
        this._resourceContext.release();
        console.log('[PerformanceBooster] Destruído.');
    }

    // ================================================================
    // API PÚBLICA (opcional, mas mantida para compatibilidade)
    // ================================================================

    getStats() {
        return {
            enabled: this.config.enabled,
            virtualizedLists: this._virtualizedLists.size,
            preloadQueue: this._preloadQueue.length,
            hasLazyObserver: !!this._lazyObserver
        };
    }
}
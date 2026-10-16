/**
 * MotionBlurEngine – Efeito de desfoque de movimento
 * 
 * Aplica blur em elementos em movimento, com intensidade adaptativa
 * baseada na velocidade, respeitando prefers-reduced-motion.
 * 
 * Utiliza `will-change: transform` e `filter: blur()` apenas durante
 * o movimento, removendo após o término para preservar performance.
 */
export class MotionBlurEngine {
    constructor(resourceManager, eventManager, performanceManager, accessibilityManager, animationManager) {
        this.resourceManager = resourceManager;
        this.eventManager = eventManager;
        this.performanceManager = performanceManager;
        this.accessibilityManager = accessibilityManager;
        this.animationManager = animationManager;

        // Configuração
        this.config = {
            enabled: true,
            intensity: 1.0, // multiplicador global
            maxBlur: 4, // px
            minBlur: 0,
            duration: 200, // ms para transição suave
            adaptive: true,
            respectReducedMotion: true,
            throttle: 16 // ms entre verificações (≈60fps)
        };

        // Estado
        this._activeElements = new Map(); // element -> { velocity, currentBlur, lastPosition, isMoving }
        this._observer = null;
        this._mutationObserver = null;
        this._rafId = null;
        this._started = false;
        this._resourceContext = resourceManager.createContext('MotionBlurEngine');

        // Vincula eventos
        this._bindEvents();
    }

    /**
     * Inicializa o engine
     */
    init() {
        if (this._started) return;
        this._started = true;

        // Verifica se deve ser desativado por acessibilidade
        if (this.config.respectReducedMotion && this.accessibilityManager?.prefersReducedMotion) {
            this.config.enabled = false;
            console.log('[MotionBlur] Desativado devido a prefers-reduced-motion');
        }

        // Cria observador de movimento (usando MutationObserver para elementos dinâmicos)
        this._setupObservers();

        // Inicia loop de detecção
        this._startDetectionLoop();

        // Escuta mudanças de performance
        if (this.performanceManager) {
            this.performanceManager.on('performance:mode-change', (data) => {
                this._applyPerformanceMode(data.mode);
            });
        }

        // Escuta eventos de acessibilidade
        if (this.accessibilityManager) {
            this.accessibilityManager.on('reduced-motion-change', (prefers) => {
                this.config.enabled = !prefers;
                if (!this.config.enabled) {
                    this._clearAllBlur();
                }
            });
        }
    }

    /**
     * Configura observers para detectar novos elementos
     */
    _setupObservers() {
        // MutationObserver para novos elementos com animação
        const mutationObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        this._observeElement(node);
                    }
                }
            }
        });
        mutationObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
        this._resourceContext.track(mutationObserver);

        // ResizeObserver para elementos que mudam de tamanho
        if (window.ResizeObserver) {
            const resizeObserver = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    if (this._activeElements.has(entry.target)) {
                        // Força recálculo de movimento
                        const data = this._activeElements.get(entry.target);
                        if (data) data.lastPosition = null;
                    }
                }
            });
            resizeObserver.observe(document.body);
            this._resourceContext.track(resizeObserver);
        }
    }

    /**
     * Observa um elemento para movimento (aplica blur em elementos com transform/animations)
     */
    _observeElement(element) {
        // Verifica se o elemento tem animações CSS ou transições
        const style = getComputedStyle(element);
        const hasTransform = style.transform !== 'none';
        const hasTransition = style.transitionProperty && style.transitionProperty !== 'none';
        const hasAnimation = style.animationName && style.animationName !== 'none';

        if (hasTransform || hasTransition || hasAnimation) {
            // Marca para monitoramento
            if (!this._activeElements.has(element)) {
                this._activeElements.set(element, {
                    velocity: 0,
                    currentBlur: 0,
                    lastPosition: null,
                    isMoving: false,
                    lastTimestamp: 0
                });
                // Prepara para GPU
                element.style.willChange = 'transform';
                // Adiciona classe para identificação
                element.classList.add('vessie-motion-tracked');
            }
        }
    }

    /**
     * Loop principal de detecção de movimento
     */
    _startDetectionLoop() {
        if (this._rafId) return;

        let lastTime = performance.now();
        const tick = (time) => {
            if (!this._started) return;

            const delta = time - lastTime;
            if (delta >= this.config.throttle) {
                this._detectMovements(time);
                lastTime = time;
            }

            this._rafId = requestAnimationFrame(tick);
        };
        this._rafId = requestAnimationFrame(tick);
        this._resourceContext.track({ cancelAnimationFrame: () => { if (this._rafId) cancelAnimationFrame(this._rafId); } });
    }

    /**
     * Detecta movimento e aplica blur
     */
    _detectMovements(timestamp) {
        if (!this.config.enabled) {
            // Garante que todos os blurs sejam removidos
            if (this._activeElements.size > 0) {
                for (const [el, data] of this._activeElements) {
                    if (data.currentBlur > 0) {
                        this._applyBlur(el, 0);
                        data.currentBlur = 0;
                        data.isMoving = false;
                    }
                }
            }
            return;
        }

        const quality = (typeof this.performanceManager?.getQuality === 'function')
            ? this.performanceManager.getQuality()
            : { blurMax: this.config.maxBlur };
        const maxBlur = Math.min(this.config.maxBlur, quality.blurMax || this.config.maxBlur);

        for (const [element, data] of this._activeElements) {
            if (!document.body.contains(element)) {
                this._activeElements.delete(element);
                continue;
            }

            const rect = element.getBoundingClientRect();
            const currentPos = { x: rect.left, y: rect.top, w: rect.width, h: rect.height };

            if (data.lastPosition) {
                // Calcula velocidade (deslocamento em pixels por ms)
                const dx = currentPos.x - data.lastPosition.x;
                const dy = currentPos.y - data.lastPosition.y;
                const dt = timestamp - data.lastTimestamp || 1;
                const velocity = Math.sqrt(dx * dx + dy * dy) / dt;

                // Velocidade em pixels por segundo
                const velocityPxPerSec = velocity * 1000;
                const isMoving = velocityPxPerSec > 2; // threshold mínimo

                // Calcula intensidade do blur
                let blur = 0;
                if (isMoving) {
                    // Mapeia velocidade para blur (exponencial suave)
                    const normalized = Math.min(velocityPxPerSec / 300, 1);
                    blur = normalized * maxBlur * this.config.intensity;
                    blur = Math.max(this.config.minBlur, Math.min(maxBlur, blur));
                }

                // Suaviza transição
                const targetBlur = blur;
                const currentBlur = data.currentBlur;
                const diff = targetBlur - currentBlur;
                const step = diff * 0.15; // suavidade
                const newBlur = currentBlur + step;
                const finalBlur = Math.abs(newBlur) < 0.01 ? 0 : newBlur;

                // Aplica blur
                if (Math.abs(finalBlur - data.currentBlur) > 0.01 || finalBlur === 0) {
                    this._applyBlur(element, finalBlur);
                    data.currentBlur = finalBlur;
                }

                data.isMoving = isMoving;
                data.velocity = velocityPxPerSec;

                // Se parou de mover, remove blur gradualmente
                if (!isMoving && data.currentBlur > 0) {
                    // O loop irá reduzir gradualmente pelo step
                }
            }

            data.lastPosition = currentPos;
            data.lastTimestamp = timestamp;
        }
    }

    /**
     * Aplica blur a um elemento via CSS
     */
    _applyBlur(element, blur) {
        if (blur > 0) {
            element.style.filter = `blur(${blur}px)`;
            element.style.transition = `filter ${this.config.duration}ms ease`;
            element.dataset.vessieMotion = 'active';
        } else {
            element.style.filter = '';
            element.style.transition = `filter ${this.config.duration}ms ease`;
            element.dataset.vessieMotion = 'idle';
            // Remove a transição após um tempo para não interferir
            setTimeout(() => {
                if (element && element.style) {
                    element.style.transition = '';
                }
            }, this.config.duration + 50);
        }
    }

    /**
     * Remove todo blur imediatamente
     */
    _clearAllBlur() {
        for (const [el] of this._activeElements) {
            el.style.filter = '';
            el.style.transition = '';
            el.dataset.vessieMotion = 'idle';
        }
    }

    /**
     * Ajusta configuração baseada no modo de performance
     */
    _applyPerformanceMode(mode) {
        const quality = (typeof this.performanceManager?.getQuality === 'function')
            ? this.performanceManager.getQuality()
            : { blurMax: this.config.maxBlur };
        this.config.maxBlur = Math.min(this.config.maxBlur, quality.blurMax || this.config.maxBlur);
        // Ajusta intensidade
        if (mode === 'power-saving' || mode === 'low') {
            this.config.intensity = 0.3;
        } else if (mode === 'balanced') {
            this.config.intensity = 0.7;
        } else {
            this.config.intensity = 1.0;
        }
    }

    /**
     * API pública – habilita/desabilita
     */
    enable() {
        this.config.enabled = true;
        if (this.accessibilityManager?.prefersReducedMotion) {
            this.config.enabled = false;
            console.warn('[MotionBlur] Não é possível ativar com prefers-reduced-motion ativo');
        }
    }

    disable() {
        this.config.enabled = false;
        this._clearAllBlur();
    }

    /**
     * Define intensidade global (0.0 – 1.0)
     */
    setIntensity(value) {
        this.config.intensity = Math.max(0, Math.min(1, value));
    }

    /**
     * Define blur máximo em pixels
     */
    setMaxBlur(value) {
        this.config.maxBlur = Math.max(0, value);
    }

    /**
     * Obtém status
     */
    getStatus() {
        return {
            enabled: this.config.enabled,
            intensity: this.config.intensity,
            maxBlur: this.config.maxBlur,
            activeElements: this._activeElements.size,
            adaptive: this.config.adaptive,
            respectReducedMotion: this.config.respectReducedMotion
        };
    }

    /**
     * Destroi o engine e libera recursos
     */
    destroy() {
        this._started = false;
        if (this._rafId) {
            cancelAnimationFrame(this._rafId);
            this._rafId = null;
        }
        this._clearAllBlur();
        this._activeElements.clear();
        if (this._resourceContext) {
            this._resourceContext.release();
        }
        // Remove observers
        if (this._observer) {
            this._observer.disconnect();
        }
        if (this._mutationObserver) {
            this._mutationObserver.disconnect();
        }
    }

    /**
     * Vincula eventos do sistema
     */
    _bindEvents() {
        // Escuta movimento de janelas (WindowManager)
        if (window.VessieOS?.windows) {
            // Assumindo que windowManager existe e emite eventos
            const winManager = window.VessieOS.windows;
            if (winManager.on) {
                winManager.on('window:move', (data) => {
                    if (data && data.window && data.window.element) {
                        this._observeElement(data.window.element);
                    }
                });
            }
        }

        // Escuta criação de novos elementos
        document.addEventListener('DOMContentLoaded', () => {
            // Observa elementos existentes
            document.querySelectorAll('[style*="transform"], .animated, .window, .menu, .dialog').forEach(el => {
                this._observeElement(el);
            });
        });
    }
}
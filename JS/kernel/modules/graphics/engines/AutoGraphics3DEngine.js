/**
 * AutoGraphics3DEngine – Renderizador 3D Autônomo
 * 
 * Inicializa automaticamente, detecta elementos 3D existentes,
 * aplica melhorias de iluminação, texturas, performance e detalhes.
 * 
 * Zero comandos manuais – tudo é feito por observadores e heurísticas.
 */
class AutoGraphics3DEngine {
    constructor() {
        this.version = '2.0.0';
        this._scenes = new Map();
        this._activeScene = null;
        this._gl = null;
        this._canvas = null;
        this._initialized = false;
        this._devicePixelRatio = window.devicePixelRatio || 1;
        this._anisotropy = 0;
        this._maxTextureSize = 4096;
        this._shadowMapSize = 1024;
        this._lodDistances = [0, 50, 150, 500];

        // Configurações adaptativas
        this.config = {
            shadowEnabled: true,
            shadowBias: 0.001,
            antialiasing: true,
            anisotropicFiltering: true,
            textureCompression: true,
            lodEnabled: true,
            frustumCulling: true,
            instancingEnabled: true,
            batchingEnabled: true,
            normalMapping: true,
            displacementMapping: true,
            tessellation: true,
            quality: 'high',
            autoDetect: true,
            autoUpgrade: true
        };

        // Cache e recursos
        this._shaderCache = new Map();
        this._detectedElements = new Set();
        this._resourceContext = null;
        this._mutationObserver = null;
        this._intersectionObserver = null;
        this._renderLoopId = null;
        this._started = false;
        this._fallback = false;

        // Inicialização automática
        this._autoInit();
    }

    // ================================================================
    // INICIALIZAÇÃO AUTOMÁTICA
    // ================================================================

    _autoInit() {
        if (this._initialized) return;
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this._init());
        } else {
            this._init();
        }
    }

    _init() {
        if (this._initialized) return;

        // Detecta se há conteúdo 3D na página
        const has3D = this._detect3DContent();
        if (!has3D) {
            console.log('[AutoGraphics3D] Nenhum conteúdo 3D detectado. Aguardando...');
            // Observa novos elementos
            this._setupContentDetection();
            return;
        }

        // Inicializa WebGL
        this._setupWebGL();
        if (this._fallback) {
            console.warn('[AutoGraphics3D] Fallback para renderização 2D.');
            this._initialized = true;
            return;
        }

        // Configura renderização
        this._setupRendering();
        this._setupObservers();
        this._startRenderLoop();

        // Melhora elementos existentes
        this._upgradeExistingElements();

        this._initialized = true;
        this._started = true;
        console.log('[AutoGraphics3D] Engine autônoma inicializada.');
    }

    // ================================================================
    // DETECÇÃO DE CONTEÚDO 3D
    // ================================================================

    _detect3DContent() {
        // Canvas com WebGL
        const canvases = document.querySelectorAll('canvas');
        for (const canvas of canvases) {
            const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
            if (gl) {
                this._detectedElements.add(canvas);
                return true;
            }
        }

        // Elementos com classes 3D comuns
        const selectors = [
            '.threejs', '.webgl', '.3d', '.model-viewer',
            '[data-3d]', '[data-webgl]',
            '.scene', '.renderer'
        ];
        for (const selector of selectors) {
            const els = document.querySelectorAll(selector);
            if (els.length > 0) {
                for (const el of els) this._detectedElements.add(el);
                return true;
            }
        }

        // Model-viewer elements
        if (document.querySelector('model-viewer')) {
            return true;
        }

        return false;
    }

    _setupContentDetection() {
        // Observa novos elementos adicionados ao DOM
        this._mutationObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // Verifica se é um elemento 3D
                        if (this._is3DElement(node)) {
                            this._detectedElements.add(node);
                            if (!this._initialized) {
                                this._init();
                            } else {
                                this._upgradeElement(node);
                            }
                        }
                    }
                }
            }
        });
        this._mutationObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    _is3DElement(element) {
        if (element.tagName === 'CANVAS') {
            const gl = element.getContext('webgl2') || element.getContext('webgl');
            if (gl) return true;
        }
        if (element.tagName === 'MODEL-VIEWER') return true;
        if (element.matches && element.matches('.threejs, .webgl, .3d, [data-3d]')) return true;
        return false;
    }

    // ================================================================
    // CONFIGURAÇÃO WEBGL
    // ================================================================

    _setupWebGL() {
        // Encontra ou cria canvas
        let canvas = document.querySelector('canvas.webgl, canvas.threejs, canvas#webgl');
        if (!canvas) {
            // Cria canvas oculto para fallback
            canvas = document.createElement('canvas');
            canvas.style.display = 'none';
            document.body.appendChild(canvas);
        }

        const gl = canvas.getContext('webgl2', {
            antialias: this.config.antialiasing,
            alpha: true,
            depth: true,
            stencil: true,
            powerPreference: 'high-performance'
        }) || canvas.getContext('webgl', {
            antialias: this.config.antialiasing,
            alpha: true,
            depth: true,
            stencil: true,
            powerPreference: 'high-performance'
        });

        if (!gl) {
            this._fallback = true;
            return;
        }

        this._gl = gl;
        this._canvas = canvas;
        this._detectedElements.add(canvas);

        // Detecta extensões
        this._detectExtensions();

        // Configura anisotropia
        if (this.config.anisotropicFiltering) {
            this._anisotropy = this._getMaxAnisotropy();
        }
    }

    // ================================================================
    // CONFIGURAÇÃO DE RENDERIZAÇÃO
    // ================================================================

    _setupRendering() {
        const gl = this._gl;
        if (!gl) return;

        // Configuração de profundidade
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.clearDepth(1.0);

        // Configuração de face culling
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);

        // Configuração de blend
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        // Redimensiona canvas
        this._resizeCanvas();

        // Cria cena padrão
        this.createScene('auto-scene');
        this._activeScene = this._scenes.get('auto-scene');

        // Configura câmera padrão
        const camera = new Camera(60, this._canvas.width / this._canvas.height);
        camera.moveTo(new Vector3(0, 2, 5)).lookAt(new Vector3(0, 0, 0));
        this._activeScene.setCamera(camera);

        // Adiciona luzes padrão
        const ambient = new Light('ambient', [0.4, 0.4, 0.5], 0.6);
        this._activeScene.addLight(ambient);

        const dirLight = new Light('directional', [1, 0.9, 0.8], 0.8);
        dirLight.setDirection(-1, -1.5, -0.5);
        this._activeScene.addLight(dirLight);

        const pointLight = new Light('point', [1, 0.6, 0.3], 0.5);
        pointLight.setPosition(0, 3, 2);
        this._activeScene.addLight(pointLight);
    }

    _resizeCanvas() {
        const gl = this._gl;
        const canvas = this._canvas;
        if (!gl || !canvas) return;

        const rect = canvas.getBoundingClientRect();
        const w = rect.width * this._devicePixelRatio || window.innerWidth * this._devicePixelRatio;
        const h = rect.height * this._devicePixelRatio || window.innerHeight * this._devicePixelRatio;

        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
            gl.viewport(0, 0, w, h);
            if (this._activeScene && this._activeScene._camera) {
                this._activeScene._camera.aspect = w / h;
                this._activeScene._camera._update();
            }
        }
    }

    // ================================================================
    // OBSERVADORES DE MUDANÇA
    // ================================================================

    _setupObservers() {
        // ResizeObserver para redimensionar canvas
        if (window.ResizeObserver) {
            const resizeObserver = new ResizeObserver(() => {
                this._resizeCanvas();
            });
            resizeObserver.observe(this._canvas);
            this._resourceContext = { track: () => { } }; // simplificado
        }

        // IntersectionObserver para ativar/desativar renderização
        if (window.IntersectionObserver) {
            this._intersectionObserver = new IntersectionObserver((entries) => {
                let visible = false;
                for (const entry of entries) {
                    if (entry.isIntersecting) visible = true;
                }
                if (visible && !this._started) {
                    this._startRenderLoop();
                } else if (!visible && this._started) {
                    this._stopRenderLoop();
                }
            });
            this._intersectionObserver.observe(this._canvas);
        }

        // MutationObserver para novos elementos 3D
        const mutationObserver = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (this._is3DElement(node)) {
                            this._upgradeElement(node);
                        }
                        // Busca elementos 3D dentro do nó adicionado
                        const inner3D = node.querySelectorAll && node.querySelectorAll('canvas.webgl, canvas.threejs, model-viewer, [data-3d]');
                        if (inner3D && inner3D.length) {
                            for (const el of inner3D) {
                                this._upgradeElement(el);
                            }
                        }
                    }
                }
            }
        });
        mutationObserver.observe(document.body, { childList: true, subtree: true });
    }

    // ================================================================
    // LOOP DE RENDERIZAÇÃO AUTOMÁTICO
    // ================================================================

    _startRenderLoop() {
        if (this._renderLoopId) return;
        this._started = true;
        let lastTime = 0;

        const loop = (time) => {
            if (!this._started) return;
            const delta = lastTime ? (time - lastTime) / 1000 : 0.016;
            lastTime = time;

            // Atualiza cena (movimento automático de objetos detectados)
            this._updateScene(time);

            // Renderiza
            if (this._activeScene) {
                this._activeScene.render();
            }

            this._renderLoopId = requestAnimationFrame(loop);
        };

        this._renderLoopId = requestAnimationFrame(loop);
    }

    _stopRenderLoop() {
        if (this._renderLoopId) {
            cancelAnimationFrame(this._renderLoopId);
            this._renderLoopId = null;
        }
        this._started = false;
    }

    _updateScene(time) {
        // Aplica animações automáticas em objetos detectados
        const scene = this._activeScene;
        if (!scene) return;
        const objects = scene.getObjects();

        // Rotação automática suave
        for (const obj of objects) {
            if (!obj._autoRotate && obj._autoRotate !== false) {
                obj._autoRotate = true;
            }
            if (obj._autoRotate) {
                const speed = obj._rotationSpeed || 0.002;
                obj.rotation.y += speed * 60 * 0.016;
                obj.update();
            }
        }
    }

    // ================================================================
    // UPGRADE AUTOMÁTICO DE ELEMENTOS
    // ================================================================

    _upgradeExistingElements() {
        // Procura todos os elementos 3D e aplica melhorias
        const elements = document.querySelectorAll('canvas.webgl, canvas.threejs, model-viewer, [data-3d]');
        for (const el of elements) {
            this._upgradeElement(el);
        }
    }

    _upgradeElement(element) {
        if (this._upgradedElements && this._upgradedElements.has(element)) return;
        if (!this._upgradedElements) this._upgradedElements = new Set();

        // Aplica melhorias
        if (element.tagName === 'CANVAS') {
            // Melhora o canvas (antialiasing, qualidade)
            element.style.imageRendering = 'auto';
            element.style.willChange = 'transform';
        }

        if (element.tagName === 'MODEL-VIEWER') {
            // Melhora model-viewer
            element.setAttribute('camera-controls', '');
            element.setAttribute('auto-rotate', '');
            element.setAttribute('auto-rotate-delay', '0');
            element.setAttribute('shadow-intensity', '0.8');
            element.setAttribute('exposure', '1.2');
        }

        if (element.matches && element.matches('.threejs, .webgl')) {
            element.classList.add('vessie-3d-upgraded');
            element.style.willChange = 'transform';
            element.style.contain = 'layout style paint';
        }

        // Adiciona ao scene para renderização automática
        if (this._activeScene && element._threeObject) {
            // Se já existe um objeto Three.js, adiciona à cena
            this._activeScene.addObject(element._threeObject);
        }

        this._upgradedElements.add(element);
        console.log('[AutoGraphics3D] Elemento 3D aprimorado:', element);
    }

    // ================================================================
    // API DE CRIAÇÃO DE CENA (mantida para compatibilidade)
    // ================================================================

    createScene(name) {
        const scene = new Scene(this);
        this._scenes.set(name, scene);
        return scene;
    }

    getScene(name) {
        return this._scenes.get(name) || null;
    }

    setActiveScene(name) {
        const scene = this._scenes.get(name);
        if (scene) this._activeScene = scene;
        return this;
    }

    setQuality(level) {
        const levels = {
            'low': { shadowEnabled: false, anisotropicFiltering: false, lodEnabled: true, frustumCulling: true, normalMapping: false, displacementMapping: false, tessellation: false },
            'medium': { shadowEnabled: true, anisotropicFiltering: true, lodEnabled: true, frustumCulling: true, normalMapping: true, displacementMapping: false, tessellation: false },
            'high': { shadowEnabled: true, anisotropicFiltering: true, lodEnabled: true, frustumCulling: true, normalMapping: true, displacementMapping: true, tessellation: true },
            'ultra': { shadowEnabled: true, anisotropicFiltering: true, lodEnabled: true, frustumCulling: true, normalMapping: true, displacementMapping: true, tessellation: true, shadowMapSize: 2048 }
        };
        const cfg = levels[level] || levels.high;
        Object.assign(this.config, cfg);
        if (cfg.anisotropicFiltering) {
            this._anisotropy = this._getMaxAnisotropy();
        } else {
            this._anisotropy = 1;
        }
        this._shaderCache.clear();
        console.log(`[AutoGraphics3D] Qualidade definida para: ${level}`);
        return this;
    }

    getStats() {
        return {
            version: this.version,
            initialized: this._initialized,
            fallback: this._fallback || false,
            scenes: this._scenes.size,
            activeScene: this._activeScene ? this._activeScene._name : null,
            shaders: this._shaderCache.size,
            anisotropy: this._anisotropy,
            detectedElements: this._detectedElements.size,
            upgradedElements: this._upgradedElements ? this._upgradedElements.size : 0,
            started: this._started,
            config: { ...this.config }
        };
    }

    destroy() {
        this._stopRenderLoop();
        const gl = this._gl;
        if (gl) {
            for (const [key, shader] of this._shaderCache) {
                gl.deleteProgram(shader.program);
                gl.deleteShader(shader.vertexShader);
                gl.deleteShader(shader.fragmentShader);
            }
            this._shaderCache.clear();
        }
        if (this._mutationObserver) this._mutationObserver.disconnect();
        if (this._intersectionObserver) this._intersectionObserver.disconnect();
        this._scenes.clear();
        this._activeScene = null;
        this._initialized = false;
        this._started = false;
        console.log('[AutoGraphics3D] Engine destruída.');
    }
}

// ================================================================
// EXPORTAÇÃO GLOBAL (para registro automático)
// ================================================================

if (typeof window !== 'undefined') {
    window.VessieAutoGraphics3D = AutoGraphics3DEngine;
}

export default AutoGraphics3DEngine;
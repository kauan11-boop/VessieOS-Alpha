/**
 * ThreeJSMotionBlur – Smooth Movement Controller com Motion Blur
 * 
 * Detecta automaticamente o Three.js e aprimora a experiência:
 * - Suavização de câmera e objetos (lerp)
 * - Motion blur via pós-processamento (EffectComposer)
 * - Adaptação automática de performance
 * - Zero configuração manual
 * 
 * Integra-se ao AutoGraphics3DEngine se disponível.
 */
class ThreeJSMotionBlur {
    constructor() {
        this.version = '1.0.0';
        this._initialized = false;
        this._enabled = true;
        this._three = null;
        this._scene = null;
        this._camera = null;
        this._renderer = null;
        this._composer = null;
        this._targets = new Map(); // objeto -> { current, target, speed }
        this._animFrameId = null;
        this._started = false;
        this._resourceContext = null;

        // Configuração adaptativa
        this.config = {
            smoothing: 0.08,         // fator de interpolação (0-1)
            motionBlur: true,
            blurSamples: 8,          // número de amostras para motion blur
            blurIntensity: 0.5,
            autoDetect: true,
            adaptToPerformance: true
        };

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

        // Verifica se Three.js está disponível
        if (typeof window.THREE === 'undefined') {
            console.log('[ThreeJSMotionBlur] Three.js não encontrado. Aguardando...');
            // Observa a chegada do Three.js
            this._watchThreeJS();
            return;
        }

        this._three = window.THREE;
        this._setupThreeJS();
        this._initialized = true;
        this._started = true;
        console.log('[ThreeJSMotionBlur] Inicializado com Three.js');
    }

    _watchThreeJS() {
        // Usa MutationObserver para detectar quando Three.js é carregado
        const observer = new MutationObserver(() => {
            if (typeof window.THREE !== 'undefined') {
                observer.disconnect();
                this._init();
            }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
        // Fallback: verifica a cada 500ms por 10 segundos
        let attempts = 0;
        const interval = setInterval(() => {
            attempts++;
            if (typeof window.THREE !== 'undefined') {
                clearInterval(interval);
                this._init();
            } else if (attempts > 20) {
                clearInterval(interval);
                console.warn('[ThreeJSMotionBlur] Three.js não carregado. Desativado.');
            }
        }, 500);
    }

    // ================================================================
    // CONFIGURAÇÃO DO THREE.JS
    // ================================================================

    _setupThreeJS() {
        const THREE = this._three;

        // Detecta cena e câmera globais
        this._scene = this._findScene();
        this._camera = this._findCamera();
        this._renderer = this._findRenderer();

        if (!this._scene || !this._camera || !this._renderer) {
            console.warn('[ThreeJSMotionBlur] Cena/câmera/renderer não encontrados.');
            // Tenta criar uma cena padrão (para demos)
            this._createDefaultScene();
            return;
        }

        // Configura motion blur via pós-processamento
        if (this.config.motionBlur) {
            this._setupMotionBlur();
        }

        // Configura interpolação
        this._setupSmoothing();

        // Adapta à performance
        if (this.config.adaptToPerformance) {
            this._adaptToPerformance();
        }

        // Inicia loop
        this._startLoop();
    }

    // ================================================================
    // DETECÇÃO DE CENA/CÂMERA/RENDERER
    // ================================================================

    _findScene() {
        const THREE = this._three;
        // Procura por uma cena global
        if (window._scene && window._scene instanceof THREE.Scene) return window._scene;
        if (window.scene && window.scene instanceof THREE.Scene) return window.scene;

        // Procura em objetos globais comuns
        for (const key in window) {
            try {
                const obj = window[key];
                if (obj && obj.isScene) return obj;
            } catch (_) { }
        }
        return null;
    }

    _findCamera() {
        const THREE = this._three;
        if (window._camera && window._camera instanceof THREE.Camera) return window._camera;
        if (window.camera && window.camera instanceof THREE.Camera) return window.camera;

        for (const key in window) {
            try {
                const obj = window[key];
                if (obj && obj.isCamera) return obj;
            } catch (_) { }
        }
        return null;
    }

    _findRenderer() {
        const THREE = this._three;
        if (window._renderer && window._renderer instanceof THREE.WebGLRenderer) return window._renderer;
        if (window.renderer && window.renderer instanceof THREE.WebGLRenderer) return window.renderer;

        for (const key in window) {
            try {
                const obj = window[key];
                if (obj && obj.isWebGLRenderer) return obj;
            } catch (_) { }
        }
        return null;
    }

    _createDefaultScene() {
        const THREE = this._three;
        if (!THREE) return;

        // Cria uma cena básica para demonstração
        this._scene = new THREE.Scene();
        this._scene.background = new THREE.Color(0x1a1a2e);

        this._camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this._camera.position.set(0, 2, 5);
        this._camera.lookAt(0, 0, 0);

        this._renderer = new THREE.WebGLRenderer({ antialias: true });
        this._renderer.setSize(window.innerWidth, window.innerHeight);
        this._renderer.setPixelRatio(window.devicePixelRatio || 1);
        document.body.appendChild(this._renderer.domElement);

        // Adiciona objetos de exemplo
        const geo = new THREE.BoxGeometry(1, 1, 1);
        const mat = new THREE.MeshStandardMaterial({ color: 0x8366ff });
        const mesh = new THREE.Mesh(geo, mat);
        this._scene.add(mesh);

        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(1, 2, 3);
        this._scene.add(light);

        const ambient = new THREE.AmbientLight(0x404060);
        this._scene.add(ambient);

        // Expõe globalmente
        window._scene = this._scene;
        window._camera = this._camera;
        window._renderer = this._renderer;

        console.log('[ThreeJSMotionBlur] Cena padrão criada.');
    }

    // ================================================================
    // MOTION BLUR VIA PÓS-PROCESSAMENTO
    // ================================================================

    _setupMotionBlur() {
        const THREE = this._three;
        const renderer = this._renderer;
        const scene = this._scene;
        const camera = this._camera;

        if (!renderer || !scene || !camera) return;

        try {
            // Verifica se EffectComposer está disponível (carregado via CDN ou local)
            if (typeof THREE.EffectComposer === 'undefined') {
                // Tenta carregar dinamicamente
                this._loadEffectComposer();
                return;
            }

            this._composer = new THREE.EffectComposer(renderer);
            const renderPass = new THREE.RenderPass(scene, camera);
            this._composer.addPass(renderPass);

            // Motion blur pass
            if (typeof THREE.AfterimagePass !== 'undefined') {
                const afterimagePass = new THREE.AfterimagePass(this.config.blurIntensity);
                this._composer.addPass(afterimagePass);
                this._afterimagePass = afterimagePass;
            } else {
                // Fallback: passa de desfoque simples
                if (typeof THREE.UnrealBloomPass !== 'undefined') {
                    const bloomPass = new THREE.UnrealBloomPass(
                        new THREE.Vector2(window.innerWidth, window.innerHeight),
                        0.1, 0.1, 0.1
                    );
                    this._composer.addPass(bloomPass);
                    this._bloomPass = bloomPass;
                }
            }

            // Resize handler
            window.addEventListener('resize', () => {
                const w = window.innerWidth;
                const h = window.innerHeight;
                if (this._composer) {
                    this._composer.setSize(w, h);
                }
            });

            console.log('[ThreeJSMotionBlur] Motion blur configurado.');
        } catch (e) {
            console.warn('[ThreeJSMotionBlur] Erro ao configurar motion blur:', e);
        }
    }

    _loadEffectComposer() {
        // Tenta carregar via CDN (se estiver online)
        if (document.querySelector('script[src*="three/addons/postprocessing/EffectComposer"]')) return;

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/three@0.163.0/examples/jsm/postprocessing/EffectComposer.js';
        script.type = 'module';
        document.head.appendChild(script);

        script.onload = () => {
            // Aguarda o módulo carregar e tenta novamente
            setTimeout(() => this._setupMotionBlur(), 100);
        };
        script.onerror = () => {
            console.warn('[ThreeJSMotionBlur] Falha ao carregar EffectComposer. Motion blur desativado.');
        };
    }

    // ================================================================
    // SMOOTHING (INTERPOLAÇÃO)
    // ================================================================

    _setupSmoothing() {
        // Armazena posições alvo e atuais para objetos e câmera
        if (this._camera) {
            this._targets.set('camera', {
                current: this._camera.position.clone(),
                target: this._camera.position.clone(),
                speed: this.config.smoothing
            });
        }

        // Para objetos na cena (Mesh, Group)
        if (this._scene) {
            this._scene.traverse((child) => {
                if (child.isMesh || child.isGroup) {
                    if (child.position) {
                        this._targets.set(child.uuid, {
                            current: child.position.clone(),
                            target: child.position.clone(),
                            speed: this.config.smoothing,
                            object: child
                        });
                    }
                }
            });
        }

        // Observa novos objetos adicionados à cena
        if (this._scene && this._scene.add) {
            const originalAdd = this._scene.add.bind(this._scene);
            this._scene.add = (object) => {
                originalAdd(object);
                if (object.isMesh || object.isGroup) {
                    this._addTarget(object);
                }
                // Propaga para filhos
                if (object.traverse) {
                    object.traverse((child) => {
                        if (child.isMesh || child.isGroup) {
                            this._addTarget(child);
                        }
                    });
                }
            };
        }
    }

    _addTarget(object) {
        if (!object || !object.position) return;
        if (this._targets.has(object.uuid)) return;
        this._targets.set(object.uuid, {
            current: object.position.clone(),
            target: object.position.clone(),
            speed: this.config.smoothing,
            object: object
        });
    }

    // ================================================================
    // LOOP DE ATUALIZAÇÃO
    // ================================================================

    _startLoop() {
        if (this._animFrameId) return;

        const loop = () => {
            // Aplica smoothing
            this._applySmoothing();

            // Renderiza com motion blur
            if (this._composer) {
                this._composer.render();
            } else if (this._renderer && this._scene && this._camera) {
                this._renderer.render(this._scene, this._camera);
            }

            this._animFrameId = requestAnimationFrame(loop);
        };
        this._animFrameId = requestAnimationFrame(loop);
    }

    _applySmoothing() {
        const smoothing = this.config.smoothing;

        for (const [key, target] of this._targets) {
            if (!target.object && key !== 'camera') continue;

            const obj = target.object;
            const pos = obj ? obj.position : this._camera.position;
            if (!pos) continue;

            // Atualiza alvo (se o objeto foi movido externamente)
            if (obj) {
                target.target.copy(obj.position);
            } else {
                target.target.copy(this._camera.position);
            }

            // Interpola (lerp)
            target.current.x += (target.target.x - target.current.x) * smoothing;
            target.current.y += (target.target.y - target.current.y) * smoothing;
            target.current.z += (target.target.z - target.current.z) * smoothing;

            // Aplica a posição suavizada
            pos.copy(target.current);
        }
    }

    // ================================================================
    // ADAPTAÇÃO DE PERFORMANCE
    // ================================================================

    _adaptToPerformance() {
        // Monitora FPS via requestAnimationFrame
        let frameCount = 0;
        let lastTime = performance.now();

        const checkPerformance = () => {
            const now = performance.now();
            const delta = now - lastTime;
            if (delta >= 1000) {
                const fps = frameCount / (delta / 1000);
                frameCount = 0;
                lastTime = now;

                // Ajusta qualidade
                if (fps < 30) {
                    this.config.smoothing = 0.04;
                    this.config.blurSamples = 4;
                    if (this._afterimagePass) {
                        this._afterimagePass.uniforms['damp'].value = 0.2;
                    }
                } else if (fps < 45) {
                    this.config.smoothing = 0.06;
                    this.config.blurSamples = 6;
                    if (this._afterimagePass) {
                        this._afterimagePass.uniforms['damp'].value = 0.35;
                    }
                } else {
                    this.config.smoothing = 0.08;
                    this.config.blurSamples = 8;
                    if (this._afterimagePass) {
                        this._afterimagePass.uniforms['damp'].value = this.config.blurIntensity;
                    }
                }
            }
            frameCount++;
            requestAnimationFrame(checkPerformance);
        };
        requestAnimationFrame(checkPerformance);
    }

    // ================================================================
    // API PÚBLICA
    // ================================================================

    enable() {
        this._enabled = true;
        if (!this._started) {
            this._startLoop();
        }
    }

    disable() {
        this._enabled = false;
        if (this._animFrameId) {
            cancelAnimationFrame(this._animFrameId);
            this._animFrameId = null;
        }
        this._started = false;
    }

    setSmoothing(value) {
        this.config.smoothing = Math.max(0.01, Math.min(1, value));
        // Atualiza alvos existentes
        for (const [, target] of this._targets) {
            target.speed = this.config.smoothing;
        }
    }

    setBlurIntensity(value) {
        this.config.blurIntensity = Math.max(0, Math.min(1, value));
        if (this._afterimagePass) {
            this._afterimagePass.uniforms['damp'].value = this.config.blurIntensity;
        }
    }

    getStats() {
        return {
            initialized: this._initialized,
            enabled: this._enabled,
            started: this._started,
            smoothing: this.config.smoothing,
            blurIntensity: this.config.blurIntensity,
            targets: this._targets.size,
            composer: !!this._composer,
            threeVersion: this._three ? this._three.REVISION : null
        };
    }

    destroy() {
        this.disable();
        this._targets.clear();
        if (this._composer) {
            this._composer = null;
        }
        this._initialized = false;
        console.log('[ThreeJSMotionBlur] Destruído.');
    }
}

// ================================================================
// EXPORTAÇÃO GLOBAL
// ================================================================

if (typeof window !== 'undefined') {
    window.VessieThreeJSMotionBlur = ThreeJSMotionBlur;
}

export default ThreeJSMotionBlur;
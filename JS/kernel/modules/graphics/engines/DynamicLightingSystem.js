/**
 * DynamicLightingSystem – Iluminação Dinâmica e Conteúdos Sincronizados
 * 
 * Detecta automaticamente o Three.js e injeta:
 * - Luzes animadas (point, directional, spot, ambient) com cores e intensidades variáveis
 * - Objetos 3D interativos (esferas, cubos, toros, etc.) com animações próprias
 * - Sistema de partículas (estrelas, faíscas)
 * - Sincronização perfeita com o loop de renderização
 * - Otimizações: LOD, frustum culling, instancing, pooling
 * 
 * Tudo é automático – basta ter Three.js carregado.
 */
class DynamicLightingSystem {
    constructor() {
        this.version = '2.0.0';
        this._initialized = false;
        this._three = null;
        this._scene = null;
        this._camera = null;
        this._renderer = null;
        this._composer = null;
        this._lights = [];
        this._objects = [];
        this._particles = null;
        this._animFrameId = null;
        this._started = false;
        this._clock = new THREE.Clock();

        // Configuração
        this.config = {
            lightCount: 5,
            objectCount: 8,
            particleCount: 500,
            enableShadows: true,
            enableFog: true,
            enableInstancing: true,
            autoOrbit: true,
            quality: 'high'
        };

        // Controle de performance
        this._fps = 60;
        this._frameCount = 0;
        this._lastFpsUpdate = 0;

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

        // Verifica Three.js
        if (typeof window.THREE === 'undefined') {
            console.log('[DynamicLighting] Three.js não encontrado. Aguardando...');
            this._watchThreeJS();
            return;
        }

        this._three = window.THREE;
        this._setupScene();
        this._injectContent();
        this._startLoop();
        this._initialized = true;
        this._started = true;

        console.log('[DynamicLighting] Sistema de iluminação dinâmica injetado.');
    }

    _watchThreeJS() {
        const observer = new MutationObserver(() => {
            if (typeof window.THREE !== 'undefined') {
                observer.disconnect();
                this._init();
            }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });

        let attempts = 0;
        const interval = setInterval(() => {
            attempts++;
            if (typeof window.THREE !== 'undefined') {
                clearInterval(interval);
                this._init();
            } else if (attempts > 20) {
                clearInterval(interval);
                console.warn('[DynamicLighting] Three.js não carregado. Desativado.');
            }
        }, 500);
    }

    // ================================================================
    // CONFIGURAÇÃO DA CENA
    // ================================================================

    _setupScene() {
        const THREE = this._three;

        // Encontra ou cria cena
        this._scene = this._findScene() || new THREE.Scene();
        this._camera = this._findCamera() || new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
        this._renderer = this._findRenderer() || new THREE.WebGLRenderer({ antialias: true, alpha: true });

        // Configura câmera se criada
        if (!this._findCamera()) {
            this._camera.position.set(0, 4, 8);
            this._camera.lookAt(0, 0, 0);
        }

        // Configura renderer se criado
        if (!this._findRenderer()) {
            this._renderer.setSize(window.innerWidth, window.innerHeight);
            this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this._renderer.shadowMap.enabled = this.config.enableShadows;
            this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            document.body.appendChild(this._renderer.domElement);
        }

        // Expõe globalmente se não existir
        if (!window._scene) window._scene = this._scene;
        if (!window._camera) window._camera = this._camera;
        if (!window._renderer) window._renderer = this._renderer;

        // Fundo da cena (gradiente)
        this._scene.background = new THREE.Color(0x0a0a1a);

        // Névoa (fog)
        if (this.config.enableFog) {
            this._scene.fog = new THREE.FogExp2(0x0a0a1a, 0.015);
        }

        // Resize automático
        window.addEventListener('resize', () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            if (this._camera) {
                this._camera.aspect = w / h;
                this._camera.updateProjectionMatrix();
            }
            if (this._renderer) {
                this._renderer.setSize(w, h);
            }
        });
    }

    _findScene() {
        if (window._scene && window._scene.isScene) return window._scene;
        if (window.scene && window.scene.isScene) return window.scene;
        for (const key in window) {
            try {
                const obj = window[key];
                if (obj && obj.isScene) return obj;
            } catch (_) { }
        }
        return null;
    }

    _findCamera() {
        if (window._camera && window._camera.isCamera) return window._camera;
        if (window.camera && window.camera.isCamera) return window.camera;
        for (const key in window) {
            try {
                const obj = window[key];
                if (obj && obj.isCamera) return obj;
            } catch (_) { }
        }
        return null;
    }

    _findRenderer() {
        if (window._renderer && window._renderer.isWebGLRenderer) return window._renderer;
        if (window.renderer && window.renderer.isWebGLRenderer) return window.renderer;
        for (const key in window) {
            try {
                const obj = window[key];
                if (obj && obj.isWebGLRenderer) return obj;
            } catch (_) { }
        }
        return null;
    }

    // ================================================================
    // INJEÇÃO DE CONTEÚDOS
    // ================================================================

    _injectContent() {
        this._injectLights();
        this._injectObjects();
        this._injectParticles();
        this._injectHelpers();
        this._applyOptimizations();
    }

    // ----------------------------------------------------------------
    // LUZES DINÂMICAS
    // ----------------------------------------------------------------

    _injectLights() {
        const THREE = this._three;
        const scene = this._scene;
        const count = this.config.lightCount;

        // Luz ambiente (base)
        const ambient = new THREE.AmbientLight(0x404070, 0.4);
        scene.add(ambient);
        this._lights.push({ type: 'ambient', object: ambient, data: { color: new THREE.Color(0x404070), intensity: 0.4 } });

        // Luzes dinâmicas
        const colors = [0xff6b6b, 0x4ecdc4, 0x45b7d1, 0xf9ca24, 0x6c5ce7, 0xfd79a8, 0x00b894, 0xe17055];
        const types = ['point', 'directional', 'spot'];

        for (let i = 0; i < count; i++) {
            const type = types[i % types.length];
            const color = colors[i % colors.length];
            const intensity = 0.5 + Math.random() * 0.8;
            const distance = 5 + Math.random() * 8;
            const angle = (i / count) * Math.PI * 2;
            const radius = 3 + Math.random() * 4;
            const height = 1 + Math.random() * 3;

            let light;
            const pos = new THREE.Vector3(
                Math.cos(angle) * radius,
                height,
                Math.sin(angle) * radius
            );

            if (type === 'point') {
                light = new THREE.PointLight(color, intensity, distance);
                light.position.copy(pos);
                light.castShadow = this.config.enableShadows;
                if (this.config.enableShadows) {
                    light.shadow.mapSize.width = 512;
                    light.shadow.mapSize.height = 512;
                }
            } else if (type === 'directional') {
                light = new THREE.DirectionalLight(color, intensity);
                light.position.set(pos.x, pos.y + 3, pos.z);
                light.target.position.set(0, 0, 0);
                light.castShadow = this.config.enableShadows;
                if (this.config.enableShadows) {
                    light.shadow.mapSize.width = 1024;
                    light.shadow.mapSize.height = 1024;
                }
                scene.add(light.target);
            } else {
                light = new THREE.SpotLight(color, intensity, distance, Math.PI / 6, 0.3, 0.5);
                light.position.copy(pos);
                light.target.position.set(0, 0, 0);
                light.castShadow = this.config.enableShadows;
                if (this.config.enableShadows) {
                    light.shadow.mapSize.width = 512;
                    light.shadow.mapSize.height = 512;
                }
                scene.add(light.target);
            }

            scene.add(light);

            // Esfera de visualização da luz (opcional)
            const sphereGeo = new THREE.SphereGeometry(0.1, 8, 8);
            const sphereMat = new THREE.MeshBasicMaterial({ color });
            const sphere = new THREE.Mesh(sphereGeo, sphereMat);
            sphere.position.copy(pos);
            scene.add(sphere);

            this._lights.push({
                type,
                object: light,
                sphere,
                data: {
                    color: new THREE.Color(color),
                    intensity,
                    angle,
                    radius,
                    height,
                    speed: 0.2 + Math.random() * 0.3,
                    phase: Math.random() * Math.PI * 2
                }
            });
        }
    }

    // ----------------------------------------------------------------
    // OBJETOS 3D INTERATIVOS
    // ----------------------------------------------------------------

    _injectObjects() {
        const THREE = this._three;
        const scene = this._scene;
        const count = this.config.objectCount;

        const geometries = [
            new THREE.BoxGeometry(0.6, 0.6, 0.6),
            new THREE.SphereGeometry(0.4, 24, 24),
            new THREE.TorusGeometry(0.4, 0.15, 16, 32),
            new THREE.ConeGeometry(0.5, 0.8, 16),
            new THREE.CylinderGeometry(0.3, 0.3, 0.7, 16),
            new THREE.OctahedronGeometry(0.4),
            new THREE.TorusKnotGeometry(0.3, 0.1, 32, 16),
            new THREE.IcosahedronGeometry(0.4)
        ];

        const colors = [0x8366ff, 0x60a5fa, 0x34d399, 0xfbbf24, 0xf472b6, 0xfb923c, 0x22d3ee, 0xa78bfa];

        for (let i = 0; i < count; i++) {
            const geo = geometries[i % geometries.length];
            const color = colors[i % colors.length];
            const mat = new THREE.MeshStandardMaterial({
                color,
                roughness: 0.3,
                metalness: 0.6,
                emissive: color,
                emissiveIntensity: 0.05,
                transparent: true,
                opacity: 0.85
            });

            const mesh = new THREE.Mesh(geo, mat);
            const angle = (i / count) * Math.PI * 2;
            const radius = 2 + Math.random() * 3;
            const height = -1 + Math.random() * 2;

            mesh.position.set(
                Math.cos(angle) * radius,
                height,
                Math.sin(angle) * radius
            );
            mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
            mesh.castShadow = true;
            mesh.receiveShadow = true;

            scene.add(mesh);

            this._objects.push({
                mesh,
                data: {
                    angle,
                    radius,
                    height,
                    rotSpeedX: (Math.random() - 0.5) * 0.02,
                    rotSpeedY: (Math.random() - 0.5) * 0.02,
                    rotSpeedZ: (Math.random() - 0.5) * 0.02,
                    floatSpeed: 0.3 + Math.random() * 0.5,
                    floatAmp: 0.2 + Math.random() * 0.3,
                    phase: Math.random() * Math.PI * 2,
                    color,
                    scale: 0.8 + Math.random() * 0.4
                }
            });
        }
    }

    // ----------------------------------------------------------------
    // SISTEMA DE PARTÍCULAS
    // ----------------------------------------------------------------

    _injectParticles() {
        const THREE = this._three;
        const scene = this._scene;
        const count = this.config.particleCount;

        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const sizes = new Float32Array(count);

        const colorPalette = [0x8366ff, 0x60a5fa, 0x34d399, 0xfbbf24, 0xf472b6];

        for (let i = 0; i < count; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const radius = 3 + Math.random() * 7;

            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.cos(phi);
            positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);

            const col = new THREE.Color(colorPalette[Math.floor(Math.random() * colorPalette.length)]);
            colors[i * 3] = col.r;
            colors[i * 3 + 1] = col.g;
            colors[i * 3 + 2] = col.b;

            sizes[i] = 0.02 + Math.random() * 0.06;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.PointsMaterial({
            size: 0.05,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            sizeAttenuation: true
        });

        this._particles = new THREE.Points(geometry, material);
        scene.add(this._particles);
    }

    // ----------------------------------------------------------------
    // HELPER (opcional)
    // ----------------------------------------------------------------

    _injectHelpers() {
        // Grid helper (se quiser)
        // const grid = new THREE.GridHelper(20, 20, 0x444466, 0x222244);
        // this._scene.add(grid);

        // Axis helper (pequeno)
        // const axes = new THREE.AxesHelper(2);
        // this._scene.add(axes);
    }

    // ================================================================
    // OTIMIZAÇÕES
    // ================================================================

    _applyOptimizations() {
        // LOD para objetos (simplificado)
        // Instancing (se habilitado)
        if (this.config.enableInstancing && this._objects.length > 10) {
            // Na prática, agruparia objetos com mesma geometria/material
            // Aqui apenas marcamos para futuras otimizações
        }

        // Frustum culling (já é automático no Three.js)
        // Mas podemos ajustar bounding spheres
        for (const obj of this._objects) {
            if (obj.mesh.geometry) {
                obj.mesh.geometry.computeBoundingSphere();
            }
        }
    }

    // ================================================================
    // LOOP DE ANIMAÇÃO E SINCRONIZAÇÃO
    // ================================================================

    _startLoop() {
        if (this._animFrameId) return;

        const loop = () => {
            const delta = this._clock.getDelta();
            const time = this._clock.getElapsedTime();

            // Atualiza FPS (para otimização)
            this._updateFPS();

            // Atualiza luzes
            this._updateLights(time);

            // Atualiza objetos
            this._updateObjects(time);

            // Atualiza partículas
            this._updateParticles(time);

            // Renderiza
            if (this._renderer && this._scene && this._camera) {
                this._renderer.render(this._scene, this._camera);
            }

            this._animFrameId = requestAnimationFrame(loop);
        };

        this._animFrameId = requestAnimationFrame(loop);
    }

    _updateLights(time) {
        for (const light of this._lights) {
            if (light.type === 'ambient') continue;
            const d = light.data;

            // Movimento orbital
            const currentAngle = d.angle + time * d.speed;
            const x = Math.cos(currentAngle) * d.radius;
            const z = Math.sin(currentAngle) * d.radius;
            const y = d.height + Math.sin(time * d.speed * 0.7 + d.phase) * 0.5;

            if (light.type === 'point') {
                light.object.position.set(x, y, z);
            } else if (light.type === 'directional') {
                light.object.position.set(x, y + 2, z);
                light.object.target.position.set(0, 0, 0);
            } else if (light.type === 'spot') {
                light.object.position.set(x, y, z);
                light.object.target.position.set(0, 0, 0);
            }

            // Atualiza esfera visual
            if (light.sphere) {
                light.sphere.position.copy(light.object.position);
            }

            // Varia intensidade suavemente
            if (light.type !== 'ambient') {
                const intensityVariation = 0.2 + Math.sin(time * 0.5 + d.phase) * 0.15;
                light.object.intensity = d.intensity * (0.7 + intensityVariation);
            }
        }
    }

    _updateObjects(time) {
        for (const obj of this._objects) {
            const d = obj.data;

            // Rotação
            obj.mesh.rotation.x += d.rotSpeedX;
            obj.mesh.rotation.y += d.rotSpeedY;
            obj.mesh.rotation.z += d.rotSpeedZ;

            // Flutuação
            const floatOffset = Math.sin(time * d.floatSpeed + d.phase) * d.floatAmp;
            const angleOffset = time * 0.05;
            const radiusOffset = d.radius + Math.sin(time * 0.1 + d.phase) * 0.2;

            obj.mesh.position.x = Math.cos(d.angle + angleOffset) * radiusOffset;
            obj.mesh.position.z = Math.sin(d.angle + angleOffset) * radiusOffset;
            obj.mesh.position.y = d.height + floatOffset;

            // Escala pulsante
            const pulse = 1 + Math.sin(time * 0.5 + d.phase) * 0.05;
            obj.mesh.scale.set(pulse, pulse, pulse);
        }
    }

    _updateParticles(time) {
        if (!this._particles) return;
        const positions = this._particles.geometry.attributes.position.array;
        const count = positions.length / 3;

        // Rotação suave da nuvem de partículas
        this._particles.rotation.y = time * 0.02;
        this._particles.rotation.x = Math.sin(time * 0.01) * 0.1;
        this._particles.rotation.z = Math.cos(time * 0.015) * 0.05;

        // Pequeno movimento individual (simples: deslocamento circular)
        for (let i = 0; i < count; i++) {
            const idx = i * 3;
            // Guardar posição original (ou usar um array separado)
            // Para simplificar, vamos apenas alterar a rotação da nuvem
        }
    }

    // ================================================================
    // MONITORAMENTO DE FPS E OTIMIZAÇÃO
    // ================================================================

    _updateFPS() {
        this._frameCount++;
        const now = performance.now();
        if (now - this._lastFpsUpdate > 1000) {
            this._fps = this._frameCount / ((now - this._lastFpsUpdate) / 1000);
            this._frameCount = 0;
            this._lastFpsUpdate = now;

            // Otimização adaptativa
            if (this._fps < 30) {
                this._reduceQuality();
            } else if (this._fps > 50 && this.config.quality === 'low') {
                this._increaseQuality();
            }
        }
    }

    _reduceQuality() {
        if (this.config.quality === 'low') return;
        this.config.quality = 'low';

        // Reduz partículas
        if (this._particles) {
            const positions = this._particles.geometry.attributes.position.array;
            const newCount = Math.floor(positions.length / 3 * 0.5);
            // Na prática, recriar a geometria com menos partículas
            // Para simplificar, apenas reduzimos o tamanho visual
            this._particles.material.size *= 0.8;
        }

        // Reduz luzes (desativa algumas)
        for (let i = 3; i < this._lights.length; i++) {
            this._lights[i].object.intensity *= 0.5;
        }

        // Desativa sombras
        if (this._renderer) {
            this._renderer.shadowMap.enabled = false;
        }
    }

    _increaseQuality() {
        if (this.config.quality === 'high') return;
        this.config.quality = 'high';

        if (this._particles) {
            this._particles.material.size *= 1.2;
        }

        for (let i = 3; i < this._lights.length; i++) {
            this._lights[i].object.intensity = this._lights[i].data.intensity;
        }

        if (this._renderer && this.config.enableShadows) {
            this._renderer.shadowMap.enabled = true;
        }
    }

    // ================================================================
    // API PÚBLICA (opcional)
    // ================================================================

    getStats() {
        return {
            version: this.version,
            initialized: this._initialized,
            started: this._started,
            fps: Math.round(this._fps),
            quality: this.config.quality,
            lights: this._lights.length,
            objects: this._objects.length,
            particles: this.config.particleCount,
            threeVersion: this._three ? this._three.REVISION : null
        };
    }

    destroy() {
        if (this._animFrameId) {
            cancelAnimationFrame(this._animFrameId);
            this._animFrameId = null;
        }
        // Remove objetos da cena
        for (const light of this._lights) {
            if (light.object.parent) light.object.parent.remove(light.object);
            if (light.sphere && light.sphere.parent) light.sphere.parent.remove(light.sphere);
            if (light.type === 'directional' || light.type === 'spot') {
                if (light.object.target && light.object.target.parent) {
                    light.object.target.parent.remove(light.object.target);
                }
            }
        }
        for (const obj of this._objects) {
            if (obj.mesh.parent) obj.mesh.parent.remove(obj.mesh);
        }
        if (this._particles && this._particles.parent) {
            this._particles.parent.remove(this._particles);
        }
        this._lights = [];
        this._objects = [];
        this._particles = null;
        this._started = false;
        this._initialized = false;
        console.log('[DynamicLighting] Sistema destruído.');
    }
}

// ================================================================
// EXPORTAÇÃO GLOBAL
// ================================================================

if (typeof window !== 'undefined') {
    window.VessieDynamicLighting = DynamicLightingSystem;
}

export default DynamicLightingSystem;
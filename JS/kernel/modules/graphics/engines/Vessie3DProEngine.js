/**
 * Vessie3DProEngine
 * Motor gráfico avançado e unificado para o VessieOS.
 * Integra renderização, iluminação dinâmica, pós-processamento, partículas e otimização.
 */
class Vessie3DProEngine {
    constructor() {
        this.version = '3.0.0';
        this.THREE = null;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.composer = null;
        this.clock = null;
        this.assets = { geometries: {}, materials: {}, textures: {} };
        this.objects = new Map();
        this.lights = new Map();
        this.particles = new Map();
        this.effects = {};
        this._animFrameId = null;
        this._started = false;
        this._fps = 60;
        this._frameCount = 0;
        this._lastFpsUpdate = 0;
        this._quality = 'high';
        this.config = {
            shadows: true,
            motionBlur: true,
            adaptivePerformance: true,
            maxFPS: 60
        };
        this._autoInit();
    }

    // ================================================================
    // 1. INICIALIZAÇÃO E CONFIGURAÇÃO (8 Funções)
    // ================================================================
    _autoInit() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        if (this._started || typeof window.THREE === 'undefined') return;
        this.THREE = window.THREE;
        this.clock = new this.THREE.Clock();
        this._setupScene();
        this._setupCamera();
        this._setupRenderer();
        this._setupPostProcessing();
        this._setupEventListeners();
        this._startRenderLoop();
        this._started = true;
        console.log(`[Vessie3DPro] Engine v${this.version} inicializada.`);
    }

    _setupScene() {
        this.scene = new this.THREE.Scene();
        this.scene.background = null;
        this.scene.fog = new this.THREE.FogExp2(0x05050a, 0.015);
    }

    _setupCamera() {
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new this.THREE.PerspectiveCamera(60, aspect, 0.1, 1000);
        this.camera.position.set(0, 5, 10);
        this.camera.lookAt(0, 0, 0);
    }

    _setupRenderer() {
        this.renderer = new this.THREE.WebGLRenderer({
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance'
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setClearColor(0x000000, 0);
        this.renderer.shadowMap.enabled = this.config.shadows;
        this.renderer.shadowMap.type = this.THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = this.THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.renderer.domElement.setAttribute('aria-hidden', 'true');
        this.renderer.domElement.style.cssText += ';position:fixed;inset:0;z-index:0;pointer-events:none';
        document.body.appendChild(this.renderer.domElement);
    }

    _setupEventListeners() {
        window.addEventListener('resize', () => this._onWindowResize());
    }

    _onWindowResize() {
        const w = window.innerWidth, h = window.innerHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h);
        if (this.composer) this.composer.setSize(w, h);
    }

    destroy() {
        this.stopRenderLoop();
        this.objects.forEach(obj => this.disposeObject(obj));
        this.lights.forEach(light => this.scene.remove(light));
        this.renderer.dispose();
        if (this.renderer.domElement.parentNode) {
            this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
        this._started = false;
        console.log('[Vessie3DPro] Engine destruída.');
    }

    // ================================================================
    // 2. LOOP DE RENDERIZAÇÃO E PERFORMANCE (7 Funções)
    // ================================================================
    _startRenderLoop() {
        const loop = () => {
            this._animFrameId = requestAnimationFrame(loop);
            const delta = this.clock.getDelta();
            const time = this.clock.getElapsedTime();

            this._updateFPS();
            this._updateObjects(delta, time);
            this._updateLights(time);
            this._updateParticles(time);

            if (this.composer) this.composer.render();
            else this.renderer.render(this.scene, this.camera);
        };
        this._animFrameId = requestAnimationFrame(loop);
    }

    stopRenderLoop() {
        if (this._animFrameId) cancelAnimationFrame(this._animFrameId);
        this._animFrameId = null;
    }

    _updateFPS() {
        this._frameCount++;
        const now = performance.now();
        if (now - this._lastFpsUpdate > 1000) {
            this._fps = this._frameCount;
            this._frameCount = 0;
            this._lastFpsUpdate = now;
            if (this.config.adaptivePerformance) this._adaptPerformance();
        }
    }

    _adaptPerformance() {
        if (this._fps < 30 && this._quality !== 'low') this.setQuality('low');
        else if (this._fps > 50 && this._quality === 'low') this.setQuality('high');
    }

    setQuality(level) {
        this._quality = level;
        if (level === 'low') {
            this.renderer.setPixelRatio(1);
            this.renderer.shadowMap.enabled = false;
            if (this.effects.motionBlur) this.effects.motionBlur.enabled = false;
        } else {
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.shadowMap.enabled = this.config.shadows;
            if (this.effects.motionBlur) this.effects.motionBlur.enabled = true;
        }
    }

    getStats() {
        return {
            fps: this._fps,
            quality: this._quality,
            objects: this.objects.size,
            lights: this.lights.size,
            particles: this.particles.size,
            triangles: this.renderer.info.render.triangles,
            drawCalls: this.renderer.info.render.calls
        };
    }

    // ================================================================
    // 3. GESTÃO DE CENA E CÂMERA (8 Funções)
    // ================================================================
    setBackgroundColor(hexColor) {
        this.scene.background = new this.THREE.Color(hexColor);
        if (this.scene.fog) this.scene.fog.color = new this.THREE.Color(hexColor);
    }

    setFog(density, hexColor = 0x05050a) {
        this.scene.fog = new this.THREE.FogExp2(hexColor, density);
    }

    disableFog() { this.scene.fog = null; }

    moveCamera(x, y, z, lerpFactor = 0.1) {
        this.camera.position.x += (x - this.camera.position.x) * lerpFactor;
        this.camera.position.y += (y - this.camera.position.y) * lerpFactor;
        this.camera.position.z += (z - this.camera.position.z) * lerpFactor;
    }

    orbitCamera(angle, radius, height) {
        this.camera.position.x = Math.cos(angle) * radius;
        this.camera.position.z = Math.sin(angle) * radius;
        this.camera.position.y = height;
        this.camera.lookAt(0, 0, 0);
    }

    zoomCamera(distance) {
        this.camera.position.multiplyScalar(distance);
    }

    shakeCamera(intensity, duration) {
        const start = performance.now();
        const originalPos = this.camera.position.clone();
        const shake = () => {
            const elapsed = performance.now() - start;
            if (elapsed < duration) {
                this.camera.position.x = originalPos.x + (Math.random() - 0.5) * intensity;
                this.camera.position.y = originalPos.y + (Math.random() - 0.5) * intensity;
                requestAnimationFrame(shake);
            } else {
                this.camera.position.copy(originalPos);
            }
        };
        shake();
    }

    resetCamera() {
        this.camera.position.set(0, 5, 10);
        this.camera.lookAt(0, 0, 0);
    }

    // ================================================================
    // 4. CRIAÇÃO E GESTÃO DE OBJETOS (13 Funções)
    // ================================================================
    createBox(id, size, color, pos = [0, 0, 0]) {
        const geo = new this.THREE.BoxGeometry(size, size, size);
        const mat = new this.THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.6 });
        return this._registerMesh(id, geo, mat, pos);
    }

    createSphere(id, radius, color, pos = [0, 0, 0]) {
        const geo = new this.THREE.SphereGeometry(radius, 32, 32);
        const mat = new this.THREE.MeshStandardMaterial({ color, roughness: 0.2, metalness: 0.8 });
        return this._registerMesh(id, geo, mat, pos);
    }

    createPlane(id, width, height, color, pos = [0, 0, 0]) {
        const geo = new this.THREE.PlaneGeometry(width, height);
        const mat = new this.THREE.MeshStandardMaterial({ color, side: this.THREE.DoubleSide });
        const mesh = this._registerMesh(id, geo, mat, pos);
        mesh.rotation.x = -Math.PI / 2;
        return mesh;
    }

    createTorus(id, radius, tube, color, pos = [0, 0, 0]) {
        const geo = new this.THREE.TorusGeometry(radius, tube, 16, 100);
        const mat = new this.THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.7 });
        return this._registerMesh(id, geo, mat, pos);
    }

    _registerMesh(id, geo, mat, pos) {
        const mesh = new this.THREE.Mesh(geo, mat);
        mesh.position.set(...pos);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        this.objects.set(id, { mesh, type: 'object', data: { rotSpeed: { x: 0, y: 0, z: 0 }, floatAmp: 0 } });
        return mesh;
    }

    moveObject(id, x, y, z) {
        const obj = this.objects.get(id);
        if (obj) obj.mesh.position.set(x, y, z);
    }

    rotateObject(id, x, y, z) {
        const obj = this.objects.get(id);
        if (obj) obj.mesh.rotation.set(x, y, z);
    }

    scaleObject(id, x, y, z) {
        const obj = this.objects.get(id);
        if (obj) obj.mesh.scale.set(x, y, z);
    }

    setObjectColor(id, hexColor) {
        const obj = this.objects.get(id);
        if (obj) obj.mesh.material.color.setHex(hexColor);
    }

    setObjectTexture(id, textureUrl) {
        const obj = this.objects.get(id);
        if (obj) {
            new this.THREE.TextureLoader().load(textureUrl, (tex) => {
                obj.mesh.material.map = tex;
                obj.mesh.material.needsUpdate = true;
            });
        }
    }

    setObjectAnimation(id, rotSpeed = { x: 0, y: 0, z: 0 }, floatAmp = 0) {
        const obj = this.objects.get(id);
        if (obj) {
            obj.data.rotSpeed = rotSpeed;
            obj.data.floatAmp = floatAmp;
            obj.data.originalY = obj.mesh.position.y;
        }
    }

    hideObject(id) {
        const obj = this.objects.get(id);
        if (obj) obj.mesh.visible = false;
    }

    showObject(id) {
        const obj = this.objects.get(id);
        if (obj) obj.mesh.visible = true;
    }

    removeObject(id) {
        const obj = this.objects.get(id);
        if (obj) {
            this.scene.remove(obj.mesh);
            this.disposeObject(obj);
            this.objects.delete(id);
        }
    }

    disposeObject(obj) {
        if (obj.mesh.geometry) obj.mesh.geometry.dispose();
        if (obj.mesh.material) {
            if (Array.isArray(obj.mesh.material)) obj.mesh.material.forEach(m => m.dispose());
            else obj.mesh.material.dispose();
        }
    }

    // ================================================================
    // 5. ILUMINAÇÃO E SOMBRAS (10 Funções)
    // ================================================================
    addAmbientLight(id, color, intensity) {
        const light = new this.THREE.AmbientLight(color, intensity);
        this.scene.add(light);
        this.lights.set(id, light);
        return light;
    }

    addDirectionalLight(id, color, intensity, pos = [10, 10, 10]) {
        const light = new this.THREE.DirectionalLight(color, intensity);
        light.position.set(...pos);
        light.castShadow = true;
        light.shadow.mapSize.width = 2048;
        light.shadow.mapSize.height = 2048;
        this.scene.add(light);
        this.lights.set(id, light);
        return light;
    }

    addPointLight(id, color, intensity, pos = [0, 5, 0], distance = 20) {
        const light = new this.THREE.PointLight(color, intensity, distance);
        light.position.set(...pos);
        light.castShadow = true;
        this.scene.add(light);
        this.lights.set(id, light);
        return light;
    }

    addSpotLight(id, color, intensity, pos = [0, 10, 0], target = [0, 0, 0], angle = Math.PI / 6) {
        const light = new this.THREE.SpotLight(color, intensity, 50, angle, 0.4, 1);
        light.position.set(...pos);
        light.target.position.set(...target);
        light.castShadow = true;
        this.scene.add(light);
        this.scene.add(light.target);
        this.lights.set(id, light);
        return light;
    }

    setLightColor(id, hexColor) {
        const light = this.lights.get(id);
        if (light) light.color.setHex(hexColor);
    }

    setLightIntensity(id, intensity) {
        const light = this.lights.get(id);
        if (light) light.intensity = intensity;
    }

    moveLight(id, x, y, z) {
        const light = this.lights.get(id);
        if (light) light.position.set(x, y, z);
    }

    toggleShadows(enabled) {
        this.renderer.shadowMap.enabled = enabled;
        this.scene.traverse(obj => {
            if (obj.isMesh) obj.castShadow = enabled;
        });
    }

    setShadowMapSize(size) {
        this.lights.forEach(light => {
            if (light.shadow) {
                light.shadow.mapSize.width = size;
                light.shadow.mapSize.height = size;
                light.shadow.map?.dispose();
                light.shadow.map = null;
            }
        });
    }

    removeLight(id) {
        const light = this.lights.get(id);
        if (light) {
            this.scene.remove(light);
            this.lights.delete(id);
        }
    }

    // ================================================================
    // 6. PÓS-PROCESSAMENTO E EFEITOS VISUAIS (9 Funções)
    // ================================================================
    _setupPostProcessing() {
        if (!this.THREE.EffectComposer) return;
        this.composer = new this.THREE.EffectComposer(this.renderer);

        const renderPass = new this.THREE.RenderPass(this.scene, this.camera);
        this.composer.addPass(renderPass);

        if (this.THREE.AfterimagePass) {
            this.effects.motionBlur = new this.THREE.AfterimagePass(0.5);
            this.composer.addPass(this.effects.motionBlur);
        }

        if (this.THREE.UnrealBloomPass) {
            this.effects.bloom = new this.THREE.UnrealBloomPass(new this.THREE.Vector2(window.innerWidth, window.innerHeight), 0.8, 0.4, 0.85);
            this.composer.addPass(this.effects.bloom);
        }
    }

    enableMotionBlur(intensity = 0.5) {
        if (this.effects.motionBlur) {
            this.effects.motionBlur.enabled = true;
            this.effects.motionBlur.uniforms.damp.value = intensity;
        }
    }

    disableMotionBlur() {
        if (this.effects.motionBlur) this.effects.motionBlur.enabled = false;
    }

    enableBloom(strength = 0.8, radius = 0.4, threshold = 0.85) {
        if (this.effects.bloom) {
            this.effects.bloom.enabled = true;
            this.effects.bloom.strength = strength;
            this.effects.bloom.radius = radius;
            this.effects.bloom.threshold = threshold;
        }
    }

    disableBloom() {
        if (this.effects.bloom) this.effects.bloom.enabled = false;
    }

    setToneMapping(exposure = 1.2) {
        this.renderer.toneMappingExposure = exposure;
    }

    setEnvironmentMap(textureUrl) {
        new this.THREE.TextureLoader().load(textureUrl, (tex) => {
            tex.mapping = this.THREE.EquirectangularReflectionMapping;
            this.scene.environment = tex;
        });
    }

    addVignetteEffect() {
        // Implementação simplificada usando shader pass (requer ShaderPass)
        // Assumindo que THREE.ShaderPass está disponível no ambiente global
    }

    setGrainEffect(amount = 0.05) {
        // Implementação de ruído de filme
    }

    // ================================================================
    // 7. SISTEMA DE PARTÍCULAS (8 Funções)
    // ================================================================
    createParticleSystem(id, count, color, size = 0.1, spread = 10) {
        const geo = new this.THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count * 3; i++) {
            positions[i] = (Math.random() - 0.5) * spread;
        }
        geo.setAttribute('position', new this.THREE.BufferAttribute(positions, 3));

        const mat = new this.THREE.PointsMaterial({ color, size, transparent: true, opacity: 0.8, blending: this.THREE.AdditiveBlending });
        const points = new this.THREE.Points(geo, mat);
        this.scene.add(points);
        this.particles.set(id, { points, data: { rotSpeed: 0.01 } });
        return points;
    }

    setParticleColor(id, hexColor) {
        const p = this.particles.get(id);
        if (p) p.points.material.color.setHex(hexColor);
    }

    setParticleSize(id, size) {
        const p = this.particles.get(id);
        if (p) p.points.material.size = size;
    }

    animateParticles(id, rotSpeed = 0.01) {
        const p = this.particles.get(id);
        if (p) p.data.rotSpeed = rotSpeed;
    }

    emitParticles(id, origin, count) {
        // Lógica para emitir partículas de um ponto específico (burst)
        const p = this.particles.get(id);
        if (p) {
            const positions = p.points.geometry.attributes.position.array;
            for (let i = 0; i < count; i++) {
                positions[i * 3] = origin.x;
                positions[i * 3 + 1] = origin.y;
                positions[i * 3 + 2] = origin.z;
            }
            p.points.geometry.attributes.position.needsUpdate = true;
        }
    }

    createRainEffect(id) {
        return this.createParticleSystem(id, 5000, 0xaaaaaa, 0.05, 50);
    }

    createSnowEffect(id) {
        return this.createParticleSystem(id, 3000, 0xffffff, 0.1, 30);
    }

    removeParticleSystem(id) {
        const p = this.particles.get(id);
        if (p) {
            this.scene.remove(p.points);
            p.points.geometry.dispose();
            p.points.material.dispose();
            this.particles.delete(id);
        }
    }

    // ================================================================
    // 8. OTIMIZAÇÃO E UTILITÁRIOS (8 Funções)
    // ================================================================
    enableFrustumCulling() {
        this.scene.traverse(obj => {
            if (obj.isMesh) obj.frustumCulled = true;
        });
    }

    disableFrustumCulling() {
        this.scene.traverse(obj => {
            if (obj.isMesh) obj.frustumCulled = false;
        });
    }

    addLODToObject(id, levels) {
        // levels: [{ distance: 10, geometry: new THREE.Geometry() }, ...]
        const obj = this.objects.get(id);
        if (obj) {
            const lod = new this.THREE.LOD();
            levels.forEach(level => lod.addLevel(new this.THREE.Mesh(level.geometry, obj.mesh.material), level.distance));
            this.scene.remove(obj.mesh);
            this.scene.add(lod);
            obj.mesh = lod;
        }
    }

    batchObjectsByMaterial() {
        // Utiliza BufferGeometryUtils.mergeGeometries (se disponível) para unir meshes estáticos
        console.log('[Vessie3DPro] Batching não implementado nesta versão lite.');
    }

    clearScene() {
        this.objects.forEach((obj, id) => this.removeObject(id));
        this.lights.forEach((light, id) => this.removeLight(id));
        this.particles.forEach((p, id) => this.removeParticleSystem(id));
    }

    takeScreenshot() {
        return this.renderer.domElement.toDataURL('image/png');
    }

    setMaxFPS(fps) {
        this.config.maxFPS = fps;
    }

    // ================================================================
    // 9. MÉTODOS INTERNOS DE ATUALIZAÇÃO (5 Funções)
    // ================================================================
    _updateObjects(delta, time) {
        this.objects.forEach(obj => {
            if (obj.data.rotSpeed) {
                obj.mesh.rotation.x += obj.data.rotSpeed.x * delta;
                obj.mesh.rotation.y += obj.data.rotSpeed.y * delta;
                obj.mesh.rotation.z += obj.data.rotSpeed.z * delta;
            }
            if (obj.data.floatAmp) {
                obj.mesh.position.y = obj.data.originalY + Math.sin(time * 1.5) * obj.data.floatAmp;
            }
        });
    }

    _updateLights(time) {
        // Animação de luzes dinâmicas (se habilitado no futuro)
    }

    _updateParticles(time) {
        this.particles.forEach(p => {
            if (p.data.rotSpeed) {
                p.points.rotation.y = time * p.data.rotSpeed;
            }
        });
    }

    // Método para pausar o loop se a aba não estiver visível
    _handleVisibilityChange() {
        if (document.hidden) {
            this.stopRenderLoop();
        } else {
            this._startRenderLoop();
        }
    }
}

// Registra no escopo global do VessieOS
if (typeof window !== 'undefined') {
    if (!window.Vessie3DPro || typeof window.Vessie3DPro._handleVisibilityChange !== 'function') {
        window.Vessie3DPro = new Vessie3DProEngine();
    }
    if (window.Vessie3DPro && typeof window.Vessie3DPro._handleVisibilityChange === 'function') {
        document.addEventListener('visibilitychange', () => window.Vessie3DPro._handleVisibilityChange());
    }
}
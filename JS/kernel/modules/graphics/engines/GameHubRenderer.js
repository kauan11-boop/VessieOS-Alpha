/**
 * GameHubRenderer – Fundo 3D em Three.js para o Game Hub / Steam Hub.
 *
 * Antes desta melhoria, o Game Hub (EnhancedGameHub / gamehub/index.js)
 * era puramente iframes 2D sobre um painel de vidro. Este motor monta uma
 * cena Three.js real por trás da lista de jogos:
 *
 *   - Campo de partículas volumétrico (nebulosa) com paralaxe pelo mouse
 *   - Anel/icosaedro central com wireframe pulsante que reage ao jogo
 *     em destaque (cor de acento muda conforme `accentColor` do jogo)
 *   - Iluminação pontual dinâmica (glow) sincronizada com hover/seleção
 *   - Respeita `prefers-reduced-motion` e o PerformanceManager do kernel
 *     (reduz contagem de partículas e desliga pós-processamento em modos
 *     LOW/POWER_SAVING)
 *
 * Usa `window.THREE` (carregado via CDN como script clássico — ver
 * `JS/systems/desktop/main.js` e os `<script>` no HTML). Não importa
 * "three" como módulo bare para não depender de import maps.
 */
export default class GameHubRenderer {
    constructor({ performanceManager } = {}) {
        this.performanceManager = performanceManager || null;
        this.THREE = (typeof window !== 'undefined') ? window.THREE : null;
        this.canvas = null;
        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.particles = null;
        this.core = null;
        this.pointLight = null;
        this.raf = null;
        this.mounted = false;
        this._mouse = { x: 0, y: 0 };
        this._reducedMotion = typeof matchMedia === 'function' &&
            matchMedia('(prefers-reduced-motion: reduce)').matches;

        this._onMouseMove = this._onMouseMove.bind(this);
        this._onResize = this._onResize.bind(this);
        this._tick = this._tick.bind(this);
    }

    _particleCount() {
        const quality = (typeof this.performanceManager?.getQuality === 'function')
            ? this.performanceManager.getQuality()
            : null;
        if (!quality) return 900;
        if (quality.effects >= 0.8) return 1400;
        if (quality.effects >= 0.5) return 900;
        if (quality.effects >= 0.3) return 400;
        return 150;
    }

    /**
     * Monta a cena no <canvas> informado (criado pela UI do Game Hub).
     * @param {HTMLCanvasElement} canvas
     * @param {{accentColor?: string}} options
     */
    mount(canvas, options = {}) {
        if (!this.THREE) {
            console.warn('[GameHubRenderer] THREE.js não está disponível globalmente — pulando fundo 3D.');
            return false;
        }
        if (this.mounted) this.unmount();

        const THREE = this.THREE;
        this.canvas = canvas;
        const width = canvas.clientWidth || canvas.parentElement?.clientWidth || 800;
        const height = canvas.clientHeight || canvas.parentElement?.clientHeight || 500;

        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.setSize(width, height, false);

        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x0a0a16, 0.06);

        this.camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 100);
        this.camera.position.set(0, 0, 8);

        // --- Iluminação ---
        const ambient = new THREE.AmbientLight(0x8866ff, 0.4);
        this.scene.add(ambient);
        this.pointLight = new THREE.PointLight(this._accentToHex(options.accentColor), 2.2, 20, 2);
        this.pointLight.position.set(2, 2, 4);
        this.scene.add(this.pointLight);

        // --- Núcleo geométrico central (representa o jogo em destaque) ---
        const coreGeo = new THREE.IcosahedronGeometry(1.6, 1);
        const coreMat = new THREE.MeshStandardMaterial({
            color: this._accentToHex(options.accentColor),
            wireframe: true,
            emissive: this._accentToHex(options.accentColor),
            emissiveIntensity: 0.5,
            roughness: 0.3,
            metalness: 0.7
        });
        this.core = new THREE.Mesh(coreGeo, coreMat);
        this.scene.add(this.core);

        // --- Campo de partículas (nebulosa) ---
        const count = this._particleCount();
        const positions = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const radius = 6 + Math.random() * 14;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos((Math.random() * 2) - 1);
            positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = radius * Math.cos(phi) - 5;
        }
        const particleGeo = new THREE.BufferGeometry();
        particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const particleMat = new THREE.PointsMaterial({
            size: 0.035,
            color: 0xa78bfa,
            transparent: true,
            opacity: 0.75,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        this.particles = new THREE.Points(particleGeo, particleMat);
        this.scene.add(this.particles);

        window.addEventListener('mousemove', this._onMouseMove, { passive: true });
        window.addEventListener('resize', this._onResize);

        this.mounted = true;
        this._clock = new THREE.Clock();
        if (!this._reducedMotion) {
            this._tick();
        } else {
            this.renderer.render(this.scene, this.camera); // frame estático apenas
        }
        return true;
    }

    /** Troca a cor de acento (chamado ao trocar de jogo em destaque). */
    setAccentColor(hexOrCssColor) {
        if (!this.mounted) return;
        const hex = this._accentToHex(hexOrCssColor);
        this.core.material.color.setHex(hex);
        this.core.material.emissive.setHex(hex);
        this.pointLight.color.setHex(hex);
    }

    /** Pulso rápido ao passar o mouse sobre um card de jogo. */
    pulse() {
        if (!this.mounted || !this.core) return;
        this._pulseUntil = performance.now() + 350;
    }

    _accentToHex(color) {
        if (!color) return 0xa78bfa;
        if (typeof color === 'number') return color;
        const THREE = this.THREE;
        try {
            return new THREE.Color(color).getHex();
        } catch (e) {
            return 0xa78bfa;
        }
    }

    _onMouseMove(e) {
        this._mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        this._mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    }

    _onResize() {
        if (!this.mounted || !this.canvas) return;
        const width = this.canvas.clientWidth || this.canvas.parentElement?.clientWidth || 800;
        const height = this.canvas.clientHeight || this.canvas.parentElement?.clientHeight || 500;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height, false);
    }

    _tick() {
        if (!this.mounted) return;
        const t = this._clock.getElapsedTime();

        // Paralaxe suave de câmera pelo mouse
        this.camera.position.x += (this._mouse.x * 1.2 - this.camera.position.x) * 0.04;
        this.camera.position.y += (this._mouse.y * 0.8 - this.camera.position.y) * 0.04;
        this.camera.lookAt(0, 0, 0);

        // Rotação do núcleo + pulso de escala ao hover
        this.core.rotation.x = t * 0.15;
        this.core.rotation.y = t * 0.22;
        let scale = 1;
        if (this._pulseUntil && performance.now() < this._pulseUntil) {
            const remain = (this._pulseUntil - performance.now()) / 350;
            scale = 1 + Math.sin(remain * Math.PI) * 0.12;
        }
        this.core.scale.setScalar(scale);

        // Nebulosa girando lentamente
        this.particles.rotation.y = t * 0.02;

        // Luz pulsando suavemente
        this.pointLight.intensity = 2.0 + Math.sin(t * 1.5) * 0.4;

        this.renderer.render(this.scene, this.camera);
        this.raf = requestAnimationFrame(this._tick);
    }

    unmount() {
        if (this.raf) cancelAnimationFrame(this.raf);
        window.removeEventListener('mousemove', this._onMouseMove);
        window.removeEventListener('resize', this._onResize);
        if (this.renderer) {
            this.renderer.dispose();
        }
        this.scene = null;
        this.mounted = false;
    }
}

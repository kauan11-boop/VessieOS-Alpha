/**
 * Categoria: VISUAL (18 sistemas)
 * Efeitos gráficos aplicados ao desktop inteiro. A maioria alterna uma
 * classe CSS em <html> (ver CSS/systems/micro-systems.css para as regras);
 * alguns têm lógica própria (canvas de partículas, trilha do cursor,
 * paralaxe do papel de parede, ciclo de cor de destaque).
 */
export default function buildVisualSystems({ helpers }) {
    const { classToggleSystem, injectCSS } = helpers;

    const cssToggle = (id, name, description, className, target) => {
        const t = classToggleSystem({ id, className, target });
        return { id: `visual.${id}`, category: 'visual', name, description, enabledByDefault: false, enable: t.enable, disable: t.disable };
    };

    const systems = [];

    systems.push(cssToggle('crt', 'Modo CRT', 'Simula um monitor CRT antigo com scanlines e leve curvatura.', 'vsys-crt'));
    systems.push(cssToggle('film-grain', 'Grão de Filme', 'Adiciona uma textura sutil de grão sobre o desktop.', 'vsys-film-grain'));
    systems.push(cssToggle('vignette', 'Vinheta', 'Escurece levemente os cantos da tela para dar profundidade.', 'vsys-vignette'));
    systems.push(cssToggle('neon-boost', 'Neon Intensificado', 'Aumenta o brilho e o alcance dos glows neon da interface.', 'vsys-neon-boost'));
    systems.push(cssToggle('colorblind-safe', 'Paleta Daltônico-Segura', 'Ajusta cores de status (sucesso/erro/aviso) para maior distinção.', 'vsys-colorblind-safe'));
    systems.push(cssToggle('taskbar-blur-boost', 'Blur Extra na Taskbar', 'Aumenta o desfoque de fundo da barra de tarefas.', 'vsys-taskbar-blur-boost'));
    systems.push(cssToggle('window-shadow-depth', 'Sombras Profundas', 'Sombras mais pronunciadas nas janelas, reforçando a hierarquia visual.', 'vsys-window-shadow-depth'));
    systems.push(cssToggle('icon-glow', 'Ícones Brilhantes', 'Aplica um leve glow neon aos ícones da área de trabalho.', 'vsys-icon-glow'));
    systems.push(cssToggle('animated-gradient-bg', 'Gradiente Animado', 'Papel de parede com gradiente que se move lentamente.', 'vsys-animated-gradient-bg'));
    systems.push(cssToggle('holographic-shimmer', 'Brilho Holográfico', 'Reflexo iridescente sutil ao passar o mouse sobre painéis de vidro.', 'vsys-holographic-shimmer'));
    systems.push(cssToggle('chromatic-aberration', 'Aberração Cromática', 'Efeito sutil de separação de cores nas bordas das janelas em foco.', 'vsys-chromatic-aberration'));

    // --- Frost intensity: usa uma CSS var ajustável, não apenas uma classe ---
    systems.push({
        id: 'visual.frost-intensity',
        category: 'visual',
        name: 'Vidro Fosco Intenso',
        description: 'Aumenta a intensidade do efeito de vidro fosco (glassmorphism) em toda a UI.',
        enabledByDefault: false,
        enable() { document.documentElement.style.setProperty('--vsys-frost-blur', '28px'); },
        disable() { document.documentElement.style.removeProperty('--vsys-frost-blur'); }
    });

    // --- Cursor com trilha de partículas neon ---
    systems.push((function cursorTrail() {
        let handler = null;
        return {
            id: 'visual.cursor-trail', category: 'visual', name: 'Trilha do Cursor',
            description: 'Deixa um rastro luminoso de partículas seguindo o mouse.',
            enabledByDefault: false,
            enable() {
                let last = 0;
                handler = (e) => {
                    const now = performance.now();
                    if (now - last < 40) return; // limita taxa de criação
                    last = now;
                    const dot = document.createElement('div');
                    dot.className = 'vsys-cursor-trail-dot';
                    dot.style.left = e.clientX + 'px';
                    dot.style.top = e.clientY + 'px';
                    document.body.appendChild(dot);
                    setTimeout(() => dot.remove(), 600);
                };
                window.addEventListener('mousemove', handler, { passive: true });
            },
            disable() { if (handler) window.removeEventListener('mousemove', handler); }
        };
    })());

    // --- Anel de brilho seguindo o cursor ---
    systems.push((function cursorGlowRing() {
        let ring = null, handler = null;
        return {
            id: 'visual.cursor-glow-ring', category: 'visual', name: 'Anel de Luz do Cursor',
            description: 'Um anel neon suave acompanha o cursor pela tela.',
            enabledByDefault: false,
            enable() {
                ring = document.createElement('div');
                ring.className = 'vsys-cursor-glow-ring';
                document.body.appendChild(ring);
                handler = (e) => { ring.style.transform = `translate(${e.clientX - 14}px, ${e.clientY - 14}px)`; };
                window.addEventListener('mousemove', handler, { passive: true });
            },
            disable() {
                if (handler) window.removeEventListener('mousemove', handler);
                ring?.remove(); ring = null;
            }
        };
    })());

    // --- Overlay de partículas ambiente (canvas leve, respeita reduce-motion) ---
    systems.push((function particlesOverlay() {
        let canvas = null, ctx = null, raf = null, particles = [];
        const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const resize = () => { if (canvas) { canvas.width = innerWidth; canvas.height = innerHeight; } };
        const tick = () => {
            if (!ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (const p of particles) {
                p.y -= p.speed; if (p.y < -5) p.y = canvas.height + 5;
                ctx.globalAlpha = p.alpha;
                ctx.fillStyle = '#a78bfa';
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
            }
            raf = requestAnimationFrame(tick);
        };
        return {
            id: 'visual.particles-overlay', category: 'visual', name: 'Partículas Ambiente',
            description: 'Pequenas partículas flutuantes sobre o desktop, dando profundidade atmosférica.',
            enabledByDefault: false,
            enable() {
                if (reduced) return; // respeita a preferência do usuário
                canvas = document.createElement('canvas');
                canvas.className = 'vsys-particles-canvas';
                document.body.appendChild(canvas);
                ctx = canvas.getContext('2d');
                resize();
                particles = Array.from({ length: 60 }, () => ({
                    x: Math.random() * innerWidth, y: Math.random() * innerHeight,
                    r: 1 + Math.random() * 2, speed: 0.2 + Math.random() * 0.5, alpha: 0.15 + Math.random() * 0.3
                }));
                window.addEventListener('resize', resize);
                tick();
            },
            disable() {
                if (raf) cancelAnimationFrame(raf);
                window.removeEventListener('resize', resize);
                canvas?.remove(); canvas = null; ctx = null; particles = [];
            }
        };
    })());

    // --- Paralaxe do papel de parede pelo mouse ---
    systems.push((function parallaxWallpaper() {
        let handler = null;
        return {
            id: 'visual.parallax-wallpaper', category: 'visual', name: 'Paralaxe do Papel de Parede',
            description: 'O papel de parede se move sutilmente conforme o mouse, criando sensação de profundidade.',
            enabledByDefault: false,
            enable() {
                const desktop = document.getElementById('desktop') || document.body;
                handler = (e) => {
                    const x = (e.clientX / innerWidth - 0.5) * 10;
                    const y = (e.clientY / innerHeight - 0.5) * 10;
                    desktop.style.backgroundPosition = `calc(50% + ${x}px) calc(50% + ${y}px)`;
                };
                window.addEventListener('mousemove', handler, { passive: true });
            },
            disable() {
                if (handler) window.removeEventListener('mousemove', handler);
                const desktop = document.getElementById('desktop') || document.body;
                desktop.style.backgroundPosition = '';
            }
        };
    })());

    // --- Tema automático removido: VessieOS agora é somente escuro ---
    // (sistema antigo de agendamento claro/escuro desativado junto com a
    // remoção total do tema claro; bloco mantido como no-op documentado).

    // --- Ciclo de cor de destaque (accent color) ---
    systems.push((function accentCycle() {
        let interval = null;
        const colors = ['#a78bfa', '#66c0f4', '#ff6ec7', '#4ade80', '#fbbf24'];
        let i = 0;
        return {
            id: 'visual.accent-cycle', category: 'visual', name: 'Cor de Destaque Cíclica',
            description: 'A cor de destaque do sistema muda suavemente a cada poucos minutos.',
            enabledByDefault: false,
            enable() {
                interval = setInterval(() => {
                    i = (i + 1) % colors.length;
                    document.documentElement.style.setProperty('--accent', colors[i]);
                }, 3 * 60 * 1000);
            },
            disable() { clearInterval(interval); document.documentElement.style.removeProperty('--accent'); }
        };
    })());

    return systems;
}

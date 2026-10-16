/**
 * Categoria: ACCESSIBILITY (15 sistemas)
 * Ajustes reais de acessibilidade: contraste, fonte, movimento, filtros
 * de daltonismo (via SVG), navegação por teclado, anúncios para leitor
 * de tela (aria-live).
 */
export default function buildAccessibilitySystems({ helpers, AccessibilityManager }) {
    const { classToggleSystem, injectCSS } = helpers;
    const systems = [];

    const cssToggle = (id, name, description, className, enabledByDefault = false) => {
        const t = classToggleSystem({ id: `accessibility.${id}`, className });
        return { id: `accessibility.${id}`, category: 'accessibility', name, description, enabledByDefault, enable: t.enable, disable: t.disable };
    };

    systems.push(cssToggle('high-contrast', 'Alto Contraste', 'Aumenta o contraste de cores em toda a interface.', 'vsys-high-contrast'));
    systems.push(cssToggle('dyslexia-font', 'Fonte para Dislexia', 'Troca a fonte do sistema por uma mais legível para pessoas disléxicas.', 'vsys-dyslexia-font'));
    systems.push(cssToggle('underline-links', 'Sublinhar Links', 'Sublinha todos os links clicáveis, não apenas por cor.', 'vsys-underline-links'));
    systems.push(cssToggle('focus-outline-boost', 'Contorno de Foco Reforçado', 'Deixa o indicador de foco do teclado muito mais visível.', 'vsys-focus-outline-boost'));
    systems.push(cssToggle('cursor-size-boost', 'Cursor Grande', 'Aumenta o tamanho do cursor do mouse.', 'vsys-cursor-large'));
    systems.push(cssToggle('text-spacing', 'Espaçamento de Texto', 'Aumenta o espaçamento entre letras e linhas para melhor legibilidade.', 'vsys-text-spacing'));

    // --- Reforço de "reduzir movimento" (além da media query nativa) ---
    systems.push({
        id: 'accessibility.reduce-motion-enforced', category: 'accessibility', name: 'Reduzir Movimento (Forçado)',
        description: 'Desativa todas as animações decorativas, independente da preferência do sistema operacional.',
        enabledByDefault: false,
        enable() { document.documentElement.classList.add('vsys-reduce-motion'); },
        disable() { document.documentElement.classList.remove('vsys-reduce-motion'); }
    });

    // --- Escala de fonte ajustável ---
    systems.push({
        id: 'accessibility.font-scale', category: 'accessibility', name: 'Escala de Fonte',
        description: 'Aumenta o tamanho de todo o texto do sistema em 20%.',
        enabledByDefault: false,
        enable() { document.documentElement.style.setProperty('--vsys-font-scale', '1.2'); },
        disable() { document.documentElement.style.removeProperty('--vsys-font-scale'); }
    });

    // --- Filtros de daltonismo via SVG ---
    systems.push((function colorblindFilters() {
        const applied = { value: null };
        const svgId = 'vsys-colorblind-svg-filters';
        const ensureSVG = () => {
            if (document.getElementById(svgId)) return;
            const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.id = svgId; svg.style.cssText = 'position:absolute;width:0;height:0';
            svg.innerHTML = `
                <filter id="vsys-protanopia"><feColorMatrix type="matrix" values="0.567,0.433,0,0,0 0.558,0.442,0,0,0 0,0.242,0.758,0,0 0,0,0,1,0"/></filter>
                <filter id="vsys-deuteranopia"><feColorMatrix type="matrix" values="0.625,0.375,0,0,0 0.7,0.3,0,0,0 0,0.3,0.7,0,0 0,0,0,1,0"/></filter>
                <filter id="vsys-tritanopia"><feColorMatrix type="matrix" values="0.95,0.05,0,0,0 0,0.433,0.567,0,0 0,0.475,0.525,0,0 0,0,0,1,0"/></filter>`;
            document.body.appendChild(svg);
        };
        return {
            id: 'accessibility.colorblind-filters', category: 'accessibility', name: 'Filtros de Daltonismo',
            description: 'Aplica um filtro SVG de correção para protanopia, deuteranopia ou tritanopia.',
            enabledByDefault: false,
            enable() {
                ensureSVG();
                const mode = helpers.storageGet('colorblind-mode', 'deuteranopia');
                document.documentElement.style.filter = `url(#vsys-${mode})`;
                applied.value = mode;
            },
            disable() { document.documentElement.style.filter = ''; }
        };
    })());

    // --- Anúncios para leitor de tela (região aria-live global) ---
    systems.push((function screenReaderAnnouncer() {
        let region = null;
        return {
            id: 'accessibility.screen-reader-announcer', category: 'accessibility', name: 'Anúncios para Leitor de Tela',
            description: 'Cria uma região aria-live global para que ações do sistema sejam anunciadas por leitores de tela.',
            enabledByDefault: true,
            enable() {
                region = document.createElement('div');
                region.setAttribute('aria-live', 'polite');
                region.setAttribute('role', 'status');
                region.className = 'sr-only';
                region.id = 'vsys-sr-announcer';
                document.body.appendChild(region);
                window.__vsysAnnounce = (msg) => { if (region) region.textContent = msg; };
            },
            disable() { region?.remove(); delete window.__vsysAnnounce; }
        };
    })());

    // --- Modo de navegação só por teclado (destaca elementos focáveis) ---
    systems.push((function keyboardOnlyMode() {
        let handler = null;
        return {
            id: 'accessibility.keyboard-only-nav', category: 'accessibility', name: 'Navegação Apenas por Teclado',
            description: 'Destaca visualmente todos os elementos que podem receber foco via Tab.',
            enabledByDefault: false,
            enable() {
                handler = (e) => { if (e.key === 'Tab') document.documentElement.classList.add('vsys-keyboard-nav'); };
                const mouseHandler = () => document.documentElement.classList.remove('vsys-keyboard-nav');
                window.addEventListener('keydown', handler);
                window.addEventListener('mousedown', mouseHandler);
                this._mouseHandler = mouseHandler;
            },
            disable() {
                window.removeEventListener('keydown', handler);
                if (this._mouseHandler) window.removeEventListener('mousedown', this._mouseHandler);
                document.documentElement.classList.remove('vsys-keyboard-nav');
            }
        };
    })());

    // --- Legendas automáticas para vídeos embutidos (quando disponíveis) ---
    systems.push({
        id: 'accessibility.auto-captions', category: 'accessibility', name: 'Legendas Automáticas',
        description: 'Ativa legendas (track) automaticamente em vídeos que possuem essa opção.',
        enabledByDefault: false,
        enable() {
            document.querySelectorAll('video track').forEach(t => t.mode = 'showing');
        },
        disable() {
            document.querySelectorAll('video track').forEach(t => t.mode = 'hidden');
        }
    });

    // --- Pistas sonoras para notificações ---
    systems.push((function audioCues() {
        let handler = null;
        return {
            id: 'accessibility.audio-notification-cues', category: 'accessibility', name: 'Sinais Sonoros de Notificação',
            description: 'Toca um som curto sempre que uma notificação do sistema aparece.',
            enabledByDefault: false,
            enable() {
                handler = () => {
                    try {
                        const ctxAudio = new (window.AudioContext || window.webkitAudioContext)();
                        const osc = ctxAudio.createOscillator();
                        osc.frequency.value = 880; osc.connect(ctxAudio.destination);
                        osc.start(); osc.stop(ctxAudio.currentTime + 0.08);
                    } catch (e) { /* AudioContext indisponível/bloqueado */ }
                };
                document.addEventListener('vessieos:notification', handler);
            },
            disable() { document.removeEventListener('vessieos:notification', handler); }
        };
    })());

    // --- Emulação de "sticky keys" (modificadores não precisam ser segurados) ---
    systems.push((function stickyKeys() {
        let active = { ctrl: false, shift: false, alt: false };
        let handler = null;
        return {
            id: 'accessibility.sticky-keys-emulation', category: 'accessibility', name: 'Teclas de Aderência',
            description: 'Permite pressionar Ctrl/Shift/Alt uma vez em vez de segurar, para atalhos.',
            enabledByDefault: false,
            enable() {
                handler = (e) => {
                    if (['Control', 'Shift', 'Alt'].includes(e.key)) {
                        const key = e.key.toLowerCase();
                        active[key] = !active[key];
                        document.documentElement.classList.toggle(`vsys-sticky-${key}`, active[key]);
                    }
                };
                window.addEventListener('keyup', handler);
            },
            disable() {
                window.removeEventListener('keyup', handler);
                Object.keys(active).forEach(k => document.documentElement.classList.remove(`vsys-sticky-${k}`));
            }
        };
    })());

    // --- Ler em voz alta ao clicar com Alt pressionado (Text-to-Speech) ---
    systems.push((function clickToSpeak() {
        let handler = null;
        return {
            id: 'accessibility.click-to-speak', category: 'accessibility', name: 'Ler ao Clicar',
            description: 'Segure Alt e clique em qualquer texto para ouvi-lo em voz alta (Web Speech API).',
            enabledByDefault: false,
            enable() {
                if (!window.speechSynthesis) return;
                handler = (e) => {
                    if (!e.altKey) return;
                    const text = e.target?.textContent?.trim();
                    if (!text) return;
                    const utter = new SpeechSynthesisUtterance(text.slice(0, 500));
                    utter.lang = 'pt-BR';
                    speechSynthesis.cancel();
                    speechSynthesis.speak(utter);
                };
                document.addEventListener('click', handler);
            },
            disable() { document.removeEventListener('click', handler); speechSynthesis?.cancel(); }
        };
    })());

    return systems;
}

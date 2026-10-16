/**
 * Cor Adaptativa do VessieOS.
 *
 * Analisa as janelas abertas (imagens, canvases e cor de fundo real de
 * cada uma) e calcula uma cor de acento — aplicada em `--a`/`--a2` em
 * :root, que já são as variáveis que a taskbar, o menu Iniciar e o
 * resto da UI usam (ver CSS/base/theme.css). Nada aqui é decorativo
 * "morto": a amostragem lê pixels reais quando possível.
 *
 * Como funciona a amostragem (em ordem de preferência, por janela):
 *   1. <canvas> já renderizados dentro da janela (mesma origem sempre,
 *      então dá para ler os pixels com segurança) — ex.: o fundo 3D do
 *      Game Hub, o HUD de performance.
 *   2. <img> dentro da janela — desenhadas num canvas offscreen para
 *      extrair a cor média; imagens de origem cruzada (a maioria dos
 *      jogos usa <iframe>, não <img>, então isso afeta pouco) que
 *      "sujam" o canvas são simplesmente ignoradas (try/catch).
 *   3. Se nada acima funcionar, usa a cor de fundo computada (CSS real,
 *      não inventada) do cabeçalho ou corpo da janela.
 *
 * As cores de todas as janelas abertas são combinadas por média
 * ponderada, depois ajustadas em HSL para permanecerem legíveis como
 * acento de UI (saturação e luminosidade dentro de uma faixa agradável,
 * mas mantendo o matiz — o "hue" real das cores predominantes).
 *
 * API pública: window.VessieAdaptiveColor
 *   .enable() / .disable() / .isEnabled()
 *   .sampleNow() — força uma nova amostragem imediatamente
 */
(function () {
    const STORAGE_KEY = 'vsys_adaptive_color_enabled';
    const DEFAULT_A = '#60a5fa';
    const DEFAULT_A2 = '#a78bfa';

    let enabled = localStorage.getItem(STORAGE_KEY) === '1';
    let timer = null;
    let debounceTimer = null;

    function rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;
        if (max === min) { h = s = 0; }
        else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                default: h = (r - g) / d + 4;
            }
            h /= 6;
        }
        return [h * 360, s * 100, l * 100];
    }

    function hslToHex(h, s, l) {
        s /= 100; l /= 100;
        const k = n => (n + h / 30) % 12;
        const a = s * Math.min(l, 1 - l);
        const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
        const toHex = x => Math.round(255 * x).toString(16).padStart(2, '0');
        return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
    }

    /** Extrai a cor média de um canvas já renderizado (mesma origem). */
    function sampleCanvas(canvas) {
        try {
            const ctx = canvas.getContext('2d');
            if (!ctx || canvas.width === 0 || canvas.height === 0) return null;
            // Reduz para uma amostra pequena por performance
            const w = Math.min(canvas.width, 24), h = Math.min(canvas.height, 24);
            const data = ctx.getImageData(0, 0, w, h).data;
            let r = 0, g = 0, b = 0, count = 0;
            for (let i = 0; i < data.length; i += 4) {
                if (data[i + 3] < 10) continue; // ignora pixels quase transparentes
                r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
            }
            if (!count) return null;
            return [r / count, g / count, b / count];
        } catch (e) {
            return null; // canvas "sujo" (conteúdo cross-origin) ou não suportado
        }
    }

    /** Extrai a cor média de uma <img> desenhando-a num canvas offscreen. */
    function sampleImage(img) {
        try {
            if (!img.complete || !img.naturalWidth) return null;
            const canvas = document.createElement('canvas');
            canvas.width = 16; canvas.height = 16;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, 16, 16);
            return sampleCanvas(canvas);
        } catch (e) {
            return null; // imagem de origem cruzada sem CORS habilitado
        }
    }

    /** Fallback: cor de fundo real (CSS computado) da janela. */
    function sampleComputedBackground(winEl) {
        const header = winEl.querySelector('.wh, .wb');
        if (!header) return null;
        const color = getComputedStyle(header).backgroundColor;
        const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (!match) return null;
        return [Number(match[1]), Number(match[2]), Number(match[3])];
    }

    function sampleWindow(winEl) {
        const canvases = winEl.querySelectorAll('canvas');
        for (const c of canvases) {
            const color = sampleCanvas(c);
            if (color) return color;
        }
        const images = winEl.querySelectorAll('img');
        for (const img of images) {
            const color = sampleImage(img);
            if (color) return color;
        }
        return sampleComputedBackground(winEl);
    }

    function applyAccent([r, g, b]) {
        let [h, s, l] = rgbToHsl(r, g, b);
        // Mantém o matiz real predominante, mas restringe saturação/luminosidade
        // a uma faixa que continua legível como cor de UI (evita acentos quase
        // pretos, quase brancos ou completamente sem cor).
        s = Math.min(80, Math.max(45, s));
        l = Math.min(68, Math.max(42, l));
        const primary = hslToHex(h, s, l);
        const secondary = hslToHex((h + 35) % 360, s, Math.min(72, l + 8));
        document.documentElement.style.setProperty('--a', primary);
        document.documentElement.style.setProperty('--a2', secondary);
        document.documentElement.style.setProperty('--color-accent', primary);
        document.documentElement.style.setProperty('--color-accent-2', secondary);
    }

    function resetAccent() {
        document.documentElement.style.removeProperty('--a');
        document.documentElement.style.removeProperty('--a2');
        document.documentElement.style.removeProperty('--color-accent');
        document.documentElement.style.removeProperty('--color-accent-2');
    }

    function sampleNow() {
        if (!enabled) return;
        const windows = document.querySelectorAll('.win');
        if (!windows.length) { resetAccent(); return; }
        let totalR = 0, totalG = 0, totalB = 0, count = 0;
        windows.forEach(win => {
            const color = sampleWindow(win);
            if (color) { totalR += color[0]; totalG += color[1]; totalB += color[2]; count++; }
        });
        if (!count) return;
        applyAccent([totalR / count, totalG / count, totalB / count]);
    }

    function debouncedSample() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(sampleNow, 600);
    }

    function enable() {
        enabled = true;
        localStorage.setItem(STORAGE_KEY, '1');
        document.addEventListener('vessieos:app-opened', debouncedSample);
        window.addEventListener('focus', debouncedSample, true);
        timer = setInterval(sampleNow, 20000); // reamostra periodicamente (conteúdo de jogos/canvas muda)
        sampleNow();
    }

    function disable() {
        enabled = false;
        localStorage.setItem(STORAGE_KEY, '0');
        document.removeEventListener('vessieos:app-opened', debouncedSample);
        window.removeEventListener('focus', debouncedSample, true);
        clearInterval(timer);
        clearTimeout(debounceTimer);
        resetAccent();
    }

    window.VessieAdaptiveColor = {
        enable, disable, sampleNow,
        isEnabled: () => enabled,
        defaults: { a: DEFAULT_A, a2: DEFAULT_A2 }
    };

    if (enabled) {
        // Espera o desktop estar pronto antes da primeira amostragem
        document.addEventListener('DOMContentLoaded', () => setTimeout(enable, 1500));
        if (document.readyState !== 'loading') setTimeout(enable, 1500);
    }
})();

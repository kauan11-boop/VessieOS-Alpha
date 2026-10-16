/**
 * three-hook.js – Ponte clássica entre a UI do Game Hub (Steam Hub, em
 * JS/core/main.js — window.steamRender / window.steamPlay) e o
 * GraphicsHub (módulo ES, window.VessieOS.graphics), que hospeda o
 * GameHubRenderer em Three.js.
 *
 * `core/main.js` é um script clássico gigante e não pode fazer `import`.
 * Este arquivo, também clássico, expõe duas funções globais simples que
 * ele já pode chamar sem se importar com módulos ES:
 *
 *   window.mountGameHubThree(canvas, { accentColor })
 *   window.unmountGameHubThree()
 *   window.pulseGameHubThree()
 */
(function () {
    function getGraphics() {
        return window.VessieOS?.graphics || null;
    }

    window.mountGameHubThree = function (canvas, options = {}) {
        if (!canvas) return false;
        const graphics = getGraphics();
        if (graphics && typeof graphics.mountGameHubScene === 'function') {
            return graphics.mountGameHubScene(canvas, options);
        }
        // GraphicsHub ainda não terminou de inicializar (a pipeline ES roda em
        // paralelo ao boot clássico) — tenta de novo por um curto período.
        let attempts = 0;
        const retry = setInterval(() => {
            attempts++;
            const g = getGraphics();
            if (g && typeof g.mountGameHubScene === 'function') {
                g.mountGameHubScene(canvas, options);
                clearInterval(retry);
            } else if (attempts > 30) {
                clearInterval(retry);
            }
        }, 150);
        return false;
    };

    window.unmountGameHubThree = function () {
        const graphics = getGraphics();
        if (graphics && typeof graphics.unmountGameHubScene === 'function') {
            graphics.unmountGameHubScene();
        }
    };

    window.pulseGameHubThree = function (accentColor) {
        const graphics = getGraphics();
        if (!graphics?.gameHubRenderer) return;
        if (accentColor) graphics.gameHubRenderer.setAccentColor(accentColor);
        graphics.gameHubRenderer.pulse();
    };
})();

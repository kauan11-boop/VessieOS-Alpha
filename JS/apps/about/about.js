// about/about.js — Sobre o VessieOS (pasta com view.html + view.css + about.js)
// O shell estático vive em view.html (tokens {{games}} {{walls}} {{tracks}});
// o CSS vive em view.css. O fallback inline abaixo é idêntico e só é usado
// se o fetch falhar (ex.: file://). Lógica inalterada.
(function () {
  "use strict";

function aboutFallback(data) {
    // Cópia fiel do modelo original (inline styles): só usada sem fetch.
    return `
    <div style="padding:36px;text-align:center;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px">
      <div style="font-size:5rem;animation:pulse 2s ease infinite">💜</div>
      <h2 style="font-size:2rem;background:linear-gradient(135deg,var(--a),var(--a2));-webkit-background-clip:text;background-clip:text;color:transparent">VessieOS</h2>
      <p style="color:var(--dim);font-size:.9rem">Sistema Operacional Simulado · v3.0</p>
      <div style="background:rgba(255,255,255,.04);border-radius:16px;padding:20px;width:100%;max-width:360px;text-align:left;font-size:.85rem;line-height:2;color:#a0b0cc">
        <div>🌸 IA Vessie integrada (Anthropic Claude)</div>
        <div>🎮 ${data.games}+ jogos disponíveis</div>
        <div>📊 Dashboard com métricas dinâmicas</div>
        <div>💻 Terminal com comandos reais</div>
        <div>🖼️ ${data.walls} papéis de parede HD</div>
        <div>🎵 Music Player com ${data.tracks} faixas</div>
        <div>📁 Sistema de arquivos virtual</div>
        <div>🎨 Temas e cores personalizáveis</div>
      </div>
      <p style="color:var(--dim);font-size:.78rem">Feito com 💜 usando HTML, CSS & JavaScript puro</p>
    </div>`;
  }

function openAbout() {
    const data = { games: GAMES.length, walls: WALLS.length, tracks: TRACKS.length };
    const win = createWin('Sobre o VessieOS', '💜', '<div class="app-loading">Carregando…</div>', 480, 520);
    const mount = (html) => { if (document.body.contains(win)) win.querySelector('.wb').innerHTML = html; };
    if (window.VessieBridge && typeof window.VessieBridge.loadView === 'function') {
      window.VessieBridge.loadView('about', { html: aboutFallback(data) }, data).then(({ html }) => mount(html));
    } else {
      mount(aboutFallback(data));
    }
    return win;
  }
window.openAbout = openAbout;
})();

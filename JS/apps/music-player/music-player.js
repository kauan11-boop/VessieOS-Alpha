// music-player/music-player.js — Music Player (pasta com view.html + view.css + music-player.js)
// Shell em view.html (tokens {{t0}} {{a0}} {{dur0}} {{volume}} {{tracks}});
// fallback = modelo original verbatim (só sem fetch). Fiação em wireMusic.
(function () {
  "use strict";

function musicData() {
    return {
      t0: TRACKS[0].t,
      a0: TRACKS[0].a,
      dur0: fmtTime(TRACKS[0].dur),
      volume: S.volume,
      tracks: TRACKS.map((t, i) => `<div class="mc-track ${i === S.musTrack ? 'active' : ''}" onclick="S.musTrack=${i};S.musProg=0;updateMusicUI();if(S.musPlaying)playCurrentTrack();">${t.t} <span>${t.a}</span></div>`).join('')
    };
  }

function musicFallback() {
    return `
    <div class="mplayer">
      <div class="mc-cover" id="mc-cover">🎵</div>
      <audio id="mc-audio" preload="metadata"></audio>
      <div><div class="mc-title" id="mc-title">${TRACKS[0].t}</div><div class="mc-art" id="mc-art">${TRACKS[0].a}</div></div>
      <div class="mc-prog">
        <div class="mc-prog-bar" id="mc-prog-bar" onclick="seekTrack(event,this)"><div class="mc-prog-fill" id="mc-fill" style="width:0%"></div></div>
      </div>
      <div class="mc-time"><span id="mc-cur">0:00</span><span id="mc-dur">${fmtTime(TRACKS[0].dur)}</span></div>
      <div class="mc-ctrl">
        <button onclick="mcPrev()"><i class="fas fa-step-backward"></i></button>
        <button onclick="mcShuffle()"><i class="fas fa-random"></i></button>
        <button class="mc-play" id="mc-play" onclick="mcToggle()"><i class="fas fa-play" id="mc-play-ico"></i></button>
        <button onclick="mcRepeat()" id="mc-repeat-btn"><i class="fas fa-redo"></i></button>
        <button onclick="mcNext()"><i class="fas fa-step-forward"></i></button>
      </div>
      <div class="mc-vol">
        <i class="fas fa-volume-down" style="color:var(--dim)"></i>
        <input type="range" id="mc-vol-slider" min="0" max="100" value="${S.volume}" oninput="S.volume=this.value;document.getElementById('mc-audio').volume=this.value/100">
        <i class="fas fa-volume-up" style="color:var(--dim)"></i>
      </div>
      <div class="mc-tracklist">${TRACKS.map((t, i) => `<div class="mc-track ${i === S.musTrack ? 'active' : ''}" onclick="S.musTrack=${i};S.musProg=0;updateMusicUI();if(S.musPlaying)playCurrentTrack();">${t.t} <span>${t.a}</span></div>`).join('')}</div>
    </div>
  `;
  }

function openMusic(external) {
    // Inicializa variáveis globais se não existirem
    if (typeof S.musTrack === 'undefined') S.musTrack = 0;
    if (typeof S.musPlaying === 'undefined') S.musPlaying = false;
    if (typeof S.musProg === 'undefined') S.musProg = 0;
    if (typeof S.volume === 'undefined') S.volume = 70;

    const win = createWin('Music Player', '🎵', '<div class="app-loading">Carregando…</div>', 390, 560);
    const wire = () => wireMusic(win, external);
    if (window.VessieBridge && typeof window.VessieBridge.loadView === 'function') {
      window.VessieBridge.loadView('music-player', { html: musicFallback() }, musicData()).then(({ html }) => {
        if (!document.body.contains(win)) return;
        win.querySelector('.wb').innerHTML = html;
        wire();
      });
    } else {
      win.querySelector('.wb').innerHTML = musicFallback();
      wire();
    }
    return win;
  }

function wireMusic(win, external) {

    // ---------- CONFIGURA O ÁUDIO ----------
    const audio = document.getElementById('mc-audio');
    if (audio) {
      // Atualiza a barra de progresso em tempo real
      audio.addEventListener('timeupdate', function () {
        if (this.duration && !isNaN(this.duration) && this.duration > 0) {
          const pct = (this.currentTime / this.duration) * 100;
          const fill = document.getElementById('mc-fill');
          if (fill) fill.style.width = Math.min(100, pct) + '%';
          const cur = document.getElementById('mc-cur');
          if (cur) cur.textContent = fmtTime(this.currentTime);
          S.musProg = this.currentTime;
        }
      });

      // Quando a música termina
      audio.addEventListener('ended', function () {
        const repeatBtn = document.getElementById('mc-repeat-btn');
        const isRepeat = repeatBtn && repeatBtn.dataset.repeat === 'true';
        if (isRepeat) {
          this.currentTime = 0;
          this.play().catch(() => { });
          return;
        }
        // Avança para a próxima faixa
        mcNext();
      });

      // Carrega a faixa atual
      const tr = TRACKS[S.musTrack];
      if (tr && tr.src) {
        audio.src = tr.src;
        audio.volume = (S.volume || 70) / 100;
        if (S.musPlaying) {
          audio.play().catch(() => { });
        }
      }
    }

    updateMusicUI();
    if (S.musPlaying) playCurrentTrack();
    // Faixa externa (ponte "Abrir com"): aplicada após o shell existir.
    if (external && external.src) {
      try {
        const extAudio = win.querySelector('#mc-audio') || document.getElementById('mc-audio');
        const extTitle = win.querySelector('#mc-title') || document.getElementById('mc-title');
        const extArt = win.querySelector('#mc-art') || document.getElementById('mc-art');
        if (extAudio) {
          S.musPlaying = true;
          extAudio.src = external.src;
          extAudio.volume = (S.volume || 70) / 100;
          extAudio.play().catch(() => { S.musPlaying = false; });
        }
        if (extTitle) extTitle.textContent = external.title || 'Áudio externo';
        if (extArt) extArt.textContent = 'Via Explorador';
        updateMusicUI();
        if (extTitle) extTitle.textContent = external.title || 'Áudio externo';
      } catch { /* player aberto na playlist padrão */ }
    }
  }

function fmtTime(s) {
    if (!s || isNaN(s) || s < 0) return '0:00';
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  }

function playCurrentTrack() {
    const audio = document.getElementById('mc-audio');
    const tr = TRACKS[S.musTrack];
    if (!audio || !tr?.src) {
      S.musPlaying = false;
      updateMusicUI();
      return;
    }
    // Se a fonte mudou, recarrega
    if (audio.src !== tr.src) {
      audio.src = tr.src;
      audio.load();
    }
    audio.volume = (S.volume || 70) / 100;
    audio.currentTime = S.musProg || 0;
    audio.play().catch(() => {
      S.musPlaying = false;
      updateMusicUI();
    });
    updateMusicUI();
  }

window.mcToggle = function () {
    const audio = document.getElementById('mc-audio');
    if (!audio) return;

    S.musPlaying = !S.musPlaying;
    const ico = document.getElementById('mc-play-ico');
    const cover = document.getElementById('mc-cover');

    if (ico) ico.className = `fas fa-${S.musPlaying ? 'pause' : 'play'}`;
    if (cover) cover.classList.toggle('playing', S.musPlaying);

    if (S.musPlaying) {
      playCurrentTrack();
    } else {
      audio.pause();
    }
    updateMusicUI();
  };

window.mcNext = function () {
    S.musTrack = (S.musTrack + 1) % TRACKS.length;
    S.musProg = 0;
    S.musPlaying = true;
    playCurrentTrack();
    updateMusicUI();
  };

window.mcPrev = function () {
    const audio = document.getElementById('mc-audio');
    // Se passou mais de 3 segundos, volta ao início
    if (audio && audio.currentTime > 3) {
      audio.currentTime = 0;
      S.musProg = 0;
      updateMusicUI();
      return;
    }
    S.musTrack = (S.musTrack - 1 + TRACKS.length) % TRACKS.length;
    S.musProg = 0;
    S.musPlaying = true;
    playCurrentTrack();
    updateMusicUI();
  };

window.mcShuffle = function () {
    S.musTrack = Math.floor(Math.random() * TRACKS.length);
    S.musProg = 0;
    S.musPlaying = true;
    playCurrentTrack();
    updateMusicUI();
    toast('🎵 Faixa aleatória ativada!', 'default');
  };

window.mcRepeat = function () {
    const btn = document.getElementById('mc-repeat-btn');
    if (!btn) return;
    const isRepeat = btn.dataset.repeat === 'true';
    btn.dataset.repeat = isRepeat ? 'false' : 'true';
    btn.style.color = isRepeat ? 'var(--dim)' : 'var(--a)';
    btn.style.background = isRepeat ? 'transparent' : 'rgba(96,165,250,.15)';
    toast(isRepeat ? '🔁 Repetição desativada' : '🔁 Repetição ativada', 'default');
  };

window.seekTrack = function (e, bar) {
    const audio = document.getElementById('mc-audio');
    if (!audio || !bar) return;
    const rect = bar.getBoundingClientRect();
    const x = Math.min(Math.max(0, e.clientX - rect.left), rect.width);
    const pct = x / rect.width;
    const track = TRACKS[S.musTrack];
    if (!track) return;
    const time = pct * track.dur;
    S.musProg = time;
    if (audio) {
      audio.currentTime = time;
    }
    const fill = document.getElementById('mc-fill');
    if (fill) fill.style.width = (pct * 100) + '%';
    const cur = document.getElementById('mc-cur');
    if (cur) cur.textContent = fmtTime(time);
  };

function updateMusicUI() {
    const tr = TRACKS[S.musTrack];
    if (!tr) return;

    const t = document.getElementById('mc-title');
    const a = document.getElementById('mc-art');
    const d = document.getElementById('mc-dur');
    const ico = document.getElementById('mc-play-ico');
    const cover = document.getElementById('mc-cover');
    const fill = document.getElementById('mc-fill');
    const cur = document.getElementById('mc-cur');
    const audio = document.getElementById('mc-audio');

    if (t) t.textContent = tr.t;
    if (a) a.textContent = tr.a;
    if (d) d.textContent = fmtTime(tr.dur);

    document.querySelectorAll('.mc-track').forEach((el, i) => {
      el.classList.toggle('active', i === S.musTrack);
    });

    if (ico) ico.className = `fas fa-${S.musPlaying ? 'pause' : 'play'}`;
    if (cover) cover.classList.toggle('playing', S.musPlaying);

    // Atualiza progresso
    if (audio && audio.duration && !isNaN(audio.duration) && audio.duration > 0) {
      const pct = (audio.currentTime / audio.duration) * 100;
      if (fill) fill.style.width = Math.min(100, pct) + '%';
      if (cur) cur.textContent = fmtTime(audio.currentTime);
    } else if (tr.dur) {
      const pct = (S.musProg || 0) / tr.dur * 100;
      if (fill) fill.style.width = Math.min(100, pct) + '%';
      if (cur) cur.textContent = fmtTime(S.musProg || 0);
    }

    // Atualiza volume
    const volSlider = document.getElementById('mc-vol-slider');
    if (volSlider) volSlider.value = S.volume || 70;
    if (audio) audio.volume = (S.volume || 70) / 100;
  }
window.openMusic = openMusic;

// Abertura dirigida pela ponte de integração (Explorer "Abrir com",
// Terminal `open`): toca uma fonte de áudio direta (data: ou http).
function openMusicWith(src, title) {
  return openMusic(src ? { src, title } : null);
}
window.openMusicWith = openMusicWith;
// A lista de faixas chama updateMusicUI()/playCurrentTrack() via onclick
// inline (escopo global) — sem isso, clicar numa faixa da playlist não
// fazia nada (ReferenceError silencioso).
window.updateMusicUI = updateMusicUI;
window.playCurrentTrack = playCurrentTrack;
})();

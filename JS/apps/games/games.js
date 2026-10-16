// games.js — extraído de JS/core/main.js (VessieOS)
// Depende de utilitários globais do kernel: S, VFS, toast, createWin, persistState, etc. (expostos em main.js)
(function () {
  "use strict";

function openGames() {
    const lib = steamLoad();
    const win = createWin('Steam', '<i class="fab fa-steam" style="color:#66c0f4"></i>', `
    <div class="steam">
      <div class="st-sb">
        <div class="st-logo"><i class="fab fa-steam"></i><b>STEAM</b></div>
        <div class="st-sb-search"><i class="fas fa-magnifying-glass"></i><input id="st-sb-filter" placeholder="Filtrar jogos" oninput="steamRenderSidebarList(this.value)"></div>
        <div class="st-sb-home" onclick="steamRender('library')"><i class="fas fa-house"></i> Página inicial</div>
        <div class="st-sb-list" id="st-sb-list"></div>
        <div class="st-user"><div class="av">${(S.user || 'V')[0].toUpperCase()}</div><div><div style="color:#fff">${S.user || 'Visitante'}</div><div style="font-size:.7rem;color:#5cb85c">● Online</div></div></div>
      </div>
      <div class="st-main-wrap">
        <div class="st-toptabs">
          <div class="st-tt ac" data-view="library" onclick="steamRender('library')">BIBLIOTECA</div>
          <div class="st-tt" data-view="store" onclick="steamRender('store')">LOJA</div>
          <div class="st-tt" data-view="community" onclick="steamRender('community')">COMUNIDADE</div>
          <div class="st-tt" data-view="downloads" onclick="steamRender('downloads')">DOWNLOADS</div>
          <div class="st-tt" data-view="friends" onclick="steamRender('friends')">AMIGOS</div>
          <div class="st-tt" data-view="profile" onclick="steamRender('profile')">PERFIL</div>
        </div>
        <div class="st-main" id="st-main"></div>
      </div>
    </div>
  `, 900, 620);
    setTimeout(() => { steamRender('library'); steamRenderSidebarList(); }, 50);
    return win;
  }
window.openGames = openGames;
})();

// =====================================================================
// Sistemas do Game Hub — integrados ao app Steam (games.js), sem arquivo
// separado: tempo de jogo, favoritos + avaliações, conquistas, jogos DOS
// via Emulador, notas em VFS e Perfil do jogador.
// Serviço window.VessieGameHubPlus, 100% aditivo: não altera o Steam
// existente, apenas observa/estende (envolve steamPlay, lê steamLoad).
// =====================================================================
(function () {
  "use strict";

  const META_KEY = 'vessie_gamehub_plus_v1';
  const DOS_KEY = 'vessie_dos_games_v1';

  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch { /* ignora */ }
    return fallback;
  }
  function save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* quota etc */ }
  }
  function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ---------------- metadados por jogo ----------------
  function allMeta() { return load(META_KEY, {}); }
  function metaOf(id) {
    const all = allMeta();
    return all[id] || { fav: false, rating: 0, playSeconds: 0, sessions: 0, achievements: [] };
  }
  function putMeta(id, patch) {
    const all = allMeta();
    all[id] = { ...metaOf(id), ...patch };
    save(META_KEY, all);
    return all[id];
  }

  function libList() {
    try { if (typeof window.steamLoad === 'function') return window.steamLoad() || []; } catch { /* — */ }
    return [];
  }
  function findGame(id) {
    return libList().find((g) => g && (g.id === id || g.url === id || g.name === id)) || null;
  }
  function gameKey(g) { return (g && (g.id || g.url || g.name)) || 'unknown'; }

  // ---------------- conquistas ----------------
  const ACHIEVEMENTS = [
    { id: 'first-steps', icon: '👣', name: 'Primeiros passos', desc: 'Jogue sua primeira sessão.' },
    { id: 'maratonista', icon: '🔥', name: 'Maratonista', desc: 'Complete 10 sessões de jogo.' },
    { id: 'sem-parar', icon: '⏱️', name: 'Sem parar', desc: 'Acumule 1 hora jogando.' },
    { id: 'coruja', icon: '🦉', name: 'Coruja', desc: 'Jogue entre 23h e 5h.' },
    { id: 'colecionador', icon: '🎮', name: 'Colecionador', desc: 'Tenha 50 jogos na biblioteca.' },
    { id: 'pioneiro-dos', icon: '💾', name: 'Pioneiro DOS', desc: 'Execute um jogo DOS no Emulador.' },
    { id: 'critico', icon: '⭐', name: 'Crítico', desc: 'Avalie 5 jogos.' },
    { id: 'anotador', icon: '📝', name: 'Anotador', desc: 'Salve uma nota sobre um jogo.' }
  ];

  function unlock(achId) {
    const all = allMeta();
    const global = all.__global || { achievements: [] };
    if (global.achievements.includes(achId)) return false;
    const def = ACHIEVEMENTS.find((a) => a.id === achId);
    if (!def) return false;
    global.achievements.push(achId);
    all.__global = global;
    save(META_KEY, all);
    try {
      if (typeof toast === 'function') toast(`🏆 Conquista desbloqueada: ${def.name} — ${def.desc}`, 'success');
    } catch { /* — */ }
    return true;
  }
  function hasAch(achId) {
    try { return (allMeta().__global?.achievements || []).includes(achId); } catch { return false; }
  }
  function checkCollector() {
    if (libList().length >= 50) unlock('colecionador');
  }
  function checkCritic() {
    const rated = Object.entries(allMeta()).filter(([k, v]) => k !== '__global' && v && v.rating > 0).length;
    if (rated >= 5) unlock('critico');
  }

  // ---------------- sessões / tempo de jogo ----------------
  let session = null;   // { id, title, startTs, banked }
  let ticker = null;

  function windowHasTitle(title) {
    try {
      return [...document.querySelectorAll('.win')].some((w) => {
        const t = w.querySelector('.w-title');
        return t && t.textContent.trim() === String(title).trim();
      });
    } catch { return false; }
  }
  function finalizeSession() {
    if (!session) return;
    const now = Date.now();
    const add = Math.max(0, Math.round((now - session.startTs) / 1000)) + (session.banked || 0);
    if (add > 0) {
      const m = metaOf(session.id);
      const total = (m.playSeconds || 0) + add;
      putMeta(session.id, { playSeconds: total, sessions: (m.sessions || 0) + 1 });
      if (total >= 3600) unlock('sem-parar');
      const allSessions = Object.entries(allMeta())
        .filter(([k]) => k !== '__global')
        .reduce((s, [, v]) => s + (v.sessions || 0), 0);
      if (allSessions >= 10) unlock('maratonista');
    }
    session = null;
    if (ticker) { clearInterval(ticker); ticker = null; }
  }
  function tick() {
    if (!session) { if (ticker) { clearInterval(ticker); ticker = null; } return; }
    if (!windowHasTitle(session.title)) { finalizeSession(); return; }
    session.banked = (session.banked || 0) + 15;
    if (session.banked >= 120) {
      // consolida a cada 2 min sem fechar a sessão
      const m = metaOf(session.id);
      putMeta(session.id, { playSeconds: (m.playSeconds || 0) + session.banked });
      session.banked = 0;
      if (metaOf(session.id).playSeconds >= 3600) unlock('sem-parar');
    }
  }
  function beginSession(id, title) {
    finalizeSession();
    session = { id, title, startTs: Date.now(), banked: 0 };
    if (ticker) clearInterval(ticker);
    ticker = setInterval(tick, 15000);
    // conquistas de largada
    const allSessions = Object.entries(allMeta())
      .filter(([k]) => k !== '__global')
      .reduce((s, [, v]) => s + (v.sessions || 0), 0);
    if (allSessions === 0) unlock('first-steps');
    const h = new Date().getHours();
    if (h >= 23 || h < 5) unlock('coruja');
  }

  // envolve o steamPlay original (padrão já usado no repo para openApp)
  function hookSteamPlay() {
    if (typeof window.steamPlay !== 'function' || window.steamPlay.__ghpHooked) return;
    const original = window.steamPlay;
    const wrapped = function (id) {
      try {
        const g = findGame(id);
        if (g) beginSession(gameKey(g), g.name);
      } catch { /* sessão é best-effort */ }
      return original.apply(this, arguments);
    };
    wrapped.__ghpHooked = true;
    window.steamPlay = wrapped;
  }

  // ---------------- favoritos / avaliação / notas ----------------
  function toggleFav(id) {
    const m = metaOf(id);
    putMeta(id, { fav: !m.fav });
    try { toast(!m.fav ? '★ Adicionado aos favoritos.' : '☆ Removido dos favoritos.', 'success'); } catch { /* — */ }
    return !m.fav;
  }
  function setRating(id, stars) {
    putMeta(id, { rating: Math.max(0, Math.min(5, Number(stars) || 0)) });
    checkCritic();
  }
  function safeFile(id) { return String(id).replace(/[^a-z0-9_-]/gi, '_').slice(0, 60) || 'jogo'; }
  function notePath(id) { return `Jogos/Notas/${safeFile(id)}.txt`; }
  function readNote(id) {
    try {
      const v = VFS.read(notePath(id));
      return typeof v === 'string' ? v : '';
    } catch { return ''; }
  }
  function saveNote(id, text) {
    try {
      VFS.write(notePath(id), String(text || ''));
      if (typeof persistState === 'function') persistState();
      if (String(text || '').trim()) unlock('anotador');
      toast('Nota salva em Jogos/Notas. 📝', 'success');
      return true;
    } catch {
      toast('Não foi possível salvar a nota.', 'error');
      return false;
    }
  }

  // ---------------- jogos DOS (compatibilidade) ----------------
  function dosList() { return load(DOS_KEY, []); }
  function saveDos(list) { save(DOS_KEY, list); }

  async function scanDos() {
    const emu = window.VessieEmulator;
    const devices = window.VessieRemoteDevices;
    if (!emu || !devices || !devices.size) {
      try { toast('Conecte um Remote Device no Explorador para procurar jogos DOS.', 'error'); } catch { /* — */ }
      return [];
    }
    const found = [];
    for (const device of devices.values()) {
      try {
        if (device.handle.queryPermission) {
          const q = await device.handle.queryPermission({ mode: 'read' });
          if (q !== 'granted' && device.handle.requestPermission) {
            const r = await device.handle.requestPermission({ mode: 'read' });
            if (r !== 'granted') continue;
          }
        }
        const items = await emu.scanFolder(device.handle, { max: 200 });
        items.filter((it) => it.runnable === 'dos').forEach((it) => {
          found.push({
            uid: `dos-${device.label}-${it.name}`.replace(/[^a-z0-9_-]/gi, '_').slice(0, 80),
            name: it.name.replace(/\.(exe|com|bat|cmd)$/i, ''),
            file: it.name, deviceLabel: device.label,
            format: it.format, size: it.size, added: Date.now(), plays: 0, lastPlay: 0
          });
        });
      } catch { /* próxima pasta */ }
    }
    const current = dosList();
    let added = 0;
    found.forEach((f) => {
      if (!current.some((d) => d.uid === f.uid)) { current.push(f); added++; }
    });
    saveDos(current);
    checkCollector();
    try { toast(added ? `${added} jogo(s) DOS registrado(s).` : 'Nenhum jogo DOS novo.', added ? 'success' : 'default'); } catch { /* — */ }
    return current;
  }

  async function resolveDosFile(entry) {
    const device = window.VessieRemoteDevices && window.VessieRemoteDevices.get(entry.deviceLabel);
    if (!device) throw new Error(`pasta "${entry.deviceLabel}" desconectada`);
    const ok = await (async () => {
      try {
        if (device.handle.queryPermission) {
          const q = await device.handle.queryPermission({ mode: 'read' });
          if (q !== 'granted' && device.handle.requestPermission) {
            return (await device.handle.requestPermission({ mode: 'read' })) === 'granted';
          }
          return true;
        }
        return true;
      } catch { return true; }
    })();
    if (!ok) throw new Error('permissão negada pelo navegador');
    return device.handle.getFileHandle(entry.file);
  }

  async function launchDos(uid) {
    const list = dosList();
    const entry = list.find((d) => d.uid === uid);
    if (!entry) return;
    if (typeof window.openEmulator !== 'function' || !window.VessieEmulator) {
      try { toast('Emulador indisponível.', 'error'); } catch { /* — */ }
      return;
    }
    try {
      const handle = await resolveDosFile(entry);
      const file = await handle.getFile();
      const slice = await window.VessieEmulator.sliceForAnalysis(file);
      entry.plays = (entry.plays || 0) + 1;
      entry.lastPlay = Date.now();
      saveDos(list);
      unlock('pioneiro-dos');
      beginSession(`dos:${uid}`, `Emulador — ${entry.file}`);
      window.openEmulator(slice.bytes, entry.file, `${entry.deviceLabel} (via Game Hub)`, {
        truncated: slice.truncated, fullSize: slice.fullSize
      });
    } catch (err) {
      try { toast(`Não foi possível abrir ${entry.name}: ${err?.message || 'erro'}`, 'error'); } catch { /* — */ }
    }
  }

  function removeDos(uid) {
    saveDos(dosList().filter((d) => d.uid !== uid));
  }

  // ---------------- estatísticas ----------------
  function fmtTime(sec) {
    const s = Math.max(0, Math.round(sec || 0));
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}min`;
    return `${(s / 3600).toFixed(1)}h`;
  }
  function stats() {
    const lib = libList();
    const all = allMeta();
    let seconds = 0, sessions = 0, favs = 0, rated = 0;
    Object.entries(all).forEach(([k, v]) => {
      if (k === '__global' || !v) return;
      seconds += v.playSeconds || 0;
      sessions += v.sessions || 0;
      if (v.fav) favs++;
      if (v.rating > 0) rated++;
    });
    const dos = dosList();
    const byTime = lib
      .map((g) => ({ g, sec: (all[gameKey(g)] || {}).playSeconds || 0 }))
      .filter((x) => x.sec > 0)
      .sort((a, b) => b.sec - a.sec)
      .slice(0, 5);
    const recent = lib.filter((g) => g.lastPlay).sort((a, b) => b.lastPlay - a.lastPlay).slice(0, 3);
    return {
      games: lib.length, sessions, seconds, favs, rated,
      achievements: (all.__global?.achievements || []).length, achTotal: ACHIEVEMENTS.length,
      dos: dos.length, byTime, recent, dosRecent: dos.filter((d) => d.lastPlay).sort((a, b) => b.lastPlay - a.lastPlay).slice(0, 3)
    };
  }

  // ---------------- tela PERFIL ----------------
  function renderProfile(main) {
    checkCollector();
    const st = stats();
    const ach = allMeta().__global?.achievements || [];
    const last = st.recent[0] || null;
    const card = (label, value) =>
      `<div class="gh-stat"><span>${esc(label)}</span><strong>${esc(value)}</strong></div>`;
    main.innerHTML = `
      <div class="st-hdr"><h2>PERFIL DO JOGADOR</h2>
        <button class="st-backup-btn" data-ghp="refresh" title="Atualizar"><i class="fas fa-rotate-right"></i></button>
      </div>
      <div class="st-content">
        <div class="gh-stats">${card('Jogos', st.games)}${card('Sessões', st.sessions)}${card('Tempo jogado', fmtTime(st.seconds))}${card('Favoritos', st.favs)}${card('Jogos DOS', st.dos)}</div>
        ${last ? `<div class="gh-continue">
            <div><small>CONTINUAR JOGANDO</small><strong>${esc(last.name)}</strong>
            <span>${last.plays || 0} sessões · ${fmtTime((allMeta()[gameKey(last)] || {}).playSeconds || 0)}</span></div>
            <button class="st-play-btn" data-ghp-play="${esc(last.id || '')}">▶ Jogar</button>
          </div>` : ''}
        <div class="st-sec-h"><h3>⏱ Mais jogados</h3></div>
        ${st.byTime.length ? `<div class="gh-top">${st.byTime.map((x) => `
          <div class="gh-top-row" data-ghp-detail="${esc(x.g.id || '')}">
            <span>${esc(x.g.name)}</span><strong>${fmtTime(x.sec)}</strong>
          </div>`).join('')}</div>`
          : '<div class="st-hero"><p>Jogue algo para ver seu ranking de tempo aqui.</p></div>'}
        <div class="st-sec-h"><h3>💾 Jogos DOS (Emulador)</h3><span>${st.dos} registrado(s)</span></div>
        <div class="gh-dosbar"><button class="st-btn" data-ghp="scan-dos"><i class="fas fa-magnifying-glass"></i> Procurar nas pastas sincronizadas</button></div>
        <div class="gh-dos">${dosList().map((d) => `
          <div class="gh-dos-row">
            <i class="fas fa-floppy-disk"></i>
            <div class="gh-dos-meta"><strong>${esc(d.name)}</strong><small>${esc(d.deviceLabel)} · ${esc(d.format || '').toUpperCase()} · ${d.plays || 0} sessões</small></div>
            <button class="st-btn" data-ghp-dos="${esc(d.uid)}">▶ Jogar</button>
            <button class="st-mbtn danger" data-ghp-dosdel="${esc(d.uid)}">Remover</button>
          </div>`).join('') || '<div class="st-hero"><p>Nenhum jogo DOS registrado. Conecte um Remote Device com executáveis DOS e escaneie.</p></div>'}
        </div>
      </div>`;

    main.querySelector('[data-ghp="refresh"]')?.addEventListener('click', () => renderProfile(main));
    main.querySelector('[data-ghp="scan-dos"]')?.addEventListener('click', async (e) => {
      e.currentTarget.disabled = true;
      await scanDos();
      renderProfile(main);
    });
    main.querySelectorAll('[data-ghp-play]').forEach((b) => b.addEventListener('click', () => {
      try { window.steamPlay(b.dataset.ghpPlay); } catch { /* — */ }
    }));
    main.querySelectorAll('[data-ghp-detail]').forEach((row) => row.addEventListener('click', () => {
      try { window.steamOpenDetail(row.dataset.ghpDetail); } catch { /* — */ }
    }));
    main.querySelectorAll('[data-ghp-dos]').forEach((b) => b.addEventListener('click', () => launchDos(b.dataset.ghpDos)));
    main.querySelectorAll('[data-ghp-dosdel]').forEach((b) => b.addEventListener('click', () => {
      removeDos(b.dataset.ghpDosdel);
      renderProfile(main);
    }));
  }

  // ---------------- extras na tela de detalhes + biblioteca ----------------
  // Chamados pelo Steam (main.js) via hooks aditivos: se o Plus não estiver
  // carregado, nada acontece — o Steam segue funcionando sem os extras.
  function starRow(id, rating) {
    let out = '';
    for (let s = 1; s <= 5; s++) {
      out += `<button data-ghp-star="${s}" title="${s} estrela(s)" style="background:none;border:none;cursor:pointer;font-size:1.15rem;color:${s <= rating ? '#f1c40f' : '#4a5468'}">★</button>`;
    }
    return out;
  }

  function renderPlusSection(box, g) {
    const id = gameKey(g);
    const m = metaOf(id);
    box.innerHTML = `
      <div class="gh-plusrow">
        <button data-ghp-fav style="background:${m.fav ? 'rgba(241,196,15,.16)' : 'rgba(255,255,255,.05)'};border:1px solid ${m.fav ? '#f1c40f' : 'var(--hairline,rgba(255,255,255,.12))'};color:${m.fav ? '#f1c40f' : '#cfd6e4'};padding:6px 12px;border-radius:8px;font-size:.8rem;cursor:pointer">${m.fav ? '★ Favorito' : '☆ Favoritar'}</button>
        <span class="gh-stars" title="Sua avaliação">${starRow(id, m.rating || 0)}</span>
        <span class="gh-time">⏱ ${fmtTime(m.playSeconds || 0)} · ${m.sessions || 0} sessões</span>
      </div>
      <div class="gh-notewrap">
        <label>📝 Minhas notas <small>(salvas em Jogos/Notas/)</small></label>
        <textarea data-ghp-note rows="3" placeholder="Táticas, progresso, o que faltou...">${esc(readNote(id))}</textarea>
        <button data-ghp-savenote>Salvar nota</button>
      </div>`;
    box.querySelector('[data-ghp-fav]')?.addEventListener('click', () => {
      toggleFav(id);
      renderPlusSection(box, g);
      try { if (typeof window.steamRenderSidebarList === 'function') window.steamRenderSidebarList(); } catch { /* — */ }
    });
    box.querySelectorAll('[data-ghp-star]').forEach((b) => b.addEventListener('click', () => {
      setRating(id, Number(b.dataset.ghpStar));
      renderPlusSection(box, g);
    }));
    box.querySelector('[data-ghp-savenote]')?.addEventListener('click', () => {
      const ta = box.querySelector('[data-ghp-note]');
      saveNote(id, ta ? ta.value : '');
    });
  }

  function enhanceDetail(main, id) {
    const g = findGame(id);
    if (!g || !main) return false;
    const body = main.querySelector('.st-detail-body') || main;
    const box = document.createElement('div');
    box.className = 'gh-plusbox';
    body.appendChild(box);
    renderPlusSection(box, g);
    return true;
  }

  function enhanceLibrary() {
    const grid = document.getElementById('st-grid');
    if (!grid) return 0;
    let marked = 0;
    grid.querySelectorAll('.st-card').forEach((card) => {
      const onclick = card.getAttribute('onclick') || '';
      const match = onclick.match(/steamOpenDetail\('([^']+)'\)/);
      if (!match) return;
      const g = findGame(match[1]);
      if (!g) return;
      const m = metaOf(gameKey(g));
      if (!m.fav && !(m.rating > 0)) return;
      const sub = card.querySelector('.meta .sub');
      if (!sub || sub.querySelector('.gh-badge')) return;
      const badge = document.createElement('span');
      badge.className = 'gh-badge';
      badge.textContent = `${m.fav ? '★ ' : ''}${m.rating > 0 ? '★'.repeat(m.rating) : ''}`.trim();
      badge.title = `${m.fav ? 'Favorito' : ''}${m.fav && m.rating > 0 ? ' · ' : ''}${m.rating > 0 ? `Sua nota: ${m.rating}/5` : ''}`;
      sub.appendChild(badge);
      marked++;
    });
    return marked;
  }

  const api = {
    meta: metaOf, toggleFav, setRating, readNote, saveNote,
    unlock, hasAch, achievements: () => ACHIEVEMENTS.map((a) => ({ ...a, got: hasAch(a.id) })),
    dosList, scanDos, launchDos, removeDos,
    stats, fmtTime, renderProfile, gameKey,
    enhanceDetail, enhanceLibrary,
    _begin: beginSession, _tick: tick
  };
  window.VessieGameHubPlus = api;
  hookSteamPlay();
  document.addEventListener('vessieos:app-opened', (e) => {
    // Garante o wrap mesmo se steamPlay surgir depois deste arquivo.
    hookSteamPlay();
    if (e && e.detail && e.detail.id === 'games') checkCollector();
  });
})();

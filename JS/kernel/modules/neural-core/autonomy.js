/**
 * Vessie Autonomy — motor autônomo do VessieOS (Agent Loop: Observar → Pensar → Agir → Resultado).
 *
 *  Observar   telemetria real: hora, dia da semana, apps recentes, janelas abertas
 *  Pensar     o agente DQN ranqueia os apps pelo valor Q; opcionalmente o Vessie-AI (LM Studio) resume o aprendizado
 *  Agir       atualiza "Sugeridos pela IA" no Menu Iniciar (e, se ligado, notifica)
 *  Resultado  o app que o usuário abriu de fato vira recompensa: acerto = +, erro = −
 *
 * O agente aprende só com o uso real deste navegador; nada sai da máquina (o LM Studio é opcional e local).
 */
(function () {
  'use strict';
  const NS = window.VessieNeural;
  if (!NS || !NS.DQNAgent) { console.warn('[Autonomy] neural.js não carregado'); return; }

  const KEY_AGENT = 'vessieos:neural:agent', KEY_CFG = 'vessieos:neural:cfg';
  // γ baixo: sugerir um app quase não muda o que o usuário abre depois (quase um bandit contextual); alto causava divergência
  const AGENT_OPTS = { gamma: 0.3 };
  const REWARD = { hit: [1, 0.7, 0.5], miss: -0.2, actual: 1 };

  const E = {
    cfg: Object.assign({ autonomy: true, notify: false, llm: false }, safeParse(localStorage.getItem(KEY_CFG)) || {}),
    apps: [], agent: null, hist: [], lastState: null, lastSuggest: [], recs: [], log: [], insight: '', events: 0, ready: false,
  };

  function safeParse(s) { try { return JSON.parse(s); } catch (_) { return null; } }
  const save = () => { try { localStorage.setItem(KEY_AGENT, JSON.stringify(E.agent.toJSON())); } catch (_) { /* cota cheia: ignora */ } };
  const saveCfg = () => { try { localStorage.setItem(KEY_CFG, JSON.stringify(E.cfg)); } catch (_) { } };
  const emit = () => document.dispatchEvent(new CustomEvent('vessie:neural:update'));
  const note = (phase, text) => { E.log.unshift({ t: Date.now(), phase, text }); if (E.log.length > 60) E.log.pop(); };

  /* ---------- Observar ---------- */
  function observe() {
    const d = new Date(), h = d.getHours() + d.getMinutes() / 60, a = 2 * Math.PI * h / 24, w = 2 * Math.PI * d.getDay() / 7;
    const hist = new Float32Array(E.apps.length);
    E.hist.slice(-5).reverse().forEach((id, i) => { const k = E.apps.indexOf(id); if (k >= 0) hist[k] += Math.pow(0.6, i); });
    const wins = document.querySelectorAll('.win').length;
    return Float32Array.from([Math.sin(a), Math.cos(a), Math.sin(w), Math.cos(w), Math.min(wins, 8) / 8, ...hist]);
  }

  /* ---------- Pensar ---------- */
  function think(state) {
    const ranked = E.agent.rank(state, 3, true);
    return ranked.map(r => ({ id: E.apps[r.action], q: r.q, action: r.action }));
  }

  /* ---------- Agir ---------- */
  function act(plan) {
    E.lastSuggest = plan; E.recs = plan.map(p => p.id);
    renderStartMenu();
    note('agir', 'Sugeriu: ' + plan.map(p => nameOf(p.id)).join(', '));
    if (E.cfg.notify && E.agent.hitEma > 0.4 && window.toast) window.toast('Sugestão da IA: ' + nameOf(plan[0].id));
    emit();
  }

  /* ---------- Resultado ---------- */
  function onAppOpened(id) {
    const k = E.apps.indexOf(id); if (k < 0 || !E.agent) return;
    E.events++;
    if (E.lastState) {
      const s = E.lastState, s2 = (E.hist.push(id), observe());
      let hit = 0;
      E.lastSuggest.forEach((p, rank) => {
        const ok = p.id === id; if (ok) hit = 1;
        E.agent.remember(s, p.action, ok ? REWARD.hit[rank] : REWARD.miss, s2);
      });
      E.agent.remember(s, k, REWARD.actual, s2);           // crédito contrafactual: o que de fato aconteceu
      E.agent.hitEma = 0.9 * E.agent.hitEma + 0.1 * hit;
      for (let i = 0; i < 6; i++) E.agent.learn();
      note('resultado', `${nameOf(id)} — ${hit ? 'acertou' : 'errou'} a sugestão · acerto ${(E.agent.hitEma * 100).toFixed(0)}%`);
    } else E.hist.push(id);
    if (E.hist.length > 50) E.hist.shift();
    if (E.events % 5 === 0) save();
    loop();
    if (E.cfg.llm && E.events % 20 === 0) briefing();
  }

  function loop() {
    if (!E.cfg.autonomy || !E.agent) return;
    const s = observe(); E.lastState = s;
    note('observar', `${document.querySelectorAll('.win').length} janela(s) · ${new Date().getHours()}h`);
    act(think(s));
  }

  /* ---------- Vessie-AI (LM Studio): resumo em linguagem natural ---------- */
  async function briefing() {
    const host = (localStorage.getItem('vessie_local_ip') || 'http://localhost:1234').replace(/\/$/, '');
    const ctl = new AbortController(), to = setTimeout(() => ctl.abort(), 8000);
    try {
      const m = await (await fetch(host + '/v1/models', { signal: ctl.signal })).json();
      const model = m.data && m.data[0] && m.data[0].id; if (!model) throw new Error('sem modelo');
      const stats = { acerto: Math.round(E.agent.hitEma * 100) + '%', passos: E.agent.steps, sugestoes: E.recs.map(nameOf), hora: new Date().getHours() };
      const r = await fetch(host + '/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctl.signal,
        body: JSON.stringify({ model, temperature: 0.3, max_tokens: 120, messages: [
          { role: 'system', content: 'Você é o assistente do VessieOS. Responda em português, direto, em até 2 frases.' },
          { role: 'user', content: 'Resuma o que o modelo de aprendizado aprendeu sobre os hábitos do usuário: ' + JSON.stringify(stats) }] }),
      });
      E.insight = ((await r.json()).choices[0].message.content || '').trim();
      note('pensar', 'Vessie-AI gerou um resumo do aprendizado'); emit();
    } catch (e) { note('pensar', 'Vessie-AI indisponível (LM Studio fechado?)'); }
    finally { clearTimeout(to); }
    return E.insight;
  }

  /* ---------- Menu Iniciar ---------- */
  const nameOf = id => (E.byId[id] && E.byId[id].n) || id;
  function renderStartMenu() {
    const recent = document.getElementById('sm-recent'); if (!recent) return;
    let box = document.getElementById('sm-neural');
    if (!box) {
      box = document.createElement('div'); box.id = 'sm-neural';
      box.innerHTML = '<div class="sm-row-head" style="margin-top:16px"><span>Sugeridos pela IA</span></div><div class="sm-recent-list" id="sm-neural-list"></div>';
      recent.insertAdjacentElement('afterend', box);
    }
    const list = box.querySelector('#sm-neural-list'); list.innerHTML = '';
    const learning = E.agent.memory.size < 40;
    if (learning || !E.cfg.autonomy) { list.innerHTML = '<span class="sm-recent-empty">' + (E.cfg.autonomy ? 'Aprendendo seus hábitos…' : 'Autonomia desligada') + '</span>'; return; }
    E.recs.forEach(id => {
      const a = E.byId[id]; if (!a) return;
      const el = document.createElement('div'); el.className = 'sm-recent-item';
      el.innerHTML = `<span class="ri">${a.ic}</span> ${a.n}`;
      el.onclick = () => { window.openApp(id); const sm = document.getElementById('sm'); if (sm) sm.classList.remove('open'); };
      list.appendChild(el);
    });
  }

  /* ---------- Treino com rotina simulada (demonstração; o botão Resetar apaga tudo) ---------- */
  function simulateRoutine(n = 1500) {
    const pool = ['explorer', 'terminal', 'vessie', 'notepad', 'browser', 'music'].filter(id => E.apps.includes(id));
    if (pool.length < 3) return 0;
    const routine = h => pool[Math.min(pool.length - 1, Math.floor(h / (24 / pool.length)))];
    for (let i = 0; i < n; i++) {
      const h = Math.random() * 24, a = 2 * Math.PI * h / 24, w = 2 * Math.PI * ((Math.random() * 7) | 0) / 7;
      // histórico coerente com a rotina (apps das 3 horas anteriores), como no estado observado de verdade
      const hv = new Float32Array(E.apps.length);
      [1, 2, 3].forEach((d, i) => { hv[E.apps.indexOf(routine(((h - d) % 24 + 24) % 24))] += Math.pow(0.6, i); });
      const s = Float32Array.from([Math.sin(a), Math.cos(a), Math.sin(w), Math.cos(w), (1 + ((Math.random() * 4) | 0)) / 8, ...hv]);
      const real = E.apps.indexOf(routine(h)), sug = E.agent.rank(s, 3, true);
      // episódio de 1 passo (done=true): o Q aprendido vira a recompensa esperada, sem acumular o futuro
      sug.forEach((p, r) => E.agent.remember(s, p.action, p.action === real ? REWARD.hit[r] : REWARD.miss, s, true));
      E.agent.remember(s, real, REWARD.actual, s, true);
      E.agent.hitEma = 0.98 * E.agent.hitEma + 0.02 * (sug.some(p => p.action === real) ? 1 : 0);
      E.agent.learn();
    }
    save(); note('resultado', `Treino simulado: ${n} episódios`); loop(); return n;
  }

  function reset() {
    localStorage.removeItem(KEY_AGENT); E.hist = []; E.log = []; E.insight = ''; E.events = 0;
    E.agent = new NS.DQNAgent(5 + E.apps.length, E.apps.length, AGENT_OPTS); note('observar', 'Modelo reiniciado'); loop(); emit();
  }

  /* ---------- Inicialização (espera o main.js expor window.APPS) ---------- */
  function init() {
    if (E.ready) return true;
    const list = (window.APPS || []).filter(a => a && a.id);
    if (!list.length) return false;
    E.byId = Object.fromEntries(list.map(a => [a.id, a]));
    E.apps = list.map(a => a.id);
    const dim = 5 + E.apps.length;
    E.agent = new NS.DQNAgent(dim, E.apps.length, AGENT_OPTS);
    const saved = safeParse(localStorage.getItem(KEY_AGENT));
    if (saved && saved.stateDim === dim && saved.nActions === E.apps.length) { try { E.agent.load(saved); } catch (_) { } }
    document.addEventListener('vessieos:app-opened', ev => onAppOpened(ev.detail && ev.detail.id));
    setInterval(() => { if (E.cfg.autonomy) loop(); }, 60000);
    E.ready = true; loop(); note('observar', 'Motor autônomo iniciado'); return true;
  }
  // window.APPS só existe depois que o Menu Iniciar é renderizado (pós-login): inicia por evento,
  // com sondagem de reserva, sem desistir cedo se o usuário ficar na tela de login.
  document.addEventListener('vessieos:startmenu-rendered', init);
  document.addEventListener('vessieos:app-opened', init);
  let tries = 0; const iv = setInterval(() => { if (init() || ++tries > 480) clearInterval(iv); }, 500);

  NS.autonomy = Object.assign(E, { observe, think, act, loop, briefing, simulateRoutine, reset, save, saveCfg, nameOf });
})();

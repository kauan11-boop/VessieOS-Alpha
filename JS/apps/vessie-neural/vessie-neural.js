// vessie-neural/vessie-neural.js — Vessie Neural: painel da rede neural e do agente autônomo (Deep RL).
(function () {
  'use strict';
  const CSS = `
  .vn{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);grid-template-rows:auto 1fr auto;gap:12px;height:100%;padding:14px;box-sizing:border-box;color:var(--text);font-family:var(--font-ui,inherit);overflow:auto}
  .vn-stats{grid-column:1/-1;display:flex;gap:10px;flex-wrap:wrap}
  .vn-stat{flex:1 1 110px;padding:10px 12px;border:1px solid var(--hairline);border-radius:8px;background:var(--surface)}
  .vn-stat b{display:block;font:600 1.15rem var(--font-mono,monospace);color:var(--text)}
  .vn-stat span{font-size:.72rem;color:var(--dim)}
  .vn-card{border:1px solid var(--hairline);border-radius:8px;background:var(--surface);padding:12px;min-width:0}
  .vn-card h4{margin:0 0 8px;font-size:.8rem;font-weight:600;color:var(--text-2)}
  .vn canvas{width:100%;display:block}
  .vn-q{display:grid;grid-template-columns:96px 1fr 44px;gap:8px;align-items:center;font-size:.76rem;margin:6px 0}
  .vn-q i{display:block;height:6px;border-radius:3px;background:var(--surface-3);overflow:hidden}
  .vn-q i u{display:block;height:100%;background:var(--ai,#5eead4);transition:width .4s}
  .vn-q em{font:normal .72rem var(--font-mono,monospace);color:var(--dim);text-align:right}
  .vn-log{font:.72rem/1.55 var(--font-mono,monospace);color:var(--text-2);max-height:132px;overflow:auto}
  .vn-log span{color:var(--ai,#5eead4);margin-right:6px}
  .vn-ctl{grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap;align-items:center}
  .vn-ctl label{display:flex;gap:6px;align-items:center;font-size:.78rem;color:var(--text-2);margin-right:8px}
  .vn-btn{padding:7px 12px;border:1px solid var(--border-strong);border-radius:6px;background:var(--surface-2);color:var(--text);font-size:.78rem;cursor:pointer}
  .vn-btn:hover{background:var(--surface-3)}
  .vn-insight{grid-column:1/-1;font-size:.8rem;color:var(--text-2);border-left:2px solid var(--ai,#5eead4);padding:2px 10px}
  @media(max-width:640px){.vn{grid-template-columns:1fr}}`;

  function openNeural() {
    if (!document.getElementById('vn-css')) { const s = document.createElement('style'); s.id = 'vn-css'; s.textContent = CSS; document.head.appendChild(s); }
    const win = createWin('Vessie Neural', '<i class="fas fa-brain"></i>', `
      <div class="vn">
        <div class="vn-stats">
          <div class="vn-stat"><b id="vn-hit">0%</b><span>acerto das sugestões</span></div>
          <div class="vn-stat"><b id="vn-steps">0</b><span>passos de treino</span></div>
          <div class="vn-stat"><b id="vn-eps">0.00</b><span>exploração (ε)</span></div>
          <div class="vn-stat"><b id="vn-loss">0.000</b><span>perda (Huber)</span></div>
          <div class="vn-stat"><b id="vn-mem">0</b><span>experiências</span></div>
        </div>
        <div class="vn-card"><h4>Rede Double DQN em tempo real</h4><canvas id="vn-net" width="560" height="260"></canvas></div>
        <div class="vn-card"><h4>Próximo app mais provável (valor Q)</h4><div id="vn-qs"></div>
          <h4 style="margin-top:14px">Aprendizado</h4><canvas id="vn-chart" width="300" height="90"></canvas></div>
        <div class="vn-card" style="grid-column:1/-1"><h4>Agent Loop · observar → pensar → agir → resultado</h4><div class="vn-log" id="vn-log"></div></div>
        <div class="vn-insight" id="vn-insight" hidden></div>
        <div class="vn-ctl">
          <label><input type="checkbox" id="vn-auto"> Autonomia</label>
          <label><input type="checkbox" id="vn-notify"> Notificar sugestões</label>
          <label><input type="checkbox" id="vn-llm"> Resumo pelo Vessie-AI (LM Studio)</label>
          <button class="vn-btn" id="vn-sim">Treinar com rotina simulada</button>
          <button class="vn-btn" id="vn-brief">Gerar resumo</button>
          <button class="vn-btn" id="vn-export">Exportar pesos</button>
          <button class="vn-btn" id="vn-reset">Reiniciar modelo</button>
        </div>
      </div>`, 900, 640);
    const $ = id => win.querySelector('#' + id), A = () => window.VessieNeural && window.VessieNeural.autonomy;
    if (!A() || !A().ready) { win.querySelector('.vn').innerHTML = '<p class="vn-insight" style="grid-column:1/-1">O motor neural ainda está iniciando. Feche e abra de novo em alguns segundos.</p>'; return win; }

    const cfg = A().cfg;
    [['vn-auto', 'autonomy'], ['vn-notify', 'notify'], ['vn-llm', 'llm']].forEach(([id, k]) => {
      $(id).checked = !!cfg[k]; $(id).onchange = e => { cfg[k] = e.target.checked; A().saveCfg(); if (k === 'autonomy') A().loop(); };
    });
    $('vn-sim').onclick = () => { $('vn-sim').disabled = true; setTimeout(() => { A().simulateRoutine(1500); $('vn-sim').disabled = false; draw(); }, 30); };
    $('vn-brief').onclick = async () => { $('vn-brief').disabled = true; await A().briefing(); $('vn-brief').disabled = false; draw(); };
    $('vn-reset').onclick = () => { if (confirm('Apagar tudo o que o modelo aprendeu?')) { A().reset(); draw(); } };
    $('vn-export').onclick = () => {
      const a = document.createElement('a'); a.download = 'vessie-neural-pesos.json';
      a.href = URL.createObjectURL(new Blob([JSON.stringify(A().agent.toJSON())], { type: 'application/json' })); a.click(); URL.revokeObjectURL(a.href);
    };

    const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    function drawNet() {
      const c = $('vn-net'), g = c.getContext('2d'), ag = A().agent, W = c.width, H = c.height;
      g.clearRect(0, 0, W, H);
      const acts = ag.online.forward(A().lastState || new Float32Array(ag.stateDim));
      const cols = acts.length, show = [14, 10, 10, 8], ai = css('--ai') || '#5eead4', dim = css('--muted') || '#5b6172';
      const pos = acts.map((layer, l) => {
        const n = Math.min(layer.length, show[Math.min(l, 3)]), idx = Array.from({ length: n }, (_, i) => Math.round(i * (layer.length - 1) / Math.max(1, n - 1)));
        return idx.map((k, i) => ({ k, x: 40 + l * (W - 80) / (cols - 1), y: 20 + (i + 0.5) * (H - 40) / n, v: layer[k] }));
      });
      for (let l = 0; l < pos.length - 1; l++) pos[l].forEach(a => pos[l + 1].forEach(b => {
        const w = ag.online.W[l][b.k * ag.online.sizes[l] + a.k];
        g.strokeStyle = w > 0 ? 'rgba(94,234,212,' + Math.min(.35, Math.abs(w) * .5) + ')' : 'rgba(148,163,184,' + Math.min(.25, Math.abs(w) * .4) + ')';
        g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
      }));
      pos.forEach(layer => { const mx = Math.max(.001, ...layer.map(n => Math.abs(n.v))); layer.forEach(n => {
        g.beginPath(); g.arc(n.x, n.y, 5, 0, 7); g.fillStyle = dim; g.fill();
        g.globalAlpha = Math.min(1, Math.abs(n.v) / mx); g.fillStyle = ai; g.fill(); g.globalAlpha = 1;
      }); });
    }
    function drawChart() {
      const c = $('vn-chart'), g = c.getContext('2d'), h = A().agent.history; g.clearRect(0, 0, c.width, c.height);
      [['hit', css('--ai') || '#5eead4'], ['loss', css('--a') || '#8e8ff0']].forEach(([k, col]) => {
        const d = h[k]; if (d.length < 2) return; const mx = Math.max(0.001, ...d), mn = Math.min(0, ...d);
        g.strokeStyle = col; g.lineWidth = 1.5; g.beginPath();
        d.forEach((v, i) => { const x = i * c.width / (d.length - 1), y = c.height - 4 - (v - mn) / (mx - mn || 1) * (c.height - 8); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
      });
    }
    function draw() {
      const E = A(), ag = E.agent;
      $('vn-hit').textContent = Math.round(ag.hitEma * 100) + '%'; $('vn-steps').textContent = ag.steps;
      $('vn-eps').textContent = ag.eps.toFixed(2); $('vn-loss').textContent = ag.loss.toFixed(3); $('vn-mem').textContent = ag.memory.size;
      const q = ag.q(E.lastState || E.observe()), idx = Array.from(q.keys()).sort((a, b) => q[b] - q[a]).slice(0, 5), mx = Math.max(...idx.map(i => q[i])), mn = Math.min(...idx.map(i => q[i]));
      $('vn-qs').innerHTML = idx.map(i => `<div class="vn-q"><span>${E.nameOf(E.apps[i])}</span><i><u style="width:${8 + 92 * (q[i] - mn) / ((mx - mn) || 1)}%"></u></i><em>${q[i].toFixed(2)}</em></div>`).join('');
      $('vn-log').innerHTML = E.log.slice(0, 8).map(l => `<div><span>${l.phase}</span>${l.text}</div>`).join('');
      const ins = $('vn-insight'); ins.hidden = !E.insight; ins.textContent = E.insight;
      drawNet(); drawChart();
    }
    draw();
    const iv = setInterval(() => { if (!document.body.contains(win)) { clearInterval(iv); document.removeEventListener('vessie:neural:update', draw); } else draw(); }, 1500);
    document.addEventListener('vessie:neural:update', draw);
    return win;
  }
  window.openNeural = openNeural;
})();

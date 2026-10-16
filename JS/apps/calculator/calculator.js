// calculator/calculator.js — Calculadora (pasta com view.html + view.css + calculator.js)
// Shell estático em view.html; fallback inline idêntico (só usado sem fetch).
// Lógica e fiação 100% preservadas, apenas movidas para wireCalc(win).
(function () {
  "use strict";

const CALC_FALLBACK_HTML = `<div class="calc">
  <div class="c-mem">
    <button class="cmb" data-mem="mc" title="Limpar memória">MC</button>
    <button class="cmb" data-mem="mr" title="Chamar memória">MR</button>
    <button class="cmb" data-mem="mplus" title="Somar à memória">M+</button>
    <button class="cmb" data-mem="mminus" title="Subtrair da memória">M-</button>
    <span class="cm-indicator" id="cm-indicator"></span>
  </div>
  <div class="c-disp">
    <div class="c-expr" id="c-expr" title="Clique para ver o histórico"></div>
    <div class="c-val" id="c-val">0</div>
  </div>
  <div class="c-history" id="c-history" style="display:none"></div>
  <div class="c-grid" id="c-grid"></div>
</div>`;

function openCalc() {
    const win = createWin('Calculadora', '🔢', '<div class="app-loading">Carregando…</div>', 320, 500);
    const wire = () => wireCalc(win);
    if (window.VessieBridge && typeof window.VessieBridge.loadView === 'function') {
      window.VessieBridge.loadView('calculator', { html: CALC_FALLBACK_HTML }, {}).then(({ html }) => {
        if (!document.body.contains(win)) return;
        win.querySelector('.wb').innerHTML = html;
        wire();
      });
    } else {
      win.querySelector('.wb').innerHTML = CALC_FALLBACK_HTML;
      wire();
    }
    return win;
  }

function wireCalc(win) {
    const BTNS = [['cl', 'C', 'clear'], ['op', '±', 'op'], ['op', '%', 'op'], ['op', '÷', 'op'], ['', '7', 'num'], ['', '8', 'num'], ['', '9', 'num'], ['op', '×', 'op'], ['', '4', 'num'], ['', '5', 'num'], ['', '6', 'num'], ['op', '−', 'op'], ['', '1', 'num'], ['', '2', 'num'], ['', '3', 'num'], ['op', '+', 'op'], ['', '0', 'num', 'zero'], ['', '.', 'num'], ['eq', '=', 'eq']];
    const grid = win.querySelector('#c-grid');
    const vEl = win.querySelector('#c-val');
    const eEl = win.querySelector('#c-expr');
    const historyEl = win.querySelector('#c-history');
    const memIndicator = win.querySelector('#cm-indicator');
    let cur = '0', expr = '', waitNext = false;
    let memory = 0, hasMemory = false;
    const history = [];

    function refresh() {
      vEl.textContent = cur; eEl.textContent = expr;
      vEl.style.animation = 'pulse .15s ease'; setTimeout(() => vEl.style.animation = '', 150);
    }
    function renderHistory() {
      historyEl.innerHTML = history.length
        ? history.slice(-20).reverse().map((h, i) => `<div class="ch-item" data-i="${history.length - 1 - i}"><span class="ch-expr">${h.expr}</span><span class="ch-res">${h.result}</span></div>`).join('')
        : '<div class="ch-empty">Sem histórico ainda</div>';
    }
    function press(lbl, type) {
      if (type === 'clear') { cur = '0'; expr = ''; waitNext = false; }
      else if (lbl === '⌫') { cur = cur.length > 1 ? cur.slice(0, -1) : '0'; }
      else if (lbl === '±') { cur = (parseFloat(cur) * -1).toString(); }
      else if (lbl === '%') { cur = (parseFloat(cur) / 100).toString(); }
      else if (type === 'op') { expr = cur + ' ' + lbl + ' '; waitNext = true; }
      else if (type === 'eq') {
        try {
          const fullExpr = expr + cur;
          const e = fullExpr.replace(/÷/g, '/').replace(/×/g, '*').replace(/−/g, '-');
          const result = String(Function('"use strict";return(' + e + ')')());
          if (expr) { history.push({ expr: fullExpr, result }); renderHistory(); }
          cur = result.length > 12 ? parseFloat(result).toExponential(4) : result;
        } catch { cur = 'Erro'; }
        expr = ''; waitNext = false;
      } else { if (waitNext) { cur = lbl === '.' ? '0.' : lbl; waitNext = false; } else { cur = cur === '0' && lbl !== '.' ? lbl : (cur + lbl); } }
      refresh();
    }

    BTNS.forEach(([cls, lbl, type, extra]) => {
      const btn = document.createElement('button');
      btn.className = `cb${cls ? ' ' + cls : ''}${extra ? ' ' + extra : ''}`;
      btn.textContent = lbl;
      btn.onclick = () => press(lbl, type);
      grid.appendChild(btn);
    });

    // ---------- memória (MC / MR / M+ / M-) ----------
    win.querySelectorAll('.cmb').forEach((btn) => {
      btn.onclick = () => {
        const val = parseFloat(cur) || 0;
        if (btn.dataset.mem === 'mc') { memory = 0; hasMemory = false; }
        else if (btn.dataset.mem === 'mr') { cur = String(memory); refresh(); }
        else if (btn.dataset.mem === 'mplus') { memory += val; hasMemory = true; }
        else if (btn.dataset.mem === 'mminus') { memory -= val; hasMemory = true; }
        memIndicator.textContent = hasMemory ? 'M' : '';
      };
    });

    // ---------- histórico (clique na expressão abre/fecha) ----------
    eEl.onclick = () => { historyEl.style.display = historyEl.style.display === 'none' ? 'block' : 'none'; renderHistory(); };
    historyEl.addEventListener('click', (e) => {
      const item = e.target.closest('.ch-item');
      if (!item) return;
      const entry = history[Number(item.dataset.i)];
      if (entry) { cur = entry.result; expr = ''; refresh(); historyEl.style.display = 'none'; }
    });

    // ---------- teclado ----------
    function keyHandler(e) {
      if (!win.classList.contains('focused')) return;
      const key = e.key;
      if (/^[0-9]$/.test(key)) { press(key, 'num'); }
      else if (key === '.') { press('.', 'num'); }
      else if (key === '+') { press('+', 'op'); }
      else if (key === '-') { press('−', 'op'); }
      else if (key === '*') { press('×', 'op'); }
      else if (key === '/') { e.preventDefault(); press('÷', 'op'); }
      else if (key === 'Enter' || key === '=') { press('=', 'eq'); }
      else if (key === 'Backspace') { press('⌫'); }
      else if (key === 'Escape') { press('C', 'clear'); }
      else if (key === '%') { press('%'); }
      else return;
      e.preventDefault();
    }
    document.addEventListener('keydown', keyHandler);
    win.addEventListener('remove', () => document.removeEventListener('keydown', keyHandler));
    win.querySelector('[data-act="cls"]')?.addEventListener('click', () => document.removeEventListener('keydown', keyHandler));

    refresh();
  }
window.openCalc = openCalc;
})();

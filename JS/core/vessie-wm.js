/* ==================================================================
   VessieWM — biblioteca própria de gerenciamento de janelas do VessieOS
   ------------------------------------------------------------------
   Antes, tudo isso vivia espalhado dentro de JS/core/main.js:
   createWin() montava a janela E cuidava de arrastar, e cada janela
   criada registrava seu PRÓPRIO listener global de mousemove/mouseup
   em `document` que nunca era removido — abrir e fechar 50 janelas
   numa sessão deixava 50 listeners "mortos" (mas ainda rodando a cada
   movimento do mouse) acumulados pra sempre. Também não existia
   redimensionamento por nenhuma borda além do canto inferior direito
   (resize:both nativo do CSS, sem controle de mínimo por viewport nem
   integração com snap).

   Esta biblioteca centraliza tudo isso num único lugar, com UMA
   instância de listeners globais (drag/resize de QUALQUER janela usa
   os mesmos três listeners, nunca acumula), redimensionamento nas 8
   direções, e uma API pública de verdade — em vez de funções soltas.

   COMPATIBILIDADE: window.createWin(title, icon, content, w, h)
   continua existindo com a MESMA assinatura e devolvendo o MESMO
   elemento DOM (.win > .wh + .wb) de antes — é agora só uma chamada
   fina para VessieWM.create(), então nenhum dos ~30 apps que já usam
   createWin() precisa mudar uma linha.
   ================================================================== */

(function () {
  "use strict";

  const MIN_W = 300, MIN_H = 220;
  // Área útil = viewport menos a taskbar (que pode estar em qualquer borda
  // e com altura/largura ajustável — ver body[data-tbpos] + --th).
  function workArea() {
    let pos = 'bottom', th = 52;
    try { pos = document.body.dataset.tbpos || 'bottom'; } catch (_) {}
    try {
      const v = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--th'));
      if (Number.isFinite(v) && v > 0) th = v;
    } catch (_) {}
    const tbHidden = (() => { const tb = document.getElementById('tb'); return !tb || tb.style.display === 'none'; })();
    const t = tbHidden ? 0 : th;
    const vertical = pos === 'left' || pos === 'right';
    return {
      x: (!tbHidden && pos === 'left') ? t : 0,
      y: (!tbHidden && pos === 'top') ? t : 0,
      w: window.innerWidth - ((!tbHidden && vertical) ? t : 0),
      h: window.innerHeight - ((!tbHidden && !vertical) ? t : 0)
    };
  }
  let nextPid = 1000;
  window.__winCounter = window.__winCounter || { n: 0 };
  window.S = window.S || { nextZ: 100 };

  const windows = new Map(); // id -> { el, minimized, maximized, savedStyle }
  const listeners = {};      // evento -> [callbacks]

  function emit(event, detail) {
    (listeners[event] || []).forEach(cb => { try { cb(detail); } catch (e) { console.warn('[VessieWM]', event, e); } });
    document.dispatchEvent(new CustomEvent('vessiewm:' + event, { detail }));
  }

  // ---------------- estado compartilhado de arrastar/redimensionar ----------------
  // Só existe UMA operação ativa por vez no sistema inteiro (não dá pra
  // arrastar duas janelas ao mesmo tempo com um mouse só), então um único
  // objeto de estado + três listeners globais bastam pra todas as janelas.
  let op = null; // { type:'drag'|'resize', id, dir, sx, sy, sTop, sLeft, sW, sH }

  function beginDrag(id, e) {
    const rec = windows.get(id); if (!rec || rec.maximized) return;
    op = { type: 'drag', id, sx: e.clientX, sy: e.clientY, sTop: rec.el.offsetTop, sLeft: rec.el.offsetLeft };
    VessieWM.focus(id);
  }

  function beginResize(id, dir, e) {
    const rec = windows.get(id); if (!rec || rec.maximized) return;
    e.stopPropagation();
    op = {
      type: 'resize', id, dir, sx: e.clientX, sy: e.clientY,
      sTop: rec.el.offsetTop, sLeft: rec.el.offsetLeft,
      sW: rec.el.offsetWidth, sH: rec.el.offsetHeight
    };
    VessieWM.focus(id);
  }

  document.addEventListener('mousemove', (e) => {
    if (!op) return;
    const rec = windows.get(op.id); if (!rec) { op = null; return; }
    const el = rec.el;
    const wa = workArea(), vw = wa.w, vh = wa.h;
    const dx = e.clientX - op.sx, dy = e.clientY - op.sy;

    if (op.type === 'drag') {
      let nx = op.sLeft + dx, ny = op.sTop + dy;
      nx = Math.max(wa.x, Math.min(nx, wa.x + vw - el.offsetWidth));
      ny = Math.max(wa.y, Math.min(ny, wa.y + vh - el.offsetHeight));
      el.style.left = nx + 'px'; el.style.top = ny + 'px';
      return;
    }

    // resize: cada direção mexe só nos lados que faz sentido (N/W também
    // deslocam a posição, além do tamanho — S/E só crescem/encolhem).
    // Mínimos relativos à viewport: em telas pequenas o mínimo absoluto
    // (300x220) seria maior que a própria tela.
    const mW = Math.max(200, Math.min(MIN_W, vw - 24));
    const mH = Math.max(160, Math.min(MIN_H, vh - 24));
    const d = op.dir;
    if (d.includes('e')) el.style.width = Math.max(mW, Math.min(op.sW + dx, wa.x + vw - op.sLeft)) + 'px';
    if (d.includes('s')) el.style.height = Math.max(mH, Math.min(op.sH + dy, wa.y + vh - op.sTop)) + 'px';
    if (d.includes('w')) {
      const w = Math.max(mW, Math.min(op.sW - dx, op.sLeft + op.sW - wa.x));
      el.style.width = w + 'px';
      el.style.left = (op.sLeft + op.sW - w) + 'px';
    }
    if (d.includes('n')) {
      const h = Math.max(mH, Math.min(op.sH - dy, op.sTop + op.sH - wa.y));
      el.style.height = h + 'px';
      el.style.top = (op.sTop + op.sH - h) + 'px';
    }
  });

  document.addEventListener('mouseup', () => { op = null; });

  // Reencaixa todas as janelas quando a resolução muda (zoom, redimensionar
  // o navegador, girar o celular): nenhuma janela fica maior que a viewport
  // nem presa para fora da área visível. Maximized usam CSS (inset 0).
  function fitAll() {
    const wa = workArea(), vw = wa.w, vh = wa.h;
    windows.forEach((rec) => {
      const el = rec.el;
      if (rec.maximized || el.classList.contains('maximized')) return;
      const mW = Math.max(200, Math.min(MIN_W, vw - 24));
      const mH = Math.max(160, Math.min(MIN_H, vh - 24));
      const w = Math.max(mW, Math.min(el.offsetWidth || mW, vw - 8));
      const h = Math.max(mH, Math.min(el.offsetHeight || mH, vh - 8));
      el.style.width = w + 'px'; el.style.height = h + 'px';
      const curL = parseFloat(el.style.left);
      const curT = parseFloat(el.style.top);
      const cl = Number.isFinite(curL) ? curL : el.offsetLeft;
      const ct = Number.isFinite(curT) ? curT : el.offsetTop;
      el.style.left = Math.max(wa.x, Math.min(cl, wa.x + vw - 80)) + 'px';
      el.style.top = Math.max(wa.y, Math.min(ct, wa.y + vh - 40)) + 'px';
    });
  }

  let fitT = null;
  window.addEventListener('resize', () => {
    clearTimeout(fitT);
    fitT = setTimeout(fitAll, 150);
  });

  // ---------------- snap layouts (flyout do botão maximizar) ----------------
  const SNAP_LAYOUTS = [
    { cls: 'l-half', cells: [{ x: 0, y: 0, w: .5, h: 1 }, { x: .5, y: 0, w: .5, h: 1 }] },
    { cls: 'l-thirds', cells: [{ x: 0, y: 0, w: .667, h: 1 }, { x: .667, y: 0, w: .333, h: 1 }] },
    { cls: 'l-thirds-r', cells: [{ x: 0, y: 0, w: .333, h: 1 }, { x: .333, y: 0, w: .667, h: 1 }] },
    { cls: 'l-quad', cells: [{ x: 0, y: 0, w: .5, h: .5 }, { x: .5, y: 0, w: .5, h: .5 }, { x: 0, y: .5, w: .5, h: .5 }, { x: .5, y: .5, w: .5, h: .5 }] }
  ];

  function attachSnapFlyout(id) {
    const rec = windows.get(id); if (!rec) return;
    const maxBtn = rec.el.querySelector('[data-act="max"]');
    if (!maxBtn) return;
    let flyout = null, hoverT = null, leaveT = null;

    function build() {
      const el = document.createElement('div');
      el.className = 'snap-flyout';
      SNAP_LAYOUTS.forEach(layout => {
        const thumb = document.createElement('div');
        thumb.className = `snap-layout-thumb ${layout.cls}`;
        thumb.title = 'Aplicar este layout';
        layout.cells.forEach(() => thumb.appendChild(document.createElement('span')));
        thumb.onclick = (e) => { e.stopPropagation(); VessieWM.snap(id, layout.cells[0]); hide(true); };
        el.appendChild(thumb);
      });
      document.body.appendChild(el);
      return el;
    }
    function show() {
      clearTimeout(leaveT);
      if (!flyout) flyout = build();
      const r = maxBtn.getBoundingClientRect();
      flyout.style.top = (r.bottom + 6) + 'px';
      flyout.style.left = Math.max(8, r.right - 300) + 'px';
      requestAnimationFrame(() => flyout.classList.add('show'));
      flyout.onmouseenter = () => clearTimeout(leaveT);
      flyout.onmouseleave = () => hide();
    }
    function hide(immediate) {
      if (!flyout) return;
      const run = () => flyout && flyout.classList.remove('show');
      if (immediate) run(); else leaveT = setTimeout(run, 150);
    }
    maxBtn.addEventListener('mouseenter', () => { clearTimeout(hoverT); hoverT = setTimeout(show, 450); });
    maxBtn.addEventListener('mouseleave', () => { clearTimeout(hoverT); hide(); });
    rec.el.querySelector('.wbtn.cl')?.addEventListener('click', () => flyout?.remove(), { once: true });
  }

  // ---------------- taskbar ----------------
  // Botões reordenáveis por arrastar (HTML5 DnD): a ordem é só visual no
  // DOM — o registro `windows` continua por id, então foco/minimizar não
  // mudam. Respeita o cadeado da barra (ver taskbar.js).
  let dragBtn = null;
  function tbLocked() {
    try { return JSON.parse(localStorage.getItem('vessieos_taskbar') || '{}').locked === true; }
    catch (_) { return false; }
  }
  function addTaskbarBtn(id, title, icon) {
    const host = document.getElementById('tb-wins'); if (!host) return;
    const el = document.createElement('button');
    el.className = 'twb open aw'; el.dataset.win = id;
    el.title = title;
    el.setAttribute('aria-label', title);
    el.draggable = true;
    el.innerHTML = `<span class="tb-i" aria-hidden="true">${icon}</span>`;
    el.onclick = () => {
      const rec = windows.get(id); if (!rec) return;
      if (rec.minimized) VessieWM.restore(id);
      else if (rec.el.classList.contains('focused')) VessieWM.minimize(id);
      else VessieWM.focus(id);
    };
    // Context menu on right-click
    el.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openTaskbarButtonMenu(e, id, title, icon, el);
    });
    el.addEventListener('dragstart', (e) => {
      if (tbLocked()) {
        e.preventDefault();
        try { if (typeof window.toast === 'function') window.toast('🔒 Barra bloqueada: desbloqueie para reordenar.', 'error'); } catch (_) {}
        return;
      }
      dragBtn = el;
      el.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      try { e.dataTransfer.setData('text/plain', id); } catch (_) {}
    });
    el.addEventListener('dragend', () => {
      dragBtn = null;
      el.classList.remove('dragging');
      host.querySelectorAll('.twb.drop-hint').forEach(b => b.classList.remove('drop-hint'));
    });
    el.addEventListener('dragover', (e) => {
      if (!dragBtn || dragBtn === el) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      host.querySelectorAll('.twb.drop-hint').forEach(b => b.classList.remove('drop-hint'));
      el.classList.add('drop-hint');
    });
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!dragBtn || dragBtn === el) return;
      const items = [...host.querySelectorAll('.twb')];
      const from = items.indexOf(dragBtn), to = items.indexOf(el);
      if (from < 0 || to < 0) return;
      if (from < to) host.insertBefore(dragBtn, el.nextSibling);
      else host.insertBefore(dragBtn, el);
      try { if (typeof window.persistState === 'function') window.persistState(); } catch (_) {}
    });
    host.appendChild(el);
  }
  function removeTaskbarBtn(id) { document.querySelector(`.twb[data-win="${id}"]`)?.remove(); }

  // ==================== API PÚBLICA ====================
  const VessieWM = {
    /** Cria uma janela. Devolve o elemento .win (mesma forma de sempre). */
    create({ title = '', icon = '', content = '', width = 700, height = 500, appId = null } = {}) {
      const id = `win${++window.__winCounter.n}`;
      const wa = workArea(), vw = wa.w, vh = wa.h;
      const maxW = Math.max(320, vw - 20), maxH = Math.max(260, vh - 20);
      width = Math.min(width, maxW); height = Math.min(height, maxH);
      const autoMax = vw < 820 || vh < 540;
      const top = autoMax ? wa.y : Math.max(wa.y + 10, Math.min(wa.y + Math.random() * 120 + 30, wa.y + vh - height - 10));
      const left = autoMax ? wa.x : Math.max(wa.x + 10, Math.min(wa.x + Math.random() * 200 + 40, wa.x + vw - width - 10));
      if (autoMax) { width = maxW; height = maxH; }

      const el = document.createElement('div');
      el.className = 'win' + (autoMax ? ' maximized' : ''); el.id = id;
      if (appId) el.dataset.app = appId;
      el.style.cssText = `width:${width}px;height:${height}px;top:${top}px;left:${left}px;z-index:${++window.S.nextZ};max-width:100vw;max-height:100vh;resize:none;`;
      el.innerHTML = `
        <div class="wh" id="${id}-hdr">
          <span class="w-ico">${icon}</span>
          <span class="w-title">${title}</span>
          <div class="wctrl">
            <button class="wbtn" data-act="min" title="Minimizar"><i class="fas fa-minus"></i></button>
            <button class="wbtn" data-act="max" title="Maximizar"><i class="fas fa-square" style="font-size:.65rem"></i></button>
            <button class="wbtn cl" data-act="cls" title="Fechar"><i class="fas fa-times"></i></button>
          </div>
        </div>
        <div class="wb">${content}</div>
        ${['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].map(d => `<div class="wrh wrh-${d}" data-dir="${d}"></div>`).join('')}
      `;

      windows.set(id, { el, pid: nextPid++, minimized: false, maximized: autoMax, savedStyle: null });

      el.querySelector('[data-act="cls"]').onclick = () => VessieWM.close(id);
      el.querySelector('[data-act="min"]').onclick = () => VessieWM.minimize(id);
      el.querySelector('[data-act="max"]').onclick = () => VessieWM.toggleMaximize(id);

      const hdr = el.querySelector('.wh');
      hdr.addEventListener('mousedown', (e) => { if (!e.target.closest('.wctrl')) beginDrag(id, e); });
      hdr.addEventListener('dblclick', (e) => { if (!e.target.closest('.wctrl')) VessieWM.toggleMaximize(id); });
      el.addEventListener('mousedown', () => VessieWM.focus(id));

      el.querySelectorAll('.wrh').forEach(h => h.addEventListener('mousedown', (e) => beginResize(id, h.dataset.dir, e)));

      document.getElementById('desktop').appendChild(el);
      addTaskbarBtn(id, title, icon);
      attachSnapFlyout(id);
      VessieWM.focus(id);
      emit('create', { id, el });
      return el;
    },

    focus(id) {
      document.querySelectorAll('.win').forEach(w => w.classList.remove('focused'));
      const rec = windows.get(id);
      if (rec) {
        rec.el.classList.add('focused');
        rec.el.classList.remove('minimized');
        rec.el.style.zIndex = ++window.S.nextZ;
        rec.minimized = false;
      }
      document.querySelectorAll('.twb').forEach(b => b.classList.toggle('aw', b.dataset.win === id));
      emit('focus', { id });
    },

    /** Lista as janelas reais do sistema (usado pelo Terminal: ps/kill). */
    list() {
      const out = [];
      windows.forEach((rec, id) => {
        out.push({
          id,
          pid: rec.pid,
          title: rec.el.querySelector('.w-title')?.textContent?.trim() || id,
          app: rec.el.dataset.app || '',
          minimized: !!rec.minimized,
          maximized: !!rec.maximized || rec.el.classList.contains('maximized')
        });
      });
      return out.sort((a, b) => a.pid - b.pid);
    },

    close(id) {
      const rec = windows.get(id); if (!rec) return;
      rec.el.style.opacity = '0'; rec.el.style.transform = 'scale(.96)';
      rec.el.style.transition = 'opacity .15s,transform .15s';
      setTimeout(() => rec.el.remove(), 160);
      removeTaskbarBtn(id);
      windows.delete(id);
      emit('close', { id });
    },

    minimize(id) {
      const rec = windows.get(id); if (!rec) return;
      rec.el.classList.add('minimized'); rec.minimized = true;
      document.querySelector(`.twb[data-win="${id}"]`)?.classList.remove('aw');
      emit('minimize', { id });
    },

    restore(id) {
      const rec = windows.get(id); if (!rec) return;
      rec.el.classList.remove('minimized'); rec.minimized = false;
      VessieWM.focus(id);
      emit('restore', { id });
    },

    toggleMaximize(id) {
      const rec = windows.get(id); if (!rec) return;
      if (!rec.maximized) {
        rec.savedStyle = { top: rec.el.style.top, left: rec.el.style.left, width: rec.el.style.width, height: rec.el.style.height };
        rec.el.classList.add('maximized'); rec.maximized = true;
      } else {
        if (rec.savedStyle) Object.assign(rec.el.style, rec.savedStyle);
        rec.el.classList.remove('maximized'); rec.maximized = false;
      }
      emit('maximize', { id, maximized: rec.maximized });
    },

    /** Aplica um recorte de Snap Layout (metade/terço/quadrante da tela). */
    snap(id, cell) {
      const rec = windows.get(id); if (!rec) return;
      if (!rec.maximized) rec.savedStyle = { top: rec.el.style.top, left: rec.el.style.left, width: rec.el.style.width, height: rec.el.style.height };
      rec.el.classList.remove('maximized'); rec.maximized = false;
      const wa = workArea(), vw = wa.w, vh = wa.h;
      rec.el.style.left = Math.round(wa.x + cell.x * vw) + 'px';
      rec.el.style.top = Math.round(wa.y + cell.y * vh) + 'px';
      rec.el.style.width = Math.round(cell.w * vw) + 'px';
      rec.el.style.height = Math.round(cell.h * vh) + 'px';
      emit('snap', { id, cell });
    },

    get(id) { const rec = windows.get(id); return rec ? rec.el : null; },
    list() { return [...windows.entries()].map(([id, r]) => ({ id, title: r.el.querySelector('.w-title')?.textContent, minimized: r.minimized, maximized: r.maximized, focused: r.el.classList.contains('focused') })); },
    on(event, cb) { (listeners[event] = listeners[event] || []).push(cb); },
    off(event, cb) { if (listeners[event]) listeners[event] = listeners[event].filter(c => c !== cb); },

    /** Reflow em massa (chamado no resize da janela do navegador). */
    reflowAll() {
      const wa = workArea(), vw = wa.w, vh = wa.h;
      const small = vw < 820 || vh < 540;
      windows.forEach((rec) => {
        if (rec.minimized) return;
        if (small) { rec.el.classList.add('maximized'); rec.maximized = true; return; }
        let cw = Math.min(rec.el.offsetWidth, vw - 20), ch = Math.min(rec.el.offsetHeight, vh - 20);
        let cl = Math.min(parseInt(rec.el.style.left) || wa.x, wa.x + vw - cw - 10);
        let ct = Math.min(parseInt(rec.el.style.top) || wa.y, wa.y + vh - ch - 10);
        rec.el.style.width = cw + 'px'; rec.el.style.height = ch + 'px';
        rec.el.style.left = Math.max(wa.x, cl) + 'px'; rec.el.style.top = Math.max(wa.y, ct) + 'px';
      });
      fitAll();
    }
  };

  window.VessieWM = VessieWM;
  window.VessieWM.fitAll = fitAll;

  // ---------------- compatibilidade retroativa ----------------
  // createWin/focusWin continuam existindo com o mesmo nome e a mesma
  // assinatura de sempre — os ~30 apps do sistema (Steam, Bloco de Notas,
  // Terminal, Explorer...) chamam createWin(title, icone, html, w, h) e
  // não precisam saber que por baixo agora é o VessieWM.
  window.createWin = function (title, iconChar, content, w = 700, h = 500, appId = null) {
    return VessieWM.create({ title, icon: iconChar, content, width: w, height: h, appId });
  };
  window.focusWin = VessieWM.focus;
  window.addTaskbarBtn = addTaskbarBtn;
  window.removeTaskbarBtn = removeTaskbarBtn;
})();

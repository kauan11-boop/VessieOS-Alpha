(function () {
  const TB_KEY = "vessieos_taskbar";
  const POS = [
    { id: "bottom", label: "Inferior" },
    { id: "top", label: "Superior" },
    { id: "left", label: "Esquerda" },
    { id: "right", label: "Direita" }
  ];

  function tbState() {
    let st = { pos: "bottom", th: 52, locked: false };
    try {
      const raw = JSON.parse(localStorage.getItem("vessieos_taskbar") || "null");
      if (raw && typeof raw === "object") {
        if (POS.some(p => p.id === raw.pos)) st.pos = raw.pos;
        if (Number.isFinite(+raw.th)) st.th = Math.max(40, Math.min(120, +raw.th));
        st.locked = !!raw.locked;
      }
    } catch (_) {}
    return st;
  }

  function saveTb(st) {
    try { localStorage.setItem("vessieos_taskbar", JSON.stringify(st)); } catch (_) {}
  }

  function applyTaskbar() {
    const st = tbState();
    document.body.dataset.tbpos = st.pos;
    document.documentElement.style.setProperty("--th", st.th + "px");
    return st;
  }

  function closeMenu() {
    document.getElementById("tb-menu")?.remove();
  }

  function openMenu(x, y) {
    closeMenu();
    const st = tbState();
    const vertical = st.pos === "left" || st.pos === "right";
    const menu = document.createElement("div");
    menu.id = "tb-menu";
    const html = [
      '<div class="cti" data-act="lock"><i class="fas ' + (st.locked ? "fa-lock" : "fa-lock-open") + '"></i>',
      (st.locked ? "Desbloquear a barra" : "Bloquear a barra") + "</div>",
      '<div class="cts"></div>',
      '<div class="tb-menu-h">Posição da barra</div>',
      POS.map(p => '<div class="cti" data-pos="' + p.id + '"><i class="fas ' + (st.pos === p.id ? "fa-check" : "fa-minus") + '"></i> ' + p.label + "</div>").join(""),
      '<div class="cts"></div>',
      '<div class="tb-menu-h" data-size-h>' + (vertical ? "Largura" : "Altura") + ' da barra · ' + st.th + 'px</div>',
      '<div class="tb-menu-size"><input type="range" min="40" max="120" value="' + st.th + '"' + (st.locked ? " disabled" : "") + '></div>'
    ].join("");
    const mainMenu = document.createElement("div");
    mainMenu.id = "tb-menu";
    mainMenu.innerHTML = html;
    document.body.appendChild(mainMenu);
    const r = mainMenu.getBoundingClientRect();
    mainMenu.style.left = Math.max(8, Math.min(x, window.innerWidth - r.width - 8)) + "px";
    mainMenu.style.top = Math.max(8, Math.min(y, window.innerHeight - r.height - 8)) + "px";

    mainMenu.querySelector('[data-act="lock"]').onclick = () => {
      const s = tbState();
      s.locked = !s.locked;
      saveTb(s); applyTaskbar(); closeMenu();
      try { window.toast && window.toast(s.locked ? "Barra bloqueada." : "Barra desbloqueada.", "success"); } catch (_) {}
    };
    mainMenu.querySelectorAll('[data-pos]').forEach(item => {
      item.onclick = () => {
        const s = tbState();
        if (s.locked) {
          try { window.toast && window.toast("Desbloqueie a barra para mover.", "error"); } catch (_) {}
          return;
        }
        s.pos = item.dataset.pos;
        saveTb(s); applyTaskbar(); closeMenu();
        try { if (window.VessieWM && typeof window.VessieWM.fitAll === "function") window.VessieWM.fitAll(); } catch (_) {}
      };
    });
    const range = mainMenu.querySelector('input[type="range"]');
    if (range) {
      const sizeH = mainMenu.querySelector('[data-size-h]');
      const base = vertical ? "Largura" : "Altura";
      range.oninput = () => {
        const s = tbState();
        s.th = +range.value;
        saveTb(s); applyTaskbar();
        if (sizeH) sizeH.textContent = base + " da barra · " + s.th + "px";
      };
      range.onchange = () => {
        try { if (window.VessieWM && typeof window.VessieWM.fitAll === "function") window.VessieWM.fitAll(); } catch (_) {}
      };
    }
  }

  function openTaskbarButtonMenu(x, y, appId, title, icon, buttonEl) {
    closeMenu();
    const st = tbState();
    const isPinned = isTaskbarPinned(appId);
    const app = APPS.find(a => a.id === appId);
    if (!app) return;

    const menuBtn = document.createElement("div");
    menuBtn.id = "tb-menu";
    const html = [
      '<div class="tb-menu-h" style="display:flex;align-items:center;gap:8px;">',
      '<span class="tb-i" style="background:' + (app.bg || "linear-gradient(135deg,#7c3aed,#4f46e5)") + '">' + app.ic + '</span>',
      '<span>' + app.n + '</span>',
      '</div>',
      '<div class="cts"></div>',
      '<div class="cti" data-act="pin" style="display:flex;align-items:center;gap:8px;">',
      '<i class="fas fa-thumbtack"></i>',
      '<span>' + (isTaskbarPinned(appId) ? "Desafixar da barra de tarefas" : "Fixar na barra de tarefas") + '</span>',
      '</div>',
      '<div class="cti" data-act="close"><i class="fas fa-times"></i> Fechar janela</div>',
      '<div class="cts"></div>',
      '<div class="tb-menu-h">Posição da barra</div>',
      POS.map(p => '<div class="cti" data-pos="' + p.id + '"><i class="fas ' + (tbState().pos === p.id ? "fa-check" : "fa-minus") + '"></i> ' + p.label + '</div>').join(""),
      '<div class="cts"></div>',
      '<div class="tb-menu-h" data-size-h>' + (tbState().pos === "left" || tbState().pos === "right" ? "Largura" : "Altura") + ' da barra · ' + tbState().th + 'px</div>',
      '<div class="tb-menu-size"><input type="range" min="40" max="120" value="' + tbState().th + '"' + (tbState().locked ? " disabled" : "") + '></div>'
    ].join("");
    menuBtn = document.createElement("div");
    menuBtn.id = "tb-menu";
    menuBtn.innerHTML = html;
    document.body.appendChild(menuBtn);
    const r = menuBtn.getBoundingClientRect();
    menuBtn.style.left = Math.max(8, Math.min(x, window.innerWidth - r.width - 8)) + "px";
    menuBtn.style.top = Math.max(8, Math.min(y, window.innerHeight - r.height - 8)) + "px";

    menuBtn.querySelector('[data-act="pin"]').onclick = () => {
      toggleTaskbarPin(appId);
      closeMenu();
    };
    menuBtn.querySelector('[data-act="close"]').onclick = () => {
      const win = windows.get(appId);
      if (win) VessieWM.close(appId);
      closeMenu();
    };
    menuBtn.querySelectorAll('[data-pos]').forEach(item => {
      item.onclick = () => {
        const s = tbState();
        if (s.locked) {
          try { window.toast && window.toast("Desbloqueie a barra para mover.", "error"); } catch (_) {}
          return;
        }
        s.pos = item.dataset.pos;
        saveTb(s); applyTaskbar(); closeMenu();
        try { if (window.VessieWM && typeof window.VessieWM.fitAll === "function") window.VessieWM.fitAll(); } catch (_) {}
      };
    });
    const range = menuBtn.querySelector('input[type="range"]');
    if (range) {
      const sizeH = menuBtn.querySelector('[data-size-h]');
      const base = tbState().pos === "left" || tbState().pos === "right" ? "Largura" : "Altura";
      range.oninput = () => {
        const s = tbState();
        s.th = +range.value;
        saveTb(s); applyTaskbar();
        if (sizeH) sizeH.textContent = base + " da barra · " + s.th + "px";
      };
      range.onchange = () => {
        try { if (window.VessieWM && typeof window.VessieWM.fitAll === "function") window.VessieWM.fitAll(); } catch (_) {}
      };
    }
  }

  function init() {
    const clock = document.getElementById("tb-time");
    const date = document.getElementById("tb-date");
    if (clock && date) {
      const update = () => {
        const now = new Date();
        clock.textContent = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        date.textContent = now.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" });
      };
      update();
      setInterval(update, 30000);
    }

    applyTaskbar();

    const tb = document.getElementById("tb");
    if (tb && !tb.dataset.vosMenuBound) {
      tb.dataset.vosMenuBound = "true";
      tb.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        e.stopPropagation();
        openMenu(e.clientX, e.clientY);
      });
    }
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#tb-menu")) closeMenu();
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeMenu(); });
  }

  window.VessieOS = window.VessieOS || {};
  window.VessieOS.modules = window.VessieOS.modules || {};
  window.VessieOS.modules.taskbar = { init };
  window.applyTaskbar = applyTaskbar;
})();
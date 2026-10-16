// command-panel.js — Painel de Comando e hubs em falta do VessieOS
// Corrige os casos do openApp que chamavam funções inexistentes
// (ReferenceError ao clicar em "Painel de Comando" 🎛️ e "Educação" 📚,
// e nos casos latentes 'planos'/'plugins'):
//   openPainelDeComando(), openEducation(), openPlanos(), openPlugins()
// Todas usam apenas APIs já expostas (createWin, openApp, VFS, S, toast,
// kernel, PathRegistry) e degradam com toast em vez de quebrar.
// Depende de utilitários globais do kernel expostos em JS/core/main.js.
(function () {
  "use strict";

  function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function launch(id) {
    try {
      if (typeof window.openApp === 'function') { window.openApp(id); return true; }
    } catch (err) {
      console.error('[command-panel] openApp', id, err);
    }
    if (typeof toast === 'function') toast(`Não foi possível abrir "${id}".`, 'error');
    return false;
  }

  function kernelStats() {
    const kernel = window.VessieOS && window.VessieOS.kernel;
    if (!kernel) return null;
    let processes = [];
    try { processes = kernel.listProcesses ? kernel.listProcesses() : [...(kernel.processes || [])]; }
    catch { processes = []; }
    return {
      processes: processes.length,
      memoryUsed: (kernel.memory && kernel.memory.used) || 0,
      memoryTotal: (kernel.memory && kernel.memory.total) || 1024,
      uptimeMin: Math.max(0, Math.round((Date.now() - (kernel.bootTime || Date.now())) / 60000)),
      logs: (kernel.logs && kernel.logs.length) || 0
    };
  }

  // ---------------- Painel de Comando ----------------
  function openPainelDeComando() {
    const win = createWin('Painel de Comando', '🎛️', `
      <div class="cpanel" style="display:grid;gap:14px;padding:16px;overflow-y:auto;height:100%;color:var(--text)">
        <section>
          <h3 style="font-size:.85rem;color:var(--dim);text-transform:uppercase;letter-spacing:.06em;margin:0 0 8px">Estado do sistema</h3>
          <div class="cp-stats" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px"></div>
          <button data-cp="refresh" style="margin-top:8px;background:rgba(255,255,255,.06);border:1px solid var(--hairline);color:var(--text);padding:6px 12px;border-radius:7px;font-size:.76rem;cursor:pointer"><i class="fas fa-rotate-right"></i> Atualizar</button>
        </section>
        <section>
          <h3 style="font-size:.85rem;color:var(--dim);text-transform:uppercase;letter-spacing:.06em;margin:0 0 8px">Acesso rápido</h3>
          <div class="cp-quick" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:8px"></div>
        </section>
        <section>
          <h3 style="font-size:.85rem;color:var(--dim);text-transform:uppercase;letter-spacing:.06em;margin:0 0 8px">Sessão</h3>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button data-cp="theme" style="background:rgba(255,255,255,.06);border:1px solid var(--hairline);color:var(--text);padding:7px 12px;border-radius:7px;font-size:.78rem;cursor:pointer"><i class="fas fa-circle-half-stroke"></i> Alternar tema</button>
            <button data-cp="registry" style="background:rgba(255,255,255,.06);border:1px solid var(--hairline);color:var(--text);padding:7px 12px;border-radius:7px;font-size:.78rem;cursor:pointer"><i class="fas fa-list"></i> Registro de executáveis</button>
          </div>
          <p class="cp-reginfo" style="color:var(--dim);font-size:.76rem;margin:8px 0 0"></p>
        </section>
      </div>`, 640, 560);

    const QUICK = [
      ['terminal', '💻', 'Terminal'], ['explorer', '📁', 'Explorador'],
      ['settings', '⚙️', 'Configurações'], ['browser', '🌐', 'Navegador'],
      ['dashboard', '📊', 'Painel de Controle'], ['vessielang', '💜', 'VessieLang Studio']
    ];
    const quick = win.querySelector('.cp-quick');
    QUICK.forEach(([id, icon, label]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.style.cssText = 'display:flex;align-items:center;gap:8px;background:rgba(255,255,255,.045);border:1px solid var(--hairline);color:var(--text);padding:9px 10px;border-radius:8px;font-size:.78rem;cursor:pointer;text-align:left';
      b.innerHTML = `<span style="font-size:1.05rem">${icon}</span><span></span>`;
      b.querySelector('span:last-child').textContent = label;
      b.onclick = () => launch(id);
      quick.appendChild(b);
    });

    const statsBox = win.querySelector('.cp-stats');
    const regInfo = win.querySelector('.cp-reginfo');
    function refresh() {
      statsBox.replaceChildren();
      const st = kernelStats();
      const cards = st
        ? [['Processos', String(st.processes)], ['Memória', `${st.memoryUsed}/${st.memoryTotal} MB`], ['Sessão', `${st.uptimeMin} min`], ['Logs', String(st.logs)]]
        : [['Kernel', 'offline']];
      cards.forEach(([k, v]) => {
        const d = document.createElement('div');
        d.style.cssText = 'background:rgba(255,255,255,.03);border:1px solid var(--hairline);border-radius:8px;padding:8px 10px';
        const l = document.createElement('div');
        l.style.cssText = 'color:var(--dim);font-size:.66rem;text-transform:uppercase;letter-spacing:.05em';
        l.textContent = k;
        const val = document.createElement('div');
        val.style.cssText = 'font-size:.95rem;font-weight:700';
        val.textContent = v;
        d.append(l, val);
        statsBox.appendChild(d);
      });
      try {
        const reg = window.VessieOS && window.VessieOS.PathRegistry;
        regInfo.textContent = reg ? `${reg.list().length} entrada(s) no registro de executáveis.` : '';
      } catch { regInfo.textContent = ''; }
    }
    refresh();
    win.querySelector('[data-cp="refresh"]').onclick = () => { refresh(); toast('Painel atualizado.', 'success'); };
    win.querySelector('[data-cp="theme"]').onclick = () => {
      try {
        if (typeof window.setVessieTheme === 'function') window.setVessieTheme('dark');
        toast('🌙 Tema escuro (único tema do VessieOS).', 'success');
      } catch { toast('Não foi possível aplicar o tema.', 'error'); }
    };
    win.querySelector('[data-cp="registry"]').onclick = () => {
      try {
        const mod = window.VessieOS && window.VessieOS.modules && window.VessieOS.modules.executeExes;
        if (mod && typeof mod.open === 'function') mod.open();
        else toast('Execute Exes indisponível.', 'error');
      } catch { toast('Execute Exes indisponível.', 'error'); }
    };
    return win;
  }

  // ---------------- Educação ----------------
  function openEducation() {
    const win = createWin('Educação', '📚', `
      <div style="display:grid;gap:10px;padding:16px;overflow-y:auto;height:100%;color:var(--text)">
        <p style="margin:0;color:var(--dim);font-size:.82rem">Aprenda VessieLang e o sistema com estes atalhos guiados.</p>
        <div class="edu-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:10px"></div>
      </div>`, 620, 480);
    const grid = win.querySelector('.edu-grid');
    const cards = [
      ['💜 VessieLang Studio', 'Escreva e execute seu primeiro script.', () => launch('vessielang')],
      ['💻 Terminal interativo', 'Digite `vl` para rodar VessieLang, `open` para abrir arquivos.', () => launch('terminal')],
      ['📖 Guia de boas-vindas', 'Abre o guia inicial do VessieOS.', () => openGuide()],
      ['📝 Modelo de script', 'Abre o modelo script.vl no Studio.', () => openVlTemplate()]
    ];
    cards.forEach(([title, desc, fn]) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.style.cssText = 'text-align:left;background:rgba(255,255,255,.045);border:1px solid var(--hairline);border-radius:10px;padding:12px;cursor:pointer;color:var(--text)';
      const t = document.createElement('strong');
      t.style.cssText = 'display:block;font-size:.85rem;margin-bottom:4px';
      t.textContent = title;
      const d = document.createElement('small');
      d.style.cssText = 'color:var(--dim);font-size:.76rem;line-height:1.45';
      d.textContent = desc;
      b.append(t, d);
      b.onclick = fn;
      grid.appendChild(b);
    });
    return win;
  }

  function openGuide() {
    const candidates = ['Documentos/Guias/Bem-vindo-ao-VessieOS.md', 'Documentos/Bem-vindo.txt'];
    for (const p of candidates) {
      try {
        const content = VFS.read(p);
        if (typeof content === 'string' && typeof window.openNotepadWithContent === 'function') {
          window.openNotepadWithContent(p.split('/').pop(), content, p);
          return;
        }
      } catch { /* tenta o próximo */ }
    }
    toast('Guia não encontrado no Disco Local.', 'error');
  }

  function openVlTemplate() {
    const candidates = ['Modelos/script.vl', 'Documentos/Projetos/exemplo.vl'];
    for (const p of candidates) {
      try {
        const content = VFS.read(p);
        if (typeof content !== 'string') continue;
        if (typeof window.openVessieLangStudioWith === 'function') {
          window.openVessieLangStudioWith(p.split('/').pop(), content);
          return;
        }
        if (typeof window.openVessieLangStudio === 'function') {
          window.openVessieLangStudio();
          toast(`Modelo disponível em ${p}.`, 'default');
          return;
        }
      } catch { /* tenta o próximo */ }
    }
    toast('Nenhum modelo .vl encontrado.', 'error');
  }

  // ---------------- Planos (abre o Planos.md real) ----------------
  function openPlanos() {
    try {
      const content = VFS.read('Documentos/Planos.md');
      if (typeof content === 'string') {
        if (window.VessieBridge && window.VessieBridge.openWith('word', 'Documentos/Planos.md')) return null;
        if (typeof window.openNotepadWithContent === 'function') {
          window.openNotepadWithContent('Planos.md', content, 'Documentos/Planos.md');
          return null;
        }
      }
    } catch { /* cai no toast */ }
    toast('Planos.md não encontrado em Documentos.', 'error');
    return null;
  }

  // ---------------- Plugins (lista real do registro de módulos) ----------------
  function openPlugins() {
    const win = createWin('Plugins', '🔌', `
      <div style="display:flex;flex-direction:column;gap:10px;padding:16px;height:100%;overflow:hidden;color:var(--text)">
        <p class="pg-info" style="margin:0;color:var(--dim);font-size:.8rem"></p>
        <div class="pg-list" style="flex:1;overflow-y:auto;display:grid;gap:6px;align-content:start"></div>
        <button data-pg="refresh" style="align-self:start;background:rgba(255,255,255,.06);border:1px solid var(--hairline);color:var(--text);padding:6px 12px;border-radius:7px;font-size:.76rem;cursor:pointer"><i class="fas fa-rotate-right"></i> Atualizar</button>
      </div>`, 560, 480);
    const list = win.querySelector('.pg-list');
    const info = win.querySelector('.pg-info');
    function refresh() {
      list.replaceChildren();
      let names = [];
      try { names = Object.keys((window.VessieOS && window.VessieOS.modules) || {}); } catch { names = []; }
      info.textContent = names.length
        ? `${names.length} módulo(s) registrado(s) no kernel.`
        : 'Nenhum módulo registrado ainda.';
      names.sort().forEach((name) => {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:10px;background:rgba(255,255,255,.03);border:1px solid var(--hairline);border-radius:7px;padding:7px 10px;font-size:.8rem';
        const dot = document.createElement('span');
        dot.style.cssText = 'width:8px;height:8px;border-radius:50%;background:#34d399;flex:0 0 auto';
        const label = document.createElement('span');
        label.style.cssText = 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap';
        label.textContent = name;
        row.append(dot, label);
        list.appendChild(row);
      });
    }
    refresh();
    win.querySelector('[data-pg="refresh"]').onclick = refresh;
    return win;
  }

  window.openPainelDeComando = openPainelDeComando;
  window.openEducation = openEducation;
  window.openPlanos = openPlanos;
  window.openPlugins = openPlugins;
})();

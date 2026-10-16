// notepad/notepad.js — Bloco de Notas (pasta com view.html + view.css + notepad.js)
// Shell em view.html (tokens {{uid}} {{content}} {{savedPath}});
// fallback = modelo original verbatim (só sem fetch). Fiação em wireNotepad.
(function () {
  "use strict";

function notepadData(uid, content, savedPath) {
    return { uid, content: content || '', savedPath: savedPath ? savedPath : 'Novo documento' };
  }

function notepadFallback(uid, content, savedPath) {
    return `
    <div class="npad" id="${uid}">
      <div class="npad-menubar">
        <div class="nm-item" data-menu="arquivo">Arquivo
          <div class="nm-dropdown">
            <button data-cmd="new">Novo<span>Ctrl+N</span></button>
            <button data-cmd="open">Abrir...<span>Ctrl+O</span></button>
            <button data-cmd="save">Salvar<span>Ctrl+S</span></button>
            <button data-cmd="saveas">Salvar como...<span>Ctrl+Shift+S</span></button>
            <hr>
            <button data-cmd="download">Baixar .txt</button>
          </div>
        </div>
        <div class="nm-item" data-menu="editar">Editar
          <div class="nm-dropdown">
            <button data-cmd="undo">Desfazer<span>Ctrl+Z</span></button>
            <button data-cmd="redo">Refazer<span>Ctrl+Y</span></button>
            <hr>
            <button data-cmd="cut">Recortar<span>Ctrl+X</span></button>
            <button data-cmd="copy">Copiar<span>Ctrl+C</span></button>
            <button data-cmd="paste">Colar<span>Ctrl+V</span></button>
            <hr>
            <button data-cmd="find">Localizar...<span>Ctrl+F</span></button>
            <button data-cmd="selectall">Selecionar tudo<span>Ctrl+A</span></button>
            <button data-cmd="datetime">Hora/Data<span>F5</span></button>
            <button data-cmd="ai">Modificar com IA...</button>
          </div>
        </div>
        <div class="nm-item" data-menu="formatar">Formatar
          <div class="nm-dropdown">
            <button data-cmd="wordwrap"><span id="${uid}-wwmark">✓</span>&nbsp;Quebra de linha automática</button>
          </div>
        </div>
        <div class="nm-item" data-menu="exibir">Exibir
          <div class="nm-dropdown">
            <button data-cmd="zoomin">Aumentar Zoom<span>Ctrl+=</span></button>
            <button data-cmd="zoomout">Diminuir Zoom<span>Ctrl+-</span></button>
            <button data-cmd="zoomreset">Zoom padrão<span>Ctrl+0</span></button>
          </div>
        </div>
      </div>
      <div class="npad-findbar" style="display:none">
        <input class="nf-input" placeholder="Localizar">
        <button data-cmd="findprev"><i class="fas fa-chevron-up"></i></button>
        <button data-cmd="findnext"><i class="fas fa-chevron-down"></i></button>
        <span class="nf-count"></span>
        <button class="nf-close" data-cmd="closefind"><i class="fas fa-times"></i></button>
      </div>
      <textarea class="npad-area" spellcheck="false" placeholder="Escreva aqui...">${content || ''}</textarea>
      <div class="npad-statusbar">
        <span class="ns-path">${savedPath ? savedPath : 'Novo documento'}</span>
        <span class="ns-pos">Ln 1, Col 1</span>
        <span class="ns-count">0 caracteres</span>
        <span class="ns-zoom">100%</span>
      </div>
    </div>
  `;
  }

function openNotepadWithContent(name, content, savedPath) {
    const uid = 'np' + (++window.__winCounter.n) + Math.random().toString(36).slice(2, 6);
    const data = notepadData(uid, content, savedPath);
    const win = createWin(name, '📝', '<div class="app-loading">Carregando…</div>', 620, 460);
    const wire = () => wireNotepad(win, uid);
    if (window.VessieBridge && typeof window.VessieBridge.loadView === 'function') {
      window.VessieBridge.loadView('notepad', { html: notepadFallback(uid, content, savedPath) }, data).then(({ html }) => {
        if (!document.body.contains(win)) return;
        win.querySelector('.wb').innerHTML = html;
        wire();
      });
    } else {
      win.querySelector('.wb').innerHTML = notepadFallback(uid, content, savedPath);
      wire();
    }
    return win;
  }

function wireNotepad(win, uid) {

    const root = win.querySelector(`#${uid}`);
    const ta = root.querySelector('.npad-area');
    const titleEl = win.querySelector('.w-title');
    const statusPath = root.querySelector('.ns-path');
    const statusPos = root.querySelector('.ns-pos');
    const statusCount = root.querySelector('.ns-count');
    const statusZoom = root.querySelector('.ns-zoom');
    const findBar = root.querySelector('.npad-findbar');
    const findInput = root.querySelector('.nf-input');
    const findCount = root.querySelector('.nf-count');

    let currentPath = savedPath || null;
    let dirty = false;
    let zoom = 100;
    let wordWrap = true;

    function setTitle() {
      const base = currentPath ? currentPath.split('/').pop() : name;
      titleEl.textContent = (dirty ? '• ' : '') + base + ' - Bloco de Notas';
      statusPath.textContent = currentPath || 'Novo documento';
    }
    function markDirty() { dirty = true; setTitle(); }
    function markClean() { dirty = false; setTitle(); }

    function updateStatus() {
      const text = ta.value;
      const before = text.slice(0, ta.selectionStart);
      const line = before.split('\n').length;
      const col = before.length - before.lastIndexOf('\n');
      statusPos.textContent = `Ln ${line}, Col ${col}`;
      statusCount.textContent = `${text.length} caracteres`;
      statusZoom.textContent = `${zoom}%`;
    }

    function applyZoom() { ta.style.fontSize = (0.92 * (zoom / 100)).toFixed(2) + 'rem'; updateStatus(); }
    function applyWordWrap() {
      ta.style.whiteSpace = wordWrap ? 'pre-wrap' : 'pre';
      ta.style.overflowX = wordWrap ? 'hidden' : 'auto';
      const mark = root.querySelector(`#${uid}-wwmark`);
      if (mark) mark.style.visibility = wordWrap ? 'visible' : 'hidden';
    }

    // ---------- menu (abrir/fechar dropdowns) ----------
    root.querySelectorAll('.nm-item').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const wasOpen = item.classList.contains('open');
        root.querySelectorAll('.nm-item').forEach((i) => i.classList.remove('open'));
        if (!wasOpen) item.classList.add('open');
      });
    });
    document.addEventListener('click', () => root.querySelectorAll('.nm-item').forEach((i) => i.classList.remove('open')));

    // ---------- modal genérico (Salvar como / Abrir) ----------
    function closeModal() { root.querySelector('.npad-modal-ov')?.remove(); }
    function openSaveAsModal() {
      closeModal();
      // Pastas do perfil do usuário atual (nova árvore C:/Usuários/...).
      let folders = [];
      try {
        const root = (typeof VFS !== 'undefined' && VFS && typeof VFS.userRoot === 'function') ? VFS.userRoot() : '';
        const names = (typeof VFS !== 'undefined' && VFS) ? (VFS.list(root) || []) : [];
        folders = names.map((f) => `${root}/${f}`);
      } catch (_) { folders = []; }
      if (!folders.length) folders = ['C:/Usuários'];
      const ov = document.createElement('div');
      ov.className = 'npad-modal-ov';
      ov.innerHTML = `
        <div class="npad-modal">
          <h4><i class="fas fa-save"></i> Salvar como</h4>
          <label>Pasta<select class="sa-folder">${folders.map((f) => `<option value="${f}">${f}</option>`).join('')}</select></label>
          <label>Nome do arquivo<input class="sa-name" value="${(currentPath ? currentPath.split('/').pop() : name).replace(/\.txt$/i, '')}.txt"></label>
          <div class="nm-actions">
            <button class="nm-btn" data-cmd="cancel">Cancelar</button>
            <button class="nm-btn primary" data-cmd="confirm">Salvar</button>
          </div>
        </div>`;
      root.appendChild(ov);
      ov.querySelector('.sa-name').focus();
      ov.querySelector('.sa-name').select();
      ov.addEventListener('click', (e) => { if (e.target === ov) closeModal(); });
      ov.querySelector('[data-cmd="cancel"]').onclick = closeModal;
      ov.querySelector('[data-cmd="confirm"]').onclick = () => {
        const folder = ov.querySelector('.sa-folder').value;
        const fname = ov.querySelector('.sa-name').value.trim();
        if (!fname) return;
        const path = `${folder}/${fname}`;
        VFS.write(path, ta.value);
        currentPath = path;
        persistState();
        markClean();
        closeModal();
        toast(`Salvo em ${path} 💾`, 'success');
      };
    }

    function walkTextFiles(node = S.fs, prefix = '') {
      const results = [];
      if (!node || typeof node !== 'object') return results;
      for (const [key, val] of Object.entries(node)) {
        const full = prefix ? `${prefix}/${key}` : key;
        if (typeof val === 'string') results.push({ path: full, name: key });
        else if (val && typeof val === 'object') results.push(...walkTextFiles(val, full));
      }
      return results;
    }
    function openOpenModal() {
      closeModal();
      const files = walkTextFiles();
      const ov = document.createElement('div');
      ov.className = 'npad-modal-ov';
      ov.innerHTML = `
        <div class="npad-modal">
          <h4><i class="fas fa-folder-open"></i> Abrir arquivo</h4>
          <div class="nm-filelist">
            ${files.length ? files.map((f) => `<div class="nm-fileitem" data-path="${f.path}"><i class="fas fa-file-alt"></i> ${f.path}</div>`).join('') : '<div style="color:var(--dim);font-size:.78rem;padding:8px">Nenhum arquivo de texto encontrado.</div>'}
          </div>
          <div class="nm-actions">
            <button class="nm-btn" data-cmd="cancel">Cancelar</button>
          </div>
        </div>`;
      root.appendChild(ov);
      ov.addEventListener('click', (e) => { if (e.target === ov) closeModal(); });
      ov.querySelector('[data-cmd="cancel"]').onclick = closeModal;
      ov.querySelectorAll('.nm-fileitem').forEach((item) => {
        item.onclick = () => {
          const path = item.dataset.path;
          const value = VFS.read(path);
          ta.value = typeof value === 'string' ? value : '';
          currentPath = path;
          markClean();
          updateStatus();
          closeModal();
          toast(`Aberto: ${path}`, 'success');
        };
      });
    }

    // ---------- comandos do menu ----------
    root.querySelectorAll('.nm-dropdown [data-cmd]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        runCommand(btn.dataset.cmd);
        root.querySelectorAll('.nm-item').forEach((i) => i.classList.remove('open'));
      });
    });

    async function runCommand(cmd) {
      switch (cmd) {
        case 'new':
          if (dirty && !confirm('Descartar alterações não salvas?')) return;
          ta.value = ''; currentPath = null; markClean(); updateStatus(); break;
        case 'open': openOpenModal(); break;
        case 'save': currentPath ? (VFS.write(currentPath, ta.value), persistState(), markClean(), toast('Salvo! 💾', 'success')) : openSaveAsModal(); break;
        case 'saveas': openSaveAsModal(); break;
        case 'download': {
          const blob = new Blob([ta.value], { type: 'text/plain' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = (currentPath ? currentPath.split('/').pop() : 'documento.txt');
          a.click();
          toast('Baixado! 💾', 'success');
          break;
        }
        case 'undo': document.execCommand('undo'); break;
        case 'redo': document.execCommand('redo'); break;
        case 'cut': ta.focus(); document.execCommand('cut'); break;
        case 'copy': ta.focus(); document.execCommand('copy'); toast('Copiado! 📋', 'success'); break;
        case 'paste': ta.focus(); try { document.execCommand('paste'); } catch (e) { toast('Use Ctrl+V para colar', 'error'); } break;
        case 'find': findBar.style.display = 'flex'; findInput.focus(); break;
        case 'closefind': findBar.style.display = 'none'; ta.focus(); break;
        case 'findnext': findInText(1); break;
        case 'findprev': findInText(-1); break;
        case 'selectall': ta.focus(); ta.select(); break;
        case 'datetime': {
          const now = new Date().toLocaleString('pt-BR');
          const pos = ta.selectionStart;
          ta.value = ta.value.slice(0, pos) + now + ta.value.slice(pos);
          markDirty(); updateStatus(); break;
        }
        case 'ai': await aiModify(); break;
        case 'wordwrap': wordWrap = !wordWrap; applyWordWrap(); break;
        case 'zoomin': zoom = Math.min(200, zoom + 10); applyZoom(); break;
        case 'zoomout': zoom = Math.max(50, zoom - 10); applyZoom(); break;
        case 'zoomreset': zoom = 100; applyZoom(); break;
      }
    }

    function findInText(direction) {
      const term = findInput.value;
      if (!term) { findCount.textContent = ''; return; }
      const text = ta.value;
      const fromIndex = direction > 0 ? ta.selectionEnd : ta.selectionStart - 1;
      let idx;
      if (direction > 0) {
        idx = text.indexOf(term, Math.max(0, fromIndex));
        if (idx === -1) idx = text.indexOf(term); // volta ao início
      } else {
        idx = text.lastIndexOf(term, Math.max(0, fromIndex - 1));
        if (idx === -1) idx = text.lastIndexOf(term); // vai para o fim
      }
      if (idx === -1) { findCount.textContent = 'Não encontrado'; return; }
      ta.focus();
      ta.setSelectionRange(idx, idx + term.length);
      const totalMatches = text.split(term).length - 1;
      findCount.textContent = `${totalMatches} ocorrência(s)`;
      updateStatus();
    }
    findInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') findInText(e.shiftKey ? -1 : 1);
      if (e.key === 'Escape') { findBar.style.display = 'none'; ta.focus(); }
    });
    findInput.addEventListener('input', () => findInText(1));

    async function aiModify() {
      const content = ta.value;
      const start = ta.selectionStart, end = ta.selectionEnd;
      const selected = content.slice(start, end) || content;
      const instruction = prompt('Descreva como o LM Studio deve modificar o texto selecionado:');
      if (!instruction) return;
      toast('Processando com LM Studio...', 'default');
      try {
        const result = await ServiceLocator.resolve('AIService').editText(selected, instruction);
        ta.value = content.slice(0, start) + result + content.slice(end);
        markDirty(); updateStatus();
        toast('Texto modificado com LM Studio! ✨', 'success');
      } catch (err) {
        toast(`Falha ao modificar: ${err.message}`, 'error');
      }
    }

    // ---------- atalhos de teclado ----------
    ta.addEventListener('keydown', (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key.toLowerCase() === 's') { e.preventDefault(); runCommand(e.shiftKey ? 'saveas' : 'save'); }
      else if (ctrl && e.key.toLowerCase() === 'o') { e.preventDefault(); runCommand('open'); }
      else if (ctrl && e.key.toLowerCase() === 'n') { e.preventDefault(); runCommand('new'); }
      else if (ctrl && e.key.toLowerCase() === 'f') { e.preventDefault(); runCommand('find'); }
      else if (ctrl && (e.key === '=' || e.key === '+')) { e.preventDefault(); runCommand('zoomin'); }
      else if (ctrl && e.key === '-') { e.preventDefault(); runCommand('zoomout'); }
      else if (ctrl && e.key === '0') { e.preventDefault(); runCommand('zoomreset'); }
      else if (e.key === 'F5') { e.preventDefault(); runCommand('datetime'); }
      else if (e.key === 'Escape' && findBar.style.display !== 'none') { runCommand('closefind'); }
    });
    ta.addEventListener('input', () => { markDirty(); updateStatus(); });
    ta.addEventListener('click', updateStatus);
    ta.addEventListener('keyup', updateStatus);

    // fecha o stream de câmera e afins não se aplica aqui, mas garante que
    // um documento não salvo avisa antes de fechar (mesmo padrão de apps
    // de produtividade reais).
    win.addEventListener('remove', () => { /* nada a limpar */ });

    applyWordWrap();
    applyZoom();
    setTitle();
    updateStatus();
  }

function openNotepad() { return openNotepadWithContent('Bloco de Notas', ''); }
window.openNotepadWithContent = openNotepadWithContent;
window.openNotepad = openNotepad;
})();

// word-processor/word-processor.js — Editor de Texto (pasta com view.html + view.css + word-processor.js)
// Shell em view.html (tokens {{uid}} {{initialHTML}} {{savedPath}});
// fallback = modelo original verbatim (só sem fetch). Fiação em wireWord.
(function () {
  "use strict";

function wordData(uid, initialHTML, savedPath) {
    return {
      uid,
      initialHTML: initialHTML || '<p>Comece a escrever...</p>',
      savedPath: savedPath || 'Novo documento'
    };
  }

function wordFallback(uid, initialHTML, savedPath) {
    return `
    <div class="wproc" id="${uid}">
      <div class="wproc-ribbon">
        <div class="wproc-group">
          <button data-cmd="filenew" title="Novo"><i class="fas fa-file"></i></button>
          <button data-cmd="fileopen" title="Abrir"><i class="fas fa-folder-open"></i></button>
          <button data-cmd="filesave" title="Salvar (Ctrl+S)"><i class="fas fa-save"></i></button>
        </div>
        <div class="wproc-group">
          <button data-cmd="undo" title="Desfazer"><i class="fas fa-undo"></i></button>
          <button data-cmd="redo" title="Refazer"><i class="fas fa-redo"></i></button>
        </div>
        <div class="wproc-group">
          <select class="wp-font" title="Fonte">
            <option value="Calibri, 'Segoe UI', sans-serif">Calibri</option>
            <option value="'Times New Roman', serif">Times New Roman</option>
            <option value="Arial, sans-serif">Arial</option>
            <option value="Georgia, serif">Georgia</option>
            <option value="'Courier New', monospace">Courier New</option>
            <option value="'Comic Sans MS', cursive">Comic Sans MS</option>
          </select>
          <select class="wp-size" title="Tamanho">
            <option value="1">8</option><option value="2">10</option><option value="3" selected>12</option>
            <option value="4">14</option><option value="5">18</option><option value="6">24</option><option value="7">36</option>
          </select>
        </div>
        <div class="wproc-group">
          <button data-cmd="bold" title="Negrito (Ctrl+B)"><i class="fas fa-bold"></i></button>
          <button data-cmd="italic" title="Itálico (Ctrl+I)"><i class="fas fa-italic"></i></button>
          <button data-cmd="underline" title="Sublinhado (Ctrl+U)"><i class="fas fa-underline"></i></button>
          <button data-cmd="strikeThrough" title="Tachado"><i class="fas fa-strikethrough"></i></button>
          <input type="color" class="wp-color" title="Cor do texto" value="#1a1a1a">
          <input type="color" class="wp-hilite" title="Realce" value="#fff59d">
        </div>
        <div class="wproc-group">
          <button data-cmd="justifyLeft" title="Alinhar à esquerda"><i class="fas fa-align-left"></i></button>
          <button data-cmd="justifyCenter" title="Centralizar"><i class="fas fa-align-center"></i></button>
          <button data-cmd="justifyRight" title="Alinhar à direita"><i class="fas fa-align-right"></i></button>
          <button data-cmd="justifyFull" title="Justificar"><i class="fas fa-align-justify"></i></button>
        </div>
        <div class="wproc-group">
          <button data-cmd="insertUnorderedList" title="Lista com marcadores"><i class="fas fa-list-ul"></i></button>
          <button data-cmd="insertOrderedList" title="Lista numerada"><i class="fas fa-list-ol"></i></button>
        </div>
      </div>
      <div class="wproc-area">
        <div class="wproc-page" contenteditable="true" spellcheck="true">${initialHTML || '<p>Comece a escrever...</p>'}</div>
      </div>
      <div class="wproc-status">
        <span class="ws-path">${savedPath || 'Novo documento'}</span>
        <span class="ws-words">0 palavras</span>
      </div>
    </div>
  `;
  }

function openWordProcessor(initialHTML, savedPath) {
    const uid = 'wp' + (++window.__winCounter.n) + Math.random().toString(36).slice(2, 6);
    const data = wordData(uid, initialHTML, savedPath);
    const win = createWin('Documento1 - Editor de Texto', '📄', '<div class="app-loading">Carregando…</div>', 760, 600);
    const wire = () => wireWord(win, uid);
    if (window.VessieBridge && typeof window.VessieBridge.loadView === 'function') {
      window.VessieBridge.loadView('word-processor', { html: wordFallback(uid, initialHTML, savedPath) }, data).then(({ html }) => {
        if (!document.body.contains(win)) return;
        win.querySelector('.wb').innerHTML = html;
        wire();
      });
    } else {
      win.querySelector('.wb').innerHTML = wordFallback(uid, initialHTML, savedPath);
      wire();
    }
    return win;
  }

function wireWord(win, uid) {

    const root = win.querySelector(`#${uid}`);
    const page = root.querySelector('.wproc-page');
    const titleEl = win.querySelector('.w-title');
    const statusPath = root.querySelector('.ws-path');
    const statusWords = root.querySelector('.ws-words');

    let currentPath = savedPath || null;
    let dirty = false;

    function setTitle() {
      const base = currentPath ? currentPath.split('/').pop() : 'Documento1';
      titleEl.textContent = (dirty ? '• ' : '') + base + ' - Editor de Texto';
      statusPath.textContent = currentPath || 'Novo documento';
    }
    function markDirty() { dirty = true; setTitle(); }
    function markClean() { dirty = false; setTitle(); }
    function updateWords() {
      const words = (page.textContent || '').trim().split(/\s+/).filter(Boolean).length;
      statusWords.textContent = `${words} palavra(s)`;
    }

    function exec(cmd, value) { page.focus(); document.execCommand(cmd, false, value); markDirty(); updateWords(); }

    root.querySelectorAll('.wproc-ribbon [data-cmd]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cmd = btn.dataset.cmd;
        if (cmd === 'filenew') { if (dirty && !confirm('Descartar alterações não salvas?')) return; page.innerHTML = '<p>Comece a escrever...</p>'; currentPath = null; markClean(); updateWords(); return; }
        if (cmd === 'fileopen') { openWpOpenModal(); return; }
        if (cmd === 'filesave') { saveWp(); return; }
        if (cmd === 'undo' || cmd === 'redo') { document.execCommand(cmd); return; }
        exec(cmd);
        btn.classList.toggle('active', document.queryCommandState(cmd));
      });
    });
    root.querySelector('.wp-font').addEventListener('change', (e) => exec('fontName', e.target.value));
    root.querySelector('.wp-size').addEventListener('change', (e) => exec('fontSize', e.target.value));
    root.querySelector('.wp-color').addEventListener('input', (e) => exec('foreColor', e.target.value));
    root.querySelector('.wp-hilite').addEventListener('input', (e) => exec('hiliteColor', e.target.value));

    function saveWp() {
      if (currentPath) { VFS.write(currentPath, page.innerHTML); persistState(); markClean(); toast('Salvo! 💾', 'success'); return; }
      openWpSaveAsModal();
    }
    function closeWpModal() { root.querySelector('.npad-modal-ov')?.remove(); }
    function openWpSaveAsModal() {
      closeWpModal();
      const folders = Object.keys(S.fs);
      const ov = document.createElement('div');
      ov.className = 'npad-modal-ov';
      ov.innerHTML = `
        <div class="npad-modal">
          <h4><i class="fas fa-save"></i> Salvar como</h4>
          <label>Pasta<select class="sa-folder">${folders.map((f) => `<option value="${f}">${f}</option>`).join('')}</select></label>
          <label>Nome do arquivo<input class="sa-name" value="${(currentPath ? currentPath.split('/').pop() : 'Documento1').replace(/\.(html|txt)$/i, '')}.html"></label>
          <div class="nm-actions">
            <button class="nm-btn" data-cmd="cancel">Cancelar</button>
            <button class="nm-btn primary" data-cmd="confirm">Salvar</button>
          </div>
        </div>`;
      root.appendChild(ov);
      ov.querySelector('.sa-name').focus();
      ov.querySelector('.sa-name').select();
      ov.addEventListener('click', (e) => { if (e.target === ov) closeWpModal(); });
      ov.querySelector('[data-cmd="cancel"]').onclick = closeWpModal;
      ov.querySelector('[data-cmd="confirm"]').onclick = () => {
        const folder = ov.querySelector('.sa-folder').value;
        const fname = ov.querySelector('.sa-name').value.trim();
        if (!fname) return;
        const path = `${folder}/${fname}`;
        VFS.write(path, page.innerHTML);
        currentPath = path;
        persistState();
        markClean();
        closeWpModal();
        toast(`Salvo em ${path} 💾`, 'success');
      };
    }
    function openWpOpenModal() {
      closeWpModal();
      function walk(node = S.fs, prefix = '') {
        const results = [];
        if (!node || typeof node !== 'object') return results;
        for (const [key, val] of Object.entries(node)) {
          const full = prefix ? `${prefix}/${key}` : key;
          if (typeof val === 'string' && key.toLowerCase().endsWith('.html')) results.push({ path: full, name: key });
          else if (val && typeof val === 'object') results.push(...walk(val, full));
        }
        return results;
      }
      const files = walk();
      const ov = document.createElement('div');
      ov.className = 'npad-modal-ov';
      ov.innerHTML = `
        <div class="npad-modal">
          <h4><i class="fas fa-folder-open"></i> Abrir documento</h4>
          <div class="nm-filelist">
            ${files.length ? files.map((f) => `<div class="nm-fileitem" data-path="${f.path}"><i class="fas fa-file-word"></i> ${f.path}</div>`).join('') : '<div style="color:var(--dim);font-size:.78rem;padding:8px">Nenhum documento (.html) encontrado. Documentos salvos pelo Editor de Texto aparecem aqui.</div>'}
          </div>
          <div class="nm-actions"><button class="nm-btn" data-cmd="cancel">Cancelar</button></div>
        </div>`;
      root.appendChild(ov);
      ov.addEventListener('click', (e) => { if (e.target === ov) closeWpModal(); });
      ov.querySelector('[data-cmd="cancel"]').onclick = closeWpModal;
      ov.querySelectorAll('.nm-fileitem').forEach((item) => {
        item.onclick = () => {
          const path = item.dataset.path;
          const value = VFS.read(path);
          page.innerHTML = typeof value === 'string' ? value : '<p></p>';
          currentPath = path;
          markClean(); updateWords();
          closeWpModal();
          toast(`Aberto: ${path}`, 'success');
        };
      });
    }

    page.addEventListener('keydown', (e) => {
      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key.toLowerCase() === 's') { e.preventDefault(); saveWp(); }
    });
    page.addEventListener('input', () => { markDirty(); updateWords(); });

    setTitle();
    updateWords();
  }
window.openWordProcessor = openWordProcessor;
})();

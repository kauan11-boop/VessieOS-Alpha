(function () {
  "use strict";

  const STARTER = `// Primeiro programa VessieLang
escreva("Olá do VessieOS!");
escreva("Explore as APIs vessieos, ai, net e collector.");
`;

const VLS_FALLBACK_HTML = `
      <section class="vls">
        <header class="vls-toolbar">
          <div class="vls-brand"><span class="vls-mark"><i class="fas fa-terminal"></i></span><div><strong>VessieLang Studio</strong><small>Editor integrado ao VessieOS</small></div></div>
          <div class="vls-actions">
            <select class="vls-language" aria-label="Linguagem do editor">
              <option value="vl">VessieLang · B1 / J3 / G5 / FULL</option>
              <option value="html">HTML · prévia segura</option>
              <option value="javascript">JavaScript · prévia segura</option>
              <option value="css">CSS · prévia segura</option>
            </select>
            <input class="vls-filename" value="ola.vl" aria-label="Nome do arquivo">
            <button class="vls-button secondary" data-vls="open"><i class="fas fa-folder-open"></i><span>Abrir</span></button>
            <button class="vls-button secondary" data-vls="save"><i class="fas fa-save"></i><span>Salvar</span></button>
            <button class="vls-button primary" data-vls="run"><i class="fas fa-play"></i><span>Executar</span></button>
          </div>
        </header>
        <div class="vls-workspace">
          <aside class="vls-sidebar">
            <div class="vls-side-heading"><i class="fas fa-folder-tree"></i> PROJETO</div>
            <div class="vls-project-name"><i class="fas fa-folder-open"></i> Documentos / Projetos</div>
            <select class="vls-files" size="5" aria-label="Scripts salvos"></select>
            <div class="vls-side-heading vls-api-heading"><i class="fas fa-book"></i> BIBLIOTECA VESSIE</div>
            <div class="vls-api"><code>escreva(valor)</code><span>Saída no console</span></div>
            <div class="vls-api"><code>vessieos.notificar(t, m)</code><span>Notificação do sistema</span></div>
            <div class="vls-api"><code>ai.ask(pergunta)</code><span>Integração com IA local</span></div>
            <div class="vls-api"><code>net.get(url)</code><span>Requisições de rede</span></div>
            <div class="vls-api"><code>collector.games()</code><span>Biblioteca de jogos</span></div>
            <p class="vls-help">Use "vl nome.vl" no Terminal ou abra um arquivo .vl pelo Explorador.</p>
          </aside>
          <main class="vls-main">
            <div class="vls-editor-head"><span><i class="fas fa-file-code"></i> <span data-vls-filename>ola.vl</span></span><span data-vls-status>VessieLang FULL</span></div>
            <textarea class="vls-editor" spellcheck="false" aria-label="Editor de código"></textarea>
            <section class="vls-console">
              <div class="vls-console-head"><span><i class="fas fa-terminal"></i> SAÍDA</span><button type="button" data-vls="clear">Limpar</button></div>
              <pre class="vls-output" aria-live="polite">Pronto para executar. Os scripts VessieLang rodam pelo interpretador integrado.</pre>
            </section>
          </main>
          <aside class="vls-preview-panel">
            <div class="vls-preview-head"><span><i class="fas fa-eye"></i> PRÉVIA</span><span>iframe sandbox</span></div>
            <iframe class="vls-preview" title="Prévia isolada de HTML, CSS ou JavaScript" sandbox="allow-scripts"
              srcdoc="<html><body style='font:14px Segoe UI,sans-serif;color:#667085;padding:18px'>Selecione HTML, CSS ou JavaScript e execute para visualizar.</body></html>"></iframe>
          </aside>
        </div>
      </section>
    `;

  function openVessieLangStudio(pending) {
    const win = createWin('VessieLang Studio', '<i class="fas fa-code" style="color:#a78bfa"></i>', '<div class="app-loading">Carregando…</div>', 1120, 720);
    win.dataset.app = 'vessielang';
    const wire = () => wireStudio(win, pending);
    if (window.VessieBridge && typeof window.VessieBridge.loadView === 'function') {
      window.VessieBridge.loadView('vessielang-ide', { html: VLS_FALLBACK_HTML }, {}).then(({ html }) => {
        if (!document.body.contains(win)) return;
        win.querySelector('.wb').innerHTML = html;
        wire();
      });
    } else {
      win.querySelector('.wb').innerHTML = VLS_FALLBACK_HTML;
      wire();
    }
    return win;
  }

function wireStudio(win, pending) {

    const editor = win.querySelector('.vls-editor');
    const language = win.querySelector('.vls-language');
    const fileName = win.querySelector('.vls-filename');
    const fileList = win.querySelector('.vls-files');
    const output = win.querySelector('.vls-output');
    const preview = win.querySelector('.vls-preview');
    const status = win.querySelector('[data-vls-status]');

    editor.value = STARTER;

    function setOutput(text, error) {
      output.textContent = text || '(sem saída)';
      output.classList.toggle('is-error', !!error);
    }

    function refreshFiles() {
      const paths = VFS.list('Documentos/Projetos') || [];
      fileList.replaceChildren();
      paths.filter(name => /\.vl$/i.test(name) && typeof VFS.read(`Documentos/Projetos/${name}`) === 'string')
        .sort((a, b) => a.localeCompare(b, 'pt-BR'))
        .forEach(name => {
          const option = document.createElement('option');
          option.value = name;
          option.textContent = name;
          fileList.appendChild(option);
        });
    }

    function syncFileName() {
      const extension = language.value === 'vl' ? '.vl' : `.${language.value === 'javascript' ? 'js' : language.value}`;
      const base = fileName.value.trim().replace(/\.[^.]*$/, '') || 'novo-arquivo';
      fileName.value = `${base}${extension}`;
      win.querySelector('[data-vls-filename]').textContent = fileName.value;
      status.textContent = language.value === 'vl' ? 'VessieLang B1 / J3 / G5 / FULL' : `${language.options[language.selectedIndex].text} · iframe`;
    }

    function run() {
      if (language.value === 'vl') {
        const manager = window.VessieOS && window.VessieOS.vessielang;
        if (!manager || !manager.isAvailable()) {
          const message = 'O motor VessieLang ainda está inicializando. Aguarde alguns segundos e tente novamente.';
          setOutput(message, true);
          toast(message, 'error');
          return;
        }
        const result = manager.run(editor.value, { nome: fileName.value || 'script.vl' });
        setOutput(`Dialeto: ${result.nivel || 'desconhecido'}\\n${result.saida || '(sem saída)'}`, result.erro);
        return;
      }

      const source = editor.value;
      if (language.value === 'html') {
        preview.srcdoc = source;
      } else if (language.value === 'javascript') {
        preview.srcdoc = `<!doctype html><html><head><meta charset="utf-8"></head><body><pre id="result" style="font:13px monospace;white-space:pre-wrap"></pre><script>const log=(...v)=>document.querySelector('#result').append(document.createTextNode(v.join(' ')+'\\n'));console.log=log;try{${source}\\n}catch(error){log(error.message)}</script></body></html>`;
      } else {
        preview.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><style>${source}</style></head><body style="font:14px Segoe UI,sans-serif;padding:20px"><h2>Prévia de estilos</h2><p>Edite o CSS para personalizar este conteúdo.</p><button>Botão de exemplo</button></body></html>`;
      }
      setOutput(`Prévia ${language.value.toUpperCase()} atualizada no iframe isolado.`, false);
    }

    function save() {
      syncFileName();
      const path = `Documentos/Projetos/${fileName.value}`;
      if (!VFS.mkdir('Documentos/Projetos') || !VFS.write(path, editor.value)) {
        setOutput(`Não foi possível salvar em ${path}.`, true);
        toast('Falha ao salvar o arquivo no Explorador.', 'error');
        return;
      }
      persistState();
      refreshFiles();
      setOutput(`Salvo em ${path}`, false);
      toast(`Arquivo salvo em ${path}`, 'success');
    }

    function openSelected() {
      const name = fileList.value;
      if (!name) {
        toast('Selecione um script salvo no painel Projeto.', 'default');
        return;
      }
      const content = VFS.read(`Documentos/Projetos/${name}`);
      if (typeof content !== 'string') {
        toast(`O arquivo ${name} não contém texto válido.`, 'error');
        refreshFiles();
        return;
      }
      language.value = 'vl';
      fileName.value = name;
      editor.value = content;
      syncFileName();
      setOutput(`Arquivo carregado: Documentos/Projetos/${name}`, false);
    }

    language.addEventListener('change', syncFileName);
    fileName.addEventListener('input', () => { win.querySelector('[data-vls-filename]').textContent = fileName.value; });
    fileList.addEventListener('dblclick', openSelected);
    editor.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      event.preventDefault();
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      editor.setRangeText('  ', start, end, 'end');
    });
    win.querySelector('[data-vls="run"]').addEventListener('click', run);
    win.querySelector('[data-vls="save"]').addEventListener('click', save);
    win.querySelector('[data-vls="open"]').addEventListener('click', openSelected);
    win.querySelector('[data-vls="clear"]').addEventListener('click', () => setOutput('Saída limpa.', false));

    refreshFiles();
    syncFileName();
    // Arquivo dirigido pela ponte ("Abrir com"): aplicado após o shell existir.
    if (pending && (pending.fileName || pending.content !== undefined)) {
      try {
        const pname = String(pending.fileName || 'script.vl');
        editor.value = String(pending.content ?? '');
        fileName.value = pname;
        win.querySelector('[data-vls-filename]').textContent = pname;
        const lower = pname.toLowerCase();
        language.value = lower.endsWith('.html') ? 'html' : lower.endsWith('.js') ? 'javascript' : lower.endsWith('.css') ? 'css' : 'vl';
        language.dispatchEvent(new Event('change'));
      } catch { /* mantém o conteúdo padrão */ }
    }
  }

  window.openVessieLangStudio = openVessieLangStudio;

  // Abertura dirigida pela ponte de integração (Explorer "Abrir com",
  // Terminal `open`, etc.): abre o Studio já com o arquivo carregado.
  function openVessieLangStudioWith(fileName, content) {
    return openVessieLangStudio({ fileName, content });
  }
  window.openVessieLangStudioWith = openVessieLangStudioWith;
})();

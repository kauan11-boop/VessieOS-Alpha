// terminal.js — extraído de JS/core/main.js (VessieOS)
// Depende de utilitários globais do kernel: S, VFS, toast, createWin, persistState, etc. (expostos em main.js)
// Integração Xterm.js — terminal emulator completo
(function () {
    // Xterm.js initialization
    let xtermTerminal = null;
    
    // Initialize Xterm.js when DOM is ready
    function initXterm() {
        if (typeof XTerm === 'undefined') {
            // Script ainda não carregado, aguarde
            return;
        }
        const termElement = document.getElementById('xterm-terminal');
        if (!termElement) return;
        
        // Evitar inicialização múltipla
        if (xtermTerminal) {
            xtermTerminal.dispose();
        }
        
        xtermTerminal = new XTerm({
            cursorBlink: true,
            cursorStyle: 'block',
            convertEol: true,
            screenMargins: true,
            theme: {
                background: '#0c0c0c',
                foreground: '#cccccc'
            }
        });
        
        xtermTerminal.open(termElement);
        
        // Ajustar tamanho para preencher o container
        function resizeXterm() {
            const rect = termElement.getBoundingClientRect();
            xtermTerminal.resize(rect.width, rect.height);
        }
        resizeXterm();
        window.addEventListener('resize', resizeXterm);
        
        // Conectar input do VessieOS ao Xterm.js
        const vessieInp = document.getElementById('t-inp');
        if (vessieInp) {
            vessieInp.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    const raw = this.value.trim();
                    if (raw && xtermTerminal) {
                        // Enviar comando para o Xterm.js
                        xtermTerminal.write(raw + '\r');
                        this.value = '';
                    }
                }
            });
        }
    }
    
    // Carregar script Xterm.js se ainda não carregado
    if (typeof XTerm === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xterm.js/4.20.0/xterm.min.js';
        script.async = false;
        script.onload = initXterm;
        script.onerror = initXterm;
        document.head.appendChild(script);
    } else {
        initXterm();
    }
  "use strict";

function openTerminal() {
    // ---------- ESTADO DO TERMINAL ----------
    try { if (typeof window.ensureUserDirs === 'function') window.ensureUserDirs(false); } catch (_) { /* ignore */ }    const homeDir = (typeof VFS !== 'undefined' && VFS && typeof VFS.userDir === 'function')
      ? VFS.userDir('Área de Trabalho')
      : 'Desktop';
    const termState = {
      history: [],
      historyIndex: -1,
      currentPath: homeDir,
      user: S.user || 'visitante',
      host: 'vessieos',
      aliases: {},
      env: {
        HOME: homeDir,
        USER: S.user || 'visitante',
        PATH: '/usr/local/bin:/usr/bin:/bin:/usr/local/games:/usr/games',
        SHELL: '/bin/bash',
        TERM: 'xterm-256color',
        PWD: '~'
      },
      variables: {},
      uptime: Date.now(),
      editorContent: '',
      editorMode: false,
      editorFilename: '',
      lastCommand: '',
      jobs: [],
      nextJob: 1,
      commandCount: 0,
      aliasesLoaded: false
    };

    // Carrega aliases salvos
    function loadAliases() {
      try {
        const saved = localStorage.getItem('vessie_term_aliases');
        if (saved) {
          termState.aliases = JSON.parse(saved);
          termState.aliasesLoaded = true;
        }
      } catch (e) { }
    }
    loadAliases();

    function saveAliases() {
      try {
        localStorage.setItem('vessie_term_aliases', JSON.stringify(termState.aliases));
      } catch (e) { }
    }

    // ---------- FUNÇÕES AUXILIARES ----------
    function escHtml(s) {
      return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    function formatDate(d) {
      return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' });
    }

    function formatSize(bytes) {
      if (bytes < 1024) return bytes + 'B';
      if (bytes < 1048576) return (bytes / 1024).toFixed(1) + 'K';
      if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + 'M';
      return (bytes / 1073741824).toFixed(1) + 'G';
    }

    function resolvePath(path) {
      if (!path) return termState.currentPath;
      if (path === '~') path = termState.env.HOME;
      if (path.startsWith('/') || /^[a-zA-Z]:[\\/]/.test(path)) {
        // Caminho absoluto: valida contra o VFS real (nova árvore C:/...;
        // caminhos legados como /Desktop continuam valendo via normalize).
        try {
          const key = (typeof VFS !== 'undefined' && VFS && typeof VFS.normalize === 'function')
            ? VFS.normalize(path)
            : String(path).replace(/^\/+/, '');
          if (key === '') return '';
          return (VFS.exists(key) || VFS.resolve(key) !== null) ? key : null;
        } catch (_) { return null; }
      }
      // Caminho relativo
      const current = termState.currentPath === '~' ? termState.env.HOME : termState.currentPath;
      const parts = current.split('/').filter(Boolean);
      const relParts = path.split('/').filter(Boolean);
      for (const p of relParts) {
        if (p === '..') parts.pop();
        else if (p === '.') continue;
        else parts.push(p);
      }
      return parts.join('/') || termState.env.HOME;
    }

    function getNode(path) {
      if (!path) path = termState.currentPath;
      if (path === '~') path = termState.env.HOME;
      return VFS.resolve(path);
    }

    // Converte o caminho interno (estilo Unix, "Desktop/Sub") no formato
    // exibido pelo prompt de comando real do Windows: "C:\Users\Nome\Sub".
    function cmdPath() {
      const p = termState.currentPath || '';
      if (!p) return 'C:\\';
      const win32 = p.replace(/\//g, '\\');
      return win32.startsWith('C:\\') ? win32 : 'C:\\' + win32;
    }

    function listFiles(path) {
      const node = getNode(path);
      if (!node || typeof node !== 'object') return [];
      return Object.keys(node).map(name => {
        const val = node[name];
        const isDir = val && typeof val === 'object';
        return { name, isDir, size: isDir ? 4096 : (typeof val === 'string' ? val.length : 0), modified: Date.now() };
      });
    }

    // ---------- COMANDOS ----------
    const CMDS = {};

    // vessie / vscript — executa código VessieScript de verdade (comandos
    // reais fs/proc/registry/log/net/json/string/math/..., adaptador de
    // kernel real, adaptador de C#) direto no Terminal. O mesmo filesystem
    // do Terminal/Explorador de Arquivos (window.VessieOS.FileSystem) é o
    // que os comandos fs.* do script enxergam — arquivos criados por um
    // script aparecem no `ls`/Explorador, e vice-versa. (Irmã da linguagem
    // VessieLang, que roda via `vl`/`vessielang` — ver JS/kernel/modules/
    // vessielang/.)
    function runVessieCommand(args) {
      const engine = window.VessieScript;
      if (!engine) {
        append('<span class="te">VessieScript indisponível (motor não carregado).</span>');
        return;
      }
      if (!args.length) {
        append('<span class="te">Uso: vessie &lt;arquivo.vessie&gt; | vessie -e "codigo VessieScript"</span>');
        return;
      }

      let source;
      if (args[0] === '-e') {
        source = args.slice(1).join(' ');
        // O parser de comandos deste Terminal não interpreta aspas (split
        // simples por espaço) — então "vessie -e "codigo aqui"" chega com
        // as aspas literais nas pontas. Remove um par de aspas externas
        // correspondentes, se houver, para o código funcionar como esperado.
        const quoted = source.match(/^"(.*)"$/s) || source.match(/^'(.*)'$/s);
        if (quoted) source = quoted[1];
        if (!source) { append('<span class="te">vessie -e: informe o código depois de -e</span>'); return; }
      } else {
        const path = resolvePath(args[0]);
        const node = getNode(path);
        if (typeof node !== 'string') {
          append(`<span class="te">vessie: ${escHtml(args[0])}: arquivo .vessie não encontrado</span>`);
          return;
        }
        source = node;
      }

      const printLine = (text) => append(`<span style="color:#c4a8ff;">${escHtml(String(text))}</span>`);
      const scripting = window.VessieOS && window.VessieOS.modules && window.VessieOS.modules.scripting;
      const runPromise = (scripting && scripting.isAvailable())
        ? scripting.run(source, { id: `terminal:${Date.now()}`, hostAPI: { print: printLine } })
        : engine.run(source, { print: printLine });

      runPromise.catch((error) => {
        append(`<span class="te">Erro VessieScript: ${escHtml(error.message)}</span>`);
      });
    }
    CMDS.vessie = function (args) { runVessieCommand(args); return ''; };
    CMDS.vscript = CMDS.vessie;

    // reg — acesso via terminal ao mesmo Registro de Caminhos (JSON) do
    // app "Execute Exes" (window.VessieOS.PathRegistry). Mesma fonte de
    // dados, então cadastrar por aqui ou pela GUI dá no mesmo resultado.
    CMDS.reg = function (args) {
      const registry = window.VessieOS && window.VessieOS.PathRegistry;
      if (!registry) return '<span class="te">Registro de caminhos indisponível (execute-exes.js não carregado).</span>';
      const sub = args[0];
      if (!sub || sub === 'list') {
        const rows = registry.list().map((e) => `  ${e.origin === 'default' ? '🔒' : '👤'} ${e.id.padEnd(22)} ${e.cmd.padEnd(28)} ${e.path}`);
        return `Registro de caminhos (${rows.length}):<br>${rows.join('<br>')}<br><br>Uso: reg add "&lt;path&gt;" "&lt;cmd&gt;" | reg remove &lt;id&gt; | reg run &lt;id&gt;`;
      }
      if (sub === 'add') {
        const rest = args.slice(1).join(' ');
        const m = rest.match(/^"([^"]+)"\s+"([^"]+)"$/) || rest.match(/^(\S+)\s+(.+)$/);
        if (!m) return '<span class="te">Uso: reg add "&lt;path&gt;" "&lt;cmd&gt;"</span>';
        try {
          const entry = registry.add(m[1], m[2]);
          return `✅ Registrado: ${entry.path} -&gt; ${entry.cmd} (id: ${entry.id})`;
        } catch (err) { return `<span class="te">${escHtml(err.message)}</span>`; }
      }
      if (sub === 'remove' || sub === 'rm') {
        try { registry.remove(args[1]); return `🗑️ Removido: ${args[1]}`; }
        catch (err) { return `<span class="te">${escHtml(err.message)}</span>`; }
      }
      if (sub === 'run' || sub === 'exec') {
        try { const entry = registry.execute(args[1]); return `▶️ Executando: ${entry.cmd}`; }
        catch (err) { return `<span class="te">${escHtml(err.message)}</span>`; }
      }
      return '<span class="te">Subcomando desconhecido. Uso: reg [list|add|remove|run]</span>';
    };


    // help
    CMDS.help = function (args) {
      const commands = Object.keys(CMDS).sort();
      const cols = 4;
      let output = '<span class="ti">Comandos disponíveis:</span><br>';
      const perCol = Math.ceil(commands.length / cols);
      for (let i = 0; i < perCol; i++) {
        for (let j = 0; j < cols; j++) {
          const idx = i + j * perCol;
          if (idx < commands.length) output += `<span style="display:inline-block;width:140px;color:#7dd3fc;">${commands[idx]}</span>`;
        }
        output += '<br>';
      }
      output += `<br><span class="ti">Use 'man [comando]' para detalhes.</span>`;
      return output;
    };

    // man
    CMDS.man = function (args) {
      const cmd = args[0];
      if (!cmd) return '<span class="te">Uso: man [comando]</span>';
      const helpMap = {
        ls: 'Lista arquivos e pastas. Uso: ls [-la] [caminho]',
        cd: 'Muda diretório. Uso: cd [caminho] | cd .. | cd ~',
        pwd: 'Mostra diretório atual.',
        cat: 'Exibe conteúdo de arquivo. Uso: cat [arquivo1] [arquivo2] ...',
        touch: 'Cria arquivo vazio. Uso: touch [nome]',
        rm: 'Remove arquivo. Uso: rm [arquivo] | rm -r [pasta]',
        rmdir: 'Remove pasta vazia. Uso: rmdir [pasta]',
        mv: 'Move/renomeia arquivo. Uso: mv [origem] [destino]',
        cp: 'Copia arquivo. Uso: cp [origem] [destino]',
        mkdir: 'Cria pasta. Uso: mkdir [nome]',
        echo: 'Exibe texto. Uso: echo [texto] | echo $VAR',
        date: 'Exibe data/hora atual.',
        cal: 'Exibe calendário. Uso: cal [mês] [ano]',
        clear: 'Limpa a tela do terminal.',
        history: 'Exibe histórico de comandos.',
        alias: 'Cria alias. Uso: alias [nome]="[comando]"',
        unalias: 'Remove alias. Uso: unalias [nome]',
        export: 'Define variável. Uso: export VAR=valor',
        env: 'Exibe variáveis de ambiente.',
        whoami: 'Exibe nome do usuário atual.',
        uname: 'Exibe informações do sistema. Uso: uname -a',
        uptime: 'Exibe tempo de atividade do sistema.',
        ps: 'Lista as janelas reais do sistema.',
        kill: 'Fecha janela real. Uso: kill [PID | %job]',
        neofetch: 'Exibe informações do sistema com arte ASCII.',
        nano: 'Editor de texto simples. Uso: nano [arquivo]',
        open: 'Abre arquivo no aplicativo associado (mesma tabela "Abrir com" do Explorador). Uso: open [arquivo]',
        ping: 'Mede latência HTTP (ICMP indisponível no navegador). Uso: ping [host]',
        curl: 'Requisição HTTP real. Uso: curl [URL]',
        grep: 'Busca texto em arquivo. Uso: grep [padrão] [arquivo]',
        find: 'Busca arquivos. Uso: find [caminho] -name [padrão]',
        chmod: 'VFS sem permissões unix (registrado sem efeito). Uso: chmod [modo] [arquivo]',
        exit: 'Fecha o terminal.',
        reboot: 'Reinicia o sistema (recarrega).',
        shutdown: 'Desliga o sistema (recarrega).',
        df: 'Exibe uso de disco.',
        du: 'Exibe uso de diretório.',
        free: 'Exibe uso de memória.',
        top: 'Janelas reais + memória JS.',
        head: 'Mostra primeiras linhas do arquivo.',
        tail: 'Mostra últimas linhas do arquivo.',
        sort: 'Ordena linhas (simples).',
        sleep: 'Aguarda N segundos.',
        jobs: 'Lista jobs reais (ping). Uso: jobs | kill %id',
        fg: 'Jobs já exibem saída aqui. Uso: fg [%job]',
        bg: 'Jobs já rodam em background. Uso: bg [%job]',
        coin: 'Mostra o saldo de VessieCoin. Uso: coin | coin history',
        vsys: 'Gerencia os 155 micro-sistemas do kernel. Uso: vsys [list|categories|on|off] [id]',
        errors: 'Mostra o log de erros do sistema. Uso: errors | errors clear',
        aimodel: 'Mostra/lista o modelo de IA ativo no LM Studio. Uso: aimodel | aimodel list',
        adaptivecolor: 'Ativa/desativa a cor adaptativa da UI baseada nas janelas abertas. Uso: adaptivecolor [on|off]',
        vessie: 'Executa código VessieScript real. Uso: vessie arquivo.vessie | vessie -e "codigo"',
        vscript: 'Alias de vessie.',
        reg: 'Registro de caminhos/comandos (JSON, localStorage+IndexedDB). Uso: reg [list|add|remove|run]',
      };
      const help = helpMap[cmd] || 'Comando não encontrado no manual.';
      return `<span class="ti">MAN ${cmd.toUpperCase()}</span><br><span style="color:#d4d4d4;">${help}</span>`;
    };

    // ls
    CMDS.ls = function (args) {
      const path = args[args.length - 1] || '.';
      const showAll = args.includes('-a');
      const long = args.includes('-l') || args.includes('-la') || args.includes('-al');
      const targetPath = path === '.' ? termState.currentPath : resolvePath(path);
      if (!targetPath) return `<span class="te">ls: ${path}: Diretório não encontrado</span>`;
      const targetNode = getNode(targetPath);
      if (VFS.isLockedNode(targetNode)) {
        const unlocked = requestAdminUnlock('"' + targetPath.split('/').pop() + '"');
        if (!unlocked) return `<span class="te">🔒 Acesso negado: ${targetPath.split('/').pop()} (${VFS.stat(targetPath).size} arquivos). Peça ao administrador ou digite o código.</span>`;
      }
      const files = listFiles(targetPath);
      if (!files.length) return '<span style="color:var(--dim);">(pasta vazia)</span>';
      let output = '';
      if (long) {
        output += `<span style="color:#5b6680;font-size:.75rem;">total ${files.length}</span><br>`;
        files.forEach(f => {
          const perms = f.isDir ? 'drwxr-xr-x' : '-rw-r--r--';
          const date = new Date(f.modified).toLocaleDateString('pt-BR');
          output += `<span style="color:${f.isDir ? '#ffb74d' : '#7eb6ff'}">${perms}</span> <span style="color:#5b6680;">${f.isDir ? '4096' : f.size}</span> ${date} <span style="color:#fff;">${f.name}${f.isDir ? '/' : ''}</span><br>`;
        });
      } else {
        const filtered = showAll ? files : files.filter(f => !f.name.startsWith('.'));
        output = filtered.map(f => `<span style="color:${f.isDir ? '#ffb74d' : '#7eb6ff'}">${f.name}${f.isDir ? '/' : ''}</span>`).join(' ');
      }
      return output;
    };

    // cd
    CMDS.cd = function (args) {
      const target = args[0] || '~';
      let newPath;
      if (target === '~' || target === '') {
        newPath = termState.env.HOME;
      } else if (target === '..') {
        const parts = termState.currentPath.split('/');
        parts.pop();
        newPath = parts.join('/') || termState.env.HOME;
      } else {
        const resolved = resolvePath(target);
        if (!resolved) return `<span class="te">cd: ${target}: Diretório não encontrado</span>`;
        newPath = resolved;
      }
      // Verifica se existe
      const node = getNode(newPath);
      if (!node || typeof node !== 'object') {
        return `<span class="te">cd: ${target}: Diretório não encontrado</span>`;
      }
      if (VFS.isLockedNode(node)) {
        const unlocked = requestAdminUnlock('"' + newPath.split('/').pop() + '"');
        if (!unlocked) return `<span class="te">🔒 Acesso negado: ${newPath.split('/').pop()} (${VFS.stat(newPath).size} arquivos). Peça ao administrador ou digite o código.</span>`;
      }
      termState.currentPath = newPath;
      termState.env.PWD = newPath === termState.env.HOME ? '~' : newPath;
      return '';
    };

    // pwd
    CMDS.pwd = function () {
      return '/' + termState.currentPath;
    };

    // cat
    CMDS.cat = function (args) {
      if (!args.length) return '<span class="te">Uso: cat [arquivo]</span>';
      const outputs = [];
      for (const arg of args) {
        const path = resolvePath(arg);
        if (!path) { outputs.push(`<span class="te">cat: ${arg}: Arquivo não encontrado</span>`); continue; }
        const node = getNode(path);
        if (!node) { outputs.push(`<span class="te">cat: ${arg}: Arquivo não encontrado</span>`); continue; }
        if (typeof node === 'object') { outputs.push(`<span class="te">cat: ${arg}: É um diretório</span>`); continue; }
        outputs.push(`<span style="white-space:pre-wrap;">${escHtml(String(node))}</span>`);
      }
      return outputs.join('<br>');
    };

    // touch
    CMDS.touch = function (args) {
      if (!args.length) return '<span class="te">Uso: touch [arquivo]</span>';
      const name = args[0];
      const path = termState.currentPath;
      const node = getNode(path);
      if (!node || typeof node !== 'object') return `<span class="te">touch: ${path}: Diretório não encontrado</span>`;
      if (name in node) {
        // Atualiza timestamp (simulado)
        return `<span style="color:var(--dim);">'${name}' atualizado</span>`;
      }
      node[name] = '';
      persistState();
      return `<span style="color:#4ade80;">'${name}' criado</span>`;
    };

    // rm
    CMDS.rm = function (args) {
      if (!args.length) return '<span class="te">Uso: rm [-r] [arquivo/pasta]</span>';
      const recursive = args.includes('-r');
      const targets = args.filter(a => a !== '-r');
      let output = '';
      for (const target of targets) {
        const path = resolvePath(target);
        if (!path) { output += `<span class="te">rm: ${target}: Não encontrado</span><br>`; continue; }
        const node = getNode(path);
        if (!node) { output += `<span class="te">rm: ${target}: Não encontrado</span><br>`; continue; }
        if (typeof node === 'object' && !recursive) {
          output += `<span class="te">rm: ${target}: É um diretório (use -r)</span><br>`;
          continue;
        }
        VFS.delete(path);
        output += `<span style="color:#f87171;">'${target}' removido</span><br>`;
      }
      persistState();
      return output;
    };

    // rmdir
    CMDS.rmdir = function (args) {
      if (!args.length) return '<span class="te">Uso: rmdir [pasta]</span>';
      const target = args[0];
      const path = resolvePath(target);
      if (!path) return `<span class="te">rmdir: ${target}: Não encontrado</span>`;
      const node = getNode(path);
      if (!node) return `<span class="te">rmdir: ${target}: Não encontrado</span>`;
      if (typeof node !== 'object') return `<span class="te">rmdir: ${target}: Não é um diretório</span>`;
      if (Object.keys(node).length) return `<span class="te">rmdir: ${target}: Diretório não vazio</span>`;
      VFS.delete(path);
      persistState();
      return `<span style="color:#f87171;">'${target}' removido</span>`;
    };

    // mv
    CMDS.mv = function (args) {
      if (args.length < 2) return '<span class="te">Uso: mv [origem] [destino]</span>';
      const src = args[0];
      const dst = args[1];
      const srcPath = resolvePath(src);
      if (!srcPath) return `<span class="te">mv: ${src}: Não encontrado</span>`;
      const srcNode = getNode(srcPath);
      if (!srcNode) return `<span class="te">mv: ${src}: Não encontrado</span>`;
      const dstPath = resolvePath(dst);
      if (!dstPath) return `<span class="te">mv: ${dst}: Destino inválido</span>`;
      // Se destino for diretório, move para dentro
      const dstNode = getNode(dstPath);
      if (dstNode && typeof dstNode === 'object') {
        // Move para dentro do diretório
        const name = src.split('/').pop();
        dstNode[name] = srcNode;
        VFS.delete(srcPath);
        persistState();
        return `<span style="color:#4ade80;">'${src}' movido para '${dst}'</span>`;
      }
      // Renomeia
      const parent = resolvePath(dstPath.split('/').slice(0, -1).join('/') || termState.env.HOME);
      const name = dstPath.split('/').pop();
      const parentNode = getNode(parent);
      if (!parentNode || typeof parentNode !== 'object') return `<span class="te">mv: Destino inválido</span>`;
      parentNode[name] = srcNode;
      VFS.delete(srcPath);
      persistState();
      return `<span style="color:#4ade80;">'${src}' renomeado para '${dst}'</span>`;
    };

    // cp
    CMDS.cp = function (args) {
      if (args.length < 2) return '<span class="te">Uso: cp [origem] [destino]</span>';
      const src = args[0];
      const dst = args[1];
      const srcPath = resolvePath(src);
      if (!srcPath) return `<span class="te">cp: ${src}: Não encontrado</span>`;
      const srcNode = getNode(srcPath);
      if (!srcNode) return `<span class="te">cp: ${src}: Não encontrado</span>`;
      if (typeof srcNode === 'object') return `<span class="te">cp: ${src}: É um diretório (use cp -r)</span>`;
      const dstPath = resolvePath(dst);
      if (!dstPath) return `<span class="te">cp: ${dst}: Destino inválido</span>`;
      const dstNode = getNode(dstPath);
      if (dstNode && typeof dstNode === 'object') {
        // Copia para dentro do diretório
        const name = src.split('/').pop();
        dstNode[name] = srcNode;
        persistState();
        return `<span style="color:#4ade80;">'${src}' copiado para '${dst}'</span>`;
      }
      const parent = resolvePath(dstPath.split('/').slice(0, -1).join('/') || termState.env.HOME);
      const name = dstPath.split('/').pop();
      const parentNode = getNode(parent);
      if (!parentNode || typeof parentNode !== 'object') return `<span class="te">cp: Destino inválido</span>`;
      parentNode[name] = srcNode;
      persistState();
      return `<span style="color:#4ade80;">'${src}' copiado para '${dst}'</span>`;
    };

    // mkdir (md)
    CMDS.mkdir = function (args) {
      if (!args.length) return '<span class="te">Uso: mkdir [nome]</span>';
      const name = args[0];
      const path = termState.currentPath;
      const node = getNode(path);
      if (!node || typeof node !== 'object') return `<span class="te">mkdir: ${path}: Diretório não encontrado</span>`;
      if (name in node) return `<span class="te">mkdir: ${name}: Já existe</span>`;
      node[name] = {};
      persistState();
      return `<span style="color:#4ade80;">'${name}' criado</span>`;
    };

    // echo
    CMDS.echo = function (args) {
      if (!args.length) return '';
      let text = args.join(' ');
      // Substitui variáveis $VAR
      text = text.replace(/\$([A-Z_]+)/g, (match, varName) => {
        if (varName in termState.env) return termState.env[varName];
        if (varName in termState.variables) return termState.variables[varName];
        return match;
      });
      return text;
    };

    // date
    CMDS.date = function () {
      return `<span class="ti">${new Date().toLocaleString('pt-BR')}</span>`;
    };

    // cal
    CMDS.cal = function (args) {
      const now = new Date();
      let month = args[0] ? parseInt(args[0]) - 1 : now.getMonth();
      let year = args[1] ? parseInt(args[1]) : now.getFullYear();
      if (args[0] && args[0].length === 4) { year = parseInt(args[0]); month = now.getMonth(); }
      if (isNaN(month)) month = now.getMonth();
      if (isNaN(year)) year = now.getFullYear();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDay = new Date(year, month, 1).getDay();
      const monthName = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'][month];
      let output = `<span style="color:#fff;font-weight:600;">${monthName} ${year}</span><br>`;
      output += '<span style="color:#5b6680;">Do Se Te Qu Qu Se Sá</span><br>';
      let day = 1;
      let line = '';
      for (let i = 0; i < firstDay; i++) line += '    ';
      while (day <= daysInMonth) {
        line += (day < 10 ? '  ' : ' ') + day + ' ';
        if ((firstDay + day) % 7 === 0 || day === daysInMonth) {
          output += line + '<br>';
          line = '';
        }
        day++;
      }
      return output;
    };

    // clear
    CMDS.clear = function () {
      const out = win.querySelector('#term-out');
      if (out) out.innerHTML = '';
      return '';
    };

    // history
    CMDS.history = function () {
      if (!termState.history.length) return '<span style="color:var(--dim);">Nenhum comando no histórico.</span>';
      return termState.history.map((cmd, i) => `<span style="color:#5b6680;">${i + 1}</span>  ${cmd}`).join('<br>');
    };

    // alias
    CMDS.alias = function (args) {
      if (!args.length) {
        const aliases = Object.keys(termState.aliases);
        if (!aliases.length) return '<span style="color:var(--dim);">Nenhum alias definido.</span>';
        return aliases.map(a => `<span style="color:#7dd3fc;">${a}</span> = "${termState.aliases[a]}"`).join('<br>');
      }
      const arg = args.join(' ');
      const match = arg.match(/^([^=]+)=["']?(.*)["']?$/);
      if (!match) return '<span class="te">Uso: alias nome="comando"</span>';
      const name = match[1].trim();
      const cmd = match[2].trim();
      termState.aliases[name] = cmd;
      saveAliases();
      return `<span style="color:#4ade80;">Alias '${name}' definido.</span>`;
    };

    // unalias
    CMDS.unalias = function (args) {
      if (!args.length) return '<span class="te">Uso: unalias [nome]</span>';
      const name = args[0];
      if (!(name in termState.aliases)) return `<span class="te">unalias: ${name}: Não encontrado</span>`;
      delete termState.aliases[name];
      saveAliases();
      return `<span style="color:#f87171;">Alias '${name}' removido.</span>`;
    };

    // export
    CMDS.export = function (args) {
      if (!args.length) return '<span class="te">Uso: export VAR=valor</span>';
      const arg = args.join('');
      const match = arg.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (!match) return '<span class="te">Uso: export VAR=valor</span>';
      const name = match[1];
      const value = match[2];
      termState.env[name] = value;
      if (name === 'PWD') termState.currentPath = value === '~' ? termState.env.HOME : value;
      return `<span style="color:#4ade80;">${name}='${value}'</span>`;
    };

    // env
    CMDS.env = function () {
      return Object.entries(termState.env).map(([k, v]) => `<span style="color:#7dd3fc;">${k}</span>=<span style="color:#d4d4d4;">${v}</span>`).join('<br>');
    };

    // whoami
    CMDS.whoami = function () {
      return termState.user;
    };

    // uname
    CMDS.uname = function (args) {
      const plat = navigator.platform || 'web';
      if (args.includes('-a')) {
        return `VessieOS vos-term 3.0 ${plat} nucleos:${navigator.hardwareConcurrency || '?'} lang:${navigator.language || '?'}<br><span style="color:#5b6680;">${escHtml(navigator.userAgent)}</span>`;
      }
      return 'VessieOS';
    };

    // uptime
    CMDS.uptime = function () {
      const uptime = Date.now() - termState.uptime;
      const days = Math.floor(uptime / 86400000);
      const hours = Math.floor((uptime % 86400000) / 3600000);
      const mins = Math.floor((uptime % 3600000) / 60000);
      return `${days}d ${hours}h ${mins}m`;
    };

    // ps
    // ps/kill/top operam sobre as JANELAS REAIS do VessieWM (mesmo
    // gerenciador usado pelos apps) — não sobre uma lista simulada.
    function wmWins() {
      try {
        if (window.VessieWM && typeof window.VessieWM.list === 'function') return window.VessieWM.list();
      } catch (_) { /* ignore */ }
      return [];
    }

    CMDS.ps = function () {
      const wins = wmWins();
      const self = wins.find(w => w.id === win.id);
      let output = `<span style="color:#5b6680;">PID    ESTADO      JANELA</span><br>`;
      wins.forEach(w => {
        const st = w.id === win.id ? 'atual' : (w.minimized ? 'minimizada' : 'ativa');
        const mark = w.id === win.id ? ' *' : '';
        output += `<span style="color:#d4d4d4;">${String(w.pid).padEnd(6)}  ${st.padEnd(11)}  ${escHtml(w.title)}${mark}</span><br>`;
      });
      if (!self) output += `<span style="color:#d4d4d4;">shell    atual       terminal (este)</span><br>`;
      if (!wins.length && !self) output += `<span style="color:#5b6680;">(nenhuma janela além deste terminal)</span><br>`;
      return output;
    };

    // kill
    CMDS.kill = function (args) {
      if (!args.length) return '<span class="te">Uso: kill [PID | %job]</span>';
      const target = args[0];
      if (target.startsWith('%')) {
        const jid = parseInt(target.slice(1));
        const ji = termState.jobs.findIndex(j => j.id === jid);
        if (ji === -1) return `<span class="te">kill: ${escHtml(target)}: job não encontrado</span>`;
        try { clearInterval(termState.jobs[ji].timer); clearTimeout(termState.jobs[ji].timer); } catch (_) {}
        termState.jobs.splice(ji, 1);
        return `<span style="color:#f87171;">Job ${escHtml(target)} finalizado.</span>`;
      }
      const pid = parseInt(target);
      const w = wmWins().find(x => x.pid === pid);
      if (!w) return `<span class="te">kill: ${escHtml(target)}: processo não encontrado (veja 'ps')</span>`;
      if (w.id === win.id) return `<span class="te">kill: não é possível finalizar o próprio terminal.</span>`;
      try {
        if (window.VessieWM && typeof window.VessieWM.close === 'function') window.VessieWM.close(w.id);
        else document.getElementById(w.id)?.remove();
      } catch (_) { return `<span class="te">kill: falha ao finalizar ${pid}.</span>`; }
      return `<span style="color:#f87171;">Processo ${pid} (${escHtml(w.title)}) finalizado.</span>`;
    };

    // neofetch
    CMDS.neofetch = function () {
      const cores = navigator.hardwareConcurrency || '?';
      const heap = (performance && performance.memory)
        ? `${(performance.memory.usedJSHeapSize / 1048576).toFixed(0)}M / ${(performance.memory.totalJSHeapSize / 1048576).toFixed(0)}M`
        : 'n/d';
      let gpu = 'n/d';
      try {
        const cv = document.createElement('canvas');
        const gl = cv.getContext('webgl');
        if (gl) {
          const dbg = gl.getExtension('WEBGL_debug_renderer_info');
          gpu = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
          gpu = String(gpu).slice(0, 42);
        }
      } catch (_) { /* ignore */ }
      return `
<span style="color:#66c0f4;">       .---.        </span> <span style="color:#fff;">${escHtml(termState.user)}@vessieos</span>
<span style="color:#66c0f4;">      /     \\       </span> <span style="color:#d4d4d4;">OS: VessieOS 3.0 (${escHtml(navigator.platform || 'web')})</span>
<span style="color:#66c0f4;">     /       \\      </span> <span style="color:#d4d4d4;">Shell: ${termState.env.SHELL}</span>
<span style="color:#66c0f4;">    /         \\     </span> <span style="color:#d4d4d4;">Resolução: ${window.innerWidth}x${window.innerHeight}</span>
<span style="color:#66c0f4;">   /  ███████  \\    </span> <span style="color:#d4d4d4;">CPU: ${cores} núcleos</span>
<span style="color:#66c0f4;">  /  ███████  \\   </span> <span style="color:#d4d4d4;">GPU: ${escHtml(gpu)}</span>
<span style="color:#66c0f4;"> /  ███████  \\  </span> <span style="color:#d4d4d4;">Mem JS: ${heap}</span>
<span style="color:#66c0f4;">/______________\\ </span> <span style="color:#d4d4d4;">Janelas: ${wmWins().length}</span>
    `.replace(/    /g, '');
    };

    // nano (editor simples)
    CMDS.nano = function (args) {
      const filename = args[0];
      if (!filename) return '<span class="te">Uso: nano [arquivo]</span>';
      termState.editorMode = true;
      termState.editorFilename = filename;
      const path = resolvePath(filename);
      let content = '';
      if (path) {
        const node = getNode(path);
        if (node && typeof node === 'string') content = node;
      }
      termState.editorContent = content;
      const prompt = win.querySelector('#t-prompt');
      const inp = win.querySelector('#t-inp');
      const out = win.querySelector('#term-out');
      if (prompt) prompt.textContent = '📝 EDITANDO: ' + filename + ' (Ctrl+S salvar, Ctrl+Q sair)';
      if (inp) { inp.value = content; inp.placeholder = 'Edite o conteúdo...'; inp.focus(); inp.select(); }
      // Modifica comportamento do Enter para inserir quebra de linha no editor
      const origHandler = inp._keyHandler;
      inp._keyHandler = function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = inp.value;
          const start = inp.selectionStart;
          const end = inp.selectionEnd;
          inp.value = val.substring(0, start) + '\n' + val.substring(end);
          inp.selectionStart = inp.selectionEnd = start + 1;
          return;
        }
        if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          const content = inp.value;
          const path2 = resolvePath(filename);
          const node = getNode(termState.currentPath);
          if (node && typeof node === 'object') {
            node[filename] = content;
            persistState();
            out.innerHTML += `<br><span style="color:#4ade80;">📝 Arquivo '${filename}' salvo!</span>`;
            out.scrollTop = out.scrollHeight;
          }
          return;
        }
        if (e.key === 'q' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          termState.editorMode = false;
          if (prompt) prompt.textContent = `${cmdPath()}>`;
          if (inp) { inp.value = ''; inp.placeholder = 'Digite um comando...'; }
          out.innerHTML += `<br><span style="color:var(--dim);">📝 Editado finalizado.</span>`;
          out.scrollTop = out.scrollHeight;
          inp.removeEventListener('keydown', inp._keyHandler);
          inp._keyHandler = null;
          // Restaura o handler original
          inp.addEventListener('keydown', handleInput);
        }
      };
      inp.addEventListener('keydown', inp._keyHandler);
      return '';
    };

    // ping
    CMDS.ping = function (args) {
      const host = args[0] || 'localhost';
      const url = /^https?:\/\//i.test(host) ? host : 'https://' + host;
      const safe = escHtml(host);
      append(`<span style="color:#7dd3fc;">PING ${safe} (HTTP — o navegador não permite ICMP)</span>`);
      const job = { id: termState.nextJob++, name: 'ping ' + host, timer: null };
      termState.jobs.push(job);
      let count = 0;
      const times = [];
      job.timer = setInterval(async () => {
        if (count >= 4 || !document.body.contains(win)) {
          clearInterval(job.timer);
          termState.jobs = termState.jobs.filter(j => j.id !== job.id);
          if (times.length) {
            const avg = (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1);
            append(`<span style="color:#5b6680;">--- ${safe}: ${times.length}/4 respostas, média ${avg}ms ---</span>`);
          } else {
            append(`<span class="te">--- ${safe}: sem resposta (host inacessível ou bloqueado por CORS) ---</span>`);
          }
          return;
        }
        count++;
        const t0 = performance.now();
        try {
          await fetch(url, { mode: 'no-cors', cache: 'no-store' });
          const ms = performance.now() - t0;
          times.push(ms);
          append(`<span style="color:#d4d4d4;">resposta de ${safe}: tempo=${ms.toFixed(1)}ms</span>`);
        } catch (e) {
          append(`<span style="color:#f87171;">sem resposta de ${safe} (${escHtml(e.message || 'rede')})</span>`);
        }
      }, 800);
      return `<span style="color:#5b6680;">job [${job.id}] iniciado — 'kill %${job.id}' para parar.</span>`;
    };

    // curl
    // curl/wget/ping fazem REQUISIÇÕES REAIS (fetch). O navegador não
    // permite ICMP nem ler corpo cross-origin sem CORS — o ping mede
    // latência HTTP e o curl mostra o corpo só quando o servidor permite.
    CMDS.curl = function (args) {
      let url = args[0];
      if (!url) return '<span class="te">Uso: curl [URL]</span>';
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
      const safe = escHtml(url);
      fetch(url).then(async r => {
        let txt = '';
        try { txt = await r.text(); } catch (_) { txt = ''; }
        append(`<span style="color:#d4d4d4;">HTTP ${r.status} ${escHtml(r.statusText || '')} · ${txt.length} bytes de ${safe}</span>`
          + (txt ? `<br><span style="color:#9ca3af;">${escHtml(txt.slice(0, 1500))}${txt.length > 1500 ? '…' : ''}</span>` : '<br><span style="color:#5b6680;">(corpo vazio ou bloqueado por CORS)</span>'));
      }).catch(e => append(`<span class="te">curl: ${safe}: ${escHtml(e.message || 'falha de rede')}</span>`));
      return `<span style="color:#5b6680;">Buscando ${safe}…</span>`;
    };

    // grep
    CMDS.grep = function (args) {
      if (args.length < 2) return '<span class="te">Uso: grep [padrão] [arquivo]</span>';
      const pattern = args[0];
      const file = args[1];
      const path = resolvePath(file);
      if (!path) return `<span class="te">grep: ${file}: Arquivo não encontrado</span>`;
      const node = getNode(path);
      if (!node || typeof node === 'object') return `<span class="te">grep: ${file}: É um diretório</span>`;
      const lines = String(node).split('\n');
      const matched = lines.filter(line => line.toLowerCase().includes(pattern.toLowerCase()));
      if (!matched.length) return `<span style="color:var(--dim);">Nenhuma linha correspondente.</span>`;
      return matched.map(line => `<span style="color:#7dd3fc;">${escHtml(line)}</span>`).join('<br>');
    };

    // find
    CMDS.find = function (args) {
      if (args.length < 3 || args[1] !== '-name') return '<span class="te">Uso: find [caminho] -name [padrão]</span>';
      const path = args[0];
      const pattern = args[2];
      const targetPath = path === '.' ? termState.currentPath : resolvePath(path);
      if (!targetPath) return `<span class="te">find: ${path}: Diretório não encontrado</span>`;
      const files = listFiles(targetPath);
      const matched = files.filter(f => f.name.includes(pattern));
      if (!matched.length) return `<span style="color:var(--dim);">Nenhum arquivo encontrado.</span>`;
      return matched.map(f => `<span style="color:${f.isDir ? '#ffb74d' : '#7eb6ff'}">${f.name}${f.isDir ? '/' : ''}</span>`).join(' ');
    };

    // chmod
    CMDS.chmod = function (args) {
      if (args.length < 2) return '<span class="te">Uso: chmod [modo] [arquivo]</span>';
      return `<span style="color:#5b6680;">chmod: o VFS do VessieOS não usa permissões unix — registrado sem efeito.</span>`;
    };

    // sudo
    // sudo/su removidos: o VessieOS não possui modelo de privilégios unix;
    // todo comando já opera com as permissões reais do usuário da sessão.

    // su
    // (su removido junto com sudo — ver acima).

    // exit
    CMDS.exit = function () {
      const cl = win.querySelector('.cl');
      if (cl) cl.click();
      return '';
    };

    // reboot
    CMDS.reboot = function () {
      if (!confirm('Reiniciar o sistema?')) return 'Cancelado.';
      setTimeout(() => location.reload(), 500);
      return '🔄 Reiniciando...';
    };

    // shutdown
    CMDS.shutdown = function () {
      if (!confirm('Desligar o sistema?')) return 'Cancelado.';
      setTimeout(() => location.reload(), 500);
      return '⏻ Desligando...';
    };

    // df
    // Uso real do armazenamento local (localStorage) — mesmos números que
    // Configurações → Armazenamento exibe, sem valores inventados.
    function realStorageUsage() {
      let used = 0;
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          const v = localStorage.getItem(k) || '';
          used += (k.length + v.length) * 2;
        }
      } catch (_) { /* ignore */ }
      return used;
    }

    CMDS.df = function () {
      const used = realStorageUsage();
      const total = 5 * 1024 * 1024;
      const pct = ((used / total) * 100).toFixed(1);
      return `<span style="color:#5b6680;">Sist. Arq.      Tamanho   Usado    Disp.   Uso%</span><br>
            <span style="color:#d4d4d4;">localStorage   ${formatSize(total)}  ${formatSize(used)}  ${formatSize(total - used)}  ${pct}%</span><br>
            <span style="color:#5b6680;">(cota estimada do navegador: 5 MB)</span>`;
    };

    // du
    CMDS.du = function (args) {
      const path = args[0] || '.';
      const targetPath = path === '.' ? termState.currentPath : resolvePath(path);
      if (!targetPath) return `<span class="te">du: ${path}: Diretório não encontrado</span>`;
      const files = listFiles(targetPath);
      const total = files.reduce((sum, f) => sum + (f.isDir ? 4096 : f.size), 0);
      return `<span style="color:#d4d4d4;">${formatSize(total)}</span>  <span style="color:#fff;">${path}</span>`;
    };

    // free
    CMDS.free = function () {
      if (performance && performance.memory) {
        const m = performance.memory;
        const used = (m.usedJSHeapSize / 1048576).toFixed(1), total = (m.totalJSHeapSize / 1048576).toFixed(1);
        return `<span style="color:#5b6680;">               total    usado</span><br>
            <span style="color:#d4d4d4;">Mem JS:       ${total}M   ${used}M</span><br>
            <span style="color:#5b6680;">(heap do navegador; RAM física não é exposta por segurança)</span>`;
      }
      return `<span style="color:#5b6680;">Memória indisponível: este navegador não expõe performance.memory.</span>`;
    };

    // top (simples)
    CMDS.top = function () {
      const wins = wmWins();
      const heap = (performance && performance.memory)
        ? `heap ${(performance.memory.usedJSHeapSize / 1048576).toFixed(1)}M/${(performance.memory.totalJSHeapSize / 1048576).toFixed(1)}M`
        : 'heap: n/d neste navegador';
      let output = `<span style="color:#5b6680;">VessieOS top — ${wins.length} janela(s) · ${escHtml(heap)} · núcleos: ${navigator.hardwareConcurrency || '?'}</span><br>`;
      output += `<span style="color:#5b6680;">PID    ESTADO      JANELA</span><br>`;
      wins.forEach(w => {
        const st = w.id === win.id ? 'atual' : (w.minimized ? 'minimizada' : 'ativa');
        output += `<span style="color:#d4d4d4;">${String(w.pid).padEnd(6)}  ${st.padEnd(11)}  ${escHtml(w.title)}</span><br>`;
      });
      return output;
    };

    // head
    CMDS.head = function (args) {
      if (args.length < 1) return '<span class="te">Uso: head [arquivo]</span>';
      const file = args[0];
      const path = resolvePath(file);
      if (!path) return `<span class="te">head: ${file}: Arquivo não encontrado</span>`;
      const node = getNode(path);
      if (!node || typeof node === 'object') return `<span class="te">head: ${file}: É um diretório</span>`;
      const lines = String(node).split('\n');
      const n = args.includes('-n') ? parseInt(args[args.indexOf('-n') + 1]) || 10 : 10;
      return lines.slice(0, n).map(l => escHtml(l)).join('<br>');
    };

    // tail
    CMDS.tail = function (args) {
      if (args.length < 1) return '<span class="te">Uso: tail [arquivo]</span>';
      const file = args[0];
      const path = resolvePath(file);
      if (!path) return `<span class="te">tail: ${file}: Arquivo não encontrado</span>`;
      const node = getNode(path);
      if (!node || typeof node === 'object') return `<span class="te">tail: ${file}: É um diretório</span>`;
      const lines = String(node).split('\n');
      const n = args.includes('-n') ? parseInt(args[args.indexOf('-n') + 1]) || 10 : 10;
      return lines.slice(-n).map(l => escHtml(l)).join('<br>');
    };

    // sort
    CMDS.sort = function (args) {
      if (args.length < 1) return '<span class="te">Uso: sort [arquivo]</span>';
      const file = args[0];
      const path = resolvePath(file);
      if (!path) return `<span class="te">sort: ${file}: Arquivo não encontrado</span>`;
      const node = getNode(path);
      if (!node || typeof node === 'object') return `<span class="te">sort: ${file}: É um diretório</span>`;
      const lines = String(node).split('\n').sort();
      return lines.map(l => escHtml(l)).join('<br>');
    };

    // sleep
    CMDS.sleep = function (args) {
      if (args.length < 1) return '<span class="te">Uso: sleep [segundos]</span>';
      const secs = parseInt(args[0]);
      if (isNaN(secs) || secs < 1) return '<span class="te">sleep: valor inválido</span>';
      return `<span style="color:var(--dim);">⏳ Aguardando ${secs}s...</span>`;
    };

    // jobs
    CMDS.jobs = function () {
      if (!termState.jobs.length) return '<span style="color:var(--dim);">Nenhum job em execução.</span>';
      let output = `<span style="color:#5b6680;">JOB   COMANDO</span><br>`;
      termState.jobs.forEach(j => {
        output += `<span style="color:#d4d4d4;">[${j.id}]   ${escHtml(j.name)}</span><br>`;
      });
      return output;
    };

    // fg / bg — jobs deste terminal já exibem a saída aqui; kill %id para parar.
    CMDS.fg = function (args) {
      const t = args[0] || '';
      const j = termState.jobs.find(x => '%' + x.id === t || String(x.id) === t);
      if (!j) return '<span style="color:var(--dim);">Uso: fg [%job] — a saída já aparece aqui; use kill %id para parar.</span>';
      return `<span style="color:#d4d4d4;">job [${j.id}] (${escHtml(j.name)}) já está em primeiro plano.</span>`;
    };
    CMDS.bg = function (args) {
      const t = args[0] || '';
      const j = termState.jobs.find(x => '%' + x.id === t || String(x.id) === t);
      if (!j) return '<span style="color:var(--dim);">Uso: bg [%job] — jobs já rodam em background; use kill %id para parar.</span>';
      return `<span style="color:#d4d4d4;">job [${j.id}] (${escHtml(j.name)}) continua em background.</span>`;
    };

    // yes
    // (yes removido: gerava saída infinita simulada sem utilidade real).

    // wget
    CMDS.wget = function (args) {
      if (args.length < 1) return '<span class="te">Uso: wget [URL] [arquivo]</span>';
      let url = args[0];
      if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
      const rawName = args[1] || url.split('/').pop().split('?')[0] || 'download';
      const filename = rawName.replace(/[\\/:*?"<>|]/g, '_').slice(0, 80) || 'download';
      const safe = escHtml(url);
      fetch(url).then(async r => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const buf = await r.arrayBuffer();
        const bytes = new Uint8Array(buf);
        let text = '';
        const isText = (r.headers.get('content-type') || '').startsWith('text') || bytes.length < 1024 * 1024;
        if (isText) {
          try { text = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, 1024 * 1024)); }
          catch (_) { text = ''; }
        }
        const node = getNode(termState.currentPath);
        if (!node || typeof node !== 'object') { append('<span class="te">wget: diretório atual inválido.</span>'); return; }
        node[filename] = isText ? text : `[binário: ${bytes.length} bytes de ${url} — abertura via app associado]`;
        persistState();
        append(`<span style="color:#4ade80;">⬇️ '${escHtml(filename)}' salvo (${formatSize(bytes.length)}).</span>`);
      }).catch(e => append(`<span class="te">wget: ${safe}: ${escHtml(e.message || 'falha de rede')}</span>`));
      return `<span style="color:#5b6680;">Baixando ${safe}…</span>`;
    };

    // ---------- COMANDOS NOVOS: VessieCoin / Sistemas / IA / Erros ----------
    CMDS.coin = CMDS.moedas = function (args) {
      const sub = args[0];
      if (!window.VessieCoin) return '<span class="te">Sistema VessieCoin indisponível.</span>';
      if (sub === 'history' || sub === 'historico') {
        const history = window.VessieCoin.getHistory(10);
        if (!history.length) return '<span style="color:var(--dim);">Nenhuma transação ainda.</span>';
        return history.map(h => `<span style="color:${h.type === 'earn' ? '#4ade80' : '#f87171'};">${h.type === 'earn' ? '+' : '-'}${h.amount}</span> ${escHtml(h.reason)} <span style="color:var(--dim);">(${new Date(h.at).toLocaleTimeString('pt-BR')})</span>`).join('<br>');
      }
      return `<span style="color:#f6c343;"><i class="fas fa-coins"></i> Saldo: ${window.VessieCoin.getBalance()} VessieCoin</span><br><span style="color:var(--dim);">Use 'coin history' para ver o histórico. Abra a Loja VessieCoin no menu Iniciar para gastar.</span>`;
    };

    CMDS.vsys = function (args) {
      const runtime = window.VessieOS?.systemsRuntime;
      if (!runtime) return '<span class="te">SystemsRuntime ainda não carregou (pipeline de módulos ES). Tente novamente em instantes.</span>';
      const [action, id] = args;
      if (!action || action === 'list') {
        const cat = id || null;
        const list = runtime.list(cat);
        if (!list.length) return cat ? `<span class="te">Categoria "${cat}" não encontrada.</span>` : '<span class="te">Nenhum sistema registrado.</span>';
        return `<span class="ti">${list.length} sistema(s)${cat ? ' em ' + cat : ''} (${runtime.count()} no total):</span><br>` +
          list.map(s => `${runtime.isEnabled(s.id) ? '<span style="color:#4ade80;">●</span>' : '<span style="color:var(--dim);">○</span>'} ${s.id} <span style="color:var(--dim);">— ${s.name}</span>`).join('<br>');
      }
      if (action === 'categories') return runtime.listCategories().join(', ');
      if (action === 'on' || action === 'enable') return runtime.enable(id) ? `<span style="color:#4ade80;">Ativado: ${id}</span>` : `<span class="te">Não foi possível ativar "${id}".</span>`;
      if (action === 'off' || action === 'disable') return runtime.disable(id) ? `<span style="color:#f87171;">Desativado: ${id}</span>` : `<span class="te">Não foi possível desativar "${id}".</span>`;
      return '<span class="te">Uso: vsys [list|categories|on|off] [id-ou-categoria]</span>';
    };

    CMDS.errors = CMDS.erros = function (args) {
      let log = [];
      try { log = JSON.parse(localStorage.getItem('vessieos_sys_crash-log') || '[]'); } catch (e) { }
      if (args[0] === 'clear' || args[0] === 'limpar') { localStorage.setItem('vessieos_sys_crash-log', '[]'); return '<span style="color:#4ade80;">Log de erros limpo.</span>'; }
      if (!log.length) return '<span style="color:#4ade80;">Nenhum erro registrado. 🎉</span>';
      return log.slice(0, 15).map(e => `<span style="color:#f87171;">[${e.type || 'error'}]</span> ${escHtml(e.message)} <span style="color:var(--dim);">(${new Date(e.at).toLocaleTimeString('pt-BR')})</span>`).join('<br>');
    };

    CMDS.adaptivecolor = CMDS.corAdaptativa = function (args) {
      const ac = window.VessieAdaptiveColor;
      if (!ac) return '<span class="te">Sistema de cor adaptativa indisponível.</span>';
      const sub = args[0];
      if (sub === 'on' || sub === 'ligar') { ac.enable(); return '<span style="color:#4ade80;">Cor adaptativa ativada — a taskbar e o menu Iniciar agora seguem as cores das janelas abertas.</span>'; }
      if (sub === 'off' || sub === 'desligar') { ac.disable(); return '<span style="color:#f87171;">Cor adaptativa desativada. Cores padrão restauradas.</span>'; }
      return `<span class="ti">Status:</span> ${ac.isEnabled() ? '<span style="color:#4ade80;">ativada</span>' : '<span style="color:var(--dim);">desativada</span>'}<br><span style="color:var(--dim);">Uso: adaptivecolor [on|off]</span>`;
    };

    CMDS.aimodel = function (args) {
      const ai = window.VessieOS?.ai;
      if (!args.length) {
        const selected = localStorage.getItem('vessie_selected_model') || '(nenhum selecionado)';
        return `<span class="ti">Modelo ativo:</span> ${escHtml(selected)}<br><span style="color:var(--dim);">Use 'aimodel list' para ver modelos do LM Studio, ou abra a Vessie IA para trocar pela interface.</span>`;
      }
      if (args[0] === 'list') {
        if (!ai) return '<span class="te">Integração de IA (LM Studio) ainda não carregou.</span>';
        // Comandos do terminal só suportam retorno síncrono (ver executeCommand
        // abaixo) — por isso, como o comando 'ping', imprime uma linha
        // imediata e completa o resultado real de forma assíncrona no DOM.
        (async () => {
          const outEl = win.querySelector('#term-out');
          const appendLine = (html) => {
            if (!outEl) return;
            const div = document.createElement('div');
            div.innerHTML = html;
            outEl.appendChild(div);
            outEl.scrollTop = outEl.scrollHeight;
          };
          const online = await ai.checkConnection().catch(() => false);
          if (!online) return appendLine('<span class="te">LM Studio não está acessível agora.</span>');
          const models = await ai.loadModels().catch(() => []);
          if (!models.length) return appendLine('<span style="color:var(--dim);">Nenhum modelo carregado no LM Studio.</span>');
          models.forEach(m => appendLine(`• ${escHtml(m.id)}`));
        })();
        return '<span style="color:var(--dim);">Consultando modelos no LM Studio...</span>';
      }
      return '<span class="te">Uso: aimodel [list]</span>';
    };

    // ---------- Aliases estilo Prompt de Comando (cmd.exe) ----------
    // O motor por baixo continua sendo o mesmo (comandos tipo Unix), mas o
    // visual e os comandos de entrada agora também respondem como o
    // Prompt de Comando real do Windows — dir/cls/type/del/copy/move/md/rd/ver.
    CMDS.dir = CMDS.ls;
    CMDS.cls = CMDS.clear;
    CMDS.type = CMDS.cat;
    CMDS.del = CMDS.erase = CMDS.rm;
    CMDS.copy = CMDS.cp;
    CMDS.move = CMDS.ren = CMDS.rename = CMDS.mv;
    CMDS.md = CMDS.mkdir;
    CMDS.rd = CMDS.rmdir;
    CMDS.hostname = function () { return termState.host; };
    CMDS.ver = function () { return `<span style="color:#d4d4d4;">VessieOS [Versão 3.0.26100.3915]</span>`; };

    // open/start — abre arquivo no aplicativo associado via VessieBridge
    // (a mesma tabela "Abrir com" do Explorador). Uso: open [arquivo]
    CMDS.open = function (args) {
      const raw = args[0];
      if (!raw) return '<span class="te">Uso: open [arquivo]</span>';
      const full = resolvePath(raw);
      if (!full) return `<span class="te">open: ${escHtml(raw)}: caminho inválido</span>`;
      let node = null;
      try { node = VFS.resolve(full); } catch { node = null; }
      if (node === null || node === undefined) return `<span class="te">open: ${escHtml(raw)}: arquivo não encontrado</span>`;
      if (!window.VessieBridge || !window.VessieBridge.openFile(full)) {
        return `<span class="te">open: sem aplicativo associado para ${escHtml(raw)}</span>`;
      }
      return `<span style="color:#7dd3fc;">Abrindo ${escHtml(full)}...</span>`;
    };
    CMDS.start = CMDS.open;

    // ---------- FUNÇÃO DE EXECUÇÃO ----------
    function executeCommand(raw) {
      if (!raw) return;
      termState.history.push(raw);
      termState.historyIndex = termState.history.length;
      termState.lastCommand = raw;
      termState.commandCount++;

      // Expande alias
      const firstWord = raw.split(' ')[0];
      if (firstWord in termState.aliases) {
        raw = raw.replace(firstWord, termState.aliases[firstWord]);
      }

      // Suporte a pipe simples (| grep)
      let parts = raw.split('|').map(s => s.trim());
      let output = '';
      let currentData = '';

      for (let i = 0; i < parts.length; i++) {
        const cmdParts = parts[i].split(' ');
        const cmd = cmdParts[0];
        const args = cmdParts.slice(1);

        if (i === 0) {
          // Comando principal
          if (cmd in CMDS) {
            const result = CMDS[cmd](args);
            if (typeof result === 'string') {
              currentData = result;
            }
          } else {
            output = `<span class="te">'${cmd}' não é reconhecido como um comando interno<br>ou externo, um programa operável ou um arquivo em lotes.<br><span style="color:var(--dim);font-size:.85em">Digite 'help' para ver os comandos disponíveis.</span></span>`;
            break;
          }
        } else {
          // Pipe: processa com grep (simplificado)
          if (cmd === 'grep') {
            const pattern = args[0];
            if (pattern && currentData) {
              const lines = currentData.split('<br>');
              const matched = lines.filter(line => line.toLowerCase().includes(pattern.toLowerCase()));
              currentData = matched.join('<br>');
            } else {
              currentData = '';
            }
          } else {
            output = `<span class="te">Pipe com '${cmd}' não suportado.</span>`;
            break;
          }
        }
      }

      if (!output && currentData) output = currentData;
      return output || '';
    }

    // ---------- SHELL (view.html) + INTERFACE ----------
    // O shell estático vive em view.html (token {{user}}); o fallback abaixo
    // é o modelo original verbatim (só usado sem fetch). A interface/fiação
    // (buildTerminalUI) roda após o shell existir no DOM.
    const termFallbackHtml = `
    <div class="term" style="display:flex;flex-direction:column;height:100%;">
      <div class="t-out" id="term-out" style="flex:1;overflow-y:auto;padding:12px 16px;font-family:'Cascadia Code','Consolas',monospace;font-size:13px;line-height:1.6;background:#0c0c0c;color:#cccccc;">
        <div style="color:#cccccc;">VessieOS [Versão 3.0.26100.3915]</div>
        <div style="color:#cccccc;">(c) VessieOS Corporation. Todos os direitos reservados.</div>
        <div style="color:#5b6680;font-size:.75rem;margin-top:8px;">Digite <span style="color:#f2f2f2;">help</span> para ver os comandos · Tab autocompleta · → aceita a sugestão · ↑/↓ histórico</div>
        <div style="color:#c4a8ff;font-size:.75rem;">✨ Novo: <span style="color:#f2f2f2;">vessie -e "print(1+2)"</span> roda VessieScript de verdade (comandos reais + kernel real)</div>
      </div>
      <div class="t-bar" style="display:flex;align-items:center;padding:6px 14px;background:#0c0c0c;border-top:1px solid #1f1f1f;">
        <span class="t-prompt" id="t-prompt" style="color:#cccccc;font-weight:400;font-family:'Cascadia Code',monospace;white-space:nowrap;">C:\Users\${S.user || 'visitante'}></span>
        <input class="t-inp" id="t-inp" placeholder="Digite um comando..." autocomplete="off" spellcheck="false" style="flex:1;background:transparent;border:none;color:#cccccc;font-family:'Cascadia Code',monospace;font-size:13px;outline:none;padding:6px 8px;">
      </div>
    </div>
  `;
    const win = createWin('Prompt de Comando', '💻', '<div class="app-loading">Carregando…</div>', 760, 520);
    const termData = { user: S.user || 'visitante' };
    const mountTerm = (html) => {
      if (!document.body.contains(win)) return;
      win.querySelector('.wb').innerHTML = html;
      buildTerminalUI();
    };
    if (window.VessieBridge && typeof window.VessieBridge.loadView === 'function') {
      window.VessieBridge.loadView('terminal', { html: termFallbackHtml }, termData).then(({ html }) => mountTerm(html));
    } else {
      mountTerm(termFallbackHtml);
    }
    return win;

    function buildTerminalUI() {

    const out = win.querySelector('#term-out');
    const inp = win.querySelector('#t-inp');
    const prompt = win.querySelector('#t-prompt');

    // ---------- ATUALIZA PROMPT ----------
    function updatePrompt() {
      if (prompt) {
        prompt.innerHTML = `${cmdPath()}&gt; `;
      }
    }
    updatePrompt();

    // ---------- AUTO-COMPLETAR ----------
    inp.addEventListener('keydown', function (e) {
      if (e.key === 'Tab') {
        e.preventDefault();
        // Previsão ativa tem prioridade: Tab aceita o ghost text
        if (typeof ghostText === 'string' && ghostText) {
          this.value += ghostText;
          this.selectionStart = this.selectionEnd = this.value.length;
          ghostText = '';
          paintGhost();
          return;
        }
        const val = this.value;
        if (!val) return;
        // Completa comando ou nome de arquivo
        const parts = val.split(' ');
        const last = parts[parts.length - 1];
        const cmds = Object.keys(CMDS).concat(Object.keys(termState.aliases));
        const matches = cmds.filter(c => c.startsWith(last));
        if (matches.length === 1) {
          parts[parts.length - 1] = matches[0];
          this.value = parts.join(' ') + ' ';
          return;
        }
        if (matches.length > 1) {
          // Mostra sugestões
          append(`<span style="color:#5b6680;">${matches.join('  ')}</span>`);
          return;
        }
        // Tenta completar arquivo
        const files = listFiles(termState.currentPath);
        const fileMatches = files.filter(f => f.name.startsWith(last));
        if (fileMatches.length === 1) {
          parts[parts.length - 1] = fileMatches[0].name + (fileMatches[0].isDir ? '/' : '');
          this.value = parts.join(' ');
        } else if (fileMatches.length > 1) {
          append(`<span style="color:#5b6680;">${fileMatches.map(f => f.name).join('  ')}</span>`);
        }
      }

      // Histórico (↑ e ↓)
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (termState.historyIndex > 0) {
          termState.historyIndex--;
          this.value = termState.history[termState.historyIndex] || '';
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (termState.historyIndex < termState.history.length - 1) {
          termState.historyIndex++;
          this.value = termState.history[termState.historyIndex] || '';
        } else {
          termState.historyIndex = termState.history.length;
          this.value = '';
        }
      }

      // Ctrl+C (interromper)
      if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
        if (termState.editorMode) {
          // Sai do editor
          termState.editorMode = false;
          updatePrompt();
          this.value = '';
          this.placeholder = 'Digite um comando...';
          append('<span style="color:#f87171;">^C</span>');
          return;
        }
        append('<span style="color:#f87171;">^C</span>');
        this.value = '';
      }

      // !! (repetir último comando)
      if (e.key === '!' && this.value === '!!') {
        e.preventDefault();
        if (termState.history.length) {
          this.value = termState.history[termState.history.length - 1];
          this.selectionStart = this.selectionEnd = this.value.length;
        }
      }

      // Aceitar previsão com Tab ou → (fim da linha)
      if ((e.key === 'Tab' || (e.key === 'ArrowRight' && this.selectionStart === this.value.length)) && ghostText) {
        e.preventDefault();
        this.value += ghostText;
        this.selectionStart = this.selectionEnd = this.value.length;
        refreshGhost();
        return;
      }
      // Esc dispensa a previsão
      if (e.key === 'Escape') { ghostText = ''; paintGhost(); return; }
      // Valor pode ter mudado via teclado (histórico/!!): repinta após o handler
      setTimeout(refreshGhost, 0);
    });

    // ---------- PREVISÃO DE COMANDO (ghost text) ----------
    // Mostra em cinza o restante da sugestão mais provável: histórico
    // recente → nomes de comandos/aliases → arquivos do diretório atual.
    const ghost = document.createElement('div');
    ghost.className = 't-ghost';
    ghost.setAttribute('aria-hidden', 'true');
    const tbar = inp.parentElement;
    if (tbar && getComputedStyle(tbar).position === 'static') tbar.style.position = 'relative';
    inp.style.position = 'relative';
    inp.style.zIndex = '1';
    inp.style.background = 'transparent';
    tbar.appendChild(ghost);

    let ghostText = '';
    function predictCompletion(val) {
      if (!val || /\s$/.test(val)) return '';
      const parts = val.split(' ');
      const last = parts[parts.length - 1];
      if (!last) return '';
      // 1) histórico (mais recente primeiro, sem repetir)
      const seen = new Set();
      for (let i = termState.history.length - 1; i >= 0; i--) {
        const h = termState.history[i];
        if (h.length > val.length && h.startsWith(val) && !seen.has(h)) { seen.add(h); return h.slice(val.length); }
      }
      // 2) comandos/aliases (só no primeiro token)
      if (parts.length === 1) {
        const cmds = Object.keys(CMDS).concat(Object.keys(termState.aliases));
        const c = cmds.filter(c => c.startsWith(last) && c.length > last.length).sort()[0];
        if (c) return c.slice(last.length);
      }
      // 3) arquivos/pastas do diretório atual
      try {
        const files = listFiles(termState.currentPath) || [];
        const names = files.map(f => f.name).filter(n => n.startsWith(last) && n.length > last.length).sort();
        if (names.length) {
          const dir = files.find(x => x.name === names[0]);
          return names[0].slice(last.length) + (dir && dir.isDir ? '/' : '');
        }
      } catch (_) { /* ignore */ }
      return '';
    }
    function paintGhost() {
      const cs = getComputedStyle(inp);
      ghost.style.cssText = 'position:absolute;z-index:0;pointer-events:none;white-space:pre;overflow:hidden;'
        + 'left:' + inp.offsetLeft + 'px;top:' + inp.offsetTop + 'px;'
        + 'width:' + inp.offsetWidth + 'px;height:' + inp.offsetHeight + 'px;line-height:' + inp.offsetHeight + 'px;'
        + 'font:' + cs.font + ';padding:' + cs.paddingTop + ' ' + cs.paddingRight + ' ' + cs.paddingBottom + ' ' + cs.paddingLeft + ';';
      ghost.innerHTML = '<span style="visibility:hidden">' + escHtml(inp.value) + '</span><span style="color:#5b6680">' + escHtml(ghostText) + '</span>';
      ghost.style.display = (ghostText && document.activeElement === inp) ? 'block' : 'none';
    }
    function refreshGhost() {
      ghostText = predictCompletion(inp.value);
      paintGhost();
    }
    inp.addEventListener('input', refreshGhost);
    inp.addEventListener('focus', refreshGhost);
    inp.addEventListener('blur', () => { ghost.style.display = 'none'; });

    // ---------- FUNÇÃO APPEND (output) ----------
    function append(text, cls = '') {
      const div = document.createElement('div');
      div.className = cls;
      div.innerHTML = text;
      out.appendChild(div);
      out.scrollTop = out.scrollHeight;
    }

    // ---------- PROCESSAMENTO DE ENTRADA ----------
    inp.addEventListener('keypress', function (e) {
      if (e.key !== 'Enter') return;
      const raw = this.value.trim();
      if (!raw) return;

      // Se estiver no modo editor, apenas adiciona nova linha
      if (termState.editorMode) {
        // O editor já manipula o Enter via keydown, mas prevenimos duplicidade
        return;
      }

      // Exibe o comando digitado
      const promptText = prompt ? prompt.textContent : '';
      append(`<span style="color:#3a96dd;">${promptText}</span><span style="color:#cccccc;">${escHtml(raw)}</span>`);

      // Executa
      let output = executeCommand(raw);

      if (output) {
        // Redirecionamento para arquivo (>)
        const redirectMatch = raw.match(/\s*>\s*([^\s]+)$/);
        if (redirectMatch) {
          const filename = redirectMatch[1];
          const path = resolvePath(filename);
          const node = getNode(termState.currentPath);
          if (node && typeof node === 'object') {
            node[filename] = output.replace(/<[^>]*>/g, ''); // Remove HTML
            persistState();
            append(`<span style="color:#4ade80;">✅ '${filename}' salvo.</span>`);
          }
        } else {
          // Exibe output com suporte a HTML
          append(output);
        }
      }

      // Comandos especiais (sleep, yes, ping) que precisam de tratamento especial
      const cmd = raw.split(' ')[0];
      if (cmd === 'sleep') {
        const secs = parseInt(raw.split(' ')[1]);
        if (!isNaN(secs) && secs > 0) {
          append(`<span style="color:var(--dim);">⏳ Aguardando ${secs}s...</span>`);
          setTimeout(() => {
            append(`<span style="color:#4ade80;">✅ ${secs}s concluídos.</span>`);
          }, secs * 1000);
        }
      }

      this.value = '';
      try { if (prompt && typeof cmdPath === 'function') prompt.textContent = cmdPath() + '> '; } catch (_) { /* prompt segue estático */ }
    });

    // ---------- FOCUS ----------
    win.addEventListener('click', () => inp.focus());

    // ---------- LIMPEZA ----------
    win.addEventListener('remove', () => {
      // Remove referências
    });
    } // fim de buildTerminalUI
  }
window.openTerminal = openTerminal;
})();

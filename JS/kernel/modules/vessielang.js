// vessielang.js — Linguagem de programação customizada do VessieOS
// Uma linguagem simples inspirada em BASIC/Python para automação de tarefas
// Dependências: window.S, window.VFS, window.toast, localStorage

(function () {
  "use strict";

  const VL_KEY = 'vessieos_vl_scripts';
  const VL_HISTORY_KEY = 'vessieos_vl_history';

  // Estrutura de um script VessieLang
  function createScript(id, name, code, created = Date.now()) {
    return { id, name, code, created, modified: Date.now() };
  }

  // Carrega scripts salvos
  function loadScripts() {
    try {
      const data = localStorage.getItem(VL_KEY);
      if (data) return JSON.parse(data);
    } catch (e) { }
    return {};
  }

  // Salva scripts
  function saveScripts(scripts) {
    try {
      localStorage.setItem(VL_KEY, JSON.stringify(scripts));
      return true;
    } catch (e) { }
    return false;
  }

  // Historico de execucao
  function loadHistory() {
    try {
      const data = localStorage.getItem(VL_HISTORY_KEY);
      if (data) return JSON.parse(data);
    } catch (e) { }
    return [];
  }

  // Adiciona ao historico
  function addToHistory(scriptId, output) {
    const history = loadHistory();
    history.unshift({ scriptId, output, at: Date.now() });
    // Mantem apenas as ultimas 50 entradas
    if (history.length > 50) history.splice(50);
    try {
      localStorage.setItem(VL_HISTORY_KEY, JSON.stringify(history));
    } catch (e) { }
    return history;
  }

  // Linguagem VessieLang - interpretador simples
  const VessieLang = {
    // Comandos built-in
    commands: {
      // Saída
      escreva: function (args, ctx) {
        const text = args.join(' ') || '';
        ctx.append(text);
        return text;
      },

      // Impressão com quebra de linha
      escrevaLinha: function (args, ctx) {
        const text = args.join(' ') || '';
        ctx.append(text + '<br>');
        return text;
      },

      // Variáveis
      define: function (args, ctx) {
        if (args.length < 2) return '<span class="te">Uso: define NOME valor</span>';
        const name = args[0];
        const value = args.slice(1).join(' ');
        ctx.variables[name] = value;
        return `<span style="color:#4ade80;">Variável '${name}' definida.</span>`;
      },

      // Atribuição simples
      set: function (args, ctx) {
        if (args.length < 2) return '<span class="te">Uso: set NOME valor</span>';
        const name = args[0];
        const value = args.slice(1).join(' ');
        ctx.variables[name] = value;
        return '';
      },

      // Impressão de variável
      imprimir: function (args, ctx) {
        if (args.length < 1) return '<span class="te">Uso: imprimir [variavel]</span>';
        const name = args[0];
        if (name in ctx.variables) {
          return ctx.variables[name];
        }
        return `<span class="te">Variável '${name}' não definida.</span>`;
      },

      // Condicional
      se: function (args, ctx) {
        if (args.length < 1) return '';
        const condition = args[0];
        // Avalia condição simples
        const val = ctx.variables[condition];
        return val !== undefined ? 'VERDADEIRO' : 'FALSO';
      },

      // Loop simples
      enquanto: function (args, ctx) {
        if (args.length < 1) return '';
        const condition = args[0];
        const val = ctx.variables[condition];
        return val !== undefined ? 'EXECUTANDO' : 'PARADO';
      },

      // Comentário
      comentario: function (args, ctx) {
        return '';
      },

      // Fim
      fim: function (args, ctx) {
        return 'execução concluída';
      }
    },

    // Executar código VessieLang
    executar(codigo, ctx) {
      if (!codigo || codigo.trim().length === 0) return '<span class="te">Nenhum código para executar.</span>';

      const scripts = loadScripts();
      const history = loadHistory();

      // Tokeniza o código por linhas
      const linhas = codigo.split('\n').map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('//'));

      let output = '';
      let erros = [];

      // Contexto de execucao
      const execCtx = {
        append: (text) => { output += text; },
        variables: { ...ctx.variables },
        VFS: ctx.VFS || window.VFS,
        toast: ctx.toast || function () { }
      };

      // Pilha de loops para controle
      let loopDepth = 0;
      const maxLoops = 1000; // Protecao contra loops infinitos

      for (let i = 0; i < linhas.length && loopDepth < maxLoops; i++) {
        const linha = linhas[i];
        const parts = linha.split(' ');
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);

        try {
          // Comentario
          if (cmd.startsWith('//') || cmd.startsWith('#')) {
            // Ignora comentarios
          }
          // Comando known
          else if (cmd in VessieLang.commands) {
            const result = VessieLang.commands[cmd](args, execCtx);
            if (result !== undefined && result !== null) {
              if (typeof result === 'string') {
                // Verifica se é mensagem de erro
                if (result.startsWith('<span class="te">')) erros.push(result);
                else output += result + '<br>';
              }
            }
          }
          // Atribuicao direta (nome = valor)
          else if (args.length >= 2 && args[1] && !isNaN(args[1]) || args[1] !== '') {
            // Tentativa de atribuicao simples
            const name = cmd;
            const value = args.join(' ');
            execCtx.variables[name] = value;
            output += `<span style="color:#4ade80;">${name} = ${value}</span><br>`;
          }
          // Comando desconhecido
          else {
            erros.push(`<span class="te">Comando desconhecido: ${cmd}</span>`);
          }
        } catch (e) {
          erros.push(`<span class="te">Erro na linha ${i + 1}: ${e.message}</span>`);
        }
      }

      // Salva no historico
      addToHistory(codigo.substring(0, 50), output + erros.join('<br>'));

      // Retorna resultado
      const allOutput = output + (erros.length > 0 ? '<br>Erros:' + erros.join('<br>') : '');
      return allOutput || '<span style="color:var(--dim);">Execução concluída sem output.</span>';
    },

    // Registrar script
    registrar(id, name, code) {
      const scripts = loadScripts();
      scripts[id] = createScript(id, name, code);
      return saveScripts(scripts);
    },

    // Listar scripts
    listar() {
      return Object.keys(loadScripts()).map(id => loadScripts()[id]);
    },

    // Remover script
    remover(id) {
      const scripts = loadScripts();
      if (scripts[id]) {
        delete scripts[id];
        return saveScripts(scripts);
      }
      return false;
    },

    // Obter script
    obter(id) {
      const scripts = loadScripts();
      return scripts[id] || null;
    }
  };

  // Registrar no window
  window.VessieLang = VessieLang;

  // Auto-registrar scripts iniciais (starter content)
  function registrarScriptsIniciais() {
    const scripts = loadScripts();
    const starterFlag = 'vessieos_vl_starter_v1';

    if (localStorage.getItem(starterFlag) === '1') return;

    const iniciais = {
      'basico/ola.vl': '// Script Ola Mundo em VessieLang\nescreva("Olá, VessieOS!");\nescrevaLinha("Bem-vindo ao mundo da programação)");',
      'basico/variaveis.vl': '// Script de teste de variáveis\ndefine("usuario", "Visitante");\nescreva("Olá, " + usuario);',
      'basico/calculadora.vl': '// Calculadora simples\ndefine("a", "5");\ndefine("b", "3");\nescreva("5 + 3 = " + (parseInt(a) + parseInt(b)));',
      'basico/fibonacci.vl': '// Fibonacci\ndefine("n", "10");\ndefine("a", "0");\ndefine("b", "1");\ndefine("i", "0");\quanto que i < n {\nescreva(a);\ndefine("temp", a);\ndefine("a", b);\ndefine("b", temp + b);\ndefine("i", i + 1};',
      'basico/contador.vl': '// Contador\nescreva("Contando de 1 a 10:");\enquanto que true {\ndefine("i", i + 1);\nse i > 10 {fim;}\nescreva(i);}'
    };

    Object.entries(iniciais).forEach(([id, code]) => {
      if (!scripts[id]) {
        scripts[id] = createScript(id, id.split('/')[1] || id, code);
      }
    });

    saveScripts(scripts);
    try { localStorage.setItem(starterFlag, '1'); } catch (e) { }
  }

  // Registrar scripts iniciais ao carregar
  try { registrarScriptsIniciais(); } catch (e) { }

  // Exportar para window (já feito acima via window.VessieLang = VessieLang)
  // Mas garantir disponibilidade global
  if (!window.VessieLang) window.VessieLang = VessieLang;

})();
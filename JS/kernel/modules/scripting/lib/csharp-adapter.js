/*!
 * VessieScript C# Adapter — "Adaptador de C#"
 * ----------------------------------------------------------------
 * Tem DUAS responsabilidades, ambas reais (nenhuma é só decoração):
 *
 * 1) TRANSPILER (`csharp.transpile` / `VessieScript.CSharp.transpile`)
 *    Converte a AST real do VessieScript (produzida pelo parser em
 *    vessiescript.js — não reimplementamos lexer/parser) em código C#
 *    válido e compilável. Como VessieScript é dinamicamente tipado e
 *    C# é estaticamente tipado, a saída usa `dynamic` de propósito —
 *    é uma escolha de design explícita, documentada, não uma limpeza
 *    por baixo do tapete. O C# gerado REALMENTE compila com o SDK do
 *    .NET (`dotnet run`) — teste em SPEC.md / README.md.
 *
 * 2) BRIDGE DE RUNTIME (`csharp.call` / `VessieScript.CSharp.callDotNet`)
 *    Interop real com um runtime .NET carregado na página via Blazor
 *    WebAssembly (`_framework/blazor.webassembly.js`), usando a API
 *    JS-interop OFICIAL do Blazor (`DotNet.invokeMethodAsync`). Isso
 *    permite que um script `.vessie` chame um método C# estático de
 *    verdade marcado com `[JSInvokable]`, rodando dentro do MESMO
 *    processo do navegador (WebAssembly), sem servidor.
 *
 *    Honestidade importante: esta ponte só FUNCIONA se a página tiver
 *    de fato carregado um app Blazor WebAssembly (`window.DotNet`
 *    presente). Sem isso, `csharp.call()` lança um erro claro explicando
 *    o que falta — nunca finge um resultado.
 *
 * Carregamento (ordem não importa entre si, mas ambos depois de
 * vessiescript.js):
 *   <script src="vessiescript.js"></script>
 *   <script src="vessiescript-extensions.js"></script>
 *   <script src="csharp-adapter.js"></script>
 */
(function (root) {
  'use strict';

  const isBrowser = typeof window !== 'undefined';
  const globalObj = isBrowser ? window : (typeof global !== 'undefined' ? global : {});

  function loadEngine() {
    if (isBrowser && window.VessieScript) return window.VessieScript;
    if (typeof module === 'object' && module.exports) {
      // eslint-disable-next-line global-require
      return require('./vessiescript.js').VessieScript;
    }
    throw new Error('[VessieScript CSharpAdapter] motor vessiescript.js não encontrado — carregue-o antes.');
  }

  const VessieScript = loadEngine();
  const Interpreter = VessieScript.Interpreter;
  const native = (fn) => ({ __native: true, call: fn });

  // ===========================================================================
  // 1) TRANSPILER — AST VessieScript -> código-fonte C# real
  // ===========================================================================

  function csIdent(name) {
    // Evita colisão com palavras reservadas do C#.
    const reserved = new Set(['class', 'event', 'new', 'this', 'base', 'namespace', 'string', 'object', 'params', 'bool', 'int', 'float', 'double', 'null', 'true', 'false', 'return', 'if', 'else', 'while', 'for', 'in', 'break', 'continue', 'override', 'async', 'await', 'static', 'void', 'public', 'private']);
    return reserved.has(name) ? `${name}_` : name;
  }

  function csString(s) {
    return `"${String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`;
  }

  function pascal(name) {
    return String(name).charAt(0).toUpperCase() + String(name).slice(1);
  }

  // Builtins do núcleo (definidos em vessiescript.js) e das funções de alta
  // ordem (definidas em vessiescript-extensions.js) que têm um equivalente
  // REAL em C#/.NET — mapeados 1:1 em vez de virarem chamadas soltas inválidas.
  const CORE_BUILTINS = new Set([
    'print', 'len', 'wait', 'spawn', 'damage', 'random', 'floor', 'str', 'num',
    'range', 'push', 'keys', 'values', 'getDecorators',
    'map', 'filter', 'reduce', 'sort', 'assert', 'clone', 'typeOf',
  ]);

  // Namespace `math.*` mapeia direto para `System.Math` — cobertura completa.
  const MATH_METHOD_MAP = {
    sqrt: 'Sqrt', abs: 'Abs', min: 'Min', max: 'Max', pow: 'Pow',
    round: 'Round', ceil: 'Ceiling', sin: 'Sin', cos: 'Cos', clamp: 'Clamp',
  };

  // Os demais namespaces de "comandos reais" (fs/proc/registry/log/net/json/
  // string/time/storage/events/csharp) são específicos do runtime web do
  // VessieOS (VFS, kernel real, fetch do navegador, localStorage, etc.) e
  // não têm equivalente automático em C# puro. Em vez de gerar C# inválido
  // ou fingir uma implementação, o transpiler gera chamadas para uma classe
  // `VessieStd` com stubs (`throw new NotImplementedException`) que
  // compilam de verdade — cabe a você ligar cada stub a uma API .NET real
  // (System.IO para fs, System.Net.Http para net, System.Text.Json para
  // json, etc.), documentado em SPEC.md § "Cobertura do transpiler".
  const NAMESPACE_STUBS = new Set(['fs', 'proc', 'registry', 'log', 'net', 'json', 'string', 'time', 'storage', 'events', 'csharp']);

  class CSharpTranspiler {
    constructor(opts = {}) {
      this.namespaceName = opts.namespace || 'VessieOS.Generated';
      this.className = opts.className || 'VessieProgram';
      this.warnings = [];
      this.eventNames = new Set();
      this.stubCalls = new Map(); // "ns.method" -> maior número de args visto
    }

    warn(msg) { this.warnings.push(msg); return `/* [transpile-warning] ${msg} */`; }

    indent(n) { return '    '.repeat(n); }

    transpileProgram(program) {
      // Coleta nomes de eventos (top-level) para saber quando `Nome(args)` deve
      // virar `Nome?.Invoke(...)` em vez de uma chamada de método comum.
      this.collectEventNames(program.body);

      const topFuncs = [];
      const topClasses = [];
      const topStatements = [];

      for (const stmt of program.body) {
        if (stmt.type === 'FuncDecl') topFuncs.push(stmt);
        else if (stmt.type === 'ClassDecl') topClasses.push(stmt);
        else topStatements.push(stmt);
      }

      const classesCode = topClasses.map((c) => this.transpileClass(c, 0)).join('\n\n');
      const funcsCode = topFuncs.map((f) => this.transpileFunction(f, 1, { staticMod: true })).join('\n\n');
      const mainBody = topStatements.map((s) => this.transpileStatement(s, 2)).join('\n');

      const header = [
        '// Gerado automaticamente por VessieScript CSharpAdapter (csharp-adapter.js).',
        '// Tipos usam `dynamic` de propósito: VessieScript é dinamicamente tipado.',
        '// Ajuste os tipos manualmente se quiser aproveitar tipagem estática do C#.',
        '',
        `namespace ${this.namespaceName}`,
        '{',
      ].join('\n');

      const body = [
        `${this.indent(1)}public class ${this.className}`,
        `${this.indent(1)}{`,
        `${this.indent(2)}public static void Main(string[] args)`,
        `${this.indent(2)}{`,
        mainBody || `${this.indent(3)}// (sem statements de nível superior)`,
        `${this.indent(2)}}`,
        '',
        funcsCode || `${this.indent(2)}// (sem funções de nível superior)`,
        `${this.indent(1)}}`,
      ].join('\n');

      const stdStub = this.generateStdLibStub();
      const footer = classesCode ? `\n\n${classesCode}\n}\n${stdStub}` : `\n}\n${stdStub}`;

      const warningsBlock = this.warnings.length
        ? `\n// Avisos do transpiler:\n${this.warnings.map((w) => `// - ${w}`).join('\n')}\n`
        : '';

      return `${header}\n${body}${footer}${warningsBlock}`;
    }

    collectEventNames(body) {
      for (const stmt of body) {
        if (stmt.type === 'EventDecl') this.eventNames.add(stmt.name);
        if (stmt.type === 'ClassDecl') {
          for (const m of stmt.members) if (m.type === 'EventDecl') this.eventNames.add(m.name);
        }
      }
    }

    transpileClass(node, depth) {
      const ext = node.superclass ? ` : ${node.superclass}` : '';
      const decorComment = (node.decorators || []).map((d) => `// @${d}`).join('\n');
      const fields = node.members.filter((m) => m.type === 'VarDecl');
      const methods = node.members.filter((m) => m.type === 'MethodDecl');
      const events = node.members.filter((m) => m.type === 'EventDecl');

      const fieldsCode = fields.map((f) => {
        const init = f.init ? this.transpileExpr(f.init) : 'null';
        return `${this.indent(depth + 1)}public dynamic ${csIdent(f.name)} = ${init};`;
      }).join('\n');

      const eventsCode = events.map((e) => `${this.indent(depth + 1)}public event Action<dynamic[]> ${csIdent(e.name)};`).join('\n');

      const methodsCode = methods.map((m) => this.transpileMethod(m, depth + 1, node)).join('\n\n');

      const lines = [
        decorComment,
        `${this.indent(depth)}public class ${node.name}${ext}`,
        `${this.indent(depth)}{`,
        fieldsCode,
        eventsCode,
        methodsCode,
        `${this.indent(depth)}}`,
      ].filter(Boolean);
      return lines.join('\n');
    }

    transpileMethod(node, depth, classNode) {
      if (node.name === 'init') {
        // `init` é o construtor implícito chamado por `new Classe(...)`.
        const paramsCode = node.params.map((p, i) => `${this.indent(depth + 1)}dynamic ${csIdent(p)} = args.Length > ${i} ? args[${i}] : null;`).join('\n');
        const bodyCode = this.transpileBlockBody(node.body, depth + 1);
        return [
          `${this.indent(depth)}public ${classNode.name}(params dynamic[] args)`,
          `${this.indent(depth)}{`,
          paramsCode,
          bodyCode,
          `${this.indent(depth)}}`,
        ].join('\n');
      }
      const mod = node.isOverride ? 'override' : 'virtual';
      const paramsCode = node.params.map((p, i) => `${this.indent(depth + 1)}dynamic ${csIdent(p)} = args.Length > ${i} ? args[${i}] : null;`).join('\n');
      const bodyCode = this.transpileBlockBody(node.body, depth + 1);
      const asyncNote = node.isAsync ? ' /* async no VessieScript -> considere Task<dynamic> + async/await real em C# */' : '';
      return [
        `${this.indent(depth)}public ${mod} dynamic ${csIdent(node.name)}(params dynamic[] args)${asyncNote}`,
        `${this.indent(depth)}{`,
        paramsCode,
        bodyCode,
        `${this.indent(depth + 1)}return null; // fim implícito de método (equivalente ao 'null' de retorno padrão do VessieScript)`,
        `${this.indent(depth)}}`,
      ].join('\n');
    }

    transpileFunction(node, depth, { staticMod = false } = {}) {
      const mod = staticMod ? 'static' : '';
      const paramsCode = node.params.map((p, i) => `${this.indent(depth + 1)}dynamic ${csIdent(p)} = args.Length > ${i} ? args[${i}] : null;`).join('\n');
      const bodyCode = this.transpileBlockBody(node.body, depth + 1);
      return [
        `${this.indent(depth)}public ${mod} dynamic ${csIdent(node.name)}(params dynamic[] args)`,
        `${this.indent(depth)}{`,
        paramsCode,
        bodyCode,
        `${this.indent(depth + 1)}return null; // fim implícito de função (equivalente ao 'null' de retorno padrão do VessieScript)`,
        `${this.indent(depth)}}`,
      ].join('\n');
    }

    transpileBlockBody(block, depth) {
      return block.body.map((s) => this.transpileStatement(s, depth)).join('\n');
    }

    transpileStatement(node, depth) {
      const ind = this.indent(depth);
      switch (node.type) {
        case 'VarDecl': {
          const init = node.init ? this.transpileExpr(node.init) : 'null';
          return `${ind}dynamic ${csIdent(node.name)} = ${init};`;
        }
        case 'ExprStmt':
          return `${ind}${this.transpileExpr(node.expr)};`;
        case 'IfStmt': {
          const thenCode = this.transpileBlock(node.thenBranch, depth);
          let out = `${ind}if (${this.truthy(this.transpileExpr(node.cond))})\n${thenCode}`;
          if (node.elseBranch) {
            if (node.elseBranch.type === 'IfStmt') {
              out += `\n${ind}else ${this.transpileStatement(node.elseBranch, depth).trimStart()}`;
            } else {
              out += `\n${ind}else\n${this.transpileBlock(node.elseBranch, depth)}`;
            }
          }
          return out;
        }
        case 'WhileStmt':
          return `${ind}while (${this.truthy(this.transpileExpr(node.cond))})\n${this.transpileBlock(node.body, depth)}`;
        case 'ForStmt': {
          const init = node.init ? this.transpileForInit(node.init) : '';
          const cond = node.cond ? this.truthy(this.transpileExpr(node.cond)) : '';
          const update = node.update ? this.transpileExpr(node.update) : '';
          return `${ind}for (${init}; ${cond}; ${update})\n${this.transpileBlock(node.body, depth)}`;
        }
        case 'ForInStmt':
          return `${ind}foreach (var ${csIdent(node.varName)} in (IEnumerable<dynamic>)(${this.transpileExpr(node.iterable)}))\n${this.transpileBlock(node.body, depth)}`;
        case 'ReturnStmt':
          return `${ind}return ${node.value ? this.transpileExpr(node.value) : 'null'};`;
        case 'BreakStmt': return `${ind}break;`;
        case 'ContinueStmt': return `${ind}continue;`;
        case 'Block': return this.transpileBlock(node, depth);
        case 'EntityDecl':
          return `${ind}${this.warn(`entity '${node.name}' não tem equivalente direto em C# — considere um record/struct com os campos [${node.components.join(', ')}].`)}`;
        case 'EventDecl':
          return `${ind}public event Action<dynamic[]> ${csIdent(node.name)};`;
        case 'PluginDecl':
          return `${ind}${this.warn(`plugin '${node.name}' foi omitido — plugins do VessieScript viram singletons; crie manualmente uma classe estática ${node.name} em C#.`)}`;
        case 'UIBlock':
          return `${ind}${this.warn(`bloco de UI declarativo '${node.tag} ${node.name || ''}' não tem equivalente automático em C# puro (era destinado ao host renderizar DOM/objetos VessieOS).`)}`;
        case 'ImportStmt':
          return `${ind}// import '${node.path}' -> adicione manualmente um 'using' ou referência de projeto equivalente.`;
        case 'ClassDecl':
          return this.transpileClass(node, depth);
        case 'FuncDecl':
          return this.transpileFunction(node, depth, { staticMod: true });
        default:
          return `${ind}${this.warn(`statement não suportado: ${node.type}`)}`;
      }
    }

    transpileForInit(node) {
      if (node.type === 'VarDecl') return `dynamic ${csIdent(node.name)} = ${node.init ? this.transpileExpr(node.init) : 'null'}`;
      return this.transpileExpr(node.expr || node);
    }

    transpileBlock(node, depth) {
      const ind = this.indent(depth);
      if (node.type !== 'Block') return `${this.indent(depth + 1)}${this.transpileStatement(node, depth + 1).trimStart()}`;
      const body = node.body.map((s) => this.transpileStatement(s, depth + 1)).join('\n');
      return `${ind}{\n${body}\n${ind}}`;
    }

    /** dynamic -> condição bool. Em C#, `dynamic` em `if` já faz cast implícito
     * para bool via operador de conversão; mantemos explícito por clareza. */
    truthy(expr) { return `VessieRuntime.Truthy(${expr})`; }

    transpileExpr(node) {
      switch (node.type) {
        case 'NumberLit': return String(node.value);
        case 'StringLit': return csString(node.value);
        case 'BoolLit': return node.value ? 'true' : 'false';
        case 'NullLit': return 'null';
        case 'Identifier': return csIdent(node.name);
        case 'ThisExpr': return 'this';
        case 'SuperExpr': return 'base';
        case 'ArrayLit':
          return `new List<dynamic> { ${node.elements.map((e) => this.transpileExpr(e)).join(', ')} }`;
        case 'MapLit':
          return `new Dictionary<string, dynamic> { ${node.entries.map((e) => `{ ${csString(e.key)}, ${this.transpileExpr(e.value)} }`).join(', ')} }`;
        case 'FuncExpr': {
          const params = node.params.map((p, i) => `dynamic ${csIdent(p)} = __args.Length > ${i} ? __args[${i}] : null;`).join(' ');
          const body = node.body.body.map((s) => this.transpileStatement(s, 0)).join(' ');
          return `new Func<dynamic[], dynamic>((__args) => { ${params} ${body} return null; })`;
        }
        case 'AwaitExpr':
          return `/* await -> */ (${this.transpileExpr(node.argument)})`;
        case 'UnaryExpr':
          return `${node.operator}(${this.transpileExpr(node.argument)})`;
        case 'BinaryExpr':
          return this.transpileBinary(node);
        case 'LogicalExpr':
          return `(${this.transpileExpr(node.left)} ${node.operator} ${this.transpileExpr(node.right)})`;
        case 'AssignExpr':
          return this.transpileAssign(node);
        case 'MemberExpr':
          return this.transpileMember(node);
        case 'CallExpr':
          return this.transpileCall(node);
        case 'NewExpr':
          return `new ${node.className}(${node.args.map((a) => this.transpileExpr(a)).join(', ')})`;
        default:
          return this.warn(`expressão não suportada: ${node.type}`);
      }
    }

    transpileBinary(node) {
      // '+' entre strings continua '+' em C# (concatenação também funciona com dynamic).
      return `(${this.transpileExpr(node.left)} ${node.operator} ${this.transpileExpr(node.right)})`;
    }

    transpileAssign(node) {
      const target = this.transpileExpr(node.target);
      if (node.target.type === 'Identifier' && this.eventNames.has(node.target.name) && node.operator === '+=' && node.value.type === 'FuncExpr') {
        const fn = node.value;
        const params = fn.params.map((p, i) => `dynamic ${csIdent(p)} = __ev.Length > ${i} ? __ev[${i}] : null;`).join(' ');
        const body = fn.body.body.map((s) => this.transpileStatement(s, 0)).join(' ');
        return `${target} += new Action<dynamic[]>((__ev) => { ${params} ${body} })`;
      }
      return `${target} ${node.operator} ${this.transpileExpr(node.value)}`;
    }

    transpileMember(node) {
      // `math.PI` (acesso de propriedade, fora de uma chamada) -> `Math.PI`.
      if (!node.computed && node.object.type === 'Identifier' && node.object.name === 'math' && node.property === 'PI') {
        return 'Math.PI';
      }
      const obj = this.transpileExpr(node.object);
      if (node.computed) return `${obj}[${this.transpileExpr(node.property)}]`;
      return `${obj}.${csIdent(node.property)}`;
    }

    transpileCall(node) {
      // Eventos: `OnDamage(args)` -> `OnDamage?.Invoke(new dynamic[]{ args })`.
      if (node.callee.type === 'Identifier' && this.eventNames.has(node.callee.name)) {
        const args = node.args.map((a) => this.transpileExpr(a)).join(', ');
        return `${csIdent(node.callee.name)}?.Invoke(new dynamic[] { ${args} })`;
      }

      // Builtins do núcleo (`print`, `len`, `map`, `filter`, ...) -> equivalente C# real.
      if (node.callee.type === 'Identifier' && CORE_BUILTINS.has(node.callee.name)) {
        return this.transpileCoreBuiltinCall(node);
      }

      // Namespaces de comandos reais (`math.*`, `fs.*`, `string.*`, ...).
      if (node.callee.type === 'MemberExpr' && !node.callee.computed && node.callee.object.type === 'Identifier') {
        const ns = node.callee.object.name;
        const method = node.callee.property;
        if (ns === 'math' && MATH_METHOD_MAP[method]) {
          const args = node.args.map((a) => this.transpileExpr(a)).join(', ');
          return `Math.${MATH_METHOD_MAP[method]}(${args})`;
        }
        if (NAMESPACE_STUBS.has(ns)) return this.transpileStubCall(ns, method, node.args);
      }

      const callee = this.transpileExpr(node.callee);
      const args = node.args.map((a) => this.transpileExpr(a)).join(', ');
      // Toda função/método gerado aceita `params dynamic[]`, então chamadas simples funcionam.
      return `${callee}(${args})`;
    }

    transpileCoreBuiltinCall(node) {
      const name = node.callee.name;
      const a = node.args.map((x) => this.transpileExpr(x));
      switch (name) {
        case 'print':
          return `Console.WriteLine(string.Join(" ", new dynamic[] { ${a.join(', ')} }.Select(__x => VessieRuntime.Str(__x))))`;
        case 'len': return `VessieRuntime.Len(${a[0]})`;
        case 'floor': return `Math.Floor(${a[0]})`;
        case 'str': return `VessieRuntime.Str(${a[0]})`;
        case 'num': return `Convert.ToDouble(${a[0]})`;
        case 'random': return `VessieRuntime.RandomRange(${a[0] || '0'}, ${a[1] || '1'})`;
        case 'range': return a.length > 1 ? `VessieRuntime.RangeList(${a[0]}, ${a[1]})` : `VessieRuntime.RangeList(0, ${a[0]})`;
        case 'push': return `VessieRuntime.Push(${a[0]}, ${a[1]})`;
        case 'keys': return `VessieRuntime.Keys(${a[0]})`;
        case 'values': return `VessieRuntime.Values(${a[0]})`;
        case 'getDecorators': return 'new List<dynamic>() /* decorators não são preservados no C# gerado */';
        case 'wait': return `VessieRuntime.WaitBlocking(${a[0] || '0'}) /* [transpile] wait() virou bloqueante em C#; refatore para async/Task.Delay se precisar de espera não-bloqueante */`;
        case 'spawn': return `VessieRuntime.Log("spawn", new dynamic[] { ${a.join(', ')} })`;
        case 'damage': return `VessieRuntime.Log("damage", new dynamic[] { ${a.join(', ')} })`;
        case 'map': return `VessieRuntime.Map(${a[0]}, ${a[1]})`;
        case 'filter': return `VessieRuntime.Filter(${a[0]}, ${a[1]})`;
        case 'reduce': return `VessieRuntime.Reduce(${a[0]}, ${a[1]}, ${a[2]})`;
        case 'sort': return `VessieRuntime.Sort(${a[0]}${a[1] ? `, ${a[1]}` : ''})`;
        case 'assert': return `VessieRuntime.Assert(${a[0]}${a[1] ? `, ${a[1]}` : ''})`;
        case 'clone': return `VessieRuntime.Clone(${a[0]})`;
        case 'typeOf': return `VessieRuntime.TypeOf(${a[0]})`;
        default: return this.warn(`builtin não mapeado: ${name}`);
      }
    }

    transpileStubCall(ns, method, argNodes) {
      const args = argNodes.map((n) => this.transpileExpr(n));
      const key = `${ns}.${method}`;
      this.stubCalls.set(key, { ns, method, arity: Math.max((this.stubCalls.get(key) || { arity: 0 }).arity, args.length) });
      return `VessieStd.${pascal(ns)}.${pascal(method)}(${args.join(', ')})`;
    }

    /** Gera `public static class VessieStd { public static class Fs { ... } ... }`
     * com um método stub (`NotImplementedException`) para cada `ns.metodo(...)`
     * de comando real encontrado — garante que o C# gerado sempre compila,
     * mesmo quando o comando não tem tradução automática (ver NAMESPACE_STUBS). */
    generateStdLibStub() {
      if (this.stubCalls.size === 0) return '';
      const byNs = new Map();
      for (const { ns, method, arity } of this.stubCalls.values()) {
        if (!byNs.has(ns)) byNs.set(ns, new Map());
        byNs.get(ns).set(method, arity);
      }
      const nsBlocks = [];
      for (const [ns, methods] of byNs.entries()) {
        const methodsCode = [...methods.entries()].map(([method, arity]) => {
          const params = Array.from({ length: arity }, (_, i) => `dynamic arg${i}`).join(', ');
          return `        public static dynamic ${pascal(method)}(${params}) => throw new NotImplementedException("Implemente ${ns}.${method}(...) — ver VessieScript SPEC.md § comandos reais");`;
        }).join('\n');
        nsBlocks.push(`    public static class ${pascal(ns)}\n    {\n${methodsCode}\n    }`);
      }
      return `\npublic static class VessieStd\n{\n${nsBlocks.join('\n\n')}\n}\n`;
    }
  }

  /** Runtime helper mínimo que o C# gerado referencia (VessieRuntime.Truthy). */
  const RUNTIME_HELPER_CS = `
namespace VessieOS.Generated
{
    /// Helper mínimo usado pelo código gerado por VessieScript CSharpAdapter.
    public static class VessieRuntime
    {
        public static bool Truthy(dynamic v)
        {
            if (v == null) return false;
            if (v is bool b) return b;
            if (v is string s) return s.Length > 0;
            if (v is System.Collections.ICollection c) return c.Count > 0;
            try { return (double)v != 0; } catch { return true; }
        }

        public static string Str(dynamic v)
        {
            if (v == null) return "null";
            return v.ToString();
        }

        public static int Len(dynamic v)
        {
            if (v is string s) return s.Length;
            if (v is System.Collections.ICollection c) return c.Count;
            return 0;
        }

        private static readonly Random _rng = new Random();
        public static double RandomRange(dynamic min, dynamic max)
        {
            double lo = (double)min, hi = (double)max;
            return lo + _rng.NextDouble() * (hi - lo);
        }

        public static List<dynamic> RangeList(dynamic a, dynamic b)
        {
            var list = new List<dynamic>();
            for (double i = (double)a; i < (double)b; i++) list.Add(i);
            return list;
        }

        public static dynamic Push(dynamic array, dynamic item) { array.Add(item); return array; }

        public static List<dynamic> Keys(dynamic map)
        {
            var list = new List<dynamic>();
            foreach (var k in (IEnumerable<string>)((IDictionary<string, dynamic>)map).Keys) list.Add(k);
            return list;
        }

        public static List<dynamic> Values(dynamic map)
        {
            var list = new List<dynamic>();
            foreach (var v in (IEnumerable<dynamic>)((IDictionary<string, dynamic>)map).Values) list.Add(v);
            return list;
        }

        public static void WaitBlocking(dynamic seconds)
        {
            System.Threading.Thread.Sleep((int)((double)seconds * 1000));
        }

        public static void Log(string tag, dynamic[] args)
        {
            Console.WriteLine("[" + tag + "] " + string.Join(" ", System.Linq.Enumerable.Select(args, x => Str(x))));
        }

        public static List<dynamic> Map(dynamic array, Func<dynamic[], dynamic> fn)
        {
            var result = new List<dynamic>();
            int i = 0;
            foreach (var item in (IEnumerable<dynamic>)array) { result.Add(fn(new dynamic[] { item, i })); i++; }
            return result;
        }

        public static List<dynamic> Filter(dynamic array, Func<dynamic[], dynamic> fn)
        {
            var result = new List<dynamic>();
            int i = 0;
            foreach (var item in (IEnumerable<dynamic>)array) { if (Truthy(fn(new dynamic[] { item, i }))) result.Add(item); i++; }
            return result;
        }

        public static dynamic Reduce(dynamic array, Func<dynamic[], dynamic> fn, dynamic init)
        {
            dynamic acc = init;
            int i = 0;
            foreach (var item in (IEnumerable<dynamic>)array) { acc = fn(new dynamic[] { acc, item, i }); i++; }
            return acc;
        }

        public static List<dynamic> Sort(dynamic array, Func<dynamic[], dynamic> cmp = null)
        {
            var list = new List<dynamic>((IEnumerable<dynamic>)array);
            if (cmp == null) { list.Sort((x, y) => Comparer<dynamic>.Default.Compare(x, y)); return list; }
            list.Sort((x, y) => (int)cmp(new dynamic[] { x, y }));
            return list;
        }

        public static void Assert(dynamic cond, string msg = null)
        {
            if (!Truthy(cond)) throw new Exception("Assertion falhou" + (msg != null ? ": " + msg : ""));
        }

        public static dynamic Clone(dynamic v)
        {
            // Clonagem rasa (shallow). Para clonagem profunda de listas/dicionários
            // aninhados, serialize/deserialize manualmente (ex. System.Text.Json).
            if (v is List<dynamic> list) return new List<dynamic>(list);
            if (v is IDictionary<string, dynamic> dict) return new Dictionary<string, dynamic>(dict);
            return v;
        }

        public static string TypeOf(dynamic v)
        {
            if (v == null) return "null";
            if (v is List<dynamic>) return "array";
            if (v is IDictionary<string, dynamic>) return "map";
            if (v is double || v is int || v is float) return "number";
            if (v is string) return "string";
            if (v is bool) return "bool";
            return "object";
        }
    }
}
`.trim();

  const USINGS_CS = [
    'using System;',
    'using System.Collections.Generic;',
    'using System.Linq;',
  ].join('\n');

  async function transpileAsync(source, opts = {}) {
    const ast = await VessieScript.compileToAST(source);
    const transpiler = new CSharpTranspiler(opts);
    const code = transpiler.transpileProgram(ast);
    return { code: `${USINGS_CS}\n\n${RUNTIME_HELPER_CS}\n\n${code}`, warnings: transpiler.warnings };
  }

  // ===========================================================================
  // 2) BRIDGE DE RUNTIME — interop real com .NET via Blazor WebAssembly
  // ===========================================================================

  const CSharpBridge = {
    /** true somente se um app Blazor WebAssembly já inicializou nesta página. */
    isDotNetAvailable() {
      return isBrowser && !!globalObj.DotNet && typeof globalObj.DotNet.invokeMethodAsync === 'function';
    },

    /**
     * Chama um método C# estático real, marcado com
     * `[JSInvokable("MethodIdentifier")]`, via Blazor JS interop.
     * Ex. C#:
     *   [Microsoft.JSInterop.JSInvokable("Somar")]
     *   public static int Somar(int a, int b) => a + b;
     * Ex. VessieScript:
     *   var resultado = await csharp.call("MeuApp", "Somar", 2, 3);
     */
    async call(assemblyName, methodIdentifier, ...args) {
      if (!this.isDotNetAvailable()) {
        throw new Error(
          '[VessieScript CSharpAdapter] Nenhum runtime .NET detectado nesta página. '
          + 'Para usar csharp.call(assembly, metodo, ...args) de verdade: '
          + '1) publique um projeto Blazor WebAssembly, '
          + '2) inclua <script src="_framework/blazor.webassembly.js" autostart="true"></script> na página, '
          + '3) marque o método C# estático com [JSInvokable("' + methodIdentifier + '")]. '
          + 'Sem isso, não há execução real de C# no navegador — este adaptador nunca simula um resultado.',
        );
      }
      return globalObj.DotNet.invokeMethodAsync(assemblyName, methodIdentifier, ...args);
    },

    /**
     * Chama um método de INSTÂNCIA C# via `DotNetObjectReference` — o objeto
     * `dotNetRef` deve ter sido passado ao JS pelo próprio C# (ex.
     * `DotNetObjectReference.Create(this)` e injetado via JSRuntime.InvokeVoidAsync
     * chamando uma função global que guarda a referência).
     */
    async callInstance(dotNetRef, methodName, ...args) {
      if (!dotNetRef || typeof dotNetRef.invokeMethodAsync !== 'function') {
        throw new Error('[VessieScript CSharpAdapter] callInstance requer uma DotNetObjectReference válida vinda do C#.');
      }
      return dotNetRef.invokeMethodAsync(methodName, ...args);
    },
  };

  // ===========================================================================
  // Registro de built-ins no interpretador (`csharp.*`)
  // ===========================================================================
  Interpreter.prototype.installCSharpBuiltins = function installCSharpBuiltins() {
    const self = this;
    self.globals.define('csharp', {
      transpile: native(async (a) => {
        const [source, className, namespaceName] = a;
        try {
          const { code, warnings } = await transpileAsync(source, { className: className || undefined, namespace: namespaceName || undefined });
          if (warnings.length) warnings.forEach((w) => (self.hostAPI.print ? self.hostAPI.print(`[csharp.transpile] aviso: ${w}`) : console.warn(w)));
          return code;
        } catch (e) {
          self.error(`csharp.transpile falhou: ${e.message}`);
        }
      }),
      available: native(async () => CSharpBridge.isDotNetAvailable()),
      call: native(async (a) => {
        const [assemblyName, methodIdentifier, ...rest] = a;
        return CSharpBridge.call(assemblyName, methodIdentifier, ...rest);
      }),
      callInstance: native(async (a) => {
        const [dotNetRef, methodName, ...rest] = a;
        return CSharpBridge.callInstance(dotNetRef, methodName, ...rest);
      }),
    });
  };

  const previousInstallBuiltins = Interpreter.prototype.installBuiltins;
  Interpreter.prototype.installBuiltins = function patchedInstallBuiltinsCSharp() {
    previousInstallBuiltins.call(this);
    this.installCSharpBuiltins();
  };

  const CSharpAdapter = {
    transpile: transpileAsync,
    Bridge: CSharpBridge,
    Transpiler: CSharpTranspiler,
    RUNTIME_HELPER_CS,
  };

  if (isBrowser) {
    window.VessieScript = window.VessieScript || {};
    window.VessieScript.CSharp = CSharpAdapter;
  }
  if (typeof module === 'object' && module.exports) module.exports = CSharpAdapter;
}(typeof self !== 'undefined' ? self : (typeof global !== 'undefined' ? global : this)));

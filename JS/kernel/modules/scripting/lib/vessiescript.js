/*!
 * VessieScript — linguagem de programação oficial do ecossistema VessieOS
 * (também referenciada nos prompts originais como InfinityScript / VScript).
 *
 * Implementação de referência: Lexer -> Parser (AST) -> Interpretador (tree-walking, async).
 * Extensão de arquivo: .vessie
 *
 * Uso em Node:
 *   const { VessieScript } = require('./vessiescript.js');
 *   await VessieScript.run(source, { print: console.log });
 *
 * Uso no navegador (dentro do single-file HTML do VessieOS):
 *   <script src="vessiescript.js"></script>
 *   <script>
 *     VessieScript.run(source, {
 *       print: (...a) => console.log(...a),
 *       onEntity: (name, components) => console.log('entity', name, components),
 *       onUI: (tree) => renderUIToDOM(tree),
 *     });
 *   </script>
 */
(function (root, factory) {
  const mod = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = mod;
  }
  if (root) {
    root.VessieScript = mod.VessieScript;
  }
})(typeof self !== 'undefined' ? self : (typeof global !== 'undefined' ? global : this), function () {
  'use strict';

  // =========================================================================
  // 1. LEXER
  // =========================================================================

  const KEYWORDS = new Set([
    'module', 'import', 'class', 'func', 'var', 'const', 'if', 'else',
    'while', 'for', 'in', 'return', 'break', 'continue', 'true', 'false',
    'null', 'new', 'this', 'super', 'override', 'async', 'await', 'event',
    'entity', 'plugin',
  ]);

  const TT = {
    NUMBER: 'NUMBER', STRING: 'STRING', IDENT: 'IDENT', KEYWORD: 'KEYWORD',
    PUNCT: 'PUNCT', DECORATOR: 'DECORATOR', EOF: 'EOF',
  };

  class VessieError extends Error {}

  class VessieSyntaxError extends VessieError {
    constructor(message, line, col) {
      super(`[VessieScript] Erro de sintaxe: ${message} (linha ${line}, coluna ${col})`);
      this.line = line;
      this.col = col;
    }
  }

  class VessieRuntimeError extends VessieError {
    constructor(message, line) {
      super(`[VessieScript] Erro em tempo de execução: ${message}${line ? ` (linha ${line})` : ''}`);
      this.line = line;
    }
  }

  class Lexer {
    constructor(source) {
      this.src = source;
      this.pos = 0;
      this.line = 1;
      this.col = 1;
      this.tokens = [];
    }

    error(msg) { throw new VessieSyntaxError(msg, this.line, this.col); }
    peekChar(offset = 0) { return this.src[this.pos + offset]; }

    advance() {
      const ch = this.src[this.pos++];
      if (ch === '\n') { this.line++; this.col = 1; } else { this.col++; }
      return ch;
    }

    isDigit(ch) { return ch >= '0' && ch <= '9'; }
    isAlpha(ch) { return !!ch && /[A-Za-z_]/.test(ch); }
    isAlphaNum(ch) { return !!ch && /[A-Za-z0-9_]/.test(ch); }

    tokenize() {
      const TWO_OPS = ['==', '!=', '<=', '>=', '&&', '||', '+=', '-=', '*=', '/='];
      while (this.pos < this.src.length) {
        const ch = this.peekChar();

        if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') { this.advance(); continue; }

        if (ch === '/' && this.peekChar(1) === '/') {
          while (this.pos < this.src.length && this.peekChar() !== '\n') this.advance();
          continue;
        }
        if (ch === '/' && this.peekChar(1) === '*') {
          this.advance(); this.advance();
          while (this.pos < this.src.length && !(this.peekChar() === '*' && this.peekChar(1) === '/')) this.advance();
          this.advance(); this.advance();
          continue;
        }

        const startLine = this.line, startCol = this.col;

        if (ch === '"' || ch === "'") {
          const quote = this.advance();
          let str = '';
          while (this.pos < this.src.length && this.peekChar() !== quote) {
            let c = this.advance();
            if (c === '\\') {
              const esc = this.advance();
              const map = { n: '\n', t: '\t', r: '\r', '"': '"', "'": "'", '\\': '\\', '0': '\0' };
              str += map[esc] !== undefined ? map[esc] : esc;
            } else {
              str += c;
            }
          }
          if (this.pos >= this.src.length) this.error('String não terminada');
          this.advance();
          this.tokens.push({ type: TT.STRING, value: str, line: startLine, col: startCol });
          continue;
        }

        if (this.isDigit(ch)) {
          let num = '';
          while (this.isDigit(this.peekChar())) num += this.advance();
          if (this.peekChar() === '.' && this.isDigit(this.peekChar(1))) {
            num += this.advance();
            while (this.isDigit(this.peekChar())) num += this.advance();
          }
          this.tokens.push({ type: TT.NUMBER, value: parseFloat(num), line: startLine, col: startCol });
          continue;
        }

        if (ch === '@') {
          this.advance();
          let name = '';
          while (this.isAlphaNum(this.peekChar())) name += this.advance();
          this.tokens.push({ type: TT.DECORATOR, value: name, line: startLine, col: startCol });
          continue;
        }

        if (this.isAlpha(ch)) {
          let name = '';
          while (this.isAlphaNum(this.peekChar())) name += this.advance();
          const type = KEYWORDS.has(name) ? TT.KEYWORD : TT.IDENT;
          this.tokens.push({ type, value: name, line: startLine, col: startCol });
          continue;
        }

        const two = this.src.substr(this.pos, 2);
        if (TWO_OPS.includes(two)) {
          this.pos += 2; this.col += 2;
          this.tokens.push({ type: TT.PUNCT, value: two, line: startLine, col: startCol });
          continue;
        }
        const SINGLE = '{}()[],.;:=+-*/%<>!';
        if (SINGLE.includes(ch)) {
          this.advance();
          this.tokens.push({ type: TT.PUNCT, value: ch, line: startLine, col: startCol });
          continue;
        }

        this.error(`Caractere inesperado: '${ch}'`);
      }
      this.tokens.push({ type: TT.EOF, value: null, line: this.line, col: this.col });
      return this.tokens;
    }
  }

  // =========================================================================
  // 2. PARSER (Recursive Descent -> AST)
  // =========================================================================

  class Parser {
    constructor(tokens) {
      this.tokens = tokens;
      this.pos = 0;
    }

    peek(offset = 0) { return this.tokens[this.pos + offset]; }
    prev() { return this.tokens[this.pos - 1]; }
    atEnd() { return this.peek().type === TT.EOF; }

    check(type, value) {
      const t = this.peek();
      if (t.type !== type) return false;
      if (value !== undefined && t.value !== value) return false;
      return true;
    }

    advance() { if (!this.atEnd()) this.pos++; return this.prev(); }

    match(type, value) {
      if (this.check(type, value)) { this.advance(); return true; }
      return false;
    }

    matchKw(value) { return this.match(TT.KEYWORD, value); }
    matchPunct(value) { return this.match(TT.PUNCT, value); }
    checkKw(value) { return this.check(TT.KEYWORD, value); }
    checkPunct(value) { return this.check(TT.PUNCT, value); }

    expect(type, value, msg) {
      if (this.check(type, value)) return this.advance();
      const t = this.peek();
      throw new VessieSyntaxError(msg || `Esperado '${value !== undefined ? value : type}', encontrado '${t.value}'`, t.line, t.col);
    }

    expectPunct(value) { return this.expect(TT.PUNCT, value); }
    expectKw(value) { return this.expect(TT.KEYWORD, value); }
    expectIdent(msg) { return this.expect(TT.IDENT, undefined, msg || 'Esperado identificador'); }

    parseProgram() {
      let moduleName = null;
      if (this.matchKw('module')) moduleName = this.expectIdent().value;
      const body = [];
      while (!this.atEnd()) body.push(this.parseStatement());
      return { type: 'Program', moduleName, body };
    }

    parseDecorators() {
      const decorators = [];
      while (this.check(TT.DECORATOR)) decorators.push(this.advance().value);
      return decorators;
    }

    parseStatement() {
      const decorators = this.parseDecorators();

      if (this.matchKw('import')) return this.finishImport();
      if (this.checkKw('class')) return this.parseClass(decorators);
      if (this.checkKw('plugin')) return this.parsePlugin(decorators);
      if (this.checkKw('entity')) return this.parseEntity();
      if (this.checkKw('event')) return this.parseEvent();
      if (this.checkKw('var') || this.checkKw('const')) return this.parseVarDecl(decorators);
      if (this.checkKw('async') || this.checkKw('func')) return this.parseFuncDecl(decorators);
      if (this.checkKw('if')) return this.parseIf();
      if (this.checkKw('while')) return this.parseWhile();
      if (this.checkKw('for')) return this.parseFor();
      if (this.checkKw('return')) return this.parseReturn();
      if (this.matchKw('break')) { this.matchPunct(';'); return { type: 'BreakStmt' }; }
      if (this.matchKw('continue')) { this.matchPunct(';'); return { type: 'ContinueStmt' }; }
      if (this.checkPunct('{')) return this.parseBlock();

      if (this.check(TT.IDENT)) {
        const maybeUI = this.tryParseUIBlock();
        if (maybeUI) return maybeUI;
      }

      return this.parseExprStatement();
    }

    finishImport() {
      const path = this.expect(TT.STRING, undefined, 'Esperado caminho de arquivo em import').value;
      this.matchPunct(';');
      return { type: 'ImportStmt', path };
    }

    parseBlock() {
      this.expectPunct('{');
      const body = [];
      while (!this.checkPunct('}') && !this.atEnd()) body.push(this.parseStatement());
      this.expectPunct('}');
      return { type: 'Block', body };
    }

    parseVarDecl(decorators) {
      const isConst = this.matchKw('const');
      if (!isConst) this.expectKw('var');
      const name = this.expectIdent().value;
      let init = null;
      if (this.matchPunct('=')) init = this.parseExpr();
      this.matchPunct(';');
      return { type: 'VarDecl', name, isConst, init, decorators };
    }

    parseParams() {
      this.expectPunct('(');
      const params = [];
      if (!this.checkPunct(')')) {
        do { params.push(this.expectIdent().value); } while (this.matchPunct(','));
      }
      this.expectPunct(')');
      return params;
    }

    parseFuncDecl(decorators) {
      const isAsync = this.matchKw('async');
      this.expectKw('func');
      const name = this.expectIdent().value;
      const params = this.parseParams();
      const body = this.parseBlock();
      return { type: 'FuncDecl', name, params, body, isAsync, decorators };
    }

    parseClass(decorators) {
      this.expectKw('class');
      const name = this.expectIdent().value;
      let superclass = null;
      if (this.matchPunct(':')) superclass = this.expectIdent().value;
      this.expectPunct('{');
      const members = [];
      while (!this.checkPunct('}') && !this.atEnd()) {
        const memberDecorators = this.parseDecorators();
        const isOverride = this.matchKw('override');
        if (this.checkKw('var') || this.checkKw('const')) {
          members.push(this.parseVarDecl(memberDecorators));
        } else {
          const isAsync = this.matchKw('async');
          this.expectKw('func');
          const mName = this.expectIdent().value;
          const params = this.parseParams();
          const body = this.parseBlock();
          members.push({ type: 'MethodDecl', name: mName, params, body, isAsync, isOverride, decorators: memberDecorators });
        }
      }
      this.expectPunct('}');
      return { type: 'ClassDecl', name, superclass, members, decorators };
    }

    parsePlugin(decorators) {
      this.expectKw('plugin');
      const name = this.expectIdent().value;
      this.expectPunct('{');
      const members = [];
      while (!this.checkPunct('}') && !this.atEnd()) {
        const memberDecorators = this.parseDecorators();
        if (this.checkKw('var') || this.checkKw('const')) {
          members.push(this.parseVarDecl(memberDecorators));
        } else {
          const isAsync = this.matchKw('async');
          this.expectKw('func');
          const mName = this.expectIdent().value;
          const params = this.parseParams();
          const body = this.parseBlock();
          members.push({ type: 'MethodDecl', name: mName, params, body, isAsync, isOverride: false, decorators: memberDecorators });
        }
      }
      this.expectPunct('}');
      return { type: 'PluginDecl', name, members, decorators };
    }

    parseEntity() {
      this.expectKw('entity');
      const name = this.expectIdent().value;
      this.expectPunct('{');
      const components = [];
      while (!this.checkPunct('}') && !this.atEnd()) {
        components.push(this.expectIdent().value);
        this.matchPunct(',');
      }
      this.expectPunct('}');
      return { type: 'EntityDecl', name, components };
    }

    parseEvent() {
      this.expectKw('event');
      const name = this.expectIdent().value;
      this.matchPunct(';');
      return { type: 'EventDecl', name };
    }

    parseIf() {
      this.expectKw('if');
      this.expectPunct('(');
      const cond = this.parseExpr();
      this.expectPunct(')');
      const thenBranch = this.parseBlock();
      let elseBranch = null;
      if (this.matchKw('else')) elseBranch = this.checkKw('if') ? this.parseIf() : this.parseBlock();
      return { type: 'IfStmt', cond, thenBranch, elseBranch };
    }

    parseWhile() {
      this.expectKw('while');
      this.expectPunct('(');
      const cond = this.parseExpr();
      this.expectPunct(')');
      const body = this.parseBlock();
      return { type: 'WhileStmt', cond, body };
    }

    parseFor() {
      this.expectKw('for');
      if (this.check(TT.IDENT) && this.peek(1).type === TT.KEYWORD && this.peek(1).value === 'in') {
        const varName = this.advance().value;
        this.expectKw('in');
        const iterable = this.parseExpr();
        const body = this.parseBlock();
        return { type: 'ForInStmt', varName, iterable, body };
      }
      this.expectPunct('(');
      let init = null;
      if (!this.checkPunct(';')) {
        init = (this.checkKw('var') || this.checkKw('const')) ? this.parseVarDecl([]) : this.parseExprStatement();
      } else { this.advance(); }
      let cond = null;
      if (!this.checkPunct(';')) cond = this.parseExpr();
      this.expectPunct(';');
      let update = null;
      if (!this.checkPunct(')')) update = this.parseExpr();
      this.expectPunct(')');
      const body = this.parseBlock();
      return { type: 'ForStmt', init, cond, update, body };
    }

    parseReturn() {
      this.expectKw('return');
      let value = null;
      if (!this.checkPunct(';') && !this.checkPunct('}')) value = this.parseExpr();
      this.matchPunct(';');
      return { type: 'ReturnStmt', value };
    }

    parseExprStatement() {
      const expr = this.parseExpr();
      this.matchPunct(';');
      return { type: 'ExprStmt', expr };
    }

    tryParseUIBlock() {
      const start = this.pos;
      const tag = this.advance().value;
      let name = null;
      if (this.check(TT.IDENT) && this.peek(1).type === TT.PUNCT && this.peek(1).value === '{') {
        name = this.advance().value;
      }
      if (!this.checkPunct('{')) { this.pos = start; return null; }
      this.expectPunct('{');
      const props = [];
      const children = [];
      while (!this.checkPunct('}') && !this.atEnd()) {
        if (this.check(TT.IDENT) && this.peek(1).type === TT.PUNCT && this.peek(1).value === '=') {
          const key = this.advance().value;
          this.expectPunct('=');
          const value = this.parseExpr();
          this.matchPunct(';');
          props.push({ key, value });
        } else if (this.check(TT.IDENT)) {
          const child = this.tryParseUIBlock();
          if (!child) throw new VessieSyntaxError('Esperado propriedade (key = valor) ou bloco filho dentro do bloco de UI', this.peek().line, this.peek().col);
          children.push(child);
        } else {
          throw new VessieSyntaxError('Conteúdo inválido dentro de bloco de UI', this.peek().line, this.peek().col);
        }
      }
      this.expectPunct('}');
      return { type: 'UIBlock', tag, name, props, children };
    }

    parseExpr() { return this.parseAssignment(); }

    parseAssignment() {
      const expr = this.parseLogicOr();
      if (this.checkPunct('=') || this.checkPunct('+=') || this.checkPunct('-=') || this.checkPunct('*=') || this.checkPunct('/=')) {
        const operator = this.advance().value;
        const value = this.parseAssignment();
        return { type: 'AssignExpr', operator, target: expr, value };
      }
      return expr;
    }

    parseLogicOr() {
      let expr = this.parseLogicAnd();
      while (this.checkPunct('||')) {
        const operator = this.advance().value;
        expr = { type: 'LogicalExpr', operator, left: expr, right: this.parseLogicAnd() };
      }
      return expr;
    }

    parseLogicAnd() {
      let expr = this.parseEquality();
      while (this.checkPunct('&&')) {
        const operator = this.advance().value;
        expr = { type: 'LogicalExpr', operator, left: expr, right: this.parseEquality() };
      }
      return expr;
    }

    parseEquality() {
      let expr = this.parseComparison();
      while (this.checkPunct('==') || this.checkPunct('!=')) {
        const operator = this.advance().value;
        expr = { type: 'BinaryExpr', operator, left: expr, right: this.parseComparison() };
      }
      return expr;
    }

    parseComparison() {
      let expr = this.parseAddition();
      while (this.checkPunct('<') || this.checkPunct('>') || this.checkPunct('<=') || this.checkPunct('>=')) {
        const operator = this.advance().value;
        expr = { type: 'BinaryExpr', operator, left: expr, right: this.parseAddition() };
      }
      return expr;
    }

    parseAddition() {
      let expr = this.parseMultiplication();
      while (this.checkPunct('+') || this.checkPunct('-')) {
        const operator = this.advance().value;
        expr = { type: 'BinaryExpr', operator, left: expr, right: this.parseMultiplication() };
      }
      return expr;
    }

    parseMultiplication() {
      let expr = this.parseUnary();
      while (this.checkPunct('*') || this.checkPunct('/') || this.checkPunct('%')) {
        const operator = this.advance().value;
        expr = { type: 'BinaryExpr', operator, left: expr, right: this.parseUnary() };
      }
      return expr;
    }

    parseUnary() {
      if (this.checkPunct('!') || this.checkPunct('-')) {
        const operator = this.advance().value;
        return { type: 'UnaryExpr', operator, argument: this.parseUnary() };
      }
      if (this.matchKw('await')) return { type: 'AwaitExpr', argument: this.parseUnary() };
      return this.parsePostfix();
    }

    parsePostfix() {
      let expr = this.parsePrimary();
      for (;;) {
        if (this.matchPunct('.')) {
          const prop = this.expectIdent().value;
          expr = { type: 'MemberExpr', object: expr, property: prop, computed: false };
        } else if (this.matchPunct('(')) {
          const args = [];
          if (!this.checkPunct(')')) {
            do { args.push(this.parseExpr()); } while (this.matchPunct(','));
          }
          this.expectPunct(')');
          expr = { type: 'CallExpr', callee: expr, args };
        } else if (this.matchPunct('[')) {
          const index = this.parseExpr();
          this.expectPunct(']');
          expr = { type: 'MemberExpr', object: expr, property: index, computed: true };
        } else break;
      }
      return expr;
    }

    parsePrimary() {
      const t = this.peek();

      if (t.type === TT.NUMBER) { this.advance(); return { type: 'NumberLit', value: t.value }; }
      if (t.type === TT.STRING) { this.advance(); return { type: 'StringLit', value: t.value }; }
      if (this.matchKw('true')) return { type: 'BoolLit', value: true };
      if (this.matchKw('false')) return { type: 'BoolLit', value: false };
      if (this.matchKw('null')) return { type: 'NullLit' };
      if (this.matchKw('this')) return { type: 'ThisExpr' };
      if (this.matchKw('super')) return { type: 'SuperExpr' };

      if (this.matchKw('new')) {
        const className = this.expectIdent().value;
        this.expectPunct('(');
        const args = [];
        if (!this.checkPunct(')')) {
          do { args.push(this.parseExpr()); } while (this.matchPunct(','));
        }
        this.expectPunct(')');
        return { type: 'NewExpr', className, args };
      }

      if (this.checkKw('async') || this.checkKw('func')) {
        const isAsync = this.matchKw('async');
        this.expectKw('func');
        const params = this.parseParams();
        const body = this.parseBlock();
        return { type: 'FuncExpr', params, body, isAsync };
      }

      if (this.matchPunct('[')) {
        const elements = [];
        if (!this.checkPunct(']')) {
          do { elements.push(this.parseExpr()); } while (this.matchPunct(','));
        }
        this.expectPunct(']');
        return { type: 'ArrayLit', elements };
      }

      if (this.matchPunct('{')) {
        const entries = [];
        if (!this.checkPunct('}')) {
          do {
            let key;
            if (this.check(TT.STRING)) key = this.advance().value;
            else key = this.expectIdent().value;
            this.expectPunct(':');
            const value = this.parseExpr();
            entries.push({ key, value });
          } while (this.matchPunct(','));
        }
        this.expectPunct('}');
        return { type: 'MapLit', entries };
      }

      if (t.type === TT.IDENT) { this.advance(); return { type: 'Identifier', name: t.value }; }

      if (this.matchPunct('(')) {
        const expr = this.parseExpr();
        this.expectPunct(')');
        return expr;
      }

      throw new VessieSyntaxError(`Token inesperado '${t.value}'`, t.line, t.col);
    }
  }

  function parse(source) {
    const tokens = new Lexer(source).tokenize();
    return new Parser(tokens).parseProgram();
  }

  // =========================================================================
  // 3. RUNTIME VALUES
  // =========================================================================

  class VEvent { constructor(name) { this.name = name; this.subscribers = []; } }

  class VFunction {
    constructor(decl, closure, boundThis = null, ownerClass = null) {
      this.decl = decl; this.closure = closure; this.boundThis = boundThis; this.ownerClass = ownerClass;
    }
    bind(thisVal, ownerClass) { return new VFunction(this.decl, this.closure, thisVal, ownerClass || this.ownerClass); }
  }

  class VClass {
    constructor(name, superclass, decl) {
      this.name = name; this.superclass = superclass; this.decl = decl;
      this.fields = []; this.methods = new Map();
    }
    findMethod(name) {
      if (this.methods.has(name)) return this.methods.get(name);
      if (this.superclass) return this.superclass.findMethod(name);
      return undefined;
    }
  }

  class VInstance {
    constructor(vclass) { this.vclass = vclass; this.fields = new Map(); }
    get(name) {
      if (this.fields.has(name)) return this.fields.get(name);
      const method = this.vclass.findMethod(name);
      if (method) return method.bind(this, method.ownerClass);
      throw new VessieRuntimeError(`Propriedade/método '${name}' não existe em instância de ${this.vclass.name}`);
    }
    set(name, value) { this.fields.set(name, value); }
  }

  class Environment {
    constructor(parent = null) { this.vars = new Map(); this.parent = parent; }
    define(name, value) { this.vars.set(name, value); }
    has(name) { return this.vars.has(name) || (this.parent && this.parent.has(name)); }
    get(name) {
      if (this.vars.has(name)) return this.vars.get(name);
      if (this.parent) return this.parent.get(name);
      throw new VessieRuntimeError(`Variável não definida: '${name}'`);
    }
    set(name, value) {
      if (this.vars.has(name)) { this.vars.set(name, value); return; }
      if (this.parent) { this.parent.set(name, value); return; }
      throw new VessieRuntimeError(`Atribuição a variável não definida: '${name}'`);
    }
  }

  class ReturnSignal { constructor(value) { this.value = value; } }
  class BreakSignal {}
  class ContinueSignal {}

  function truthy(v) {
    if (v === null || v === undefined) return false;
    if (Array.isArray(v)) return v.length > 0;
    return !!v;
  }

  function deepEqual(a, b) {
    if (a === b) return true;
    if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => deepEqual(v, b[i]));
    return false;
  }

  // =========================================================================
  // 4. INTERPRETER (tree-walking, funções assíncronas nativas em JS)
  // =========================================================================

  class Interpreter {
    constructor(hostAPI = {}) {
      this.globals = new Environment();
      this.hostAPI = hostAPI;
      this.entities = {};
      this.plugins = {};
      this.classes = {};
      this.decoratorsIndex = {};
      this.installBuiltins();
    }

    installBuiltins() {
      const print = (...args) => {
        const text = args.map((a) => this.stringify(a)).join(' ');
        if (this.hostAPI.print) this.hostAPI.print(text); else console.log(text);
        return null;
      };
      const native = (fn) => ({ __native: true, call: fn });
      this.globals.define('print', native(async (args) => print(...args)));
      this.globals.define('len', native(async (args) => {
        const v = args[0];
        if (Array.isArray(v)) return v.length;
        if (v instanceof Map) return v.size;
        if (typeof v === 'string') return v.length;
        return 0;
      }));
      this.globals.define('wait', native(async (args) => {
        const seconds = Number(args[0]) || 0;
        if (this.hostAPI.wait) return this.hostAPI.wait(seconds);
        return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
      }));
      this.globals.define('spawn', native(async (args) => {
        if (this.hostAPI.spawn) return this.hostAPI.spawn(...args);
        print(`[spawn] ${args.map((a) => this.stringify(a)).join(' ')}`);
        return null;
      }));
      this.globals.define('damage', native(async (args) => {
        if (this.hostAPI.damage) return this.hostAPI.damage(...args);
        print(`[damage] ${args.map((a) => this.stringify(a)).join(' ')}`);
        return null;
      }));
      this.globals.define('random', native(async (args) => {
        const [min = 0, max = 1] = args;
        return min + Math.random() * (max - min);
      }));
      this.globals.define('floor', native(async (args) => Math.floor(args[0])));
      this.globals.define('str', native(async (args) => this.stringify(args[0])));
      this.globals.define('num', native(async (args) => Number(args[0])));
      this.globals.define('range', native(async (args) => {
        const [a, b] = args.length > 1 ? args : [0, args[0]];
        const out = [];
        for (let i = a; i < b; i++) out.push(i);
        return out;
      }));
      this.globals.define('push', native(async (args) => { args[0].push(args[1]); return args[0]; }));
      this.globals.define('keys', native(async (args) => Array.from(args[0].keys())));
      this.globals.define('values', native(async (args) => Array.from(args[0].values())));
      this.globals.define('getDecorators', native(async (args) => this.decoratorsIndex[args[0]] || []));
      this.globals.define('entities', { __get__: () => this.entities });
      this.globals.define('plugins', { __get__: () => this.plugins });
    }

    stringify(v) {
      if (v === null || v === undefined) return 'null';
      if (v instanceof VInstance) return `<${v.vclass.name} instance>`;
      if (v instanceof VClass) return `<class ${v.name}>`;
      if (v instanceof VFunction) return `<func ${v.decl.name || 'anônima'}>`;
      if (v instanceof VEvent) return `<event ${v.name}>`;
      if (Array.isArray(v)) return `[${v.map((x) => this.stringify(x)).join(', ')}]`;
      if (v instanceof Map) {
        const parts = [];
        for (const [k, val] of v.entries()) parts.push(`${k}: ${this.stringify(val)}`);
        return `{${parts.join(', ')}}`;
      }
      return String(v);
    }

    error(msg, line) { throw new VessieRuntimeError(msg, line); }

    async run(source, basePath = null) {
      const program = parse(source);
      this._basePath = basePath;
      return this.execProgram(program);
    }

    async execProgram(program) {
      const env = this.globals;
      let result = null;
      for (const stmt of program.body) result = await this.execStatement(stmt, env);
      return result;
    }

    async execBlock(block, env) {
      const scope = new Environment(env);
      let result = null;
      for (const stmt of block.body) {
        result = await this.execStatement(stmt, scope);
        if (result instanceof ReturnSignal || result instanceof BreakSignal || result instanceof ContinueSignal) return result;
      }
      return result;
    }

    async execStatement(node, env) {
      switch (node.type) {
        case 'VarDecl': {
          const value = node.init ? await this.evalExpr(node.init, env) : null;
          env.define(node.name, value);
          if (node.decorators && node.decorators.length) this.decoratorsIndex[node.name] = node.decorators;
          return null;
        }
        case 'FuncDecl': {
          const fn = new VFunction(node, env);
          env.define(node.name, fn);
          if (node.decorators && node.decorators.length) this.decoratorsIndex[node.name] = node.decorators;
          return null;
        }
        case 'ClassDecl': {
          const superclass = node.superclass ? this.classes[node.superclass] : null;
          if (node.superclass && !superclass) this.error(`Classe base '${node.superclass}' não encontrada para '${node.name}'`);
          const vclass = new VClass(node.name, superclass, node);
          for (const member of node.members) {
            if (member.type === 'VarDecl') {
              vclass.fields.push(member);
            } else {
              const fn = new VFunction(member, env, null, vclass);
              vclass.methods.set(member.name, fn);
              if (member.decorators && member.decorators.length) this.decoratorsIndex[`${node.name}.${member.name}`] = member.decorators;
            }
          }
          this.classes[node.name] = vclass;
          env.define(node.name, vclass);
          return null;
        }
        case 'PluginDecl': {
          const pluginObj = { __plugin: node.name };
          const pluginEnv = new Environment(env);
          for (const member of node.members) {
            if (member.type === 'VarDecl') {
              const value = member.init ? await this.evalExpr(member.init, pluginEnv) : null;
              pluginObj[member.name] = value;
              pluginEnv.define(member.name, value);
            } else {
              const fn = new VFunction(member, pluginEnv, pluginObj);
              pluginObj[member.name] = fn;
              pluginEnv.define(member.name, fn);
            }
          }
          this.plugins[node.name] = pluginObj;
          env.define(node.name, pluginObj);
          return null;
        }
        case 'EntityDecl': {
          this.entities[node.name] = { name: node.name, components: node.components };
          if (this.hostAPI.onEntity) this.hostAPI.onEntity(node.name, node.components);
          return null;
        }
        case 'EventDecl': env.define(node.name, new VEvent(node.name)); return null;
        case 'ImportStmt': {
          if (this.hostAPI.resolveImport) {
            const src = await this.hostAPI.resolveImport(node.path, this._basePath);
            if (src) {
              const program = parse(src);
              for (const stmt of program.body) await this.execStatement(stmt, env);
            }
          }
          return null;
        }
        case 'Block': return this.execBlock(node, env);
        case 'IfStmt': {
          if (truthy(await this.evalExpr(node.cond, env))) return this.execBlock(node.thenBranch, env);
          if (node.elseBranch) return node.elseBranch.type === 'IfStmt' ? this.execStatement(node.elseBranch, env) : this.execBlock(node.elseBranch, env);
          return null;
        }
        case 'WhileStmt': {
          while (truthy(await this.evalExpr(node.cond, env))) {
            const r = await this.execBlock(node.body, env);
            if (r instanceof BreakSignal) break;
            if (r instanceof ReturnSignal) return r;
          }
          return null;
        }
        case 'ForStmt': {
          const scope = new Environment(env);
          if (node.init) await this.execStatement(node.init, scope);
          while (node.cond ? truthy(await this.evalExpr(node.cond, scope)) : true) {
            const r = await this.execBlock(node.body, scope);
            if (r instanceof BreakSignal) break;
            if (r instanceof ReturnSignal) return r;
            if (node.update) await this.evalExpr(node.update, scope);
          }
          return null;
        }
        case 'ForInStmt': {
          const iterable = await this.evalExpr(node.iterable, env);
          const items = Array.isArray(iterable) ? iterable
            : iterable instanceof Map ? Array.from(iterable.keys())
            : typeof iterable === 'string' ? iterable.split('')
            : [];
          for (const item of items) {
            const scope = new Environment(env);
            scope.define(node.varName, item);
            const r = await this.execBlock(node.body, scope);
            if (r instanceof BreakSignal) break;
            if (r instanceof ReturnSignal) return r;
          }
          return null;
        }
        case 'ReturnStmt': return new ReturnSignal(node.value ? await this.evalExpr(node.value, env) : null);
        case 'BreakStmt': return new BreakSignal();
        case 'ContinueStmt': return new ContinueSignal();
        case 'ExprStmt': await this.evalExpr(node.expr, env); return null;
        case 'UIBlock': {
          const tree = await this.buildUITree(node, env);
          if (this.hostAPI.onUI) this.hostAPI.onUI(tree);
          env.define(node.name || node.tag, tree);
          return tree;
        }
        default: this.error(`Statement desconhecido: ${node.type}`);
      }
    }

    async buildUITree(node, env) {
      const props = {};
      for (const p of node.props) props[p.key] = await this.evalExpr(p.value, env);
      const children = [];
      for (const c of node.children) children.push(await this.buildUITree(c, env));
      return { tag: node.tag, name: node.name, props, children };
    }

    async evalExpr(node, env) {
      switch (node.type) {
        case 'NumberLit': return node.value;
        case 'StringLit': return node.value;
        case 'BoolLit': return node.value;
        case 'NullLit': return null;
        case 'Identifier': {
          const v = env.get(node.name);
          if (v && v.__get__) return v.__get__();
          return v;
        }
        case 'ThisExpr': return env.get('this');
        case 'SuperExpr': return env.get('this');
        case 'ArrayLit': {
          const out = [];
          for (const el of node.elements) out.push(await this.evalExpr(el, env));
          return out;
        }
        case 'MapLit': {
          const m = new Map();
          for (const e of node.entries) m.set(e.key, await this.evalExpr(e.value, env));
          return m;
        }
        case 'FuncExpr': return new VFunction(node, env);
        case 'NewExpr': return this.instantiate(node, env);
        case 'UnaryExpr': {
          const v = await this.evalExpr(node.argument, env);
          if (node.operator === '!') return !truthy(v);
          if (node.operator === '-') return -v;
          break;
        }
        case 'AwaitExpr': return this.evalExpr(node.argument, env);
        case 'BinaryExpr': return this.evalBinary(node, env);
        case 'LogicalExpr': {
          const left = await this.evalExpr(node.left, env);
          if (node.operator === '&&') return truthy(left) ? this.evalExpr(node.right, env) : left;
          return truthy(left) ? left : this.evalExpr(node.right, env);
        }
        case 'MemberExpr': return this.evalMember(node, env);
        case 'CallExpr': return this.evalCall(node, env);
        case 'AssignExpr': return this.evalAssign(node, env);
        default: this.error(`Expressão desconhecida: ${node.type}`);
      }
    }

    async evalBinary(node, env) {
      const l = await this.evalExpr(node.left, env);
      const r = await this.evalExpr(node.right, env);
      switch (node.operator) {
        case '+':
          if (typeof l === 'string' || typeof r === 'string') return this.stringify(l) + this.stringify(r);
          if (Array.isArray(l)) return l.concat(r);
          return l + r;
        case '-': return l - r;
        case '*': return l * r;
        case '/': return l / r;
        case '%': return l % r;
        case '==': return deepEqual(l, r);
        case '!=': return !deepEqual(l, r);
        case '<': return l < r;
        case '>': return l > r;
        case '<=': return l <= r;
        case '>=': return l >= r;
        default: this.error(`Operador desconhecido: ${node.operator}`);
      }
    }

    async evalMember(node, env) {
      // super.metodo() deve resolver a partir da SUPERCLASSE da classe onde o
      // método em execução foi definido — nunca a partir da classe real (leaf)
      // da instância, ou uma chamada a super() dentro de um método sobrescrito
      // entraria em recursão infinita (super resolveria para o próprio override).
      if (node.object.type === 'SuperExpr' && !node.computed) {
        const thisVal = env.get('this');
        const currentClass = env.has('__class') ? env.get('__class') : null;
        const superclass = currentClass ? currentClass.superclass : null;
        if (!superclass) this.error(`'super' usado fora de uma subclasse (ou classe base sem superclasse) ao acessar '${node.property}'`);
        const method = superclass.findMethod(node.property);
        if (!method) this.error(`Método '${node.property}' não encontrado em superclasse de ${thisVal.vclass.name}`);
        return method.bind(thisVal, method.ownerClass);
      }
      const obj = await this.evalExpr(node.object, env);
      if (node.computed) {
        const key = await this.evalExpr(node.property, env);
        if (Array.isArray(obj)) return obj[key];
        if (obj instanceof Map) return obj.get(key);
        if (obj && typeof obj === 'object') return obj[key];
        return null;
      }
      const prop = node.property;
      if (obj instanceof VInstance) return obj.get(prop);
      if (obj instanceof VClass) return obj.methods.has(prop) ? obj.methods.get(prop) : null;
      if (obj instanceof Map) return obj.get(prop);
      if (Array.isArray(obj)) return obj[prop];
      if (obj && typeof obj === 'object') return obj[prop];
      this.error(`Não é possível acessar propriedade '${prop}' de ${this.stringify(obj)}`);
    }

    async instantiate(node, env) {
      const vclass = this.classes[node.className];
      if (!vclass) this.error(`Classe não encontrada: '${node.className}'`);
      const instance = new VInstance(vclass);
      const chain = [];
      let c = vclass;
      while (c) { chain.unshift(c); c = c.superclass; }
      for (const klass of chain) {
        for (const field of klass.fields) {
          const value = field.init ? await this.evalExpr(field.init, klass === vclass ? env : this.globals) : null;
          instance.set(field.name, value);
        }
      }
      const args = [];
      for (const a of node.args) args.push(await this.evalExpr(a, env));
      const init = vclass.findMethod('init');
      if (init) await this.callFunction(init.bind(instance, init.ownerClass), args);
      return instance;
    }

    async evalCall(node, env) {
      const args = [];
      for (const a of node.args) args.push(await this.evalExpr(a, env));

      if (node.callee.type === 'Identifier' && env.has(node.callee.name)) {
        const maybeEvent = env.get(node.callee.name);
        if (maybeEvent instanceof VEvent) {
          const results = [];
          for (const sub of maybeEvent.subscribers) results.push(await this.callFunction(sub, args));
          return results;
        }
      }

      const callee = await this.evalExpr(node.callee, env);
      return this.callFunction(callee, args);
    }

    async callFunction(fn, args) {
      if (!fn) this.error('Tentativa de chamar valor nulo como função');
      if (fn.__native) return fn.call(args);
      if (!(fn instanceof VFunction)) this.error(`Valor não é uma função: ${this.stringify(fn)}`);

      const scope = new Environment(fn.closure);
      fn.decl.params.forEach((p, i) => scope.define(p, args[i] !== undefined ? args[i] : null));
      if (fn.boundThis !== null && fn.boundThis !== undefined) scope.define('this', fn.boundThis);
      if (fn.ownerClass) scope.define('__class', fn.ownerClass);

      const result = await this.execBlock(fn.decl.body, scope);
      if (result instanceof ReturnSignal) return result.value;
      return null;
    }

    async evalAssign(node, env) {
      const value = await this.evalExpr(node.value, env);

      if (node.operator === '+=' && node.target.type === 'Identifier' && env.has(node.target.name)) {
        const current = env.get(node.target.name);
        if (current instanceof VEvent) { current.subscribers.push(value); return current; }
      }

      let finalValue = value;
      if (node.operator !== '=') {
        const current = await this.evalExpr(node.target, env);
        switch (node.operator) {
          case '+=': finalValue = (typeof current === 'string' || typeof value === 'string') ? this.stringify(current) + this.stringify(value) : current + value; break;
          case '-=': finalValue = current - value; break;
          case '*=': finalValue = current * value; break;
          case '/=': finalValue = current / value; break;
        }
      }

      if (node.target.type === 'Identifier') { env.set(node.target.name, finalValue); return finalValue; }
      if (node.target.type === 'MemberExpr') {
        const obj = await this.evalExpr(node.target.object, env);
        if (node.target.computed) {
          const key = await this.evalExpr(node.target.property, env);
          if (Array.isArray(obj)) obj[key] = finalValue;
          else if (obj instanceof Map) obj.set(key, finalValue);
          else obj[key] = finalValue;
        } else if (obj instanceof VInstance) {
          obj.set(node.target.property, finalValue);
        } else if (obj instanceof Map) {
          obj.set(node.target.property, finalValue);
        } else {
          obj[node.target.property] = finalValue;
        }
        return finalValue;
      }
      this.error('Alvo de atribuição inválido');
    }
  }

  // =========================================================================
  // 5. API PÚBLICA
  // =========================================================================

  const VessieScript = {
    parse,
    Interpreter,
    async run(source, hostAPI = {}, basePath = null) {
      const interp = new Interpreter(hostAPI);
      await interp.run(source, basePath);
      return interp;
    },
    async compileToAST(source) { return parse(source); },
  };

  return { VessieScript, __internal: { Lexer, Parser, TT, VessieSyntaxError, VessieRuntimeError } };
});

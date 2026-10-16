// ================================================================
//  LINGUAGEM DE PROGRAMAÇÃO SIMPLES - INTERPRETADOR EM JAVASCRIPT
//  (Inspirada em JavaScript/Pascal, com palavras em português)
// ================================================================

/**
 * Analisador Léxico (Tokenizador)
 */
function tokenizer(codigo) {
    const tokens = [];
    let pos = 0;
    const len = codigo.length;
    let linha = 1;
    let coluna = 1;

    const palavrasChave = new Set([
        'var', 'se', 'senao', 'enquanto', 'para',
        'funcao', 'retorne', 'escreva',
        'verdadeiro', 'falso', 'e', 'ou', 'nao'
    ]);

    while (pos < len) {
        const ch = codigo[pos];

        // Espaços e quebras
        if (ch === ' ' || ch === '\t' || ch === '\r') {
            pos++;
            coluna++;
            continue;
        }
        if (ch === '\n') {
            pos++;
            linha++;
            coluna = 1;
            continue;
        }

        // Comentários de linha //
        if (ch === '/' && codigo[pos + 1] === '/') {
            while (pos < len && codigo[pos] !== '\n') pos++;
            continue;
        }

        // Números
        if (/[0-9]/.test(ch)) {
            let num = '';
            while (pos < len && /[0-9.]/.test(codigo[pos])) {
                num += codigo[pos];
                pos++;
            }
            const valor = num.includes('.') ? parseFloat(num) : parseInt(num, 10);
            tokens.push({ tipo: 'NUMERO', valor, linha, coluna });
            coluna += num.length;
            continue;
        }

        // Strings
        if (ch === '"' || ch === "'") {
            const aspas = ch;
            pos++;
            coluna++;
            let str = '';
            while (pos < len && codigo[pos] !== aspas) {
                if (codigo[pos] === '\\') {
                    pos++;
                    coluna++;
                    if (pos < len) {
                        str += codigo[pos];
                        pos++;
                        coluna++;
                    }
                } else {
                    str += codigo[pos];
                    pos++;
                    coluna++;
                }
            }
            if (pos >= len) throw new Error(`String não fechada na linha ${linha}`);
            pos++;
            coluna++;
            tokens.push({ tipo: 'STRING', valor: str, linha, coluna });
            continue;
        }

        // Operadores de dois caracteres
        const dois = codigo.substr(pos, 2);
        if (['==', '!=', '<=', '>=', '&&', '||'].includes(dois)) {
            tokens.push({ tipo: 'OPERADOR', valor: dois, linha, coluna });
            pos += 2;
            coluna += 2;
            continue;
        }

        // Operadores e pontuação de um caractere
        if ('+-*/%=<>!(){};,,'.includes(ch)) {
            let tipo = 'PONTUACAO';
            if ('+-*/%=<>!'.includes(ch)) tipo = 'OPERADOR';
            tokens.push({ tipo, valor: ch, linha, coluna });
            pos++;
            coluna++;
            continue;
        }

        // Identificadores e palavras-chave
        if (/[a-zA-Z_]/.test(ch)) {
            let id = '';
            while (pos < len && /[a-zA-Z0-9_]/.test(codigo[pos])) {
                id += codigo[pos];
                pos++;
            }
            const tipo = palavrasChave.has(id) ? 'PALAVRA_CHAVE' : 'IDENTIFICADOR';
            tokens.push({ tipo, valor: id, linha, coluna });
            coluna += id.length;
            continue;
        }

        throw new Error(`Caractere inesperado '${ch}' na linha ${linha}, coluna ${coluna}`);
    }

    tokens.push({ tipo: 'FIM', valor: null, linha, coluna });
    return tokens;
}

/**
 * Analisador Sintático (Parser)
 */
class Parser {
    constructor(tokens) {
        this.tokens = tokens;
        this.pos = 0;
    }

    peek() { return this.tokens[this.pos]; }
    next() { return this.tokens[this.pos++]; }

    match(tipo, valor) {
        const tok = this.peek();
        if (tok.tipo === tipo && (valor === undefined || tok.valor === valor)) {
            return this.next();
        }
        return null;
    }

    expect(tipo, valor) {
        const tok = this.match(tipo, valor);
        if (!tok) {
            const esperado = valor ? `${tipo}(${valor})` : tipo;
            const atual = this.peek();
            throw new Error(
                `Esperado ${esperado}, mas encontrou ${atual.tipo}(${atual.valor}) na linha ${atual.linha}`
            );
        }
        return tok;
    }

    // ------------------------------------------------------------
    //  GRAMÁTICA
    // ------------------------------------------------------------
    parseProgram() {
        const comandos = [];
        while (this.peek().tipo !== 'FIM') {
            comandos.push(this.parseComando());
        }
        return { tipo: 'programa', comandos };
    }

    parseComando() {
        const tok = this.peek();
        if (tok.tipo === 'PALAVRA_CHAVE') {
            switch (tok.valor) {
                case 'var': return this.parseDeclVar();
                case 'se': return this.parseSe();
                case 'enquanto': return this.parseEnquanto();
                case 'para': return this.parsePara();
                case 'escreva': return this.parseEscreva();
                case 'retorne': return this.parseRetorne();
                case 'funcao': return this.parseFuncao();
            }
        }
        // Atribuição ou chamada de função como comando
        if (tok.tipo === 'IDENTIFICADOR') {
            const next = this.tokens[this.pos + 1];
            if (next && next.valor === '=') {
                return this.parseAtribuicao();
            } else if (next && next.valor === '(') {
                const chamada = this.parseChamada();
                this.expect('PONTUACAO', ';');
                return { tipo: 'chamada_comando', chamada };
            } else {
                throw new Error(`Comando inválido na linha ${tok.linha}`);
            }
        }
        if (tok.tipo === 'PONTUACAO' && tok.valor === '{') {
            return this.parseBloco();
        }
        throw new Error(`Comando inesperado '${tok.valor}' na linha ${tok.linha}`);
    }

    parseBloco() {
        this.expect('PONTUACAO', '{');
        const comandos = [];
        while (this.peek().tipo !== 'PONTUACAO' || this.peek().valor !== '}') {
            comandos.push(this.parseComando());
        }
        this.expect('PONTUACAO', '}');
        return { tipo: 'bloco', comandos };
    }

    parseDeclVar() {
        this.expect('PALAVRA_CHAVE', 'var');
        const id = this.expect('IDENTIFICADOR');
        let expr = null;
        if (this.match('OPERADOR', '=')) {
            expr = this.parseExpressao();
        }
        this.expect('PONTUACAO', ';');
        return { tipo: 'decl_var', id: id.valor, expr };
    }

    parseAtribuicao() {
        const id = this.expect('IDENTIFICADOR');
        this.expect('OPERADOR', '=');
        const expr = this.parseExpressao();
        this.expect('PONTUACAO', ';');
        return { tipo: 'atribuicao', id: id.valor, expr };
    }

    parseSe() {
        this.expect('PALAVRA_CHAVE', 'se');
        this.expect('PONTUACAO', '(');
        const cond = this.parseExpressao();
        this.expect('PONTUACAO', ')');
        const corpo = this.parseBloco();
        let senao = null;
        if (this.peek().tipo === 'PALAVRA_CHAVE' && this.peek().valor === 'senao') {
            this.next();
            senao = this.parseBloco();
        }
        return { tipo: 'se', cond, corpo, senao };
    }

    parseEnquanto() {
        this.expect('PALAVRA_CHAVE', 'enquanto');
        this.expect('PONTUACAO', '(');
        const cond = this.parseExpressao();
        this.expect('PONTUACAO', ')');
        const corpo = this.parseBloco();
        return { tipo: 'enquanto', cond, corpo };
    }

    parsePara() {
        this.expect('PALAVRA_CHAVE', 'para');
        this.expect('PONTUACAO', '(');
        // Inicialização
        let init = null;
        const tokInit = this.peek();
        if (tokInit.tipo === 'PALAVRA_CHAVE' && tokInit.valor === 'var') {
            init = this.parseDeclVar();
        } else if (tokInit.tipo === 'IDENTIFICADOR') {
            const next = this.tokens[this.pos + 1];
            if (next && next.valor === '=') init = this.parseAtribuicao();
            else this.expect('PONTUACAO', ';'); // vazio
        } else {
            // vazio
        }
        this.expect('PONTUACAO', ';');
        // Condição
        const cond = this.parseExpressao();
        this.expect('PONTUACAO', ';');
        // Incremento
        let inc = null;
        const tokInc = this.peek();
        if (tokInc.tipo === 'IDENTIFICADOR') {
            const next = this.tokens[this.pos + 1];
            if (next && next.valor === '=') inc = this.parseAtribuicao();
        }
        this.expect('PONTUACAO', ')');
        const corpo = this.parseBloco();
        return { tipo: 'para', init, cond, inc, corpo };
    }

    parseEscreva() {
        this.expect('PALAVRA_CHAVE', 'escreva');
        this.expect('PONTUACAO', '(');
        const expr = this.parseExpressao();
        this.expect('PONTUACAO', ')');
        this.expect('PONTUACAO', ';');
        return { tipo: 'escreva', expr };
    }

    parseRetorne() {
        this.expect('PALAVRA_CHAVE', 'retorne');
        const expr = this.parseExpressao();
        this.expect('PONTUACAO', ';');
        return { tipo: 'retorne', expr };
    }

    parseFuncao() {
        this.expect('PALAVRA_CHAVE', 'funcao');
        const id = this.expect('IDENTIFICADOR');
        this.expect('PONTUACAO', '(');
        const params = [];
        if (this.peek().tipo !== 'PONTUACAO' || this.peek().valor !== ')') {
            do {
                const p = this.expect('IDENTIFICADOR');
                params.push(p.valor);
            } while (this.match('PONTUACAO', ','));
        }
        this.expect('PONTUACAO', ')');
        const corpo = this.parseBloco();
        return { tipo: 'funcao', id: id.valor, params, corpo };
    }

    parseChamada() {
        const id = this.expect('IDENTIFICADOR');
        this.expect('PONTUACAO', '(');
        const args = [];
        if (this.peek().tipo !== 'PONTUACAO' || this.peek().valor !== ')') {
            do {
                args.push(this.parseExpressao());
            } while (this.match('PONTUACAO', ','));
        }
        this.expect('PONTUACAO', ')');
        return { tipo: 'chamada', id: id.valor, args };
    }

    // ------------------------------------------------------------
    //  EXPRESSÕES (com precedência)
    // ------------------------------------------------------------
    parseExpressao() {
        return this.parseOu();
    }

    parseOu() {
        let esq = this.parseE();
        while (this.match('OPERADOR', '||')) {
            const op = '||';
            const dir = this.parseE();
            esq = { tipo: 'binop', op, esq, dir };
        }
        return esq;
    }

    parseE() {
        let esq = this.parseComparacao();
        while (this.match('OPERADOR', '&&')) {
            const op = '&&';
            const dir = this.parseComparacao();
            esq = { tipo: 'binop', op, esq, dir };
        }
        return esq;
    }

    parseComparacao() {
        let esq = this.parseAdicao();
        const ops = ['==', '!=', '<', '>', '<=', '>='];
        while (true) {
            const tok = this.peek();
            if (tok.tipo === 'OPERADOR' && ops.includes(tok.valor)) {
                const op = this.next().valor;
                const dir = this.parseAdicao();
                esq = { tipo: 'binop', op, esq, dir };
            } else break;
        }
        return esq;
    }

    parseAdicao() {
        let esq = this.parseMultiplicacao();
        while (true) {
            const tok = this.peek();
            if (tok.tipo === 'OPERADOR' && (tok.valor === '+' || tok.valor === '-')) {
                const op = this.next().valor;
                const dir = this.parseMultiplicacao();
                esq = { tipo: 'binop', op, esq, dir };
            } else break;
        }
        return esq;
    }

    parseMultiplicacao() {
        let esq = this.parseUnario();
        while (true) {
            const tok = this.peek();
            if (tok.tipo === 'OPERADOR' && (tok.valor === '*' || tok.valor === '/' || tok.valor === '%')) {
                const op = this.next().valor;
                const dir = this.parseUnario();
                esq = { tipo: 'binop', op, esq, dir };
            } else break;
        }
        return esq;
    }

    parseUnario() {
        const tok = this.peek();
        if (tok.tipo === 'OPERADOR' && (tok.valor === '!' || tok.valor === '-')) {
            const op = this.next().valor;
            const expr = this.parseUnario();
            return { tipo: 'unario', op, expr };
        }
        return this.parsePrimario();
    }

    parsePrimario() {
        const tok = this.peek();
        if (tok.tipo === 'NUMERO' || tok.tipo === 'STRING') {
            this.next();
            return { tipo: tok.tipo.toLowerCase(), valor: tok.valor };
        }
        if (tok.tipo === 'PALAVRA_CHAVE') {
            if (tok.valor === 'verdadeiro') {
                this.next();
                return { tipo: 'booleano', valor: true };
            }
            if (tok.valor === 'falso') {
                this.next();
                return { tipo: 'booleano', valor: false };
            }
        }
        if (tok.tipo === 'IDENTIFICADOR') {
            // Pode ser chamada de função ou variável
            const next = this.tokens[this.pos + 1];
            if (next && next.valor === '(') {
                return this.parseChamada();
            } else {
                const id = this.next().valor;
                return { tipo: 'variavel', valor: id };
            }
        }
        if (tok.tipo === 'PONTUACAO' && tok.valor === '(') {
            this.next();
            const expr = this.parseExpressao();
            this.expect('PONTUACAO', ')');
            return expr;
        }
        throw new Error(`Expressão inesperada: ${tok.valor} (${tok.tipo}) na linha ${tok.linha}`);
    }
}

/**
 * Interpretador (Avaliador)
 */
class Interpretador {
    constructor() {
        this.variaveis = {};
        this.funcoes = {};
        this.saida = [];
        this.retorno = null;
        this.stack = [];
    }

    // Limpa o estado para nova execução
    reset() {
        this.variaveis = {};
        this.funcoes = {};
        this.saida = [];
        this.retorno = null;
        this.stack = [];
    }

    // Executa um programa (AST)
    executar(ast) {
        this.reset();
        // Primeiro, registrar funções
        for (const comando of ast.comandos) {
            if (comando.tipo === 'funcao') {
                this.funcoes[comando.id] = comando;
            }
        }
        // Executa comandos
        for (const comando of ast.comandos) {
            if (comando.tipo === 'funcao') continue; // já registradas
            this.executarComando(comando);
            if (this.retorno !== null) break;
        }
        return this.saida.join('\n');
    }

    executarComando(comando) {
        if (this.retorno !== null) return;

        switch (comando.tipo) {
            case 'decl_var':
                this.declVar(comando);
                break;
            case 'atribuicao':
                this.atribuir(comando);
                break;
            case 'se':
                this.executarSe(comando);
                break;
            case 'enquanto':
                this.executarEnquanto(comando);
                break;
            case 'para':
                this.executarPara(comando);
                break;
            case 'escreva':
                this.executarEscreva(comando);
                break;
            case 'retorne':
                this.executarRetorne(comando);
                break;
            case 'bloco':
                this.executarBloco(comando);
                break;
            case 'chamada_comando':
                this.executarChamada(comando.chamada);
                break;
            default:
                throw new Error(`Comando desconhecido: ${comando.tipo}`);
        }
    }

    declVar(comando) {
        const id = comando.id;
        let valor = undefined;
        if (comando.expr) {
            valor = this.avaliar(comando.expr);
        }
        this.variaveis[id] = valor;
    }

    atribuir(comando) {
        const id = comando.id;
        const valor = this.avaliar(comando.expr);
        if (id in this.variaveis) {
            this.variaveis[id] = valor;
        } else {
            throw new Error(`Variável '${id}' não declarada`);
        }
    }

    executarSe(comando) {
        const cond = this.avaliar(comando.cond);
        if (this.isTruthy(cond)) {
            this.executarBloco(comando.corpo);
        } else if (comando.senao) {
            this.executarBloco(comando.senao);
        }
    }

    executarEnquanto(comando) {
        while (this.isTruthy(this.avaliar(comando.cond))) {
            this.executarBloco(comando.corpo);
            if (this.retorno !== null) break;
        }
    }

    executarPara(comando) {
        // Inicialização
        if (comando.init) {
            if (comando.init.tipo === 'decl_var') {
                this.declVar(comando.init);
            } else if (comando.init.tipo === 'atribuicao') {
                this.atribuir(comando.init);
            }
        }
        // Loop
        while (this.isTruthy(this.avaliar(comando.cond))) {
            this.executarBloco(comando.corpo);
            if (this.retorno !== null) break;
            if (comando.inc) this.atribuir(comando.inc);
        }
    }

    executarEscreva(comando) {
        const valor = this.avaliar(comando.expr);
        this.saida.push(String(valor));
    }

    executarRetorne(comando) {
        this.retorno = this.avaliar(comando.expr);
    }

    executarBloco(bloco) {
        for (const cmd of bloco.comandos) {
            this.executarComando(cmd);
            if (this.retorno !== null) break;
        }
    }

    executarChamada(chamada) {
        // Chamada de função como comando (ignora retorno)
        this.avaliar(chamada);
    }

    // ------------------------------------------------------------
    //  AVALIADOR DE EXPRESSÕES
    // ------------------------------------------------------------
    avaliar(expr) {
        if (!expr) return undefined;

        switch (expr.tipo) {
            case 'numero':
                return expr.valor;
            case 'string':
                return expr.valor;
            case 'booleano':
                return expr.valor;
            case 'variavel':
                if (expr.valor in this.variaveis) {
                    return this.variaveis[expr.valor];
                }
                throw new Error(`Variável '${expr.valor}' não definida`);
            case 'binop':
                return this.avaliarBinop(expr);
            case 'unario':
                return this.avaliarUnario(expr);
            case 'chamada':
                return this.avaliarChamada(expr);
            default:
                throw new Error(`Expressão desconhecida: ${expr.tipo}`);
        }
    }

    avaliarBinop(expr) {
        const esq = this.avaliar(expr.esq);
        const dir = this.avaliar(expr.dir);
        switch (expr.op) {
            case '+': return esq + dir;
            case '-': return esq - dir;
            case '*': return esq * dir;
            case '/': return esq / dir;
            case '%': return esq % dir;
            case '==': return esq === dir;
            case '!=': return esq !== dir;
            case '<': return esq < dir;
            case '>': return esq > dir;
            case '<=': return esq <= dir;
            case '>=': return esq >= dir;
            case '&&': return esq && dir;
            case '||': return esq || dir;
            default:
                throw new Error(`Operador binário desconhecido: ${expr.op}`);
        }
    }

    avaliarUnario(expr) {
        const val = this.avaliar(expr.expr);
        switch (expr.op) {
            case '-': return -val;
            case '!': return !this.isTruthy(val);
            default:
                throw new Error(`Operador unário desconhecido: ${expr.op}`);
        }
    }

    avaliarChamada(chamada) {
        const nome = chamada.id;
        if (!(nome in this.funcoes)) {
            throw new Error(`Função '${nome}' não definida`);
        }
        const func = this.funcoes[nome];
        const args = chamada.args.map(arg => this.avaliar(arg));

        // Cria novo escopo (cópia das variáveis atuais, mas com parâmetros)
        const escopoAnterior = this.variaveis;
        const novoEscopo = { ...this.variaveis };

        // Associa parâmetros
        for (let i = 0; i < func.params.length; i++) {
            novoEscopo[func.params[i]] = args[i] !== undefined ? args[i] : undefined;
        }

        // Salva retorno atual e executa função
        const retornoAnterior = this.retorno;
        this.retorno = null;
        this.variaveis = novoEscopo;

        try {
            this.executarBloco(func.corpo);
        } finally {
            const resultado = this.retorno !== null ? this.retorno : undefined;
            this.variaveis = escopoAnterior;
            this.retorno = retornoAnterior;
            return resultado;
        }
    }

    // ------------------------------------------------------------
    //  UTILITÁRIOS
    // ------------------------------------------------------------
    isTruthy(valor) {
        if (typeof valor === 'boolean') return valor;
        if (typeof valor === 'number') return valor !== 0;
        if (typeof valor === 'string') return valor.length > 0;
        return Boolean(valor);
    }
}

/**
 * FUNÇÃO PRINCIPAL: executa um programa e retorna a saída (string)
 */
function executarPrograma(codigo) {
    try {
        const tokens = tokenizer(codigo);
        const parser = new Parser(tokens);
        const ast = parser.parseProgram();
        const interp = new Interpretador();
        const saida = interp.executar(ast);
        return saida;
    } catch (erro) {
        return `ERRO: ${erro.message}`;
    }
}

// ================================================================
//  EXEMPLO DE USO (opcional, para testar no console)
// ================================================================
// const codigoExemplo = `
// var a = 10;
// var b = 20;
// escreva("Soma: " + (a + b));
// se (a > b) { escreva("a maior"); } senao { escreva("b maior"); }
// `;
// console.log(executarPrograma(codigoExemplo));

// ================================================================
//  PARA USO EM PÁGINA HTML:
//  - Cole este script em um arquivo .js ou dentro de <script>
//  - Chame executarPrograma(codigo) com o texto do editor
//  - O retorno é a string com a saída (ou mensagem de erro)
// ================================================================
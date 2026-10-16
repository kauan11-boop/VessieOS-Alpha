// Vessie.js - Nucleo que guarda e roda JS + VessieLang (.vl)
// Responsavel: carregar B1/J3/G5, detectar nivel, logar por script.
(function (global) {
'use strict';
const Vessie = {
  versao: '2.0.0',
  saidas: {},
  detectarNivel: function (codigo) {
    // ai./net./collector./vessieos. sao as novas APIs adicionadas na integracao
    // com o kernel do VessieOS (runtime-bridge.js) - sem isso, um script que só
    // usa essas chamadas cairia incorretamente no dialeto B1/J3.
    if (/(func\s|class\s|system\.|file\.|process\.|gui\.|network\.|storage\.|crypto\.|json\.|math\.|string\.|ai\.|net\.|collector\.|vessieos\.)/.test(codigo)) return 'FULL';
    if (/(boot|processo\s|janela\s|arquivo\s|driver\s|syscall\s|rede\s|permissao\s)/.test(codigo)) return 'G5';
    if (/(importar|import\s|tarefa|para\s+cada|\[|\{)/.test(codigo)) return 'J3';
    return 'B1';
  },
  rodar: function (nome, codigo) {
    const nivel = this.detectarNivel(codigo);
    let fn = null;
    if (nivel === 'FULL' && typeof global.executarFULL === 'function') fn = global.executarFULL;
    else if (nivel === 'G5' && typeof global.executarG5 === 'function') fn = global.executarG5;
    else if (nivel === 'J3' && typeof global.executarJ3 === 'function') fn = global.executarJ3;
    else if (typeof global.executarPrograma === 'function') fn = global.executarPrograma;
    else if (typeof global.executarJ3 === 'function') fn = global.executarJ3;
    else if (typeof global.executarG5 === 'function') fn = global.executarG5;
    if (!fn) return 'ERRO: nenhum interpretador carregado';
    const saida = fn(codigo);
    this.saidas[nome] = { nivel, saida, quando: new Date().toISOString() };
    this.log(nome, nivel, saida);
    return saida;
  },
  log: function (nome, nivel, saida) {
    const linha = '[' + new Date().toISOString() + '] [' + nivel + '] ' + nome + ' => ' + String(saida).slice(0, 500) + '\n';
    if (typeof process !== 'undefined' && process.stdout) { try { process.stdout.write(linha); } catch (e) {} }
    else if (global.console) console.log(linha);
    this._buffer = (this._buffer || '') + linha;
  },
  relatorio: function () {
    const r = { versao: this.versao, total: Object.keys(this.saidas).length, itens: this.saidas };
    return JSON.stringify(r, null, 2);
  }
};
global.Vessie = Vessie;
if (typeof module !== 'undefined' && module.exports) module.exports = Vessie;
})(typeof window !== 'undefined' ? window : globalThis);

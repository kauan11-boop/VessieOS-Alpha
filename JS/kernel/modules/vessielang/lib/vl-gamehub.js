/* Vessie/gamehub.js - loja+biblioteca+XP/cartoes/conquistas/amigos/ranking */
(function (global) {
'use strict';
function load(k, d) { try { const r = (typeof localStorage !== 'undefined') ? localStorage.getItem(k) : null; return r ? JSON.parse(r) : d; } catch (e) { return d; } }
function save(k, v) { try { if (typeof localStorage !== 'undefined') localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
const GameHub = {
  catalogo: [
    { id: 'demo-aventura', titulo: 'Demo Aventura', genero: 'aventura', preco: 0, desc: 'Jogo demo .vl com 100 moedas', img: '🎮' },
    { id: 'nave-vl', titulo: 'Nave VL', genero: 'arcade', preco: 50, desc: 'Sobreviva no espaco', img: '🚀' },
    { id: 'quebra-bloco', titulo: 'Quebra Bloco', genero: 'puzzle', preco: 30, desc: 'Quebre todos os blocos', img: '🧱' }
  ],
  get xp() { return load('vessie_xp', 0); }, set xp(v) { save('vessie_xp', v); },
  get lib() { return load('vessie_lib', ['demo-aventura']); }, set lib(v) { save('vessie_lib', v); },
  abrir(id) { let xp = this.xp + 25; const antes = Math.floor(this.xp / 100); this.xp = xp; let msg = '[gamehub] +25 XP abrir ' + id + ' total=' + xp; const depois = Math.floor(xp / 100); if (depois > antes) { const lib = this.lib; for (let i = 0; i < 100; i++) lib.push('bonus-' + Date.now() + '-' + i); this.lib = lib; if (global.OS && global.OS.toast) global.OS.toast('Novos itens adicionados!'); msg += ' | LEVEL UP! +100 jogos'; } return msg; },
  conquista(id) { this.xp = this.xp + 50; return '[gamehub] conquista ' + id + ' +50 XP total=' + this.xp; },
  comprar(id) { const g = this.catalogo.find(x => x.id === id); if (!g) return 'jogo nao existe'; if (this.xp < g.preco) return 'XP insuficiente'; this.xp -= g.preco; const lib = this.lib; lib.push(id); this.lib = lib; return 'comprou ' + id; },
  amigos() { return load('vessie_amigos', [{ nome: 'ana', online: true }, { nome: 'bob', online: false }]); },
  ranking() { return [{ jogo: 'demo-aventura', top: [{ user: 'admin', pts: 100 }] }]; }
};
global.GameHub = GameHub;
if (typeof module !== 'undefined' && module.exports) module.exports = GameHub;
})(typeof window !== 'undefined' ? window : globalThis);

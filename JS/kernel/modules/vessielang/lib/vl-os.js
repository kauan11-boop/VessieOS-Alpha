/* Vessie/os.js - boot, terminal, desktop/janelas/menu, BroadcastChannel sync */
(function (global) {
'use strict';
const OS = {
  versao: '5.0.0', janelas: {}, bc: null,
  boot() { const k = global.Kernel ? global.Kernel.boot() : 'kernel?'; try { if (typeof BroadcastChannel !== 'undefined') { this.bc = new BroadcastChannel('vessie'); this.bc.onmessage = (m) => this.toast('[sync] ' + JSON.stringify(m.data).slice(0, 80)); } } catch (e) {} return k + ' | VessieOS ' + this.versao; },
  toast(msg) { try { if (typeof document !== 'undefined') { let d = document.getElementById('toasts'); if (d) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; d.appendChild(t); setTimeout(() => t.remove(), 3500); } } } catch (e) {} if (global.console) console.log('[toast] ' + msg); return msg; },
  sync(obj) { try { if (this.bc) this.bc.postMessage(obj); } catch (e) {} },
  terminal(cmd) {
    const p = String(cmd || '').trim().split(/\s+/); const c = p[0]; const a = p.slice(1);
    if (c === 'help') return 'ls cd pwd mkdir cat echo clear run ps kill sysinfo date whoami mount shutdown reboot backup tema notify game loja comprar abrir ranking amigos';
    if (c === 'ls') return JSON.stringify(global.FS.listDir(a[0] || '/C/Users/admin').map(x => x.nome + '(' + x.tipo + ')'));
    if (c === 'pwd') return '/C/Users/admin';
    if (c === 'mkdir') { global.FS.mkdir(a[0]); return 'ok'; }
    if (c === 'cat') return global.FS.readFile(a[0]);
    if (c === 'echo') return a.join(' ');
    if (c === 'ps') return JSON.stringify(global.Kernel.list().map(x => x.pid + ':' + x.nome + ':' + x.estado));
    if (c === 'kill') return String(global.Kernel.kill(Number(a[0])));
    if (c === 'sysinfo') return JSON.stringify(global.Kernel.sysinfo());
    if (c === 'whoami') return global.Security.user;
    if (c === 'date') return new Date().toString();
    if (c === 'run') { const cod = global.FS.readFile(a[0]); return global.Vessie.rodar(a[0], cod); }
    if (c === 'backup') return global.Modules.backup(a[0] || '/C/Users/admin/Documents');
    if (c === 'tema') return global.Modules.tema(a[0] || 'escuro');
    if (c === 'notify') return global.Modules.notify(a[0] || 'oi', a.slice(1).join(' ') || 'msg', 'info');
    if (c === 'loja') return JSON.stringify(global.GameHub.catalogo.map(g => g.id + '=' + g.preco + 'XP'));
    if (c === 'comprar') return global.GameHub.comprar(a[0]);
    if (c === 'abrir') return global.GameHub.abrir(a[0] || 'demo-aventura');
    if (c === 'ranking') return JSON.stringify(global.GameHub.ranking());
    if (c === 'amigos') return JSON.stringify(global.GameHub.amigos());
    if (c === 'shutdown') return global.Modules.power.shutdown();
    if (c === 'reboot') return global.Modules.power.reboot();
    if (c === 'clear') return '';
    return 'comando nao existe: ' + c + ' (help)';
  }
};
global.OS = OS;
if (typeof module !== 'undefined' && module.exports) module.exports = OS;
})(typeof window !== 'undefined' ? window : globalThis);

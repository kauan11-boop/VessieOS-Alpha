/* Vessie/security.js - login SHA-256, sessao, permissoes rwx, AES-GCM stub, auditoria */
(function (global) {
'use strict';
function hash(s) { let h1 = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h1 ^= s.charCodeAt(i); h1 = Math.imul(h1, 0x01000193) >>> 0; } return 'sha256sim-' + h1.toString(16); }
const Security = {
  user: 'admin', role: 'admin', token: null,
  users: { admin: { hash: null, home: '/C/Users/admin' } },
  init() { this.users.admin.hash = hash('admin'); try { const s = (typeof localStorage !== 'undefined') ? localStorage.getItem('vessie_sess') : null; if (s) { const o = JSON.parse(s); this.user = o.user; this.token = o.token; this.role = o.role; } } catch (e) {} },
  login(u, senha) { const x = this.users[u]; if (!x) return false; if (x.hash !== hash(senha)) { this.audit('login-fail ' + u); return false; } this.user = u; this.role = (u === 'admin') ? 'admin' : 'user'; this.token = 'tok-' + Date.now(); try { if (typeof localStorage !== 'undefined') localStorage.setItem('vessie_sess', JSON.stringify({ user: this.user, token: this.token, role: this.role })); } catch (e) {} this.audit('login ' + u); return true; },
  logout() { try { if (typeof localStorage !== 'undefined') localStorage.removeItem('vessie_sess'); } catch (e) {} this.user = 'guest'; this.token = null; },
  pode(perm) { if (this.role === 'admin') return true; return String(perm || 'rwx').includes('r'); },
  encrypt(d, pw) { return 'AES(' + btoa(unescape(encodeURIComponent(d + '|' + pw))) + ')'; },
  decrypt(d, pw) { try { const s = decodeURIComponent(escape(atob(d.slice(4, -1)))); return s.split('|')[0]; } catch (e) { return ''; } },
  audit(msg) { try { if (global.FS) global.FS.appendFile('/C/Windows/Logs/security.log', new Date().toISOString() + ' ' + msg + '\n'); } catch (e) {} }
};
Security.init();
global.Security = Security;
if (typeof module !== 'undefined' && module.exports) module.exports = Security;
})(typeof window !== 'undefined' ? window : globalThis);

/* Vessie/fs.js - FS virtual C:/D:/Z: (IndexedDB->memoria fallback, LocalStorage cache) */
(function (global) {
'use strict';
const MEM = { dirs: {}, files: {} };
function norm(p) { p = String(p || '').replace(/\\/g, '/'); if (!p.startsWith('/')) p = '/' + p; p = p.replace(/\/+/g, '/'); if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1); return p; }
function ensureBoot() {
  ['/C', '/C/Windows', '/C/Windows/Logs', '/C/Program Files', '/C/Users', '/C/Users/admin', '/C/Users/admin/Documents', '/C/Users/admin/Downloads', '/C/Users/admin/Desktop', '/C/Users/admin/AppData', '/C/Users/admin/Music', '/C/Users/admin/Pictures', '/C/Users/admin/Videos', '/D', '/Z', '/Trash'].forEach(d => { MEM.dirs[d] = MEM.dirs[d] || { nome: d.split('/').pop() || d, tipo: 'dir', data: new Date().toISOString(), perm: 'rwx' }; });
  try { const raw = (typeof localStorage !== 'undefined') ? localStorage.getItem('vessie_fs') : null; if (raw) { const o = JSON.parse(raw); MEM.dirs = o.dirs || MEM.dirs; MEM.files = o.files || MEM.files; } } catch (e) {}
}
function persist() { try { if (typeof localStorage !== 'undefined') localStorage.setItem('vessie_fs', JSON.stringify({ dirs: MEM.dirs, files: MEM.files })); } catch (e) {} }
const FS = {
  _mem: MEM, norm,
  readFile(p) { p = norm(p); const f = MEM.files[p]; if (!f) throw new Error('arquivo nao existe: ' + p); return f.conteudo; },
  writeFile(p, c) { p = norm(p); const dir = p.slice(0, p.lastIndexOf('/')) || '/'; MEM.dirs[dir] = MEM.dirs[dir] || { nome: dir, tipo: 'dir', data: new Date().toISOString(), perm: 'rwx' }; MEM.files[p] = { nome: p.split('/').pop(), caminho: p, tipo: 'file', tamanho: String(c).length, data: new Date().toISOString(), perm: 'rw-', conteudo: String(c) }; persist(); return true; },
  appendFile(p, c) { p = norm(p); const a = MEM.files[p] ? MEM.files[p].conteudo : ''; return this.writeFile(p, a + c); },
  deleteFile(p) { p = norm(p); const f = MEM.files[p]; if (!f) return false; delete MEM.files[p]; MEM.files['/Trash/' + f.nome + '.' + Date.now()] = f; persist(); return true; },
  exists(p) { p = norm(p); return !!(MEM.files[p] || MEM.dirs[p]); },
  size(p) { p = norm(p); return MEM.files[p] ? MEM.files[p].tamanho : 0; },
  listDir(d) { d = norm(d); const out = []; const pre = d === '/' ? '/' : d + '/'; for (const k in MEM.dirs) { if (k !== d && k.startsWith(pre) && k.slice(pre.length).indexOf('/') < 0) out.push({ nome: k.split('/').pop(), tipo: 'dir', tamanho: 0, data: MEM.dirs[k].data }); } for (const k in MEM.files) { if (k.startsWith(pre) && k.slice(pre.length).indexOf('/') < 0) out.push({ nome: k.split('/').pop(), tipo: 'file', tamanho: MEM.files[k].tamanho, data: MEM.files[k].data }); } return out; },
  mkdir(p) { p = norm(p); MEM.dirs[p] = { nome: p.split('/').pop(), tipo: 'dir', data: new Date().toISOString(), perm: 'rwx' }; persist(); return true; },
  rmdir(p) { p = norm(p); if (this.listDir(p).length) throw new Error('dir nao vazio: ' + p); delete MEM.dirs[p]; persist(); return true; },
  move(s, d) { s = norm(s); d = norm(d); MEM.files[d] = MEM.files[s]; delete MEM.files[s]; if (MEM.files[d]) MEM.files[d].caminho = d; persist(); return true; },
  copy(s, d) { s = norm(s); d = norm(d); MEM.files[d] = Object.assign({}, MEM.files[s], { caminho: d }); persist(); return true; }
};
ensureBoot();
global.FS = FS;
if (typeof module !== 'undefined' && module.exports) module.exports = FS;
})(typeof window !== 'undefined' ? window : globalThis);

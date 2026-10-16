/* Vessie/modules.js - notificacoes, temas, updates, logs, ajuda, backup, audio, clipboard, diagnostico, energia */
(function (global) {
'use strict';
const Modules = {
  notify(t, b, tipo) { if (global.OS && global.OS.toast) global.OS.toast(t + ': ' + b); return '[notify][' + (tipo || 'info') + '] ' + t + ' - ' + b; },
  tema(nome) { try { if (typeof document !== 'undefined') document.documentElement.dataset.tema = nome; if (typeof localStorage !== 'undefined') localStorage.setItem('vessie_tema', nome); } catch (e) {} return 'tema=' + nome; },
  update() { return '[update] VessieOS ja esta atualizado (5.0)'; },
  log(mod, msg) { try { if (global.FS) global.FS.appendFile('/C/Windows/Logs/system.log', new Date().toISOString() + ' [' + mod + '] ' + msg + '\n'); } catch (e) {} return 'log ok'; },
  ajuda(t) { return 'Ajuda VessieLang: ' + (t || 'use F1. Comandos: ls cd cat run ps kill sysinfo help'); },
  backup(path) { try { const l = global.FS.listDir(path); global.FS.writeFile(path + '.vbackup', JSON.stringify(l)); return '[backup] ' + path + ' -> ' + path + '.vbackup (' + l.length + ' itens)'; } catch (e) { return 'ERRO backup: ' + e.message; } },
  audio: { vol: 0.8, play(f) { return '[audio] tocando ' + f; }, stop() { return '[audio] stop'; }, volume(v) { this.vol = v; return 'vol=' + v; } },
  clipboard: { _t: '', copy(t) { this._t = t; try { if (navigator.clipboard) navigator.clipboard.writeText(t); } catch (e) {} return 'copiado'; }, paste() { return this._t; } },
  diagnostic() { const k = global.Kernel ? global.Kernel.list().length : 0; return '[diagnostico] OK | procs=' + k + ' | fs=' + (global.FS ? global.FS.listDir('/C').length + ' dirs em /C' : '?'); },
  power: { info() { return '[energia] bateria 100% | modo equilibrado'; }, suspend() { return '[energia] suspensao (caches limpos)'; }, shutdown() { return '[energia] desligando...'; }, reboot() { return '[energia] reiniciando...'; } }
};
global.Modules = Modules;
if (typeof module !== 'undefined' && module.exports) module.exports = Modules;
})(typeof window !== 'undefined' ? window : globalThis);

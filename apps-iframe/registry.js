/**
 * Registro dos apps em iframe. Para criar um app novo: copie uma pasta (index.html + style.css + app.js),
 * e acrescente uma linha aqui. `permissions` = namespaces de comandos que o app pode usar
 * (comandos puros — text, math, date, enc, json… — são sempre liberados). "admin" libera comandos perigosos (com confirmação).
 */
window.VESSIE_APP_REGISTRY = [
  { id: 'comandos',   name: 'Console de Comandos', icon: 'fa-terminal',     cat: 'sys',   size: [1000, 640], permissions: ['*', 'admin'] },
  { id: 'appbuilder', name: 'Criador de Apps',     icon: 'fa-screwdriver-wrench', cat: 'sys', size: [1060, 660], permissions: ['app', 'fs', 'notify'] },
  { id: 'notas',      name: 'Notas',               icon: 'fa-note-sticky',  cat: 'util',  size: [760, 520],  permissions: ['fs', 'notify', 'storage'] },
  { id: 'monitor',    name: 'Monitor do Sistema',  icon: 'fa-gauge-high',   cat: 'sys',   size: [820, 580],  permissions: ['system', 'window', 'audio', 'theme', 'neural', 'app', 'notify'] },
];

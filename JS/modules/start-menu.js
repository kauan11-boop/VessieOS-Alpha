(function () {
  // NOTA: o Menu Iniciar (abrir/fechar, busca, fixar, recentes, energia) foi
  // reescrito por completo em JS/core/main.js (openStartMenu/closeStartMenu,
  // classe .open no #sm). Este módulo antigo só fazia um toggle simples de
  // `style.display`, que hoje conflita com o novo sistema baseado em classe
  // (a transição de abertura/fechamento depende de opacity/transform, não
  // de display). Mantido como no-op para não quebrar quem ainda importa
  // este arquivo, mas ele não faz mais nada.
  function init() { /* superado por JS/core/main.js — ver openStartMenu/closeStartMenu */ }

  window.VessieOS = window.VessieOS || {};
  window.VessieOS.modules = window.VessieOS.modules || {};
  window.VessieOS.modules.startMenu = { init };
})();

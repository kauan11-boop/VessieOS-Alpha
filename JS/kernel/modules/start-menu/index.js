/**
 * VessieOS Kernel Module — Start Menu (Enhanced) — DESATIVADO
 *
 * O Menu Iniciar foi completamente reescrito em JS/core/main.js
 * (renderStartMenu / renderPinnedGrid / renderAllAppsGrid / togglePinnedApp /
 * addRecentApp), com 3 vistas (Fixados / Todos os apps / Busca), fixar via
 * botão de alfinete OU menu de contexto, e recentes/fixados persistidos em
 * S.pinnedApps/S.recentApps (mesmo state salvo do resto do sistema, em vez
 * de chaves soltas no localStorage como este módulo usava).
 *
 * Este módulo é mantido no arquivo (não apagado, para não quebrar quem
 * ainda referencia `window.VessieOS.modules.startMenu`), mas desativado:
 * o `reorderGrid()` original juntava TODOS os `.sm-app` como filhos
 * diretos de #sm-grid, destruindo os agrupamentos por categoria da nova
 * vista "Todos os apps" — e o pin/recent duplicava, com storage próprio,
 * o que main.js já faz de forma integrada.
 */
(function () {
  function init() { /* superado por JS/core/main.js — ver renderStartMenu/togglePinnedApp/addRecentApp */ }

  window.VessieOS = window.VessieOS || {};
  window.VessieOS.modules = window.VessieOS.modules || {};
  window.VessieOS.modules.startMenu = { init };
})();

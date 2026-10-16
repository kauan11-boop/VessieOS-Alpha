(function () {
  // NOTA: o toggle do painel (#np) hoje pertence a JS/core/main.js
  // (`.onclick` em #tb-notif + classe `.open` — ver CSS/components/
  // notifications.css `#np.open`). Uma versão antiga deste módulo fazia
  // toggle via `style.display`, o que brigava com o mecanismo por classe:
  // os dois handlers disparavam no mesmo clique (display:none inline +
  // classe open = painel invisível). Mantido como no-op documentado para
  // não quebrar quem ainda importa este arquivo.
  function init() {
    const panel = document.getElementById('np');
    if (panel) panel.classList.remove('open');
  }

  window.VessieOS = window.VessieOS || {};
  window.VessieOS.modules = window.VessieOS.modules || {};
  window.VessieOS.modules.notifications = { init };
})();

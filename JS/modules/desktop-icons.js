(function () {
  function refresh() {
    const area = document.getElementById('icons-area');
    if (!area) return;
    area.dataset.ready = 'true';
  }

  function init() {
    refresh();
  }

  window.VessieOS = window.VessieOS || {};
  window.VessieOS.modules = window.VessieOS.modules || {};
  window.VessieOS.modules.desktopIcons = { init, refresh };
})();

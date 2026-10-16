(function () {
  function init() {
    const area = document.getElementById('desktop');
    if (!area) return;
    area.dataset.windowsReady = 'true';
  }

  window.VessieOS = window.VessieOS || {};
  window.VessieOS.modules = window.VessieOS.modules || {};
  window.VessieOS.modules.windows = { init };
})();

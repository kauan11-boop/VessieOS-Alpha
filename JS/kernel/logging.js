(function () {
  function addLog(level, message, source = 'System') {
    const kernel = window.VessieOS && window.VessieOS.kernel;
    if (!kernel || typeof kernel.log !== 'function') return null;
    return kernel.log(level, message, source);
  }

  function list() {
    const kernel = window.VessieOS && window.VessieOS.kernel;
    return kernel ? kernel.logs.slice(0, 25) : [];
  }

  window.VessieOS = window.VessieOS || {};
  window.VessieOS.Logger = {
    add: addLog,
    list
  };
})();

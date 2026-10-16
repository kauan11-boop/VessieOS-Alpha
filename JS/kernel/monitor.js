(function () {
  function snapshot() {
    const kernel = window.VessieOS && window.VessieOS.kernel;
    if (!kernel) return { ok: false, message: 'Kernel unavailable.' };
    return {
      ok: true,
      health: kernel.health(),
      processes: kernel.listProcesses(),
      logs: kernel.logs.slice(0, 12)
    };
  }

  window.VessieOS = window.VessieOS || {};
  window.VessieOS.Monitor = { snapshot };
})();

(function () {
  const kernel = () => (window.VessieOS && window.VessieOS.kernel ? window.VessieOS.kernel : null);

  function loadExecutable(executable) {
    const k = kernel();
    if (!k) return null;
    const validation = window.VessieOS.Security && typeof window.VessieOS.Security.validateExecutable === 'function'
      ? window.VessieOS.Security.validateExecutable(executable && executable.name)
      : { ok: true };

    if (!validation.ok) {
      throw new Error(validation.reason || 'Executable is not valid.');
    }

    const result = k.createProcess({
      name: executable.name,
      path: executable.path || `C:/Executables/${executable.name}.exe`,
      memory: executable.memory || 64,
      owner: executable.owner || 'user',
      cpu: executable.cpu || 3,
      metadata: executable.metadata || {}
    });

    if (window.VessieOS && window.VessieOS.Logger && window.VessieOS.Logger.add) {
      window.VessieOS.Logger.add('info', `Executable ${executable.name} loaded into kernel runtime.`, 'Loader');
    }

    return result;
  }

  window.VessieOS = window.VessieOS || {};
  window.VessieOS.Loader = { loadExecutable };
})();

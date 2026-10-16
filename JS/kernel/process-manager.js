(function () {
  const kernel = () => (window.VessieOS && window.VessieOS.kernel ? window.VessieOS.kernel : null);

  function spawnExecutable(executable) {
    const k = kernel();
    if (!k) return null;
    if (!executable || !executable.name) return null;
    const process = k.createProcess({
      name: executable.name,
      path: executable.path || `C:/Program Files/${executable.name}/${executable.name}.exe`,
      memory: executable.memory || 48,
      owner: executable.owner || 'user',
      cpu: executable.cpu || 0,
      state: executable.state || 'running',
      metadata: executable.metadata || {}
    });
    return process;
  }

  function terminate(pid) {
    const k = kernel();
    if (!k) return false;
    return k.terminateProcess(pid);
  }

  function list() {
    const k = kernel();
    return k ? k.listProcesses() : [];
  }

  window.VessieOS = window.VessieOS || {};
  window.VessieOS.ProcessManager = {
    spawnExecutable,
    terminate,
    list
  };
})();

(function () {
  function validateModule(name, payload) {
    if (!name || typeof name !== 'string') return { ok: false, reason: 'Invalid module name.' };
    if (!payload || typeof payload !== 'object') return { ok: false, reason: 'Module payload is invalid.' };
    return { ok: true };
  }

  function validateExecutable(name) {
    const safe = typeof name === 'string' ? name.trim() : '';
    if (!safe) return { ok: false, reason: 'Executable name is required.' };
    if (/[^a-zA-Z0-9_.\- ]/.test(safe)) return { ok: false, reason: 'Executable contains invalid characters.' };
    return { ok: true, value: safe };
  }

  window.VessieOS = window.VessieOS || {};
  window.VessieOS.Security = {
    validateModule,
    validateExecutable
  };
})();

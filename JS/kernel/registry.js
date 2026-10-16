(function () {
  const registry = new Map();

  function register(name, payload) {
    if (!name) return null;
    registry.set(name, payload);
    return payload;
  }

  function get(name) {
    return registry.get(name) || null;
  }

  function all() {
    return [...registry.entries()].map(([key, value]) => ({ key, value }));
  }

  window.VessieOS = window.VessieOS || {};
  window.VessieOS.Registry = { register, get, all };
})();

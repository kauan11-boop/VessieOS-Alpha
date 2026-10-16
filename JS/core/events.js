(function () {
  const map = new Map();

  function on(eventName, callback) {
    if (typeof callback !== 'function') return () => {};
    const listeners = map.get(eventName) || new Set();
    listeners.add(callback);
    map.set(eventName, listeners);
    return () => off(eventName, callback);
  }

  function off(eventName, callback) {
    const listeners = map.get(eventName);
    if (!listeners) return;
    listeners.delete(callback);
    if (!listeners.size) map.delete(eventName);
  }

  function emit(eventName, detail) {
    const listeners = map.get(eventName) || new Set();
    listeners.forEach((callback) => callback(detail));
  }

  window.VessieOS = window.VessieOS || {};
  window.VessieOS.events = {
    on,
    off,
    emit
  };
})();

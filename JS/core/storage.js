(function () {
  const storageKey = 'vessieos-state';

  function safeRead() {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '{}');
    } catch (error) {
      return {};
    }
  }

  function safeWrite(data) {
    try {
      localStorage.setItem(storageKey, JSON.stringify(data));
      return true;
    } catch (error) {
      return false;
    }
  }

  window.VessieOS = window.VessieOS || {};
  window.VessieOS.storage = {
    read: safeRead,
    write: safeWrite,
    get(key, fallback) {
      const data = safeRead();
      return key in data ? data[key] : fallback;
    },
    set(key, value) {
      const state = safeRead();
      state[key] = value;
      return safeWrite(state);
    }
  };
})();

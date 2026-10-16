(function () {
  const defaults = {
    '--a': '#60a5fa',
    '--a2': '#a78bfa',
    '--a3': '#22d3ee',
    '--text': '#f4f5f9',
    '--dim': '#8a90a0'
  };

  function applyTheme(theme = defaults) {
    const root = document.documentElement;
    Object.entries(theme).forEach(([key, value]) => root.style.setProperty(key, value));
    return theme;
  }

  function loadTheme() {
    try {
      const saved = JSON.parse(localStorage.getItem('vessieos-theme') || '{}');
      return applyTheme({ ...defaults, ...saved });
    } catch (error) {
      return applyTheme(defaults);
    }
  }

  window.VessieOS = window.VessieOS || {};
  window.VessieOS.theme = {
    defaults,
    apply: applyTheme,
    load: loadTheme
  };
})();

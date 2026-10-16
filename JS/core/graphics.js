(function () {
  function setBackground(url) {
    const desktop = document.getElementById('desktop');
    if (desktop && url) {
      desktop.style.backgroundImage = `url('${url}')`;
      desktop.style.backgroundSize = 'cover';
      desktop.style.backgroundPosition = 'center';
    }
  }

  function setMediaBackground(element) {
    const container = document.getElementById('desktop-media-bg');
    if (!container || !element) return;
    container.innerHTML = '';
    container.appendChild(element);
  }

  window.VessieOS = window.VessieOS || {};
  window.VessieOS.graphics = {
    setBackground,
    setMediaBackground,
    mountGameHubScene() {
      return false;
    },
    unmountGameHubScene() {
      return false;
    },
    pulseGameHubScene() {
      return false;
    },
    gameHubRenderer: null
  };
})();

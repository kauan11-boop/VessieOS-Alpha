// camera/camera.js — Câmera (pasta com view.html + view.css + camera.js)
// Shell em view.html (token {{uid}}); fallback = modelo original verbatim.
// Lógica movida para wireCamera(win, uid), inalterada.
(function () {
  "use strict";

function cameraFallback(uid) {
    return `
    <div class="cam-app" id="${uid}">
      <div class="cam-viewport">
        <video class="cam-video" autoplay playsinline muted></video>
        <div class="cam-off-msg"><i class="fas fa-video-slash"></i><span>Câmera desligada</span></div>
        <canvas class="cam-canvas" style="display:none"></canvas>
      </div>
      <div class="cam-controls">
        <button class="cam-tool" data-cmd="mirror" title="Espelhar"><i class="fas fa-arrows-left-right"></i></button>
        <button class="cam-shutter" data-cmd="snap" title="Tirar foto"><i class="fas fa-camera"></i></button>
        <button class="cam-tool" data-cmd="toggle" title="Ligar/Desligar câmera"><i class="fas fa-power-off"></i></button>
      </div>
      <div class="cam-filmstrip"><div class="cam-filmstrip-empty">Suas fotos aparecem aqui</div></div>
    </div>
  `;
  }

function openCamera() {
    const uid = 'cam' + (++window.__winCounter.n);
    const win = createWin('Câmera', '📷', '<div class="app-loading">Carregando…</div>', 620, 560);
    const wire = () => wireCamera(win, uid);
    if (window.VessieBridge && typeof window.VessieBridge.loadView === 'function') {
      window.VessieBridge.loadView('camera', { html: cameraFallback(uid) }, { uid }).then(({ html }) => {
        if (!document.body.contains(win)) return;
        win.querySelector('.wb').innerHTML = html;
        wire();
      });
    } else {
      win.querySelector('.wb').innerHTML = cameraFallback(uid);
      wire();
    }
    return win;
  }

function wireCamera(win, uid) {

    const root = win.querySelector(`#${uid}`);
    const video = root.querySelector('.cam-video');
    const canvas = root.querySelector('.cam-canvas');
    const viewport = root.querySelector('.cam-viewport');
    const filmstrip = root.querySelector('.cam-filmstrip');
    let stream = null;
    let mirrored = true;
    viewport.classList.toggle('mirrored', mirrored);

    async function startCam() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
        video.srcObject = stream;
        viewport.classList.add('on');
        toast('Câmera ligada! 📷', 'success');
      } catch (e) {
        toast('Câmera não disponível (permita o acesso no navegador)', 'error');
      }
    }
    function stopCam() {
      if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; }
      video.srcObject = null;
      viewport.classList.remove('on');
    }

    function addThumb(dataUrl, path) {
      if (root.querySelector('.cam-filmstrip-empty')) filmstrip.innerHTML = '';
      const thumb = document.createElement('div');
      thumb.className = 'cam-thumb';
      thumb.innerHTML = `<img src="${dataUrl}" alt="Foto">`;
      thumb.onclick = () => openPhotoModal(dataUrl, path);
      filmstrip.prepend(thumb);
    }

    function openPhotoModal(dataUrl, path) {
      root.querySelector('.npad-modal-ov')?.remove();
      const ov = document.createElement('div');
      ov.className = 'npad-modal-ov';
      ov.innerHTML = `
        <div class="npad-modal" style="width:420px;align-items:center;">
          <img src="${dataUrl}" style="width:100%;border-radius:8px;">
          <div class="nm-actions" style="width:100%">
            <button class="nm-btn" data-cmd="delete">Excluir</button>
            <button class="nm-btn" data-cmd="download">Baixar</button>
            <button class="nm-btn primary" data-cmd="close">Fechar</button>
          </div>
        </div>`;
      root.appendChild(ov);
      ov.addEventListener('click', (e) => { if (e.target === ov) ov.remove(); });
      ov.querySelector('[data-cmd="close"]').onclick = () => ov.remove();
      ov.querySelector('[data-cmd="download"]').onclick = () => { const a = document.createElement('a'); a.href = dataUrl; a.download = path.split('/').pop(); a.click(); };
      ov.querySelector('[data-cmd="delete"]').onclick = () => {
        VFS.delete(path); persistState();
        ov.remove();
        root.querySelectorAll('.cam-thumb').forEach((t) => { if (t.querySelector('img').src === dataUrl) t.remove(); });
        if (!filmstrip.children.length) filmstrip.innerHTML = '<div class="cam-filmstrip-empty">Suas fotos aparecem aqui</div>';
        toast('Foto excluída', 'success');
      };
    }

    function snapPhoto() {
      if (!stream) { toast('Ligue a câmera primeiro', 'error'); return; }
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (mirrored) { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/png');
      const fname = `foto_${Date.now()}.png`;
      const path = `Imagens/${fname}`;
      VFS.write(path, dataUrl);
      persistState();
      addThumb(dataUrl, path);
      toast('Foto salva em Imagens! 📸', 'success');
      viewport.classList.add('flash');
      setTimeout(() => viewport.classList.remove('flash'), 180);
    }

    root.querySelectorAll('[data-cmd]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const cmd = btn.dataset.cmd;
        if (cmd === 'snap') snapPhoto();
        else if (cmd === 'toggle') stream ? stopCam() : startCam();
        else if (cmd === 'mirror') { mirrored = !mirrored; viewport.classList.toggle('mirrored', mirrored); }
      });
    });

    // Carrega fotos já salvas na sessão/desktop (pasta Imagens do VFS)
    const imagensFolder = VFS.resolve('Imagens');
    if (imagensFolder && typeof imagensFolder === 'object') {
      Object.entries(imagensFolder).forEach(([fname, val]) => {
        if (typeof val === 'string' && val.startsWith('data:image')) addThumb(val, `Imagens/${fname}`);
      });
    }

    // Garante que a câmera desliga de verdade ao fechar a janela
    // (evita o indicador de câmera ativa do navegador ficar ligado).
    win.querySelector('[data-act="cls"]')?.addEventListener('click', stopCam);

    startCam();
  }
window.openCamera = openCamera;
})();

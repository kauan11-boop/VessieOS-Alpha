// settings.js — App de Configurações do VessieOS (redesign moderno/minimalista)
// Depende de utilitários globais do kernel: S, VFS, toast, createWin, persistState,
// ensureWallpapers, getWallCategory, WALLS, applyWall, previewWall, applyTheme,
// toggleDark, saveAIConfig, applyDesktopIconSize, applyIconImage,
// exportVessieData, importVessieData (todos expostos em main.js).
// Integração loadView: view.html + view.css com fallback inline para file://.
// Padrão: tokens {{tN}} preenchidos pelo data object; fallback usa modelo original verbatim.

(function () {
  "use strict";

  // Combinações de cor prontas (nome, cor primária, secundária, terciária).
  const THEME_PRESETS = [
    ['Win11 Blue', '#60a5fa', '#a78bfa', '#3b82f6'],
    ['Win11 Light', '#0078d4', '#005a9e', '#106ebe'],
    ['macOS Sonoma', '#0a84ff', '#bf5af2', '#5e5ce6'],
    ['macOS Graphite', '#8e8e93', '#aeaeb2', '#636366'],
    ['Ubuntu Yaru', '#e95420', '#f4a261', '#77216f'],
    ['Fedora Blue', '#3c6eb4', '#79b8ff', '#2b5797'],
    ['Pop!_OS Teal', '#48b9c7', '#5fdde5', '#1a8a98'],
    ['Linux Mint', '#87cf3e', '#b8e986', '#5a9a2a'],
    ['Dracula', '#bd93f9', '#ff79c6', '#8be9fd'],
    ['Nord', '#88c0d0', '#81a1c1', '#5e81ac'],
    ['Tokyo Night', '#7aa2f7', '#bb9af7', '#7dcfff'],
    ['Catppuccin', '#cba6f7', '#f5c2e7', '#89b4fa'],
    ['Synthwave', '#ff007c', '#00f5d4', '#fee440'],
    ['Solarized', '#268bd2', '#2aa198', '#b58900'],
    ['Gruvbox', '#fabd2f', '#fe8019', '#b8bb26'],
    ['VessieOS', '#a78bfa', '#f0abfc', '#60a5fa']
  ];

  function isImageUrl(url) {
    return /\.(gif|webp|jpe?g|png)(\?.*)?$/i.test(String(url || ''));
  }

  // Calcula um resumo aproximado de uso do VFS (arquivos, pastas, tamanho).
  function computeStorageStats() {
    let files = 0, folders = 0, bytes = 0;
    (function walk(node) {
      if (!node || typeof node !== 'object') return;
      for (const key of Object.keys(node)) {
        const val = node[key];
        if (key === '__locked') continue;
        if (val && typeof val === 'object') {
          if (val.__locked) { files += val.__fileCount || 0; continue; }
          folders++;
          walk(val);
        } else {
          files++;
          bytes += typeof val === 'string' ? val.length : 0;
        }
      }
    })(S.fs);
    // Estado salvo (papéis de parede, chat, vocabulário etc.) também ocupa
    // espaço no localStorage — soma ao total pra dar uma noção real de uso.
    try {
      const raw = localStorage.getItem('vessieos_state');
      if (raw) bytes += raw.length;
    } catch (_) { }
    return { files, folders, bytes };
  }

  function fmtBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / (1024 * 1024)).toFixed(2) + ' MB';
  }

  const CATS = [
    { id: 'personalizacao', icon: 'fa-palette', label: 'Personalização' },
    { id: 'ia', icon: 'fa-robot', label: 'IA Vessie' },
    { id: 'online', icon: 'fa-tower-broadcast', label: 'Online & Discord' },
    { id: 'sistema', icon: 'fa-sliders-h', label: 'Sistema' },
    { id: 'area', icon: 'fa-desktop', label: 'Área de Trabalho' },
    { id: 'armazenamento', icon: 'fa-hard-drive', label: 'Armazenamento' },
    { id: 'sobre', icon: 'fa-circle-info', label: 'Sobre' }
  ];

  function renderPersonalizacaoSection(data) {
    const activeTheme = (() => {
      try { return JSON.parse(localStorage.getItem('vos-theme') || 'null'); } catch (_) { return null; }
    })();
    const heroStyle = isImageUrl(data.S.wallpaper)
      ? `background-image:url('${data.S.wallpaper}')`
      : 'background:linear-gradient(135deg, rgba(255,255,255,.06), rgba(255,255,255,.02))';
    return `
    <div class="vset-section" data-cat="personalizacao">
      <div class="vset-header">
        <h2><i class="fas fa-palette"></i> Personalização</h2>
        <p>Papel de parede, cor de destaque e a aparência do seu VessieOS.</p>
      </div>

      <div class="vset-hero">
        <div class="vset-hero-media" id="vset-hero-media" style="${heroStyle}"></div>
        <div class="vset-hero-overlay"><span><i class="fas fa-image"></i> Papel de parede atual</span></div>
      </div>

      <div class="vset-card">
        <h4 class="vset-card-title">Galeria de wallpapers</h4>
        <div class="vset-chips" id="vset-wall-chips">${getWallpaperTabs().map((tab, i) => `<div class="vset-chip${i === 0 ? ' active' : ''}" onclick="renderWallPanel('${tab}')">${tab}</div>`).join('')}</div>
        <div class="vset-wall-grid" id="wall-grid"></div>
        <div class="vset-custom-url">
          <input id="custom-wall" placeholder="Cole uma URL de imagem, GIF, WebP, MP4 ou iframe..." oninput="previewWall(this.value)">
          <button class="vset-btn" onclick="applyWall(document.getElementById('custom-wall').value,null)"><i class="fas fa-check"></i> Aplicar</button>
        </div>
        <div class="wall-preview" id="wall-preview">
          <div class="wall-preview-empty">Selecione um wallpaper acima ou cole uma URL personalizada para visualizar aqui.</div>
        </div>
      </div>

      <div class="vset-card">
        <h4 class="vset-card-title">Cor de destaque</h4>
        <div class="vset-accent-grid">
          ${THEME_PRESETS.map(([n, c1, c2, c3]) => `<div class="vset-accent theme-card${activeTheme && activeTheme.name === n ? ' ac' : ''}" title="${n}" onclick="applyTheme('${n}','${c1}','${c2}','${c3}',this)">
            <div class="vset-accent-swatch" style="background:linear-gradient(135deg,${c1},${c2} 60%,${c3})"></div>
            <span>${n}</span>
          </div>`).join('')}
        </div>
      </div>
    </div>`;
  }

  function renderIaSection(data) {
    return `
    <div class="vset-section" data-cat="ia">
      <div class="vset-header">
        <h2><i class="fas fa-robot"></i> IA Vessie</h2>
        <p>Configure o provedor de inteligência artificial usado pelo sistema.</p>
      </div>
      <div class="vset-card">
        <h4 class="vset-card-title">Provedor</h4>
        <div class="vset-field-grid">
          <label class="vset-field"><span>Provedor de IA</span><input readonly value="LM Studio"></label>
          <label class="vset-field"><span>Modelo</span><input id="settings-ai-model" placeholder="Modelo LM Studio" type="text"></label>
          <label class="vset-field full"><span>Endpoint padrão</span><input id="settings-ai-endpoint" placeholder="Endpoint padrão (opcional)" type="text"></label>
          <label class="vset-field full"><span>Endpoint customizado</span><input id="settings-ai-custom-endpoint" placeholder="Endpoint customizado para provedores não licenciados" type="text"></label>
          <label class="vset-field full"><span>API Key</span><input id="settings-ai-key" placeholder="Sua API Key" type="password"></label>
        </div>
        <button onclick="saveAIConfig()" class="vset-btn ia-save-button">Salvar configuração de IA</button>
        <div class="vset-hint">Configurações de IA são gerenciadas diretamente aqui. O VessieOS usa LM Studio (local) para edição e geração.</div>
      </div>
    </div>`;
  }

  function computeRedirectUri() {
    // Funciona tanto na raiz de um domínio quanto num GitHub Pages de
    // projeto (usuario.github.io/Repo/) — não assume que o site está na
    // raiz do domínio.
    return window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1) + 'callback.html';
  }

  function getDiscordAuthStatus() {
    try {
      const token = localStorage.getItem('VessieOS_Discord_Token');
      const user = JSON.parse(localStorage.getItem('VessieOS_Discord_User') || 'null');
      return token && user ? user : null;
    } catch (_) { return null; }
  }

  function renderOnlineSection(data) {
    const savedClientId = (data.window.OnlineConfig && data.window.OnlineConfig.getEnv('DISCORD_CLIENT_ID', '')) || '';
    const connectedUser = getDiscordAuthStatus();
    const redirectUri = computeRedirectUri();
    return `
    <div class="vset-section" data-cat="online">
      <div class="vset-header">
        <h2><i class="fas fa-tower-broadcast"></i> Online & Discord</h2>
        <p>Conecte o VessieOS a uma aplicação Discord real. Sem essa configuração, o app Discord do sistema roda inteiramente local (entre abas do seu navegador).</p>
      </div>

      <div class="vset-card">
        <h4 class="vset-card-title">Sua conta Discord</h4>
        <div id="vset-discord-status" style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">
          ${connectedUser
        ? `<div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#5865F2,#a78bfa);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;">${(connectedUser.username || '?')[0].toUpperCase()}</div>
             <div><strong>${connectedUser.username}${connectedUser.discriminator && connectedUser.discriminator !== '0' ? '#' + connectedUser.discriminator : ''}</strong><br><span class="vset-hint" style="margin:0">Conectado via OAuth2</span></div>`
        : `<span class="vset-hint" style="margin:0">Nenhuma conta Discord conectada.</span>`}
        </div>
        <div class="vset-field-grid">
          <label class="vset-field full"><span>Discord Client ID</span><input id="vset-discord-clientid" placeholder="Ex: 1234567890123456789" value="${savedClientId}"></label>
        </div>
        <div class="vset-hint">Crie uma aplicação em <strong>discord.com/developers/applications</strong>, ative o fluxo OAuth2 e cole aqui o Client ID (público — não é segredo). Em "Redirects", cadastre exatamente esta URL:</div>
        <div class="vset-field-grid">
          <label class="vset-field full"><span>Redirect URI (copie para o Discord Developer Portal)</span><input readonly value="${redirectUri}" onclick="this.select()"></label>
        </div>
        <div class="vset-actions-row" style="margin-top:10px;">
          <button class="vset-btn" id="vset-discord-save">Salvar Client ID</button>
          <button class="vset-btn" id="vset-discord-connect"><i class="fab fa-discord"></i> ${connectedUser ? 'Reconectar' : 'Conectar com Discord'}</button>
          ${connectedUser ? '<button class="vset-btn vset-btn-danger" id="vset-discord-disconnect">Desconectar</button>' : ''}
        </div>
        <div class="vset-hint">Este login usa o fluxo <em>implicit</em> do OAuth2 (sem client secret), por isso funciona 100% num site estático como este, sem precisar de um servidor próprio.</div>
      </div>

      <div class="vset-card">
        <h4 class="vset-card-title">Chat do sistema (app Discord)</h4>
        <p class="vset-hint" style="margin-top:0">O app Discord do VessieOS (ícone na barra de tarefas) é um chat próprio, independente desta conta. Para espelhar as mensagens dele em um servidor Discord real, abra o app Discord → ícone de engrenagem no topo → cole a URL da <strong>sua</strong> webhook. Nunca compartilhe uma webhook — é uma credencial.</p>
      </div>
    </div>`;
  }

  function renderSistemaSection(data) {
    return `
    <div class="vset-section" data-cat="sistema">
      <div class="vset-header">
        <h2><i class="fas fa-sliders-h"></i> Sistema</h2>
        <p>Aparência, comportamento e alertas do VessieOS.</p>
      </div>

      <div class="vset-card">
        <h4 class="vset-card-title">Aparência</h4>
        <div class="vset-row">
          <div class="vset-row-text"><div class="vset-row-icon"><i class="fas fa-moon"></i></div><div class="vset-row-labels"><strong>Modo escuro</strong><span>Inverte o tema visual do sistema</span></div></div>
          <label class="vset-toggle"><input type="checkbox" ${data.S.animationsEnabled !== false ? 'checked' : ''} onchange="S.animationsEnabled=this.checked;document.documentElement.classList.toggle('vsys-reduce-motion',!this.checked);persistState();toast('Animações '+(this.checked?'ativadas':'desativadas'),'success')"><span class="vset-tsl"></span></label>
        </div>
        <div class="vset-row">
          <div class="vset-row-text"><div class="vset-row-icon"><i class="fas fa-droplet"></i></div><div class="vset-row-labels"><strong>Cor adaptativa</strong><span>Ajusta o destaque com base nas janelas abertas</span></div></div>
          <label class="vset-toggle"><input type="checkbox" ${data.S.sounds ? 'checked' : ''} onchange="S.sounds=this.checked;persistState();toast('Sons '+(this.checked?'ativados':'desativados'),'success')"><span class="vset-tsl"></span></label>
        </div>
        <div class="vset-row">
          <div class="vset-row-text"><div class="vset-row-icon"><i class="fas fa-wand-magic-sparkles"></i></div><div class="vset-row-labels"><strong>Animações</strong><span>Transições e efeitos de movimento da interface</span></div></div>
          <label class="vset-toggle"><input type="checkbox" ${data.S.animationsEnabled !== false ? 'checked' : ''} onchange="S.animationsEnabled=this.checked;document.documentElement.classList.toggle('vsys-reduce-motion',!this.checked);persistState();toast('Animações '+(this.checked?'ativadas':'desativadas'),'success')"><span class="vset-tsl"></span></label>
        </div>
      </div>

      <div class="vset-card">
        <h4 class="vset-card-title">Notificações e som</h4>
        <div class="vset-row">
          <div class="vset-row-text"><div class="vset-row-icon"><i class="fas fa-bell"></i></div><div class="vset-row-labels"><strong>Notificações</strong><span>Mostra alertas na central de notificações</span></div></div>
          <label class="vset-toggle"><input type="checkbox" ${data.S.notificationsEnabled !== false ? 'checked' : ''} onchange="S.notificationsEnabled=this.checked;persistState();toast('Notificações '+(this.checked?'ativadas':'desativadas'),'success')"><span class="vset-tsl"></span></label>
        </div>
        <div class="vset-row">
          <div class="vset-row-text"><div class="vset-row-icon"><i class="fas fa-volume-up"></i></div><div class="vset-row-labels"><strong>Sons do sistema</strong><span>Efeitos sonoros de interações e alertas</span></div></div>
          <label class="vset-toggle"><input type="checkbox" ${data.S.sounds ? 'checked' : ''} onchange="S.sounds=this.checked;persistState();toast('Sons '+(this.checked?'ativados':'desativados'),'success')"><span class="vset-tsl"></span></label>
        </div>
      </div>
    </div>`;
  }

  function renderAreaSection(data) {
    const sizes = [['small', 'Pequeno'], ['medium', 'Médio'], ['large', 'Grande']];
    return `
    <div class="vset-section" data-cat="area">
      <div class="vset-header">
        <h2><i class="fas fa-desktop"></i> Área de Trabalho</h2>
        <p>Ícones, atalhos e identidade visual da sua área de trabalho.</p>
      </div>
      <div class="vset-card">
        <h4 class="vset-card-title">Ícones</h4>
        <div class="vset-row">
          <div class="vset-row-text"><div class="vset-row-icon"><i class="fas fa-expand"></i></div><div class="vset-row-labels"><strong>Tamanho dos ícones</strong><span>Afeta a área de trabalho inteira</span></div></div>
          <div class="vset-segmented" id="vset-icon-size">
            ${sizes.map(([v, l]) => `<div class="vset-seg-btn${data.S.desktopIconSize === v ? ' active' : ''}" data-size="${v}">${l}</div>`).join('')}
          </div>
        </div>
        <div class="vset-row">
          <div class="vset-row-text"><div class="vset-row-icon"><i class="fas fa-image"></i></div><div class="vset-row-labels"><strong>Ícone personalizado</strong><span>URL de uma imagem para usar nos ícones</span></div></div>
        </div>
        <div class="vset-custom-url">
          <input id="vset-icon-url" value="${data.S.iconImageUrl || ''}" placeholder="URL de imagem...">
          <button class="vset-btn" onclick="applyIconImage(document.getElementById('vset-icon-url').value)"><i class="fas fa-check"></i> Aplicar</button>
        </div>
      </div>
    </div>`;
  }

  function renderArmazenamentoSection(data) {
    const stats = computeStorageStats();
    const CAP = 5 * 1024 * 1024; // referência de 5MB pra dar noção de uso (localStorage)
    const pct = Math.min(100, Math.max(1, (stats.bytes / CAP) * 100)).toFixed(1);
    return `
    <div class="vset-section" data-cat="armazenamento">
      <div class="vset-header">
        <h2><i class="fas fa-hard-drive"></i> Armazenamento</h2>
        <p>Uso do seu sistema de arquivos virtual e backup dos seus dados.</p>
      </div>
      <div class="vset-card">
        <h4 class="vset-card-title">Uso do disco virtual</h4>
        <div class="vset-storage-bar"><div class="vset-storage-bar-fill" id="vset-storage-fill" style="width:${pct}%"></div></div>
        <div class="vset-storage-caption" id="vset-storage-caption">${fmtBytes(stats.bytes)} usados de ~${fmtBytes(CAP)} (estimativa local)</div>
        <div class="vset-storage-stats" id="vset-storage-stats">
          <div class="vset-storage-stat"><strong>${stats.files}</strong><span>Arquivos</span></div>
          <div class="vset-storage-stat"><strong>${stats.folders}</strong><span>Pastas</span></div>
          <div class="vset-storage-stat"><strong>${fmtBytes(stats.bytes)}</strong><span>Tamanho aprox.</span></div>
        </div>
        <div class="vset-actions-row">
          <button class="vset-btn vset-btn-ghost" id="vset-storage-refresh"><i class="fas fa-rotate"></i> Atualizar</button>
        </div>
      </div>
      <div class="vset-card">
        <h4 class="vset-card-title">Backup</h4>
        <div class="vset-actions-row">
          <button class="vset-btn vset-btn-ghost" onclick="window.exportVessieData()"><i class="fas fa-file-export"></i> Exportar dados</button>
          <label class="vset-btn vset-btn-ghost vset-btn-file"><i class="fas fa-file-import"></i> Importar dados<input type="file" accept="application/json" onchange="window.importVessieData(this.files[0])"></label>
        </div>
        <div class="vset-hint">Exporta vocabulário, wallpapers salvos, papel de parede atual e tema em um arquivo .json.</div>
      </div>
      <div class="vset-card">
        <h4 class="vset-card-title">Zona de risco</h4>
        <div class="vset-actions-row">
          <button class="vset-btn vset-btn-danger" onclick="if(confirm('Isso vai apagar papel de parede, tema e preferências salvas e reiniciar o VessieOS. Seus arquivos na área de trabalho não são afetados. Continuar?')){localStorage.removeItem('vessieos_state');localStorage.removeItem('vos-theme');location.reload();}"><i class="fas fa-rotate-left"></i> Redefinir configurações</button>
        </div>
        <div class="vset-hint">Restaura papel de parede, tema, tamanho de ícone e preferências para os valores padrão.</div>
      </div>
    </div>`;
  }

  function renderSobreSection(data) {
    return `
    <div class="vset-section" data-cat="sobre">
      <div class="vset-header">
        <h2><i class="fas fa-circle-info"></i> Sobre</h2>
        <p>Informações do sistema.</p>
      </div>
      <div class="vset-about-hero">
        <div class="vset-logo-lg">⚙️</div>
        <div>
          <h3>VessieOS v3.0</h3>
          <p>Simulador Windows 11 Ultra com IA Integrada</p>
        </div>
      </div>
      <div class="vset-card">
        <h4 class="vset-card-title">Especificações</h4>
        <div class="vset-specs">
          <div class="vset-spec"><span>Usuário</span><span>${data.S.user}</span></div>
          <div class="vset-spec"><span>Build</span><span>26100.3915</span></div>
          <div class="vset-spec"><span>Data</span><span>21/05/2026</span></div>
          <div class="vset-spec"><span>Jogos no Game Hub</span><span>${(data.window.GAMES||[]).length}</span></div>
          <div class="vset-spec"><span>Faixas na Música</span><span>${(data.window.TRACKS||[]).length}</span></div>
          <div class="vset-spec"><span>Wallpapers</span><span>${ensureWallpapers(data.S.wallpapers || WALLS).length}</span></div>
        </div>
      </div>
      <div class="vset-card">
        <button onclick="location.reload()" class="vset-btn vset-btn-danger"><i class="fas fa-power-off"></i> Reiniciar Sistema</button>
      </div>
    </div>`;
  }

  function renderCatsNav(cats) {
    return (cats || []).map((c, i) => `<div class="vset-nav-item${i === 0 ? ' active' : ""}" data-cat="${c.id}"><i class="fas ${c.icon}"></i><span>${c.label}</span></div>`).join('');
  }

  // --- Função fallback que gera o HTML completo usando os dados do parâmetro ---
  // Esta função é idêntica ao retorno original de openSettings() quando o fetch falha
  // (ex.: file://). Ela usa os valores do objeto `data` em vez de leituras globais S/localStorage
  // diretos, permitindo que o loadView funcione tanto no caminho remoto quanto no file://.
  function settingsFallback(data) {
    return buildSettingsParts(data).html;
  }

  // Monta as partes do HTML (nav + seções + página completa). openSettings usa
  // catsHtml/sectionsHtml para preencher os tokens {{CATS_HTML}} e
  // {{SECTIONS_HTML}} do view.html quando o VessieBridge carrega o arquivo
  // remoto — sem isso os tokens apareciam literalmente na tela.
  function buildSettingsParts(data) {
    // Extrai os valores necessários do objeto data para uso no HTML
    const S = data.S || {};
    const CATS = data.CATS || [];
    const connectedUser = data.connectedUser || {};
    const activeTheme = data.activeTheme || {};
    const pct = data.pct;
    const wallpaper = S.wallpaper || '';
    const iconImageUrl = S.iconImageUrl || '';
    const desktopIconSize = S.desktopIconSize || 'medium';
    const notificationsEnabled = S.notificationsEnabled;
    const sounds = S.sounds;
    const animationsEnabled = S.animationsEnabled;

    // Helper: renderPersonalizacaoSection usando dados do data object
    function renderPersonalizacaoSectionFromData() {
      const activeTheme = (() => {
        try { return JSON.parse(localStorage.getItem('vos-theme') || 'null'); } catch (_) { return null; }
      })();
      const heroStyle = isImageUrl(wallpaper)
        ? `background-image:url('${wallpaper}')`
        : 'background:linear-gradient(135deg, rgba(255,255,255,.06), rgba(255,255,255,.02))';
      return `
      <div class="vset-section" data-cat="personalizacao">
        <div class="vset-header">
          <h2><i class="fas fa-palette"></i> Personalização</h2>
          <p>Papel de parede, cor de destaque e a aparência do seu VessieOS.</p>
        </div>

        <div class="vset-hero">
          <div class="vset-hero-media" id="vset-hero-media" style="${heroStyle}"></div>
          <div class="vset-hero-overlay"><span><i class="fas fa-image"></i> Papel de parede atual</span></div>
        </div>

        <div class="vset-card">
          <h4 class="vset-card-title">Galeria de wallpapers</h4>
          <div class="vset-chips" id="vset-wall-chips">${getWallpaperTabs().map((tab, i) => `<div class="vset-chip${i === 0 ? ' active' : ''}" onclick="renderWallPanel('${tab}')">${tab}</div>`).join('')}</div>
          <div class="vset-wall-grid" id="wall-grid"></div>
          <div class="vset-custom-url">
            <input id="custom-wall" placeholder="Cole uma URL de imagem, GIF, WebP, MP4 ou iframe..." oninput="previewWall(this.value)">
            <button class="vset-btn" onclick="applyWall(document.getElementById('custom-wall').value,null)"><i class="fas fa-check"></i> Aplicar</button>
          </div>
          <div class="wall-preview" id="wall-preview">
            <div class="wall-preview-empty">Selecione um wallpaper acima ou cole uma URL personalizada para visualizar aqui.</div>
          </div>
        </div>

        <div class="vset-card">
          <h4 class="vset-card-title">Cor de destaque</h4>
          <div class="vset-accent-grid">
            ${THEME_PRESETS.map(([n, c1, c2, c3]) => `<div class="vset-accent theme-card${activeTheme && activeTheme.name === n ? ' ac' : ""}" title="${n}" onclick="applyTheme('${n}','${c1}','${c2}','${c3}',this)">
              <div class="vset-accent-swatch" style="background:linear-gradient(135deg,${c1},${c2} 60%,${c3})"></div>
              <span>${n}</span>
            </div>`).join('')}
          </div>
        </div>
      </div>`;
    }

    // --- Corpo idêntico ao openSettings original, usando data.values ---

    const SECTIONS_HTML = `
    ${renderPersonalizacaoSectionFromData()}
    ${renderIaSection(data)}
    ${renderOnlineSection(data)}
    ${renderSistemaSection(data)}
    ${renderAreaSection(data)}
    ${renderArmazenamentoSection(data)}
    ${renderSobreSection(data)}
  `;

    // Gera o HTML da janela completo (idêntico ao retorno original de openSettings)
    const catsHtml = renderCatsNav(CATS);
    const winHTML = `
    <div class="vset">
      <div class="vset-nav">
        <div class="vset-nav-head">
          <div class="vset-logo">⚙️</div>
          <div class="vset-nav-head-text"><strong>Configurações</strong><span>VessieOS</span></div>
        </div>
        <div class="vset-search"><i class="fas fa-magnifying-glass"></i><input class="vset-search-input" placeholder="Localizar uma configuração"></div>
        <div class="vset-nav-list">
          ${catsHtml}
        </div>
      </div>
      <div class="vset-content">
        ${SECTIONS_HTML}
      </div>
    </div>`;

    return { catsHtml, sectionsHtml: SECTIONS_HTML, html: winHTML };
  }

  function openSettings() {
    // Cria o objeto data com todos os valores pre-computados necessários pelo template
    const data = {
      S: {
        wallpaper: S.wallpaper,
        user: S.user,
        animationsEnabled: S.animationsEnabled,
        notificationsEnabled: S.notificationsEnabled,
        sounds: S.sounds,
        iconImageUrl: S.iconImageUrl,
        desktopIconSize: S.desktopIconSize,
      },
      CATS: CATS,
      connectedUser: (() => {
        try {
          const token = localStorage.getItem('VessieOS_Discord_Token');
          const user = JSON.parse(localStorage.getItem('VessieOS_Discord_User') || 'null');
          return token && user ? user : null;
        } catch (_) { return null; }
      })(),
      activeTheme: (() => {
        try { return JSON.parse(localStorage.getItem('vos-theme') || 'null'); } catch (_) { return null; }
      })(),
      pct: (() => {
        const stats = computeStorageStats();
        const CAP = 5 * 1024 * 1024;
        return Math.min(100, Math.max(1, (stats.bytes / CAP) * 100)).toFixed(1);
      })(),
      window: window,
    };

    // Tenta carregar view.html/view.css via VessieBridge.loadView
    // Tokens {{CATS_HTML}} e {{SECTIONS_HTML}} preenchidos do parts abaixo.
    // Se falha (file://): usa o fallback inline settingsFallback(data) acima.
    const parts = buildSettingsParts(data);
    data.CATS_HTML = parts.catsHtml;
    data.SECTIONS_HTML = parts.sectionsHtml;
    if (window.VessieBridge && typeof window.VessieBridge.loadView === 'function') {
      window.VessieBridge.loadView('settings', { html: parts.html }, data).then(({ html }) => {
        // Substitui o conteúdo da janela pelo HTML retornado (com tokens preenchidos)
        const win = createWin('Configurações', '⚙️', '<div class="app-loading">Carregando…</div>', 760, 600);
        if (document.body.contains(win)) win.querySelector('.wb').innerHTML = html;
        // Re-attach event listeners after content load
        setupSettingsEventListeners(win, data);
      });
    } else {
      // Fallback direto: file:// ou ambiente sem VessieBridge
      const win = createWin('Configurações', '⚙️', settingsFallback(data), 760, 600);
      setupSettingsEventListeners(win, data);
    }
    return; // openSettings não retorna win quando usa bridge (o bridge gerencia o ciclo)
  }

  // Configura todos os event listeners após o HTML ser carregado (seja via bridge ou fallback)
  function setupSettingsEventListeners(win, data) {
    // ---- Navegação por categorias ----
    win.querySelectorAll('.vset-nav-item').forEach((item) => {
      item.addEventListener('click', () => {
        win.querySelectorAll('.vset-nav-item').forEach((i) => i.classList.remove('active'));
        win.querySelectorAll('.vset-section').forEach((s) => s.classList.remove('active'));
        item.classList.add('active');
        win.querySelector(`.vset-section[data-cat="${item.dataset.cat}"]`)?.classList.add('active');
      });
    });

    // ---- Busca ----
    win.querySelector('.vset-search-input').addEventListener('input', (e) => {
      const term = e.target.value.trim().toLowerCase();
      win.querySelectorAll('.vset-nav-item').forEach((item) => {
        item.style.display = !term || item.textContent.toLowerCase().includes(term) ? 'flex' : 'none';
      });
    });

    // ---- Tamanho de ícones ----
    win.querySelectorAll('#vset-icon-size .vset-seg-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        win.querySelectorAll('#vset-icon-size .vset-seg-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        applyDesktopIconSize(btn.dataset.size);
      });
    });

    // ---- Online & Discord ----
    function bindOnlineSectionEvents() {
      win.querySelector('#vset-discord-save')?.addEventListener('click', () => {
        const id = (win.querySelector('#vset-discord-clientid')?.value || '').trim();
        if (!data.window.OnlineConfig) { toast('systems/online/config.js não carregou', 'error'); return; }
        data.window.OnlineConfig.setEnv('DISCORD_CLIENT_ID', id);
        toast(id ? '✅ Client ID salvo' : 'Client ID removido', 'success');
      });

      win.querySelector('#vset-discord-connect')?.addEventListener('click', () => {
        const id = (win.querySelector('#vset-discord-clientid')?.value || '').trim() ||
          (data.window.OnlineConfig && data.window.OnlineConfig.getEnv('DISCORD_CLIENT_ID', ''));
        if (!id) { toast('⚠️ Preencha e salve o Discord Client ID antes de conectar.', 'error'); return; }
        if (!data.window.AuthenticationSystem) { toast('systems/online/auth.js não carregou', 'error'); return; }

        data.window.OnlineConfig.setEnv('DISCORD_CLIENT_ID', id);
        const auth = new data.window.AuthenticationSystem({
          discordClientId: id,
          discordRedirectUri: computeRedirectUri()
        });
        const popup = window.open(auth.getDiscordLoginUrl(), 'vessieos-discord-auth', 'width=480,height=640');
        if (!popup) { toast('⚠️ Seu navegador bloqueou o popup. Permita popups para este site e tente de novo.', 'error'); return; }

        const onMsg = (event) => {
          if (event.origin !== window.location.origin || !event.data || event.data.type !== 'vessieos-discord-auth') return;
          window.removeEventListener('message', onMsg);
          toast(event.data.ok ? '✅ Discord conectado!' : '❌ Falha ao conectar com o Discord', event.data.ok ? 'success' : 'error');
          rerenderOnlineSection();
        };
        window.addEventListener('message', onMsg);
      });

      win.querySelector('#vset-discord-disconnect')?.addEventListener('click', () => {
        if (data.window.AuthenticationSystem) new data.window.AuthenticationSystem().logout('discord');
        else { localStorage.removeItem('VessieOS_Discord_Token'); localStorage.removeItem('VessieOS_Discord_User'); }
        toast('Desconectado do Discord', 'success');
        rerenderOnlineSection();
      });
    }

    function rerenderOnlineSection() {
      const section = win.querySelector('.vset-section[data-cat="online"]');
      if (!section) return;
      const wasActive = section.classList.contains('active');
      section.outerHTML = renderOnlineSection(data);
      const fresh = win.querySelector('.vset-section[data-cat="online"]');
      if (fresh && wasActive) fresh.classList.add('active');
      bindOnlineSectionEvents();
    }

    bindOnlineSectionEvents();

    // ---- Wallpaper e AI ----
    setTimeout(() => {
      renderWallPanel('Todos');
      previewWall(data.S.wallpaper);
      updateAIInputs();
    }, 50);

    // ---- Toggle tema removido: VessieOS agora é somente escuro ----

    // ---- Refresh storage ----
    const refreshStorage = () => {
      const stats = computeStorageStats();
      const CAP = 5 * 1024 * 1024;
      const pct = Math.min(100, Math.max(1, (stats.bytes / CAP) * 100)).toFixed(1);
      const fill = win.querySelector('#vset-storage-fill');
      const caption = win.querySelector('#vset-storage-caption');
      const statsBox = win.querySelector('#vset-storage-stats');
      if (fill) fill.style.width = pct + '%';
      if (caption) caption.textContent = `${fmtBytes(stats.bytes)} usados de ~${fmtBytes(CAP)} (estimativa local)`;
      if (statsBox) statsBox.innerHTML = `
        <div class="vset-storage-stat"><strong>${stats.files}</strong><span>Arquivos</span></div>
        <div class="vset-storage-stat"><strong>${stats.folders}</strong><span>Pastas</span></div>
        <div class="vset-storage-stat"><strong>${fmtBytes(stats.bytes)}</strong><span>Tamanho aprox.</span></div>`;
    };
    win.querySelector('#vset-storage-refresh')?.addEventListener('click', () => { refreshStorage(); toast('Uso de armazenamento atualizado', 'success'); });

    // ---- Atualiza inputs AI ----
    function updateAIInputs() {
      const modelInput = win.querySelector('#settings-ai-model');
      const endpointInput = win.querySelector('#settings-ai-endpoint');
      const customEndpointInput = win.querySelector('#settings-ai-custom-endpoint');
      const keyInput = win.querySelector('#settings-ai-key');
      if (modelInput) modelInput.value = data.S.aiModel || '';
      if (endpointInput) endpointInput.value = data.S.aiEndpoint || '';
      if (customEndpointInput) customEndpointInput.value = data.S.aiCustomEndpoint || '';
      if (keyInput) keyInput.value = data.S.aiKey || '';
    }
  }

  // Função para renderizar painel de wallpaper por categoria
  function renderWallPanel(cat) {
    const walls = ensureWallpapers(S.wallpapers || WALLS);
    const filtered = walls.filter(w => getWallCategory(w) === cat);
    if (!filtered.length) {
      toast(`Nenhum wallpaper encontrado na categoria "${cat}"`, 'info');
      return;
    }
    // Gera HTML dos cards de wallpaper para a categoria selecionada
    const cards = filtered.map((w, i) => `
      <div class="wall-card" onclick="applyWall('${w.url || w.id}', '${w.category || 'unknown'}')">
        <div class="wall-preview" style="background:url('${w.url || w.placeholder}') center/cover"></div>
        <div class="wall-name">${w.name}</div>
      </div>
    `).join('');
    // Abre janela de preview ou aplica diretamente
    const win = createWin('Wallpaper - ' + cat, '<i class="fas fa-image"></i>', `
      <div style="padding:20px; text-align:center;">
        <h3>Categoria: ${cat}</h3>
        <div style="display:flex;flex-wrap:wrap;gap:16px;justify-content:center;">
          ${cards}
        </div>
        <button style="margin-top:16px;padding:8px 16px;background:#7c3aed;color:#fff;border:none;border-radius:6px;cursor:pointer;">Aplicar Todos</button>
      </div>
    `, 600, 400);
    win.querySelector('button').onclick = () => {
      filtered.forEach(w => applyWall(w.url || w.id, w.category || 'unknown'));
      win.close();
    };
  }

  // Expondo funções para o global (compatibilidade com onclick no view.html)
  window.openSettings = openSettings;

  // getWallpaperTabs/renderWallPanel precisam existir em window: os botões de
  // categoria de wallpaper chamam renderWallPanel(...) via onclick inline no
  // HTML, que executa em escopo global — sem isso, os "chips" do topo do
  // grid de papéis de parede pareciam clicáveis mas nunca respondiam.
  window.getWallpaperTabs = () => {
    const all = ensureWallpapers(S.wallpapers || WALLS).map(w => getWallCategory(w)).filter((v, i, a) => v && a.indexOf(v) === i);
    const base = ['Todos', 'Natureza', 'Tech', 'Futurista'];
    const others = all.filter(cat => !base.includes(cat));
    return [...base, ...others];
  };
  window.renderWallPanel = renderWallPanel;
})();
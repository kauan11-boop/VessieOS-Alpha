// discord.js — extraído de JS/core/main.js (VessieOS)
// Depende de utilitários globais do kernel: S, VFS, toast, createWin, persistState, etc. (expostos em main.js)
(function () {
  "use strict";

  // ---- FALLBACK HTML PARA O APP DISCORD ----
  function discordFallback() {
    return `
<div id="discrod-root" style="display:flex;flex-direction:column;height:100%;background:#313338;overflow:hidden;">
  <!-- TELA DE LOGIN -->
  <div id="drd-login-panel" style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:16px;padding:20px;background:#313338;">
    <div style="font-size:3rem;background:#5865F2;width:80px;height:80px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;">💬</div>
    <h2 style="color:#fff;margin:0;font-weight:700;">Discord</h2>
    <p style="color:#b5bac1;margin:0;text-align:center;font-size:.9rem;">Digite seu nome e senha para entrar</p>
    <input id="drd-login-user" placeholder="Usuário" style="width:80%;padding:12px 16px;border-radius:8px;border:1px solid #1e1f22;background:#1e1f22;color:#fff;font-size:.95rem;outline:none;transition:.15s;">
    <input id="drd-login-pass" type="password" placeholder="Senha" style="width:80%;padding:12px 16px;border-radius:8px;border:1px solid #1e1f22;background:#1e1f22;color:#fff;font-size:.95rem;outline:none;transition:.15s;">
    <button id="drd-login-btn" style="width:80%;padding:12px;border-radius:8px;border:none;background:#5865F2;color:#fff;font-weight:600;font-size:1rem;cursor:pointer;transition:.15s;">Entrar</button>
    <div id="drd-login-error" style="color:#f87171;font-size:.85rem;min-height:24px;"></div>
  </div>

  <!-- TELA DO DISCORD -->
  <div id="drd-chat-panel" style="display:none;flex-direction:column;height:100%;background:#313338;">
    <div style="display:flex;height:100%;">
      <!-- SERVER SIDEBAR -->
      <div id="drd-server-sidebar" style="width:72px;background:#1e1f22;display:flex;flex-direction:column;align-items:center;padding:12px 0;gap:8px;overflow-y:auto;flex-shrink:0;border-right:1px solid #2b2d31;">
        <div id="drd-server-list" style="display:flex;flex-direction:column;gap:8px;width:100%;align-items:center;"></div>
        <button id="drd-add-server-btn" style="width:48px;height:48px;border-radius:50%;background:#2b2d31;border:none;color:#3ba55c;font-size:1.8rem;cursor:pointer;transition:.15s;display:flex;align-items:center;justify-content:center;margin-top:4px;">+</button>
      </div>

      <!-- CHAT PRINCIPAL -->
      <div style="flex:1;display:flex;flex-direction:column;min-width:0;">
        <!-- TOPO -->
        <div id="drd-server-header" style="display:flex;align-items:center;padding:8px 16px;background:#2b2d31;border-bottom:1px solid #1e1f22;flex-shrink:0;gap:12px;height:48px;">
          <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0;">
            <span id="drd-server-name" style="font-weight:700;color:#fff;font-size:1rem;white-space:nowrap;">Servidor</span>
            <span id="drd-server-member-count" style="color:#b5bac1;font-size:.75rem;"></span>
          </div>
          <div style="display:flex;gap:6px;align-items:center;">
            <button id="drd-friends-toggle" style="background:transparent;border:none;color:#b5bac1;padding:4px 8px;border-radius:4px;font-size:.8rem;cursor:pointer;transition:.15s;"><i class="fas fa-user-friends"></i> Amigos</button>
            <button id="drd-reload-btn" style="background:transparent;border:none;color:#b5bac1;padding:4px 8px;border-radius:4px;font-size:.8rem;cursor:pointer;transition:.15s;" title="Recarregar servidores"><i class="fas fa-server"></i></button>
            <button id="drd-sync-btn" style="background:transparent;border:none;color:#b5bac1;padding:4px 8px;border-radius:4px;font-size:.8rem;cursor:pointer;transition:.15s;"><i class="fas fa-sync-alt"></i></button>
            <button id="drd-settings-btn" title="Conectar com um servidor Discord real" style="background:transparent;border:none;color:#b5bac1;padding:4px 8px;border-radius:4px;font-size:.8rem;cursor:pointer;transition:.15s;"><i class="fas fa-gear"></i></button>
            <span id="drd-online-badge" title="Sem ponte com Discord real configurada" style="display:flex;align-items:center;gap:4px;font-size:.7rem;color:#b5bac1;padding:2px 8px;border-radius:10px;background:#1e1f22;"><span style="width:6px;height:6px;border-radius:50%;background:#80848e;display:inline-block;"></span>Local</span>
            <button id="drd-logout-btn" style="background:transparent;border:none;color:#b5bac1;padding:4px 8px;border-radius:4px;font-size:.8rem;cursor:pointer;transition:.15s;">Sair</button>
          </div>
        </div>

        <!-- CORPO -->
        <div style="display:flex;flex:1;min-height:0;">
          <!-- CANAIS -->
          <div id="drd-channel-sidebar" style="width:220px;background:#2b2d31;padding:8px 6px;overflow-y:auto;flex-shrink:0;border-right:1px solid #1e1f22;">
            <div style="color:#b5bac1;font-size:.7rem;text-transform:uppercase;font-weight:600;padding:4px 8px;letter-spacing:.04em;">Canais de texto</div>
            <div id="drd-channel-list"></div>
          </div>

          <!-- CHAT -->
          <div style="flex:1;display:flex;flex-direction:column;background:#313338;min-width:0;">
            <div id="drd-msg-list" style="flex:1;overflow-y:auto;padding:12px 16px;display:flex;flex-direction:column;gap:4px;background:#313338;"></div>
            <div style="padding:8px 16px 12px;background:#313338;border-top:1px solid #2b2d31;flex-shrink:0;">
              <div style="display:flex;align-items:center;gap:6px;background:#383a40;border-radius:8px;padding:4px 8px;">
                <button id="drd-sticker-btn" style="background:transparent;border:none;color:#b5bac1;font-size:1.2rem;cursor:pointer;padding:4px;">😊</button>
                <label for="drd-file-input" style="background:transparent;border:none;color:#b5bac1;font-size:1.2rem;cursor:pointer;padding:4px;"><i class="fas fa-paperclip"></i></label>
                <input type="file" id="drd-file-input" accept="image/*" style="display:none;">
                <input id="drd-msg-input" placeholder="Mensagem" style="flex:1;background:transparent;border:none;color:#dbdee1;outline:none;font-size:.95rem;padding:8px 4px;">
                <button id="drd-send-btn" style="background:#5865F2;border:none;color:#fff;border-radius:6px;padding:6px 14px;font-size:.9rem;cursor:pointer;transition:.15s;font-weight:600;">Enviar</button>
              </div>
            </div>

            <!-- MEMBROS -->
            <div id="drd-members-sidebar" style="width:200px;background:#2b2d31;padding:12px 8px;overflow-y:auto;flex-shrink:0;border-left:1px solid #1e1f22;display:block;">
              <div style="color:#b5bac1;font-size:.7rem;text-transform:uppercase;font-weight:600;padding:4px 8px;letter-spacing:.04em;">Membros — <span id="drd-member-count">0</span></div>
              <div id="drd-member-list"></div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- PAINEL DE AMIGOS -->
    <div id="drd-friends-panel" style="display:none;position:absolute;right:12px;top:56px;width:280px;max-height:400px;background:#2b2d31;border:1px solid #1e1f22;border-radius:12px;padding:12px;overflow-y:auto;z-index:20;box-shadow:0 8px 24px rgba(0,0,0,.5);"></div>

    <!-- PAINEL DE CONEXÃO ONLINE (webhook do Discord real, opcional) -->
    <div id="drd-settings-panel" style="display:none;position:absolute;right:12px;top:56px;width:320px;background:#2b2d31;border:1px solid #1e1f22;border-radius:12px;padding:14px;z-index:30;box-shadow:0 8px 24px rgba(0,0,0,.5);">
      <div style="color:#fff;font-weight:700;margin-bottom:6px;font-size:.95rem;"><i class="fas fa-tower-broadcast" style="color:#5865F2;"></i> Conectar a um servidor Discord real</div>
      <p style="color:#b5bac1;font-size:.78rem;line-height:1.4;margin:0 0 10px;">Este chat funciona sozinho, sem servidor (localStorage + sincronização entre abas). Para que as mensagens também apareçam no <strong>seu</strong> servidor Discord, cole abaixo a URL de uma webhook criada por você (Configurações do canal → Integrações → Webhooks → Nova Webhook). Nunca compartilhe essa URL — quem a tiver pode postar no seu servidor.</p>
      <input id="drd-webhook-input" placeholder="https://discord.com/api/webhooks/..." style="width:100%;box-sizing:border-box;padding:9px 10px;border-radius:8px;border:1px solid #1e1f22;background:#1e1f22;color:#fff;font-size:.8rem;margin-bottom:8px;">
      <div style="display:flex;gap:8px;">
        <button id="drd-webhook-save" style="flex:1;padding:8px;border-radius:8px;border:none;background:#5865F2;color:#fff;font-weight:600;font-size:.82rem;cursor:pointer;">Salvar</button>
        <button id="drd-webhook-test" style="flex:1;padding:8px;border-radius:8px;border:1px solid #3f4147;background:transparent;color:#dbdee1;font-weight:600;font-size:.82rem;cursor:pointer;">Testar</button>
        <button id="drd-webhook-clear" title="Desconectar" style="padding:8px 10px;border-radius:8px;border:1px solid #3f4147;background:transparent;color:#f87171;font-weight:600;font-size:.82rem;cursor:pointer;"><i class="fas fa-trash"></i></button>
      </div>
      <div id="drd-webhook-status" style="margin-top:8px;font-size:.75rem;color:#b5bac1;"></div>
    </div>
  </div>
`;
  }

  function openDiscrod() {
    const win = createWin('Discord', '<i class="fab fa-discord" style="color:#5865F2"></i>', '<div class="app-loading">Carregando…</div>', 980, 700);
    const wire = () => wireDiscord(win);
    if (window.VessieBridge && typeof window.VessieBridge.loadView === 'function') {
      // Shell sem interpolações: view.html é byte a byte o modelo original.
      window.VessieBridge.loadView('discord', { html: discordFallback() }, {}).then(({ html }) => {
        if (!document.body.contains(win)) return;
        win.querySelector('.wb').innerHTML = html;
        wire();
      });
    } else {
      win.querySelector('.wb').innerHTML = discordFallback();
      wire();
    }
    return win;
  }

  function wireDiscord(win) {
    setupDiscrod(win);
    return win;
  }

  function setupDiscrod(win) {
    // ---- CONSTANTES E ESTADO ----
    const LS_WEBHOOK = 'discrod_webhook';
    const LS_USERS = 'discrod_users';
    const LS_SESSION = 'discrod_session';
    const LS_SERVERS = 'discrod_servers';
    const LS_FRIENDS = 'vessieos_steam_friends';
    const LS_MESSAGES_PREFIX = 'discrod_messages_';
    const GLOBAL_SERVER_NAME = '🌍 Server Global';
    const DEBOUNCE_DELAY = 100; // 0.1s exato

    // SEGURANÇA: nunca deixe uma URL de webhook real fixa no código-fonte.
    // Uma webhook do Discord é uma credencial — qualquer pessoa que abra o
    // VessieOS (ou o código-fonte publicado) consegue postar/fazer spam no
    // servidor dono daquela webhook. Por padrão o app roda 100% local
    // (localStorage + BroadcastChannel entre abas); a ponte real com um
    // servidor Discord só é ativada se o próprio usuário colar a SUA webhook
    // em Configurações (botão de engrenagem no topo do app).
    const state = {
      webhookUrl: localStorage.getItem(LS_WEBHOOK) || '',
      currentUser: null,
      users: JSON.parse(localStorage.getItem(LS_USERS) || '{}'),
      sessionId: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      servers: JSON.parse(localStorage.getItem(LS_SERVERS) || '[]'),
      currentServerId: null,
      currentChannelId: null,
      friendsPanelOpen: false,
      contextMenu: null,
      syncDebounce: null,
      lastRenderedMsgs: '[]',
      lastRenderedServers: '',
      lastRenderedMembers: '',
      bc: null
    };

    // ---- BROADCAST CHANNEL (Multi-usuário instantâneo e oculto) ----
    try {
      state.bc = new BroadcastChannel('discrod_ultra_sync_channel');
      state.bc.onmessage = (event) => {
        if (event.data && event.data.type === 'sync') {
          quickSync('broadcast_sync');
        }
      };
    } catch (e) { console.warn('BroadcastChannel não suportado.'); }

    // Sincronização via Storage (Multi-janela)
    window.addEventListener('storage', (e) => {
      if (e.key === LS_SERVERS || e.key === LS_MESSAGES_PREFIX + state.currentServerId + '_' + state.currentChannelId || e.key === LS_FRIENDS) {
        quickSync('storage_event');
      }
    });

    // ---- PERSISTÊNCIA ----
    function saveUsers() { localStorage.setItem(LS_USERS, JSON.stringify(state.users)); }
    function saveServers() {
      localStorage.setItem(LS_SERVERS, JSON.stringify(state.servers));
      try { state.bc.postMessage({ type: 'sync' }); } catch (e) { }
    }
    function getMessagesKey(s, c) { return `${LS_MESSAGES_PREFIX}${s}_${c}`; }

    function loadMessages(s, c) {
      try { return JSON.parse(localStorage.getItem(getMessagesKey(s, c)) || '[]'); } catch { return []; }
    }
    function saveMessages(s, c, msgs) {
      localStorage.setItem(getMessagesKey(s, c), JSON.stringify(msgs));
      try { state.bc.postMessage({ type: 'sync' }); } catch (e) { }
    }

    function getCurrentMessages() {
      return state.currentServerId && state.currentChannelId ? loadMessages(state.currentServerId, state.currentChannelId) : [];
    }
    function setCurrentMessages(msgs) {
      if (state.currentServerId && state.currentChannelId) saveMessages(state.currentServerId, state.currentChannelId, msgs);
    }

    // ---- AMIGOS ----
    function loadFriendsData() { try { return JSON.parse(localStorage.getItem(LS_FRIENDS) || '{}'); } catch { return {}; } }
    function saveFriendsData(data) { localStorage.setItem(LS_FRIENDS, JSON.stringify(data)); }
    function setUserGame(username, game) {
      const all = loadFriendsData();
      if (!all[username]) all[username] = { friends: [], requests: [], game: null };
      all[username].game = game;
      saveFriendsData(all);
    }

    // ---- SERVIDORES ----
    function getServer(id) {
      state.servers = JSON.parse(localStorage.getItem(LS_SERVERS) || '[]');
      return state.servers.find(s => s.id === id);
    }

    function createServer(name, owner, password = null) {
      state.servers = JSON.parse(localStorage.getItem(LS_SERVERS) || '[]');
      const existing = state.servers.find(s => s.name.toLowerCase() === name.trim().toLowerCase());
      if (existing) return null;
      const server = {
        id: 'srv_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        name: name.trim(),
        owner: owner,
        channels: [{ id: 'general', name: 'geral', type: 'text' }],
        members: [owner],
        createdAt: Date.now(),
        isGlobal: false,
        password: password
      };
      state.servers.push(server);
      saveServers();
      return server;
    }

    function joinServer(serverId, username) {
      const server = getServer(serverId);
      if (!server) return null;
      if (!server.members.includes(username)) {
        server.members.push(username);
        saveServers();
      }
      return server;
    }

    // ---- SENHA (hash, nunca texto puro) ----
    async function hashPassword(pass) {
      try {
        const data = new TextEncoder().encode(pass);
        const digest = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
      } catch (e) {
        // Fallback extremamente improvável (navegador sem SubtleCrypto/contexto não seguro):
        // ainda assim não guarda texto puro.
        let h = 0;
        for (let i = 0; i < pass.length; i++) { h = (Math.imul(31, h) + pass.charCodeAt(i)) | 0; }
        return 'fnv_' + (h >>> 0).toString(16);
      }
    }
    const looksHashed = (v) => typeof v === 'string' && (/^[a-f0-9]{64}$/.test(v) || v.startsWith('fnv_'));

    // ---- STATUS DE CONEXÃO (badge Local / Online) ----
    function updateOnlineBadge() {
      const badge = win.querySelector('#drd-online-badge');
      if (!badge) return;
      const connected = !!state.webhookUrl;
      badge.title = connected ? 'Mensagens também são espelhadas no seu servidor Discord' : 'Sem ponte com Discord real configurada';
      badge.innerHTML = `<span style="width:6px;height:6px;border-radius:50%;background:${connected ? '#3ba55c' : '#80848e'};display:inline-block;"></span>${connected ? 'Online (Discord)' : 'Local'}`;
    }

    // ---- WEBHOOK ----
    async function sendToWebhook(content, file = null) {
      if (!state.webhookUrl) return false;
      try {
        let finalContent = content;
        let body, headers = {};
        if (file) {
          const fd = new FormData();
          fd.append('payload_json', JSON.stringify({ content: finalContent }));
          fd.append('file', file, file.name);
          body = fd;
        } else {
          body = JSON.stringify({ content: finalContent });
          headers['Content-Type'] = 'application/json';
        }
        const res = await fetch(state.webhookUrl, { method: 'POST', body, headers });
        if (!res.ok) {
          toast(`⚠️ Falha ao enviar para o Discord (HTTP ${res.status}). A mensagem ficou salva localmente.`, 'error');
        }
        // Auto-sync oculto após webhook para garantir que a interface atualize
        quickSync('webhook_success');
        return res.ok;
      } catch (err) {
        toast('⚠️ Não foi possível alcançar a webhook do Discord. A mensagem ficou salva localmente.', 'error');
        quickSync('webhook_fail');
        return false;
      }
    }

    // ---- SINCronização OCULTA (DEBOUNCE 0.1s) ----
    function quickSync(source = 'unknown') {
      if (state.syncDebounce) clearTimeout(state.syncDebounce);
      state.syncDebounce = setTimeout(() => {
        state.servers = JSON.parse(localStorage.getItem(LS_SERVERS) || '[]');
        renderAllSilent();
        state.syncDebounce = null;
      }, DEBOUNCE_DELAY);
    }

    // ---- RENDERIZAÇÃO SILENCIA (SMART UPDATE, SEM FLICKER) ----
    function renderAllSilent() {
      renderServers();
      renderChannels();
      renderMessages();
      renderMembers();
      renderFriendsPanel();

      const server = getServer(state.currentServerId);
      const serverNameEl = win.querySelector('#drd-server-name');
      if (serverNameEl) serverNameEl.textContent = server ? server.name : 'Nenhum servidor';

      const serverMembersEl = win.querySelector('#drd-server-member-count');
      if (serverMembersEl && server) serverMembersEl.textContent = `(${server.members.length} membros)`;
    }

    function renderServers() {
      const container = win.querySelector('#drd-server-list');
      if (!container) return;

      // Garantia de Server Global
      let global = state.servers.find(s => s.isGlobal === true);
      if (!global) {
        global = {
          id: 'srv_global_' + Date.now().toString(36),
          name: GLOBAL_SERVER_NAME,
          owner: 'system',
          channels: [{ id: 'general', name: 'geral', type: 'text' }],
          members: state.currentUser ? [state.currentUser] : [],
          createdAt: Date.now(),
          isGlobal: true,
          password: null
        };
        state.servers.push(global);
        saveServers();
      } else if (state.currentUser && !global.members.includes(state.currentUser)) {
        global.members.push(state.currentUser);
        saveServers();
      }

      const dataHash = JSON.stringify(state.servers.map(s => ({ id: s.id, name: s.name, members: s.members.length })));
      if (dataHash === state.lastRenderedServers) return; // Não recarrega se não mudou
      state.lastRenderedServers = dataHash;

      container.innerHTML = '';
      state.servers.forEach(s => {
        const isActive = s.id === state.currentServerId;
        const div = document.createElement('div');
        div.style.cssText = `
        width:48px; height:48px; border-radius:50%;
        background:${isActive ? 'linear-gradient(135deg,#5865F2,#4752C4)' : '#2b2d31'};
        color:#fff; display:flex; align-items:center; justify-content:center;
        font-weight:700; font-size:1.1rem; cursor:pointer; transition:.2s;
        border:${isActive ? '2px solid #fff' : '2px solid transparent'};
        position:relative;
      `;
        div.textContent = s.name[0].toUpperCase();
        div.title = s.name;
        div.onclick = () => {
          if (s.password && s.password !== '') {
            const pass = prompt(`🔒 Senha do servidor "${s.name}":`);
            if (pass !== s.password) { toast('❌ Senha incorreta!', 'error'); return; }
          }
          state.currentServerId = s.id;
          state.currentChannelId = s.channels[0].id;
          state.lastRenderedMsgs = '[]'; // Força reload das msgs
          renderAllSilent();
          quickSync('clickServer');
        };
        container.appendChild(div);
      });
    }

    function renderChannels() {
      const container = win.querySelector('#drd-channel-list');
      if (!container) return;
      const server = getServer(state.currentServerId);
      if (!server) { container.innerHTML = ''; return; }

      const dataHash = JSON.stringify(server.channels);
      if (dataHash === container.dataset.hash) return;
      container.dataset.hash = dataHash;

      container.innerHTML = '';
      server.channels.forEach(c => {
        const isActive = c.id === state.currentChannelId;
        const div = document.createElement('div');
        div.style.cssText = `
        display:flex; align-items:center; gap:8px;
        padding:6px 10px; border-radius:6px;
        color:${isActive ? '#fff' : '#b5bac1'};
        background:${isActive ? '#383a40' : 'transparent'};
        cursor:pointer; font-size:.9rem; margin-bottom:2px;
      `;
        div.innerHTML = `<i class="fas fa-hashtag" style="font-size:.7rem;"></i> ${c.name}`;
        div.onclick = () => {
          state.currentChannelId = c.id;
          state.lastRenderedMsgs = '[]';
          renderAllSilent();
          quickSync('clickChannel');
        };
        container.appendChild(div);
      });
    }

    function renderMessages() {
      const list = win.querySelector('#drd-msg-list');
      if (!list) return;
      const msgs = getCurrentMessages();
      const dataHash = JSON.stringify(msgs);

      if (dataHash === state.lastRenderedMsgs) return;
      state.lastRenderedMsgs = dataHash;

      list.innerHTML = '';
      if (!msgs.length) {
        const empty = document.createElement('div');
        empty.style.cssText = 'color:#b5bac1;font-size:.9rem;text-align:center;padding:60px 0;';
        empty.textContent = '🚀 Nenhuma mensagem ainda. Seja o primeiro!';
        list.appendChild(empty);
        return;
      }

      msgs.forEach(msg => {
        const div = document.createElement('div');
        const isMine = msg.username === state.currentUser;
        div.style.cssText = `display:flex; gap:10px; padding:4px 0; ${isMine ? 'flex-direction:row-reverse;' : ''}`;

        const avatar = document.createElement('div');
        avatar.style.cssText = `width:36px; height:36px; border-radius:50%; background:${isMine ? 'linear-gradient(135deg,#5865F2,#4752C4)' : 'linear-gradient(135deg,#3ba55c,#2d8f4e)'}; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:.9rem; flex-shrink:0;`;
        avatar.textContent = msg.username[0].toUpperCase();

        const contentDiv = document.createElement('div');
        contentDiv.style.cssText = `flex:1; min-width:0; ${isMine ? 'text-align:right;' : ''}`;

        const nameTime = document.createElement('div');
        nameTime.style.cssText = 'display:flex; gap:8px; align-items:baseline; font-size:.8rem; margin-bottom:2px;';
        if (isMine) nameTime.style.flexDirection = 'row-reverse';

        const nameSpan = document.createElement('span');
        nameSpan.style.cssText = `font-weight:600; color:${isMine ? '#5865F2' : '#c084fc'};`;
        nameSpan.textContent = msg.username;

        const timeSpan = document.createElement('span');
        timeSpan.style.cssText = 'color:#b5bac1; font-size:.65rem;';
        timeSpan.textContent = new Date(msg.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

        nameTime.appendChild(nameSpan);
        nameTime.appendChild(timeSpan);

        const bodySpan = document.createElement('div');
        bodySpan.style.cssText = `color:#dbdee1; font-size:.9rem; word-wrap:break-word; line-height:1.4; background:rgba(255,255,255,.04); padding:6px 10px; border-radius:8px; display:inline-block;`;

        if (msg.type === 'image') {
          bodySpan.innerHTML = `<img src="${msg.content}" style="max-width:250px;max-height:200px;border-radius:8px;">`;
        } else if (msg.type === 'sticker') {
          bodySpan.style.fontSize = '2.4rem';
          bodySpan.style.background = 'transparent';
          bodySpan.textContent = msg.content;
        } else {
          bodySpan.textContent = msg.content;
        }

        contentDiv.appendChild(nameTime);
        contentDiv.appendChild(bodySpan);
        div.appendChild(avatar);
        div.appendChild(contentDiv);
        list.appendChild(div);
      });
      list.scrollTop = list.scrollHeight;
    }

    function renderMembers() {
      const container = win.querySelector('#drd-member-list');
      const countEl = win.querySelector('#drd-member-count');
      if (!container) return;
      const server = getServer(state.currentServerId);
      if (!server) { container.innerHTML = ''; if (countEl) countEl.textContent = '0'; return; }

      const members = server.members || [];
      const dataHash = JSON.stringify(members);
      if (dataHash === state.lastRenderedMembers) return;
      state.lastRenderedMembers = dataHash;

      if (countEl) countEl.textContent = members.length;
      container.innerHTML = '';
      members.forEach(m => {
        const div = document.createElement('div');
        div.style.cssText = `display:flex; align-items:center; gap:8px; padding:4px 8px; border-radius:6px; color:#dbdee1; font-size:.82rem;`;
        div.innerHTML = `<span style="width:8px;height:8px;border-radius:50%;background:#3ba55c;display:inline-block;"></span> ${m} ${m === state.currentUser ? '👤' : ''}`;
        container.appendChild(div);
      });
    }

    function renderFriendsPanel() {
      const container = win.querySelector('#drd-friends-panel');
      if (!container || !state.friendsPanelOpen) return;
      const me = state.currentUser;
      if (!me) { container.innerHTML = ''; return; }
      const all = loadFriendsData();
      const myData = all[me] || { friends: [], requests: [], game: null };
      const friends = myData.friends || [];

      let html = '<div style="color:#fff;font-weight:600;margin-bottom:8px;font-size:.9rem;">Amigos</div>';
      if (friends.length === 0) {
        html += '<div style="color:#b5bac1;font-size:.8rem;text-align:center;">Nenhum amigo ainda.</div>';
      } else {
        friends.forEach(f => {
          html += `<div style="display:flex;align-items:center;gap:8px;padding:4px 0;border-bottom:1px solid #1e1f22;">
          <div style="width:28px;height:28px;border-radius:50%;background:#5865F2;display:flex;align-items:center;justify-content:center;color:#fff;font-size:.8rem;">${f[0].toUpperCase()}</div>
          <span style="color:#dbdee1;font-size:.85rem;">${f}</span>
        </div>`;
        });
      }
      container.innerHTML = html;
    }

    // ---- ENVIO DE MENSAGEM ----
    async function sendMessage() {
      const input = win.querySelector('#drd-msg-input');
      const text = input.value.trim();
      if (!text) return;

      const msgObj = { username: state.currentUser, content: text, timestamp: Date.now(), type: 'text' };
      const msgs = getCurrentMessages();
      msgs.push(msgObj);
      setCurrentMessages(msgs);
      renderMessages(); // Render imediato
      await sendToWebhook(`[${state.currentUser}] ${text}`);
      input.value = '';
      quickSync('sendMessage');
    }

    // ---- COMANDOS {P} e {J} ----
    function parseCommand(text) {
      const createMatch = text.match(/^\{P\}\s*(.+?)(?:\s+senha\s*(.+))?$/i);
      if (createMatch) {
        const name = createMatch[1].trim();
        const password = createMatch[2] ? createMatch[2].trim() : null;
        const server = createServer(name, state.currentUser, password);
        if (server) {
          state.currentServerId = server.id;
          state.currentChannelId = server.channels[0].id;
          sendToWebhook(`[SISTEMA] ${state.currentUser} criou o servidor "${name}"`);
          quickSync('createServer');
          toast(`✅ Servidor "${name}" criado!`, 'success');
        } else {
          toast(`⚠️ Servidor "${name}" já existe.`, 'error');
        }
        return true;
      }

      const joinMatch = text.match(/^\{J\}\s*(.+?)(?:\s+senha\s*(.+))?$/i);
      if (joinMatch) {
        const name = joinMatch[1].trim();
        const password = joinMatch[2] ? joinMatch[2].trim() : null;
        state.servers = JSON.parse(localStorage.getItem(LS_SERVERS) || '[]');
        const server = state.servers.find(s => s.name.toLowerCase() === name.toLowerCase());
        if (!server) {
          toast(`❌ Servidor "${name}" não encontrado.`, 'error');
          return true;
        }
        if (server.password && server.password !== password) {
          toast('❌ Senha incorreta!', 'error');
          return true;
        }
        joinServer(server.id, state.currentUser);
        state.currentServerId = server.id;
        state.currentChannelId = server.channels[0].id;
        sendToWebhook(`[SISTEMA] ${state.currentUser} entrou no servidor "${name}"`);
        quickSync('joinServer');
        toast(`✅ Entrou no servidor "${name}"!`, 'success');
        return true;
      }
      return false;
    }

    // ---- CONFIGURA EVENTOS ----
    function setupEvents() {
      const loginBtn = win.querySelector('#drd-login-btn');
      if (loginBtn) {
        loginBtn.onclick = async () => {
          const user = win.querySelector('#drd-login-user').value.trim();
          const pass = win.querySelector('#drd-login-pass').value.trim();
          const errEl = win.querySelector('#drd-login-error');
          if (!user || !pass) { errEl.textContent = 'Preencha tudo'; return; }

          const existing = state.users[user];
          if (existing) {
            const stored = existing.password;
            let ok;
            if (looksHashed(stored)) {
              ok = (await hashPassword(pass)) === stored;
            } else {
              // Conta antiga, criada antes do hashing: aceita se a senha em
              // texto puro bater, e imediatamente re-salva como hash.
              ok = stored === pass;
              if (ok) { existing.password = await hashPassword(pass); saveUsers(); }
            }
            if (!ok) { errEl.textContent = '❌ Senha incorreta!'; return; }
          } else {
            state.users[user] = { password: await hashPassword(pass) };
            saveUsers();
          }

          state.currentUser = user;
          localStorage.setItem(LS_SESSION, JSON.stringify({ username: user, sessionId: state.sessionId }));
          sendToWebhook(`[SISTEMA] ${user} entrou no Discord`);

          win.querySelector('#drd-login-panel').style.display = 'none';
          win.querySelector('#drd-chat-panel').style.display = 'flex';

          // Auto-seleciona Global
          state.servers = JSON.parse(localStorage.getItem(LS_SERVERS) || '[]');
          const global = state.servers.find(s => s.isGlobal) || state.servers[0];
          if (global) {
            state.currentServerId = global.id;
            state.currentChannelId = global.channels[0].id;
          }

          renderAllSilent();
          quickSync('login');
        };
      }

      const logoutBtn = win.querySelector('#drd-logout-btn');
      if (logoutBtn) {
        logoutBtn.onclick = () => {
          state.currentUser = null;
          localStorage.removeItem(LS_SESSION);
          win.querySelector('#drd-login-panel').style.display = 'flex';
          win.querySelector('#drd-chat-panel').style.display = 'none';
        };
      }

      const sendBtn = win.querySelector('#drd-send-btn');
      const msgInput = win.querySelector('#drd-msg-input');
      if (sendBtn) sendBtn.onclick = sendMessage;
      if (msgInput) msgInput.onkeydown = (e) => { if (e.key === 'Enter') sendMessage(); };

      const stickerBtn = win.querySelector('#drd-sticker-btn');
      const picker = win.querySelector('#drd-sticker-picker');
      if (stickerBtn && picker) {
        const stickers = ['😊', '😂', '❤️', '🔥', '🎉', '💜', '✨', '🥺', '🤡', '👀', '🚀', '🌈', '🍕', '🎮', '💀', '😎'];
        picker.innerHTML = '';
        stickers.forEach(s => {
          const span = document.createElement('span');
          span.textContent = s;
          span.style.cssText = 'font-size:1.8rem;cursor:pointer;padding:4px;border-radius:6px;';
          span.onclick = () => {
            const msgObj = { username: state.currentUser, content: s, timestamp: Date.now(), type: 'sticker' };
            const msgs = getCurrentMessages();
            msgs.push(msgObj);
            setCurrentMessages(msgs);
            renderMessages();
            picker.style.display = 'none';
            quickSync('sticker');
          };
          picker.appendChild(span);
        });
        stickerBtn.onclick = (e) => { e.stopPropagation(); picker.style.display = picker.style.display === 'flex' ? 'none' : 'flex'; };
      }

      const fileInput = win.querySelector('#drd-file-input');
      if (fileInput) {
        fileInput.onchange = async function (e) {
          const file = this.files[0];
          if (!file) return;
          const reader = new FileReader();
          reader.onload = async (ev) => {
            const msgObj = { username: state.currentUser, content: ev.target.result, timestamp: Date.now(), type: 'image' };
            const msgs = getCurrentMessages();
            msgs.push(msgObj);
            setCurrentMessages(msgs);
            renderMessages();
            await sendToWebhook(`[${state.currentUser}] enviou uma imagem`, file);
            quickSync('image');
          };
          reader.readAsDataURL(file);
          this.value = '';
        };
      }

      const addServerBtn = win.querySelector('#drd-add-server-btn');
      if (addServerBtn) {
        addServerBtn.onclick = () => {
          const name = prompt('Nome do novo servidor:');
          if (!name || !name.trim()) return;
          const password = prompt('Senha (opcional):');
          const server = createServer(name.trim(), state.currentUser, password ? password.trim() : null);
          if (server) {
            state.currentServerId = server.id;
            state.currentChannelId = server.channels[0].id;
            sendToWebhook(`[SISTEMA] ${state.currentUser} criou o servidor "${name.trim()}"`);
            quickSync('addServer');
          } else {
            toast('⚠️ Servidor já existe!', 'error');
          }
        };
      }

      const friendsToggle = win.querySelector('#drd-friends-toggle');
      if (friendsToggle) {
        friendsToggle.onclick = () => {
          state.friendsPanelOpen = !state.friendsPanelOpen;
          const panel = win.querySelector('#drd-friends-panel');
          if (panel) panel.style.display = state.friendsPanelOpen ? 'block' : 'none';
          if (state.friendsPanelOpen) renderFriendsPanel();
        };
      }

      const syncBtn = win.querySelector('#drd-sync-btn');
      if (syncBtn) syncBtn.onclick = () => quickSync('manualSync');

      // ---- PAINEL DE CONEXÃO ONLINE ----
      const settingsBtn = win.querySelector('#drd-settings-btn');
      const settingsPanel = win.querySelector('#drd-settings-panel');
      const webhookInput = win.querySelector('#drd-webhook-input');
      const webhookStatus = win.querySelector('#drd-webhook-status');
      if (webhookInput) webhookInput.value = state.webhookUrl;
      updateOnlineBadge();

      if (settingsBtn && settingsPanel) {
        settingsBtn.onclick = (e) => {
          e.stopPropagation();
          const willOpen = settingsPanel.style.display !== 'block';
          settingsPanel.style.display = willOpen ? 'block' : 'none';
          const friendsPanel = win.querySelector('#drd-friends-panel');
          if (willOpen && friendsPanel) friendsPanel.style.display = 'none';
        };
      }

      const isValidWebhook = (url) => /^https:\/\/(discord|discordapp)\.com\/api\/webhooks\/\d+\/.+$/.test(url.trim());

      win.querySelector('#drd-webhook-save')?.addEventListener('click', () => {
        const url = (webhookInput?.value || '').trim();
        if (url && !isValidWebhook(url)) {
          webhookStatus.textContent = '⚠️ Isso não parece uma URL de webhook válida do Discord.';
          webhookStatus.style.color = '#f87171';
          return;
        }
        state.webhookUrl = url;
        localStorage.setItem(LS_WEBHOOK, url);
        updateOnlineBadge();
        webhookStatus.textContent = url ? '✅ Webhook salva. Suas mensagens agora são espelhadas no Discord.' : 'Webhook removida — voltando ao modo local.';
        webhookStatus.style.color = url ? '#3ba55c' : '#b5bac1';
        toast(url ? '🌐 VessieOS Discord agora está online!' : 'Modo local restaurado', 'success');
      });

      win.querySelector('#drd-webhook-test')?.addEventListener('click', async () => {
        const url = (webhookInput?.value || '').trim();
        if (!url || !isValidWebhook(url)) {
          webhookStatus.textContent = '⚠️ Cole uma URL de webhook válida antes de testar.';
          webhookStatus.style.color = '#f87171';
          return;
        }
        webhookStatus.textContent = 'Enviando mensagem de teste...';
        webhookStatus.style.color = '#b5bac1';
        try {
          const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: '✅ VessieOS conectado a este servidor com sucesso!' })
          });
          webhookStatus.textContent = res.ok ? '✅ Teste enviado! Confira o canal no Discord.' : `❌ Discord respondeu HTTP ${res.status}.`;
          webhookStatus.style.color = res.ok ? '#3ba55c' : '#f87171';
        } catch (e) {
          webhookStatus.textContent = '❌ Não foi possível alcançar essa URL.';
          webhookStatus.style.color = '#f87171';
        }
      });

      win.querySelector('#drd-webhook-clear')?.addEventListener('click', () => {
        state.webhookUrl = '';
        localStorage.removeItem(LS_WEBHOOK);
        if (webhookInput) webhookInput.value = '';
        updateOnlineBadge();
        webhookStatus.textContent = 'Desconectado. Voltando ao modo local.';
        webhookStatus.style.color = '#b5bac1';
      });

      win.addEventListener('click', () => { if (settingsPanel) settingsPanel.style.display = 'none'; });

      // ---- CLIQUE OCULTO GLOBAL (0.1s) ----
      win.addEventListener('click', () => {
        quickSync('globalClick');
      }, true);

      // ---- AUTO LOGIN ----
      try {
        const session = JSON.parse(localStorage.getItem(LS_SESSION) || 'null');
        if (session && state.users[session.username]) {
          state.currentUser = session.username;
          win.querySelector('#drd-login-panel').style.display = 'none';
          win.querySelector('#drd-chat-panel').style.display = 'flex';

          state.servers = JSON.parse(localStorage.getItem(LS_SERVERS) || '[]');
          const global = state.servers.find(s => s.isGlobal) || state.servers[0];
          if (global) {
            state.currentServerId = global.id;
            state.currentChannelId = global.channels[0].id;
          }
          renderAllSilent();
          quickSync('autoLogin');
        }
      } catch (e) { }
    }

    setupEvents();
  }
  window.openDiscrod = openDiscrod;
})();
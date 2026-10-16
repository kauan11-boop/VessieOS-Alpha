/**
 * Categoria: GAMEHUB (15 sistemas)
 * Recursos ligados à experiência de jogos: o fundo Three.js (que já é
 * gerenciado pelo GraphicsHub, aqui só vira um "sistema" ligável),
 * overlay de FPS, detecção de controle, capturas de tela, conquistas, etc.
 */
export default function buildGameHubSystems({ helpers }) {
    const { storageGet, storageSet, toast, createWidget } = helpers;
    const systems = [];

    // --- Fundo Three.js do Game Hub (liga/desliga o GameHubRenderer globalmente) ---
    systems.push({
        id: 'gamehub.three-ambient-background', category: 'gamehub', name: 'Fundo 3D do Game Hub',
        description: 'Ativa o fundo animado em Three.js (partículas + núcleo reativo) atrás da biblioteca de jogos.',
        enabledByDefault: true,
        enable() { document.documentElement.classList.remove('vsys-gamehub-3d-disabled'); },
        disable() {
            document.documentElement.classList.add('vsys-gamehub-3d-disabled');
            window.unmountGameHubThree?.();
        }
    });

    // --- Overlay de FPS durante os jogos ---
    systems.push((function fpsOverlay() {
        let raf = null, el = null, last = performance.now(), frames = 0;
        return {
            id: 'gamehub.fps-overlay', category: 'gamehub', name: 'Overlay de FPS',
            description: 'Mostra um contador de quadros por segundo no canto da tela enquanto joga.',
            enabledByDefault: false,
            enable() {
                el = document.createElement('div');
                el.className = 'vsys-fps-overlay';
                document.body.appendChild(el);
                const tick = () => {
                    frames++;
                    const now = performance.now();
                    if (now - last >= 1000) { el.textContent = `${frames} FPS`; frames = 0; last = now; }
                    raf = requestAnimationFrame(tick);
                };
                tick();
            },
            disable() { if (raf) cancelAnimationFrame(raf); el?.remove(); }
        };
    })());

    // --- Detecção de controle (Gamepad API) ---
    systems.push((function gamepadDetection() {
        let onConnect = null, onDisconnect = null;
        return {
            id: 'gamehub.gamepad-detection', category: 'gamehub', name: 'Detecção de Controle',
            description: 'Avisa quando um controle de videogame é conectado ou desconectado (Gamepad API).',
            enabledByDefault: true,
            enable() {
                onConnect = (e) => toast(`Controle conectado: ${e.gamepad.id}`, 'success');
                onDisconnect = (e) => toast('Controle desconectado', 'info');
                window.addEventListener('gamepadconnected', onConnect);
                window.addEventListener('gamepaddisconnected', onDisconnect);
            },
            disable() {
                window.removeEventListener('gamepadconnected', onConnect);
                window.removeEventListener('gamepaddisconnected', onDisconnect);
            }
        };
    })());

    // --- Captura de tela do desktop (Screen Capture API) ---
    systems.push({
        id: 'gamehub.screenshot-capture', category: 'gamehub', name: 'Captura de Tela',
        description: 'Disponibiliza window.__vsysScreenshot() para capturar a tela via getDisplayMedia e baixar como PNG.',
        enabledByDefault: false,
        enable() {
            window.__vsysScreenshot = async () => {
                if (!navigator.mediaDevices?.getDisplayMedia) return toast('Captura de tela não suportada neste navegador.', 'error');
                try {
                    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
                    const track = stream.getVideoTracks()[0];
                    const capture = new ImageCapture(track);
                    const bitmap = await capture.grabFrame();
                    const canvas = document.createElement('canvas');
                    canvas.width = bitmap.width; canvas.height = bitmap.height;
                    canvas.getContext('2d').drawImage(bitmap, 0, 0);
                    track.stop();
                    const a = document.createElement('a');
                    a.href = canvas.toDataURL('image/png'); a.download = `vessieos-screenshot-${Date.now()}.png`; a.click();
                } catch (e) { toast('Captura cancelada ou não permitida.', 'warning'); }
            };
        },
        disable() { delete window.__vsysScreenshot; }
    });

    // --- Toasts de conquista ---
    systems.push({
        id: 'gamehub.achievement-toasts', category: 'gamehub', name: 'Notificações de Conquista',
        description: 'Mostra um toast especial quando um jogo é jogado pela primeira vez ou atinge marcos de sessões.',
        enabledByDefault: true,
        enable() {
            window.__vsysCheckAchievement = (game) => {
                if (game.plays === 1) toast(`🏆 Primeira sessão de ${game.name}!`, 'success');
                if (game.plays === 10) toast(`🏆 10 sessões em ${game.name}!`, 'success');
            };
        },
        disable() { delete window.__vsysCheckAchievement; }
    });

    // --- Backup/exportação da biblioteca de jogos ---
    systems.push({
        id: 'gamehub.library-backup-export', category: 'gamehub', name: 'Backup da Biblioteca',
        description: 'Disponibiliza window.__vsysExportGameLibrary() para exportar a biblioteca do Game Hub como .json.',
        enabledByDefault: false,
        enable() {
            window.__vsysExportGameLibrary = () => {
                const lib = storageGet('_raw_steam_lib', null) || JSON.parse(localStorage.getItem('vessieos_steam_lib_v2') || '[]');
                const blob = new Blob([JSON.stringify(lib, null, 2)], { type: 'application/json' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob); a.download = 'vessieos-game-library.json'; a.click();
            };
        },
        disable() { delete window.__vsysExportGameLibrary; }
    });

    // --- Sincronização de "jogados recentemente" entre abas ---
    systems.push((function recentlyPlayedSync() {
        let channel = null;
        return {
            id: 'gamehub.recently-played-sync', category: 'gamehub', name: 'Sincronizar Jogados Recentemente',
            description: 'Mantém a lista de jogos recentes sincronizada entre abas abertas do VessieOS (BroadcastChannel).',
            enabledByDefault: true,
            enable() {
                if (!window.BroadcastChannel) return;
                channel = new BroadcastChannel('vsys-gamehub');
                channel.onmessage = (e) => { if (e.data?.type === 'game-played') storageSet('last-played-remote', e.data.game); };
            },
            disable() { channel?.close(); }
        };
    })());

    // --- Lista de favoritos ---
    systems.push({
        id: 'gamehub.favorites-list', category: 'gamehub', name: 'Jogos Favoritos',
        description: 'Permite marcar jogos como favoritos (window.__vsysToggleFavorite) e listá-los separadamente.',
        enabledByDefault: true,
        enable() {
            window.__vsysToggleFavorite = (gameId) => {
                const favs = storageGet('favorite-games', []);
                const i = favs.indexOf(gameId);
                if (i >= 0) favs.splice(i, 1); else favs.push(gameId);
                storageSet('favorite-games', favs);
                return favs.includes(gameId);
            };
        },
        disable() { delete window.__vsysToggleFavorite; }
    });

    // --- Silenciar todos os jogos de uma vez ---
    systems.push({
        id: 'gamehub.mute-all-games', category: 'gamehub', name: 'Silenciar Todos os Jogos',
        description: 'Disponibiliza window.__vsysMuteAllGames() para tentar silenciar o áudio de todos os iframes de jogos abertos.',
        enabledByDefault: false,
        enable() {
            window.__vsysMuteAllGames = (muted = true) => {
                document.querySelectorAll('iframe').forEach(f => {
                    try { f.contentWindow?.postMessage({ type: 'vsys-mute', muted }, '*'); } catch (e) { /* cross-origin */ }
                });
            };
        },
        disable() { delete window.__vsysMuteAllGames; }
    });

    // --- Tela cheia rápida para jogos ---
    systems.push({
        id: 'gamehub.quick-fullscreen-toggle', category: 'gamehub', name: 'Tela Cheia Rápida',
        description: 'Atalho F11 para colocar a janela do jogo em foco em tela cheia (Fullscreen API).',
        enabledByDefault: true,
        enable() {
            this._handler = (e) => {
                if (e.key === 'F11') {
                    e.preventDefault();
                    const win = document.querySelector('.window.active');
                    if (!document.fullscreenElement) win?.requestFullscreen?.().catch(() => { });
                    else document.exitFullscreen?.();
                }
            };
            window.addEventListener('keydown', this._handler);
        },
        disable() { window.removeEventListener('keydown', this._handler); }
    });

    // --- Recomendação simples baseada em gênero jogado ---
    systems.push({
        id: 'gamehub.recommendation-hook', category: 'gamehub', name: 'Recomendação de Jogos',
        description: 'Sugere jogos da biblioteca que ainda não foram jogados, priorizando os adicionados há mais tempo.',
        enabledByDefault: false,
        enable() {
            window.__vsysRecommendGame = (library = []) => {
                const unplayed = library.filter(g => !g.plays);
                return unplayed.sort((a, b) => a.added - b.added)[0] || null;
            };
        },
        disable() { delete window.__vsysRecommendGame; }
    });

    // --- Cloud save stub (versiona saves em localStorage com timestamp) ---
    systems.push({
        id: 'gamehub.cloud-save-stub', category: 'gamehub', name: 'Save na Nuvem (local)',
        description: 'Guarda um snapshot versionado do progresso de jogos suportados diretamente no navegador.',
        enabledByDefault: false,
        enable() {
            window.__vsysCloudSave = (gameId, data) => {
                const saves = storageGet('cloud-saves', {});
                saves[gameId] = { data, savedAt: Date.now() };
                storageSet('cloud-saves', saves);
            };
            window.__vsysCloudLoad = (gameId) => storageGet('cloud-saves', {})[gameId] || null;
        },
        disable() { delete window.__vsysCloudSave; delete window.__vsysCloudLoad; }
    });

    // --- Filtro de jogos por tag/gênero ---
    systems.push({
        id: 'gamehub.genre-tag-filter', category: 'gamehub', name: 'Filtro por Gênero',
        description: 'Permite atribuir e filtrar jogos por gênero/tag na biblioteca.',
        enabledByDefault: false,
        enable() {
            window.__vsysSetGameTag = (gameId, tag) => { const tags = storageGet('game-tags', {}); tags[gameId] = tag; storageSet('game-tags', tags); };
            window.__vsysFilterByTag = (library, tag) => library.filter(g => storageGet('game-tags', {})[g.id] === tag);
        },
        disable() { delete window.__vsysSetGameTag; delete window.__vsysFilterByTag; }
    });

    // --- Presença "jogando agora" (para uso futuro com integrações de chat) ---
    systems.push({
        id: 'gamehub.now-playing-presence', category: 'gamehub', name: 'Presença "Jogando Agora"',
        description: 'Mantém em memória qual jogo está em foco no momento, para exibir status em outros apps.',
        enabledByDefault: true,
        enable() {
            window.__vsysSetPresence = (gameName) => { window.__vsysCurrentGame = gameName; document.title = gameName ? `${gameName} · VessieOS` : 'VessieOS'; };
        },
        disable() { delete window.__vsysSetPresence; window.__vsysCurrentGame = null; document.title = 'VessieOS'; }
    });

    // --- Status estilo "rich presence" (guardado localmente; pronto para integrações futuras) ---
    systems.push({
        id: 'gamehub.rich-presence-stub', category: 'gamehub', name: 'Status Detalhado de Jogo',
        description: 'Guarda um status estruturado ("Jogando X há 12min") atualizado periodicamente, pronto para futuras integrações externas.',
        enabledByDefault: false,
        enable() {
            this._interval = setInterval(() => {
                const game = window.__vsysCurrentGame;
                if (!game) return;
                const startedAt = storageGet('presence-started-at', Date.now());
                storageSet('presence-started-at', startedAt);
                const minutes = Math.floor((Date.now() - startedAt) / 60000);
                storageSet('rich-presence', { game, minutes });
            }, 15000);
        },
        disable() { clearInterval(this._interval); }
    });

    return systems;
}

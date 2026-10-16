/**
 * Categoria: NETWORK (15 sistemas)
 * Conectividade real usando APIs do navegador: online/offline,
 * Network Information API, BroadcastChannel para sync entre abas, fila
 * de requisições offline, etc.
 */
export default function buildNetworkSystems({ helpers }) {
    const { storageGet, storageSet, toast } = helpers;
    const systems = [];

    // --- Banner de status online/offline ---
    systems.push((function onlineBanner() {
        let onOnline = null, onOffline = null, banner = null;
        return {
            id: 'network.online-offline-banner', category: 'network', name: 'Aviso de Conexão',
            description: 'Mostra um banner discreto quando a conexão com a internet cai ou volta.',
            enabledByDefault: true,
            enable() {
                onOffline = () => { toast('Você está offline.', 'warning'); document.documentElement.classList.add('vsys-offline'); };
                onOnline = () => { toast('Conexão restabelecida.', 'success'); document.documentElement.classList.remove('vsys-offline'); };
                window.addEventListener('offline', onOffline);
                window.addEventListener('online', onOnline);
            },
            disable() {
                window.removeEventListener('offline', onOffline);
                window.removeEventListener('online', onOnline);
                document.documentElement.classList.remove('vsys-offline');
            }
        };
    })());

    // --- Teste de velocidade simples ---
    systems.push({
        id: 'network.speed-test', category: 'network', name: 'Teste de Velocidade',
        description: 'Disponibiliza window.__vsysSpeedTest() que mede o tempo para baixar um recurso pequeno conhecido.',
        enabledByDefault: false,
        enable() {
            window.__vsysSpeedTest = async () => {
                const start = performance.now();
                try {
                    await fetch('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css', { cache: 'no-store' });
                    const ms = performance.now() - start;
                    storageSet('last-speed-test-ms', ms);
                    return ms;
                } catch (e) { return null; }
            };
        },
        disable() { delete window.__vsysSpeedTest; }
    });

    // --- Monitor de latência (ping periódico) ---
    systems.push((function latencyMonitor() {
        let interval = null;
        return {
            id: 'network.latency-monitor', category: 'network', name: 'Monitor de Latência',
            description: 'Mede a latência de rede periodicamente e guarda a média das últimas medições.',
            enabledByDefault: false,
            enable() {
                interval = setInterval(async () => {
                    const start = performance.now();
                    try {
                        await fetch(location.href, { method: 'HEAD', cache: 'no-store' });
                        const ms = performance.now() - start;
                        const history = storageGet('latency-history', []);
                        history.push(ms); storageSet('latency-history', history.slice(-20));
                    } catch (e) { /* offline */ }
                }, 30000);
            },
            disable() { clearInterval(interval); }
        };
    })());

    // --- Sincronização multi-aba via BroadcastChannel ---
    systems.push((function multiTabSync() {
        let channel = null;
        return {
            id: 'network.multi-tab-sync', category: 'network', name: 'Sincronização Entre Abas',
            description: 'Mantém preferências e notificações sincronizadas entre abas abertas do VessieOS.',
            enabledByDefault: true,
            enable() {
                if (!window.BroadcastChannel) return;
                channel = new BroadcastChannel('vsys-sync');
                window.__vsysBroadcast = (type, data) => channel.postMessage({ type, data, at: Date.now() });
                channel.onmessage = (e) => document.dispatchEvent(new CustomEvent('vessieos:tab-sync', { detail: e.data }));
            },
            disable() { channel?.close(); delete window.__vsysBroadcast; }
        };
    })());

    // --- Fila de requisições offline (reenvia quando a conexão volta) ---
    systems.push((function offlineQueue() {
        let onOnline = null;
        return {
            id: 'network.offline-request-queue', category: 'network', name: 'Fila de Requisições Offline',
            description: 'Guarda requisições que falharam por falta de conexão e as reenvia automaticamente quando a rede volta.',
            enabledByDefault: false,
            enable() {
                window.__vsysQueueRequest = (url, options) => {
                    const queue = storageGet('offline-request-queue', []);
                    queue.push({ url, options, queuedAt: Date.now() });
                    storageSet('offline-request-queue', queue);
                };
                onOnline = () => {
                    const queue = storageGet('offline-request-queue', []);
                    queue.forEach(item => fetch(item.url, item.options).catch(() => { }));
                    storageSet('offline-request-queue', []);
                };
                window.addEventListener('online', onOnline);
            },
            disable() { window.removeEventListener('online', onOnline); delete window.__vsysQueueRequest; }
        };
    })());

    // --- Uso de dados estimado ---
    systems.push({
        id: 'network.data-usage-stats', category: 'network', name: 'Estatísticas de Uso de Dados',
        description: 'Estima o volume de dados transferido via Resource Timing API.',
        enabledByDefault: false,
        enable() {
            window.__vsysDataUsage = () => {
                const entries = performance.getEntriesByType('resource');
                const totalBytes = entries.reduce((sum, e) => sum + (e.transferSize || 0), 0);
                return totalBytes;
            };
        },
        disable() { delete window.__vsysDataUsage; }
    });

    // --- Detector de portal cativo (heurística) ---
    systems.push({
        id: 'network.captive-portal-detector', category: 'network', name: 'Detector de Portal Cativo',
        description: 'Verifica se a rede está redirecionando requisições (típico de Wi-Fi público com login).',
        enabledByDefault: false,
        enable() {
            window.__vsysCheckCaptivePortal = async () => {
                try {
                    const res = await fetch('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css', { mode: 'no-cors', cache: 'no-store' });
                    return false; // se chegou aqui sem erro, provavelmente ok
                } catch (e) { return true; }
            };
        },
        disable() { delete window.__vsysCheckCaptivePortal; }
    });

    // --- Prefetch de DNS para domínios usados com frequência ---
    systems.push({
        id: 'network.dns-prefetch-hints', category: 'network', name: 'Pré-resolução de DNS',
        description: 'Adiciona hints <link rel="dns-prefetch"> para domínios externos usados com frequência pelo sistema.',
        enabledByDefault: true,
        enable() {
            ['https://cdnjs.cloudflare.com', 'https://cdn.jsdelivr.net'].forEach(domain => {
                const link = document.createElement('link');
                link.rel = 'dns-prefetch'; link.href = domain;
                document.head.appendChild(link);
            });
        },
        disable() { }
    });

    // --- Gerenciador de download com progresso ---
    systems.push({
        id: 'network.download-progress-tracker', category: 'network', name: 'Progresso de Download',
        description: 'Disponibiliza window.__vsysDownloadWithProgress(url, onProgress) usando streams do fetch.',
        enabledByDefault: false,
        enable() {
            window.__vsysDownloadWithProgress = async (url, onProgress) => {
                const res = await fetch(url);
                const total = Number(res.headers.get('content-length')) || 0;
                let loaded = 0;
                const reader = res.body.getReader();
                const chunks = [];
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    chunks.push(value); loaded += value.length;
                    if (total) onProgress?.(loaded / total);
                }
                return new Blob(chunks);
            };
        },
        disable() { delete window.__vsysDownloadWithProgress; }
    });

    // --- Backoff exponencial genérico para chamadas de API ---
    systems.push({
        id: 'network.api-rate-limit-backoff', category: 'network', name: 'Backoff de Limite de Requisições',
        description: 'Disponibiliza window.__vsysFetchWithBackoff() que espera progressivamente mais entre tentativas em erro 429.',
        enabledByDefault: true,
        enable() {
            window.__vsysFetchWithBackoff = async (url, options = {}, maxAttempts = 4) => {
                for (let i = 0; i < maxAttempts; i++) {
                    const res = await fetch(url, options);
                    if (res.status !== 429) return res;
                    await new Promise(r => setTimeout(r, 2 ** i * 500));
                }
                throw new Error('Limite de requisições excedido repetidamente.');
            };
        },
        disable() { delete window.__vsysFetchWithBackoff; }
    });

    // --- Registro de background sync (quando suportado) ---
    systems.push({
        id: 'network.background-sync-registration', category: 'network', name: 'Sincronização em Segundo Plano',
        description: 'Registra uma tag de Background Sync via Service Worker, quando disponível.',
        enabledByDefault: false,
        async enable() {
            try {
                const reg = await navigator.serviceWorker?.ready;
                await reg?.sync?.register('vsys-sync-tag');
            } catch (e) { /* Background Sync indisponível */ }
        },
        disable() { }
    });

    // --- Informações da conexão (tipo, downlink, rtt) ---
    systems.push({
        id: 'network.connection-info', category: 'network', name: 'Informações da Conexão',
        description: 'Exibe tipo de conexão, velocidade estimada (downlink) e latência (rtt) quando suportado pelo navegador.',
        enabledByDefault: true,
        enable() {
            const conn = navigator.connection;
            if (conn) storageSet('connection-info', { type: conn.effectiveType, downlink: conn.downlink, rtt: conn.rtt });
        },
        disable() { }
    });

    // --- Fallback de CDN (troca de URL se um recurso falhar) ---
    systems.push({
        id: 'network.cdn-fallback-switcher', category: 'network', name: 'Fallback de CDN',
        description: 'Se um <script>/<link> de CDN falhar ao carregar, tenta automaticamente uma URL alternativa definida em data-fallback.',
        enabledByDefault: true,
        enable() {
            this._handler = (e) => {
                const el = e.target;
                const fallback = el?.dataset?.fallback;
                if (fallback && el.src !== fallback) el.src = fallback;
            };
            window.addEventListener('error', this._handler, true);
        },
        disable() { window.removeEventListener('error', this._handler, true); }
    });

    // --- Gerenciador de reconexão de WebSocket ---
    systems.push({
        id: 'network.websocket-reconnect-manager', category: 'network', name: 'Reconexão de WebSocket',
        description: 'Disponibiliza window.__vsysResilientSocket(url) que reconecta automaticamente com backoff em caso de queda.',
        enabledByDefault: false,
        enable() {
            window.__vsysResilientSocket = (url, handlers = {}) => {
                let attempt = 0, socket;
                const connect = () => {
                    socket = new WebSocket(url);
                    socket.onopen = (e) => { attempt = 0; handlers.onopen?.(e); };
                    socket.onmessage = (e) => handlers.onmessage?.(e);
                    socket.onclose = () => { attempt++; setTimeout(connect, Math.min(2 ** attempt * 500, 15000)); };
                };
                connect();
                return { send: (d) => socket?.send(d), close: () => socket?.close() };
            };
        },
        disable() { delete window.__vsysResilientSocket; }
    });

    // --- Progresso de upload (via XHR, que expõe progress nativamente) ---
    systems.push({
        id: 'network.upload-progress-tracker', category: 'network', name: 'Progresso de Upload',
        description: 'Disponibiliza window.__vsysUploadWithProgress(url, file, onProgress) usando XMLHttpRequest.',
        enabledByDefault: false,
        enable() {
            window.__vsysUploadWithProgress = (url, file, onProgress) => new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('POST', url);
                xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(e.loaded / e.total); };
                xhr.onload = () => resolve(xhr.response);
                xhr.onerror = reject;
                const form = new FormData(); form.append('file', file);
                xhr.send(form);
            });
        },
        disable() { delete window.__vsysUploadWithProgress; }
    });

    return systems;
}

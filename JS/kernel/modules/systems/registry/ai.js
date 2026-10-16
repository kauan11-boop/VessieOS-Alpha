/**
 * Categoria: AI (14 sistemas)
 * Complementam a integração já existente com o LM Studio (window.VessieOS.ai,
 * ver ai-integration/index.js): watchdog de conexão, histórico de prompts,
 * cache de respostas, fallback offline, etc.
 */
export default function buildAISystems({ helpers }) {
    const { storageGet, storageSet, toast } = helpers;
    const systems = [];

    // --- Watchdog de conexão com o LM Studio ---
    systems.push((function connectionWatchdog() {
        let interval = null;
        return {
            id: 'ai.connection-watchdog', category: 'ai', name: 'Vigia de Conexão com IA',
            description: 'Verifica periodicamente se o LM Studio ainda está acessível e avisa se a conexão cair.',
            enabledByDefault: true,
            enable() {
                let wasConnected = null;
                interval = setInterval(async () => {
                    const ai = window.VessieOS?.ai;
                    if (!ai) return;
                    const connected = await ai.checkConnection?.().catch(() => false);
                    if (wasConnected === true && connected === false) toast('Conexão com o LM Studio foi perdida.', 'warning');
                    if (wasConnected === false && connected === true) toast('Conexão com o LM Studio restabelecida.', 'success');
                    wasConnected = connected;
                }, 30000);
            },
            disable() { clearInterval(interval); }
        };
    })());

    // --- Atalho rápido para abrir o chat de IA ---
    systems.push({
        id: 'ai.quick-launch-shortcut', category: 'ai', name: 'Atalho Rápido de IA',
        description: 'Pressione Win+Espaço para abrir o chat com a Vessie AI de qualquer lugar.',
        enabledByDefault: true,
        enable() {
            this._handler = (e) => {
                if ((e.metaKey || e.key === 'Meta') && e.code === 'Space') {
                    e.preventDefault();
                    document.dispatchEvent(new CustomEvent('vessieos:open-app', { detail: { app: 'ai-chat' } }));
                }
            };
            window.addEventListener('keydown', this._handler);
        },
        disable() { window.removeEventListener('keydown', this._handler); }
    });

    // --- Histórico de prompts ---
    systems.push({
        id: 'ai.prompt-history', category: 'ai', name: 'Histórico de Prompts',
        description: 'Guarda os últimos prompts enviados à IA para reenvio rápido.',
        enabledByDefault: true,
        enable() {
            window.__vsysSavePrompt = (text) => {
                const history = storageGet('ai-prompt-history', []);
                history.unshift(text); storageSet('ai-prompt-history', history.slice(0, 30));
            };
            window.__vsysGetPromptHistory = () => storageGet('ai-prompt-history', []);
        },
        disable() { delete window.__vsysSavePrompt; delete window.__vsysGetPromptHistory; }
    });

    // --- Estatísticas de uso de IA ---
    systems.push({
        id: 'ai.usage-stats', category: 'ai', name: 'Estatísticas de Uso de IA',
        description: 'Conta quantas mensagens foram trocadas com a IA por dia.',
        enabledByDefault: true,
        enable() {
            window.__vsysTrackAIMessage = () => {
                const key = `ai-usage:${new Date().toISOString().slice(0, 10)}`;
                storageSet(key, storageGet(key, 0) + 1);
            };
        },
        disable() { delete window.__vsysTrackAIMessage; }
    });

    // --- Cache de respostas para prompts repetidos ---
    systems.push({
        id: 'ai.response-caching', category: 'ai', name: 'Cache de Respostas de IA',
        description: 'Evita reenviar exatamente o mesmo prompt ao modelo, reaproveitando a última resposta (5 min).',
        enabledByDefault: false,
        enable() {
            window.__vsysAICache = {
                get(prompt) {
                    const cached = storageGet(`ai-cache:${prompt}`, null);
                    if (cached && Date.now() - cached.at < 5 * 60 * 1000) return cached.response;
                    return null;
                },
                set(prompt, response) { storageSet(`ai-cache:${prompt}`, { response, at: Date.now() }); }
            };
        },
        disable() { delete window.__vsysAICache; }
    });

    // --- Respostas de fallback offline ---
    systems.push({
        id: 'ai.offline-fallback-responses', category: 'ai', name: 'Respostas Offline',
        description: 'Mostra uma mensagem útil quando o LM Studio está indisponível, em vez de travar a interface.',
        enabledByDefault: true,
        enable() {
            window.__vsysOfflineAIMessage = 'A IA local (LM Studio) não está acessível agora. Verifique se o LM Studio está aberto e servindo em http://localhost:1234.';
        },
        disable() { delete window.__vsysOfflineAIMessage; }
    });

    // --- Entrada por voz (Web Speech API, reconhecimento) ---
    systems.push((function voiceInput() {
        let recognition = null;
        return {
            id: 'ai.voice-input', category: 'ai', name: 'Entrada por Voz',
            description: 'Permite ditar mensagens para a IA usando reconhecimento de voz do navegador.',
            enabledByDefault: false,
            enable() {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                if (!SpeechRecognition) return;
                recognition = new SpeechRecognition();
                recognition.lang = 'pt-BR';
                window.__vsysStartVoiceInput = (onResult) => {
                    recognition.onresult = (e) => onResult(e.results[0][0].transcript);
                    recognition.start();
                };
            },
            disable() { recognition?.abort(); delete window.__vsysStartVoiceInput; }
        };
    })());

    // --- Texto-para-voz nas respostas da IA ---
    systems.push({
        id: 'ai.text-to-speech-replies', category: 'ai', name: 'Ler Respostas em Voz Alta',
        description: 'Lê automaticamente as respostas da IA em voz alta usando a Web Speech API.',
        enabledByDefault: false,
        enable() {
            window.__vsysSpeakAIReply = (text) => {
                if (!window.speechSynthesis) return;
                const utter = new SpeechSynthesisUtterance(text.slice(0, 800));
                utter.lang = 'pt-BR';
                speechSynthesis.speak(utter);
            };
        },
        disable() { delete window.__vsysSpeakAIReply; speechSynthesis?.cancel(); }
    });

    // --- Etiqueta de sentimento simples nas mensagens ---
    systems.push({
        id: 'ai.sentiment-tagging', category: 'ai', name: 'Marcação de Sentimento',
        description: 'Classifica mensagens como positivas/negativas/neutras usando uma heurística simples de palavras-chave.',
        enabledByDefault: false,
        enable() {
            const positive = ['ótimo', 'excelente', 'obrigado', 'bom', 'gostei'];
            const negative = ['ruim', 'péssimo', 'erro', 'problema', 'não funciona'];
            window.__vsysSentiment = (text = '') => {
                const t = text.toLowerCase();
                const pos = positive.some(w => t.includes(w));
                const neg = negative.some(w => t.includes(w));
                return pos && !neg ? 'positivo' : neg && !pos ? 'negativo' : 'neutro';
            };
        },
        disable() { delete window.__vsysSentiment; }
    });

    // --- Resumo automático de respostas longas ---
    systems.push({
        id: 'ai.auto-summarize-long-replies', category: 'ai', name: 'Resumir Respostas Longas',
        description: 'Corta respostas muito longas da IA em um resumo com botão "ver mais" (heurística por tamanho).',
        enabledByDefault: false,
        enable() {
            window.__vsysMaybeSummarize = (text, limit = 400) => {
                if (text.length <= limit) return { short: text, full: text, truncated: false };
                return { short: text.slice(0, limit) + '…', full: text, truncated: true };
            };
        },
        disable() { delete window.__vsysMaybeSummarize; }
    });

    // --- Busca assistida por IA (prepara contexto de arquivos abertos) ---
    systems.push({
        id: 'ai.assisted-search', category: 'ai', name: 'Busca Assistida por IA',
        description: 'Monta um prompt de busca combinando o termo do usuário com contexto de apps/arquivos abertos.',
        enabledByDefault: false,
        enable() {
            window.__vsysBuildSearchPrompt = (term) => {
                const openApps = [...document.querySelectorAll('.window')].map(w => w.dataset.app).filter(Boolean);
                return `Busca do usuário: "${term}". Contexto: apps abertos = ${openApps.join(', ') || 'nenhum'}.`;
            };
        },
        disable() { delete window.__vsysBuildSearchPrompt; }
    });

    // --- Triagem inteligente de notificações ---
    systems.push({
        id: 'ai.smart-notification-triage', category: 'ai', name: 'Triagem de Notificações',
        description: 'Agrupa notificações semelhantes recebidas em um curto intervalo para reduzir ruído.',
        enabledByDefault: true,
        enable() {
            let recent = [];
            window.__vsysTriageNotification = (message) => {
                const now = Date.now();
                recent = recent.filter(n => now - n.at < 5000);
                const dup = recent.some(n => n.message === message);
                recent.push({ message, at: now });
                return !dup; // true = deve mostrar, false = suprimir duplicata recente
            };
        },
        disable() { delete window.__vsysTriageNotification; }
    });

    // --- Retentativas automáticas em erro de IA ---
    systems.push({
        id: 'ai.error-retry', category: 'ai', name: 'Retentativa Automática de IA',
        description: 'Disponibiliza window.__vsysAIRetry(fn) que tenta novamente até 3 vezes com backoff em caso de falha.',
        enabledByDefault: true,
        enable() {
            window.__vsysAIRetry = async (fn, attempts = 3) => {
                for (let i = 0; i < attempts; i++) {
                    try { return await fn(); } catch (e) {
                        if (i === attempts - 1) throw e;
                        await new Promise(r => setTimeout(r, 500 * (i + 1)));
                    }
                }
            };
        },
        disable() { delete window.__vsysAIRetry; }
    });

    // --- Trocador rápido de modelo de IA ---
    systems.push({
        id: 'ai.model-switcher', category: 'ai', name: 'Trocador de Modelo de IA',
        description: 'Disponibiliza window.__vsysSwitchModel(nome) para trocar o modelo ativo do LM Studio sem reabrir o app.',
        enabledByDefault: false,
        enable() {
            window.__vsysSwitchModel = async (modelName) => {
                const ai = window.VessieOS?.ai;
                if (!ai?.setModel) return toast('Integração de IA indisponível.', 'error');
                await ai.setModel(modelName);
                toast(`Modelo alterado para ${modelName}`, 'success');
            };
        },
        disable() { delete window.__vsysSwitchModel; }
    });

    return systems;
}

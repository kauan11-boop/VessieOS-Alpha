/**
 * AntiFallModule v2.0
 * Intercepta iframes que falham ao carregar (X-Frame-Options/CSP).
 * Tenta converter para Embed (YouTube/Vimeo), clonar via Fetch, ou exibe UI de fallback.
 */
class AntiFallModule {
    constructor(deps = {}) {
        this.version = '2.0.0';
        this.deps = deps;
        this.monitoredIframes = new Map();
        this.proxyEndpoint = ''; // Adicione um proxy aqui se tiver um backend
    }

    async init() {
        console.log('[AntiFall] Módulo de proteção de Iframe v2.0 inicializado.');
    }

    async start() {
        // Ouvinte global para capturar erros de recursos (imagens, scripts, iframes)
        window.addEventListener('error', (e) => {
            if (e.target && e.target.tagName === 'IFRAME') {
                this.handleIframeFailure(e.target, e.target.src);
            } else if (e.target && (e.target.tagName === 'IMG' || e.target.tagName === 'SCRIPT')) {
                // Impede que imagens bloqueadas por CORS quebrem o sistema visual
                if (e.target.tagName === 'IMG') {
                    e.target.style.display = 'none'; // Esconde imagem quebrada
                }
            }
        }, true);
    }

    monitorIframe(iframeElement, url) {
        if (!iframeElement || !url) return;
        const monitorData = { url, attempts: 0, cloned: false };
        this.monitoredIframes.set(iframeElement, monitorData);

        // Verifica após 3.5s se o iframe foi bloqueado silenciosamente
        setTimeout(() => {
            if (iframeElement.contentDocument === null && monitorData.attempts === 0 && !monitorData.cloned) {
                console.warn(`[AntiFall] Iframe bloqueado detectado (Timeout): ${url}`);
                this.handleIframeFailure(iframeElement, url);
            }
        }, 3500);

        iframeElement.onerror = () => this.handleIframeFailure(iframeElement, url);
    }

    async handleIframeFailure(iframe, url) {
        const data = this.monitoredIframes.get(iframe);
        if (!data || data.cloned) return;

        const parentContainer = iframe.parentElement;
        if (!parentContainer) return;

        // Tenta converter para Embed primeiro (resolve 90% dos casos de YouTube, Vimeo, Twitch)
        const embedUrl = this.getEmbeddableUrl(url);
        if (embedUrl && embedUrl !== url) {
            console.log(`[AntiFall] Convertendo para Embed URL: ${embedUrl}`);
            iframe.src = embedUrl;
            data.cloned = true; // Marca como resolvido para não entrar em loop
            iframe.style.display = 'block';
            return;
        }

        // Se não for conversível, tenta o Clone via Fetch
        console.log(`[AntiFall] Iniciando clonagem automática para: ${url}`);
        iframe.style.display = 'none';

        const loadingDiv = this.createLoadingUI();
        parentContainer.appendChild(loadingDiv);

        try {
            const fetchUrl = this.proxyEndpoint ? `${this.proxyEndpoint}${encodeURIComponent(url)}` : url;
            const response = await fetch(fetchUrl, { mode: 'cors', redirect: 'follow' });

            if (!response.ok) throw new Error('Resposta de rede falhou');

            let html = await response.text();
            html = this.rewritePaths(html, url);

            parentContainer.removeChild(loadingDiv);

            const clonedContent = document.createElement('div');
            clonedContent.className = 'antifall-cloned-container';
            clonedContent.style.cssText = 'width:100%; height:100%; overflow:auto; background-color:#fff;';
            clonedContent.innerHTML = html;

            parentContainer.appendChild(clonedContent);
            data.cloned = true;
            console.log(`[AntiFall] Clonagem bem-sucedida para: ${url}`);

        } catch (error) {
            console.error(`[AntiFall] Falha ao clonar (CORS bloqueado): ${error.message}`);
            parentContainer.removeChild(loadingDiv);
            this.renderFallbackUI(parentContainer, url);
        }
    }

    /**
     * Converte URLs de plataformas conhecidas para suas versões de Embed
     */
    getEmbeddableUrl(url) {
        try {
            const u = new URL(url);
            // YouTube
            if (u.hostname.includes('youtube.com') && u.pathname === '/watch') {
                return `https://www.youtube.com/embed/${u.searchParams.get('v')}`;
            }
            if (u.hostname === 'youtu.be') {
                return `https://www.youtube.com/embed/${u.pathname.substring(1)}`;
            }
            // Vimeo
            if (u.hostname.includes('vimeo.com')) {
                const videoId = u.pathname.split('/')[1];
                if (videoId) return `https://player.vimeo.com/video/${videoId}`;
            }
            // Twitch
            if (u.hostname.includes('twitch.tv')) {
                const channel = u.pathname.substring(1);
                return `https://player.twitch.tv/?channel=${channel}&parent=${window.location.hostname}`;
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    rewritePaths(html, baseUrl) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const urlBase = new URL(baseUrl);
        const origin = urlBase.origin;
        const pathname = urlBase.pathname.substring(0, urlBase.pathname.lastIndexOf('/'));

        const fixPath = (path) => {
            if (!path || path.startsWith('http') || path.startsWith('//') || path.startsWith('data:')) return path;
            if (path.startsWith('/')) return origin + path;
            if (path.startsWith('./')) return origin + pathname + path.substring(1);
            return origin + pathname + '/' + path;
        };

        doc.querySelectorAll('img[src]').forEach(e => e.src = fixPath(e.getAttribute('src')));
        doc.querySelectorAll('a[href]').forEach(e => e.href = fixPath(e.getAttribute('href')));
        doc.querySelectorAll('link[href]').forEach(e => e.href = fixPath(e.getAttribute('href')));
        doc.querySelectorAll('script[src]').forEach(e => e.src = fixPath(e.getAttribute('src')));

        // Remove scripts inline para não quebrar o VessieOS
        doc.querySelectorAll('script:not([src])').forEach(s => s.remove());

        return doc.body.innerHTML;
    }

    createLoadingUI() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'antifall-loading';
        loadingDiv.style.cssText = 'display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; background:rgba(20,20,30,0.95); color:#fff; font-family:sans-serif;';
        loadingDiv.innerHTML = `
            <div style="border:3px solid #ccc; border-top:3px solid #6e8efb; border-radius:50%; width:30px; height:30px; animation:antifall-spin 1s linear infinite; margin-bottom:15px;"></div>
            <div>Site bloqueou Iframe. Tentando clonar conteúdo...</div>
            <style>@keyframes antifall-spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
        `;
        return loadingDiv;
    }

    renderFallbackUI(container, url) {
        let hostname = url;
        try { hostname = new URL(url).hostname; } catch (e) { }

        const fallback = document.createElement('div');
        fallback.className = 'antifall-fallback';
        fallback.style.cssText = `
            display:flex; flex-direction:column; align-items:center; justify-content:center;
            height:100%; background:rgba(20,20,30,0.95); color:#fff; text-align:center; padding:20px;
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
        `;
        fallback.innerHTML = `
            <i class="fas fa-shield-alt" style="font-size:48px; color:#fbbf24; margin-bottom:20px;"></i>
            <h3 style="margin:0 0 10px; font-size:18px;">Proteção de Segurança Ativada</h3>
            <p style="margin:0 0 20px; font-size:14px; color:#aaa; max-width:400px;">
                O site <strong>${hostname}</strong> bloqueou a incorporação (X-Frame-Options) e o sistema AntiFall não pôde cloná-lo devido a políticas de CORS do navegador.
            </p>
            <a href="${url}" target="_blank" style="
                background:#6e8efb; color:#fff; padding:10px 20px; 
                border-radius:8px; text-decoration:none; font-weight:bold;
            ">
                <i class="fas fa-external-link-alt"></i> Abrir em nova aba
            </a>
        `;
        container.appendChild(fallback);
    }
}

// Exportação segura (evita o erro de SyntaxError se carregado como script normal)
if (typeof window !== 'undefined') {
    window.AntiFallModule = AntiFallModule;
}
// Remove o "export default" se você estiver usando <script src=""> em vez de import ES6
// export default AntiFallModule;
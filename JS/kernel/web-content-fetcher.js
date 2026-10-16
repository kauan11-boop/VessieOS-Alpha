/**
 * Web Content Fetcher & System Builder (v3 — resiliência + diagnóstico)
 * ---------------------------------------------------------------
 * Sobre a v2, esta rodada acrescenta (mesma filosofia do GameHub, para
 * consistência entre os dois coletores do projeto):
 *
 *   8. `corsproxy.io` exige `?url=` desde 2024 — corrigido — e
 *      `codetabs.com` foi adicionado como 4ª camada de fallback.
 *   9. Removido o cabeçalho `User-Agent` (proibido pela Fetch API,
 *      navegadores o descartam silenciosamente); `Accept` ficou no lugar.
 *  10. Circuit breaker por motor de busca: depois de falhas seguidas, o
 *      motor é pulado nas próximas buscas por um cooldown, em vez de
 *      gastar tempo tentando de novo uma fonte já provada fora do ar.
 *      `getSourceStatus()` expõe esse estado para diagnóstico.
 *  11. `search(query, { forceRefresh: true })` ignora o cache dessa busca
 *      específica sem precisar de `clearCache()` (que apaga tudo).
 */
class WebContentFetcher {
  constructor(config = {}) {
    this.searchEngines = [
      { name: 'DuckDuckGo', enabled: config.engines?.duckduckgo !== false, search: (q) => this._searchDuckDuckGo(q) },
      { name: 'Wikipedia', enabled: config.engines?.wikipedia !== false, search: (q) => this._searchWikipedia(q) },
      { name: 'GitHub', enabled: config.engines?.github !== false, search: (q) => this._searchGitHub(q) },
      { name: 'HackerNews', enabled: config.engines?.hackernews !== false, search: (q) => this._searchHackerNews(q) },
      { name: 'npm', enabled: config.engines?.npm !== false, search: (q) => this._searchNpm(q) }
    ];

    this.contentCache = new Map();
    this.cacheExpiry = config.cacheExpiry || 86400000; // 24 horas
    this.requestTimeout = config.requestTimeout || 8000;
    this.retryAttempts = config.retryAttempts || 2;
    this.retryBaseDelay = config.retryBaseDelay || 500;
    this.fetchConcurrency = config.fetchConcurrency || 3;
    this.persistKey = config.persistKey || 'vessieos_web_fetcher_cache_v2';

    this.fetchLog = [];
    this.generatedSystems = [];

    // ---- circuit breaker por motor de busca — mesma lógica do GameHub,
    // para consistência entre os dois coletores do projeto. ----
    this.circuitBreakerThreshold = config.circuitBreakerThreshold ?? 3;
    this.circuitBreakerCooldownMs = config.circuitBreakerCooldownMs ?? 5 * 60000;
    this._engineHealth = new Map();

    this._loadPersistentCache();
  }

  _health(engineName) {
    if (!this._engineHealth.has(engineName)) {
      this._engineHealth.set(engineName, { consecutiveFailures: 0, openUntil: 0, lastError: null, lastSuccessAt: null });
    }
    return this._engineHealth.get(engineName);
  }

  _isCircuitOpen(engineName) { return this._health(engineName).openUntil > Date.now(); }

  _recordSuccess(engineName) {
    const health = this._health(engineName);
    health.consecutiveFailures = 0;
    health.openUntil = 0;
    health.lastSuccessAt = Date.now();
  }

  _recordFailure(engineName, error) {
    const health = this._health(engineName);
    health.consecutiveFailures += 1;
    health.lastError = error?.message || String(error);
    if (health.consecutiveFailures >= this.circuitBreakerThreshold) {
      health.openUntil = Date.now() + this.circuitBreakerCooldownMs;
      this.log(`Circuito de "${engineName}" aberto por ${Math.round(this.circuitBreakerCooldownMs / 1000)}s após ${health.consecutiveFailures} falhas seguidas.`);
    }
  }

  /** Status de saúde de cada motor de busca — útil para um painel de diagnóstico. */
  getSourceStatus() {
    return this.searchEngines.map((engine) => {
      const health = this._health(engine.name);
      return {
        name: engine.name,
        enabled: engine.enabled,
        circuitOpen: this._isCircuitOpen(engine.name),
        consecutiveFailures: health.consecutiveFailures,
        lastError: health.lastError,
        lastSuccessAt: health.lastSuccessAt
      };
    });
  }

  // ================================================================
  //  BUSCA
  // ================================================================

  /** Busca em todas as fontes habilitadas em paralelo, com cache e dedupe por URL. */
  async search(query, options = {}) {
    const cacheKey = `search::${query}::${Object.keys(options).sort().join(',')}`;
    const cached = this.contentCache.get(cacheKey);
    if (!options.forceRefresh && cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      this.log(`Usando cache de busca para: "${query}"`);
      return cached.data;
    }

    const enabled = this.searchEngines.filter((e) => e.enabled);
    const runnable = enabled.filter((e) => !this._isCircuitOpen(e.name));
    const skipped = enabled.length - runnable.length;
    this.log(`Buscando "${query}" em ${runnable.length} fontes (paralelo)${skipped ? `, ${skipped} pulada(s) por circuito aberto` : ''}...`);

    const settled = await Promise.allSettled(
      runnable.map((engine) => this._withRetry(() => engine.search(query), this.retryAttempts, engine.name))
    );

    const results = [];
    const seenUrls = new Set();
    settled.forEach((outcome, index) => {
      const engineName = runnable[index].name;
      if (outcome.status === 'fulfilled') {
        this._recordSuccess(engineName);
        for (const item of outcome.value) {
          if (!item.url || seenUrls.has(item.url)) continue;
          seenUrls.add(item.url);
          results.push(item);
        }
      } else {
        this._recordFailure(engineName, outcome.reason);
        this.log(`Fonte "${engineName}" falhou: ${outcome.reason?.message || outcome.reason}`);
      }
    });

    this.contentCache.set(cacheKey, { data: results, timestamp: Date.now() });
    this._savePersistentCache();
    return results;
  }

  async _searchDuckDuckGo(query) {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const response = await this._fetchDirect(url);
    const data = await response.json();
    const results = (data.RelatedTopics || [])
      .filter((topic) => topic.FirstURL && topic.Text)
      .map((topic) => ({ source: 'DuckDuckGo', title: topic.Text.split(' - ')[0], url: topic.FirstURL, snippet: topic.Text }));
    if (data.AbstractURL) results.unshift({ source: 'DuckDuckGo', title: data.Heading || query, url: data.AbstractURL, snippet: data.AbstractText });
    return results;
  }

  async _searchWikipedia(query) {
    const url = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&list=search&srsearch=${encodeURIComponent(query)}`;
    const response = await this._fetchDirect(url);
    const data = await response.json();
    return (data.query?.search || []).map((result) => ({
      source: 'Wikipedia',
      title: result.title,
      url: `https://en.wikipedia.org/wiki/${result.title.replace(/ /g, '_')}`,
      snippet: this._stripTags(result.snippet)
    }));
  }

  async _searchGitHub(query) {
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&per_page=10`;
    const response = await this._fetchDirect(url);
    const data = await response.json();
    return (data.items || []).map((repo) => ({
      source: 'GitHub',
      title: repo.full_name,
      url: repo.html_url,
      snippet: repo.description || '',
      stars: repo.stargazers_count,
      language: repo.language
    }));
  }

  /** Hacker News via Algolia — pública, sem chave. Boa para contexto/discussão técnica. */
  async _searchHackerNews(query) {
    const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=10`;
    const response = await this._fetchDirect(url);
    const data = await response.json();
    return (data.hits || []).map((hit) => ({
      source: 'HackerNews',
      title: hit.title,
      url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      snippet: `${hit.points || 0} pontos · ${hit.num_comments || 0} comentários`,
      points: hit.points
    }));
  }

  /** Registro npm — útil quando a busca é sobre bibliotecas/pacotes JS. */
  async _searchNpm(query) {
    const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=10`;
    const response = await this._fetchDirect(url);
    const data = await response.json();
    return (data.objects || []).map((obj) => ({
      source: 'npm',
      title: obj.package.name,
      url: obj.package.links?.npm || `https://www.npmjs.com/package/${obj.package.name}`,
      snippet: obj.package.description || '',
      version: obj.package.version
    }));
  }

  // ================================================================
  //  BUSCA DE CONTEÚDO DE UMA PÁGINA
  // ================================================================

  /** Busca e extrai o conteúdo textual de uma URL, com timeout, retry e fallback de proxy. */
  async fetchContent(url) {
    this.log(`Buscando conteúdo de: ${url}`);
    try {
      const response = await this._withRetry(() => this.fetchWithProxy(url), this.retryAttempts, url);
      const content = await response.text();
      return { url, content, fetchedAt: new Date().toISOString(), contentLength: content.length };
    } catch (error) {
      this.log(`Erro ao buscar conteúdo: ${error.message}`);
      return { url, error: error.message };
    }
  }

  /** Consulta o Wayback Machine por um snapshot arquivado (metadados, não o HTML em si). */
  async fetchArchived(url) {
    const response = await this._fetchDirect(`https://archive.org/wayback/available?url=${encodeURIComponent(url)}&output=json`);
    const data = await response.json();
    const snapshot = data.archived_snapshots?.closest;
    return snapshot ? { available: true, snapshotUrl: snapshot.url, timestamp: snapshot.timestamp } : { available: false };
  }

  // ================================================================
  //  GERAÇÃO DE SISTEMA (busca + conteúdo -> estrutura navegável)
  // ================================================================
  async generateSystem(topic, options = {}) {
    this.log(`Gerando sistema para: ${topic}`);
    const maxSources = options.maxSources || 5;

    try {
      const searchResults = await this.search(topic);
      if (searchResults.length === 0) throw new Error('Nenhum resultado de busca encontrado.');

      const selected = searchResults.slice(0, maxSources);
      const contentBlocks = await this._runWithConcurrency(selected, this.fetchConcurrency, async (result) => {
        const content = await this.fetchContent(result.url);
        if (content.error) return null;
        return { source: result.source, title: result.title, url: result.url, summary: result.snippet, content: content.content };
      });

      const blocks = contentBlocks.filter(Boolean);
      const system = {
        id: `system_${Date.now()}`,
        name: topic,
        createdAt: new Date().toISOString(),
        sources: blocks.map((b) => b.source),
        contentBlocks: blocks,
        metadata: { totalSources: blocks.length, contentSize: blocks.reduce((sum, b) => sum + b.content.length, 0) }
      };

      this.generatedSystems.push(system);
      return system;
    } catch (error) {
      this.log(`Erro ao gerar sistema: ${error.message}`);
      return { error: error.message };
    }
  }

  // ================================================================
  //  REDE: fetch com timeout real + fallback de proxy + retry
  // ================================================================
  async _fetchDirect(url, { timeoutMs = this.requestTimeout } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        // 'User-Agent' é proibido pela Fetch API (navegadores o ignoram
        // silenciosamente) — removido. 'Accept' é permitido de verdade.
        headers: { Accept: 'application/json, text/plain, */*' },
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Direto primeiro; cai para proxies CORS reais só se necessário (mesma
   * cadeia do GameHub, para consistência). `corsproxy.io` exige `?url=`
   * desde 2024 (corrigido); `codetabs.com` adicionado como 4ª camada.
   */
  async fetchWithProxy(url) {
    const attempts = [
      { label: 'direto', build: () => url },
      { label: 'corsproxy.io', build: () => `https://corsproxy.io/?url=${encodeURIComponent(url)}` },
      { label: 'allorigins', build: () => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}` },
      { label: 'codetabs', build: () => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}` }
    ];
    let lastError = null;
    for (const attempt of attempts) {
      try {
        const response = await this._fetchDirect(attempt.build());
        this.log(`Sucesso via ${attempt.label}: ${url}`);
        return response;
      } catch (error) {
        lastError = error;
        this.log(`Proxy "${attempt.label}" falhou para ${url}: ${error.message}`);
      }
    }
    throw lastError || new Error('Todas as estratégias de acesso falharam.');
  }

  async _withRetry(fn, attempts, label) {
    let lastError = null;
    for (let attempt = 0; attempt <= attempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (attempt < attempts) {
          const backoff = this.retryBaseDelay * Math.pow(2, attempt) + Math.random() * this.retryBaseDelay;
          this.log(`${label}: tentativa ${attempt + 1}/${attempts + 1} falhou (${error.message}), retry em ${Math.round(backoff)}ms.`);
          await new Promise((resolve) => setTimeout(resolve, backoff));
        }
      }
    }
    throw lastError;
  }

  async _runWithConcurrency(items, limit, worker) {
    const results = new Array(items.length);
    let cursor = 0;
    const runners = new Array(Math.min(limit, items.length) || 1).fill(null).map(async () => {
      while (cursor < items.length) {
        const index = cursor++;
        results[index] = await worker(items[index]);
      }
    });
    await Promise.all(runners);
    return results;
  }

  _stripTags(html) { return String(html).replace(/<[^>]*>/g, ''); }

  // ================================================================
  //  PERSISTÊNCIA
  // ================================================================
  _loadPersistentCache() {
    try {
      const raw = (typeof localStorage !== 'undefined') ? localStorage.getItem(this.persistKey) : null;
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const now = Date.now();
      for (const [key, entry] of Object.entries(parsed.cache || {})) {
        if (now - entry.timestamp < this.cacheExpiry) this.contentCache.set(key, entry);
      }
      this.log(`Cache persistente de busca carregado (${this.contentCache.size} entradas válidas).`);
    } catch (error) {
      this.log(`Não foi possível carregar o cache persistente: ${error.message}`);
    }
  }

  _savePersistentCache() {
    try {
      if (typeof localStorage === 'undefined') return;
      const cacheObj = {};
      for (const [key, value] of this.contentCache.entries()) cacheObj[key] = value;
      localStorage.setItem(this.persistKey, JSON.stringify({ cache: cacheObj, savedAt: Date.now() }));
    } catch (error) {
      this.log(`Não foi possível salvar o cache persistente: ${error.message}`);
    }
  }

  // ================================================================
  //  CONSULTA / EXPORTAÇÃO
  // ================================================================
  getCachedSystem(name) { return this.generatedSystems.find((s) => s.name === name); }

  listGeneratedSystems() {
    return this.generatedSystems.map((s) => ({ id: s.id, name: s.name, createdAt: s.createdAt, sourceCount: s.contentBlocks.length }));
  }

  exportAsHTML(systemId) {
    const system = this.generatedSystems.find((s) => s.id === systemId);
    if (!system) return null;

    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${system.name}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; max-width: 800px; }
    .source { background: #f5f5f5; padding: 15px; margin: 15px 0; border-left: 4px solid #007bff; }
    .source-title { font-weight: bold; color: #007bff; }
    .source-url { font-size: 0.9em; color: #666; }
  </style>
</head>
<body>
  <h1>${system.name}</h1>
  <p>Gerado em ${system.createdAt}</p>
  <p>Fontes: ${system.sources.join(', ')}</p>
`;
    for (const block of system.contentBlocks) {
      html += `
  <div class="source">
    <div class="source-title">${block.title}</div>
    <div class="source-url">${block.url}</div>
    <p>${block.summary}</p>
    <details>
      <summary>Conteúdo completo</summary>
      <pre>${block.content.substring(0, 500)}...</pre>
    </details>
  </div>
`;
    }
    html += `</body>\n</html>\n`;
    return html;
  }

  clearCache() {
    this.contentCache.clear();
    try { if (typeof localStorage !== 'undefined') localStorage.removeItem(this.persistKey); } catch (e) { /* noop */ }
    this.log('Cache limpo.');
  }

  log(message) {
    const entry = { timestamp: new Date().toISOString(), message };
    this.fetchLog.push(entry);
    if (this.fetchLog.length > 500) this.fetchLog.shift();
    console.log(`[WebFetcher] ${message}`);
  }

  getLog(limit = 50) { return this.fetchLog.slice(-limit); }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = WebContentFetcher;
}
if (typeof window !== 'undefined') {
  window.WebContentFetcher = WebContentFetcher;
}

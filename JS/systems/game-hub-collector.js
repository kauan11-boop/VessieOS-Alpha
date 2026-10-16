/**
 * Game Hub - Coletor Automático de Jogos (v3 — resiliência + diagnóstico)
 * ---------------------------------------------------------------
 * Sobre a v2, esta rodada de melhorias focou em resiliência de rede e
 * observabilidade (o "coletor de site" evitando desperdiçar tempo em
 * fontes que já se provaram fora do ar, e expondo isso para a UI):
 *
 *   8. `corsproxy.io` mudou de API em 2024 e passou a exigir o parâmetro
 *      `?url=` — a chamada antiga (`?${url}` sem o `url=`) começou a
 *      devolver 400 e a fonte silenciosamente caía para o próximo proxy.
 *      Corrigido, e adicionado `codetabs.com` como 4ª camada de fallback.
 *   9. O cabeçalho `User-Agent` era setado manualmente em todo fetch, mas
 *      é um cabeçalho PROIBIDO pela Fetch API — navegadores o descartam
 *      silenciosamente, então não fazia nada além de gerar avisos no
 *      console em alguns navegadores. Removido; `Accept` (permitido, e
 *      realmente respeitado por várias APIs) ficou no lugar.
 *  10. Circuit breaker por fonte: depois de N falhas seguidas (padrão 3),
 *      a fonte fica "em cooldown" por alguns minutos e é pulada
 *      instantaneamente nas próximas coletas, em vez de gastar o timeout
 *      inteiro de novo tentando uma fonte que acabou de provar estar
 *      fora do ar. `getSourceStatus()` expõe esse estado para uma UI de
 *      diagnóstico (ex.: um painel em Configurações).
 *  11. `collectAll({ forceRefresh: true })` / `collectFromSource(source,
 *      { forceRefresh: true })` — força ignorar o cache de uma coleta
 *      específica sem precisar de `clearCache()` (que apaga tudo).
 */
class GameHubCollector {
  constructor(config = {}) {
    this.gameDatabase = [];
    this._byId = new Map(); // índice para deduplicação O(1)

    this.concurrency = config.concurrency || 3;
    this.cacheExpiry = config.cacheExpiry || 3600000; // 1 hora
    this.requestTimeout = config.requestTimeout || 8000;
    this.retryAttempts = config.retryAttempts || 2;
    this.retryBaseDelay = config.retryBaseDelay || 600;
    this.persistKey = config.persistKey || 'vessieos_gamehub_collector_cache_v2';

    this.sources = [
      {
        name: 'Steam',
        enabled: config.sources?.steam !== false,
        rateLimitMs: 2000,
        parser: () => this._parseSteam()
      },
      {
        name: 'FreeToGame',
        enabled: config.sources?.freetogame !== false,
        rateLimitMs: 1000,
        parser: () => this._parseFreeToGame()
      },
      {
        name: 'itch.io',
        enabled: config.sources?.itchio !== false,
        rateLimitMs: 1500,
        parser: () => this._parseItchIo()
      },
      {
        name: 'CrazyGames',
        enabled: config.sources?.crazygames !== false,
        rateLimitMs: 1500,
        parser: () => this._parseCrazyGames()
      },
      {
        name: 'Local',
        enabled: config.sources?.local !== false,
        rateLimitMs: 0,
        parser: () => this._parseLocalGames()
      },
      {
        name: 'Epic Games',
        enabled: false, // sem endpoint público estável hoje — mantido desligado por padrão
        rateLimitMs: 3000,
        parser: () => this._parseEpicGames()
      }
    ];

    this.isCollecting = false;
    this.collectionLog = [];
    this.cache = new Map(); // sourceName -> { data, timestamp }
    this._lastRequestAt = new Map(); // sourceName -> timestamp (rate limit)

    // ---- circuit breaker por fonte: evita martelar uma fonte que já
    // provou estar fora do ar recentemente, em vez de gastar o timeout
    // inteiro de novo em toda coleta. ----
    this.circuitBreakerThreshold = config.circuitBreakerThreshold ?? 3; // falhas seguidas até abrir
    this.circuitBreakerCooldownMs = config.circuitBreakerCooldownMs ?? 5 * 60000; // 5 min
    this._sourceHealth = new Map(); // sourceName -> { consecutiveFailures, openUntil, lastError, lastSuccessAt }

    this._loadPersistentCache();
  }

  _health(sourceName) {
    if (!this._sourceHealth.has(sourceName)) {
      this._sourceHealth.set(sourceName, { consecutiveFailures: 0, openUntil: 0, lastError: null, lastSuccessAt: null });
    }
    return this._sourceHealth.get(sourceName);
  }

  _isCircuitOpen(sourceName) {
    const health = this._health(sourceName);
    return health.openUntil > Date.now();
  }

  _recordSuccess(sourceName) {
    const health = this._health(sourceName);
    health.consecutiveFailures = 0;
    health.openUntil = 0;
    health.lastSuccessAt = Date.now();
  }

  _recordFailure(sourceName, error) {
    const health = this._health(sourceName);
    health.consecutiveFailures += 1;
    health.lastError = error?.message || String(error);
    if (health.consecutiveFailures >= this.circuitBreakerThreshold) {
      health.openUntil = Date.now() + this.circuitBreakerCooldownMs;
      this.log(`Circuito de "${sourceName}" aberto por ${Math.round(this.circuitBreakerCooldownMs / 1000)}s após ${health.consecutiveFailures} falhas seguidas.`);
    }
  }

  /** Status de saúde de cada fonte — útil para um painel de diagnóstico. */
  getSourceStatus() {
    return this.sources.map((source) => {
      const health = this._health(source.name);
      return {
        name: source.name,
        enabled: source.enabled,
        circuitOpen: this._isCircuitOpen(source.name),
        consecutiveFailures: health.consecutiveFailures,
        lastError: health.lastError,
        lastSuccessAt: health.lastSuccessAt,
        cached: this.cache.has(source.name)
      };
    });
  }

  // ================================================================
  //  COLETA
  // ================================================================

  /**
   * Coleta de todas as fontes habilitadas em paralelo, respeitando
   * `this.concurrency`. Cada fonte que falhar não impede as outras
   * (Promise.allSettled) e é reportada individualmente no resultado.
   */
  async collectAll(options = {}) {
    if (this.isCollecting) {
      this.log('Coleta já em andamento — ignorando chamada duplicada.');
      return this._lastResults || [];
    }

    this.isCollecting = true;
    this.log(`Iniciando coleta automática (concorrência=${this.concurrency}${options.forceRefresh ? ', forceRefresh=true' : ''})...`);

    const enabled = this.sources.filter((s) => s.enabled);
    const results = await this._runWithConcurrency(enabled, this.concurrency, (source) => this._collectOne(source, options));

    this.isCollecting = false;
    this._lastResults = results;
    this._savePersistentCache();
    this.log(`Coleta finalizada: ${results.filter((r) => r.success).length}/${results.length} fontes com sucesso, ${this.gameDatabase.length} jogos no total.`);
    return results;
  }

  async _collectOne(source, options = {}) {
    if (this._isCircuitOpen(source.name)) {
      const health = this._health(source.name);
      const waitMs = health.openUntil - Date.now();
      this.log(`Pulando ${source.name}: circuito aberto por mais ${Math.round(waitMs / 1000)}s (última falha: ${health.lastError}).`);
      return { source: source.name, success: false, skipped: true, error: 'circuit-open' };
    }
    try {
      const games = await this.collectFromSource(source, options);
      this._recordSuccess(source.name);
      return { source: source.name, count: games.length, success: true, games };
    } catch (error) {
      this._recordFailure(source.name, error);
      this.log(`Erro ao coletar de ${source.name}: ${error.message}`);
      return { source: source.name, success: false, error: error.message };
    }
  }

  /** Pool de concorrência simples baseado em Promise, sem dependências externas. */
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

  /**
   * Coleta de uma fonte específica, com cache por-fonte respeitando
   * `cacheExpiry` e rate limiting mínimo entre requisições reais.
   * `options.forceRefresh` ignora o cache dessa fonte (útil para um botão
   * "atualizar agora" na UI, sem precisar de `clearCache()` global).
   */
  async collectFromSource(source, options = {}) {
    const cached = this.cache.get(source.name);
    if (!options.forceRefresh && cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      this.log(`Usando cache de ${source.name} (${cached.data.length} jogos).`);
      this._mergeGames(cached.data);
      return cached.data;
    }

    await this._respectRateLimit(source);
    this.log(`Coletando de ${source.name}${options.forceRefresh ? ' (forçado, ignorando cache)' : ''}...`);

    const games = await this._withRetry(() => source.parser(), this.retryAttempts, `${source.name}`);
    this.cache.set(source.name, { data: games, timestamp: Date.now() });
    this._mergeGames(games);
    return games;
  }

  async _respectRateLimit(source) {
    if (!source.rateLimitMs) return;
    const last = this._lastRequestAt.get(source.name) || 0;
    const wait = source.rateLimitMs - (Date.now() - last);
    if (wait > 0) await this._sleep(wait);
    this._lastRequestAt.set(source.name, Date.now());
  }

  /** Retry com backoff exponencial + jitter (evita martelar uma fonte instável). */
  async _withRetry(fn, attempts, label) {
    let lastError = null;
    for (let attempt = 0; attempt <= attempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (attempt < attempts) {
          const backoff = this.retryBaseDelay * Math.pow(2, attempt);
          const jitter = Math.random() * this.retryBaseDelay;
          this.log(`${label}: tentativa ${attempt + 1}/${attempts + 1} falhou (${error.message}), nova tentativa em ${Math.round(backoff + jitter)}ms.`);
          await this._sleep(backoff + jitter);
        }
      }
    }
    throw lastError;
  }
  _sleep(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

  /** Deduplica por `id` ao inserir novos jogos na base em memória. */
  _mergeGames(games) {
    for (const game of games) {
      if (!game || !game.id) continue;
      if (this._byId.has(game.id)) {
        Object.assign(this._byId.get(game.id), game); // atualiza em vez de duplicar
      } else {
        this._byId.set(game.id, game);
        this.gameDatabase.push(game);
      }
    }
  }

  // ================================================================
  //  PARSERS DE FONTES
  // ================================================================

  async _parseSteam() {
    const response = await this.fetchWithProxy('https://api.steampowered.com/ISteamApps/GetAppList/v2/');
    const data = await response.json();
    return (data.applist?.apps || []).slice(0, 500).map((app) => ({
      id: `steam_${app.appid}`,
      name: app.name,
      source: 'Steam',
      appId: app.appid,
      storeUrl: `https://store.steampowered.com/app/${app.appid}`,
      thumbnail: `https://cdn.cloudflare.steamstatic.com/steam/apps/${app.appid}/header.jpg`,
      type: 'game'
    }));
  }

  /** API pública e gratuita, sem chave — https://www.freetogame.com/api-doc */
  async _parseFreeToGame() {
    const response = await this.fetchWithProxy('https://www.freetogame.com/api/games');
    const data = await response.json();
    return (Array.isArray(data) ? data : []).map((g) => ({
      id: `f2p_${g.id}`,
      name: g.title,
      source: 'FreeToGame',
      genre: g.genre,
      platform: g.platform,
      storeUrl: g.game_url,
      thumbnail: g.thumbnail,
      type: 'game'
    }));
  }

  /** Catálogo público via feed do itch.io (sem autenticação). */
  async _parseItchIo() {
    try {
      const response = await this.fetchWithProxy('https://itch.io/games/newest.xml');
      const text = await response.text();
      const items = [...text.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 60);
      return items.map((match, index) => {
        const block = match[1];
        const title = (block.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || `Jogo itch.io #${index}`;
        const link = (block.match(/<link>([\s\S]*?)<\/link>/) || [])[1] || 'https://itch.io';
        return {
          id: `itchio_${link.split('/').filter(Boolean).pop() || index}`,
          name: this._decodeEntities(title),
          source: 'itch.io',
          storeUrl: link,
          type: 'indie'
        };
      });
    } catch (error) {
      this.log(`itch.io: feed indisponível (${error.message}), pulando esta rodada.`);
      return [];
    }
  }

  /** Lista curada como fallback estável (CrazyGames não tem API pública documentada). */
  async _parseCrazyGames() {
    const curated = [
      ['Rodada Rápida', 'https://www.crazygames.com/'],
      ['Arcade Clássico', 'https://www.crazygames.com/c/arcade'],
      ['Multiplayer .io', 'https://www.crazygames.com/t/io']
    ];
    return curated.map(([name, url], index) => ({
      id: `crazygames_${index}`,
      name,
      source: 'CrazyGames',
      storeUrl: url,
      type: 'web'
    }));
  }

  async _parseLocalGames() {
    try {
      const response = await this._fetchDirect('/api/games/local', { timeoutMs: 2000 });
      const data = await response.json();
      return (data.games || []).map((game) => ({
        id: `local_${game.path}`,
        name: game.name,
        source: 'Local',
        path: game.path,
        executable: game.executable,
        thumbnail: game.thumbnail || null,
        type: 'local'
      }));
    } catch (error) {
      // Não é um erro real: a maioria dos deploys estáticos não tem esse
      // endpoint de backend. Silencioso, sem poluir o log de erros.
      return [];
    }
  }

  async _parseEpicGames() {
    return []; // desabilitado por padrão, ver `this.sources`
  }

  _decodeEntities(str) {
    return String(str).replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  }

  // ================================================================
  //  REDE: fetch direto + fallback de proxies + timeout real
  // ================================================================

  async _fetchDirect(url, { timeoutMs = this.requestTimeout, options = {} } = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        // 'User-Agent' é um cabeçalho proibido pela Fetch API — navegadores
        // o ignoram silenciosamente (não é enviado de verdade), então não
        // adianta nada setá-lo aqui. 'Accept' é permitido e ajuda algumas
        // APIs a devolver JSON em vez de HTML por padrão.
        headers: { Accept: 'application/json, text/plain, */*', ...options.headers },
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response;
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Tenta acesso direto primeiro (mais rápido, sem depender de terceiros)
   * e só recorre a proxies CORS reais quando o navegador bloquear a
   * requisição direta por CORS. `cors-anywhere.herokuapp.com` foi
   * removido (desativado publicamente há anos, sempre falhava).
   * `corsproxy.io` mudou sua API em 2024 e agora exige o parâmetro
   * `?url=` (a versão antiga sem esse parâmetro passou a devolver 400) —
   * corrigido aqui. `codetabs.com` foi adicionado como uma quarta camada
   * de fallback, então uma única falha de proxy não derruba a fonte.
   */
  async fetchWithProxy(url, options = {}) {
    const attempts = [
      { label: 'direto', build: () => url },
      { label: 'corsproxy.io', build: () => `https://corsproxy.io/?url=${encodeURIComponent(url)}` },
      { label: 'allorigins', build: () => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}` },
      { label: 'codetabs', build: () => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}` }
    ];

    let lastError = null;
    for (const attempt of attempts) {
      try {
        const response = await this._fetchDirect(attempt.build(), { options });
        this.log(`Sucesso via ${attempt.label}: ${url}`);
        return response;
      } catch (error) {
        lastError = error;
        this.log(`Proxy "${attempt.label}" falhou para ${url}: ${error.message}`);
      }
    }
    throw lastError || new Error('Todas as estratégias de acesso falharam.');
  }

  // ================================================================
  //  PERSISTÊNCIA
  // ================================================================
  _loadPersistentCache() {
    try {
      const raw = (typeof localStorage !== 'undefined') ? localStorage.getItem(this.persistKey) : null;
      if (!raw) return;
      const parsed = JSON.parse(raw);
      const now = Date.now();
      for (const [sourceName, entry] of Object.entries(parsed.cache || {})) {
        if (now - entry.timestamp < this.cacheExpiry) {
          this.cache.set(sourceName, entry);
          this._mergeGames(entry.data);
        }
      }
      this.log(`Cache persistente carregado: ${this.gameDatabase.length} jogos ainda válidos.`);
    } catch (error) {
      this.log(`Não foi possível carregar o cache persistente: ${error.message}`);
    }
  }

  _savePersistentCache() {
    try {
      if (typeof localStorage === 'undefined') return;
      const cacheObj = {};
      for (const [key, value] of this.cache.entries()) cacheObj[key] = value;
      localStorage.setItem(this.persistKey, JSON.stringify({ cache: cacheObj, savedAt: Date.now() }));
    } catch (error) {
      // Quota excedida ou storage indisponível: não é crítico, só loga.
      this.log(`Não foi possível salvar o cache persistente: ${error.message}`);
    }
  }

  // ================================================================
  //  AUTO-UPDATE
  // ================================================================
  autoUpdate(interval = 3600000) {
    if (this._autoUpdateTimer) clearInterval(this._autoUpdateTimer);
    this.log(`Auto-atualização agendada a cada ${interval}ms.`);
    this._autoUpdateTimer = setInterval(() => {
      this.log('Executando coleta agendada...');
      this.collectAll();
    }, interval);
    return this._autoUpdateTimer;
  }

  stopAutoUpdate() {
    if (this._autoUpdateTimer) { clearInterval(this._autoUpdateTimer); this._autoUpdateTimer = null; }
  }

  // ================================================================
  //  CONSULTA / GESTÃO
  // ================================================================
  getGames(filter = {}) {
    let games = this.gameDatabase;
    if (filter.source) games = games.filter((g) => g.source === filter.source);
    if (filter.type) games = games.filter((g) => g.type === filter.type);
    if (filter.search) {
      const term = filter.search.toLowerCase();
      games = games.filter((g) => g.name.toLowerCase().includes(term));
    }
    return games;
  }

  getGameById(id) { return this._byId.get(id) || null; }

  addGame(game) {
    this._customGameCounter = (this._customGameCounter || 0) + 1;
    const entry = { id: `custom_${Date.now()}_${this._customGameCounter}`, source: 'Custom', ...game };
    this._mergeGames([entry]);
    return entry;
  }

  removeGame(id) {
    if (!this._byId.has(id)) return false;
    this._byId.delete(id);
    const index = this.gameDatabase.findIndex((g) => g.id === id);
    if (index > -1) this.gameDatabase.splice(index, 1);
    return true;
  }

  getStats() {
    return {
      totalGames: this.gameDatabase.length,
      bySource: this.gameDatabase.reduce((acc, g) => { acc[g.source] = (acc[g.source] || 0) + 1; return acc; }, {}),
      byType: this.gameDatabase.reduce((acc, g) => { acc[g.type] = (acc[g.type] || 0) + 1; return acc; }, {}),
      isCollecting: this.isCollecting,
      cachedSources: this.cache.size
    };
  }

  log(message) {
    const entry = { timestamp: new Date().toISOString(), message };
    this.collectionLog.push(entry);
    if (this.collectionLog.length > 500) this.collectionLog.shift();
    console.log(`[GameHub] ${message}`);
  }

  getLog(limit = 50) { return this.collectionLog.slice(-limit); }

  clearCache() {
    this.cache.clear();
    try { if (typeof localStorage !== 'undefined') localStorage.removeItem(this.persistKey); } catch (e) { /* noop */ }
    this.log('Cache limpo.');
  }

  exportAsJSON() {
    return JSON.stringify({ timestamp: new Date().toISOString(), games: this.gameDatabase, stats: this.getStats() }, null, 2);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GameHubCollector;
}
if (typeof window !== 'undefined') {
  window.GameHubCollector = GameHubCollector;
}

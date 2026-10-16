/**
 * EnhancedGameHub – Sistema Completo de Jogos com IA (LM Studio)
 * 
 * Funcionalidades:
 *   - Coleta automática de jogos de múltiplas fontes (Steam, Epic, local)
 *   - Cache inteligente com persistência em localStorage
 *   - Recomendações personalizadas via LM Studio (IA)
 *   - Geração automática de descrições e gêneros via IA
 *   - Avaliação e feedback dos jogos
 *   - Filtros avançados (gênero, plataforma, ano)
 *   - Estatísticas e relatórios
 * 
 * Integração com LM Studio:
 *   - model: 'neural-chat-7b-v3-3' (ou o modelo que estiver rodando)
 *   - endpoint: http://localhost:1234/v1/chat/completions
 * 
 * @version 2.0.0
 */
class EnhancedGameHub extends GameHubCollector {
    constructor(config = {}) {
        super(config);

        // Configuração IA
        this.aiConfig = {
            endpoint: config.aiEndpoint || 'http://localhost:1234/v1/chat/completions',
            model: config.aiModel || 'neural-chat-7b-v3-3',
            temperature: config.temperature || 0.7,
            maxTokens: config.maxTokens || 300,
            retryAttempts: config.retryAttempts || 3,
            retryDelay: config.retryDelay || 2000
        };

        // Estado de recomendações e feedback
        this.recommendations = [];
        this.userPreferences = {
            favoriteGenres: [],
            favoritePlatforms: [],
            playedGames: [],
            ratings: {} // gameId -> rating (1-5)
        };
        this.gameMetadata = new Map(); // id -> { description, genres, tags, releaseYear }

        // Cache persistente (localStorage)
        this._loadPersistentCache();

        // Inicialização da integração IA
        this._setupAI();

        console.log('[EnhancedGameHub] Inicializado com IA integrada.');
    }

    // ================================================================
    //  PERSISTÊNCIA (localStorage)
    // ================================================================
    _loadPersistentCache() {
        try {
            const data = JSON.parse(localStorage.getItem('enhancedGameHub_cache') || '{}');
            this.gameDatabase = data.games || [];
            this.userPreferences = data.preferences || this.userPreferences;
            this.gameMetadata = new Map(Object.entries(data.metadata || {}));
            this.cache.set('persistent', { data: this.gameDatabase, timestamp: Date.now() });
            console.log(`[EnhancedGameHub] Cache carregado (${this.gameDatabase.length} jogos).`);
        } catch (e) {
            console.warn('[EnhancedGameHub] Erro ao carregar cache:', e);
        }
    }

    _savePersistentCache() {
        try {
            const data = {
                games: this.gameDatabase,
                preferences: this.userPreferences,
                metadata: Object.fromEntries(this.gameMetadata)
            };
            localStorage.setItem('enhancedGameHub_cache', JSON.stringify(data));
        } catch (e) {
            console.warn('[EnhancedGameHub] Erro ao salvar cache:', e);
        }
    }

    // ================================================================
    //  CONFIGURAÇÃO DA IA (LM Studio)
    // ================================================================
    _setupAI() {
        this._aiAvailable = false;
        this._aiRetries = 0;
        this._checkAI();
    }

    async _checkAI() {
        try {
            const response = await fetch(this.aiConfig.endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.aiConfig.model,
                    messages: [{ role: 'user', content: 'ping' }],
                    max_tokens: 1
                }),
                signal: AbortSignal.timeout(3000)
            });
            this._aiAvailable = response.ok;
            if (this._aiAvailable) {
                console.log('[EnhancedGameHub] ✅ LM Studio conectado.');
                this._aiRetries = 0;
            } else {
                throw new Error('Resposta inválida');
            }
        } catch (e) {
            this._aiAvailable = false;
            this._aiRetries++;
            if (this._aiRetries < this.aiConfig.retryAttempts) {
                console.warn(`[EnhancedGameHub] ⚠️ IA indisponível, tentativa ${this._aiRetries + 1}/${this.aiConfig.retryAttempts}...`);
                setTimeout(() => this._checkAI(), this.aiConfig.retryDelay);
            } else {
                console.warn('[EnhancedGameHub] ❌ IA indisponível. Usando fallback.');
            }
        }
    }

    // ================================================================
    //  MÉTODOS DE IA
    // ================================================================
    /**
     * Gera recomendações de jogos baseadas nas preferências do usuário.
     */
    async getAIRecommendations(limit = 5) {
        if (!this._aiAvailable) {
            return this._fallbackRecommendations(limit);
        }

        const preferences = this.userPreferences;
        const played = preferences.playedGames || [];
        const favGenres = preferences.favoriteGenres || [];
        const favPlatforms = preferences.favoritePlatforms || [];

        const prompt = `
      Você é um assistente de recomendações de jogos.
      O usuário gosta dos gêneros: ${favGenres.join(', ')}.
      Gosta das plataformas: ${favPlatforms.join(', ')}.
      Já jogou: ${played.join(', ')}.
      Recomende ${limit} jogos que ele provavelmente vai gostar.
      Responda apenas com os nomes dos jogos, um por linha.
    `;

        try {
            const response = await this._callAI(prompt);
            const names = response.split('\n').map(s => s.trim()).filter(Boolean);
            const recommendations = names.slice(0, limit).map(name => {
                // Tenta encontrar o jogo no banco de dados
                const game = this.gameDatabase.find(g => g.name.toLowerCase().includes(name.toLowerCase()));
                return game || { name, source: 'AI', id: `ai_${Date.now()}_${Math.random()}` };
            });
            this.recommendations = recommendations;
            this._savePersistentCache();
            return recommendations;
        } catch (e) {
            console.error('[EnhancedGameHub] Erro na recomendação IA:', e);
            return this._fallbackRecommendations(limit);
        }
    }

    /**
     * Gera uma descrição detalhada para um jogo (usando IA).
     */
    async generateGameDescription(gameId) {
        if (this.gameMetadata.has(gameId) && this.gameMetadata.get(gameId).description) {
            return this.gameMetadata.get(gameId).description;
        }

        const game = this.getGameById(gameId);
        if (!game) throw new Error('Jogo não encontrado');

        if (!this._aiAvailable) {
            return this._fallbackDescription(game);
        }

        const prompt = `
      Crie uma descrição curta (2-3 frases) para o jogo "${game.name}".
      Destaque suas principais características e por que alguém deveria jogá-lo.
    `;

        try {
            const description = await this._callAI(prompt);
            // Atualiza metadados
            if (!this.gameMetadata.has(gameId)) {
                this.gameMetadata.set(gameId, {});
            }
            this.gameMetadata.get(gameId).description = description;
            this._savePersistentCache();
            return description;
        } catch (e) {
            console.error(`[EnhancedGameHub] Erro ao gerar descrição para ${game.name}:`, e);
            return this._fallbackDescription(game);
        }
    }

    /**
     * Classifica um jogo automaticamente (gêneros, tags) usando IA.
     */
    async classifyGame(gameId) {
        const game = this.getGameById(gameId);
        if (!game) throw new Error('Jogo não encontrado');

        if (!this._aiAvailable) {
            return ['Indie', 'Ação']; // fallback
        }

        const prompt = `
      Classifique o jogo "${game.name}" em gêneros (máx 3).
      Responda apenas com os gêneros separados por vírgula.
    `;

        try {
            const genres = await this._callAI(prompt);
            const genreList = genres.split(',').map(g => g.trim()).filter(Boolean);
            if (!this.gameMetadata.has(gameId)) {
                this.gameMetadata.set(gameId, {});
            }
            this.gameMetadata.get(gameId).genres = genreList;
            this._savePersistentCache();
            return genreList;
        } catch (e) {
            console.error(`[EnhancedGameHub] Erro ao classificar ${game.name}:`, e);
            return ['Indie', 'Ação'];
        }
    }

    // ================================================================
    //  MÉTODOS AUXILIARES DA IA
    // ================================================================
    async _callAI(prompt) {
        const response = await fetch(this.aiConfig.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: this.aiConfig.model,
                messages: [
                    { role: 'system', content: 'Você é um assistente especializado em jogos.' },
                    { role: 'user', content: prompt }
                ],
                temperature: this.aiConfig.temperature,
                max_tokens: this.aiConfig.maxTokens
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].message.content.trim();
    }

    _fallbackRecommendations(limit) {
        // Recomenda jogos aleatórios da coleção
        const shuffled = [...this.gameDatabase].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, limit);
    }

    _fallbackDescription(game) {
        return `"${game.name}" é um jogo disponível em ${game.source}. Explore e divirta-se!`;
    }

    // ================================================================
    //  MÉTODOS DO USUÁRIO (feedback e preferências)
    // ================================================================
    rateGame(gameId, rating) {
        if (rating < 1 || rating > 5) throw new Error('Avaliação deve ser entre 1 e 5');
        this.userPreferences.ratings[gameId] = rating;
        this._savePersistentCache();
        this.log(`⭐ Jogo ${gameId} avaliado com ${rating} estrelas.`);
    }

    addFavoriteGenre(genre) {
        if (!this.userPreferences.favoriteGenres.includes(genre)) {
            this.userPreferences.favoriteGenres.push(genre);
            this._savePersistentCache();
        }
    }

    addFavoritePlatform(platform) {
        if (!this.userPreferences.favoritePlatforms.includes(platform)) {
            this.userPreferences.favoritePlatforms.push(platform);
            this._savePersistentCache();
        }
    }

    markAsPlayed(gameId) {
        const game = this.getGameById(gameId);
        if (!game) throw new Error('Jogo não encontrado');
        if (!this.userPreferences.playedGames.includes(game.name)) {
            this.userPreferences.playedGames.push(game.name);
            this._savePersistentCache();
        }
    }

    // ================================================================
    //  PESQUISA AVANÇADA
    // ================================================================
    advancedSearch(filters) {
        let results = this.gameDatabase;

        if (filters.name) {
            results = results.filter(g => g.name.toLowerCase().includes(filters.name.toLowerCase()));
        }
        if (filters.genre) {
            results = results.filter(g => {
                const meta = this.gameMetadata.get(g.id);
                return meta && meta.genres && meta.genres.some(genre => genre.toLowerCase() === filters.genre.toLowerCase());
            });
        }
        if (filters.source) {
            results = results.filter(g => g.source === filters.source);
        }
        if (filters.rating) {
            results = results.filter(g => {
                const rating = this.userPreferences.ratings[g.id];
                return rating && rating >= filters.rating;
            });
        }
        if (filters.type) {
            results = results.filter(g => g.type === filters.type);
        }

        // Ordena por popularidade (simulado)
        results.sort((a, b) => {
            const ratingA = this.userPreferences.ratings[a.id] || 0;
            const ratingB = this.userPreferences.ratings[b.id] || 0;
            return ratingB - ratingA;
        });

        return results;
    }

    // ================================================================
    //  ESTATÍSTICAS AVANÇADAS
    // ================================================================
    getAdvancedStats() {
        const total = this.gameDatabase.length;
        const bySource = this.getStats().bySource;
        const avgRating = total > 0
            ? Object.values(this.userPreferences.ratings).reduce((a, b) => a + b, 0) / Object.keys(this.userPreferences.ratings).length
            : 0;
        const genres = new Set();
        for (const [id, meta] of this.gameMetadata) {
            if (meta.genres) meta.genres.forEach(g => genres.add(g));
        }

        return {
            totalGames: total,
            sources: bySource,
            averageRating: avgRating.toFixed(1),
            totalGenres: genres.size,
            genres: Array.from(genres),
            playedCount: this.userPreferences.playedGames.length,
            favoritesCount: this.userPreferences.favoriteGenres.length
        };
    }

    // ================================================================
    //  SOBRESCRITA DOS MÉTODOS BASE
    // ================================================================
    async collectAll() {
        const results = await super.collectAll();
        // Após coleta, salva cache e tenta classificar automaticamente
        this._savePersistentCache();
        // Classifica alguns jogos em background (sem travar)
        this._autoClassifyGames();
        return results;
    }

    async _autoClassifyGames() {
        if (!this._aiAvailable) return;
        const toClassify = this.gameDatabase.slice(0, 10); // classifica os 10 primeiros
        for (const game of toClassify) {
            try {
                await this.classifyGame(game.id);
            } catch (e) {
                // silencia erros
            }
        }
    }

    // ================================================================
    //  MÉTODO PARA EXPORTAR RELATÓRIO (com IA)
    // ================================================================
    async generateReport() {
        const stats = this.getAdvancedStats();
        const topRated = this.gameDatabase
            .filter(g => this.userPreferences.ratings[g.id])
            .sort((a, b) => (this.userPreferences.ratings[b.id] || 0) - (this.userPreferences.ratings[a.id] || 0))
            .slice(0, 5)
            .map(g => g.name);

        let aiSummary = 'Relatório gerado sem IA.';
        if (this._aiAvailable) {
            try {
                const prompt = `
          Com base nos seguintes dados da biblioteca de jogos:
          Total: ${stats.totalGames}
          Gêneros: ${stats.genres.join(', ')}
          Média de avaliações: ${stats.averageRating}
          Jogos mais jogados: ${topRated.join(', ')}
          Escreva um resumo conciso (2 frases) sobre a biblioteca e sugestões.
        `;
                aiSummary = await this._callAI(prompt);
            } catch (e) {
                aiSummary = 'IA indisponível no momento.';
            }
        }

        return {
            stats,
            topRated,
            aiSummary,
            generatedAt: new Date().toISOString()
        };
    }
}
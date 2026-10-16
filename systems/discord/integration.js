/**
 * Discord Integration System for VessieOS
 * Complete Discord bot and webhook integration without custom webhooks
 */

class DiscordIntegration {
  constructor(config = {}) {
    this.clientId = config.clientId;
    this.guildId = config.guildId;
    this.apiBaseUrl = 'https://discord.com/api/v10';
    this.isConnected = false;
    this.channels = [];
    this.messages = [];
    this.users = [];
    this.events = [];
    this.rateLimiter = new Map();
    this.maxMessagesCache = 1000;
    this.eventLog = [];
  }

  /**
   * Initialize Discord connection via OAuth2
   */
  async init(accessToken) {
    try {
      this.accessToken = accessToken;
      
      console.log('[Discord] Fetching user information...');
      const user = await this.fetchAPI('/users/@me');
      
      this.currentUser = user;
      this.isConnected = true;
      this.log(`✓ Connected as ${user.username}#${user.discriminator}`);
      
      return user;
    } catch (error) {
      this.log(`✗ Connection failed: ${error.message}`);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Fetch API with rate limiting
   */
  async fetchAPI(endpoint, options = {}) {
    if (!this.accessToken && !options.noAuth) {
      throw new Error('Not authenticated');
    }

    // Rate limiting check
    if (this.isRateLimited(endpoint)) {
      await this.delay(1000);
    }

    const url = `${this.apiBaseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...(!options.noAuth && { 'Authorization': `Bearer ${this.accessToken}` })
    };

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
      });

      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        this.setRateLimitTimer(endpoint, parseInt(retryAfter) * 1000);
        await this.delay(parseInt(retryAfter) * 1000);
        return this.fetchAPI(endpoint, options);
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      this.log(`API Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get guild channels
   */
  async getChannels(guildId = this.guildId) {
    try {
      this.log(`Fetching channels for guild ${guildId}...`);
      const channels = await this.fetchAPI(`/guilds/${guildId}/channels`);
      
      this.channels = channels.filter(c => c.type === 0 || c.type === 1); // Text and DM
      this.log(`✓ Loaded ${this.channels.length} channels`);
      
      return this.channels;
    } catch (error) {
      this.log(`Error loading channels: ${error.message}`);
      return [];
    }
  }

  /**
   * Send message to channel
   */
  async sendMessage(channelId, message) {
    try {
      if (typeof message === 'string') {
        message = { content: message };
      }

      const response = await this.fetchAPI(`/channels/${channelId}/messages`, {
        method: 'POST',
        body: message
      });

      this.messages.push(response);
      if (this.messages.length > this.maxMessagesCache) {
        this.messages.shift();
      }

      this.log(`✓ Message sent to channel ${channelId}`);
      return response;
    } catch (error) {
      this.log(`Error sending message: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get channel messages
   */
  async getMessages(channelId, limit = 50) {
    try {
      const messages = await this.fetchAPI(`/channels/${channelId}/messages?limit=${limit}`);
      this.log(`✓ Loaded ${messages.length} messages from channel ${channelId}`);
      return messages;
    } catch (error) {
      this.log(`Error loading messages: ${error.message}`);
      return [];
    }
  }

  /**
   * Create channel (requires manage_channels)
   */
  async createChannel(guildId, channelData) {
    try {
      const channel = await this.fetchAPI(`/guilds/${guildId}/channels`, {
        method: 'POST',
        body: {
          name: channelData.name,
          type: channelData.type || 0,
          topic: channelData.topic,
          nsfw: channelData.nsfw || false
        }
      });

      this.channels.push(channel);
      this.log(`✓ Channel created: ${channel.name}`);
      return channel;
    } catch (error) {
      this.log(`Error creating channel: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get guild members
   */
  async getMembers(guildId = this.guildId) {
    try {
      const members = await this.fetchAPI(`/guilds/${guildId}/members?limit=1000`);
      this.users = members.map(m => m.user);
      this.log(`✓ Loaded ${members.length} members`);
      return members;
    } catch (error) {
      this.log(`Error loading members: ${error.message}`);
      return [];
    }
  }

  /**
   * Create embed message
   */
  createEmbed(data = {}) {
    return {
      title: data.title,
      description: data.description,
      color: data.color || 0x7c5cff,
      fields: data.fields || [],
      author: data.author,
      footer: {
        text: data.footerText || 'VessieOS',
        icon_url: data.footerIcon
      },
      timestamp: new Date().toISOString(),
      thumbnail: data.thumbnail,
      image: data.image
    };
  }

  /**
   * Send embed message
   */
  async sendEmbed(channelId, embed) {
    try {
      return await this.sendMessage(channelId, { embeds: [embed] });
    } catch (error) {
      this.log(`Error sending embed: ${error.message}`);
      throw error;
    }
  }

  /**
   * React to message
   */
  async addReaction(channelId, messageId, emoji) {
    try {
      const encodedEmoji = encodeURIComponent(emoji);
      await this.fetchAPI(`/channels/${channelId}/messages/${messageId}/reactions/${encodedEmoji}/@me`, {
        method: 'PUT'
      });

      this.log(`✓ Reaction added: ${emoji}`);
      return true;
    } catch (error) {
      this.log(`Error adding reaction: ${error.message}`);
      throw error;
    }
  }

  /**
   * Setup Discord OAuth2 flow
   * Bug corrigido: a versão anterior montava a URL como
   * `${apiBaseUrl}/../oauth2/authorize`, que ao ser normalizada pelo
   * navegador vira `https://discord.com/api/oauth2/authorize` — path
   * errado (o authorize do Discord fica em /oauth2/authorize, sem /api).
   * Isso fazia o botão "Entrar com Discord" cair numa página 404/erro
   * do Discord em vez de abrir a tela de autorização.
   */
  getOAuthUrl(redirectUri, scopes = ['identify', 'guilds']) {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(' ')
    });

    return `https://discord.com/oauth2/authorize?${params.toString()}`;
  }

  /**
   * Exchange code for token
   *
   * IMPORTANTE (segurança): o endpoint /oauth2/token do Discord exige o
   * corpo em `application/x-www-form-urlencoded`, não JSON — a versão
   * anterior enviava JSON via fetchAPI() e o Discord respondia sempre
   * com 400 "Invalid Form Body", então o login por OAuth2 nunca
   * completava. Corrigido aqui com uma chamada fetch própria.
   *
   * MAIS IMPORTANTE ainda: `clientSecret` NUNCA pode viver em código que
   * roda no navegador do usuário (HTML/JS servidos estaticamente, como
   * neste projeto). Qualquer pessoa que abrir o DevTools vê o secret e
   * pode se passar pela sua aplicação Discord. Esta função continua
   * aceitando `clientSecret` como parâmetro para quem tiver um backend
   * próprio fazendo essa troca (ex: uma função serverless que recebe o
   * `code` do cliente e devolve só o token), mas o app não deve chamar
   * `exchangeCode` diretamente de um `<script>` estático com o secret
   * embutido. Para uso 100% estático (GitHub Pages), prefira o fluxo
   * implicit já usado em systems/online/auth.js (getDiscordLoginUrl),
   * que não precisa de client secret.
   */
  async exchangeCode(code, redirectUri, clientSecret) {
    try {
      const body = new URLSearchParams({
        client_id: this.clientId,
        client_secret: clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      });

      const res = await fetch(`${this.apiBaseUrl}/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString()
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => res.statusText);
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }

      const response = await res.json();
      this.accessToken = response.access_token;
      await this.init(response.access_token);

      return response;
    } catch (error) {
      this.log(`Error exchanging code: ${error.message}`);
      throw error;
    }
  }

  /**
   * Setup event listener (polling)
   */
  async startEventPolling(interval = 5000) {
    this.log('Starting event polling...');

    setInterval(async () => {
      try {
        // Poll for new messages and events
        for (const channel of this.channels) {
          const messages = await this.getMessages(channel.id, 5);
          
          for (const msg of messages) {
            if (msg.id && !this.messages.find(m => m.id === msg.id)) {
              this.triggerEvent('message', msg);
            }
          }
        }
      } catch (error) {
        // Silently handle polling errors
      }
    }, interval);
  }

  /**
   * Trigger event
   */
  triggerEvent(eventType, data) {
    const event = { type: eventType, data, timestamp: Date.now() };
    this.events.push(event);
    
    document.dispatchEvent(new CustomEvent(`discord-${eventType}`, {
      detail: data
    }));

    this.log(`Event triggered: ${eventType}`);
  }

  /**
   * Rate limiter helpers
   */
  isRateLimited(endpoint) {
    const timer = this.rateLimiter.get(endpoint);
    return timer && timer > Date.now();
  }

  setRateLimitTimer(endpoint, ms) {
    this.rateLimiter.set(endpoint, Date.now() + ms);
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Logging
   */
  log(message) {
    const entry = {
      timestamp: new Date().toISOString(),
      message
    };
    this.eventLog.push(entry);
    console.log(`[Discord] ${message}`);
  }

  /**
   * Get event log
   */
  getLog(limit = 50) {
    return this.eventLog.slice(-limit);
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      currentUser: this.currentUser,
      channels: this.channels.length,
      cachedMessages: this.messages.length,
      users: this.users.length
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DiscordIntegration;
}

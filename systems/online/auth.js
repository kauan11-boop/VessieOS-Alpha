/**
 * VessieOS Authentication System
 * GitHub & Discord OAuth2 integration for online functionality
 */

class AuthenticationSystem {
  constructor(config = {}) {
    this.discord = {
      clientId: config.discordClientId || '',
      redirectUri: config.discordRedirectUri || 'https://yourusername.github.io/callback.html',
      scopes: ['identify', 'email', 'guilds', 'guilds.join', 'messages.read'],
      accessToken: null,
      user: null
    };

    this.github = {
      clientId: config.githubClientId || '',
      redirectUri: config.githubRedirectUri || 'https://yourusername.github.io/callback.html',
      scopes: ['user:email', 'repo', 'gist'],
      accessToken: null,
      user: null
    };

    this.localStorage = {
      discordToken: 'VessieOS_Discord_Token',
      githubToken: 'VessieOS_GitHub_Token',
      discordUser: 'VessieOS_Discord_User',
      githubUser: 'VessieOS_GitHub_User'
    };

    this.log('Auth system initialized');
    this.loadStoredTokens();
  }

  /**
   * Load tokens from localStorage
   */
  loadStoredTokens() {
    const discordToken = localStorage.getItem(this.localStorage.discordToken);
    const githubToken = localStorage.getItem(this.localStorage.githubToken);
    const discordUser = localStorage.getItem(this.localStorage.discordUser);
    const githubUser = localStorage.getItem(this.localStorage.githubUser);

    if (discordToken) {
      this.discord.accessToken = discordToken;
      this.discord.user = JSON.parse(discordUser || '{}');
      this.log('✓ Discord token loaded');
    }

    if (githubToken) {
      this.github.accessToken = githubToken;
      this.github.user = JSON.parse(githubUser || '{}');
      this.log('✓ GitHub token loaded');
    }
  }

  /**
   * Discord Login - returns OAuth URL
   */
  getDiscordLoginUrl() {
    const params = new URLSearchParams({
      client_id: this.discord.clientId,
      redirect_uri: this.discord.redirectUri,
      response_type: 'token',
      scope: this.discord.scopes.join(' ')
    });

    return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
  }

  /**
   * GitHub Login - returns OAuth URL
   */
  getGitHubLoginUrl() {
    const params = new URLSearchParams({
      client_id: this.github.clientId,
      redirect_uri: this.github.redirectUri,
      scope: this.github.scopes.join(' '),
      state: this.generateState()
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  /**
   * Handle Discord OAuth callback
   */
  async handleDiscordCallback(hash) {
    const params = new URLSearchParams(hash.replace('#', '?'));
    const token = params.get('access_token');
    const error = params.get('error');

    if (error) {
      this.log(`Discord auth error: ${error}`);
      throw new Error(`Discord auth failed: ${error}`);
    }

    if (token) {
      this.discord.accessToken = token;
      localStorage.setItem(this.localStorage.discordToken, token);

      // Fetch user info
      const user = await this.fetchDiscordUser(token);
      this.discord.user = user;
      localStorage.setItem(this.localStorage.discordUser, JSON.stringify(user));

      this.log(`✓ Discord authenticated as ${user.username}`);
      return user;
    }

    throw new Error('No token received from Discord');
  }

  /**
   * Handle GitHub OAuth callback
   */
  async handleGitHubCallback(code, state) {
    // Note: Requires backend server for token exchange
    // This is a client-side hint for the backend
    
    try {
      // Exchange code for token on backend
      const response = await fetch('/api/auth/github/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, state })
      });

      if (!response.ok) {
        throw new Error('Token exchange failed');
      }

      const data = await response.json();
      this.github.accessToken = data.access_token;
      localStorage.setItem(this.localStorage.githubToken, data.access_token);

      // Fetch user info
      const user = await this.fetchGitHubUser(data.access_token);
      this.github.user = user;
      localStorage.setItem(this.localStorage.githubUser, JSON.stringify(user));

      this.log(`✓ GitHub authenticated as ${user.login}`);
      return user;
    } catch (error) {
      this.log(`GitHub auth error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetch Discord user info
   */
  async fetchDiscordUser(token) {
    const response = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Discord user');
    }

    return response.json();
  }

  /**
   * Fetch GitHub user info
   */
  async fetchGitHubUser(token) {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch GitHub user');
    }

    return response.json();
  }

  /**
   * Discord API call
   */
  async discordAPI(endpoint, options = {}) {
    if (!this.discord.accessToken) {
      throw new Error('Not authenticated with Discord');
    }

    const response = await fetch(`https://discord.com/api/v10${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${this.discord.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (response.status === 401) {
      this.logout('discord');
      throw new Error('Discord token expired');
    }

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * GitHub API call
   */
  async githubAPI(endpoint, options = {}) {
    if (!this.github.accessToken) {
      throw new Error('Not authenticated with GitHub');
    }

    const response = await fetch(`https://api.github.com${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${this.github.accessToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (response.status === 401) {
      this.logout('github');
      throw new Error('GitHub token expired');
    }

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Logout
   */
  logout(provider = 'all') {
    if (provider === 'discord' || provider === 'all') {
      this.discord.accessToken = null;
      this.discord.user = null;
      localStorage.removeItem(this.localStorage.discordToken);
      localStorage.removeItem(this.localStorage.discordUser);
      this.log('Discord logout');
    }

    if (provider === 'github' || provider === 'all') {
      this.github.accessToken = null;
      this.github.user = null;
      localStorage.removeItem(this.localStorage.githubToken);
      localStorage.removeItem(this.localStorage.githubUser);
      this.log('GitHub logout');
    }
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(provider = 'any') {
    if (provider === 'discord') {
      return !!this.discord.accessToken;
    }
    if (provider === 'github') {
      return !!this.github.accessToken;
    }
    return !!this.discord.accessToken || !!this.github.accessToken;
  }

  /**
   * Get current user
   */
  getCurrentUser(provider = 'any') {
    if (provider === 'discord') {
      return this.discord.user;
    }
    if (provider === 'github') {
      return this.github.user;
    }

    return {
      discord: this.discord.user,
      github: this.github.user
    };
  }

  /**
   * Generate random state
   */
  generateState() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, array));
  }

  /**
   * Logging
   */
  log(message) {
    console.log(`[Auth] ${message}`);
  }

  /**
   * Refresh token
   */
  async refreshToken(provider) {
    if (provider === 'discord') {
      // Discord implicit flow doesn't support refresh
      // User would need to re-authenticate
      this.log('Discord token refresh not supported (implicit flow)');
      return;
    }

    if (provider === 'github') {
      // GitHub requires backend to refresh
      try {
        const response = await fetch('/api/auth/github/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          const data = await response.json();
          this.github.accessToken = data.access_token;
          localStorage.setItem(this.localStorage.githubToken, data.access_token);
          this.log('✓ GitHub token refreshed');
        }
      } catch (error) {
        this.log(`Token refresh error: ${error.message}`);
      }
    }
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      discord: {
        authenticated: !!this.discord.accessToken,
        user: this.discord.user?.username || null
      },
      github: {
        authenticated: !!this.github.accessToken,
        user: this.github.user?.login || null
      }
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthenticationSystem;
}

// Exposto em window para que callback.html e a UI de Configurações do
// VessieOS (JS/apps/settings/settings.js) consigam instanciar/usar esta classe sem
// precisar de um bundler. Antes desta correção, este arquivo nem sequer
// era carregado por index.html — ver JS/systems/desktop/main.js.
if (typeof window !== 'undefined') {
  window.AuthenticationSystem = AuthenticationSystem;
}

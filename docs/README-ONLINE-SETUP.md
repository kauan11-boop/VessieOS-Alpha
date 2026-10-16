# VessieOS - Sistema Online Completo
## Configuração e Guia de Uso

### 📋 Resumo

VessieOS agora é um sistema operacional completo funcionando na web com suporte a:
- ✅ Interface responsiva (mobile-first)
- ✅ Integração com IA (LM Studio)
- ✅ Discord OAuth2 (sem webhooks)
- ✅ Rede Social completa
- ✅ Game Hub automático
- ✅ Modo offline com Service Worker
- ✅ Sincronização automática

---

## 🗂️ Estrutura de Pastas

```
VessieOS/
├── index.html                    # Landing page & portal principal
├── callback.html                 # OAuth2 callback handler
├── VessieOS.html                 # Sistema clássico (legacy)
├── CSS/
│   └── base/
│       └── responsive.css        # Framework responsivo
├── HTML/
│   └── systems/
│       └── dashboard.html        # Dashboard principal
├── JS/
│   └── kernel/
│       ├── responsive-renderer.js
│       ├── lm-studio-ai.js
│       ├── windows-executor.js
│       ├── module-system.js
│       ├── web-content-fetcher.js
│       ├── boot-manager.js
│       ├── config.js
│       └── modules/             # Módulos customizados
├── systems/
│   ├── online/
│   │   ├── manager.js          # Gerenciador online
│   │   ├── auth.js             # Autenticação OAuth2
│   │   └── sw.js               # Service Worker
│   ├── discord/
│   │   └── integration.js       # Discord API
│   ├── social/
│   │   └── network.js           # Rede Social
│   └── game-hub/
│       └── collector.js         # Coletor de jogos
└── README-ONLINE-SETUP.md       # Este arquivo
```

---

## 🚀 Começando

### 1. Instalação Local

```bash
# Clonar repositório
git clone https://github.com/seu-usuario/VessieOS.git
cd VessieOS

# Servir localmente (requer Python 3)
python -m http.server 8000

# Acessar em http://localhost:8000
```

### 2. Deployment no GitHub Pages

```bash
# Fazer push para GitHub
git add .
git commit -m "VessieOS Online System"
git push origin main

# Habilitar GitHub Pages nas settings
# URL: https://seu-usuario.github.io/VessieOS
```

---

## 🔐 Configuração de Autenticação

### Discord OAuth2

1. **Criar aplicação Discord**
   - Ir para https://discord.com/developers/applications
   - Clicar em "New Application"
   - Nomear como "VessieOS"

2. **Configurar OAuth2**
   - Na seção "OAuth2"
   - Adicionar Redirect URI: `https://seu-username.github.io/VessieOS/callback.html`
   - Copiar Client ID

3. **Atualizar config.js**
   ```javascript
   discord: {
     clientId: 'SEU_CLIENT_ID_AQUI',
     redirectUri: 'https://seu-username.github.io/VessieOS/callback.html'
   }
   ```

### GitHub OAuth2

1. **Criar OAuth App**
   - Settings → Developer settings → OAuth Apps
   - New OAuth App
   - Nome: "VessieOS"
   - Authorization callback URL: `https://seu-username.github.io/VessieOS/callback.html`

2. **Copiar credenciais**
   - Client ID
   - Client Secret (armazenar seguro, nunca no cliente!)

---

## 📱 Responsividade

O sistema usa 6 breakpoints:

```css
/* Mobile First Approach */
xs:   0px     /* Extra Small */
sm:   576px   /* Small */
md:   768px   /* Medium */
lg:   992px   /* Large */
xl:   1200px  /* Extra Large */
xxl:  1400px  /* Ultra Large */
```

Usar CSS custom properties:

```css
@media (min-width: 768px) {
    .container { width: 100%; }
}

/* Ou usar variáveis */
.grid {
    --cols: 1;
}
@media (min-width: 768px) {
    .grid { --cols: 2; }
}
```

---

## 🤖 Integração LM Studio

### Inicializar

```javascript
const ai = new LMStudioAI({
    host: 'http://localhost:1234',
    model: 'sua-model',
    temperature: 0.7
});

await ai.initialize();
```

### Usar IA

```javascript
// Chat simples
const response = await ai.chat('Olá, como você está?');

// Com histórico
const conversation = await ai.createConversation();
await conversation.addMessage('user', 'Qual é 2+2?');
const answer = await conversation.generateResponse();

// Streaming
const stream = await ai.streamChat('Conte uma história');
stream.on('chunk', (text) => console.log(text));
```

---

## 👥 Sistema de Rede Social

### Criar conta

```javascript
const social = new SocialNetworkSystem();

const user = social.createUser({
    id: 'user123',
    username: 'seu_nome',
    bio: 'Sua bio',
    avatar: 'url_avatar'
});
```

### Postar

```javascript
const post = social.createPost({
    authorId: 'user123',
    content: 'Olá VessieOS!',
    tags: ['#vessie', '#online']
});
```

### Seguir usuários

```javascript
social.followUser('user123', 'user456');

// Ver feed
const feed = social.getUserFeed('user123');
```

### Comentários e Likes

```javascript
// Comentar
const comment = social.addComment('post123', 'user123', 'Ótimo post!');

// Like
social.addLike('post123', 'user123');
```

---

## 🎮 Game Hub Automático

### Inicializar

```javascript
const gameHub = new GameHubCollector({
    autoFetch: true,
    proxyFallback: true,
    cacheTTL: 24 * 60 * 60 // 24 horas
});
```

### Buscar jogos

```javascript
// Automático (com retry)
const games = await gameHub.fetchGames();

// Com filtros
const filteredGames = games.filter(g => g.rating > 4.0);
```

---

## 📡 Modo Offline

O Service Worker automaticamente:
- ✅ Cacheia recursos estáticos
- ✅ Oferece fallback de página offline
- ✅ Sincroniza quando volta online
- ✅ Armazena dados em IndexedDB

### Verificar status

```javascript
const online = new OnlineSystemManager();

const status = online.getStatus();
console.log(status);
// {
//   isOnline: true,
//   syncQueueLength: 2,
//   storageType: 'indexeddb',
//   database: 'ready'
// }
```

---

## 💾 Persistência de Dados

### IndexedDB (Recomendado)

```javascript
const online = new OnlineSystemManager({
    storageType: 'indexeddb'
});

// Salvar dados
await online.saveData('users', { id: 1, name: 'João' });

// Carregar dados
const user = await online.loadData('users', 1);
```

### localStorage (Fallback)

```javascript
const online = new OnlineSystemManager({
    storageType: 'localStorage'
});
```

---

## 🔄 Sincronização Automática

```javascript
// Fila automática a cada 30 segundos
const online = new OnlineSystemManager({
    syncInterval: 30000
});

// Enfileirar para sincronização
online.queueForSync('posts', postData, githubToken);

// Sincronizar manualmente
await online.syncData();
```

---

## 🧪 Testando Localmente

### Com Live Server

```bash
# Instalar VS Code Live Server extension
# Clicar em "Go Live" no canto inferior direito
```

### Com Python

```bash
cd VessieOS
python -m http.server 8000
# Acessar http://localhost:8000
```

### Com Node.js

```bash
npx http-server -c-1
```

---

## 📚 API Reference

### AuthenticationSystem

```javascript
const auth = new AuthenticationSystem({
    discordClientId: 'YOUR_ID',
    discordRedirectUri: 'https://...',
    githubClientId: 'YOUR_ID',
    githubRedirectUri: 'https://...'
});

auth.getDiscordLoginUrl()        // Obter URL login
auth.getGitHubLoginUrl()         // Obter URL login
auth.handleDiscordCallback(hash) // Processar callback
auth.isAuthenticated('discord')  // Verificar auth
auth.logout('all')               // Fazer logout
```

### OnlineSystemManager

```javascript
const online = new OnlineSystemManager();

online.saveData(store, data)           // Salvar
online.loadData(store, id)             // Carregar
online.syncData()                      // Sincronizar
online.queueForSync(store, data)       // Enfileirar
online.getStatus()                     // Status
online.getLog(50)                      // Últimos logs
```

### SocialNetworkSystem

```javascript
const social = new SocialNetworkSystem();

social.createUser(userData)             // Criar usuário
social.createPost(postData)             // Criar post
social.addComment(postId, userId, text) // Comentar
social.addLike(postId, userId)          // Dar like
social.followUser(userId, targetId)     // Seguir
social.getUserFeed(userId)              // Obter feed
```

---

## 🐛 Troubleshooting

### Service Worker não registra

```javascript
// Verificar se está em HTTPS ou localhost
console.log(navigator.serviceWorker);

// Limpar cache
await caches.delete('VessieOS-v1');
```

### IndexedDB não funciona

```javascript
// Verificar suporte
if ('indexedDB' in window) {
    console.log('IndexedDB disponível');
} else {
    console.log('Usando localStorage');
}
```

### CORS em GitHub Pages

Usar proxy CORS recomendado na config:

```javascript
const config = {
    corsProxy: 'https://cors-anywhere.herokuapp.com'
};
```

---

## 📝 Próximos Passos

- [ ] Implementar backend Node.js para GitHub OAuth
- [ ] Adicionar push notifications
- [ ] Criar PWA completo
- [ ] Implementar real-time sync com WebSocket
- [ ] Adicionar cloud backup
- [ ] Criar mobile app (React Native)

---

## 📄 Licença

MIT - Livre para usar e modificar

---

## 🤝 Contribuindo

Pull requests são bem-vindos!

```bash
git checkout -b feature/minha-feature
git commit -am 'Adicionar nova feature'
git push origin feature/minha-feature
```

---

**Última atualização:** 2024
**Versão:** 2.0.0

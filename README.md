# VessieOS

Sistema operacional web — desktop completo no navegador, com janelas arrastáveis, apps, IA local via LM Studio e hospedagem 100% estática, pronta para o **GitHub Pages**.

## ✨ Principais recursos

- 🧩 **Apps separados em iframe** — HTML+CSS+JS em pastas, isolados por sandbox, falando com o SO por 331 comandos ([`docs/APPS-IFRAME.md`](docs/APPS-IFRAME.md), [`docs/COMANDOS.md`](docs/COMANDOS.md))
- 🧠 **Rede neural + Deep RL** — agente Double DQN em JS puro que aprende seus hábitos e sugere apps no Menu Iniciar ([`docs/NEURAL-CORE.md`](docs/NEURAL-CORE.md))
- 🖥️ **Desktop completo** — janelas arrastáveis, taskbar, menu iniciar, notificações
- 🤖 **IA integrada (LM Studio)** — chat com streaming, conectado a um modelo rodando localmente
- 💬 **Discord** — integração via OAuth2 (API v10, sem webhooks)
- 👥 **Rede social** — posts, comentários, curtidas e seguidores
- 🎮 **Game Hub** — coletor automático de jogos com fallback de proxy
- 📡 **Modo offline** — Service Worker com cache e sincronização automática
- 📱 **Responsivo** — funciona de telas pequenas a ultra-wide

## 🚀 Começando

### Rodar localmente

```bash
git clone https://github.com/<seu-usuario>/VessieOS.git
cd VessieOS
python -m http.server 8000
# Acesse http://localhost:8000
```

### Publicar no GitHub Pages

1. Faça push do repositório para o GitHub
2. Em **Settings → Pages**, selecione a branch de publicação (ex.: `main`)
3. O site fica em `https://<seu-usuario>.github.io/<repositorio>/`

> O arquivo `.nojekyll` já está incluso, e todos os caminhos internos (Service Worker, callback de OAuth, assets) são relativos — o projeto funciona tanto na raiz de um domínio quanto em um subcaminho de projeto do GitHub Pages.

### Pontos de entrada

| Arquivo | Descrição |
|---|---|
| `index.html` | Landing page — apresentação, features, status do sistema |
| `VessieOS.html` | O sistema desktop completo (a "OS" em si) |
| `HTML/systems/dashboard.html` | Dashboard de testes dos subsistemas |
| `callback.html` | Callback de autenticação OAuth2 (Discord/GitHub) |

## 📁 Estrutura

```
VessieOS/
├── JS/
│   ├── core/        → boot, storage, tema, gráficos, eventos
│   ├── kernel/       → kernel do sistema, módulos, IA, executor
│   └── modules/       → janelas, taskbar, menu iniciar, notificações
├── CSS/
│   ├── base/          → reset, layout, tema, responsividade
│   └── components/    → estilos de cada componente da UI
├── systems/
│   ├── online/         → autenticação, sincronização, Service Worker
│   ├── discord/         → integração Discord (OAuth2 + API v10)
│   └── social/            → rede social
└── docs/                    → guias detalhados (setup, arquitetura, status)
```

Para configuração de OAuth (Discord/GitHub), integração com LM Studio e mais detalhes de arquitetura, veja a pasta [`docs/`](docs/):

- [`docs/QUICK-START.md`](docs/QUICK-START.md) — guia rápido de uso
- [`docs/README-COMPLETE-SYSTEM.md`](docs/README-COMPLETE-SYSTEM.md) — visão geral técnica dos sistemas
- [`docs/README-ONLINE-SETUP.md`](docs/README-ONLINE-SETUP.md) — setup de autenticação e sincronização online
- [`docs/README-IMPLEMENTATION-STATUS.md`](docs/README-IMPLEMENTATION-STATUS.md) — status de implementação

## ⚠️ Limitações conhecidas

- A IA (LM Studio) precisa rodar localmente na máquina de quem acessa o site — não há backend de IA hospedado.
- O sistema de módulos automáticos (`JS/kernel/module-system.js`) espera uma API de backend (`/api/modules/*`) que não existe neste projeto estático — hoje essa automação não funciona no GitHub Pages sem um servidor adicional.
- Login via Discord/GitHub usa fluxo OAuth2 client-side; a troca de código por token do GitHub normalmente exige um backend (aqui o código é apenas armazenado, sem troca completa).

## 📄 Licença

MIT — livre para usar e modificar.

## 🔀 Fusão desta versão (VessieOS-Real + VessieOS-menu-iniciar-v2)

Este pacote junta os dois arquivos enviados:

- **Base estrutural:** `VessieOS-menu-iniciar-v2` — tinha o Menu Iniciar
  reescrito (3 vistas: Fixados/Todos os apps/Busca, tiles maiores, menu de
  energia), a linguagem **VessieLang** (B1/J3/G5/FULL) já integrada ao
  kernel, e o coletor de sites já numa v2 bem mais robusta.
- **Trazido de volta do `VessieOS-Real`:** a integração do **VessieScript**
  (motor + comandos reais + adaptador de kernel + adaptador de C#), o
  comando `vessie` no Terminal, a unificação do filesystem
  (`window.VessieOS.FileSystem`), e 4 módulos extras do kernel
  (power-management, search-spotlight, widgets-board, clipboard-manager)
  que a v2 do menu ainda não tinha.

**Resultado:** as duas linguagens do ecossistema coexistem — `vessie` no
Terminal roda VessieScript, `vl`/o runtime do VessieLang continua
funcionando como estava. Ambas compartilham o mesmo filesystem real.

**Bug de CSS encontrado e corrigido durante a fusão:** `CSS/base/main.css`
tinha uma regra `#sm { display: none; ... }` antiga (do Menu Iniciar v1),
carregada *depois* da nova `start-menu.css` — isso fazia o Menu Iniciar v2
nunca aparecer, mesmo com a classe `.open` sendo aplicada corretamente.
Removida a regra antiga (mantidas as sub-regras de scrollbar, que ainda
são usadas). Confirmado com screenshot que o menu abre normalmente agora.

### Coletor de sites aprimorado (v3)

`JS/systems/game-hub-collector.js` e `JS/kernel/web-content-fetcher.js`
ganharam mais uma rodada de melhorias nesta fusão, testadas com um mock de
`fetch` no Node (assertivas sobre formato de URL, cache, circuito e
forceRefresh, todas passando):

- **`corsproxy.io` corrigido** — a API deles mudou em 2024 e passou a
  exigir o parâmetro `?url=`; a chamada antiga (sem esse parâmetro) vinha
  retornando 400 silenciosamente e caindo pro próximo proxy sem avisar.
- **`codetabs.com` adicionado** como 4ª camada de fallback de proxy.
- **`User-Agent` removido** dos headers — é um cabeçalho proibido pela
  Fetch API (o navegador o descarta sozinho); não fazia nada além de
  poluir o console. Substituído por `Accept`, que é respeitado de verdade.
- **Circuit breaker por fonte/motor de busca** — depois de N falhas
  seguidas (padrão 3), a fonte fica em cooldown por alguns minutos e é
  **pulada instantaneamente** nas coletas seguintes, em vez de gastar o
  timeout inteiro de novo numa fonte que acabou de provar estar fora do
  ar. Consultável via `collector.getSourceStatus()` — dá pra ligar isso a
  um painel de diagnóstico em Configurações.
- **`forceRefresh`** — `collectAll({ forceRefresh: true })` e
  `search(query, { forceRefresh: true })` ignoram o cache pontualmente,
  sem precisar de `clearCache()` (que apaga tudo).

## 📱 Compatibilidade mobile + Registro JSON + Pasta Windows bloqueada + Easter egg renomeado

Mais uma rodada de melhorias, todas testadas com Playwright (desktop e
emulação de iPhone 13 real, incluindo diálogos nativos interceptados):

### Compatibilidade com celular/tablet
- **Bug real corrigido:** o texto "VessieOS" da tela de boot estourava a
  largura da tela em qualquer celular (`font-size` fixo de 3.6rem +
  letter-spacing de 16px). Agora usa `clamp()` responsivo.
- **Arrastar janela por toque** — antes só funcionava com mouse
  (`mousedown/mousemove/mouseup`); adicionados os equivalentes de toque
  (`touchstart/touchmove/touchend`).
- **Janelas em tela cheia no celular** (`CSS/base/mobile.css`, abaixo de
  700px) — redimensionar/arrastar uma janela de 680px numa tela de 390px
  não é usável; agora cada janela ocupa a tela inteira, como um app
  mobile de verdade. Layouts internos com sidebar (Explorador de
  Arquivos, Execute Exes) empilham verticalmente em vez de espremer.
- **Menu Iniciar em tela cheia** no celular, pelo mesmo motivo.
- Dica de atalho de teclado (Alt+setas pra dividir tela) escondida em
  dispositivos touch — não existe tecla Alt pra apertar num celular.
- Alvos de toque maiores em menus de contexto e itens de lista
  (`@media (pointer: coarse)`).

### Sistema de Registro em JSON (localStorage + IndexedDB)
`window.VessieOS.PathRegistry` — exatamente no formato pedido:
```json
{ "path": "C:\\Windows\\explorer.exe", "cmd": "Abrir Explorador de Arquivos" }
```
- **2 entradas padrão** (não removíveis, como atalhos de fábrica do
  Windows) + entradas de usuário (adicionáveis/removíveis).
- Tag **`%User%`** resolvida em tempo real pro usuário logado — um item
  pode apontar pra `C:\Users\%User%\Desktop\...` e continuar válido pra
  qualquer sessão.
- **Persistência dupla de verdade**: localStorage (síncrono, fonte da
  verdade em leitura) + espelho em IndexedDB (assíncrono, mais espaço) —
  confirmado com teste lendo o banco IndexedDB depois de gravar.
- Acessível pela GUI (app "Execute Exes" → seção "Registro (JSON)", botão
  "+ Novo") e pelo Terminal (`reg list` / `reg add "<path>" "<cmd>"` /
  `reg remove <id>` / `reg run <id>`).

### Pasta C:\Windows bloqueada
- Aparece com **"104 item(s)"**, mas não é uma pasta de verdade com 104
  entradas fake — é um marcador leve (`{__locked:true, __fileCount:104}`)
  que `VFS.stat()` sabe reportar corretamente.
- **Clique esquerdo E direito** nela mostram "🔒 Acesso Negado — peça ao
  administrador ou digite o código" (também bloqueado no `cd`/`ls` do
  Terminal).
- Código de administrador: **"Vessie"**. Acerta uma vez, libera o acesso
  pelo resto da sessão (reseta ao recarregar a página, como o UAC real) e
  revela um conteúdo de verdade (System32, WinSxS, System.ini) em vez de
  continuar com os metadados internos do cadeado aparecendo como arquivo.
- Bloqueio também vale para escrita programática (`fs.write`/`mkdir`/
  `delete` de dentro de um script VessieScript ou VessieLang não
  conseguem "vazar" pra dentro da pasta por baixo dos panos).
- Endereçamento Windows-style: `C:\Users\%User%\Desktop\...` e
  `C:\Windows\...` agora resolvem pros lugares certos automaticamente
  (`VFS.normalize()`), sem quebrar nenhum caminho "solto" que já
  funcionava antes (`Desktop/arquivo.txt` continua igual).

### Easter egg: "veesie" → "vessie" + visual próprio
A palavra secreta (digite em qualquer lugar do desktop) tinha um erro de
digitação ("veesie") e mostrava um GIF de terceiros (Michael Myers, de
Halloween — problema de direitos autorais). Trocada para **"vessie"**
(nome correto) e o visual agora é 100% original do VessieOS: glitch de
texto, estática de TV velha e o coração-mascote piscando em vermelho —
assustador na estética, mas continua sendo o mesmo coração fofo de
sempre, sem nenhum jump-scare de verdade.

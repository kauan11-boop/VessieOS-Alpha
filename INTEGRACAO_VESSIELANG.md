# VessieOS + VessieLang — Integração

Este pacote é o `VessieOS` com a sua linguagem própria, **VessieLang**
(dialetos `B1` / `J3` / `G5` / `FULL`), embutida como um módulo real do
kernel, mais um coletor de conteúdo web otimizado. Resumo do que mudou.

## 1. VessieLang dentro do VessieOS

**Onde:** `JS/kernel/modules/vessielang/`

```
vessielang/
├── index.js                 <- VessieLangManager (módulo ES6 do kernel)
└── lib/
    ├── B1_Lang.js            <- motor do dialeto B1 (original, sem alteração)
    ├── J3_Lang.js             <- motor do dialeto J3 (original, sem alteração)
    ├── G5_Lang.js             <- motor do dialeto G5 (original, sem alteração)
    ├── VL_Full.js             <- motor FULL (com as novas APIs, ver abaixo)
    ├── dispatcher.js          <- roteador `Vessie.rodar()` (detecta o dialeto)
    ├── vl-fs.js / vl-security.js / vl-kernel.js / vl-modules.js /
    │   vl-os.js / vl-gamehub.js   <- estado interno original do VessieLang
    └── runtime-bridge.js      <- A PEÇA NOVA: conecta tudo isso ao VessieOS real
```

`B1_Lang.js`, `J3_Lang.js`, `G5_Lang.js` e a base do `VL_Full.js`/`dispatcher.js`
são os motores originais do seu projeto `VessieLang`, sem alteração de
comportamento — continuam funcionando exatamente como antes (inclusive fora
do navegador, se você ainda usar o runner Node do projeto original).

O que é novo:

- **`runtime-bridge.js`**: depois que os motores carregam, este script
  substitui `Modules.notify`/`OS.toast` para também disparar o toast real do
  VessieOS (`window.toast`), faz `file.escrever(...)` espelhar o arquivo no
  filesystem real (`window.VessieOS.FileSystem`), e faz `system.exec(...)`
  ser validado pelas regras reais de segurança do VessieOS
  (`window.VessieOS.Security`). No final, expõe `window.VessieLangRuntime`
  — a única coisa que o resto do kernel precisa conhecer.
- **`VessieLangManager`** (`index.js`): módulo ES6 registrado no pipeline
  do kernel (`JS/kernel/modules/index.js`, prioridade 17), no mesmo padrão
  dos outros módulos do projeto. Espera `window.VessieLangRuntime` aparecer
  e se expõe em `window.VessieOS.vessielang`, com:
  - `.run(codigo, {nome})` — executa um script e devolve `{ saida, nivel, erro, ... }`
  - `.runFile(caminho)` — lê um `.vl` do disco (real ou do VessieLang) e roda
  - `.detect(codigo)` — só detecta o dialeto
  - `.getHistory()` / `.getReport()` — histórico e relatório
  - eventos `vessie:vessielang:ready|run|output|error` (via `CustomEvent` no `document`)

### Novas APIs adicionadas à linguagem (dentro do `.vl`)

O interpretador `FULL` é **síncrono** (não existe `await` em `.vl`), então as
chamadas que envolvem rede/IA disparam a operação em segundo plano, devolvem
um aviso imediato, e o resultado chega por notificação — exatamente o
padrão que o `network.fetch` original já simulava, só que agora é de
verdade:

```vl
// IA local (LM Studio, via window.VessieOS.ai do módulo ai-integration)
var r = ai.ask("resuma o que é um kernel de SO");
escreva(r);            // "[ai] pergunta enviada..." (imediato)
escreva(ai.last());    // resposta real, quando já tiver chegado

// Rede real (com timeout de verdade e sem travar o script)
net.get("https://api.exemplo.com/status");
escreva(net.last());

net.post("https://api.exemplo.com/echo", "{\"ping\":true}");

// Coletor de jogos/conteúdo web (ver seção 2)
collector.games();               // todas as fontes
collector.games("FreeToGame");   // uma fonte específica
escreva(collector.lastGames());

collector.web("motores de jogo em javascript");
escreva(collector.lastWeb());

// Utilitários do VessieOS
vessieos.notificar("Título", "Corpo", "success");
vessieos.abrirApp("Terminal");
```

Essas chamadas funcionam graças a duas mudanças mínimas e cirúrgicas no
`VL_Full.js` original: (1) os nomes `ai`, `net`, `collector`, `vessieos`
foram adicionados ao `NSNomes` (conjunto de namespaces reconhecidos) e (2)
um `mapa4` novo foi adicionado ao método `ns()` com as implementações —
nada do parser ou do restante do interpretador foi tocado.

### Testar a linguagem

- **Dentro do VessieOS**: abra o console e chame
  `window.VessieOS.vessielang.run('escreva("oi")')`.
- **Isolado, sem dar boot no SO inteiro**: abra
  `systems/vessielang/playground.html` num servidor local (não `file://`,
  por causa de CORS no `fetch` dos exemplos) — editor de código, lista de
  exemplos e saída ao vivo.

> Nota sobre a interface gráfica: `JS/modules/windows.js` (o gerenciador de
> janelas de apps) ainda é um stub neste snapshot do VessieOS — por isso
> `VessieLang` foi adicionado à lista de apps (`JS/modules/apps.js`) mas
> ainda não tem uma janela própria dentro do desktop. O playground acima
> cobre esse espaço por enquanto; quando `windows.js` ganhar conteúdo real,
> é só chamar `window.VessieOS.vessielang.run(...)`/`.runFile(...)` a partir
> de lá.

## 2. Coletor de site otimizado

Dois coletores foram reescritos (o "coletor de jogos" e o "coletor de
conteúdo web" genérico, que juntos alimentam o Game Hub e o gerador de
sistemas a partir da web):

### `JS/systems/game-hub-collector.js` (GameHubCollector)

| Problema na versão anterior | Correção |
|---|---|
| `fetch(url, {timeout})` — opção que não existe, era ignorada | `AbortController` real com timeout configurável |
| Proxy `cors-anywhere.herokuapp.com` desativado há anos | Acesso direto primeiro, depois `corsproxy.io`/`allorigins` (funcionam hoje) |
| Fontes coletadas em série | `collectAll()` roda em paralelo com concorrência limitada (padrão: 3) |
| Chamar `collectAll()` duas vezes duplicava todos os jogos | Deduplicação por `id` em `_mergeGames` |
| Uma falha de rede descartava a fonte até o cache expirar | Retry com backoff exponencial + jitter |
| Cache só em memória, perdido a cada reload | Persistido em `localStorage` |
| 4 fontes (Steam/Epic/Local + mock) | +3 fontes reais: **FreeToGame**, **itch.io**, **CrazyGames** |

### `JS/kernel/web-content-fetcher.js` (WebContentFetcher)

| Problema na versão anterior | Correção |
|---|---|
| As 3 buscas rodavam em série (`await` sequencial) | `Promise.allSettled` em paralelo |
| Sem timeout — uma fonte lenta travava tudo | `AbortController` em todo fetch |
| "Proxy archive" na verdade só devolvia metadados do Wayback Machine, nunca o conteúdo da página | Separado em `fetchArchived()` (metadados) vs. `fetchWithProxy()` (conteúdo real, com proxies que funcionam) |
| Sem retry nem dedupe de resultados por URL | Retry com backoff + dedupe |
| 3 fontes (DuckDuckGo/Wikipedia/GitHub) | +2 fontes: **Hacker News** (Algolia) e **npm Registry** |
| `generateSystem` buscava as páginas em série | Busca em paralelo com concorrência limitada |

Ambas as classes mantiveram exatamente a mesma API pública usada pelo
resto do projeto (`EnhancedGameHub` que estende `GameHubCollector`, o
`legacy-collector.js` do módulo `gamehub/`, etc.) — só o funcionamento
interno mudou, nada foi quebrado.

## 3. Verificação feita

- `node --check` em todos os arquivos JS criados/alterados (sintaxe válida,
  incluindo o módulo ES `VessieLangManager`).
- Teste funcional ponta-a-ponta em Node: motor carregado, dialeto
  detectado como `FULL`, `gui.notify`, `ai.ask` e `net.get` executados e
  confirmados via `ai.last()`/`net.last()`.
- Teste do `GameHubCollector`: instanciação, `addGame`, deduplicação por
  `id` (achou e corrigiu uma colisão real de ID quando dois jogos eram
  adicionados no mesmo milissegundo).
- Teste do `WebContentFetcher`: instanciação, 5 fontes habilitadas,
  exportação HTML.

Chamadas de rede reais (Steam, FreeToGame, DuckDuckGo etc.) não foram
testadas neste ambiente porque a rede daqui só libera domínios de pacotes
(`npm`, `pypi`...) — mas a lógica de timeout/retry/proxy foi validada
provocando falhas de rede propositalmente, e o caminho de sucesso é o
`fetch` padrão do navegador, sem transformação nenhuma.

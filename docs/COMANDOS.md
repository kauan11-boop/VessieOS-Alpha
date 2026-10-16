# Catálogo de comandos do VessieOS

**331 comandos** em 29 namespaces — gerado do registro real (`cmd.list`).

- **Puros** (211 comandos): sem efeito no SO, liberados para qualquer app.
- **Sistema** (120 comandos): exigem o namespace em `permissions` do app. ⚠ = perigoso (exige `admin` + confirmação).

## Comandos de sistema (exigem permissão)

### `ai` (3)

| Comando | Argumentos | O que faz |
|---|---|---|
| `ai.ping` | — | LM Studio está no ar? |
| `ai.models` | — | Modelos carregados |
| `ai.chat` | prompt, system, model, max_tokens | Pergunta ao modelo local |

### `app` (11)

| Comando | Argumentos | O que faz |
|---|---|---|
| `app.list` | — | Todos os apps instalados |
| `app.running` | — | Apps em execução |
| `app.exists` | id | App existe? |
| `app.info` | id | Dados de um app |
| `app.open` | id | Abre um app |
| `app.close` | id | Fecha as janelas de um app |
| `app.self` | — | Dados do app que chamou |
| `app.userApps` | — | Apps criados pelo usuário |
| `app.source` | id | Código-fonte (html/css/js) de um app do usuário |
| `app.install` | app | Instala/atualiza app do usuário |
| `app.uninstall` ⚠ | id | Remove app do usuário |

### `audio` (7)

| Comando | Argumentos | O que faz |
|---|---|---|
| `audio.volumeGet` | — | Volume do sistema (0–100) |
| `audio.volumeSet` | n | Define volume do sistema |
| `audio.tone` | freq, ms, type | Toca um tom |
| `audio.beep` | — | Bip curto |
| `audio.speak` | text, lang | Fala um texto |
| `audio.stopSpeak` | — | Para a fala |
| `audio.voices` | — | Vozes disponíveis |

### `clipboard` (4)

| Comando | Argumentos | O que faz |
|---|---|---|
| `clipboard.read` | — | Lê a área de transferência |
| `clipboard.write` | text | Copia texto |
| `clipboard.history` | — | Histórico de cópias |
| `clipboard.clearHistory` ⚠ | — | Apaga o histórico de cópias |

### `fs` (14)

| Comando | Argumentos | O que faz |
|---|---|---|
| `fs.home` | — | Pasta do usuário |
| `fs.exists` | path | Existe? |
| `fs.list` | path | Lista uma pasta |
| `fs.read` | path | Lê arquivo de texto |
| `fs.write` | path, data | Grava arquivo |
| `fs.append` | path, data | Acrescenta ao arquivo |
| `fs.mkdir` | path | Cria pasta |
| `fs.delete` | path | Apaga arquivo/pasta |
| `fs.stat` | path | Metadados |
| `fs.copy` | from, to | Copia arquivo |
| `fs.move` | from, to | Move arquivo |
| `fs.readJson` | path | Lê arquivo JSON |
| `fs.writeJson` | path, data | Grava objeto como JSON |
| `fs.tree` | path, depth | Árvore de uma pasta |

### `kernel` (5)

| Comando | Argumentos | O que faz |
|---|---|---|
| `kernel.log` | msg, level | Registra mensagem no log do sistema |
| `kernel.logs` | n | Lê o log dos apps |
| `kernel.emit` | name, data | Emite evento para outros apps |
| `kernel.subscribe` | name | Recebe um evento do sistema (vessieos:* / vessie:*) |
| `kernel.unsubscribe` | name | Cancela inscrição em evento |

### `net` (4)

| Comando | Argumentos | O que faz |
|---|---|---|
| `net.online` | — | Online? |
| `net.fetch` | url, method, headers, body, as | Requisição HTTP (http/https) |
| `net.json` | url | GET que devolve JSON |
| `net.ping` | url | Mede latência (ms) |

### `neural` (5)

| Comando | Argumentos | O que faz |
|---|---|---|
| `neural.stats` | — | Estatísticas do agente |
| `neural.suggest` | — | Apps sugeridos agora |
| `neural.simulate` | n | Treino com rotina simulada |
| `neural.config` | autonomy, notify, llm | Lê/ajusta autonomia, notificações e resumo por IA |
| `neural.reset` ⚠ | — | Apaga o que o modelo aprendeu |

### `notify` (5)

| Comando | Argumentos | O que faz |
|---|---|---|
| `notify.toast` | msg, type, title | Aviso na tela |
| `notify.success` | msg | Aviso de sucesso |
| `notify.error` | msg | Aviso de erro |
| `notify.permission` | — | Pede permissão de notificação nativa |
| `notify.native` | title, body | Notificação nativa do navegador |

### `power` (3)

| Comando | Argumentos | O que faz |
|---|---|---|
| `power.sleep` ⚠ | — | Suspende o sistema |
| `power.restart` ⚠ | — | Reinicia o sistema |
| `power.shutdown` ⚠ | — | Desliga o sistema |

### `storage` (11)

| Comando | Argumentos | O que faz |
|---|---|---|
| `storage.set` | key, value | Guarda texto (do app) |
| `storage.get` | key | Lê texto (do app) |
| `storage.has` | key | Chave existe? |
| `storage.remove` | key | Apaga chave |
| `storage.setJson` | key, value | Guarda objeto |
| `storage.getJson` | key, default | Lê objeto |
| `storage.keys` | — | Chaves do app |
| `storage.size` | — | Bytes usados pelo app |
| `storage.clear` ⚠ | — | Apaga todos os dados do app |
| `storage.sharedSet` | key, value | Guarda dado compartilhado entre apps |
| `storage.sharedGet` | key | Lê dado compartilhado |

### `system` (16)

| Comando | Argumentos | O que faz |
|---|---|---|
| `system.info` | — | Resumo do sistema |
| `system.version` | — | Versão do VessieOS |
| `system.user` | — | Nome do usuário |
| `system.uptime` | — | Tempo ligado (s) |
| `system.locale` | — | Idioma |
| `system.timezone` | — | Fuso horário |
| `system.online` | — | Há internet? |
| `system.cores` | — | Núcleos de CPU |
| `system.memory` | — | Memória (GB aprox. + heap JS) |
| `system.screen` | — | Tela |
| `system.viewport` | — | Área útil do desktop |
| `system.battery` | — | Bateria |
| `system.fullscreen` | on | Entra/sai de tela cheia |
| `system.vibrate` | ms | Vibra (celular) |
| `system.prefersReducedMotion` | — | Usuário prefere menos movimento? |
| `system.reload` ⚠ | — | Recarrega o VessieOS |

### `theme` (9)

| Comando | Argumentos | O que faz |
|---|---|---|
| `theme.accentGet` | — | Cor de destaque |
| `theme.accentSet` | hex | Define cor de destaque |
| `theme.tokenGet` | name | Lê um token CSS (--nome) |
| `theme.tokenSet` | name, value | Define um token CSS (--nome) |
| `theme.tokens` | — | Tokens principais |
| `theme.wallpaperSet` | url | Troca o papel de parede |
| `theme.blurGet` | — | Intensidade do vidro |
| `theme.blurSet` | px | Define intensidade do vidro (px) |
| `theme.reset` | — | Remove ajustes de tema feitos por apps |

### `window` (23)

| Comando | Argumentos | O que faz |
|---|---|---|
| `window.list` | — | Janelas abertas |
| `window.count` | — | Quantidade de janelas |
| `window.info` | id | Dados de uma janela |
| `window.focus` | id | Traz janela para frente |
| `window.close` | id | Fecha janela |
| `window.minimize` | id | Minimiza janela |
| `window.restore` | id | Restaura janela |
| `window.maximize` | id | Alterna maximizar |
| `window.move` | id, x, y | Move janela |
| `window.resize` | id, w, h | Redimensiona janela |
| `window.title` | id, title | Muda título |
| `window.byApp` | app | Janelas de um app |
| `window.cascade` | — | Organiza em cascata |
| `window.tile` | — | Organiza lado a lado |
| `window.closeAll` ⚠ | — | Fecha todas as janelas |
| `window.self.info` | — | Dados da própria janela |
| `window.self.close` | — | Fecha a própria janela |
| `window.self.minimize` | — | Minimiza a própria janela |
| `window.self.maximize` | — | Alterna maximizar a própria janela |
| `window.self.focus` | — | Foca a própria janela |
| `window.self.move` | x, y | Move a própria janela |
| `window.self.resize` | w, h | Redimensiona a própria janela |
| `window.self.title` | title | Muda o título da própria janela |

## Comandos puros (sempre liberados)

### `arr` (19)

| Comando | Argumentos | O que faz |
|---|---|---|
| `arr.unique` | list | Remove repetidos |
| `arr.sort` | list | Ordena crescente |
| `arr.sortDesc` | list | Ordena decrescente |
| `arr.shuffle` | list | Embaralha |
| `arr.chunk` | list, n | Divide em blocos |
| `arr.flatten` | list | Achata um nível |
| `arr.zip` | a, b | Une duas listas |
| `arr.range` | from, to, step | Sequência numérica |
| `arr.reverse` | list | Inverte lista |
| `arr.first` | list, n | Primeiros n |
| `arr.last` | list, n | Últimos n |
| `arr.sample` | list | Item aleatório |
| `arr.count` | list | Conta itens |
| `arr.intersect` | a, b | Interseção |
| `arr.union` | a, b | União |
| `arr.difference` | a, b | Diferença a − b |
| `arr.groupBy` | list, key | Agrupa por chave |
| `arr.pluck` | list, key | Extrai campo |
| `arr.sortBy` | list, key | Ordena por campo |

### `cmd` (5)

| Comando | Argumentos | O que faz |
|---|---|---|
| `cmd.list` | ns | Lista comandos (filtra por namespace) |
| `cmd.info` | name | Detalhes de um comando |
| `cmd.count` | — | Total de comandos |
| `cmd.search` | q | Busca por nome/descrição |
| `cmd.namespaces` | — | Namespaces e contagem |

### `color` (14)

| Comando | Argumentos | O que faz |
|---|---|---|
| `color.hexToRgb` | hex | Hex → [r,g,b] |
| `color.rgbToHex` | r, g, b | [r,g,b] → hex |
| `color.hexToHsl` | hex | Hex → [h,s,l] |
| `color.hslToHex` | h, s, l | HSL → hex |
| `color.lighten` | hex, pct | Clareia (pontos de luminosidade) |
| `color.darken` | hex, pct | Escurece |
| `color.mix` | a, b, t | Mistura duas cores |
| `color.luminance` | hex | Luminância relativa |
| `color.contrast` | a, b | Contraste WCAG entre duas cores |
| `color.isDark` | hex | Cor escura? |
| `color.complement` | hex | Cor complementar |
| `color.alpha` | hex, a | rgba() com transparência |
| `color.palette` | hex, n | Paleta por rotação de matiz |
| `color.random` | — | Cor aleatória |

### `date` (20)

| Comando | Argumentos | O que faz |
|---|---|---|
| `date.now` | — | Agora (ISO) |
| `date.timestamp` | d | Timestamp em ms |
| `date.iso` | d | Data em ISO |
| `date.format` | d, fmt | Formata (YYYY MM DD HH mm ss) |
| `date.parse` | s | Texto → timestamp |
| `date.add` | d, amount, unit | Soma tempo (ms s m h d w mo y) |
| `date.diff` | a, b, unit | Diferença a−b na unidade |
| `date.weekday` | d | Dia da semana |
| `date.isLeap` | y | Ano bissexto? |
| `date.daysInMonth` | y, m | Dias no mês |
| `date.dayOfYear` | d | Dia do ano |
| `date.week` | d | Semana ISO |
| `date.quarter` | d | Trimestre |
| `date.startOfDay` | d | Início do dia |
| `date.endOfDay` | d | Fim do dia |
| `date.relative` | d | Tempo relativo (há 2 dias) |
| `date.age` | birth | Idade em anos |
| `date.timezone` | — | Fuso horário |
| `date.isWeekend` | d | Fim de semana? |
| `date.calendar` | y, m | Matriz do mês (semanas × dias) |

### `enc` (21)

| Comando | Argumentos | O que faz |
|---|---|---|
| `enc.base64Encode` | s | Texto → Base64 |
| `enc.base64Decode` | s | Base64 → texto |
| `enc.hexEncode` | s | Texto → hex |
| `enc.hexDecode` | s | Hex → texto |
| `enc.urlEncode` | s | Codifica URL |
| `enc.urlDecode` | s | Decodifica URL |
| `enc.binaryEncode` | s | Texto → binário |
| `enc.binaryDecode` | s | Binário → texto |
| `enc.morseEncode` | s | Texto → Morse |
| `enc.morseDecode` | s | Morse → texto |
| `enc.rot13` | s | ROT13 |
| `enc.caesar` | s, shift | Cifra de César |
| `enc.utf8Bytes` | s | Bytes UTF-8 |
| `enc.sha1` | s | SHA-1 |
| `enc.sha256` | s | SHA-256 |
| `enc.sha512` | s | SHA-512 |
| `enc.djb2` | s | Hash rápido djb2 |
| `enc.crc32` | s | CRC-32 |
| `enc.uuid` | — | UUID v4 |
| `enc.nanoid` | n | ID curto aleatório |
| `enc.randomBytes` | n | Bytes aleatórios (hex) |

### `json` (10)

| Comando | Argumentos | O que faz |
|---|---|---|
| `json.parse` | s | Texto → objeto |
| `json.stringify` | v | Objeto → texto |
| `json.pretty` | s | JSON indentado |
| `json.minify` | s | JSON compacto |
| `json.get` | obj, path | Lê caminho a.b.c |
| `json.set` | obj, path, value | Define caminho a.b.c |
| `json.keys` | obj | Chaves do objeto |
| `json.merge` | a, b | Mescla dois objetos |
| `json.flatten` | obj | Achata chaves aninhadas |
| `json.isValid` | s | JSON válido? |

### `math` (41)

| Comando | Argumentos | O que faz |
|---|---|---|
| `math.add` | a, b | Soma |
| `math.sub` | a, b | Subtração |
| `math.mul` | a, b | Multiplicação |
| `math.mod` | a, b | Resto |
| `math.pow` | a, b | Potência |
| `math.div` | a, b | Divisão |
| `math.sqrt` | n | sqrt(n) |
| `math.cbrt` | n | cbrt(n) |
| `math.abs` | n | abs(n) |
| `math.floor` | n | floor(n) |
| `math.ceil` | n | ceil(n) |
| `math.sin` | n | sin(n) |
| `math.cos` | n | cos(n) |
| `math.tan` | n | tan(n) |
| `math.log` | n | log(n) |
| `math.log10` | n | log10(n) |
| `math.exp` | n | exp(n) |
| `math.round` | n, d | Arredonda com casas |
| `math.min` | list | Menor da lista |
| `math.max` | list | Maior da lista |
| `math.sum` | list | Soma da lista |
| `math.avg` | list | Média |
| `math.median` | list | Mediana |
| `math.mode` | list | Moda |
| `math.stddev` | list | Desvio padrão |
| `math.clamp` | n, min, max | Limita ao intervalo |
| `math.lerp` | a, b, t | Interpolação linear |
| `math.map` | n, inMin, inMax, outMin, outMax | Reescala de faixa |
| `math.gcd` | a, b | MDC |
| `math.lcm` | a, b | MMC |
| `math.factorial` | n | Fatorial (n ≤ 170) |
| `math.fib` | n | n-ésimo Fibonacci |
| `math.isPrime` | n | É primo? |
| `math.primes` | n | Primos até n |
| `math.deg2rad` | n | Graus → radianos |
| `math.rad2deg` | n | Radianos → graus |
| `math.hypot` | a, b | Hipotenusa |
| `math.percent` | part, total | Percentual parte/total |
| `math.toBase` | n, base | Número → base N |
| `math.fromBase` | s, base | Texto base N → número |
| `math.eval` | expr | Avalia expressão aritmética segura |

### `num` (7)

| Comando | Argumentos | O que faz |
|---|---|---|
| `num.format` | n, locale | Formata número (pt-BR) |
| `num.currency` | n, cur, locale | Formata moeda |
| `num.bytes` | n | Bytes legíveis |
| `num.compact` | n | Número compacto (1,2 mil) |
| `num.pad` | n, len | Zeros à esquerda |
| `num.roman` | n | Número → romano |
| `num.fromRoman` | s | Romano → número |

### `path` (5)

| Comando | Argumentos | O que faz |
|---|---|---|
| `path.join` | parts | Junta caminhos |
| `path.basename` | p | Nome do arquivo |
| `path.dirname` | p | Pasta pai |
| `path.ext` | p | Extensão |
| `path.normalize` | p | Normaliza barras e .. |

### `rand` (8)

| Comando | Argumentos | O que faz |
|---|---|---|
| `rand.int` | min, max | Inteiro aleatório [min,max] |
| `rand.float` | min, max | Decimal aleatório |
| `rand.pick` | list | Escolhe da lista |
| `rand.bool` | — | Cara ou coroa |
| `rand.string` | n, chars | Texto aleatório |
| `rand.password` | n | Senha forte |
| `rand.dice` | sides, n | Rola dados |
| `rand.gaussian` | mean, sd | Normal (Box-Muller) |

### `text` (34)

| Comando | Argumentos | O que faz |
|---|---|---|
| `text.upper` | s | MAIÚSCULAS |
| `text.lower` | s | minúsculas |
| `text.title` | s | Cada Palavra Capitalizada |
| `text.capitalize` | s | Primeira letra maiúscula |
| `text.trim` | s | Remove espaços das pontas |
| `text.reverse` | s | Inverte o texto |
| `text.length` | s | Número de caracteres |
| `text.words` | s | Lista de palavras |
| `text.wordCount` | s | Conta palavras |
| `text.lines` | s | Divide em linhas |
| `text.slug` | s | url-amigavel |
| `text.camel` | s | camelCase |
| `text.snake` | s | snake_case |
| `text.kebab` | s | kebab-case |
| `text.padLeft` | s, n, ch | Preenche à esquerda |
| `text.padRight` | s, n, ch | Preenche à direita |
| `text.repeat` | s, n | Repete o texto |
| `text.replace` | s, from, to | Troca todas as ocorrências |
| `text.contains` | s, sub | Contém trecho? |
| `text.startsWith` | s, sub | Começa com? |
| `text.endsWith` | s, sub | Termina com? |
| `text.split` | s, sep | Divide por separador |
| `text.join` | list, sep | Junta lista |
| `text.truncate` | s, n | Corta com reticências |
| `text.count` | s, sub | Conta ocorrências |
| `text.stripHtml` | s | Remove tags HTML |
| `text.escapeHtml` | s | Escapa HTML |
| `text.unescapeHtml` | s | Desfaz escape de HTML |
| `text.levenshtein` | a, b | Distância de edição |
| `text.similarity` | a, b | Similaridade 0–1 |
| `text.isPalindrome` | s | É palíndromo? |
| `text.removeAccents` | s | Remove acentos |
| `text.sortLines` | s | Ordena linhas |
| `text.uniqueLines` | s | Remove linhas repetidas |

### `unit` (3)

| Comando | Argumentos | O que faz |
|---|---|---|
| `unit.convert` | v, from, to | Converte unidades (comprimento, massa, velocidade, dados, tempo, área, volume) |
| `unit.temp` | v, from, to | Converte C/F/K |
| `unit.list` | — | Unidades suportadas |

### `url` (6)

| Comando | Argumentos | O que faz |
|---|---|---|
| `url.parse` | url | Divide uma URL |
| `url.build` | base, params | Monta URL com parâmetros |
| `url.queryParse` | s | a=1&b=2 → objeto |
| `url.queryBuild` | obj | Objeto → a=1&b=2 |
| `url.domain` | url | Domínio de uma URL |
| `url.isValid` | url | URL válida? |

### `util` (11)

| Comando | Argumentos | O que faz |
|---|---|---|
| `util.sleep` | ms | Aguarda ms (máx 10 s) |
| `util.typeOf` | v | Tipo do valor |
| `util.clone` | v | Clona profundamente |
| `util.equals` | a, b | Igualdade profunda |
| `util.isEmpty` | v | Vazio? |
| `util.template` | s, data | Substitui {{chave}} |
| `util.regexTest` | s, pattern, flags | Regex confere? |
| `util.regexMatch` | s, pattern, flags | Todas as correspondências |
| `util.regexReplace` | s, pattern, to, flags | Troca por regex |
| `util.versionCompare` | a, b | Compara versões 1.2.3 (−1/0/1) |
| `util.id` | — | ID único curto |

### `valid` (7)

| Comando | Argumentos | O que faz |
|---|---|---|
| `valid.email` | s | E-mail válido? |
| `valid.cpf` | s | CPF válido? |
| `valid.cnpj` | s | CNPJ válido? |
| `valid.url` | s | URL http(s) válida? |
| `valid.ip` | s | IPv4 válido? |
| `valid.hexColor` | s | Cor hex válida? |
| `valid.luhn` | s | Cartão (Luhn) válido? |

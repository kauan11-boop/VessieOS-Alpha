# Apps separados (HTML + CSS + JS) em iframe

Cada app é uma pasta em `apps-iframe/<id>/` com **`index.html` + `style.css` + `app.js`**, aberta pelo sistema dentro de um `<iframe>` isolado.
O app **não toca no SO**: tudo que mexe no sistema ou interage com ele é um **comando** (331 no total — ver [`COMANDOS.md`](COMANDOS.md)).

## Arquitetura
| Peça | Arquivo | Papel |
|---|---|---|
| Registro de apps | `apps-iframe/registry.js` | lista os apps built-in e as permissões de cada um |
| SDK do app | `apps-iframe/_sdk/vessie-sdk.js` | `Vessie.run(comando, args)` dentro do iframe |
| UI base | `apps-iframe/_sdk/vessie-ui.css` | visual compartilhado (os tokens do tema chegam do sistema) |
| Comandos puros | `JS/kernel/modules/app-runtime/commands.js` | 211 utilitários (text, math, num, color, date, enc, json, arr, rand, url, valid, unit, util, path, cmd) |
| Comandos de sistema | `JS/kernel/modules/app-runtime/system-commands.js` | 120 (system, window, app, fs, storage, clipboard, notify, theme, audio, net, ai, neural, power, kernel) |
| Host | `JS/kernel/modules/app-runtime/app-host.js` | abre o iframe, valida mensagens, aplica permissões |

Apps incluídos: **Console de Comandos**, **Criador de Apps**, **Notas**, **Monitor do Sistema**.

## Segurança
- `sandbox="allow-scripts allow-forms allow-modals allow-downloads"` **sem `allow-same-origin`**: o app não acessa o DOM, o `localStorage` nem o `VFS` do sistema (testado).
- O host só aceita mensagens de iframes que ele mesmo abriu (`event.source`).
- Namespaces de sistema exigem permissão no manifesto; comandos `danger` (⚠) exigem `admin` **e** confirmação do usuário.
- `storage.*` é isolado por app; limite de 150 chamadas/s por app.

## Criar um app (arquivos)
1. Crie `apps-iframe/meu-app/{index.html,style.css,app.js}`; no HTML inclua `../_sdk/vessie-ui.css` e `../_sdk/vessie-sdk.js`.
2. Registre em `registry.js`: `{ id:'meu-app', name:'Meu App', icon:'fa-cube', permissions:['notify','fs'], size:[800,560] }`.
3. Adicione uma linha em `APPS` (`JS/core/main.js`) para aparecer no Menu Iniciar.

```js
await Vessie.ready;
const up = await Vessie.run('text.upper', { s: 'oi' });          // puro
await Vessie.run('math.add', [2, 3]);                             // argumentos posicionais
await Vessie.cmd.window.self.title({ title: up });               // sistema (permissão "window")
Vessie.on('vessieos:app-opened', d => console.log(d));            // eventos (permissão "kernel")
```

## Criar um app sem escrever arquivos
Abra **Criador de Apps** → edite HTML/CSS/JS, marque as permissões, **Salvar e abrir**. O app fica instalado (aparece no Menu Iniciar)
e **Exportar** grava os 4 arquivos separados em `Documentos/Apps/<id>/`.

## Criar um comando novo
Em `commands.js` (puro) ou `system-commands.js`: `def('meu.comando', 'descrição', 'arg1 arg2', ({arg1,arg2}, ctx) => ...)`.
Use `D(...)` para marcar como perigoso. O namespace passa a existir sozinho e já aparece no Console e no Criador de Apps.

# 🎯 VessieOS - Quick Start Guide

## Como Usar o Sistema Completo

### ✨ Inicialização Rápida

#### 1. **No Browser (Recomendado)**

```html
<!-- Abra em seu navegador: -->
http://localhost:8000/HTML/systems/dashboard.html
```

Clique em "Boot System" para iniciar tudo automaticamente!

#### 2. **Via Console JavaScript**

```javascript
// Iniciar o sistema
await VessieOS.boot();

// Ver status
console.log(VessieOS.getStatus());

// Auto-executar pipelines
await VessieOS.autoExecute();

// Coletar jogos
const gameHub = VessieOS.getSystem('gameHub');
const games = await gameHub.collectAll();

// Conversar com IA
const ai = VessieOS.getSystem('ai');
const response = await ai.chat('Olá!');

// Buscar conteúdo web
const fetcher = VessieOS.getSystem('webFetcher');
const system = await fetcher.generateSystem('Machine Learning');
```

---

## 🔧 Uso de Cada Sistema

### Responsive Renderer

```javascript
const renderer = VessieOS.getSystem('responsive');

// Info de viewport
const viewport = renderer.getViewportInfo();
console.log(viewport);
// {
//   width: 1920,
//   height: 1080,
//   breakpoint: 'lg',
//   isMobile: false,
//   isDesktop: true
// }

// Registrar componente
renderer.registerComponent('myComponent', {
  element: document.getElementById('myElement'),
  responsive: true
});
```

### Windows Executor

```javascript
const executor = VessieOS.getSystem('executor');

// Executar comando
const result = await executor.executeSync(
  'notepad.exe',
  [],
  { workDir: 'C:\\' }
);

// Ver fila
const queue = executor.getQueueStatus();
console.log(queue);
// { queueLength: 2, runningProcesses: 1, maxConcurrent: 3 }
```

### Module System

```javascript
const modules = VessieOS.getSystem('modules');

// Ver módulos registrados
const moduleList = modules.listModules();
console.log(moduleList);

// Executar pipeline específico
await modules.executePipeline(0, true);

// Ver log de execução
const log = modules.getExecutionLog();
```

### LM Studio AI

```javascript
const ai = VessieOS.getSystem('ai');

// Checar status
const status = ai.getStatus();
console.log(status);

// Chat simples
const response = await ai.chat('Qual é a capital da França?');
console.log(response.message);

// Chat com stream
await ai.streamChat('Conte uma história', (chunk) => {
  process.stdout.write(chunk);
});

// Gerar texto
const generated = await ai.generate('Complete: O VessieOS é um...');
console.log(generated.text);

// Trocar modelo
ai.setModel('model-name');
ai.clearHistory();
```

### Game Hub Collector

```javascript
const gameHub = VessieOS.getSystem('gameHub');

// Coletar de todas as fontes
const results = await gameHub.collectAll();

// Auto-update automático
gameHub.autoUpdate(3600000); // a cada 1 hora

// Buscar jogos
const minecraft = gameHub.getGames({ search: 'Minecraft' });
const steam = gameHub.getGames({ source: 'Steam' });

// Estatísticas
const stats = gameHub.getStats();
console.log(stats);
// { totalGames: 523, bySource: {...}, byType: {...} }

// Adicionar jogo customizado
gameHub.addGame({
  name: 'Meu Jogo',
  path: 'C:\\Games\\mygame.exe',
  thumbnail: 'icon.png'
});

// Exportar
const json = gameHub.exportAsJSON();
```

### Web Content Fetcher

```javascript
const fetcher = VessieOS.getSystem('webFetcher');

// Buscar conteúdo
const results = await fetcher.search('Python Machine Learning');
console.log(results);

// Gerar sistema
const system = await fetcher.generateSystem('Game Development');

// Listar sistemas gerados
const systems = fetcher.listGeneratedSystems();

// Exportar como HTML
const html = fetcher.exportAsHTML(system.id);
// Salve como arquivo .html

// Limpar cache
fetcher.clearCache();
```

---

## 📊 Eventos do Sistema

```javascript
// Quando breakpoint muda
document.addEventListener('breakpoint-change', (e) => {
  console.log('Novo breakpoint:', e.detail.breakpoint);
});

// Quando processo completa
document.addEventListener('process-completed', (e) => {
  console.log('Processo finalizado:', e.detail.processId);
  console.log('Resultado:', e.detail.result);
});

// Erro de processo
document.addEventListener('process-error', (e) => {
  console.log('Erro:', e.detail.error);
});

// Status de sistema (a cada 30s)
document.addEventListener('system-status', (e) => {
  console.log('Status:', e.detail);
});

// Elemento redimensionado
document.addEventListener('element-resized', (e) => {
  console.log('Elemento:', e.detail.element);
  console.log('Nova posição:', e.detail.rect);
});
```

---

## 🔌 Criar Novo Módulo

```javascript
// 1. Criar arquivo: Module/my-module.js

module.exports = {
  name: 'MyModule',
  version: '1.0.0',
  dependencies: [],
  
  metadata: {
    description: 'Meu módulo customizado',
    author: 'Seu Nome',
    category: 'custom'
  },

  validate() {
    return true; // Validate condições aqui
  },

  async execute(context) {
    const { executor, pipeline, logger } = context;
    
    logger('Meu módulo executando...');
    
    // Seu código aqui
    const result = await executor.executeSync('cmd.exe', ['/c', 'dir']);
    
    logger('Módulo concluído');
    return result;
  }
};

// 2. Registrar no ModuleSystem
const modules = VessieOS.getSystem('modules');
const myModule = require('./Module/my-module.js');
modules.registerModule('MyModule', myModule);

// 3. Adicionar a um pipeline
const pipeline = modules.createPipeline('custom', ['MyModule']);
await modules.executePipeline(0);
```

---

## 🎨 Estilos Responsivos

```html
<!-- HTML Responsivo -->
<div class="container">
  <div class="row">
    <!-- Em lg/xl: 50% cada, em md/sm: 100% cada -->
    <div class="col">Coluna 1</div>
    <div class="col">Coluna 2</div>
  </div>
</div>

<!-- Com data-responsive para ajustes personalizados -->
<div data-responsive='{"mobile": {"width": "100%"}, "desktop": {"width": "50%"}}'>
  Conteúdo responsivo
</div>
```

CSS já incluído em `CSS/base/responsive.css`:
- Breakpoints automáticos
- Grid flexível
- Componentes adaptáveis
- Acessibilidade

---

## 🚀 Executar Automaticamente ao Carregar

```javascript
// Adicione ao final do seu HTML:
<script>
  // Boot ao carregar página
  document.addEventListener('DOMContentLoaded', async () => {
    console.log('Iniciando VessieOS...');
    await VessieOS.boot();
    
    // Auto-executar
    await VessieOS.autoExecute();
    
    // Iniciar serviços
    const bootManager = window.VessieOSBootManager;
    await bootManager.startAutoServices();
    
    console.log('VessieOS Pronto!');
  });
</script>
```

---

## 🔍 Debugging

```javascript
// Ver boot log completo
const bootManager = window.VessieOSBootManager;
console.table(bootManager.getBootLog());

// Ver módulos executados
const modules = VessieOS.getSystem('modules');
console.log('Módulos:', modules.listModules());
console.log('Log:', modules.getExecutionLog());

// Ver estado do Game Hub
const gameHub = VessieOS.getSystem('gameHub');
console.log('Log de coleta:', gameHub.getLog());
console.log('Cache:', gameHub.cache);

// Ver AI status
const ai = VessieOS.getSystem('ai');
console.log('Status AI:', ai.getStatus());
console.log('Histórico:', ai.messageHistory);

// Ver configuração
console.log(VessieOSConfig);
```

---

## ⚙️ Configuração

Edite `JS/kernel/config.js`:

```javascript
// Sistema
VessieOSConfig.system.autoStartServices = true;

// Executor
VessieOSConfig.executor.maxConcurrent = 5;
VessieOSConfig.executor.timeout = 60000;

// Game Hub
VessieOSConfig.gameHub.autoUpdateInterval = 1800000; // 30 min

// IA
VessieOSConfig.ai.host = 'http://localhost:1234';
VessieOSConfig.ai.temperature = 0.9;

// Aplicar
window.location.reload();
```

---

## 📝 Exemplos de Uso

### Coletar jogos + IA
```javascript
// Boot
await VessieOS.boot();

// Coletar
const gameHub = VessieOS.getSystem('gameHub');
const results = await gameHub.collectAll();
const stats = gameHub.getStats();

// Conversar sobre
const ai = VessieOS.getSystem('ai');
await ai.chat(`Encontrei ${stats.totalGames} jogos. Você conhece algum bom?`);
```

### Buscar + Gerar + Executar
```javascript
// Buscar
const fetcher = VessieOS.getSystem('webFetcher');
const system = await fetcher.generateSystem('Web Scraping');

// Executar módulo
const modules = VessieOS.getSystem('modules');
await modules.executePipeline(0);

// Ver resultado
console.log(fetcher.listGeneratedSystems());
```

### Múltiplos processos simultâneos
```javascript
// Queue 3 processadores
const executor = VessieOS.getSystem('executor');

for (let i = 0; i < 10; i++) {
  executor.execute('notepad.exe', []);
}

// Monitora fila
const queue = executor.getQueueStatus();
console.log(`Na fila: ${queue.queueLength}, Rodando: ${queue.runningProcesses}`);
```

---

## 🐛 Troubleshooting

### "LM Studio not connected"
- LM Studio roda em http://localhost:1234?
- Sistema continua funcionando offline
- IA tentará se conectar quando chamada

### "Cannot access Game Hub data"
- Proxy automático ativa quando fonte primária falha
- Verifique logs em gameHub.collectionLog
- Tente coleta manual: `gameHub.collectAll()`

### "Module validation failed"
- Módulo precisa ter método `execute` e função `validate()`
- Valide retorno: `module.validate()` deve ser true
- Verifique console para erros de dependência

### "Executor not available"
- Precisa backend NodeJS/Python rodando
- Fallback: use LM Studio para executar scripts
- Setup: `npm start` no diretório raiz

---

## 📚 Referência Completa

- **Responsive Renderer**: `JS/kernel/responsive-renderer.js`
- **Windows Executor**: `JS/kernel/windows-executor.js`
- **Module System**: `JS/kernel/module-system.js`
- **LM Studio AI**: `JS/kernel/lm-studio-ai.js`
- **Game Hub**: `JS/systems/game-hub-collector.js`
- **Web Fetcher**: `JS/kernel/web-content-fetcher.js`
- **Boot Manager**: `JS/kernel/boot-manager.js`
- **Config**: `JS/kernel/config.js`

---

**Tudo pronto! Enjoy VessieOS! 🚀**

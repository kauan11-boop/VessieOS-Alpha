/**
 * VessieOS Kernel Modules – Ponto de Entrada Automático Aprimorado
 * 
 * Carrega, ordena por prioridade, injeta dependências e inicia os módulos
 * com isolamento de falhas e suporte unificado ao Vessie3DProEngine.
 */

// ================================================================
// IMPORTAÇÃO DE TODOS OS MÓDULOS
// ================================================================
import GraphicsHub from './graphics/index.js'; // Motor 3D unificado + GameHubRenderer (Three.js)
import ResourceManager from './resources/index.js';
import EventManager from './events/index.js';
import { PerformanceManager, FrameMonitor, IdleScheduler, PerformanceBooster } from './performance/index.js';
import { RenderManager, AnimationManager, MotionBlurEngine } from './rendering/index.js';
import MemoryManager from './memory/index.js';
import TaskScheduler from './tasks/index.js';
import DiagnosticsManager from './diagnostics/index.js';
import AccessibilityManager from './accessibility/index.js';
import UIStateManager from './ui/index.js';
import SystemsRuntime from './systems/index.js'; // 155 micro-sistemas
import SpotlightSearch from './search-spotlight/index.js';
import WidgetsBoard from './widgets-board/index.js';
import PowerManager from './power-management/index.js';
import ClipboardManager from './clipboard-manager/index.js';
import ScriptingManager from './scripting/index.js'; // integra o motor VessieScript (.vessie)
import VessieLangManager from './vessielang/index.js'; // linguagem de programação própria (VessieLang: B1/J3/G5/FULL)

/**
 * Placeholder leve para o slot "Vessie3DProEngine" da pipeline.
 * O motor real (`graphics/engines/Vessie3DProEngine.js`) é um script
 * clássico que se auto-instancia em `window.Vessie3DPro` assim que
 * carrega (precisa ficar fora do grafo ES porque usa `window.THREE`
 * global e não expõe nenhum `export`). Este placeholder só existe para
 * que o `GraphicsHub` (que depende dele) tenha uma dependência válida
 * na pipeline e possa localizá-lo via `window.Vessie3DPro` no seu init().
 */
class Vessie3DProEngineNoop {
    async init() { return this; }
    async start() { return this; }
    _handleVisibilityChange() { }
    _startRenderLoop() { }
    stopRenderLoop() { }
}

// ================================================================
// CONFIGURAÇÃO DOS MÓDULOS
// ================================================================

const MODULES = [
    {
        name: 'ResourceManager',
        version: '1.0.0',
        dependencies: [],
        priority: 0,
        autoStart: true,
        module: ResourceManager,
        description: 'Gerencia recursos (observers, listeners, timers)'
    },
    {
        name: 'AccessibilityManager',
        version: '1.0.0',
        dependencies: [],
        priority: 1,
        autoStart: true,
        module: AccessibilityManager,
        description: 'Gerencia preferências de acessibilidade'
    },
    {
        name: 'EventManager',
        version: '1.0.0',
        dependencies: ['ResourceManager'],
        priority: 2,
        autoStart: true,
        module: EventManager,
        description: 'Central de eventos internos'
    },
    {
        name: 'MemoryManager',
        version: '1.0.0',
        dependencies: ['ResourceManager'],
        priority: 3,
        autoStart: true,
        module: MemoryManager,
        description: 'Gerencia memória virtual e liberação de recursos'
    },
    {
        name: 'IdleScheduler',
        version: '1.0.0',
        dependencies: [],
        priority: 4,
        autoStart: true,
        module: IdleScheduler,
        description: 'Agenda tarefas em momentos ociosos'
    },
    {
        name: 'FrameMonitor',
        version: '1.0.0',
        dependencies: ['IdleScheduler'],
        priority: 5,
        autoStart: true,
        module: FrameMonitor,
        description: 'Monitora FPS, frame time e long frames'
    },
    {
        name: 'PerformanceManager',
        version: '1.0.0',
        dependencies: ['FrameMonitor', 'AccessibilityManager'],
        priority: 6,
        autoStart: true,
        module: PerformanceManager,
        description: 'Gerencia modos de performance e adaptação'
    },
    {
        name: 'TaskScheduler',
        version: '1.0.0',
        dependencies: ['IdleScheduler', 'PerformanceManager'],
        priority: 7,
        autoStart: true,
        module: TaskScheduler,
        description: 'Agenda tarefas com prioridades'
    },
    {
        name: 'AnimationManager',
        version: '1.0.0',
        dependencies: ['FrameMonitor', 'PerformanceManager', 'AccessibilityManager'],
        priority: 8,
        autoStart: true,
        module: AnimationManager,
        description: 'Controla animações com otimização'
    },
    {
        name: 'RenderManager',
        version: '1.0.0',
        dependencies: ['AnimationManager', 'PerformanceManager'],
        priority: 9,
        autoStart: true,
        module: RenderManager,
        description: 'Otimiza renderizações DOM (batching, RAF)'
    },
    {
        name: 'MotionBlurEngine',
        version: '1.0.0',
        dependencies: ['RenderManager', 'AnimationManager', 'PerformanceManager', 'AccessibilityManager', 'ResourceManager', 'EventManager'],
        priority: 10,
        autoStart: true,
        module: MotionBlurEngine,
        description: 'Efeito de desfoque de movimento automático (UI/DOM)'
    },
    {
        name: 'PerformanceBooster',
        version: '1.0.0',
        dependencies: ['FrameMonitor', 'PerformanceManager', 'ResourceManager'],
        priority: 11,
        autoStart: true,
        module: PerformanceBooster,
        description: 'Otimização automática (lazy loading, virtualização, cache, preload)'
    },
    {
        name: 'UIStateManager',
        version: '1.0.0',
        dependencies: ['EventManager', 'AccessibilityManager'],
        priority: 12,
        autoStart: true,
        module: UIStateManager,
        description: 'Gerencia estado visual da interface'
    },
    {
        name: 'DiagnosticsManager',
        version: '1.0.0',
        dependencies: ['PerformanceManager', 'MotionBlurEngine', 'MemoryManager'],
        priority: 13,
        autoStart: false,
        module: DiagnosticsManager,
        description: 'Fornece diagnóstico completo do sistema'
    },
    {
        // Motor 3D unificado (substitui AutoGraphics3D, ThreeJSMotionBlur e DynamicLighting)
        name: 'Vessie3DProEngine',
        version: '3.0.0',
        dependencies: ['PerformanceManager'],
        priority: 14,
        autoStart: true,
        module: Vessie3DProEngineNoop,
        description: 'Placeholder: o motor 3D real roda como script clássico (window.Vessie3DPro); ver GraphicsHub.'
    },
    {
        name: 'GraphicsHub',
        version: '1.0.0',
        dependencies: ['PerformanceManager', 'Vessie3DProEngine'],
        priority: 15,
        autoStart: true,
        module: GraphicsHub,
        description: 'Une o Vessie3DPro (script clássico) ao pipeline de módulos e gerencia o GameHubRenderer (fundo 3D do Game Hub em Three.js).'
    },
    {
        name: 'SystemsRuntime',
        version: '1.0.0',
        dependencies: ['ResourceManager', 'PerformanceManager', 'AccessibilityManager'],
        priority: 16,
        autoStart: true,
        module: SystemsRuntime,
        description: '155 micro-sistemas do VessieOS (visual, performance, UX, acessibilidade, segurança, produtividade, jogos, IA, rede, diagnóstico).'
    },
    {
        name: 'SpotlightSearch',
        version: '1.0.0',
        dependencies: ['ResourceManager'],
        priority: 17,
        autoStart: true,
        module: SpotlightSearch,
        description: 'Busca universal (apps, arquivos, configurações) com atalho Ctrl+Espaço e fuzzy match.'
    },
    {
        name: 'WidgetsBoard',
        version: '1.0.0',
        dependencies: ['MemoryManager'],
        priority: 18,
        autoStart: true,
        module: WidgetsBoard,
        description: 'Painel de widgets estilo Win11 (relógio, notas, etc.) com layout persistido.'
    },
    {
        name: 'PowerManager',
        version: '1.0.0',
        dependencies: ['IdleScheduler', 'ResourceManager'],
        priority: 19,
        autoStart: true,
        module: PowerManager,
        description: 'Estado de energia (Battery API real ou simulada) e transições sleep/hibernate/wake, com sleep automático por inatividade.'
    },
    {
        name: 'ClipboardManager',
        version: '1.0.0',
        dependencies: ['ResourceManager'],
        priority: 20,
        autoStart: true,
        module: ClipboardManager,
        description: 'Histórico de área de transferência (estilo Win+V) com itens fixados e persistência.'
    },
    {
        name: 'ScriptingManager',
        version: '1.0.0',
        dependencies: [],
        priority: 21,
        autoStart: true,
        module: ScriptingManager,
        description: 'Integra o motor VessieScript (.vessie) ao kernel — permite apps/mods escritos na linguagem própria do VessieOS.'
    },
    {
        // A cadeia clássica de scripts do motor (B1/J3/G5/FULL + bridge) é
        // carregada pelo boot loader (JS/systems/desktop/main.js) ANTES da
        // pipeline de módulos ES rodar — este módulo só localiza
        // window.VessieLangRuntime já pronto, do mesmo jeito que o
        // GraphicsHub localiza window.Vessie3DPro.
        name: 'VessieLangManager',
        version: '1.0.0',
        dependencies: [],
        priority: 22,
        autoStart: true,
        module: VessieLangManager,
        description: 'Integra a linguagem de programação própria do ecossistema (VessieLang) ao kernel — execução de scripts .vl com APIs de IA, rede e coletor de jogos/conteúdo.'
    }
];

// ================================================================
// REGISTRO E INICIALIZAÇÃO AUTOMÁTICA
// ================================================================

let initialized = false;

function getModuleSystem() {
    return window.VessieOS?.moduleSystem || window.VessieOS?.kernel?.modules || null;
}

function getKernel() {
    return window.VessieOS?.kernel || window.VessieKernel || null;
}

/**
 * Ordena os módulos por prioridade para garantir a ordem correta de inicialização
 */
function getSortedModules() {
    return [...MODULES].sort((a, b) => (a.priority || 99) - (b.priority || 99));
}

/**
 * Registra todos os módulos no ModuleSystem
 */
function registerAllModules() {
    const moduleSystem = getModuleSystem();
    if (!moduleSystem || typeof moduleSystem.registerModule !== 'function') {
        console.warn('[VessieModules] ModuleSystem não disponível. Registro adiado.');
        return false;
    }

    let registered = 0;
    const sortedModules = getSortedModules();

    for (const mod of sortedModules) {
        try {
            moduleSystem.registerModule(mod.name, {
                version: mod.version,
                dependencies: mod.dependencies,
                description: mod.description,
                priority: mod.priority,
                autoStart: mod.autoStart,
                validate: () => {
                    for (const dep of mod.dependencies) {
                        if (!moduleSystem.getModule(dep)) {
                            console.warn(`[VessieModules] Dependência "${dep}" não encontrada para "${mod.name}"`);
                            return false;
                        }
                    }
                    return true;
                },
                execute: async (context) => {
                    const deps = {};
                    for (const dep of mod.dependencies) {
                        const depMod = moduleSystem.getModule(dep);
                        if (depMod && depMod._instance) {
                            deps[dep] = depMod._instance;
                        }
                    }

                    // Instancia o módulo com injeção de dependências
                    const instance = new mod.module(deps);

                    // Guarda referência no sistema
                    const moduleEntry = moduleSystem.getModule(mod.name);
                    if (moduleEntry) {
                        moduleEntry._instance = instance;
                    }

                    // Inicializa
                    if (typeof instance.init === 'function') {
                        await instance.init(context);
                    }

                    // Inicia se autoStart estiver ativo
                    if (mod.autoStart && typeof instance.start === 'function') {
                        await instance.start();
                    }
                    return { success: true, instance };
                }
            });
            registered++;
        } catch (e) {
            console.error(`[VessieModules] Erro ao registrar "${mod.name}":`, e);
        }
    }
    console.log(`[VessieModules] ${registered} módulos registrados e ordenados por prioridade.`);
    return true;
}

/**
 * Cria e executa uma pipeline automática
 */
function createAutoPipeline() {
    const moduleSystem = getModuleSystem();
    if (!moduleSystem || typeof moduleSystem.createPipeline !== 'function') {
        console.warn('[VessieModules] ModuleSystem não suporta pipelines.');
        return;
    }

    const autoModules = getSortedModules()
        .filter(m => m.autoStart !== false)
        .map(m => m.name);

    if (autoModules.length === 0) {
        console.warn('[VessieModules] Nenhum módulo com autoStart ativado.');
        return;
    }

    try {
        const pipeline = moduleSystem.createPipeline('auto-start', autoModules);
        console.log(`[VessieModules] Pipeline "auto-start" criada com ${autoModules.length} módulos.`);
        executePipelineWhenReady(pipeline);
    } catch (e) {
        console.error('[VessieModules] Erro ao criar pipeline:', e);
    }
}

/**
 * Executa a pipeline quando o kernel estiver pronto
 */
function executePipelineWhenReady(pipeline) {
    const checkReady = () => {
        const kernel = getKernel();
        if (kernel && (kernel.state === 'RUNNING' || kernel.state === 'READY')) {
            executePipeline(pipeline);
            return true;
        }
        return false;
    };

    if (checkReady()) return;

    document.addEventListener('kernel:ready', () => executePipeline(pipeline));

    // Fallback
    let attempts = 0;
    const interval = setInterval(() => {
        attempts++;
        if (attempts > 20) {
            clearInterval(interval);
            console.warn('[VessieModules] Timeout aguardando kernel. Forçando execução da pipeline.');
            executePipeline(pipeline);
        } else if (checkReady()) {
            clearInterval(interval);
        }
    }, 500);
}

/**
 * Executa a pipeline com isolamento de falhas
 */
function executePipeline(pipeline) {
    const moduleSystem = getModuleSystem();
    if (!moduleSystem || typeof moduleSystem.executePipeline !== 'function') {
        console.error('[VessieModules] Não foi possível executar pipeline.');
        return;
    }

    const pipelines = moduleSystem.getAllPipelines ? moduleSystem.getAllPipelines() : [];
    const index = pipelines.indexOf(pipeline);

    if (index === -1) {
        console.error('[VessieModules] Pipeline não encontrada no ModuleSystem.');
        return;
    }

    moduleSystem.executePipeline(index, true).then(result => {
        if (result.success) {
            console.log('[VessieModules] Pipeline "auto-start" executada com sucesso.');
            // Disponibiliza a instância 3D globalmente para fácil acesso
            const engine3DModule = moduleSystem.getModule('Vessie3DProEngine');
            if (engine3DModule && engine3DModule._instance) {
                window.Vessie3DPro = engine3DModule._instance;
                console.log('[VessieModules] Vessie3DProEngine está ativo e acessível via window.Vessie3DPro');
            }
            // Disponibiliza o GraphicsHub (fundo Three.js do Game Hub) e o SystemsRuntime
            // (155 sistemas) globalmente, para que scripts clássicos (core/main.js,
            // JS/kernel/modules/gamehub/lib/three-hook.js) possam usá-los sem `import`.
            const graphicsModule = moduleSystem.getModule('GraphicsHub');
            if (graphicsModule && graphicsModule._instance) {
                window.VessieOS = window.VessieOS || {};
                window.VessieOS.graphics = graphicsModule._instance;
                document.dispatchEvent(new CustomEvent('vessieos:graphics-ready'));
            }
            const systemsModule = moduleSystem.getModule('SystemsRuntime');
            if (systemsModule && systemsModule._instance) {
                window.VessieOS = window.VessieOS || {};
                window.VessieOS.systemsRuntime = systemsModule._instance;
            }
        } else {
            console.error('[VessieModules] Falha na pipeline:', result.error);
        }
    }).catch(err => {
        console.error('[VessieModules] Erro crítico na execução da pipeline:', err);
    });
}

// ================================================================
// EXPOSIÇÃO E INICIALIZAÇÃO AUTOMÁTICA
// ================================================================

const API = {
    version: '2.0.0',
    modules: MODULES,
    registerAll: registerAllModules,
    createPipeline: createAutoPipeline,
    getModuleSystem,
    getKernel
};

if (typeof window !== 'undefined') {
    window.VessieKernelModules = API;
}

function autoInit() {
    if (initialized) return;
    initialized = true;

    const registered = registerAllModules();
    if (!registered) {
        const checkModuleSystem = setInterval(() => {
            if (getModuleSystem()) {
                clearInterval(checkModuleSystem);
                registerAllModules();
                createAutoPipeline();
            }
        }, 200);
        setTimeout(() => clearInterval(checkModuleSystem), 10000);
        return;
    }

    createAutoPipeline();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
} else {
    autoInit();
}

if (window.VessieOS?.kernel?.state === 'RUNNING') {
    setTimeout(autoInit, 0);
}

console.log('[VessieModules] Sistema de módulos automático aprimorado carregado.');
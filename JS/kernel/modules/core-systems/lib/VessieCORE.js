/**
 * VessieCORE.js
 * Módulo Kernel Web do VessieOS
 * 
 * Núcleo central de orquestração, gerenciamento de módulos,
 * sistemas, eventos, serviços, estado, configurações, permissões,
 * hooks, diagnóstico e ciclo de vida.
 * 
 * Compatível com a estrutura existente do VessieOS.
 * Não substitui módulos existentes, apenas os integra.
 * 
 * @version 1.0.0
 * @author VessieOS Team
 * @license MIT
 */

(function (global) {
    'use strict';

    // ================================================================
    // CONSTANTES
    // ================================================================

    const VERSION = '1.0.0';
    const NAME = 'VessieCORE';
    const LOG_LEVELS = {
        DEBUG: 0,
        INFO: 1,
        SUCCESS: 2,
        WARN: 3,
        ERROR: 4
    };
    const BOOT_PHASES = {
        PRE_INIT: 'pre-init',
        INIT: 'init',
        POST_INIT: 'post-init',
        READY: 'ready'
    };
    const MODULE_STATES = {
        REGISTERED: 'registered',
        INITIALIZING: 'initializing',
        INITIALIZED: 'initialized',
        STARTING: 'starting',
        RUNNING: 'running',
        STOPPING: 'stopping',
        STOPPED: 'stopped',
        DESTROYED: 'destroyed',
        ERROR: 'error'
    };
    const DEFAULT_CONFIG = {
        kernel: {
            debug: false,
            version: VERSION,
            name: NAME
        },
        modules: {
            autoStart: true,
            strictDependencies: true
        },
        logging: {
            level: 'INFO',
            console: true
        }
    };

    // ================================================================
    // ESTADO INTERNO
    // ================================================================

    let _state = {
        status: 'created', // created | booting | running | stopping | stopped
        bootPhase: null,
        uptime: 0,
        startTime: null,
        modules: new Map(),       // nome -> módulo
        systems: new Map(),       // nome -> sistema
        services: new Map(),      // nome -> serviço
        config: { ...DEFAULT_CONFIG },
        events: new Map(),        // evento -> [callbacks]
        permissions: new Map(),   // modulo -> Set(permissions)
        storage: new Map(),       // cache em memória
        errors: [],
        hooks: new Map(),         // nome do hook -> [callbacks]
        api: new Map(),           // nome -> handler
        _bootLock: false,
        _readyPromise: null,
        _readyResolve: null,
        _initialized: false
    };

    // ================================================================
    // UTILITÁRIOS
    // ================================================================

    function _isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    }

    function _deepMerge(target, source) {
        const result = { ...target };
        for (const key in source) {
            if (source.hasOwnProperty(key)) {
                if (_isObject(source[key]) && _isObject(target[key])) {
                    result[key] = _deepMerge(target[key], source[key]);
                } else {
                    result[key] = source[key];
                }
            }
        }
        return result;
    }

    function _generateId() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    }

    function _now() {
        return Date.now();
    }

    function _safeStringify(obj) {
        try {
            return JSON.stringify(obj);
        } catch (_) {
            return String(obj);
        }
    }

    // ================================================================
    // LOGGER
    // ================================================================

    const _logger = {
        _log(level, tag, message, data) {
            const levelName = Object.keys(LOG_LEVELS).find(k => LOG_LEVELS[k] === level) || 'INFO';
            const configuredLevel = LOG_LEVELS[_state.config.logging.level] ?? LOG_LEVELS.INFO;
            if (level < configuredLevel) return;

            const timestamp = new Date().toISOString();
            const prefix = `[${timestamp}] [${levelName}] [${tag}]`;
            const consoleMethod = level >= LOG_LEVELS.ERROR ? 'error' :
                level >= LOG_LEVELS.WARN ? 'warn' :
                    level >= LOG_LEVELS.INFO ? 'info' : 'debug';
            if (_state.config.logging.console) {
                if (data !== undefined) {
                    console[consoleMethod](prefix, message, data);
                } else {
                    console[consoleMethod](prefix, message);
                }
            }
            // Emitir evento de log
            _emit('log', { level, tag, message, data, timestamp });
        },

        debug(tag, message, data) {
            this._log(LOG_LEVELS.DEBUG, tag, message, data);
        },
        info(tag, message, data) {
            this._log(LOG_LEVELS.INFO, tag, message, data);
        },
        success(tag, message, data) {
            this._log(LOG_LEVELS.SUCCESS, tag, message, data);
        },
        warn(tag, message, data) {
            this._log(LOG_LEVELS.WARN, tag, message, data);
        },
        error(tag, message, data) {
            this._log(LOG_LEVELS.ERROR, tag, message, data);
        }
    };

    // ================================================================
    // EVENT BUS
    // ================================================================

    function _on(event, callback) {
        if (!_state.events.has(event)) {
            _state.events.set(event, []);
        }
        _state.events.get(event).push(callback);
        return () => _off(event, callback);
    }

    function _once(event, callback) {
        const wrapper = (data) => {
            _off(event, wrapper);
            callback(data);
        };
        return _on(event, wrapper);
    }

    function _off(event, callback) {
        if (!_state.events.has(event)) return;
        const list = _state.events.get(event);
        const idx = list.indexOf(callback);
        if (idx !== -1) list.splice(idx, 1);
        if (list.length === 0) _state.events.delete(event);
    }

    function _emit(event, data) {
        if (_state.events.has(event)) {
            const callbacks = _state.events.get(event).slice();
            for (const cb of callbacks) {
                try {
                    cb(data);
                } catch (e) {
                    _logger.error('EventBus', `Erro ao emitir evento "${event}"`, e);
                }
            }
        }
        // Também dispara CustomEvent no DOM para integração com UI
        try {
            const customEvent = new CustomEvent(`vessiecore:${event}`, { detail: data });
            global.dispatchEvent(customEvent);
        } catch (_) { /* ignora */ }
    }

    // ================================================================
    // CONFIGURAÇÃO
    // ================================================================

    function _configGet(path) {
        const parts = path.split('.');
        let current = _state.config;
        for (const part of parts) {
            if (current && typeof current === 'object' && part in current) {
                current = current[part];
            } else {
                return undefined;
            }
        }
        return current;
    }

    function _configSet(path, value) {
        const parts = path.split('.');
        const last = parts.pop();
        let current = _state.config;
        for (const part of parts) {
            if (!current[part] || typeof current[part] !== 'object') {
                current[part] = {};
            }
            current = current[part];
        }
        current[last] = value;
        _emit('config:change', { path, value });
        return true;
    }

    function _configHas(path) {
        return _configGet(path) !== undefined;
    }

    function _configAll() {
        return { ..._state.config };
    }

    // ================================================================
    // STATE MANAGER
    // ================================================================

    function _stateGet(key) {
        return _state[key];
    }

    function _stateSet(key, value) {
        const old = _state[key];
        _state[key] = value;
        if (old !== value) {
            _emit('state:change', { key, oldValue: old, newValue: value });
        }
        return true;
    }

    function _stateUpdate(obj) {
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                _stateSet(key, obj[key]);
            }
        }
        return true;
    }

    function _stateDelete(key) {
        if (key in _state) {
            delete _state[key];
            _emit('state:change', { key, oldValue: undefined, newValue: undefined });
            return true;
        }
        return false;
    }

    function _stateHas(key) {
        return key in _state;
    }

    function _stateSnapshot() {
        const snapshot = {};
        for (const key in _state) {
            if (key.startsWith('_')) continue;
            if (_state[key] instanceof Map) {
                snapshot[key] = Array.from(_state[key].entries());
            } else if (_state[key] instanceof Set) {
                snapshot[key] = Array.from(_state[key]);
            } else {
                snapshot[key] = _state[key];
            }
        }
        return snapshot;
    }

    // ================================================================
    // STORAGE MANAGER (com fallback em memória)
    // ================================================================

    function _storageGet(key) {
        try {
            const raw = localStorage.getItem('vessiecore_' + key);
            if (raw !== null) {
                return JSON.parse(raw);
            }
        } catch (_) { /* fallback para memória */ }
        return _state.storage.get(key) ?? null;
    }

    function _storageSet(key, value) {
        try {
            localStorage.setItem('vessiecore_' + key, JSON.stringify(value));
        } catch (_) {
            // fallback para memória
            _state.storage.set(key, value);
        }
        _emit('storage:change', { key, value });
        return true;
    }

    function _storageRemove(key) {
        try {
            localStorage.removeItem('vessiecore_' + key);
        } catch (_) {
            _state.storage.delete(key);
        }
        _emit('storage:remove', { key });
        return true;
    }

    function _storageHas(key) {
        try {
            return localStorage.getItem('vessiecore_' + key) !== null;
        } catch (_) {
            return _state.storage.has(key);
        }
    }

    function _storageClear() {
        try {
            const keys = Object.keys(localStorage).filter(k => k.startsWith('vessiecore_'));
            for (const k of keys) localStorage.removeItem(k);
        } catch (_) {
            _state.storage.clear();
        }
        _emit('storage:clear');
        return true;
    }

    // ================================================================
    // ERROR MANAGER
    // ================================================================

    function _captureError(error, context = {}) {
        const entry = {
            id: _generateId(),
            timestamp: _now(),
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            context: context,
            handled: false
        };
        _state.errors.unshift(entry);
        if (_state.errors.length > 100) _state.errors.pop();
        _logger.error('ErrorManager', `Erro capturado: ${entry.message}`, entry);
        _emit('error', entry);
        return entry;
    }

    function _listErrors() {
        return [..._state.errors];
    }

    function _clearErrors() {
        _state.errors = [];
        return true;
    }

    // ================================================================
    // PERMISSION MANAGER
    // ================================================================

    function _grantPermission(moduleName, permission) {
        if (!_state.permissions.has(moduleName)) {
            _state.permissions.set(moduleName, new Set());
        }
        _state.permissions.get(moduleName).add(permission);
        _emit('permission:grant', { module: moduleName, permission });
        return true;
    }

    function _revokePermission(moduleName, permission) {
        if (!_state.permissions.has(moduleName)) return false;
        const set = _state.permissions.get(moduleName);
        const removed = set.delete(permission);
        if (removed) {
            _emit('permission:revoke', { module: moduleName, permission });
        }
        return removed;
    }

    function _hasPermission(moduleName, permission) {
        if (!_state.permissions.has(moduleName)) return false;
        return _state.permissions.get(moduleName).has(permission);
    }

    function _listPermissions(moduleName) {
        if (!_state.permissions.has(moduleName)) return [];
        return Array.from(_state.permissions.get(moduleName));
    }

    // ================================================================
    // SERVICE REGISTRY
    // ================================================================

    function _registerService(name, service) {
        if (_state.services.has(name)) {
            _logger.warn('ServiceRegistry', `Serviço "${name}" já registrado. Substituindo.`);
        }
        _state.services.set(name, service);
        _emit('service:register', { name, service });
        return true;
    }

    function _getService(name) {
        return _state.services.get(name) || null;
    }

    function _hasService(name) {
        return _state.services.has(name);
    }

    function _removeService(name) {
        if (!_state.services.has(name)) return false;
        _state.services.delete(name);
        _emit('service:remove', { name });
        return true;
    }

    function _listServices() {
        return Array.from(_state.services.keys());
    }

    // ================================================================
    // API REGISTRY
    // ================================================================

    function _registerAPI(name, handler) {
        if (_state.api.has(name)) {
            _logger.warn('APIRegistry', `API "${name}" já registrada. Substituindo.`);
        }
        _state.api.set(name, handler);
        _emit('api:register', { name });
        return true;
    }

    function _getAPI(name) {
        return _state.api.get(name) || null;
    }

    function _hasAPI(name) {
        return _state.api.has(name);
    }

    function _callAPI(name, ...args) {
        const handler = _state.api.get(name);
        if (!handler) {
            throw new Error(`API "${name}" não encontrada.`);
        }
        try {
            return handler(...args);
        } catch (e) {
            _captureError(e, { api: name, args });
            throw e;
        }
    }

    // ================================================================
    // HOOK SYSTEM
    // ================================================================

    function _registerHook(name, callback) {
        if (!_state.hooks.has(name)) {
            _state.hooks.set(name, []);
        }
        _state.hooks.get(name).push(callback);
        _emit('hook:register', { name });
        return () => _unregisterHook(name, callback);
    }

    function _unregisterHook(name, callback) {
        if (!_state.hooks.has(name)) return;
        const list = _state.hooks.get(name);
        const idx = list.indexOf(callback);
        if (idx !== -1) list.splice(idx, 1);
        if (list.length === 0) _state.hooks.delete(name);
    }

    function _executeHooks(name, data) {
        if (!_state.hooks.has(name)) return [];
        const results = [];
        for (const cb of _state.hooks.get(name)) {
            try {
                results.push(cb(data));
            } catch (e) {
                _logger.error('HookSystem', `Erro no hook "${name}"`, e);
            }
        }
        return results;
    }

    // ================================================================
    // MODULE MANAGER
    // ================================================================

    function _validateModule(module) {
        if (!module || typeof module !== 'object') {
            throw new Error('Módulo inválido: deve ser um objeto.');
        }
        if (!module.name || typeof module.name !== 'string') {
            throw new Error('Módulo inválido: campo "name" obrigatório (string).');
        }
        if (module.version && typeof module.version !== 'string') {
            throw new Error('Módulo inválido: "version" deve ser string.');
        }
        if (module.dependencies && !Array.isArray(module.dependencies)) {
            throw new Error('Módulo inválido: "dependencies" deve ser array.');
        }
        if (module.optionalDependencies && !Array.isArray(module.optionalDependencies)) {
            throw new Error('Módulo inválido: "optionalDependencies" deve ser array.');
        }
        if (module.init && typeof module.init !== 'function') {
            throw new Error('Módulo inválido: "init" deve ser função.');
        }
        if (module.start && typeof module.start !== 'function') {
            throw new Error('Módulo inválido: "start" deve ser função.');
        }
        if (module.stop && typeof module.stop !== 'function') {
            throw new Error('Módulo inválido: "stop" deve ser função.');
        }
        if (module.destroy && typeof module.destroy !== 'function') {
            throw new Error('Módulo inválido: "destroy" deve ser função.');
        }
        if (module.health && typeof module.health !== 'function') {
            throw new Error('Módulo inválido: "health" deve ser função.');
        }
        return true;
    }

    function _resolveDependencies(moduleName, dependencies, optional = false) {
        const missing = [];
        for (const dep of dependencies) {
            if (!_state.modules.has(dep) && !_state.systems.has(dep)) {
                if (!optional) {
                    missing.push(dep);
                } else {
                    _logger.warn('ModuleManager', `Dependência opcional "${dep}" não encontrada para "${moduleName}"`);
                }
            }
        }
        if (missing.length > 0) {
            throw new Error(`Dependências obrigatórias ausentes para "${moduleName}": ${missing.join(', ')}`);
        }
        return true;
    }

    function _detectCircularDependencies(moduleName, visited = new Set(), stack = []) {
        if (stack.includes(moduleName)) {
            const cycle = [...stack, moduleName].join(' -> ');
            throw new Error(`Dependência circular detectada: ${cycle}`);
        }
        if (visited.has(moduleName)) return;
        visited.add(moduleName);
        const module = _state.modules.get(moduleName);
        if (!module) return;
        const deps = module.dependencies || [];
        for (const dep of deps) {
            if (_state.modules.has(dep)) {
                _detectCircularDependencies(dep, visited, [...stack, moduleName]);
            }
        }
    }

    function _registerModule(module) {
        _validateModule(module);
        if (_state.modules.has(module.name)) {
            _logger.warn('ModuleManager', `Módulo "${module.name}" já registrado. Substituindo.`);
            // Limpar estado antigo
            const old = _state.modules.get(module.name);
            if (old._state === MODULE_STATES.RUNNING || old._state === MODULE_STATES.INITIALIZED) {
                try { _stopModule(module.name); } catch (_) { }
                try { _destroyModule(module.name); } catch (_) { }
            }
        }
        // Resolver dependências
        _resolveDependencies(module.name, module.dependencies || [], false);
        _resolveDependencies(module.name, module.optionalDependencies || [], true);
        // Detectar dependências circulares
        const tempMap = new Map(_state.modules);
        tempMap.set(module.name, { dependencies: module.dependencies || [] });
        try {
            _detectCircularDependencies(module.name, new Set(), []);
        } catch (e) {
            throw e;
        }
        // Definir estado inicial
        const moduleEntry = {
            ...module,
            _state: MODULE_STATES.REGISTERED,
            _initialized: false,
            _started: false,
            _destroyed: false
        };
        _state.modules.set(module.name, moduleEntry);
        _emit('module:register', { name: module.name, module });
        _logger.info('ModuleManager', `Módulo "${module.name}" registrado.`);
        return module;
    }

    function _unregisterModule(name) {
        if (!_state.modules.has(name)) return false;
        const module = _state.modules.get(name);
        if (module._state === MODULE_STATES.RUNNING || module._state === MODULE_STATES.INITIALIZED) {
            try { _stopModule(name); } catch (_) { }
            try { _destroyModule(name); } catch (_) { }
        }
        _state.modules.delete(name);
        _emit('module:unregister', { name });
        _logger.info('ModuleManager', `Módulo "${name}" desregistrado.`);
        return true;
    }

    function _getModule(name) {
        return _state.modules.get(name) || null;
    }

    function _hasModule(name) {
        return _state.modules.has(name);
    }

    function _listModules() {
        return Array.from(_state.modules.keys());
    }

    function _enableModule(name) {
        const module = _state.modules.get(name);
        if (!module) throw new Error(`Módulo "${name}" não encontrado.`);
        if (module._state === MODULE_STATES.DESTROYED) {
            throw new Error(`Módulo "${name}" já foi destruído.`);
        }
        if (module._state === MODULE_STATES.RUNNING) return true;
        // Inicializar se necessário
        if (!module._initialized) {
            _initModule(name);
        }
        // Iniciar se necessário
        if (!module._started) {
            _startModule(name);
        }
        return true;
    }

    function _disableModule(name) {
        const module = _state.modules.get(name);
        if (!module) throw new Error(`Módulo "${name}" não encontrado.`);
        if (module._state === MODULE_STATES.DESTROYED) return true;
        if (module._started) {
            _stopModule(name);
        }
        if (module._initialized) {
            _destroyModule(name);
        }
        return true;
    }

    function _initModule(name) {
        const module = _state.modules.get(name);
        if (!module) throw new Error(`Módulo "${name}" não encontrado.`);
        if (module._initialized) return true;
        if (module._state === MODULE_STATES.DESTROYED) {
            throw new Error(`Módulo "${name}" já foi destruído.`);
        }
        // Verificar dependências novamente
        _resolveDependencies(name, module.dependencies || [], false);
        // Inicializar dependências primeiro (ordem topológica simples)
        const deps = module.dependencies || [];
        for (const dep of deps) {
            if (_state.modules.has(dep)) {
                const depModule = _state.modules.get(dep);
                if (!depModule._initialized) {
                    _initModule(dep);
                }
            }
        }
        module._state = MODULE_STATES.INITIALIZING;
        _emit('module:init', { name });
        try {
            if (typeof module.init === 'function') {
                const result = module.init();
                if (result && typeof result.then === 'function') {
                    // Suporte a Promise
                    return result.then(() => {
                        module._initialized = true;
                        module._state = MODULE_STATES.INITIALIZED;
                        _emit('module:initialized', { name });
                        _logger.success('ModuleManager', `Módulo "${name}" inicializado.`);
                        return true;
                    }).catch(err => {
                        module._state = MODULE_STATES.ERROR;
                        _captureError(err, { module: name, phase: 'init' });
                        _emit('module:error', { name, error: err });
                        throw err;
                    });
                } else {
                    module._initialized = true;
                    module._state = MODULE_STATES.INITIALIZED;
                    _emit('module:initialized', { name });
                    _logger.success('ModuleManager', `Módulo "${name}" inicializado.`);
                    return true;
                }
            } else {
                module._initialized = true;
                module._state = MODULE_STATES.INITIALIZED;
                _emit('module:initialized', { name });
                return true;
            }
        } catch (e) {
            module._state = MODULE_STATES.ERROR;
            _captureError(e, { module: name, phase: 'init' });
            _emit('module:error', { name, error: e });
            throw e;
        }
    }

    function _startModule(name) {
        const module = _state.modules.get(name);
        if (!module) throw new Error(`Módulo "${name}" não encontrado.`);
        if (module._started) return true;
        if (module._state === MODULE_STATES.DESTROYED) {
            throw new Error(`Módulo "${name}" já foi destruído.`);
        }
        if (!module._initialized) {
            _initModule(name);
        }
        module._state = MODULE_STATES.STARTING;
        _emit('module:start', { name });
        try {
            if (typeof module.start === 'function') {
                const result = module.start();
                if (result && typeof result.then === 'function') {
                    return result.then(() => {
                        module._started = true;
                        module._state = MODULE_STATES.RUNNING;
                        _emit('module:started', { name });
                        _logger.success('ModuleManager', `Módulo "${name}" iniciado.`);
                        return true;
                    }).catch(err => {
                        module._state = MODULE_STATES.ERROR;
                        _captureError(err, { module: name, phase: 'start' });
                        _emit('module:error', { name, error: err });
                        throw err;
                    });
                } else {
                    module._started = true;
                    module._state = MODULE_STATES.RUNNING;
                    _emit('module:started', { name });
                    _logger.success('ModuleManager', `Módulo "${name}" iniciado.`);
                    return true;
                }
            } else {
                module._started = true;
                module._state = MODULE_STATES.RUNNING;
                _emit('module:started', { name });
                return true;
            }
        } catch (e) {
            module._state = MODULE_STATES.ERROR;
            _captureError(e, { module: name, phase: 'start' });
            _emit('module:error', { name, error: e });
            throw e;
        }
    }

    function _stopModule(name) {
        const module = _state.modules.get(name);
        if (!module) throw new Error(`Módulo "${name}" não encontrado.`);
        if (!module._started) return true;
        if (module._state === MODULE_STATES.DESTROYED) return true;
        module._state = MODULE_STATES.STOPPING;
        _emit('module:stop', { name });
        try {
            if (typeof module.stop === 'function') {
                const result = module.stop();
                if (result && typeof result.then === 'function') {
                    return result.then(() => {
                        module._started = false;
                        module._state = MODULE_STATES.STOPPED;
                        _emit('module:stopped', { name });
                        _logger.info('ModuleManager', `Módulo "${name}" parado.`);
                        return true;
                    }).catch(err => {
                        module._state = MODULE_STATES.ERROR;
                        _captureError(err, { module: name, phase: 'stop' });
                        _emit('module:error', { name, error: err });
                        throw err;
                    });
                } else {
                    module._started = false;
                    module._state = MODULE_STATES.STOPPED;
                    _emit('module:stopped', { name });
                    _logger.info('ModuleManager', `Módulo "${name}" parado.`);
                    return true;
                }
            } else {
                module._started = false;
                module._state = MODULE_STATES.STOPPED;
                _emit('module:stopped', { name });
                return true;
            }
        } catch (e) {
            module._state = MODULE_STATES.ERROR;
            _captureError(e, { module: name, phase: 'stop' });
            _emit('module:error', { name, error: e });
            throw e;
        }
    }

    function _destroyModule(name) {
        const module = _state.modules.get(name);
        if (!module) throw new Error(`Módulo "${name}" não encontrado.`);
        if (module._destroyed) return true;
        if (module._started) {
            _stopModule(name);
        }
        module._state = MODULE_STATES.DESTROYED;
        _emit('module:destroy', { name });
        try {
            if (typeof module.destroy === 'function') {
                const result = module.destroy();
                if (result && typeof result.then === 'function') {
                    return result.then(() => {
                        module._destroyed = true;
                        module._initialized = false;
                        module._started = false;
                        _emit('module:destroyed', { name });
                        _logger.info('ModuleManager', `Módulo "${name}" destruído.`);
                        return true;
                    }).catch(err => {
                        module._state = MODULE_STATES.ERROR;
                        _captureError(err, { module: name, phase: 'destroy' });
                        _emit('module:error', { name, error: err });
                        throw err;
                    });
                } else {
                    module._destroyed = true;
                    module._initialized = false;
                    module._started = false;
                    _emit('module:destroyed', { name });
                    _logger.info('ModuleManager', `Módulo "${name}" destruído.`);
                    return true;
                }
            } else {
                module._destroyed = true;
                module._initialized = false;
                module._started = false;
                _emit('module:destroyed', { name });
                return true;
            }
        } catch (e) {
            module._state = MODULE_STATES.ERROR;
            _captureError(e, { module: name, phase: 'destroy' });
            _emit('module:error', { name, error: e });
            throw e;
        }
    }

    function _restartModule(name) {
        _stopModule(name);
        _destroyModule(name);
        return _enableModule(name);
    }

    // ================================================================
    // SYSTEM MANAGER (integração com sistemas existentes)
    // ================================================================

    function _registerSystem(name, system) {
        if (_state.systems.has(name)) {
            _logger.warn('SystemManager', `Sistema "${name}" já registrado. Substituindo.`);
        }
        _state.systems.set(name, system);
        _emit('system:register', { name, system });
        _logger.info('SystemManager', `Sistema "${name}" registrado.`);
        return true;
    }

    function _getSystem(name) {
        return _state.systems.get(name) || null;
    }

    function _hasSystem(name) {
        return _state.systems.has(name);
    }

    function _listSystems() {
        return Array.from(_state.systems.keys());
    }

    // ================================================================
    // HEALTH MONITOR
    // ================================================================

    function _healthCheck() {
        const result = {
            kernel: _state.status === 'running' ? 'healthy' : 'degraded',
            modules: {},
            timestamp: _now()
        };
        for (const [name, module] of _state.modules) {
            if (typeof module.health === 'function') {
                try {
                    const status = module.health();
                    result.modules[name] = status || 'unknown';
                } catch (e) {
                    result.modules[name] = 'error';
                    _logger.error('HealthMonitor', `Erro no health check do módulo "${name}"`, e);
                }
            } else {
                result.modules[name] = module._state === MODULE_STATES.RUNNING ? 'healthy' :
                    module._state === MODULE_STATES.ERROR ? 'error' :
                        module._state === MODULE_STATES.DESTROYED ? 'stopped' : 'unknown';
            }
        }
        return result;
    }

    // ================================================================
    // RUNTIME MANAGER
    // ================================================================

    function _runtimeInfo() {
        const info = {
            browser: navigator.userAgent,
            language: navigator.language,
            platform: navigator.platform,
            online: navigator.onLine,
            viewport: {
                width: global.innerWidth,
                height: global.innerHeight
            },
            documentState: document.readyState,
            features: {
                localStorage: typeof localStorage !== 'undefined',
                sessionStorage: typeof sessionStorage !== 'undefined',
                fetch: typeof fetch !== 'undefined',
                WebSocket: typeof WebSocket !== 'undefined',
                Worker: typeof Worker !== 'undefined',
                indexedDB: typeof indexedDB !== 'undefined'
            },
            timestamp: _now()
        };
        return info;
    }

    // ================================================================
    // DIAGNÓSTICOS
    // ================================================================

    function _diagnostics() {
        return {
            kernel: {
                name: NAME,
                version: VERSION,
                status: _state.status,
                bootPhase: _state.bootPhase,
                uptime: _state.startTime ? _now() - _state.startTime : 0,
                startTime: _state.startTime
            },
            modules: _listModules(),
            systems: _listSystems(),
            services: _listServices(),
            errors: _listErrors().slice(0, 20),
            runtime: _runtimeInfo(),
            config: _configAll(),
            state: _stateSnapshot(),
            permissions: Array.from(_state.permissions.entries()).map(([k, v]) => ({ module: k, permissions: Array.from(v) })),
            hooks: Array.from(_state.hooks.keys()),
            events: Array.from(_state.events.keys())
        };
    }

    // ================================================================
    // BOOT MANAGER
    // ================================================================

    let _bootPromise = null;

    function _boot() {
        if (_state.status === 'running' || _state.status === 'booting') {
            _logger.warn('BootManager', 'Boot já em andamento ou sistema já rodando.');
            return _bootPromise || Promise.resolve(true);
        }
        if (_state._bootLock) {
            _logger.warn('BootManager', 'Boot bloqueado.');
            return Promise.resolve(false);
        }
        _state._bootLock = true;
        _state.status = 'booting';
        _state.startTime = _now();

        _bootPromise = new Promise((resolve, reject) => {
            try {
                _logger.info('BootManager', 'Iniciando boot...');
                _emit('kernel:boot', { phase: 'start' });

                // Fase PRE_INIT
                _state.bootPhase = BOOT_PHASES.PRE_INIT;
                _executeHooks('beforeBoot', { phase: BOOT_PHASES.PRE_INIT });
                _emit('kernel:pre-init', {});
                _logger.info('BootManager', 'Fase PRE_INIT concluída.');

                // Fase INIT
                _state.bootPhase = BOOT_PHASES.INIT;
                // Inicializar módulos com autoStart = true (se configurado)
                const autoStart = _configGet('modules.autoStart') !== false;
                if (autoStart) {
                    const modulesToStart = Array.from(_state.modules.values())
                        .filter(m => m.autoStart !== false && m._state !== MODULE_STATES.ERROR);
                    for (const module of modulesToStart) {
                        try {
                            if (!module._initialized) {
                                _initModule(module.name);
                            }
                            if (!module._started) {
                                _startModule(module.name);
                            }
                        } catch (e) {
                            _logger.error('BootManager', `Erro ao iniciar módulo "${module.name}"`, e);
                            // Não interrompe o boot
                        }
                    }
                }
                _executeHooks('afterInit', { phase: BOOT_PHASES.INIT });
                _emit('kernel:init', {});
                _logger.info('BootManager', 'Fase INIT concluída.');

                // Fase POST_INIT
                _state.bootPhase = BOOT_PHASES.POST_INIT;
                // Registrar sistemas existentes do VessieOS
                _discoverExistingSystems();
                _executeHooks('afterBoot', { phase: BOOT_PHASES.POST_INIT });
                _emit('kernel:post-init', {});
                _logger.info('BootManager', 'Fase POST_INIT concluída.');

                // Fase READY
                _state.bootPhase = BOOT_PHASES.READY;
                _state.status = 'running';
                _state._bootLock = false;
                _emit('kernel:ready', { uptime: _now() - _state.startTime });
                _logger.success('BootManager', `Kernel pronto em ${_now() - _state.startTime}ms.`);

                // Resolver promessa de ready
                if (_state._readyResolve) {
                    _state._readyResolve(true);
                    _state._readyResolve = null;
                }

                // Disparar evento DOM
                try {
                    global.dispatchEvent(new CustomEvent('vessiecore:ready', {
                        detail: { uptime: _now() - _state.startTime }
                    }));
                } catch (_) { }

                resolve(true);
            } catch (e) {
                _state.status = 'error';
                _state._bootLock = false;
                _captureError(e, { phase: 'boot' });
                _emit('kernel:error', { error: e });
                _logger.error('BootManager', `Falha no boot: ${e.message}`);
                if (_state._readyResolve) {
                    _state._readyResolve(false);
                    _state._readyResolve = null;
                }
                reject(e);
            }
        });

        return _bootPromise;
    }

    function _discoverExistingSystems() {
        // Detectar window.VessieOS
        if (global.VessieOS && typeof global.VessieOS === 'object') {
            _logger.info('BootManager', 'Detectado VessieOS global.');
            // Registrar subsistemas existentes
            for (const key in global.VessieOS) {
                if (key === 'kernel' || key === 'Kernel') continue;
                const value = global.VessieOS[key];
                if (value && typeof value === 'object') {
                    const systemName = key;
                    if (!_hasSystem(systemName)) {
                        _registerSystem(systemName, value);
                        // Se tiver método init, chamar
                        if (typeof value.init === 'function') {
                            try { value.init(); } catch (e) {
                                _logger.warn('BootManager', `Erro ao init sistema "${systemName}"`, e);
                            }
                        }
                    }
                }
            }
        }
        // Detectar VessieKernel
        if (global.VessieKernel && typeof global.VessieKernel === 'object') {
            _logger.info('BootManager', 'Detectado VessieKernel global.');
            if (!_hasSystem('VessieKernel')) {
                _registerSystem('VessieKernel', global.VessieKernel);
            }
        }
        // Detectar outros objetos Vessie*
        for (const key in global) {
            if (key.startsWith('Vessie') && key !== 'VessieCORE' && key !== 'VessieOS' && key !== 'VessieKernel') {
                const value = global[key];
                if (value && typeof value === 'object' && !_hasSystem(key)) {
                    _registerSystem(key, value);
                }
            }
        }
    }

    function _start() {
        if (_state.status === 'running') return true;
        return _boot();
    }

    function _stop() {
        if (_state.status === 'stopped' || _state.status === 'stopping') return true;
        _state.status = 'stopping';
        _emit('kernel:stop', {});
        // Parar módulos em ordem reversa
        const modules = Array.from(_state.modules.values()).reverse();
        for (const module of modules) {
            if (module._started) {
                try { _stopModule(module.name); } catch (e) {
                    _logger.error('BootManager', `Erro ao parar módulo "${module.name}"`, e);
                }
            }
        }
        _state.status = 'stopped';
        _emit('kernel:stopped', {});
        _logger.info('BootManager', 'Sistema parado.');
        return true;
    }

    function _shutdown() {
        _logger.info('BootManager', 'Desligando...');
        _emit('kernel:shutdown', {});
        _stop();
        // Destruir módulos
        const modules = Array.from(_state.modules.values()).reverse();
        for (const module of modules) {
            if (!module._destroyed) {
                try { _destroyModule(module.name); } catch (e) {
                    _logger.error('BootManager', `Erro ao destruir módulo "${module.name}"`, e);
                }
            }
        }
        _state.status = 'stopped';
        _emit('kernel:shutdown-complete', {});
        _logger.info('BootManager', 'Sistema desligado.');
        return true;
    }

    function _restart() {
        _logger.info('BootManager', 'Reiniciando...');
        _shutdown();
        // Limpar estado não persistente
        _state.errors = [];
        // Reiniciar
        return _boot();
    }

    function _ready() {
        if (_state.status === 'running') {
            return Promise.resolve(true);
        }
        if (_state.status === 'booting') {
            return _bootPromise || Promise.resolve(false);
        }
        // Se não iniciou, iniciar
        return _boot();
    }

    // ================================================================
    // INFO
    // ================================================================

    function _info() {
        return {
            name: NAME,
            version: VERSION,
            status: _state.status,
            uptime: _state.startTime ? _now() - _state.startTime : 0,
            modules: _listModules(),
            systems: _listSystems(),
            services: _listServices(),
            config: _configAll()
        };
    }

    // ================================================================
    // API PÚBLICA
    // ================================================================

    const VessieCORE = {
        // Propriedades
        version: VERSION,
        name: NAME,

        // Boot/Start/Stop/Restart/Shutdown
        boot: _boot,
        start: _start,
        stop: _stop,
        restart: _restart,
        shutdown: _shutdown,
        ready: _ready,

        // Status
        status: () => _state.status,
        info: _info,

        // Modules
        modules: {
            register: _registerModule,
            unregister: _unregisterModule,
            get: _getModule,
            has: _hasModule,
            list: _listModules,
            enable: _enableModule,
            disable: _disableModule,
            start: _startModule,
            stop: _stopModule,
            restart: _restartModule,
            init: _initModule,
            destroy: _destroyModule
        },

        // Systems
        systems: {
            register: _registerSystem,
            get: _getSystem,
            has: _hasSystem,
            list: _listSystems
        },

        // Events
        events: {
            on: _on,
            once: _once,
            off: _off,
            emit: _emit,
            clear: (event) => {
                if (event) {
                    _state.events.delete(event);
                } else {
                    _state.events.clear();
                }
                return true;
            }
        },

        // Services
        services: {
            register: _registerService,
            get: _getService,
            has: _hasService,
            remove: _removeService,
            list: _listServices
        },

        // Configuration
        config: {
            get: _configGet,
            set: _configSet,
            has: _configHas,
            all: _configAll
        },

        // State
        state: {
            get: _stateGet,
            set: _stateSet,
            update: _stateUpdate,
            delete: _stateDelete,
            has: _stateHas,
            snapshot: _stateSnapshot
        },

        // Storage
        storage: {
            get: _storageGet,
            set: _storageSet,
            remove: _storageRemove,
            has: _storageHas,
            clear: _storageClear
        },

        // Permissions
        permissions: {
            grant: _grantPermission,
            revoke: _revokePermission,
            has: _hasPermission,
            list: _listPermissions
        },

        // API Registry
        api: {
            register: _registerAPI,
            get: _getAPI,
            has: _hasAPI,
            call: _callAPI
        },

        // Hooks
        hooks: {
            register: _registerHook,
            unregister: _unregisterHook,
            execute: _executeHooks
        },

        // Errors
        errors: {
            capture: _captureError,
            list: _listErrors,
            clear: _clearErrors
        },

        // Health
        health: {
            check: _healthCheck
        },

        // Runtime
        runtime: {
            info: _runtimeInfo
        },

        // Diagnostics
        diagnostics: _diagnostics,

        // Logger (acesso direto)
        log: _logger
    };

    // ================================================================
    // EXPOSIÇÃO GLOBAL
    // ================================================================

    // Se já existir window.VessieCORE, não sobrescrever
    if (global.VessieCORE && !global.VessieCORE._vessieCoreProtected) {
        console.warn('[VessieCORE] window.VessieCORE já existe. Não sobrescrevendo.');
    } else {
        // Congelar para evitar modificações acidentais (parcial)
        Object.defineProperty(global, 'VessieCORE', {
            value: VessieCORE,
            writable: false,
            configurable: false,
            enumerable: true
        });
        // Marcar como protegido
        try {
            Object.defineProperty(VessieCORE, '_vessieCoreProtected', {
                value: true,
                writable: false,
                enumerable: false,
                configurable: false
            });
        } catch (_) { }
    }

    // Inicialização automática se o DOM estiver pronto
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            // Iniciar boot automaticamente após um pequeno delay
            setTimeout(() => {
                if (_state.status === 'created' || _state.status === 'booting') {
                    _boot().catch(() => { });
                }
            }, 10);
        });
    } else {
        setTimeout(() => {
            if (_state.status === 'created' || _state.status === 'booting') {
                _boot().catch(() => { });
            }
        }, 10);
    }

    // ================================================================
    // EXPORTAÇÃO PARA MÓDULOS (opcional)
    // ================================================================

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = VessieCORE;
    }
    if (typeof define === 'function' && define.amd) {
        define('VessieCORE', [], () => VessieCORE);
    }

    // ================================================================
    // FIM
    // ================================================================

})(typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this);
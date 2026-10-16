/**
 * AutoHealer – Kernel Self-Healing Module
 * Monitora o sistema e corrige automaticamente erros comuns.
 * 
 * Integração:
 *   window.VessieOS.kernel.registerModule('autohealer', AutoHealer);
 *   AutoHealer.start();
 */

(function () {
    'use strict';

    const AutoHealer = {
        // Configurações
        config: {
            checkInterval: 5000,          // ms entre verificações
            maxProcessMemory: 80,         // % de memória total por processo (alerta)
            maxTotalMemory: 90,           // % de memória total do sistema
            maxProcessCount: 50,          // número máximo de processos
            zombieThreshold: 120000,      // ms sem atividade (zumbi)
            autoRestartServices: true,
            autoCleanTemp: true,
            maxLogEntries: 200,
        },

        // Estado interno
        _running: false,
        _intervalId: null,
        _stats: {
            checks: 0,
            fixes: 0,
            lastFix: null,
            issues: [],
        },

        // Inicializa o autohealer
        start() {
            if (this._running) return;
            this._running = true;
            this._intervalId = setInterval(() => this._check(), this.config.checkInterval);
            this._log('AutoHealer iniciado com sucesso.', 'info');
            return this;
        },

        stop() {
            if (this._intervalId) {
                clearInterval(this._intervalId);
                this._intervalId = null;
            }
            this._running = false;
            this._log('AutoHealer parado.', 'info');
            return this;
        },

        // Verificação principal
        _check() {
            this._stats.checks++;
            const issues = [];

            // 1. Verifica processos
            const procIssues = this._checkProcesses();
            if (procIssues.length) issues.push(...procIssues);

            // 2. Verifica memória
            const memIssue = this._checkMemory();
            if (memIssue) issues.push(memIssue);

            // 3. Verifica sistema de arquivos
            const fsIssue = this._checkFilesystem();
            if (fsIssue) issues.push(fsIssue);

            // 4. Verifica serviços críticos
            const svcIssue = this._checkServices();
            if (svcIssue) issues.push(svcIssue);

            // Aplica correções
            if (issues.length) {
                this._applyFixes(issues);
                this._stats.issues = issues;
                this._stats.fixes += issues.length;
                this._stats.lastFix = Date.now();
            }
        },

        // ---------- CHECAGENS ----------
        _checkProcesses() {
            const kernel = this._getKernel();
            if (!kernel) return [];
            const procs = kernel.listProcesses ? kernel.listProcesses() : [];
            const issues = [];
            const now = Date.now();

            // Processos zumbis (sem atividade por muito tempo)
            for (const p of procs) {
                if (p.state === 'zombie' || (p.startedAt && (now - p.startedAt) > this.config.zombieThreshold && p.state !== 'running')) {
                    issues.push({
                        type: 'zombie_process',
                        pid: p.pid,
                        name: p.name,
                        description: `Processo ${p.name} (PID ${p.pid}) está zumbi ou inativo há muito tempo.`,
                    });
                }

                // Processos com alto consumo de memória
                if (p.memory && p.memory > this.config.maxProcessMemory) {
                    issues.push({
                        type: 'high_memory_process',
                        pid: p.pid,
                        name: p.name,
                        memory: p.memory,
                        description: `Processo ${p.name} consumindo ${p.memory}% da memória.`,
                    });
                }
            }

            // Excesso de processos
            if (procs.length > this.config.maxProcessCount) {
                issues.push({
                    type: 'too_many_processes',
                    count: procs.length,
                    description: `Número excessivo de processos: ${procs.length}.`,
                });
            }

            return issues;
        },

        _checkMemory() {
            const kernel = this._getKernel();
            if (!kernel || !kernel.health) return null;
            const health = kernel.health();
            const usedPercent = (health.memory.used / health.memory.total) * 100;
            if (usedPercent > this.config.maxTotalMemory) {
                return {
                    type: 'high_memory_usage',
                    used: health.memory.used,
                    total: health.memory.total,
                    percent: usedPercent,
                    description: `Uso de memória crítico: ${usedPercent.toFixed(1)}%`,
                };
            }
            return null;
        },

        _checkFilesystem() {
            const fs = window.VessieOS?.FileSystem;
            if (!fs) return null;
            try {
                // Tenta listar a raiz – se falhar, há corrupção
                const root = fs.list ? fs.list('SystemDrive') : null;
                if (root === null || root === undefined) {
                    return {
                        type: 'filesystem_corruption',
                        description: 'Sistema de arquivos parece corrompido (não foi possível listar a raiz).',
                    };
                }
                // Verifica se há nós vazios ou inválidos
                const invalid = this._findInvalidNodes(fs.root || {});
                if (invalid.length) {
                    return {
                        type: 'filesystem_invalid_nodes',
                        nodes: invalid,
                        description: `Encontrados ${invalid.length} nós inválidos no sistema de arquivos.`,
                    };
                }
            } catch (e) {
                return {
                    type: 'filesystem_error',
                    error: e.message,
                    description: `Erro ao acessar sistema de arquivos: ${e.message}`,
                };
            }
            return null;
        },

        _findInvalidNodes(node, path = '') {
            let invalid = [];
            for (const key in node) {
                const val = node[key];
                if (val === null || val === undefined) {
                    invalid.push(path + '/' + key);
                } else if (typeof val === 'object' && !Array.isArray(val)) {
                    invalid = invalid.concat(this._findInvalidNodes(val, path + '/' + key));
                }
            }
            return invalid;
        },

        _checkServices() {
            const kernel = this._getKernel();
            if (!kernel) return null;
            const services = kernel.services || new Map();
            const critical = ['kernel', 'filesystem', 'process-manager'];
            let failed = [];
            for (const name of critical) {
                const svc = services.get ? services.get(name) : null;
                if (!svc) {
                    failed.push(name);
                }
            }
            if (failed.length) {
                return {
                    type: 'critical_services_down',
                    services: failed,
                    description: `Serviços críticos inativos: ${failed.join(', ')}`,
                };
            }
            return null;
        },

        // ---------- CORREÇÕES ----------
        _applyFixes(issues) {
            for (const issue of issues) {
                try {
                    switch (issue.type) {
                        case 'zombie_process':
                            this._fixZombie(issue.pid);
                            break;
                        case 'high_memory_process':
                            this._fixHighMemory(issue.pid);
                            break;
                        case 'too_many_processes':
                            this._fixTooManyProcesses();
                            break;
                        case 'high_memory_usage':
                            this._fixHighMemoryUsage();
                            break;
                        case 'filesystem_corruption':
                        case 'filesystem_invalid_nodes':
                            this._fixFilesystem();
                            break;
                        case 'filesystem_error':
                            this._fixFilesystemError(issue.error);
                            break;
                        case 'critical_services_down':
                            this._fixServices(issue.services);
                            break;
                        default:
                            this._log(`Correção não implementada para: ${issue.type}`, 'warn');
                    }
                    this._log(`Corrigido: ${issue.description}`, 'success');
                } catch (e) {
                    this._log(`Falha ao corrigir ${issue.type}: ${e.message}`, 'error');
                }
            }
        },

        _fixZombie(pid) {
            const kernel = this._getKernel();
            if (kernel && typeof kernel.terminateProcess === 'function') {
                kernel.terminateProcess(pid);
            }
        },

        _fixHighMemory(pid) {
            // Tenta reduzir prioridade ou matar se necessário
            const kernel = this._getKernel();
            if (kernel && typeof kernel.terminateProcess === 'function') {
                kernel.terminateProcess(pid);
            }
        },

        _fixTooManyProcesses() {
            // Mata processos mais antigos
            const kernel = this._getKernel();
            if (!kernel || typeof kernel.listProcesses !== 'function') return;
            const procs = kernel.listProcesses();
            // Ordena por tempo de início (mais antigos primeiro)
            procs.sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0));
            // Mantém apenas os mais recentes (metade)
            const toKill = procs.slice(0, Math.floor(procs.length * 0.3));
            for (const p of toKill) {
                if (p.pid !== 1) { // não mata o kernel
                    kernel.terminateProcess(p.pid);
                }
            }
        },

        _fixHighMemoryUsage() {
            // Tenta limpar cache, forçar GC, etc.
            if (window.gc) {
                try { window.gc(); } catch (_) { }
            }
            // Limpa logs antigos
            const kernel = this._getKernel();
            if (kernel && kernel.logs && kernel.logs.length > this.config.maxLogEntries) {
                kernel.logs = kernel.logs.slice(0, this.config.maxLogEntries);
            }
            // Notifica
            this._log('Memória liberada via limpeza de cache e GC.', 'info');
        },

        _fixFilesystem() {
            // Tenta recriar estrutura básica se corrompida
            const fs = window.VessieOS?.FileSystem;
            if (!fs) return;
            if (!fs.root || typeof fs.root !== 'object') {
                fs.root = {
                    name: 'SystemDrive',
                    type: 'folder',
                    children: {
                        Windows: { type: 'folder', children: {} },
                        Programs: { type: 'folder', children: {} },
                        Users: { type: 'folder', children: {} },
                    }
                };
                this._log('Sistema de arquivos recriado do zero.', 'success');
            }
        },

        _fixFilesystemError(error) {
            // Tenta reinicializar o módulo de filesystem
            if (window.VessieOS?.FileSystem?.reset) {
                window.VessieOS.FileSystem.reset();
                this._log('Sistema de arquivos reiniciado.', 'success');
            }
        },

        _fixServices(services) {
            // Tenta reiniciar serviços críticos
            for (const name of services) {
                const svc = window.VessieOS?.kernel?.services?.get(name);
                if (svc && typeof svc.restart === 'function') {
                    svc.restart();
                    this._log(`Serviço ${name} reiniciado.`, 'success');
                } else {
                    // Tenta recriar via módulo
                    if (name === 'kernel') {
                        // kernel nunca deve ser reiniciado, mas podemos recarregar módulos
                    }
                }
            }
        },

        // ---------- UTILITÁRIOS ----------
        _getKernel() {
            return window.VessieOS?.kernel || window.VessieOS?.Kernel || null;
        },

        _log(message, level = 'info') {
            const kernel = this._getKernel();
            if (kernel && typeof kernel.log === 'function') {
                kernel.log(level, `[AutoHealer] ${message}`, 'AutoHealer');
            } else {
                console.log(`%c[AutoHealer] ${message}`, 'color:#a78bfa');
            }
        },

        // Expor estatísticas
        getStats() {
            return { ...this._stats };
        },

        // Executa uma verificação manual
        runCheck() {
            this._check();
            return this._stats;
        }
    };

    // Registra no sistema
    if (window.VessieOS) {
        if (!window.VessieOS.kernel) window.VessieOS.kernel = {};
        window.VessieOS.kernel.AutoHealer = AutoHealer;
        if (window.VessieOS.kernel.registerModule) {
            window.VessieOS.kernel.registerModule('autohealer', AutoHealer);
        }
    }

    // Inicializa automaticamente após o boot
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(() => AutoHealer.start(), 3000);
        });
    } else {
        setTimeout(() => AutoHealer.start(), 3000);
    }

    console.log('🧠 AutoHealer module loaded.');
})();
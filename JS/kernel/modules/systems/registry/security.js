/**
 * Categoria: SECURITY (15 sistemas)
 * Utilitários de segurança e privacidade que rodam inteiramente no
 * navegador: bloqueio por inatividade, limpeza de clipboard, medidor de
 * força de senha, logger de violação de CSP, ofuscação leve para
 * localStorage, etc.
 */
export default function buildSecuritySystems({ helpers }) {
    const { storageGet, storageSet, createIdleTimer, toast } = helpers;
    const systems = [];

    systems.push((function sessionAutoLock() {
        let dispose = null;
        return {
            id: 'security.session-auto-lock', category: 'security', name: 'Bloqueio Automático de Sessão',
            description: 'Bloqueia o sistema após 15 minutos de inatividade.',
            enabledByDefault: false,
            enable() {
                dispose = createIdleTimer(15 * 60 * 1000, () => {
                    document.dispatchEvent(new CustomEvent('vessieos:lock-requested', { detail: { reason: 'security-timeout' } }));
                });
            },
            disable() { dispose?.(); }
        };
    })());

    systems.push((function clipboardClearOnLock() {
        let handler = null;
        return {
            id: 'security.clipboard-clear-on-lock', category: 'security', name: 'Limpar Área de Transferência ao Bloquear',
            description: 'Apaga o histórico interno de itens copiados quando a tela é bloqueada.',
            enabledByDefault: false,
            enable() {
                handler = () => storageSet('clipboard-history', []);
                document.addEventListener('vessieos:lock-requested', handler);
            },
            disable() { document.removeEventListener('vessieos:lock-requested', handler); }
        };
    })());

    systems.push({
        id: 'security.password-strength-meter', category: 'security', name: 'Medidor de Força de Senha',
        description: 'Disponibiliza window.__vsysPasswordStrength(senha) para avaliar força em qualquer formulário.',
        enabledByDefault: true,
        enable() {
            window.__vsysPasswordStrength = (pwd = '') => {
                let score = 0;
                if (pwd.length >= 8) score++;
                if (pwd.length >= 12) score++;
                if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
                if (/\d/.test(pwd)) score++;
                if (/[^A-Za-z0-9]/.test(pwd)) score++;
                return { score, label: ['muito fraca', 'fraca', 'razoável', 'boa', 'forte', 'muito forte'][score] };
            };
        },
        disable() { delete window.__vsysPasswordStrength; }
    });

    systems.push({
        id: 'security.iframe-sandbox-hardening', category: 'security', name: 'Endurecimento de iFrames',
        description: 'Aplica atributos sandbox seguros a iframes de jogos/conteúdo externo que não os definem.',
        enabledByDefault: false,
        enable() {
            document.querySelectorAll('iframe:not([sandbox])').forEach(f => {
                f.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-pointer-lock');
            });
        },
        disable() { }
    });

    systems.push((function cspViolationLogger() {
        let handler = null;
        return {
            id: 'security.csp-violation-logger', category: 'security', name: 'Log de Violações de CSP',
            description: 'Registra tentativas bloqueadas por Content-Security-Policy no console e no diagnóstico.',
            enabledByDefault: true,
            enable() {
                handler = (e) => {
                    console.warn(`[Security] Violação de CSP: ${e.violatedDirective} bloqueou ${e.blockedURI}`);
                    const log = storageGet('csp-violations', []);
                    log.unshift({ directive: e.violatedDirective, uri: e.blockedURI, at: Date.now() });
                    storageSet('csp-violations', log.slice(0, 30));
                };
                document.addEventListener('securitypolicyviolation', handler);
            },
            disable() { document.removeEventListener('securitypolicyviolation', handler); }
        };
    })());

    systems.push({
        id: 'security.local-storage-obfuscation', category: 'security', name: 'Ofuscação de Dados Locais',
        description: 'Disponibiliza window.__vsysObfuscate/Deobfuscate para não guardar dados sensíveis em texto puro no localStorage.',
        enabledByDefault: false,
        enable() {
            const key = 'vsys-static-key';
            const xor = (str) => str.split('').map((c, i) => String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))).join('');
            window.__vsysObfuscate = (str) => btoa(xor(str));
            window.__vsysDeobfuscate = (str) => xor(atob(str));
        },
        disable() { delete window.__vsysObfuscate; delete window.__vsysDeobfuscate; }
    });

    systems.push({
        id: 'security.secure-id-generator', category: 'security', name: 'Gerador de ID Seguro',
        description: 'Disponibiliza window.__vsysSecureId() usando crypto.getRandomValues em vez de Math.random.',
        enabledByDefault: true,
        enable() {
            window.__vsysSecureId = () => {
                const arr = new Uint32Array(4);
                crypto.getRandomValues(arr);
                return [...arr].map(n => n.toString(16)).join('-');
            };
        },
        disable() { delete window.__vsysSecureId; }
    });

    systems.push((function privacyBlur() {
        let onBlur = null, onFocus = null;
        return {
            id: 'security.privacy-blur-on-blur', category: 'security', name: 'Privacidade ao Perder Foco',
            description: 'Borra o conteúdo da tela quando a janela do navegador perde o foco (ex: alt-tab).',
            enabledByDefault: false,
            enable() {
                onBlur = () => document.documentElement.classList.add('vsys-privacy-blur');
                onFocus = () => document.documentElement.classList.remove('vsys-privacy-blur');
                window.addEventListener('blur', onBlur);
                window.addEventListener('focus', onFocus);
            },
            disable() {
                window.removeEventListener('blur', onBlur);
                window.removeEventListener('focus', onFocus);
                document.documentElement.classList.remove('vsys-privacy-blur');
            }
        };
    })());

    systems.push({
        id: 'security.permission-usage-dashboard', category: 'security', name: 'Painel de Permissões',
        description: 'Consulta e guarda o status atual de permissões do navegador (câmera, microfone, localização).',
        enabledByDefault: false,
        async enable() {
            if (!navigator.permissions) return;
            const names = ['camera', 'microphone', 'geolocation'];
            const results = {};
            for (const name of names) {
                try { results[name] = (await navigator.permissions.query({ name })).state; } catch (e) { results[name] = 'unsupported'; }
            }
            storageSet('permission-status', results);
        },
        disable() { }
    });

    systems.push({
        id: 'security.incognito-session-mode', category: 'security', name: 'Sessão Incógnita',
        description: 'Sinaliza para outros sistemas não persistirem histórico permanente nesta sessão.',
        enabledByDefault: false,
        enable() { window.__vsysIncognito = true; },
        disable() { window.__vsysIncognito = false; }
    });

    systems.push({
        id: 'security.autofill-guard', category: 'security', name: 'Proteção de Autopreenchimento',
        description: 'Adiciona autocomplete="off" a campos marcados como sensíveis (data-sensitive).',
        enabledByDefault: false,
        enable() { document.querySelectorAll('[data-sensitive]').forEach(el => el.setAttribute('autocomplete', 'off')); },
        disable() { document.querySelectorAll('[data-sensitive]').forEach(el => el.removeAttribute('autocomplete')); }
    });

    systems.push((function lockOnTabHidden() {
        let handler = null, timeout = null;
        return {
            id: 'security.lock-on-tab-hidden', category: 'security', name: 'Bloquear ao Trocar de Aba',
            description: 'Bloqueia o sistema automaticamente se a aba ficar oculta por mais de 2 minutos.',
            enabledByDefault: false,
            enable() {
                handler = () => {
                    if (document.hidden) {
                        timeout = setTimeout(() => document.dispatchEvent(new CustomEvent('vessieos:lock-requested', { detail: { reason: 'tab-hidden' } })), 2 * 60 * 1000);
                    } else {
                        clearTimeout(timeout);
                    }
                };
                document.addEventListener('visibilitychange', handler);
            },
            disable() { document.removeEventListener('visibilitychange', handler); clearTimeout(timeout); }
        };
    })());

    systems.push({
        id: 'security.suspicious-login-alert', category: 'security', name: 'Alerta de Novo Dispositivo',
        description: 'Compara uma impressão digital básica do navegador com a última conhecida e avisa se mudou.',
        enabledByDefault: false,
        enable() {
            const fingerprint = `${navigator.userAgent}|${navigator.language}|${screen.width}x${screen.height}`;
            const last = storageGet('device-fingerprint', null);
            if (last && last !== fingerprint) toast('Login detectado em um navegador/dispositivo diferente do usual.', 'warning');
            storageSet('device-fingerprint', fingerprint);
        },
        disable() { }
    });

    systems.push({
        id: 'security.download-scanner-stub', category: 'security', name: 'Aviso de Download',
        description: 'Mostra um aviso ao "baixar" arquivos com extensões potencialmente perigosas (.exe, .scr, .bat).',
        enabledByDefault: true,
        enable() {
            window.__vsysCheckDownload = (filename = '') => {
                if (/\.(exe|scr|bat|cmd|jar)$/i.test(filename)) {
                    toast(`Atenção: "${filename}" é um tipo de arquivo potencialmente executável.`, 'warning');
                    return false;
                }
                return true;
            };
        },
        disable() { delete window.__vsysCheckDownload; }
    });

    systems.push({
        id: 'security.two-factor-code-widget', category: 'security', name: 'Gerador de Código de Verificação',
        description: 'Disponibiliza window.__vsysGenerateOTP() — gera um código de 6 dígitos válido por 30s para fluxos de segunda etapa locais.',
        enabledByDefault: false,
        enable() {
            window.__vsysGenerateOTP = () => {
                const window30s = Math.floor(Date.now() / 30000);
                const code = String(Math.abs(window30s * 9301 + 49297) % 1000000).padStart(6, '0');
                return { code, expiresInMs: 30000 - (Date.now() % 30000) };
            };
        },
        disable() { delete window.__vsysGenerateOTP; }
    });

    return systems;
}

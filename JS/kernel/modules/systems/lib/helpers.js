/**
 * Helpers compartilhados pelos micro-sistemas do SystemsRuntime.
 * Mantém cada arquivo de categoria em systems/registry/*.js pequeno e
 * focado — toda a "mecânica" repetida (toggle de classe CSS, widget
 * flutuante, storage, toast) mora aqui.
 */

const STORAGE_PREFIX = 'vessieos_sys_';

export function storageGet(key, fallback = null) {
    try {
        const raw = localStorage.getItem(STORAGE_PREFIX + key);
        return raw === null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
}

export function storageSet(key, value) {
    try { localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value)); } catch (e) { /* quota cheia — ignora */ }
}

export function toast(message, kind = 'info') {
    if (typeof window.toast === 'function') {
        window.toast(message, kind);
    } else {
        console.log(`[VessieOS] ${message}`);
    }
}

/** Injeta um bloco <style> uma única vez, identificado por id. */
export function injectCSS(id, css) {
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
}

/** Alterna uma classe CSS em document.documentElement (persistindo o estado). */
export function classToggleSystem({ id, className, target = 'documentElement' }) {
    const el = () => target === 'documentElement' ? document.documentElement : document.querySelector(target);
    return {
        enable() { el()?.classList.add(className); storageSet(id, true); },
        disable() { el()?.classList.remove(className); storageSet(id, false); },
        isEnabled() { return !!storageGet(id, false); },
        restore() { if (storageGet(id, false)) el()?.classList.add(className); }
    };
}

/** Cria um pequeno widget flutuante e devolve helpers para show/hide/dispose. */
export function createWidget({ id, title, icon = 'fa-cube', className = '' }) {
    let el = document.getElementById(id);
    if (el) el.remove();
    el = document.createElement('div');
    el.id = id;
    el.className = `vsys-widget ${className}`;
    el.innerHTML = `
        <div class="vsys-widget-head">
            <span><i class="fas ${icon}"></i> ${title}</span>
            <button class="vsys-widget-close" aria-label="Fechar">&times;</button>
        </div>
        <div class="vsys-widget-body"></div>`;
    el.querySelector('.vsys-widget-close').addEventListener('click', () => el.remove());
    document.body.appendChild(el);
    return { el, body: el.querySelector('.vsys-widget-body') };
}

/** Timer de inatividade simples (mouse/teclado), usado por vários sistemas de UX/segurança. */
export function createIdleTimer(ms, onIdle) {
    let t = null;
    const reset = () => { clearTimeout(t); t = setTimeout(onIdle, ms); };
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart'];
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => { clearTimeout(t); events.forEach(e => window.removeEventListener(e, reset)); };
}

export function formatBytes(bytes) {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

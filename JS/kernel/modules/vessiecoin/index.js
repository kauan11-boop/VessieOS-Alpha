/**
 * VessieCoin — sistema de economia do VessieOS (estilo "Microsoft Rewards").
 *
 * Script clássico (não-módulo ES) porque precisa ser chamado diretamente
 * por JS/core/main.js (window.steamPlay) e por outras partes clássicas
 * do sistema, sem precisar de import/export.
 *
 * API pública: window.VessieCoin
 *   .getBalance()                 -> número de moedas atuais
 *   .earn(amount, reason, meta)   -> credita moedas, registra no histórico, notifica
 *   .spend(amount, reason, meta)  -> debita moedas (retorna false se saldo insuficiente)
 *   .getHistory(limit)            -> últimas transações
 *   .canEarnFrom(sourceId)        -> respeita cooldown por fonte (evita farming por spam-clique)
 *   .isUnlocked(itemId)           -> item da loja já comprado?
 *   .unlock(itemId)               -> marca item como comprado (usado pela Loja)
 *   .onChange(fn)                 -> assina mudanças de saldo
 */
(function () {
    const WALLET_KEY = 'vessiecoin_wallet';
    const HISTORY_KEY = 'vessiecoin_history';
    const UNLOCKS_KEY = 'vessiecoin_unlocks';
    const COOLDOWN_KEY = 'vessiecoin_cooldowns';
    const EARN_COOLDOWN_MS = 3 * 60 * 1000; // 1 recompensa por fonte a cada 3 minutos — evita farming

    function read(key, fallback) {
        try { const raw = localStorage.getItem(key); return raw === null ? fallback : JSON.parse(raw); }
        catch (e) { return fallback; }
    }
    function write(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* quota cheia */ }
    }

    const listeners = new Set();
    function notify() {
        const balance = getBalance();
        listeners.forEach(fn => { try { fn(balance); } catch (e) { } });
        document.dispatchEvent(new CustomEvent('vessiecoin:change', { detail: { balance } }));
    }

    function getBalance() {
        return read(WALLET_KEY, 0);
    }

    function pushHistory(entry) {
        const history = read(HISTORY_KEY, []);
        history.unshift({ ...entry, at: Date.now() });
        write(HISTORY_KEY, history.slice(0, 100));
    }

    function canEarnFrom(sourceId) {
        const cooldowns = read(COOLDOWN_KEY, {});
        const last = cooldowns[sourceId] || 0;
        return Date.now() - last >= EARN_COOLDOWN_MS;
    }

    function markEarned(sourceId) {
        const cooldowns = read(COOLDOWN_KEY, {});
        cooldowns[sourceId] = Date.now();
        write(COOLDOWN_KEY, cooldowns);
    }

    function earn(amount, reason, meta = {}) {
        if (!amount || amount <= 0) return getBalance();
        // Se a recompensa vier de uma fonte identificada (ex: um jogo específico),
        // respeita o cooldown para não permitir farmar clicando repetidamente.
        if (meta.sourceId) {
            if (!canEarnFrom(meta.sourceId)) return getBalance();
            markEarned(meta.sourceId);
        }
        const balance = getBalance() + amount;
        write(WALLET_KEY, balance);
        pushHistory({ type: 'earn', amount, reason });
        notify();
        if (typeof window.toast === 'function') window.toast(`+${amount} VessieCoin — ${reason}`, 'success');
        return balance;
    }

    function spend(amount, reason, meta = {}) {
        const current = getBalance();
        if (amount <= 0 || current < amount) {
            if (typeof window.toast === 'function') window.toast('Moedas insuficientes.', 'error');
            return false;
        }
        write(WALLET_KEY, current - amount);
        pushHistory({ type: 'spend', amount, reason });
        if (meta.itemId) unlock(meta.itemId);
        notify();
        if (typeof window.toast === 'function') window.toast(`-${amount} VessieCoin — ${reason}`, 'info');
        return true;
    }

    function getHistory(limit = 20) {
        return read(HISTORY_KEY, []).slice(0, limit);
    }

    function isUnlocked(itemId) {
        return read(UNLOCKS_KEY, []).includes(itemId);
    }

    function unlock(itemId) {
        const unlocks = read(UNLOCKS_KEY, []);
        if (!unlocks.includes(itemId)) { unlocks.push(itemId); write(UNLOCKS_KEY, unlocks); }
    }

    function onChange(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
    }

    window.VessieCoin = { getBalance, earn, spend, getHistory, canEarnFrom, isUnlocked, unlock, onChange };
})();

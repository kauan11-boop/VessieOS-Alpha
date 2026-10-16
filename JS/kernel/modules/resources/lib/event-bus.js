/**
 * VessieOS Kernel — Event Bus
 *
 * Barramento de eventos pub/sub para o kernel virtual (window.VessieOS.kernel).
 * Até agora, quem queria saber quando um processo era criado/terminado ou
 * um log era registrado precisava ficar chamando kernel.listProcesses()
 * ou kernel.logs repetidamente (polling). Com o Event Bus, qualquer parte
 * do sistema pode simplesmente escutar:
 *
 *   window.VessieOS.EventBus.on('process:created', (proc) => { ... });
 *   window.VessieOS.EventBus.on('process:terminated', (proc) => { ... });
 *   window.VessieOS.EventBus.on('kernel:log', (entry) => { ... });
 *
 * JS/kernel/kernel.js dispara esses eventos (com checagem defensiva, então
 * funciona mesmo que o kernel.js seja carregado antes deste arquivo).
 */
(function () {
  const listeners = new Map(); // event -> Set<fn>

  function on(event, fn) {
    if (!event || typeof fn !== 'function') return () => {};
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(fn);
    // retorna uma função de "unsubscribe" pronta, pra não precisar guardar a referência à parte
    return () => off(event, fn);
  }

  function once(event, fn) {
    const unsubscribe = on(event, (...args) => {
      unsubscribe();
      fn(...args);
    });
    return unsubscribe;
  }

  function off(event, fn) {
    const set = listeners.get(event);
    if (set) set.delete(fn);
  }

  function emit(event, payload) {
    const set = listeners.get(event);
    if (!set || !set.size) return;
    // Cópia defensiva: se um handler se desinscrever durante a emissão,
    // não queremos que isso quebre a iteração dos outros
    [...set].forEach((fn) => {
      try {
        fn(payload);
      } catch (error) {
        console.error(`[EventBus] listener de "${event}" falhou:`, error);
      }
    });
  }

  function eventNames() {
    return [...listeners.keys()].filter((event) => listeners.get(event).size > 0);
  }

  window.VessieOS = window.VessieOS || {};
  window.VessieOS.EventBus = { on, once, off, emit, eventNames };
})();
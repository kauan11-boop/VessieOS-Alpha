/**
 * Simulador de "Tela Azul" (BSOD) do VessieOS.
 *
 * Isto é 100% cosmético — uma sobreposição visual dentro da própria
 * simulação de desktop do VessieOS. Não reinicia o computador real, não
 * altera nenhuma configuração de hardware, e não faz nada fora da aba do
 * navegador. É o mesmo tipo de "crash" fictício que qualquer jogo ou
 * simulador de SO usa para dar feedback de que uma ação (aqui: levar
 * todos os sliders de overclock ao máximo ao mesmo tempo) foi arriscada.
 *
 * API pública:
 *   window.__vsysTriggerBSOD(stopCode, crashedProcessId)
 *   window.__vsysCrashProcess(id) — marca um processo como "Falha" no
 *     Gerenciador de Tarefas (se estiver aberto) e registra no log de
 *     erros do sistema (Central de Erros / diagnostics.crash-reporter).
 */
(function () {
    function markProcessCrashed(id) {
        if (!id) return;
        // Persiste para que o Gerenciador de Tarefas, mesmo fechado agora,
        // já abra mostrando o processo como travado da próxima vez.
        try {
            const key = 'vsys_crashed_processes';
            const list = JSON.parse(localStorage.getItem(key) || '[]');
            if (!list.includes(id)) { list.push(id); localStorage.setItem(key, JSON.stringify(list)); }
        } catch (e) { /* localStorage indisponível */ }

        // Atualiza ao vivo se o Gerenciador de Tarefas já estiver aberto.
        const row = document.querySelector(`[data-proc-id="${id}"]`);
        if (row) {
            const statusCell = row.children[3];
            const actionCell = row.children[4];
            if (statusCell) statusCell.innerHTML = '<span style="color:#ef4444;font-size:.75rem;">●</span> Falha';
            if (actionCell) actionCell.innerHTML = '<span style="color:#ef4444;font-size:.7rem;">Travado</span>';
            row.style.opacity = '0.6';
        }

        // Registra no mesmo log usado pela Central de Erros (diagnostics.crash-reporter)
        try {
            const logKey = 'vessieos_sys_crash-log';
            const log = JSON.parse(localStorage.getItem(logKey) || '[]');
            log.unshift({ message: `Processo travado: ${id}`, type: 'process-crash', at: Date.now() });
            localStorage.setItem(logKey, JSON.stringify(log.slice(0, 40)));
        } catch (e) { }
    }

    function triggerBSOD(stopCode = 'UNEXPECTED_KERNEL_MODE_TRAP', crashedProcessId = null) {
        if (document.getElementById('vsys-bsod-overlay')) return; // já mostrando
        markProcessCrashed(crashedProcessId);

        const overlay = document.createElement('div');
        overlay.id = 'vsys-bsod-overlay';
        overlay.style.cssText = `
            position: fixed; inset: 0; z-index: 999999;
            background: #0057b8; color: #fff;
            font-family: 'Segoe UI', Tahoma, sans-serif;
            display: flex; flex-direction: column;
            justify-content: center;
            padding: 8vh 10vw;
            cursor: default;
        `;
        overlay.innerHTML = `
            <div style="font-size: 6rem; margin-bottom: 24px;">:(</div>
            <div style="font-size: 1.4rem; max-width: 640px; line-height: 1.5; margin-bottom: 20px;">
                Seu sistema encontrou um problema e precisa reiniciar. Estamos apenas
                coletando algumas informações de erro e logo você poderá continuar de onde parou.
            </div>
            <div style="font-size: 1rem; margin-bottom: 30px;">
                <span id="vsys-bsod-progress">0</span>% completo
            </div>
            <div style="font-size: 0.85rem; opacity: 0.85; max-width: 640px;">
                Se você quiser saber mais, pode pesquisar depois pelo código de erro:<br>
                <b>${stopCode}</b>
            </div>
        `;
        document.body.appendChild(overlay);

        const progressEl = overlay.querySelector('#vsys-bsod-progress');
        let progress = 0;
        const interval = setInterval(() => {
            progress += 2 + Math.random() * 6;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                setTimeout(() => {
                    overlay.style.transition = 'opacity 0.6s ease';
                    overlay.style.opacity = '0';
                    setTimeout(() => overlay.remove(), 650);
                    if (typeof window.toast === 'function') {
                        window.toast('O sistema se recuperou do erro crítico.', 'info');
                    }
                }, 900);
            }
            progressEl.textContent = Math.floor(progress);
        }, 180);
    }

    window.__vsysTriggerBSOD = triggerBSOD;
    window.__vsysCrashProcess = markProcessCrashed;
})();

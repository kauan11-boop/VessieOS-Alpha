// vm-manager/vm-manager.js — VM Manager (pasta com view.html + view.css + vm-manager.js)
// Shell em view.html (token {{vmsHtml}}); estilos inline convertidos em classes
// no view.css (visuais idênticos). Fallback inline idêntico (só sem fetch).
(function () {
  "use strict";

function vmListHtml(vms) {
    if (!vms.length) return '<div class="vm-empty">Nenhuma VM criada ainda. Crie uma para isolar jogos, navegadores e ambientes de teste.</div>';
    return vms.map(vm => `<div class="vm-card"><div class="vm-type">${vm.type}</div><div class="vm-name">${vm.name}</div><div class="vm-status">Status: ${vm.status}</div><div class="vm-actions"><button class="vm-snap" onclick="VessieVMManager.snapshot('${vm.id}');toast('Snapshot criado','success')">Snapshot</button><button class="vm-restore" onclick="VessieVMManager.restore('${vm.id}');toast('VM restaurada','success')">Restaurar</button></div></div>`).join('');
  }

function vmFallback(data) {
    // Cópia fiel do modelo original (inline styles): só usada sem fetch.
    const vms = data.vms;
    return `
    <div style="padding:18px;height:100%;overflow:auto;background:linear-gradient(180deg,rgba(255,255,255,.03),transparent)">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div><div style="font-size:.72rem;text-transform:uppercase;color:var(--dim)">Máquinas virtuais</div><h3 style="margin:4px 0 0;color:#fff">Gerenciador de ambientes isolados</h3></div>
        <button onclick="window.createVessieVm()" style="background:linear-gradient(135deg,var(--a),var(--a2));border:none;color:white;padding:8px 14px;border-radius:999px;cursor:pointer">Nova VM</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px">
        ${vms.length ? vms.map(vm => `<div style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:14px"><div style="font-size:.78rem;color:var(--dim);margin-bottom:6px">${vm.type}</div><div style="font-size:1rem;font-weight:600;color:#fff">${vm.name}</div><div style="font-size:.78rem;color:var(--text-2);margin-top:8px">Status: ${vm.status}</div><div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button onclick="VessieVMManager.snapshot('${vm.id}');toast('Snapshot criado','success')" style="background:rgba(96,165,250,.16);border:none;color:white;padding:7px 11px;border-radius:999px;cursor:pointer">Snapshot</button><button onclick="VessieVMManager.restore('${vm.id}');toast('VM restaurada','success')" style="background:rgba(34,211,238,.16);border:none;color:white;padding:7px 11px;border-radius:999px;cursor:pointer">Restaurar</button></div></div>`).join('') : '<div style="grid-column:1/-1;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:18px;color:var(--dim)">Nenhuma VM criada ainda. Crie uma para isolar jogos, navegadores e ambientes de teste.</div>'}
      </div>
    </div>`;
  }

function openVmManager() {
    const vms = VessieVMManager.list();
    const data = { vmsHtml: vmListHtml(vms), vms };
    const win = createWin('VM Manager', '🧠', '<div class="app-loading">Carregando…</div>', 760, 540);
    const mount = (html) => { if (document.body.contains(win)) win.querySelector('.wb').innerHTML = html; };
    if (window.VessieBridge && typeof window.VessieBridge.loadView === 'function') {
      window.VessieBridge.loadView('vm-manager', { html: vmFallback(data) }, data).then(({ html }) => mount(html));
    } else {
      mount(vmFallback(data));
    }
    return win;
  }
window.openVmManager = openVmManager;
})();

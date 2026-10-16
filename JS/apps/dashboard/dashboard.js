// dashboard/dashboard.js — Dashboard (pasta com view.html + view.css + dashboard.js)
// Shell em view.html; fallback = modelo original verbatim (só sem fetch).
// Gráfico/tabela dinâmicos permanecem no JS, inalterados.
(function () {
  "use strict";

const DASH_FALLBACK_HTML = `
    <div class="dash" id="dash-main">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
        <h3 style="font-size:1.05rem;color:var(--text)">📊 Painel de Controle</h3>
        <button class="d-ref" onclick="refreshDash()"><i class="fas fa-sync-alt"></i> Atualizar</button>
      </div>
      <div class="d-cards" id="d-cards">
        <div class="dc"><div class="di2">💰</div><div class="dl">Vendas</div><div class="dv" id="dc-vendas">R$42.5k</div><div class="dd pos" id="dc-vp">↑ +8.3%</div></div>
        <div class="dc"><div class="di2">👥</div><div class="dl">Usuários</div><div class="dv" id="dc-users">12.4k</div><div class="dd pos" id="dc-up">↑ +2.1%</div></div>
        <div class="dc"><div class="di2">📈</div><div class="dl">Receita</div><div class="dv" id="dc-rec">R$88.2k</div><div class="dd neg" id="dc-rp">↓ -1.4%</div></div>
        <div class="dc"><div class="di2">🎯</div><div class="dl">Conversão</div><div class="dv" id="dc-conv">3.8%</div><div class="dd pos" id="dc-cp">↑ +0.5%</div></div>
      </div>
      <div class="d-chart">
        <div class="d-ct"><span>Vendas por Mês</span><button class="d-ref" onclick="refreshChart()"><i class="fas fa-random"></i></button></div>
        <div class="bc" id="bar-chart"></div>
      </div>
      <div class="d-chart">
        <div class="d-ct"><span>Atividade Recente</span>
          <input placeholder="🔍 Filtrar..." oninput="filterTable(this.value)" style="background:rgba(255,255,255,.06);border:1px solid var(--border);border-radius:20px;padding:4px 12px;color:white;outline:none;font-size:.78rem;width:160px">
        </div>
        <table class="d-tbl">
          <thead><tr><th>Nome</th><th>Status</th><th>Valor</th><th>Data</th><th>Ação</th></tr></thead>
          <tbody id="d-tbody">
            <tr><td>Ana Silva</td><td><span class="sb ok">Ativo</span></td><td>R$1.2k</td><td>21/05</td><td><button onclick="toast('Detalhes de Ana 📊')" style="background:rgba(126,182,255,.12);border:none;color:var(--a2);padding:3px 10px;border-radius:20px;font-size:.75rem;cursor:pointer">Ver</button></td></tr>
            <tr><td>Bruno Costa</td><td><span class="sb w">Pendente</span></td><td>R$840</td><td>20/05</td><td><button onclick="toast('Detalhes de Bruno 📊')" style="background:rgba(126,182,255,.12);border:none;color:var(--a2);padding:3px 10px;border-radius:20px;font-size:.75rem;cursor:pointer">Ver</button></td></tr>
            <tr><td>Carla Mendes</td><td><span class="sb ok">Ativo</span></td><td>R$3.1k</td><td>19/05</td><td><button onclick="toast('Detalhes de Carla 📊')" style="background:rgba(126,182,255,.12);border:none;color:var(--a2);padding:3px 10px;border-radius:20px;font-size:.75rem;cursor:pointer">Ver</button></td></tr>
            <tr><td>Diego Ramos</td><td><span class="sb e">Inativo</span></td><td>R$290</td><td>18/05</td><td><button onclick="toast('Detalhes de Diego 📊')" style="background:rgba(126,182,255,.12);border:none;color:var(--a2);padding:3px 10px;border-radius:20px;font-size:.75rem;cursor:pointer">Ver</button></td></tr>
            <tr><td>Elena Santos</td><td><span class="sb ok">Ativo</span></td><td>R$5.6k</td><td>17/05</td><td><button onclick="toast('Detalhes de Elena 📊')" style="background:rgba(126,182,255,.12);border:none;color:var(--a2);padding:3px 10px;border-radius:20px;font-size:.75rem;cursor:pointer">Ver</button></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  `;

function openDashboard() {
    const win = createWin('Dashboard', '📊', '<div class="app-loading">Carregando…</div>', 740, 580);
    const wire = () => setTimeout(() => renderBarChart(), 100);
    if (window.VessieBridge && typeof window.VessieBridge.loadView === 'function') {
      window.VessieBridge.loadView('dashboard', { html: DASH_FALLBACK_HTML }, {}).then(({ html }) => {
        if (!document.body.contains(win)) return;
        win.querySelector('.wb').innerHTML = html;
        wire();
      });
    } else {
      win.querySelector('.wb').innerHTML = DASH_FALLBACK_HTML;
      wire();
    }
    return win;
  }

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul'];

let barData = [65, 80, 45, 90, 70, 85, 60];

function renderBarChart() {
    const bc = document.getElementById('bar-chart'); if (!bc) return;
    bc.innerHTML = ''; const max = Math.max(...barData);
    barData.forEach((v, i) => {
      const item = document.createElement('div'); item.className = 'bi';
      const pct = Math.round((v / max) * 100);
      item.innerHTML = `<div class="bar" style="height:${pct}%"></div><div class="bl">${MONTHS[i]}</div>`;
      bc.appendChild(item);
    });
  }

window.refreshChart = function () { barData = MONTHS.map(() => 30 + Math.floor(Math.random() * 70)); renderBarChart(); toast('Gráfico atualizado! 📊', 'success'); };

window.refreshDash = function () {
    refreshChart();
    const pairs = [['dc-vendas', 'dc-vp', 'R$', 'k', 10, 100], ['dc-users', 'dc-up', '', 'k', 5, 50], ['dc-rec', 'dc-rp', 'R$', 'k', 20, 200], ['dc-conv', 'dc-cp', '', '%', 1, 10]];
    pairs.forEach(([vid, pid, pre, suf, min, max]) => {
      const el = document.getElementById(vid); const pe = document.getElementById(pid); if (!el || !pe) return;
      const v = (min + Math.random() * (max - min)).toFixed(1); const ch = ((Math.random() - .4) * 20).toFixed(1);
      el.textContent = `${pre}${v}${suf}`; const pos = parseFloat(ch) >= 0;
      pe.textContent = `${pos ? '↑' : '↓'} ${pos ? '+' : ''}${ch}%`; pe.className = `dd ${pos ? 'pos' : 'neg'}`;
    });
    toast('Dashboard atualizado! ✨', 'success');
  };

window.updateCard = function () { return; };

window.filterTable = function (q) {
    document.querySelectorAll('#d-tbody tr').forEach(tr => { tr.style.display = tr.cells[0].textContent.toLowerCase().includes(q.toLowerCase()) ? '' : 'none'; });
  };
window.openDashboard = openDashboard;
})();

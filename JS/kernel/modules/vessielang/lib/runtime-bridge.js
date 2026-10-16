/**
 * VessieLang <-> VessieOS Runtime Bridge
 * ---------------------------------------------------------------
 * Conecta o motor da linguagem própria do Kauan (VessieLang: B1/J3/G5/FULL,
 * ver lib/VL_Full.js e lib/dispatcher.js) aos sistemas REAIS do VessieOS,
 * em vez de deixá-la rodar isolada contra os mocks originais do projeto
 * VessieLang (Vessie/fs.js, security.js, os.js, gamehub.js, modules.js -
 * carregados antes deste arquivo e usados aqui como estado/fallback local).
 *
 * Ordem de carregamento (ver scripts[] em JS/systems/desktop/main.js):
 *   B1_Lang.js -> J3_Lang.js -> G5_Lang.js -> VL_Full.js -> dispatcher.js ->
 *   vl-fs.js -> vl-security.js -> vl-kernel.js -> vl-modules.js -> vl-os.js ->
 *   vl-gamehub.js -> (este arquivo)
 *
 * Este arquivo é um script clássico (não ES module) de propósito: os
 * engines VessieLang se auto-registram em globais (window.FS, window.OS...)
 * exatamente como window.Vessie3DPro faz para o motor 3D - ver comentário
 * em JS/kernel/modules/index.js. O ScriptingManager real (classe ES6,
 * JS/kernel/modules/vessielang/index.js) só localiza `window.VessieLangRuntime`
 * já pronto, criado no fim deste arquivo.
 *
 * Todas as chamadas para APIs assíncronas do VessieOS (IA, rede, coletor)
 * são "fire-and-forget com notificação": o interpretador FULL é síncrono
 * (não existe await dentro do .vl), então cada chamada devolve um aviso
 * imediato e o resultado real chega via notificação (gui.notify/OS.toast) e
 * pode ser lido depois com `.last`/`.lastGames`/`.lastWeb` - o mesmo padrão
 * que o VL_Full.js original já usava (ex: 'network.fetch' simulado).
 */
(function (global) {
  'use strict';

  // ----------------------------------------------------------------
  // Notificação unificada: tenta o toast real do VessieOS
  // (window.toast, exposto por JS/core/main.js), cai para o container
  // #toasts nativo do index.html, e por fim para o console.
  // ----------------------------------------------------------------
  function notify(title, body, kind) {
    const msg = body ? `${title}: ${body}` : title;
    try {
      if (typeof global.toast === 'function') {
        global.toast(msg, kind || 'info');
        return true;
      }
    } catch (e) { /* segue para o fallback */ }
    try {
      const box = document.getElementById('toasts');
      if (box) {
        const el = document.createElement('div');
        el.className = 'toast toast-' + (kind || 'info');
        el.textContent = msg;
        box.appendChild(el);
        setTimeout(() => el.remove(), 4500);
        return true;
      }
    } catch (e) { /* segue para o fallback */ }
    console.log(`[VessieLang][${kind || 'info'}] ${msg}`);
    return false;
  }

  // ----------------------------------------------------------------
  // Modules.notify / OS.toast: mantém o comportamento original do
  // VessieLang (grava no vl-modules.js / log em disco virtual) e ADEMAIS
  // dispara a notificação real na interface do VessieOS.
  // ----------------------------------------------------------------
  if (global.Modules && typeof global.Modules.notify === 'function') {
    const originalNotify = global.Modules.notify.bind(global.Modules);
    global.Modules.notify = function (titulo, corpo, tipo) {
      notify(titulo, corpo, tipo);
      return originalNotify(titulo, corpo, tipo);
    };
  }
  if (global.OS) {
    global.OS.toast = function (msg) { notify('VessieLang', msg, 'info'); return msg; };
  }

  // ----------------------------------------------------------------
  // file.* -> além de persistir no disco virtual próprio do VessieLang
  // (localStorage, ver vl-fs.js), espelha o arquivo no filesystem REAL
  // do VessieOS (window.VessieOS.FileSystem, JS/kernel/filesystem.js),
  // para que arquivos criados por um script .vl fiquem visíveis para o
  // resto do sistema (Explorador de Arquivos, execução de "programas").
  // ----------------------------------------------------------------
  if (global.FS && typeof global.FS.writeFile === 'function') {
    const originalWrite = global.FS.writeFile.bind(global.FS);
    global.FS.writeFile = function (caminho, conteudo) {
      const ok = originalWrite(caminho, conteudo);
      try {
        const realFS = global.VessieOS && global.VessieOS.FileSystem;
        if (realFS && typeof realFS.add === 'function') {
          const relativo = String(caminho).replace(/^\/?C\/?/, '').replace(/^\/+/, '');
          const nome = relativo.split('/').pop() || relativo;
          realFS.add('Programs/' + relativo, { name: nome, type: 'file', value: conteudo, children: null });
        }
      } catch (e) { /* nunca deve travar o script do usuário */ }
      return ok;
    };
  }

  // ----------------------------------------------------------------
  // Security.audit -> além do log próprio, valida execuções (system.exec)
  // contra as regras REAIS do VessieOS (window.VessieOS.Security), e
  // avisa o usuário se algo for bloqueado.
  // ----------------------------------------------------------------
  if (global.Security && typeof global.Security.audit === 'function') {
    const originalAudit = global.Security.audit.bind(global.Security);
    global.Security.audit = function (msg) {
      originalAudit(msg);
      try {
        const realSecurity = global.VessieOS && global.VessieOS.Security;
        if (realSecurity && typeof msg === 'string' && msg.indexOf('exec ') === 0) {
          const alvo = msg.slice(5);
          const verificacao = realSecurity.validateExecutable(alvo);
          if (!verificacao.ok) notify('Segurança', 'Execução bloqueada: ' + verificacao.reason, 'error');
        }
      } catch (e) { /* auditoria nunca deve travar o script */ }
    };
  }

  // ================================================================
  //  NOVAS APIs: ai.* / net.* / collector.* (expostas ao VL_Full via
  //  NSNomes + mapa4, ver lib/VL_Full.js)
  // ================================================================

  const AI = {
    last: null,
    pending: false,
    ask(prompt) {
      this.pending = true;
      (async () => {
        try {
          const ai = global.VessieOS && global.VessieOS.ai; // LMStudioIntegration, ver ai-integration/index.js
          let resposta;
          if (ai && typeof ai.chat === 'function') {
            const r = await ai.chat(String(prompt));
            resposta = (r && (r.content || r.message || r)) || '(sem resposta)';
          } else {
            resposta = '(IA local indisponível — abra Configurações > IA e conecte o LM Studio)';
          }
          AI.last = String(resposta);
          notify('Vessie AI', AI.last.length > 180 ? AI.last.slice(0, 180) + '…' : AI.last, 'success');
        } catch (e) {
          AI.last = 'ERRO: ' + e.message;
          notify('Vessie AI', AI.last, 'error');
        } finally {
          AI.pending = false;
        }
      })();
      return '[ai] pergunta enviada — leia a resposta em ai.last() quando estiver pronta';
    }
  };

  const NET = {
    last: null,
    pending: false,
    _timeoutMs: 10000,
    async _request(url, options) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), this._timeoutMs);
      try {
        const response = await fetch(url, Object.assign({}, options, { signal: controller.signal }));
        const body = await response.text();
        return { ok: response.ok, status: response.status, body: body.slice(0, 4000) };
      } finally {
        clearTimeout(timer);
      }
    },
    _fire(url, options) {
      this.pending = true;
      this._request(url, options).then((resultado) => {
        NET.last = resultado;
        notify('Rede', `${url} → HTTP ${resultado.status}`, resultado.ok ? 'success' : 'error');
      }).catch((erro) => {
        NET.last = { ok: false, error: erro.message };
        notify('Rede', `${url} falhou: ${erro.message}`, 'error');
      }).finally(() => { NET.pending = false; });
      return `[net] requisição iniciada para ${url} — leia net.last() quando estiver pronta`;
    },
    get(url) { return this._fire(url, { method: 'GET' }); },
    post(url, body) {
      const payload = typeof body === 'string' ? body : JSON.stringify(body);
      return this._fire(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload });
    }
  };

  const COLLECTOR = {
    lastGames: [],
    lastWeb: [],
    pending: false,
    games(nomeFonte) {
      this.pending = true;
      try {
        const GameHubCollectorClass = global.GameHubCollector;
        if (!GameHubCollectorClass) {
          this.pending = false;
          notify('Coletor de Jogos', 'GameHubCollector não carregado no boot', 'error');
          return '[collector] indisponível';
        }
        if (!global.__vlGameCollector) global.__vlGameCollector = new GameHubCollectorClass();
        const collector = global.__vlGameCollector;
        const execucao = nomeFonte
          ? collector.collectFromSource(collector.sources.find((s) => s.name.toLowerCase() === String(nomeFonte).toLowerCase()) || collector.sources[0])
          : collector.collectAll();
        Promise.resolve(execucao).then(() => {
          COLLECTOR.lastGames = typeof collector.getGames === 'function' ? collector.getGames() : [];
          notify('Coletor de Jogos', `${COLLECTOR.lastGames.length} jogos disponíveis`, 'success');
        }).catch((erro) => {
          notify('Coletor de Jogos', 'Falha: ' + erro.message, 'error');
        }).finally(() => { COLLECTOR.pending = false; });
      } catch (e) {
        this.pending = false;
        notify('Coletor de Jogos', e.message, 'error');
      }
      return '[collector] coleta de jogos iniciada — leia collector.lastGames() quando terminar';
    },
    web(consulta) {
      this.pending = true;
      try {
        const WebContentFetcherClass = global.WebContentFetcher;
        if (!WebContentFetcherClass) {
          this.pending = false;
          notify('Coletor Web', 'WebContentFetcher não carregado no boot', 'error');
          return '[collector] indisponível';
        }
        if (!global.__vlWebCollector) global.__vlWebCollector = new WebContentFetcherClass();
        global.__vlWebCollector.search(String(consulta)).then((resultados) => {
          COLLECTOR.lastWeb = resultados;
          notify('Coletor Web', `${resultados.length} resultados para "${consulta}"`, 'success');
        }).catch((erro) => {
          notify('Coletor Web', 'Falha: ' + erro.message, 'error');
        }).finally(() => { COLLECTOR.pending = false; });
      } catch (e) {
        this.pending = false;
        notify('Coletor Web', e.message, 'error');
      }
      return '[collector] busca web iniciada — leia collector.lastWeb() quando terminar';
    }
  };

  global.AI = AI;
  global.Net = NET;
  global.Collector = COLLECTOR;

  // ================================================================
  //  Runtime unificado consumido pelo VessieLangManager (ES module,
  //  ver ../index.js) — única superfície que o resto do kernel precisa
  //  conhecer, sem se preocupar com os globais internos acima.
  // ================================================================
  function detectar(codigo) {
    return global.Vessie ? global.Vessie.detectarNivel(codigo) : 'FULL';
  }

  function executar(nome, codigo) {
    if (!global.Vessie || typeof global.Vessie.rodar !== 'function') {
      throw new Error('Motor VessieLang (dispatcher) não carregado.');
    }
    return global.Vessie.rodar(nome, codigo);
  }

  global.VessieLangRuntime = {
    versao: (global.Vessie && global.Vessie.versao) || '2.0.0',
    detectar,
    executar,
    run: executar, // alias em inglês
    ai: AI,
    net: NET,
    collector: COLLECTOR,
    fs: global.FS,
    security: global.Security,
    kernel: global.Kernel,
    os: global.OS,
    modules: global.Modules,
    gamehub: global.GameHub,
    relatorio: () => (global.Vessie ? global.Vessie.relatorio() : '{}')
  };

  console.log('[VessieLang] runtime-bridge carregado — window.VessieLangRuntime pronto (ai/net/collector integrados ao VessieOS).');
})(typeof window !== 'undefined' ? window : globalThis);

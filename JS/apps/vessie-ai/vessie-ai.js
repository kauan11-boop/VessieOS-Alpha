// vessie-ai.js — extraído de JS/core/main.js (VessieOS)
// Depende de utilitários globais do kernel: S, VFS, toast, createWin, persistState, etc. (expostos em main.js)
(function () {
  "use strict";

const AUTO_EVOLVE_KEY = 'vessie_auto_evolve_enabled';

function isAutoEvolveEnabled() {
    return localStorage.getItem(AUTO_EVOLVE_KEY) === 'true';
  }

function setAutoEvolveEnabled(enabled) {
    localStorage.setItem(AUTO_EVOLVE_KEY, String(Boolean(enabled)));
    document.querySelectorAll('#vessie-auto-evolve').forEach((button) => {
      button.textContent = `Auto-Evoluir: ${enabled ? 'ON' : 'OFF'}`;
      button.setAttribute('aria-pressed', String(Boolean(enabled)));
      button.title = enabled
        ? 'Modo de análise ativo: sugere melhorias, mas nunca grava ou executa sem confirmação.'
        : 'Modo de análise proativa desativado.';
    });
    document.querySelectorAll('.pm-auto-evolve-toggle').forEach((toggle) => {
      toggle.checked = Boolean(enabled);
    });
  }

function openVessie() {
    const win = createWin('Vessie IA', '💜', `
    <div style="display:flex;height:100%;background:#0d0d12;color:#e0e0e0;font-family:'Segoe UI',sans-serif;overflow:hidden;">
      
      <!-- COLUNA ESQUERDA: CHAT -->
      <div style="flex:1;display:flex;flex-direction:column;border-right:1px solid #252530;">
        <div style="padding:14px 16px;background:#15151c;border-bottom:1px solid #252530;display:flex;align-items:center;gap:12px;">
          <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#9b5de5,#f15bb5);display:flex;align-items:center;justify-content:center;font-size:1.1rem;">💜</div>
          <div>
            <div style="font-weight:700;font-size:1rem;">Vessie IA</div>
            <div id="net-status" style="font-size:.7rem;color:#888;">● Verificando Rede...</div>
          </div>
          <button onclick="window.openPromptMaster()" style="background:#252530;border:1px solid #4d3b68;color:#dec7ff;padding:6px 10px;border-radius:6px;cursor:pointer;font-size:.75rem;">Prompt Master</button>
          <button id="vessie-auto-evolve" type="button" aria-pressed="false" style="background:#252530;border:1px solid #4d3b68;color:#dec7ff;padding:6px 10px;border-radius:6px;cursor:pointer;font-size:.75rem;">Auto-Evoluir: OFF</button>
          <button onclick="window.openVessieScripts()" style="margin-left:auto;background:#252530;border:none;color:#aaa;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:.75rem;">💾 Scripts</button>
          <button onclick="window.openVessieLexicon()" style="background:#252530;border:none;color:#aaa;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:.75rem;">📖 Dicionário</button>
          <button onclick="this.closest('.win').querySelector('#chat-area').innerHTML=''" style="background:#252530;border:none;color:#aaa;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:.75rem;">Limpar</button>
        </div>
        
        <div id="chat-area" style="flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:12px;background:#08080c;">
          <div style="align-self:flex-start;max-width:80%;background:#15151c;padding:10px 14px;border-radius:12px;border-bottom-left-radius:2px;font-size:.85rem;line-height:1.4;">
            Oii! 🎀 Sou a Vessie. Vou preservar a formatação, as quebras de linha e os comentários do seu código.
          </div>
        </div>
        
        <div style="padding:12px;background:#15151c;border-top:1px solid #252530;display:flex;gap:10px;">
          <input id="vessie-inp" placeholder="Fale com a Vessie..." style="flex:1;background:#08080c;border:1px solid #252530;color:#fff;padding:10px 14px;border-radius:8px;outline:none;font-size:.85rem;" onkeydown="if(event.key==='Enter')window.vessieSend()">
          <button onclick="window.vessieSend()" style="background:linear-gradient(135deg,#9b5de5,#f15bb5);border:none;color:#fff;padding:0 20px;border-radius:8px;cursor:pointer;font-weight:600;">Enviar</button>
        </div>
      </div>

      <!-- COLUNA DIREITA: PAINEL DE REDE E LOTE -->
      <div style="width:320px;display:flex;flex-direction:column;background:#111118;">
        <div style="padding:15px;border-bottom:1px solid #252530;">
          <div style="font-size:.75rem;color:#888;text-transform:uppercase;margin-bottom:10px;letter-spacing:1px;">🔌 Rede Local (LM Studio)</div>
          <input id="local-ip" placeholder="http://192.168.x.x:1234" value="${localStorage.getItem('vessie_local_ip') || 'http://localhost:1234'}" style="width:100%;box-sizing:border-box;background:#08080c;border:1px solid #252530;color:#fff;padding:10px;border-radius:6px;margin-bottom:8px;font-size:.8rem;">

          <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
            <select id="vessie-model-select" style="flex:1;background:#08080c;border:1px solid #252530;color:#fff;padding:8px;border-radius:6px;font-size:.75rem;">
              <option value="">(nenhum modelo detectado ainda)</option>
            </select>
            <button onclick="window.testNet()" title="Atualizar lista de modelos" style="background:#252530;border:none;color:#aaa;padding:8px 10px;border-radius:6px;cursor:pointer;font-size:.75rem;"><i class="fas fa-sync-alt"></i></button>
          </div>
          
          <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
            <label style="font-size:.75rem;color:#aaa;">Qtd. Lotes:</label>
            <input id="batch-count" type="number" min="1" value="5" style="width:60px;background:#08080c;border:1px solid #252530;color:#fff;padding:8px;border-radius:6px;font-size:.8rem;text-align:center;">
            <span style="font-size:.65rem;color:#666;">(100 respostas por lote)</span>
          </div>

          <div style="display:flex;gap:8px;">
            <button onclick="window.testNet()" style="flex:1;background:#252530;border:none;color:#aaa;padding:8px;border-radius:6px;cursor:pointer;font-size:.8rem;">Testar Conexão</button>
            <button id="btn-gen-batch" onclick="window.genBatch()" style="flex:1;background:linear-gradient(90deg,#9b5de5,#f15bb5);border:none;color:#fff;padding:8px;border-radius:6px;cursor:pointer;font-weight:700;font-size:.8rem;">Gerar Lote</button>
          </div>
          <div id="cors-warning" style="font-size:.7rem;color:#f15bb5;margin-top:8px;display:none;background:rgba(241,91,181,.1);padding:6px;border-radius:4px;">⚠ HTML bloqueou o acesso. Ative o CORS no LM Studio.</div>
        </div>
        
        <div style="flex:1;padding:15px;display:flex;flex-direction:column;min-height:0;">
          <div style="font-size:.75rem;color:#888;text-transform:uppercase;margin-bottom:8px;letter-spacing:1px;">💻 Console de Geração</div>
          <div id="batch-log" style="flex:1;background:#050508;border:1px solid #252530;padding:10px;border-radius:6px;font-family:monospace;font-size:.7rem;color:#0f0;overflow-y:auto;white-space:pre-wrap;">
> Sistema pronto.
          </div>
          <div style="margin-top:10px;font-size:.75rem;color:#888;display:flex;justify-content:space-between;">
            <span>Cache Local:</span>
            <span id="cache-count">0 respostas</span>
          </div>
          <button onclick="window.updateAI()" style="width:100%;margin-top:10px;background:#252530;border:1px solid #9b5de5;color:#9b5de5;padding:10px;border-radius:6px;cursor:pointer;font-weight:700;font-size:.8rem;">⬆️ Update AI (Exportar HTML)</button>
        </div>
      </div>
    </div>
  `, 900, 600);

    const chatArea = win.querySelector('#chat-area');
    const batchLog = win.querySelector('#batch-log');
    const localIpInput = win.querySelector('#local-ip');
    const netStatus = win.querySelector('#net-status');
    const corsWarn = win.querySelector('#cors-warning');
    const cacheCount = win.querySelector('#cache-count');
    const btnGenBatch = win.querySelector('#btn-gen-batch');
    const autoEvolveButton = win.querySelector('#vessie-auto-evolve');

    const updateAutoEvolveButton = () => {
      const enabled = isAutoEvolveEnabled();
      autoEvolveButton.textContent = `Auto-Evoluir: ${enabled ? 'ON' : 'OFF'}`;
      autoEvolveButton.setAttribute('aria-pressed', String(enabled));
      autoEvolveButton.title = enabled
        ? 'Modo de análise ativo: sugere melhorias, mas nunca grava ou executa sem confirmação.'
        : 'Modo de análise proativa desativado.';
    };
    autoEvolveButton.onclick = () => {
      setAutoEvolveEnabled(!isAutoEvolveEnabled());
      updateAutoEvolveButton();
    };
    updateAutoEvolveButton();

    let isOnline = false;
    let isGenerating = false;
    window._tempCodes = [];

    let cache = JSON.parse(localStorage.getItem('vessie_batch_cache') || 'null');
    if (!cache) {
      cache = {
        saudacao: ["Oi! Eu estou bem, obrigada por perguntar!", "Oi, como você está? 😊"],
        codigo: ["Olá! Quer que eu te ajude? ```javascript function hello(){console.log('Oi!');} ```"],
        ajuda: ["Oi, como posso ajudar?", "Vou te ajudar com tudo que pucer!"],
        despedida: ["Tchau! 😊 Te vejo soon! 🌟", "Até breve! 🥰"]
      };
      localStorage.setItem('vessie_batch_cache', JSON.stringify(cache));
    }

    let lexicon = JSON.parse(localStorage.getItem('vessie_lexicon_db') || '{}');
    let scriptsDb = JSON.parse(localStorage.getItem('vessie_scripts_db') || '[]');

    function updateCacheCount() {
      const total = Object.values(cache).flat().length;
      cacheCount.textContent = `${total} respostas`;
    }
    updateCacheCount();

    function logBatch(msg) {
      batchLog.textContent += `\n> ${msg}`;
      batchLog.scrollTop = batchLog.scrollHeight;
    }

    function analyzeText(text) {
      const lower = text.toLowerCase();
      let intent = 'default';
      let complexity = 'leve';
      let needsClarification = null;

      for (const word in lexicon) {
        if (lower.includes(word) && lexicon[word].doubleMeaning) {
          needsClarification = word;
          break;
        }
      }

      if (lower.includes('oi') || lower.includes('olá')) intent = 'saudacao';
      if (lower.includes('código') || lower.includes('script') || lower.includes('function') || lower.includes('bug') || lower.includes('programa')) intent = 'codigo';
      if (lower.includes('ajuda') || lower.includes('help')) intent = 'ajuda';
      if (lower.includes('tchau') || lower.includes('bye')) intent = 'despedida';

      if (text.split(' ').length > 6 || intent === 'codigo') complexity = 'complexa';

      return { intent, complexity, needsClarification };
    }

    function buildSystemPrompt(metadata) {
      let prompt = "Você é a Vessie, assistente de programação do VessieOS. Metadados: Complexidade=" + metadata.complexity + ", Intenção=" + metadata.intent + ".\n";
      if (metadata.complexity === 'complexa') {
        prompt += "Quando gerar ou editar código, preserve a formatação multilinha, a indentação e os comentários úteis. Retorne blocos de código completos, sem omitir trechos com reticências. Antes do código, informe pressupostos e um resumo curto do plano.\n";
      } else {
        prompt += "Responda de forma curta, cordial e direta. Sem quebras de linha.\n";
      }
      return prompt;
    }

    window.openPromptMaster = function (initialContext = {}) {
      const initial = initialContext && typeof initialContext === 'object' ? initialContext : {};
      const promptWindow = createWin('Prompt Master', '<i class="fas fa-wand-magic-sparkles"></i>', `
        <div style="height:100%;display:flex;flex-direction:column;gap:10px;padding:14px;background:#10131b;color:#eef2ff;overflow:auto">
          <div><strong style="font-size:1.05rem">Prompt Master · VessieOS</strong>
            <p style="margin-top:4px;color:#aab4c8;font-size:.78rem">A URL da aba ativa é preenchida automaticamente. Capture o conteúdo da página e peça ao modelo local para analisar e propor melhorias.</p>
          </div>
          <label style="display:grid;gap:4px;font-size:.78rem">Site ou aplicativo
            <input class="pm-site" placeholder="https://exemplo.com ou nome do app" style="padding:9px;border:1px solid #353d50;border-radius:6px;background:#0b0e14;color:#fff">
          </label>
          <label style="display:grid;gap:4px;font-size:.78rem">O que deve ser criado ou alterado?
            <textarea class="pm-goal" rows="3" placeholder="Descreva o objetivo e o comportamento esperado" style="resize:vertical;padding:9px;border:1px solid #353d50;border-radius:6px;background:#0b0e14;color:#fff"></textarea>
          </label>
          <label style="display:grid;gap:4px;font-size:.78rem">Requisitos e critérios de aceite
            <textarea class="pm-requirements" rows="3" placeholder="Comportamentos esperados, limites e como verificar que ficou correto" style="resize:vertical;padding:9px;border:1px solid #353d50;border-radius:6px;background:#0b0e14;color:#fff"></textarea>
          </label>
          <label style="display:grid;gap:4px;font-size:.78rem">Conteúdo, requisitos e fontes consultadas
            <textarea class="pm-context" rows="4" placeholder="Requisitos, trechos relevantes, URLs e observações" style="resize:vertical;padding:9px;border:1px solid #353d50;border-radius:6px;background:#0b0e14;color:#fff"></textarea>
          </label>
          <label style="display:grid;gap:4px;font-size:.78rem">Fontes consultadas
            <textarea class="pm-sources" rows="2" placeholder="URLs da página capturada e referências fornecidas por você." style="resize:vertical;padding:9px;border:1px solid #353d50;border-radius:6px;background:#0b0e14;color:#fff"></textarea>
          </label>
          <label class="pm-auto-evolve" style="display:flex;gap:8px;align-items:flex-start;font-size:.78rem;color:#d8c5ff">
            <input class="pm-auto-evolve-toggle" type="checkbox" style="margin-top:2px">
            <span><strong>Auto-Evoluir</strong> — solicitar uma análise proativa de melhorias. Não grava, executa comandos nem altera outros arquivos automaticamente.</span>
          </label>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button class="pm-search" type="button" style="padding:8px 12px;border:1px solid #46516a;border-radius:6px;background:#1b2230;color:#e5e7eb;cursor:pointer">Pesquisar na web</button>
            <button class="pm-fetch-site" type="button" style="padding:8px 12px;border:1px solid #36705c;border-radius:6px;background:#173b2b;color:#fff;cursor:pointer">Puxar site atual</button>
            <button class="pm-build" type="button" style="padding:8px 12px;border:1px solid #7751ad;border-radius:6px;background:#302044;color:#fff;cursor:pointer">Montar prompt</button>
            <button class="pm-ask" type="button" style="padding:8px 12px;border:0;border-radius:6px;background:linear-gradient(135deg,#8b5cf6,#db4fa1);color:#fff;cursor:pointer">Analisar com IA</button>
          </div>
          <label style="display:grid;gap:4px;font-size:.78rem">Prompt preparado
            <textarea class="pm-prompt" rows="7" style="resize:vertical;padding:9px;border:1px solid #353d50;border-radius:6px;background:#0b0e14;color:#d7e1f5;font:12px/1.5 Consolas,monospace"></textarea>
          </label>
          <div class="pm-status" role="status" style="color:#aab4c8;font-size:.76rem">O LM Studio precisa estar iniciado e acessível pela configuração atual.</div>
          <pre class="pm-result" style="min-height:100px;max-height:240px;overflow:auto;white-space:pre-wrap;padding:10px;border:1px solid #252b38;border-radius:6px;background:#090b10;color:#e8edf7;font:12px/1.5 Consolas,monospace"></pre>
        </div>
      `, 800, 760);

      const siteInput = promptWindow.querySelector('.pm-site');
      const goalInput = promptWindow.querySelector('.pm-goal');
      const requirementsInput = promptWindow.querySelector('.pm-requirements');
      const contextInput = promptWindow.querySelector('.pm-context');
      const sourcesInput = promptWindow.querySelector('.pm-sources');
      const autoEvolveToggle = promptWindow.querySelector('.pm-auto-evolve-toggle');
      const promptInput = promptWindow.querySelector('.pm-prompt');
      const status = promptWindow.querySelector('.pm-status');
      const output = promptWindow.querySelector('.pm-result');
      const fetchButton = promptWindow.querySelector('.pm-fetch-site');
      const askButton = promptWindow.querySelector('.pm-ask');
      const pageURL = window.VessieCurrentPageUrl || '';
      const createLocalReport = () => ({
        generatedBy: 'Prompt Master local (sem IA)',
        createdAt: new Date().toISOString(),
        site: siteInput.value.trim() || 'não informado',
        goal: goalInput.value.trim(),
        requirements: requirementsInput.value.trim().split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
        context: contextInput.value.trim(),
        sourceUrlsProvidedOrFetched: sourcesInput.value.trim().split(/\r?\n/).map((line) => line.trim()).filter(Boolean),
        autoEvolveEnabled: autoEvolveToggle.checked,
        missing: [
          !siteInput.value.trim() ? 'site ou aplicativo alvo' : '',
          !goalInput.value.trim() ? 'objetivo detalhado' : '',
          !requirementsInput.value.trim() ? 'critérios de aceite' : '',
          !contextInput.value.trim() ? 'contexto local relevante' : '',
          !sourcesInput.value.trim() ? 'fontes consultadas ou fornecidas' : ''
        ].filter(Boolean),
        knownProjectMap: [
          'index.html: shell e telas principais',
          'JS/core/main.js: estado e serviços do sistema',
          'JS/apps/: aplicativos',
          'JS/systems/desktop/main.js: ordem de carregamento dos módulos'
        ]
      });
      siteInput.value = initial.site || pageURL;
      goalInput.value = initial.goal || (pageURL ? 'Analise o site e resuma seu propósito, conteúdo, estrutura, tecnologias visíveis e oportunidades de melhoria.' : '');
      requirementsInput.value = initial.requirements || '';
      autoEvolveToggle.checked = isAutoEvolveEnabled();
      autoEvolveToggle.addEventListener('change', () => setAutoEvolveEnabled(autoEvolveToggle.checked));
      contextInput.value = [
        initial.path ? `Arquivo ou pasta selecionado: ${initial.path}` : '',
        initial.content || ''
      ].filter(Boolean).join('\n\n');

      function validateWebsiteUrl(rawUrl) {
        const parsed = new URL(rawUrl);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
          throw new Error('A URL precisa usar HTTP ou HTTPS.');
        }
        if (parsed.username || parsed.password) {
          throw new Error('URLs com credenciais embutidas não são aceitas.');
        }
        return parsed;
      }

      function htmlToReadableText(html) {
        const documentCopy = new DOMParser().parseFromString(html, 'text/html');
        documentCopy.querySelectorAll('script,style,noscript,template,svg,iframe,form,nav,footer,header,canvas').forEach((node) => node.remove());
        const title = documentCopy.title || '';
        const description = documentCopy.querySelector('meta[name="description"]')?.content || '';
        const bodyText = (documentCopy.body?.innerText || documentCopy.body?.textContent || '')
          .replace(/[ \t]+\n/g, '\n')
          .replace(/\n{3,}/g, '\n\n')
          .trim()
          .slice(0, 35000);
        return { title, description, bodyText, truncated: bodyText.length >= 35000 };
      }

      async function readBoundedResponse(response, maxBytes = 2000000) {
        const declaredLength = Number(response.headers.get('content-length'));
        if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
          throw new Error('a página excede o limite de leitura de 2 MB');
        }
        if (!response.body?.getReader) {
          const text = await response.text();
          if (new TextEncoder().encode(text).length > maxBytes) throw new Error('a página excede o limite de leitura de 2 MB');
          return text;
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        const chunks = [];
        let bytesRead = 0;
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            bytesRead += value.byteLength;
            if (bytesRead > maxBytes) {
              await reader.cancel();
              throw new Error('a página excede o limite de leitura de 2 MB');
            }
            chunks.push(decoder.decode(value, { stream: true }));
          }
          chunks.push(decoder.decode());
          return chunks.join('');
        } finally {
          reader.releaseLock();
        }
      }

      async function fetchCurrentWebsite() {
        let parsed;
        try {
          parsed = validateWebsiteUrl(siteInput.value.trim() || window.VessieCurrentPageUrl || '');
        } catch (error) {
          status.textContent = `URL inválida: ${error.message}`;
          return null;
        }
        siteInput.value = parsed.href;
        status.textContent = 'Lendo o conteúdo público da página...';
        let html;
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 12000);
          try {
            const response = await fetch(parsed.href, { credentials: 'omit', redirect: 'follow', signal: controller.signal });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            html = await readBoundedResponse(response);
          } finally {
            clearTimeout(timeout);
          }
        } catch (directError) {
          const confirmProxy = confirm(
            `O navegador não conseguiu ler a página diretamente (CORS ou rede: ${directError.message}). ` +
            'Deseja tentar um proxy CORS público? O proxy receberá a URL; não envie páginas privadas ou que exijam login.'
          );
          if (!confirmProxy) {
            status.textContent = 'Leitura cancelada. O navegador não permite acessar esta página diretamente.';
            return null;
          }
          if (typeof window.WebContentFetcher !== 'function') {
            status.textContent = 'O leitor web não está disponível para tentar a alternativa CORS.';
            return null;
          }
          try {
            const fetcher = new window.WebContentFetcher({ retryAttempts: 0, requestTimeout: 8000 });
            const response = await fetcher.fetchWithProxy(parsed.href);
            html = await readBoundedResponse(response);
          } catch (error) {
            status.textContent = `Não foi possível ler o site: ${error.message}`;
            return null;
          }
        }

        const extracted = htmlToReadableText(html);
        if (!extracted.bodyText) {
          status.textContent = 'A página não retornou texto legível; pode exigir JavaScript, login ou bloquear a leitura.';
          return null;
        }
        const pageContext = [
          `PÁGINA CAPTURADA: ${parsed.href}`,
          `Título: ${extracted.title || '(não detectado)'}`,
          `Descrição: ${extracted.description || '(não informada)'}`,
          `Conteúdo textual extraído${extracted.truncated ? ' (limitado a 35 mil caracteres)' : ''}:`,
          extracted.bodyText
        ].join('\n\n');
        contextInput.value = [contextInput.value.trim(), pageContext].filter(Boolean).join('\n\n');
        sourcesInput.value = [...new Set([...sourcesInput.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean), parsed.href])].join('\n');
        status.textContent = `Página capturada: ${extracted.title || parsed.hostname}. O conteúdo será enviado ao modelo configurado quando você clicar em “Analisar com IA”.`;
        return { url: parsed.href, ...extracted };
      }

      fetchButton.onclick = async () => {
        fetchButton.disabled = true;
        try {
          const page = await fetchCurrentWebsite();
          if (page) {
            promptInput.value = buildPrompt();
            output.textContent = `Relatório local de captura\nURL: ${page.url}\nTítulo: ${page.title || '(não detectado)'}\nCaracteres analisáveis: ${page.bodyText.length}\n\nRevise o conteúdo e clique em “Analisar com IA” para enviá-lo ao modelo.`;
            if (initial.autoAnalyze) promptWindow.querySelector('.pm-ask').click();
          }
        } finally {
          fetchButton.disabled = false;
        }
      };

      const buildPrompt = () => [
        'Você é o arquiteto e assistente de implementação do VessieOS, um desktop web feito em HTML, CSS e JavaScript publicado como site estático.',
        'Responda com: resumo do pedido; requisitos e critérios de aceite; pressupostos/perguntas; fontes realmente usadas; mapa de arquivos que precisam ser inspecionados; arquivos a criar/alterar; patch proposto por arquivo; dependências/APIs; plano de testes e riscos. Não afirme que leu ou alterou arquivos que não foram fornecidos.',
        `Site ou app alvo: ${siteInput.value.trim() || '(não informado)'}`,
        `Objetivo solicitado: ${goalInput.value.trim() || '(não informado)'}`,
        `Requisitos e critérios de aceite:\n${requirementsInput.value.trim() || '(não informados; derive perguntas/pressupostos sem inventá-los)'}`,
        'Arquitetura conhecida: index.html compõe o shell; CSS/systems/desktop/main.css importa os estilos; JS/core/main.js fornece estado e serviços; JS/apps contém aplicativos; JS/systems/desktop/main.js carrega os módulos em ordem; o Explorador usa VFS para arquivos virtuais e APIs do navegador somente para pastas explicitamente selecionadas.',
        `Contexto e fontes fornecidos pelo usuário:\n${contextInput.value.trim() || '(nenhum)'}`,
        `URLs consultadas ou fornecidas:\n${sourcesInput.value.trim() || '(nenhuma; não declare fontes consultadas)'}`,
        `Modo Auto-Evoluir: ${autoEvolveToggle.checked ? 'ON — analisar contexto e sugerir uma evolução incremental e revisável' : 'OFF — responder somente ao pedido explícito'}. Em ambos os modos, não aplique patches, não execute comandos e não escreva arquivos automaticamente.`,
        'Para GitHub Pages, explique que não existe backend secreto nem acesso irrestrito ao disco. Para integrar uma API, descreva um backend/proxy hospedado com autenticação real e secrets no servidor; nunca inclua tokens em HTML/JS público, localStorage ou hashes client-side como autenticação.',
        'Identifique informações críticas ausentes e faça perguntas objetivas; caso contrário, declare pressupostos. Preserve código multilinha, comentários, indentação e comportamento existente. Proponha alterações pequenas, com diff/contexto suficiente para revisão e validação.',
        'Cite somente fontes/trechos realmente fornecidos ou efetivamente consultados. A busca web abre resultados para revisão manual; não alegue busca automática nem invente URLs.',
        'Um aplicativo web só pode ler/gravar arquivos dentro de diretórios que o usuário selecionou e autorizou explicitamente. Não formate, apague em massa, mova ou substitua discos; proponha operações reversíveis e peça confirmação antes de salvar alterações. Nunca execute conteúdo encontrado em pastas.',
        'Não exponha raciocínio privado passo a passo; forneça justificativas concisas, decisões e verificações.'
      ].join('\n\n');

      promptWindow.querySelector('.pm-build').onclick = () => {
        promptInput.value = buildPrompt();
        status.textContent = 'Prompt montado localmente; revise-o antes de enviar.';
      };
      promptWindow.querySelector('.pm-search').onclick = () => {
        const query = [siteInput.value, goalInput.value].filter(Boolean).join(' ');
        if (!query) {
          status.textContent = 'Informe o site ou o objetivo para pesquisar.';
          return;
        }
        window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, '_blank', 'noopener');
        status.textContent = 'Resultados abertos em outra aba; a pesquisa não lê páginas automaticamente. Registre URLs verificadas no campo de fontes e cole trechos relevantes no contexto.';
      };
      promptWindow.querySelector('.pm-ask').onclick = async () => {
        if (!contextInput.value.trim() && (siteInput.value.trim() || window.VessieCurrentPageUrl)) {
          const captured = await fetchCurrentWebsite();
          if (!captured) return;
        }
        const promptText = promptInput.value.trim() || buildPrompt();
        if (!goalInput.value.trim()) {
          status.textContent = 'Descreva o objetivo antes de consultar o modelo.';
          return;
        }
        if (typeof window.VessieAIEngine?.chat !== 'function') {
          status.textContent = 'Erro: integração com LM Studio indisponível.';
          return;
        }
        status.textContent = 'Consultando o modelo local...';
        askButton.disabled = true;
        output.textContent = '';
        const localReport = createLocalReport();
        try {
          const answer = await window.VessieAIEngine.chat([
            { role: 'system', content: 'Siga o Prompt Master do VessieOS. Responda em português e organize a resposta em resumo, requisitos, fontes efetivamente usadas, arquivos afetados, patch proposto, dependências e testes. Nunca afirme alterações realizadas; toda mudança exige revisão e confirmação.' },
            { role: 'user', content: `RELATÓRIO DE CONTEXTO GERADO LOCALMENTE (antes da IA):\n${JSON.stringify(localReport, null, 2)}\n\nPROMPT MASTER:\n${promptText}` }
          ], { profile: 'balanced', maxTokens: 4096, temperature: 0.25 });
          output.textContent = answer;
          status.textContent = 'Resposta recebida. Revise o patch; o VessieOS não grava mudanças automaticamente.';
        } catch (error) {
          status.textContent = `Erro ao consultar LM Studio: ${error?.message || 'falha de conexão'}`;
        } finally {
          askButton.disabled = false;
        }
      };
      if (initial.path || initial.content) promptWindow.querySelector('.pm-build').click();
      if (initial.autoAnalyze && !initial.content) fetchButton.click();
      return promptWindow;
    };

    // Formata a resposta para HTML
    function formatResponse(text) {
      const codeMatch = text.match(/```(\w+)?\s?([\s\S]*?)```/);
      if (codeMatch) {
        const lang = codeMatch[1] || 'code';
        const code = codeMatch[2].trim();
        const codeId = window._tempCodes.push(code) - 1;

        return escHtml(text.slice(0, codeMatch.index)).replace(/\n/g, '<br>') + `
        <div style="background:#000;padding:10px;border-radius:6px;border:1px solid #333;margin:8px 0;">
          <div style="font-size:.65rem;color:#666;margin-bottom:5px;text-transform:uppercase;">${escHtml(lang)} · código multilinha</div>
          <pre style="margin:0;color:#0f0;font-size:.75rem;overflow-x:auto;white-space:pre-wrap;word-break:break-all;">${escHtml(code)}</pre>
        </div>
        <div style="display:flex;gap:8px;margin-top:5px;">
          <button onclick="window.copyCode(${codeId})" style="flex:1;background:#252530;border:none;color:#fff;padding:6px;border-radius:4px;cursor:pointer;font-size:.75rem;">📋 Copiar</button>
          <button onclick="window.openCodeEditor(${codeId})" style="flex:1;background:#9b5de5;border:none;color:#fff;padding:6px;border-radius:4px;cursor:pointer;font-size:.75rem;font-weight:700;">✍️ Editar por Linha</button>
        </div>
      ` + escHtml(text.slice(codeMatch.index + codeMatch[0].length)).replace(/\n/g, '<br>');
      }
      return escHtml(text).replace(/\n/g, '<br>');
    }

    function escHtml(s) {
      return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    window.testNet = async function () {
      const ip = localIpInput.value.trim().replace(/\/$/, '');
      localStorage.setItem('vessie_local_ip', ip);
      netStatus.textContent = '● Conectando...';
      netStatus.style.color = '#f1c40f';
      logBatch(`Testando conexão em ${ip}...`);
      const modelSelect = win.querySelector('#vessie-model-select');
      try {
        const res = await fetch(`${ip}/v1/models`);
        if (res.ok) {
          const data = await res.json();
          const models = Array.isArray(data.data) ? data.data : [];
          const modelName = models[0]?.id || 'desconhecido';
          netStatus.textContent = `● Online (Tempo Real): ${modelName.substring(0, 15)}`;
          netStatus.style.color = '#2ecc71';
          corsWarn.style.display = 'none';
          isOnline = true;
          // Formato funcional de modelo: cada modelo detectado vira uma opção real
          // e selecionável, em vez do modelo fixo 'qwen3-1.7b' que existia antes.
          if (modelSelect && models.length) {
            const remembered = localStorage.getItem('vessie_selected_model');
            modelSelect.innerHTML = models.map(m => `<option value="${escHtml(m.id)}">${escHtml(m.id)}</option>`).join('');
            if (remembered && models.some(m => m.id === remembered)) modelSelect.value = remembered;
            modelSelect.onchange = () => localStorage.setItem('vessie_selected_model', modelSelect.value);
          }
          logBatch(`✅ Sucesso! ${models.length} modelo(s) detectado(s). Modo Tempo Real ativado.`);
        } else throw new Error('Erro');
      } catch (e) {
        netStatus.textContent = '● Offline (Usando Lote)';
        netStatus.style.color = '#e74c3c';
        corsWarn.style.display = 'block';
        isOnline = false;
        logBatch(`❌ Erro: Acesso bloqueado (CORS) ou servidor offline.`);
      }
    };

    // ==========================================
    // GERADOR DE LOTE (preserva código multilinha)
    // ==========================================
    window.genBatch = async function () {
      if (isGenerating) return toast('Aguarde o lote atual terminar!', 'error');

      logBatch("Mantendo as respostas e os scripts existentes sem reformatá-los...");

      const batchesToGenerate = parseInt(win.querySelector('#batch-count').value) || 5;
      isGenerating = true;
      btnGenBatch.disabled = true;
      btnGenBatch.textContent = 'Gerando...';
      btnGenBatch.style.opacity = '0.5';

      const ip = localIpInput.value.trim().replace(/\/$/, '');
      logBatch(`Iniciando ${batchesToGenerate} lotes no LM Studio...`);

      const sysPrompt = 'Metadata: Output=25 variations. Delimiter=[SEP]. Persona=Vessie. Task=Generate distinct answers. Preserve line breaks and indentation in code. For code, return complete multiline fenced blocks; do not strip comments or omit sections.';
      const intents = [
        { key: 'saudacao', prompt: 'Oi, tudo bem?' },
        { key: 'codigo', prompt: 'Pode me ajudar com um código JavaScript?' },
        { key: 'ajuda', prompt: 'Preciso de ajuda com o sistema' },
        { key: 'despedida', prompt: 'Tchau, até logo!' }
      ];

      let totalAdded = 0;

      try {
        for (let b = 1; b <= batchesToGenerate; b++) {
          logBatch(`--- INICIANDO LOTE ${b}/${batchesToGenerate} ---`);
          let batchAdded = 0;

          for (const intent of intents) {
            logBatch(`[Lote ${b}] Gerando: "${intent.key}"...`);
            try {
              const res = await fetch(`${ip}/v1/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model: 'qwen3-1.7b', messages: [{ role: 'system', content: sysPrompt }, { role: 'user', content: intent.prompt }], temperature: 0.95, max_tokens: 2000 })
              });
              if (!res.ok) throw new Error('HTTP Error');
              const data = await res.json();
              const responses = data.choices[0].message.content.split('[SEP]').map(r => r.trim()).filter(r => r.length > 0);

              if (!cache[intent.key]) cache[intent.key] = [];

              cache[intent.key].push(...responses);

              if (cache[intent.key].length > 500) cache[intent.key] = cache[intent.key].slice(-500);

              localStorage.setItem('vessie_batch_cache', JSON.stringify(cache));
              updateCacheCount();
              totalAdded += responses.length;
              batchAdded += responses.length;
            } catch (e) {
              logBatch(`[Lote ${b}] ❌ Falha em "${intent.key}".`);
              break;
            }
          }
          logBatch(`Lote ${b} concluído. +${batchAdded} respostas.`);
        }
        logBatch(`📦 DESFECHO: ${totalAdded} respostas adicionadas com a formatação preservada.`);
      } catch (err) {
        logBatch(`❌ Erro crítico: ${err.message}`);
      } finally {
        isGenerating = false;
        btnGenBatch.disabled = false;
        btnGenBatch.textContent = 'Gerar Lote';
        btnGenBatch.style.opacity = '1';
      }
    };

    // ==========================================
    // SISTEMA HÍBRIDO DE ENVIO (VERIFICAÇÃO EM TEMPO REAL)
    // ==========================================
    window.vessieSend = async function () {
      const inp = win.querySelector('#vessie-inp');
      const text = inp.value.trim();
      if (!text) return;
      inp.value = '';

      chatArea.innerHTML += `<div style="align-self:flex-end;max-width:80%;background:linear-gradient(135deg,#9b5de5,#f15bb5);color:#fff;padding:10px 14px;border-radius:12px;border-bottom-right-radius:2px;font-size:.85rem;line-height:1.4;">${escHtml(text)}</div>`;
      chatArea.scrollTop = chatArea.scrollHeight;

      const typing = document.createElement('div');
      typing.id = 'typing-indicator';
      typing.style.cssText = 'align-self:flex-start;max-width:80%;background:#15151c;padding:10px 14px;border-radius:12px;border-bottom-left-radius:2px;font-size:.85rem;color:#888;';
      typing.textContent = '💭 Pensando...';
      chatArea.appendChild(typing);
      chatArea.scrollTop = chatArea.scrollHeight;

      const metadata = analyzeText(text);

      if (metadata.needsClarification) {
        setTimeout(() => {
          typing.remove();
          const reply = `Hmm, você usou "${metadata.needsClarification}". Pode ter mais de um sentido. Qual contexto? 🤔`;
          chatArea.innerHTML += `<div style="align-self:flex-start;max-width:80%;background:#15151c;padding:10px 14px;border-radius:12px;border-bottom-left-radius:2px;font-size:.85rem;line-height:1.4;">${reply}</div>`;
          chatArea.scrollTop = chatArea.scrollHeight;
        }, 800);
        return;
      }

      const scriptMatch = scriptsDb.find(s => text.toLowerCase().includes(s.name.toLowerCase()));
      if (scriptMatch) {
        setTimeout(() => {
          typing.remove();
          const codeId = window._tempCodes.push(scriptMatch.code) - 1;
          const htmlReply = `Encontrei o script <strong>${scriptMatch.name}</strong> salvo no seu banco! 🎯<br>
          <div style="background:#000;padding:10px;border-radius:6px;border:1px solid #333;margin:8px 0;">
            <div style="font-size:.65rem;color:#666;margin-bottom:5px;text-transform:uppercase;">${scriptMatch.lang}</div>
            <pre style="margin:0;color:#0f0;font-size:.75rem;overflow-x:auto;white-space:pre-wrap;word-break:break-all;">${escHtml(scriptMatch.code)}</pre>
          </div>
          <div style="display:flex;gap:8px;margin-top:5px;">
            <button onclick="window.copyCode(${codeId})" style="flex:1;background:#252530;border:none;color:#fff;padding:6px;border-radius:4px;cursor:pointer;font-size:.75rem;">📋 Copiar</button>
            <button onclick="window.openCodeEditor(${codeId})" style="flex:1;background:#9b5de5;border:none;color:#fff;padding:6px;border-radius:4px;cursor:pointer;font-size:.75rem;font-weight:700;">✍️ Editar por Linha</button>
          </div>`;
          chatArea.innerHTML += `<div style="align-self:flex-start;max-width:90%;background:#15151c;padding:10px 14px;border-radius:12px;border-bottom-left-radius:2px;font-size:.85rem;line-height:1.4;">${htmlReply}</div>`;
          chatArea.scrollTop = chatArea.scrollHeight;
        }, 800);
        return;
      }

      if (metadata.complexity === 'complexa' && !isOnline) {
        typing.textContent = '🔎 Buscando solução complexa no cache...';
        setTimeout(() => {
          typing.remove();
          const arr = cache[metadata.intent] || cache['codigo'] || [];
          let reply = arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : 'Não tenho esse script no cache ainda! Conecte ao LM Studio para gerar online.';

          const htmlReply = formatResponse(reply);
          chatArea.innerHTML += `<div style="align-self:flex-start;max-width:90%;background:#15151c;padding:10px 14px;border-radius:12px;border-bottom-left-radius:2px;font-size:.85rem;line-height:1.4;">${htmlReply}</div>`;
          chatArea.scrollTop = chatArea.scrollHeight;
        }, 1000);
        return;
      }

      if (isOnline) {
        try {
          const ip = localIpInput.value.trim().replace(/\/$/, '');
          const selectedModel = win.querySelector('#vessie-model-select')?.value || localStorage.getItem('vessie_selected_model') || 'qwen3-1.7b';
          const res = await fetch(`${ip}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: selectedModel, messages: [{ role: 'system', content: buildSystemPrompt(metadata) }, { role: 'user', content: text }], temperature: 0.3, max_tokens: 4096 })
          });
          const data = await res.json();
          const reply = data.choices?.[0]?.message?.content;
          if (typeof reply !== 'string' || !reply.trim()) throw new Error('O modelo retornou uma resposta vazia.');

          if (reply.includes('\n') || reply.includes('\r') || reply.includes('```')) {
            if (!cache['codigo']) cache['codigo'] = [];
            if (!cache['codigo'].includes(reply)) {
              cache['codigo'].push(reply);
              if (cache['codigo'].length > 500) cache['codigo'] = cache['codigo'].slice(-500);
              localStorage.setItem('vessie_batch_cache', JSON.stringify(cache));
              updateCacheCount();
              logBatch("💾 Código salvo no Update AI!");
            }
          }

          typing.remove();
          chatArea.innerHTML += `<div style="align-self:flex-start;max-width:90%;background:#15151c;padding:10px 14px;border-radius:12px;border-bottom-left-radius:2px;font-size:.85rem;line-height:1.4;">${formatResponse(reply)}</div>`;
          chatArea.scrollTop = chatArea.scrollHeight;
        } catch (e) {
          typing.remove();
          isOnline = false;
          netStatus.textContent = '● Offline (Conexão perdida)';
          netStatus.style.color = '#e74c3c';
          chatArea.innerHTML += `<div style="align-self:flex-start;max-width:80%;background:#15151c;padding:10px 14px;border-radius:12px;border-bottom-left-radius:2px;font-size:.85rem;color:#f15bb5;">Ops, perdi a conexão! Caindo para o modo lote...</div>`;
          chatArea.scrollTop = chatArea.scrollHeight;
        }
      } else {
        setTimeout(() => {
          typing.remove();
          const arr = cache[metadata.intent] || cache['default'] || [];
          let reply = arr.length > 0 ? arr[Math.floor(Math.random() * arr.length)] : 'Estou offline e sem lote gerado!';
          chatArea.innerHTML += `<div style="align-self:flex-start;max-width:90%;background:#15151c;padding:10px 14px;border-radius:12px;border-bottom-left-radius:2px;font-size:.85rem;line-height:1.4;">${formatResponse(reply)}</div>`;
          chatArea.scrollTop = chatArea.scrollHeight;
        }, 600 + Math.random() * 400);
      }
    };

    // ==========================================
    // SISTEMA DE EDIÇÃO POR LINHA (FATIADOR)
    // ==========================================
    window.copyCode = function (id) {
      navigator.clipboard.writeText(window._tempCodes[id]);
      toast('Código copiado!', 'success');
    };

    window.openCodeEditor = function (id) {
      let code = window._tempCodes[id];
      let chunks = code.split('\n');
      let inputsHtml = '';
      chunks.forEach((chunk, i) => {
        const escapedChunk = escHtml(chunk).replace(/"/g, '&quot;');
        inputsHtml += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <span style="color:#666;font-size:.7rem;width:25px;text-align:right;flex-shrink:0;">${i + 1}</span>
        <input class="code-line-input" value="${escapedChunk}" style="flex:1;background:#111;border:1px solid #333;color:#0f0;padding:6px 8px;font-family:monospace;font-size:.75rem;border-radius:4px;outline:none;">
      </div>`;
      });

      createWin('Editor (Bloco por Bloco)', '✍️', `
      <div style="padding:15px;height:100%;display:flex;flex-direction:column;background:#0d0d12;color:#fff;">
        <h3 style="margin:0 0 15px 0;color:#9b5de5;font-size:.9rem;">Modifique os blocos de código</h3>
        <div style="flex:1;overflow-y:auto;padding-right:5px;">${inputsHtml}</div>
        <button onclick="window.copyEditedCode()" style="margin-top:15px;background:linear-gradient(90deg,#9b5de5,#f15bb5);border:none;color:#fff;padding:12px;border-radius:6px;cursor:pointer;font-weight:700;">Copiar Código Final</button>
      </div>
    `, 700, 500);
    };

    window.copyEditedCode = function () {
      const inputs = document.querySelectorAll('.code-line-input');
      const finalCode = Array.from(inputs, input => input.value).join('\n');
      navigator.clipboard.writeText(finalCode);
      toast('Código editado copiado!', 'success');
    };

    // ==========================================
    // CODEBASE E DICIONÁRIO
    // ==========================================
    window.openVessieScripts = function () {
      let listHtml = '';
      scriptsDb.forEach((s, i) => {
        listHtml += `<div style="background:#15151c;padding:10px;border-radius:6px;margin-bottom:8px;border-left:3px solid #00ff00;">
        <div style="display:flex;justify-content:space-between;font-weight:700;color:#fff;">
          <span>${s.name} <span style="color:#666;font-size:.7rem;">(${s.lang})</span></span> 
          <button onclick="window.delScript(${i})" style="background:#e74c3c;border:none;color:#fff;padding:2px 6px;border-radius:4px;cursor:pointer;font-size:.7rem;">X</button>
        </div>
        <pre style="margin:5px 0 0 0;color:#0f0;font-size:.7rem;overflow-x:auto;max-height:60px;white-space:pre-wrap;word-break:break-all;">${escHtml(s.code)}</pre>
      </div>`;
      });
      if (!listHtml) listHtml = '<p style="color:#666;text-align:center;font-size:.8rem;">Nenhum script salvo.</p>';

      createWin('CodeBase de Scripts', '💾', `
      <div style="display:flex;height:100%;background:#0d0d12;color:#e0e0e0;">
        <div style="flex:1;padding:20px;overflow-y:auto;">
          <h3 style="margin:0 0 15px 0;color:#9b5de5;">💾 Salvar Novo Script</h3>
          <input id="scp-name" placeholder="Nome (ex: Calcular IMC)" style="width:100%;box-sizing:border-box;background:#15151c;border:1px solid #252530;color:#fff;padding:10px;border-radius:6px;margin-bottom:8px;">
          <input id="scp-lang" placeholder="Linguagem (ex: javascript, python)" style="width:100%;box-sizing:border-box;background:#15151c;border:1px solid #252530;color:#fff;padding:10px;border-radius:6px;margin-bottom:8px;">
          <textarea id="scp-code" placeholder="Cole o código aqui..." style="width:100%;box-sizing:border-box;background:#15151c;border:1px solid #252530;color:#0f0;padding:10px;border-radius:6px;margin-bottom:8px;height:150px;font-family:monospace;font-size:.8rem;resize:none;"></textarea>
          <button onclick="window.saveScript()" style="width:100%;background:linear-gradient(90deg,#9b5de5,#f15bb5);border:none;color:#fff;padding:12px;border-radius:6px;cursor:pointer;font-weight:700;">Salvar no CodeBase</button>
        </div>
        <div style="width:300px;padding:20px;background:#111118;border-left:1px solid #252530;overflow-y:auto;">
          <h3 style="margin:0 0 15px 0;color:#9b5de5;">📚 Scripts Salvos</h3>
          <div id="scp-list">${listHtml}</div>
        </div>
      </div>
    `, 800, 500);
    };

    window.saveScript = function () {
      const n = document.getElementById('scp-name').value.trim();
      const l = document.getElementById('scp-lang').value.trim() || 'code';
      const c = document.getElementById('scp-code').value;
      if (!n || !c.trim()) return toast('Preencha nome e código!', 'error');

      scriptsDb.push({ name: n, lang: l, code: c });
      localStorage.setItem('vessie_scripts_db', JSON.stringify(scriptsDb));
      toast(`Script "${n}" salvo sem alterar a formatação.`, 'success');
      window.openVessieScripts();
    };

    window.delScript = function (id) {
      scriptsDb.splice(id, 1);
      localStorage.setItem('vessie_scripts_db', JSON.stringify(scriptsDb));
      window.openVessieScripts();
    };

    window.openVessieLexicon = function () {
      let listHtml = '';
      for (const word in lexicon) {
        const e = lexicon[word];
        listHtml += `<div style="background:#15151c;padding:10px;border-radius:6px;margin-bottom:8px;border-left:3px solid #9b5de5;">
        <div style="display:flex;justify-content:space-between;font-weight:700;color:#fff;"><span>${word}</span> <button onclick="window.delLexicon('${word}')" style="background:#e74c3c;border:none;color:#fff;padding:2px 6px;border-radius:4px;cursor:pointer;font-size:.7rem;">X</button></div>
        <div style="font-size:.75rem;color:#aaa;margin-top:4px;">📖 ${e.meaning}</div>
      </div>`;
      }
      if (!listHtml) listHtml = '<p style="color:#666;text-align:center;font-size:.8rem;">Nenhuma palavra certificada.</p>';

      createWin('Dicionário Vessie', '📖', `
      <div style="display:flex;height:100%;background:#0d0d12;color:#e0e0e0;">
        <div style="flex:1;padding:20px;overflow-y:auto;">
          <h3 style="margin:0 0 15px 0;color:#9b5de5;">🧠 Certificar Nova Palavra</h3>
          <input id="lex-word" placeholder="Palavra" style="width:100%;box-sizing:border-box;background:#15151c;border:1px solid #252530;color:#fff;padding:10px;border-radius:6px;margin-bottom:8px;">
          <input id="lex-meaning" placeholder="Significado" style="width:100%;box-sizing:border-box;background:#15151c;border:1px solid #252530;color:#fff;padding:10px;border-radius:6px;margin-bottom:8px;">
          <input id="lex-category" placeholder="Categoria" style="width:100%;box-sizing:border-box;background:#15151c;border:1px solid #252530;color:#fff;padding:10px;border-radius:6px;margin-bottom:8px;">
          <input id="lex-typos" placeholder="Erros comuns (vírgula)" style="width:100%;box-sizing:border-box;background:#15151c;border:1px solid #252530;color:#fff;padding:10px;border-radius:6px;margin-bottom:8px;">
          <label style="display:flex;align-items:center;gap:8px;font-size:.8rem;color:#aaa;margin-bottom:10px;"><input type="checkbox" id="lex-double" style="width:16px;height:16px;"> Duplo sentido?</label>
          <button onclick="window.saveLexicon()" style="width:100%;background:linear-gradient(90deg,#9b5de5,#f15bb5);border:none;color:#fff;padding:12px;border-radius:6px;cursor:pointer;font-weight:700;">Adicionar</button>
        </div>
        <div style="width:300px;padding:20px;background:#111118;border-left:1px solid #252530;overflow-y:auto;">
          <h3 style="margin:0 0 15px 0;color:#9b5de5;">📚 Salvas</h3>
          <div id="lex-list">${listHtml}</div>
        </div>
      </div>
    `, 800, 500);
    };

    window.saveLexicon = function () {
      const w = document.getElementById('lex-word').value.trim().toLowerCase();
      const m = document.getElementById('lex-meaning').value.trim();
      if (!w || !m) return toast('Preencha palavra e significado!', 'error');
      lexicon[w] = { meaning: m, category: document.getElementById('lex-category').value.trim(), typos: document.getElementById('lex-typos').value.split(',').map(t => t.trim()).filter(t => t), doubleMeaning: document.getElementById('lex-double').checked };
      localStorage.setItem('vessie_lexicon_db', JSON.stringify(lexicon));
      toast(`"${w}" certificada!`, 'success');
      window.openVessieLexicon();
    };

    window.delLexicon = function (word) {
      delete lexicon[word];
      localStorage.setItem('vessie_lexicon_db', JSON.stringify(lexicon));
      window.openVessieLexicon();
    };

    // ==========================================
    // EXPORTAÇÃO DO CACHE COM FORMATAÇÃO PRESERVADA
    // ==========================================
    function generateCacheCode() {
      const entries = Object.entries(cache).map(([key, responses]) => {
        return `  ${JSON.stringify(key)}: ${JSON.stringify(responses, null, 2)}`;
      });
      return `const VESSIE_PREDEFINED_RESPONSES = {\n${entries.join(',\n')}\n};`;
    }

    window.updateAI = function () {
      const code = generateCacheCode();

      createWin('Update AI Code', '⬆️', `
      <div style="padding:20px;height:100%;display:flex;flex-direction:column;background:#0d0d12;color:#fff;">
        <h3 style="margin:0 0 10px;color:#9b5de5;">Código Gerado do Cache</h3>
        <textarea id="ai-code-output" style="flex:1;width:100%;box-sizing:border-box;background:#050508;border:1px solid #252530;color:#0f0;padding:12px;border-radius:6px;font-family:monospace;font-size:.75rem;resize:none;" readonly>${code}</textarea>
        <div style="display:flex;gap:10px;margin-top:10px;">
          <button onclick="navigator.clipboard.writeText(document.getElementById('ai-code-output').value);toast('Código copiado!','success')" style="flex:1;background:linear-gradient(90deg,#9b5de5,#f15bb5);border:none;color:#fff;padding:10px;border-radius:6px;cursor:pointer;font-weight:700;">Copiar Código</button>
        </div>
      </div>
    `, 600, 500);
    };

    // Ao iniciar, preserva o cache e testa a rede
    setTimeout(() => {
      window.testNet();
    }, 500);

    return win;
  }
window.openPromptMasterStandalone = function (initialContext = {}) {
  let initializerWindow = null;
  if (typeof window.openPromptMaster !== 'function') initializerWindow = openVessie();
  const openPromptMaster = window.openPromptMaster;
  if (initializerWindow && typeof window.VessieWM?.close === 'function') {
    window.VessieWM.close(initializerWindow.id);
  }
  if (typeof openPromptMaster !== 'function') {
    throw new Error('Não foi possível inicializar o Prompt Master.');
  }
  return openPromptMaster(initialContext);
};
window.openVessie = openVessie;
})();

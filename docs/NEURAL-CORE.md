# Vessie Neural Core

Rede neural + Deep Reinforcement Learning (Double DQN) em JavaScript puro, sem dependências.
Aprende com o **uso real** do VessieOS neste navegador; nada sai da máquina.

## Arquivos
| Arquivo | Papel |
|---|---|
| `JS/kernel/modules/neural-core/neural.js` | `NeuralNet` (MLP ReLU, backprop, Adam, perda Huber), `ReplayBuffer`, `DQNAgent` (Double DQN, rede alvo com atualização suave, ε-greedy) |
| `JS/kernel/modules/neural-core/autonomy.js` | Agent Loop: **observar → pensar → agir → resultado** |
| `JS/apps/vessie-neural/vessie-neural.js` | App "Vessie Neural": rede ao vivo, valores Q, curvas de aprendizado, log do loop, controles |
| `CSS/systems/modern.css` | Camada visual moderna (tokens grafite) |

## Como o agente aprende
- **Estado** (5 + N números): hora e dia da semana (seno/cosseno), janelas abertas, histórico recente de apps (decaimento exponencial).
- **Ações**: um app por saída da rede (N apps de `window.APPS`).
- **Recompensa**: sugestão certa +1 / +0,7 / +0,5 (por posição), errada −0,2; o app realmente aberto recebe +1 (crédito contrafactual).
- **γ = 0,3** e alvo limitado a `1/(1−γ)`: sugerir um app quase não muda o que o usuário abre depois, e γ alto fazia o Q divergir.
- Resultado visível no **Menu Iniciar → "Sugeridos pela IA"** (aparece após ~40 experiências).

## Vessie-AI (LM Studio)
Opcional e desligado por padrão. Com "Resumo pelo Vessie-AI" ligado, o motor pede ao LM Studio (`vessie_local_ip`, padrão `http://localhost:1234`) um resumo em 2 frases do que foi aprendido. Se o servidor estiver fechado, falha em silêncio.

## API
`window.VessieNeural.autonomy` → `{ agent, recs, log, cfg, loop(), briefing(), simulateRoutine(n), reset(), save() }`.
Evento `vessie:neural:update` a cada decisão. Pesos salvos em `localStorage` (`vessieos:neural:agent`) e exportáveis pelo app.
"Treinar com rotina simulada" é só demonstração; **Reiniciar modelo** apaga tudo.

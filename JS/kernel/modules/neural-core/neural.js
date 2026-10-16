/**
 * Vessie Neural Core — rede neural + Deep Reinforcement Learning, em JS puro (sem dependências).
 *
 *  NeuralNet    MLP (ReLU) com backprop e otimizador Adam, perda Huber, máscara por saída
 *  ReplayBuffer memória circular de experiências (s, a, r, s', done)
 *  DQNAgent     Double DQN: rede online + rede alvo (atualização suave), ε-greedy, persistência
 *
 * Roda no navegador (window.VessieNeural) e no Node (module.exports) — o mesmo código é testado em Node.
 */
(function (root) {
  'use strict';

  function gauss() {
    let u = 0, v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  class NeuralNet {
    constructor(sizes, opt = {}) {
      this.sizes = sizes.slice();
      this.lr = opt.lr || 0.003;
      this.t = 0;
      this.W = []; this.B = []; this.mW = []; this.vW = []; this.mB = []; this.vB = [];
      for (let l = 1; l < sizes.length; l++) {
        const nin = sizes[l - 1], nout = sizes[l], w = new Float32Array(nin * nout);
        const std = Math.sqrt(2 / nin); // inicialização He
        for (let i = 0; i < w.length; i++) w[i] = gauss() * std;
        this.W.push(w); this.B.push(new Float32Array(nout));
        this.mW.push(new Float32Array(w.length)); this.vW.push(new Float32Array(w.length));
        this.mB.push(new Float32Array(nout)); this.vB.push(new Float32Array(nout));
      }
    }

    /** Propagação direta. Retorna a lista de ativações por camada (a[0] = entrada, a[last] = saída linear). */
    forward(x) {
      const acts = [Float32Array.from(x)];
      for (let l = 0; l < this.W.length; l++) {
        const nin = this.sizes[l], nout = this.sizes[l + 1], w = this.W[l], b = this.B[l], a = acts[l];
        const out = new Float32Array(nout), last = l === this.W.length - 1;
        for (let o = 0; o < nout; o++) {
          let s = b[o];
          const base = o * nin;
          for (let i = 0; i < nin; i++) s += w[base + i] * a[i];
          out[o] = last ? s : (s > 0 ? s : 0);
        }
        acts.push(out);
      }
      return acts;
    }

    predict(x) { const a = this.forward(x); return a[a.length - 1]; }

    /** Treina em um lote [{x, y, mask}]; só as saídas com mask=1 geram gradiente (essencial para DQN). */
    trainBatch(batch) {
      const L = this.W.length;
      const gW = this.W.map(w => new Float32Array(w.length)), gB = this.B.map(b => new Float32Array(b.length));
      let loss = 0;
      for (const { x, y, mask } of batch) {
        const acts = this.forward(x), out = acts[L];
        let delta = new Float32Array(out.length);
        for (let k = 0; k < out.length; k++) {
          if (mask && !mask[k]) continue;
          const e = out[k] - y[k], ae = Math.abs(e);
          loss += ae <= 1 ? 0.5 * e * e : ae - 0.5; // Huber
          delta[k] = Math.max(-1, Math.min(1, e));
        }
        for (let l = L - 1; l >= 0; l--) {
          const nin = this.sizes[l], nout = this.sizes[l + 1], a = acts[l], w = this.W[l];
          const prev = l > 0 ? new Float32Array(nin) : null;
          for (let o = 0; o < nout; o++) {
            const d = delta[o]; if (!d) continue;
            gB[l][o] += d;
            const base = o * nin;
            for (let i = 0; i < nin; i++) {
              gW[l][base + i] += d * a[i];
              if (prev) prev[i] += w[base + i] * d;
            }
          }
          if (prev) { for (let i = 0; i < nin; i++) if (acts[l][i] <= 0) prev[i] = 0; delta = prev; }
        }
      }
      const n = batch.length, b1 = 0.9, b2 = 0.999, eps = 1e-8;
      this.t++;
      const c1 = 1 - Math.pow(b1, this.t), c2 = 1 - Math.pow(b2, this.t);
      for (let l = 0; l < L; l++) {
        for (let i = 0; i < this.W[l].length; i++) {
          const g = gW[l][i] / n;
          this.mW[l][i] = b1 * this.mW[l][i] + (1 - b1) * g;
          this.vW[l][i] = b2 * this.vW[l][i] + (1 - b2) * g * g;
          this.W[l][i] -= this.lr * (this.mW[l][i] / c1) / (Math.sqrt(this.vW[l][i] / c2) + eps);
        }
        for (let i = 0; i < this.B[l].length; i++) {
          const g = gB[l][i] / n;
          this.mB[l][i] = b1 * this.mB[l][i] + (1 - b1) * g;
          this.vB[l][i] = b2 * this.vB[l][i] + (1 - b2) * g * g;
          this.B[l][i] -= this.lr * (this.mB[l][i] / c1) / (Math.sqrt(this.vB[l][i] / c2) + eps);
        }
      }
      return loss / n;
    }

    /** Cópia dos pesos; tau<1 faz atualização suave (Polyak) da rede alvo. */
    copyFrom(o, tau = 1) {
      for (let l = 0; l < this.W.length; l++) {
        for (let i = 0; i < this.W[l].length; i++) this.W[l][i] = tau * o.W[l][i] + (1 - tau) * this.W[l][i];
        for (let i = 0; i < this.B[l].length; i++) this.B[l][i] = tau * o.B[l][i] + (1 - tau) * this.B[l][i];
      }
    }

    toJSON() { return { sizes: this.sizes, t: this.t, W: this.W.map(a => Array.from(a)), B: this.B.map(a => Array.from(a)) }; }
    static fromJSON(j, opt) {
      const n = new NeuralNet(j.sizes, opt); n.t = j.t || 0;
      j.W.forEach((a, l) => n.W[l].set(a)); j.B.forEach((a, l) => n.B[l].set(a));
      return n;
    }
  }

  class ReplayBuffer {
    constructor(cap = 4000) { this.cap = cap; this.data = []; this.pos = 0; }
    push(e) { if (this.data.length < this.cap) this.data.push(e); else this.data[this.pos] = e; this.pos = (this.pos + 1) % this.cap; }
    sample(n) { const out = []; for (let i = 0; i < n; i++) out.push(this.data[(Math.random() * this.data.length) | 0]); return out; }
    get size() { return this.data.length; }
  }

  class DQNAgent {
    constructor(stateDim, nActions, o = {}) {
      this.stateDim = stateDim; this.nActions = nActions;
      this.gamma = o.gamma ?? 0.9; this.tau = o.tau ?? 0.02;
      this.eps = o.eps ?? 0.25; this.epsMin = o.epsMin ?? 0.04; this.epsDecay = o.epsDecay ?? 0.9985;
      this.batch = o.batch || 32;
      this.qBound = o.qBound || 1 / (1 - this.gamma); // teto teórico do valor com recompensa ≤ 1: evita divergência do bootstrap
      const hidden = o.hidden || [64, 64];
      this.online = new NeuralNet([stateDim, ...hidden, nActions], { lr: o.lr || 0.003 });
      this.target = new NeuralNet([stateDim, ...hidden, nActions]); this.target.copyFrom(this.online);
      this.memory = new ReplayBuffer(o.memory || 4000);
      this.steps = 0; this.loss = 0; this.rewardEma = 0; this.hitEma = 0;
      this.history = { loss: [], reward: [], hit: [] };
    }

    q(state) { return this.online.predict(state); }

    /** Ranking das k melhores ações; com prob. ε uma das vagas vira exploração. */
    rank(state, k = 3, explore = true) {
      const q = this.q(state), idx = Array.from(q.keys()).sort((a, b) => q[b] - q[a]).slice(0, k);
      if (explore && Math.random() < this.eps && k > 1) idx[k - 1] = (Math.random() * this.nActions) | 0;
      return [...new Set(idx)].map(a => ({ action: a, q: q[a] }));
    }

    remember(s, a, r, s2, done = false) {
      this.memory.push({ s, a, r, s2, done });
      this.rewardEma = 0.95 * this.rewardEma + 0.05 * r;
    }

    /** Um passo de Double DQN: a* = argmax online(s'), valor = target(s')[a*]. */
    learn() {
      if (this.memory.size < this.batch) return null;
      const batch = this.memory.sample(this.batch).map(e => {
        const y = new Float32Array(this.nActions), mask = new Uint8Array(this.nActions);
        let tv = e.r;
        if (!e.done) {
          const qo = this.online.predict(e.s2), qt = this.target.predict(e.s2);
          let best = 0; for (let k = 1; k < qo.length; k++) if (qo[k] > qo[best]) best = k;
          tv += this.gamma * qt[best];
        }
        y[e.a] = Math.max(-this.qBound, Math.min(this.qBound, tv)); mask[e.a] = 1;
        return { x: e.s, y, mask };
      });
      this.loss = 0.9 * this.loss + 0.1 * this.online.trainBatch(batch);
      this.target.copyFrom(this.online, this.tau);
      this.eps = Math.max(this.epsMin, this.eps * this.epsDecay);
      this.steps++;
      if (this.steps % 10 === 0) this._log();
      return this.loss;
    }

    _log() {
      for (const [k, v] of [['loss', this.loss], ['reward', this.rewardEma], ['hit', this.hitEma]]) {
        this.history[k].push(v); if (this.history[k].length > 120) this.history[k].shift();
      }
    }

    toJSON() { return { stateDim: this.stateDim, nActions: this.nActions, eps: this.eps, steps: this.steps, rewardEma: this.rewardEma, hitEma: this.hitEma, history: this.history, net: this.online.toJSON() }; }
    load(j) {
      this.online = NeuralNet.fromJSON(j.net, { lr: this.online.lr }); this.target.copyFrom(this.online);
      this.eps = j.eps ?? this.eps; this.steps = j.steps || 0; this.rewardEma = j.rewardEma || 0; this.hitEma = j.hitEma || 0;
      this.history = j.history || this.history;
    }
  }

  const API = { NeuralNet, ReplayBuffer, DQNAgent };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.VessieNeural = Object.assign(root.VessieNeural || {}, API);
})(typeof window !== 'undefined' ? window : globalThis);

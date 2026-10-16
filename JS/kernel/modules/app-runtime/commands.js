/**
 * Vessie Commands — registro de comandos do sistema operacional.
 * Apps (rodando em iframe) NÃO tocam no SO: chamam comandos por mensagem (ver app-host.js).
 *
 *  Namespaces PUROS (sem efeito no SO, sempre liberados): text math num color date enc json arr rand url valid unit util path cmd
 *  Namespaces de SISTEMA (exigem permissão no manifesto do app): system window app fs storage clipboard notify theme audio net ai neural power kernel
 *  Comandos `danger` exigem a permissão "admin" + confirmação do usuário.
 */
(function (root) {
  'use strict';
  const R = new Map();
  const PURE = new Set('text math num color date enc json arr rand url valid unit util path cmd'.split(' '));
  const def = (name, desc, args, fn, o) => R.set(name, Object.assign({ name, ns: name.split('.')[0], desc, args: args ? args.split(' ').filter(Boolean) : [], fn }, o));
  const D = (name, desc, args, fn) => def(name, desc, args, fn, { danger: true });
  const num = v => Number(v), arr = v => Array.isArray(v) ? v : [];
  const dt = v => v === undefined || v === null || v === '' ? new Date() : new Date(v);
  const p2 = n => String(n).padStart(2, '0');
  const utf8 = s => new TextEncoder().encode(String(s));
  const toHex = b => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');

  /* ========================= text ========================= */
  const words = s => String(s).match(/[A-Za-zÀ-ÿ0-9]+/g) || [];
  const noacc = s => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  def('text.upper', 'MAIÚSCULAS', 's', ({ s }) => String(s).toUpperCase());
  def('text.lower', 'minúsculas', 's', ({ s }) => String(s).toLowerCase());
  def('text.title', 'Cada Palavra Capitalizada', 's', ({ s }) => String(s).toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase()));
  def('text.capitalize', 'Primeira letra maiúscula', 's', ({ s }) => { s = String(s); return s.charAt(0).toUpperCase() + s.slice(1); });
  def('text.trim', 'Remove espaços das pontas', 's', ({ s }) => String(s).trim());
  def('text.reverse', 'Inverte o texto', 's', ({ s }) => [...String(s)].reverse().join(''));
  def('text.length', 'Número de caracteres', 's', ({ s }) => [...String(s)].length);
  def('text.words', 'Lista de palavras', 's', ({ s }) => words(s));
  def('text.wordCount', 'Conta palavras', 's', ({ s }) => words(s).length);
  def('text.lines', 'Divide em linhas', 's', ({ s }) => String(s).split(/\r?\n/));
  def('text.slug', 'url-amigavel', 's', ({ s }) => noacc(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''));
  def('text.camel', 'camelCase', 's', ({ s }) => words(noacc(s)).map((w, i) => i ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase()).join(''));
  def('text.snake', 'snake_case', 's', ({ s }) => words(noacc(s)).map(w => w.toLowerCase()).join('_'));
  def('text.kebab', 'kebab-case', 's', ({ s }) => words(noacc(s)).map(w => w.toLowerCase()).join('-'));
  def('text.padLeft', 'Preenche à esquerda', 's n ch', ({ s, n, ch = ' ' }) => String(s).padStart(num(n), ch));
  def('text.padRight', 'Preenche à direita', 's n ch', ({ s, n, ch = ' ' }) => String(s).padEnd(num(n), ch));
  def('text.repeat', 'Repete o texto', 's n', ({ s, n }) => String(s).repeat(Math.min(num(n), 10000)));
  def('text.replace', 'Troca todas as ocorrências', 's from to', ({ s, from, to = '' }) => String(s).split(from).join(to));
  def('text.contains', 'Contém trecho?', 's sub', ({ s, sub }) => String(s).includes(sub));
  def('text.startsWith', 'Começa com?', 's sub', ({ s, sub }) => String(s).startsWith(sub));
  def('text.endsWith', 'Termina com?', 's sub', ({ s, sub }) => String(s).endsWith(sub));
  def('text.split', 'Divide por separador', 's sep', ({ s, sep = ',' }) => String(s).split(sep));
  def('text.join', 'Junta lista', 'list sep', ({ list, sep = ',' }) => arr(list).join(sep));
  def('text.truncate', 'Corta com reticências', 's n', ({ s, n, ellipsis = '…' }) => { s = String(s); return s.length > n ? s.slice(0, Math.max(0, n - ellipsis.length)) + ellipsis : s; });
  def('text.count', 'Conta ocorrências', 's sub', ({ s, sub }) => sub ? String(s).split(sub).length - 1 : 0);
  def('text.stripHtml', 'Remove tags HTML', 's', ({ s }) => String(s).replace(/<[^>]*>/g, ''));
  def('text.escapeHtml', 'Escapa HTML', 's', ({ s }) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
  def('text.unescapeHtml', 'Desfaz escape de HTML', 's', ({ s }) => String(s).replace(/&(amp|lt|gt|quot|#39);/g, (_, c) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" }[c])));
  def('text.levenshtein', 'Distância de edição', 'a b', ({ a, b }) => { a = String(a); b = String(b); const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]); for (let j = 1; j <= b.length; j++) d[0][j] = j; for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; });
  def('text.similarity', 'Similaridade 0–1', 'a b', ({ a, b }) => { const m = Math.max(String(a).length, String(b).length) || 1; return 1 - R.get('text.levenshtein').fn({ a, b }) / m; });
  def('text.isPalindrome', 'É palíndromo?', 's', ({ s }) => { const t = noacc(s).toLowerCase().replace(/[^a-z0-9]/g, ''); return t === [...t].reverse().join(''); });
  def('text.removeAccents', 'Remove acentos', 's', ({ s }) => noacc(s));
  def('text.sortLines', 'Ordena linhas', 's', ({ s }) => String(s).split(/\r?\n/).sort((a, b) => a.localeCompare(b, 'pt')).join('\n'));
  def('text.uniqueLines', 'Remove linhas repetidas', 's', ({ s }) => [...new Set(String(s).split(/\r?\n/))].join('\n'));

  /* ========================= math ========================= */
  const sum = l => arr(l).reduce((a, b) => a + num(b), 0);
  const sorted = l => arr(l).map(num).sort((a, b) => a - b);
  const gcd = (a, b) => b ? gcd(b, a % b) : Math.abs(a);
  const prime = n => { n = num(n); if (n < 2 || n !== Math.floor(n)) return false; for (let i = 2; i * i <= n; i++) if (n % i === 0) return false; return true; };
  [['add', 'Soma', (a, b) => a + b], ['sub', 'Subtração', (a, b) => a - b], ['mul', 'Multiplicação', (a, b) => a * b], ['mod', 'Resto', (a, b) => a % b], ['pow', 'Potência', (a, b) => Math.pow(a, b)]]
    .forEach(([n, d, f]) => def('math.' + n, d, 'a b', ({ a, b }) => f(num(a), num(b))));
  def('math.div', 'Divisão', 'a b', ({ a, b }) => { if (!num(b)) throw new Error('divisão por zero'); return num(a) / num(b); });
  ['sqrt', 'cbrt', 'abs', 'floor', 'ceil', 'sin', 'cos', 'tan', 'log', 'log10', 'exp'].forEach(f => def('math.' + f, f + '(n)', 'n', ({ n }) => Math[f](num(n))));
  def('math.round', 'Arredonda com casas', 'n d', ({ n, d = 0 }) => { const k = Math.pow(10, num(d)); return Math.round(num(n) * k) / k; });
  def('math.min', 'Menor da lista', 'list', ({ list }) => Math.min(...arr(list).map(num)));
  def('math.max', 'Maior da lista', 'list', ({ list }) => Math.max(...arr(list).map(num)));
  def('math.sum', 'Soma da lista', 'list', ({ list }) => sum(list));
  def('math.avg', 'Média', 'list', ({ list }) => arr(list).length ? sum(list) / list.length : 0);
  def('math.median', 'Mediana', 'list', ({ list }) => { const s = sorted(list), m = s.length >> 1; return s.length ? (s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2) : 0; });
  def('math.mode', 'Moda', 'list', ({ list }) => { const c = {}; arr(list).forEach(v => c[v] = (c[v] || 0) + 1); const top = Math.max(0, ...Object.values(c)); return Object.keys(c).filter(k => c[k] === top).map(Number); });
  def('math.stddev', 'Desvio padrão', 'list', ({ list }) => { const l = arr(list).map(num), m = sum(l) / (l.length || 1); return Math.sqrt(sum(l.map(v => (v - m) ** 2)) / (l.length || 1)); });
  def('math.clamp', 'Limita ao intervalo', 'n min max', ({ n, min, max }) => Math.min(num(max), Math.max(num(min), num(n))));
  def('math.lerp', 'Interpolação linear', 'a b t', ({ a, b, t }) => num(a) + (num(b) - num(a)) * num(t));
  def('math.map', 'Reescala de faixa', 'n inMin inMax outMin outMax', ({ n, inMin, inMax, outMin, outMax }) => num(outMin) + (num(n) - num(inMin)) * (num(outMax) - num(outMin)) / (num(inMax) - num(inMin)));
  def('math.gcd', 'MDC', 'a b', ({ a, b }) => gcd(num(a), num(b)));
  def('math.lcm', 'MMC', 'a b', ({ a, b }) => Math.abs(num(a) * num(b)) / gcd(num(a), num(b)));
  def('math.factorial', 'Fatorial (n ≤ 170)', 'n', ({ n }) => { n = num(n); if (n < 0 || n > 170) throw new Error('n fora de 0–170'); let r = 1; for (let i = 2; i <= n; i++) r *= i; return r; });
  def('math.fib', 'n-ésimo Fibonacci', 'n', ({ n }) => { let a = 0, b = 1; for (let i = 0; i < Math.min(num(n), 1000); i++) [a, b] = [b, a + b]; return a; });
  def('math.isPrime', 'É primo?', 'n', ({ n }) => prime(n));
  def('math.primes', 'Primos até n', 'n', ({ n }) => { const o = []; for (let i = 2; i <= Math.min(num(n), 100000); i++) if (prime(i)) o.push(i); return o; });
  def('math.deg2rad', 'Graus → radianos', 'n', ({ n }) => num(n) * Math.PI / 180);
  def('math.rad2deg', 'Radianos → graus', 'n', ({ n }) => num(n) * 180 / Math.PI);
  def('math.hypot', 'Hipotenusa', 'a b', ({ a, b }) => Math.hypot(num(a), num(b)));
  def('math.percent', 'Percentual parte/total', 'part total', ({ part, total }) => num(part) / num(total) * 100);
  def('math.toBase', 'Número → base N', 'n base', ({ n, base = 2 }) => Math.trunc(num(n)).toString(num(base)));
  def('math.fromBase', 'Texto base N → número', 's base', ({ s, base = 2 }) => parseInt(s, num(base)));
  def('math.eval', 'Avalia expressão aritmética segura', 'expr', ({ expr }) => {
    const t = String(expr).replace(/\s+/g, '').match(/\d+\.?\d*|[-+*/%^()]/g) || []; let i = 0;
    const atom = () => { const k = t[i++]; if (k === '(') { const v = add(); i++; return v; } if (k === '-') return -atom(); if (k === '+') return atom(); const v = parseFloat(k); if (isNaN(v)) throw new Error('expressão inválida'); return v; };
    const pw = () => { let v = atom(); while (t[i] === '^') { i++; v = Math.pow(v, pw()); } return v; };
    const mul = () => { let v = pw(); while (['*', '/', '%'].includes(t[i])) { const o = t[i++], r = pw(); v = o === '*' ? v * r : o === '/' ? v / r : v % r; } return v; };
    const add = () => { let v = mul(); while (t[i] === '+' || t[i] === '-') { const o = t[i++], r = mul(); v = o === '+' ? v + r : v - r; } return v; };
    const out = add(); if (i < t.length) throw new Error('expressão inválida'); return out;
  });

  /* ========================= num ========================= */
  def('num.format', 'Formata número (pt-BR)', 'n locale', ({ n, locale = 'pt-BR' }) => new Intl.NumberFormat(locale).format(num(n)));
  def('num.currency', 'Formata moeda', 'n cur locale', ({ n, cur = 'BRL', locale = 'pt-BR' }) => new Intl.NumberFormat(locale, { style: 'currency', currency: cur }).format(num(n)));
  def('num.bytes', 'Bytes legíveis', 'n', ({ n }) => { n = num(n); const u = ['B', 'KB', 'MB', 'GB', 'TB']; let i = 0; while (n >= 1024 && i < 4) { n /= 1024; i++; } return (i ? n.toFixed(1) : n) + ' ' + u[i]; });
  def('num.compact', 'Número compacto (1,2 mil)', 'n', ({ n }) => new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(num(n)));
  def('num.pad', 'Zeros à esquerda', 'n len', ({ n, len = 2 }) => String(Math.trunc(num(n))).padStart(num(len), '0'));
  const RM = [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  def('num.roman', 'Número → romano', 'n', ({ n }) => { n = num(n); if (n < 1 || n > 3999) throw new Error('use 1–3999'); return RM.reduce((s, [v, r]) => { while (n >= v) { s += r; n -= v; } return s; }, ''); });
  def('num.fromRoman', 'Romano → número', 's', ({ s }) => { s = String(s).toUpperCase(); let n = 0; RM.forEach(([v, r]) => { while (s.startsWith(r)) { n += v; s = s.slice(r.length); } }); return n; });

  /* ========================= color ========================= */
  const h2r = h => { h = String(h).replace('#', ''); if (h.length === 3) h = [...h].map(c => c + c).join(''); const n = parseInt(h, 16); if (isNaN(n) || h.length !== 6) throw new Error('cor hex inválida'); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const r2h = (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const r2hsl = ([r, g, b]) => { r /= 255; g /= 255; b /= 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2; let h = 0, s = 0; if (mx !== mn) { const d = mx - mn; s = l > .5 ? d / (2 - mx - mn) : d / (mx + mn); h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h *= 60; } return [h, s * 100, l * 100]; };
  const hsl2h = (h, s, l) => { h = ((h % 360) + 360) % 360; s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)); return r2h(f(0) * 255, f(8) * 255, f(4) * 255); };
  const lum = hex => { const [r, g, b] = h2r(hex).map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }); return .2126 * r + .7152 * g + .0722 * b; };
  const shift = (hex, d) => { const [h, s, l] = r2hsl(h2r(hex)); return hsl2h(h, s, Math.max(0, Math.min(100, l + d))); };
  def('color.hexToRgb', 'Hex → [r,g,b]', 'hex', ({ hex }) => h2r(hex));
  def('color.rgbToHex', '[r,g,b] → hex', 'r g b', ({ r, g, b }) => r2hex(r, g, b));
  const r2hex = r2h;
  def('color.hexToHsl', 'Hex → [h,s,l]', 'hex', ({ hex }) => r2hsl(h2r(hex)).map(v => Math.round(v)));
  def('color.hslToHex', 'HSL → hex', 'h s l', ({ h, s, l }) => hsl2h(num(h), num(s), num(l)));
  def('color.lighten', 'Clareia (pontos de luminosidade)', 'hex pct', ({ hex, pct = 10 }) => shift(hex, num(pct)));
  def('color.darken', 'Escurece', 'hex pct', ({ hex, pct = 10 }) => shift(hex, -num(pct)));
  def('color.mix', 'Mistura duas cores', 'a b t', ({ a, b, t = .5 }) => { const x = h2r(a), y = h2r(b); return r2h(...x.map((v, i) => v + (y[i] - v) * num(t))); });
  def('color.luminance', 'Luminância relativa', 'hex', ({ hex }) => +lum(hex).toFixed(4));
  def('color.contrast', 'Contraste WCAG entre duas cores', 'a b', ({ a, b }) => { const x = lum(a), y = lum(b); return +((Math.max(x, y) + .05) / (Math.min(x, y) + .05)).toFixed(2); });
  def('color.isDark', 'Cor escura?', 'hex', ({ hex }) => lum(hex) < .4);
  def('color.complement', 'Cor complementar', 'hex', ({ hex }) => { const [h, s, l] = r2hsl(h2r(hex)); return hsl2h(h + 180, s, l); });
  def('color.alpha', 'rgba() com transparência', 'hex a', ({ hex, a = 1 }) => `rgba(${h2r(hex).join(',')},${num(a)})`);
  def('color.palette', 'Paleta por rotação de matiz', 'hex n', ({ hex, n = 5 }) => { const [h, s, l] = r2hsl(h2r(hex)); return Array.from({ length: Math.min(num(n), 24) }, (_, i) => hsl2h(h + i * 360 / num(n), s, l)); });
  def('color.random', 'Cor aleatória', '', () => r2h(Math.random() * 255, Math.random() * 255, Math.random() * 255));

  /* ========================= date ========================= */
  const UNIT_MS = { ms: 1, s: 1e3, m: 6e4, h: 36e5, d: 864e5, w: 6048e5 };
  def('date.now', 'Agora (ISO)', '', () => new Date().toISOString());
  def('date.timestamp', 'Timestamp em ms', 'd', ({ d }) => dt(d).getTime());
  def('date.iso', 'Data em ISO', 'd', ({ d }) => dt(d).toISOString());
  def('date.format', 'Formata (YYYY MM DD HH mm ss)', 'd fmt', ({ d, fmt = 'DD/MM/YYYY HH:mm' }) => { const x = dt(d); return fmt.replace(/YYYY|MM|DD|HH|mm|ss/g, t => ({ YYYY: x.getFullYear(), MM: p2(x.getMonth() + 1), DD: p2(x.getDate()), HH: p2(x.getHours()), mm: p2(x.getMinutes()), ss: p2(x.getSeconds()) }[t])); });
  def('date.parse', 'Texto → timestamp', 's', ({ s }) => { const t = Date.parse(s); if (isNaN(t)) throw new Error('data inválida'); return t; });
  def('date.add', 'Soma tempo (ms s m h d w mo y)', 'd amount unit', ({ d, amount, unit = 'd' }) => { const x = dt(d); if (unit === 'mo') x.setMonth(x.getMonth() + num(amount)); else if (unit === 'y') x.setFullYear(x.getFullYear() + num(amount)); else x.setTime(x.getTime() + num(amount) * UNIT_MS[unit]); return x.toISOString(); });
  def('date.diff', 'Diferença a−b na unidade', 'a b unit', ({ a, b, unit = 'd' }) => (dt(a) - dt(b)) / UNIT_MS[unit]);
  def('date.weekday', 'Dia da semana', 'd', ({ d }) => dt(d).toLocaleDateString('pt-BR', { weekday: 'long' }));
  def('date.isLeap', 'Ano bissexto?', 'y', ({ y }) => (num(y) % 4 === 0 && num(y) % 100 !== 0) || num(y) % 400 === 0);
  def('date.daysInMonth', 'Dias no mês', 'y m', ({ y, m }) => new Date(num(y), num(m), 0).getDate());
  def('date.dayOfYear', 'Dia do ano', 'd', ({ d }) => { const x = dt(d); return Math.floor((x - new Date(x.getFullYear(), 0, 0)) / 864e5); });
  def('date.week', 'Semana ISO', 'd', ({ d }) => { const x = dt(d), t = new Date(Date.UTC(x.getFullYear(), x.getMonth(), x.getDate())); t.setUTCDate(t.getUTCDate() + 4 - (t.getUTCDay() || 7)); return Math.ceil(((t - new Date(Date.UTC(t.getUTCFullYear(), 0, 1))) / 864e5 + 1) / 7); });
  def('date.quarter', 'Trimestre', 'd', ({ d }) => Math.floor(dt(d).getMonth() / 3) + 1);
  def('date.startOfDay', 'Início do dia', 'd', ({ d }) => { const x = dt(d); x.setHours(0, 0, 0, 0); return x.toISOString(); });
  def('date.endOfDay', 'Fim do dia', 'd', ({ d }) => { const x = dt(d); x.setHours(23, 59, 59, 999); return x.toISOString(); });
  def('date.relative', 'Tempo relativo (há 2 dias)', 'd', ({ d }) => { const s = (dt(d) - Date.now()) / 1e3, f = new Intl.RelativeTimeFormat('pt-BR', { numeric: 'auto' }); for (const [u, k] of [['year', 31536e3], ['month', 2592e3], ['day', 86400], ['hour', 3600], ['minute', 60]]) if (Math.abs(s) >= k) return f.format(Math.round(s / k), u); return f.format(Math.round(s), 'second'); });
  def('date.age', 'Idade em anos', 'birth', ({ birth }) => { const b = dt(birth), n = new Date(); let a = n.getFullYear() - b.getFullYear(); if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a--; return a; });
  def('date.timezone', 'Fuso horário', '', () => Intl.DateTimeFormat().resolvedOptions().timeZone);
  def('date.isWeekend', 'Fim de semana?', 'd', ({ d }) => [0, 6].includes(dt(d).getDay()));
  def('date.calendar', 'Matriz do mês (semanas × dias)', 'y m', ({ y, m }) => { const first = new Date(num(y), num(m) - 1, 1).getDay(), n = new Date(num(y), num(m), 0).getDate(), cells = [...Array(first).fill(null), ...Array.from({ length: n }, (_, i) => i + 1)]; const w = []; for (let i = 0; i < cells.length; i += 7) w.push(cells.slice(i, i + 7)); return w; });

  /* ========================= enc ========================= */
  const b64e = s => { const b = utf8(s); let o = ''; b.forEach(c => o += String.fromCharCode(c)); return btoa(o); };
  const b64d = s => new TextDecoder().decode(Uint8Array.from(atob(String(s)), c => c.charCodeAt(0)));
  const MORSE = { a: '.-', b: '-...', c: '-.-.', d: '-..', e: '.', f: '..-.', g: '--.', h: '....', i: '..', j: '.---', k: '-.-', l: '.-..', m: '--', n: '-.', o: '---', p: '.--.', q: '--.-', r: '.-.', s: '...', t: '-', u: '..-', v: '...-', w: '.--', x: '-..-', y: '-.--', z: '--..', 0: '-----', 1: '.----', 2: '..---', 3: '...--', 4: '....-', 5: '.....', 6: '-....', 7: '--...', 8: '---..', 9: '----.' };
  const caesar = (s, k) => String(s).replace(/[a-z]/gi, c => { const b = c <= 'Z' ? 65 : 97; return String.fromCharCode((c.charCodeAt(0) - b + ((k % 26) + 26)) % 26 + b); });
  def('enc.base64Encode', 'Texto → Base64', 's', ({ s }) => b64e(s));
  def('enc.base64Decode', 'Base64 → texto', 's', ({ s }) => b64d(s));
  def('enc.hexEncode', 'Texto → hex', 's', ({ s }) => toHex(utf8(s)));
  def('enc.hexDecode', 'Hex → texto', 's', ({ s }) => new TextDecoder().decode(Uint8Array.from(String(s).match(/../g) || [], h => parseInt(h, 16))));
  def('enc.urlEncode', 'Codifica URL', 's', ({ s }) => encodeURIComponent(s));
  def('enc.urlDecode', 'Decodifica URL', 's', ({ s }) => decodeURIComponent(s));
  def('enc.binaryEncode', 'Texto → binário', 's', ({ s }) => [...utf8(s)].map(b => b.toString(2).padStart(8, '0')).join(' '));
  def('enc.binaryDecode', 'Binário → texto', 's', ({ s }) => new TextDecoder().decode(Uint8Array.from(String(s).trim().split(/\s+/), b => parseInt(b, 2))));
  def('enc.morseEncode', 'Texto → Morse', 's', ({ s }) => noacc(s).toLowerCase().split('').map(c => c === ' ' ? '/' : MORSE[c] || '').filter(Boolean).join(' '));
  def('enc.morseDecode', 'Morse → texto', 's', ({ s }) => { const inv = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k])); return String(s).split(' ').map(c => c === '/' ? ' ' : inv[c] || '').join(''); });
  def('enc.rot13', 'ROT13', 's', ({ s }) => caesar(s, 13));
  def('enc.caesar', 'Cifra de César', 's shift', ({ s, shift = 3 }) => caesar(s, num(shift)));
  def('enc.utf8Bytes', 'Bytes UTF-8', 's', ({ s }) => [...utf8(s)]);
  const dig = a => ({ s }) => crypto.subtle.digest(a, utf8(s)).then(toHex);
  def('enc.sha1', 'SHA-1', 's', dig('SHA-1'));
  def('enc.sha256', 'SHA-256', 's', dig('SHA-256'));
  def('enc.sha512', 'SHA-512', 's', dig('SHA-512'));
  def('enc.djb2', 'Hash rápido djb2', 's', ({ s }) => { let h = 5381; for (const b of utf8(s)) h = ((h << 5) + h + b) >>> 0; return h.toString(16); });
  def('enc.crc32', 'CRC-32', 's', ({ s }) => { let c, crc = -1; for (const b of utf8(s)) { c = (crc ^ b) & 255; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xEDB88320 : c >>> 1; crc = (crc >>> 8) ^ c; } return ((crc ^ -1) >>> 0).toString(16).padStart(8, '0'); });
  def('enc.uuid', 'UUID v4', '', () => crypto.randomUUID());
  def('enc.nanoid', 'ID curto aleatório', 'n', ({ n = 12 }) => Array.from(crypto.getRandomValues(new Uint8Array(Math.min(num(n), 128))), b => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join(''));
  def('enc.randomBytes', 'Bytes aleatórios (hex)', 'n', ({ n = 16 }) => toHex(crypto.getRandomValues(new Uint8Array(Math.min(num(n), 1024)))));

  /* ========================= json ========================= */
  const getp = (o, p) => String(p).split('.').filter(Boolean).reduce((a, k) => a == null ? undefined : a[k], o);
  const flat = (o, pre = '', out = {}) => { Object.entries(o || {}).forEach(([k, v]) => v && typeof v === 'object' && !Array.isArray(v) ? flat(v, pre + k + '.', out) : out[pre + k] = v); return out; };
  def('json.parse', 'Texto → objeto', 's', ({ s }) => JSON.parse(s));
  def('json.stringify', 'Objeto → texto', 'v', ({ v }) => JSON.stringify(v));
  def('json.pretty', 'JSON indentado', 's', ({ s }) => JSON.stringify(typeof s === 'string' ? JSON.parse(s) : s, null, 2));
  def('json.minify', 'JSON compacto', 's', ({ s }) => JSON.stringify(typeof s === 'string' ? JSON.parse(s) : s));
  def('json.get', 'Lê caminho a.b.c', 'obj path', ({ obj, path }) => getp(obj, path));
  def('json.set', 'Define caminho a.b.c', 'obj path value', ({ obj, path, value }) => { const o = JSON.parse(JSON.stringify(obj || {})), k = String(path).split('.'); let c = o; k.slice(0, -1).forEach(x => c = c[x] = c[x] && typeof c[x] === 'object' ? c[x] : {}); c[k[k.length - 1]] = value; return o; });
  def('json.keys', 'Chaves do objeto', 'obj', ({ obj }) => Object.keys(obj || {}));
  def('json.merge', 'Mescla dois objetos', 'a b', ({ a, b }) => Object.assign({}, a, b));
  def('json.flatten', 'Achata chaves aninhadas', 'obj', ({ obj }) => flat(obj));
  def('json.isValid', 'JSON válido?', 's', ({ s }) => { try { JSON.parse(s); return true; } catch (_) { return false; } });

  /* ========================= arr ========================= */
  def('arr.unique', 'Remove repetidos', 'list', ({ list }) => [...new Set(arr(list))]);
  def('arr.sort', 'Ordena crescente', 'list', ({ list }) => arr(list).slice().sort((a, b) => typeof a === 'number' ? a - b : String(a).localeCompare(String(b), 'pt')));
  def('arr.sortDesc', 'Ordena decrescente', 'list', ({ list }) => R.get('arr.sort').fn({ list }).reverse());
  def('arr.shuffle', 'Embaralha', 'list', ({ list }) => { const a = arr(list).slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; });
  def('arr.chunk', 'Divide em blocos', 'list n', ({ list, n }) => { const o = []; for (let i = 0; i < arr(list).length; i += Math.max(1, num(n))) o.push(list.slice(i, i + num(n))); return o; });
  def('arr.flatten', 'Achata um nível', 'list', ({ list }) => arr(list).flat());
  def('arr.zip', 'Une duas listas', 'a b', ({ a, b }) => arr(a).map((v, i) => [v, arr(b)[i]]));
  def('arr.range', 'Sequência numérica', 'from to step', ({ from = 0, to, step = 1 }) => { const o = []; for (let i = num(from); step > 0 ? i < num(to) : i > num(to); i += num(step)) { o.push(i); if (o.length > 100000) break; } return o; });
  def('arr.reverse', 'Inverte lista', 'list', ({ list }) => arr(list).slice().reverse());
  def('arr.first', 'Primeiros n', 'list n', ({ list, n = 1 }) => arr(list).slice(0, num(n)));
  def('arr.last', 'Últimos n', 'list n', ({ list, n = 1 }) => arr(list).slice(-num(n)));
  def('arr.sample', 'Item aleatório', 'list', ({ list }) => arr(list)[Math.floor(Math.random() * arr(list).length)]);
  def('arr.count', 'Conta itens', 'list', ({ list }) => arr(list).length);
  def('arr.intersect', 'Interseção', 'a b', ({ a, b }) => arr(a).filter(v => arr(b).includes(v)));
  def('arr.union', 'União', 'a b', ({ a, b }) => [...new Set([...arr(a), ...arr(b)])]);
  def('arr.difference', 'Diferença a − b', 'a b', ({ a, b }) => arr(a).filter(v => !arr(b).includes(v)));
  def('arr.groupBy', 'Agrupa por chave', 'list key', ({ list, key }) => arr(list).reduce((o, v) => ((o[getp(v, key)] ||= []).push(v), o), {}));
  def('arr.pluck', 'Extrai campo', 'list key', ({ list, key }) => arr(list).map(v => getp(v, key)));
  def('arr.sortBy', 'Ordena por campo', 'list key', ({ list, key }) => arr(list).slice().sort((a, b) => { const x = getp(a, key), y = getp(b, key); return typeof x === 'number' ? x - y : String(x).localeCompare(String(y), 'pt'); }));

  /* ========================= rand / url / valid / unit / util / path ========================= */
  const rnd = () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296;
  def('rand.int', 'Inteiro aleatório [min,max]', 'min max', ({ min = 0, max = 100 }) => Math.floor(rnd() * (num(max) - num(min) + 1)) + num(min));
  def('rand.float', 'Decimal aleatório', 'min max', ({ min = 0, max = 1 }) => rnd() * (num(max) - num(min)) + num(min));
  def('rand.pick', 'Escolhe da lista', 'list', ({ list }) => arr(list)[Math.floor(rnd() * arr(list).length)]);
  def('rand.bool', 'Cara ou coroa', '', () => rnd() < .5);
  def('rand.string', 'Texto aleatório', 'n chars', ({ n = 10, chars = 'abcdefghijklmnopqrstuvwxyz0123456789' }) => Array.from({ length: Math.min(num(n), 4096) }, () => chars[Math.floor(rnd() * chars.length)]).join(''));
  def('rand.password', 'Senha forte', 'n', ({ n = 16 }) => R.get('rand.string').fn({ n, chars: 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*?' }));
  def('rand.dice', 'Rola dados', 'sides n', ({ sides = 6, n = 1 }) => Array.from({ length: Math.min(num(n), 1000) }, () => Math.floor(rnd() * num(sides)) + 1));
  def('rand.gaussian', 'Normal (Box-Muller)', 'mean sd', ({ mean = 0, sd = 1 }) => num(mean) + num(sd) * Math.sqrt(-2 * Math.log(rnd() || 1e-9)) * Math.cos(2 * Math.PI * rnd()));
  def('url.parse', 'Divide uma URL', 'url', ({ url }) => { const u = new URL(url); return { protocol: u.protocol, host: u.host, hostname: u.hostname, port: u.port, path: u.pathname, query: Object.fromEntries(u.searchParams), hash: u.hash }; });
  def('url.build', 'Monta URL com parâmetros', 'base params', ({ base, params = {} }) => { const u = new URL(base); Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v)); return u.href; });
  def('url.queryParse', 'a=1&b=2 → objeto', 's', ({ s }) => Object.fromEntries(new URLSearchParams(String(s).replace(/^\?/, ''))));
  def('url.queryBuild', 'Objeto → a=1&b=2', 'obj', ({ obj }) => new URLSearchParams(obj).toString());
  def('url.domain', 'Domínio de uma URL', 'url', ({ url }) => new URL(url).hostname.replace(/^www\./, ''));
  def('url.isValid', 'URL válida?', 'url', ({ url }) => { try { new URL(url); return true; } catch (_) { return false; } });
  const digits = s => String(s).replace(/\D/g, '');
  def('valid.email', 'E-mail válido?', 's', ({ s }) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s));
  def('valid.cpf', 'CPF válido?', 's', ({ s }) => { const c = digits(s); if (c.length !== 11 || /^(\d)\1+$/.test(c)) return false; const f = n => { let t = 0; for (let i = 0; i < n; i++) t += c[i] * (n + 1 - i); return (t * 10 % 11) % 10; }; return f(9) == c[9] && f(10) == c[10]; });
  def('valid.cnpj', 'CNPJ válido?', 's', ({ s }) => { const c = digits(s); if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false; const f = n => { let t = 0, p = n - 7; for (let i = 0; i < n; i++) { t += c[i] * p--; if (p < 2) p = 9; } return (t % 11 < 2) ? 0 : 11 - t % 11; }; return f(12) == c[12] && f(13) == c[13]; });
  def('valid.url', 'URL http(s) válida?', 's', ({ s }) => { try { return /^https?:$/.test(new URL(s).protocol); } catch (_) { return false; } });
  def('valid.ip', 'IPv4 válido?', 's', ({ s }) => /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/.test(s));
  def('valid.hexColor', 'Cor hex válida?', 's', ({ s }) => /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.test(s));
  def('valid.luhn', 'Cartão (Luhn) válido?', 's', ({ s }) => { const c = digits(s); let t = 0; [...c].reverse().forEach((d, i) => { d = +d; if (i % 2) { d *= 2; if (d > 9) d -= 9; } t += d; }); return c.length > 12 && t % 10 === 0; });
  const UNITS = { length: { m: 1, km: 1e3, cm: .01, mm: .001, mi: 1609.344, yd: .9144, ft: .3048, in: .0254 }, mass: { kg: 1, g: .001, mg: 1e-6, t: 1e3, lb: .45359237, oz: .028349523 }, speed: { 'm/s': 1, 'km/h': 1 / 3.6, mph: .44704, kn: .514444 }, data: { B: 1, KB: 1024, MB: 1048576, GB: 1073741824, TB: 1099511627776 }, time: { ms: .001, s: 1, min: 60, h: 3600, d: 86400, w: 604800 }, area: { 'm2': 1, 'km2': 1e6, 'ha': 1e4, 'ft2': .092903, 'ac': 4046.8564 }, volume: { l: 1, ml: .001, 'm3': 1000, gal: 3.785411784, cup: .2365882 } };
  def('unit.convert', 'Converte unidades (comprimento, massa, velocidade, dados, tempo, área, volume)', 'v from to', ({ v, from, to }) => { for (const t of Object.values(UNITS)) if (from in t && to in t) return num(v) * t[from] / t[to]; throw new Error('unidades incompatíveis'); });
  def('unit.temp', 'Converte C/F/K', 'v from to', ({ v, from, to }) => { v = num(v); const c = from === 'F' ? (v - 32) * 5 / 9 : from === 'K' ? v - 273.15 : v; return to === 'F' ? c * 9 / 5 + 32 : to === 'K' ? c + 273.15 : c; });
  def('unit.list', 'Unidades suportadas', '', () => Object.fromEntries(Object.entries(UNITS).map(([k, v]) => [k, Object.keys(v)])));
  def('util.sleep', 'Aguarda ms (máx 10 s)', 'ms', ({ ms }) => new Promise(r => setTimeout(() => r(true), Math.min(num(ms), 1e4))));
  def('util.typeOf', 'Tipo do valor', 'v', ({ v }) => v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
  def('util.clone', 'Clona profundamente', 'v', ({ v }) => JSON.parse(JSON.stringify(v)));
  def('util.equals', 'Igualdade profunda', 'a b', ({ a, b }) => JSON.stringify(a) === JSON.stringify(b));
  def('util.isEmpty', 'Vazio?', 'v', ({ v }) => v == null || v === '' || (typeof v === 'object' && !Object.keys(v).length));
  def('util.template', 'Substitui {{chave}}', 's data', ({ s, data = {} }) => String(s).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => getp(data, k) ?? ''));
  def('util.regexTest', 'Regex confere?', 's pattern flags', ({ s, pattern, flags = '' }) => new RegExp(pattern, flags).test(s));
  def('util.regexMatch', 'Todas as correspondências', 's pattern flags', ({ s, pattern, flags = 'g' }) => String(s).match(new RegExp(pattern, flags)) || []);
  def('util.regexReplace', 'Troca por regex', 's pattern to flags', ({ s, pattern, to = '', flags = 'g' }) => String(s).replace(new RegExp(pattern, flags), to));
  def('util.versionCompare', 'Compara versões 1.2.3 (−1/0/1)', 'a b', ({ a, b }) => { const x = String(a).split('.').map(Number), y = String(b).split('.').map(Number); for (let i = 0; i < Math.max(x.length, y.length); i++) { const d = (x[i] || 0) - (y[i] || 0); if (d) return d < 0 ? -1 : 1; } return 0; });
  def('util.id', 'ID único curto', '', () => Date.now().toString(36) + Math.floor(rnd() * 1e6).toString(36));
  def('path.join', 'Junta caminhos', 'parts', ({ parts }) => arr(parts).join('/').replace(/\/+/g, '/'));
  def('path.basename', 'Nome do arquivo', 'p', ({ p }) => String(p).split('/').filter(Boolean).pop() || '');
  def('path.dirname', 'Pasta pai', 'p', ({ p }) => String(p).split('/').filter(Boolean).slice(0, -1).join('/'));
  def('path.ext', 'Extensão', 'p', ({ p }) => (String(p).match(/\.([a-z0-9]+)$/i) || [, ''])[1].toLowerCase());
  def('path.normalize', 'Normaliza barras e ..', 'p', ({ p }) => { const o = []; String(p).replace(/\\/g, '/').split('/').forEach(s => { if (s === '..') o.pop(); else if (s && s !== '.') o.push(s); }); return o.join('/'); });

  /* ========================= meta (cmd.*) ========================= */
  const meta = c => ({ name: c.name, ns: c.ns, desc: c.desc, args: c.args, pure: PURE.has(c.ns), danger: !!c.danger });
  def('cmd.list', 'Lista comandos (filtra por namespace)', 'ns', ({ ns }) => [...R.values()].filter(c => !ns || c.ns === ns).map(meta));
  def('cmd.info', 'Detalhes de um comando', 'name', ({ name }) => { const c = R.get(name); if (!c) throw new Error('comando inexistente: ' + name); return meta(c); });
  def('cmd.count', 'Total de comandos', '', () => R.size);
  def('cmd.search', 'Busca por nome/descrição', 'q', ({ q }) => [...R.values()].filter(c => (c.name + ' ' + c.desc).toLowerCase().includes(String(q).toLowerCase())).map(meta));
  def('cmd.namespaces', 'Namespaces e contagem', '', () => { const o = {}; R.forEach(c => o[c.ns] = (o[c.ns] || 0) + 1); return o; });

  root.VessieCommands = { registry: R, PURE, def, define: def, meta, count: () => R.size };
  if (typeof module !== 'undefined' && module.exports) module.exports = root.VessieCommands;
})(typeof window !== 'undefined' ? window : globalThis);

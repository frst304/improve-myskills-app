// Générateurs de questions de calcul mental. Toutes les réponses sont entières.
const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1))
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

export const CLASSIC = {
  add: { a: [2, 100], b: [2, 100] },
  mul: { a: [2, 12], b: [2, 100] },
}

function classic(cfg, ops) {
  const op = pick(ops)
  if (op === 'add') { const a = rnd(...cfg.add.a), b = rnd(...cfg.add.b); return { op, text: `${a} + ${b}`, answer: a + b } }
  if (op === 'sub') { const a = rnd(...cfg.add.a), b = rnd(...cfg.add.b); return { op, text: `${a + b} − ${a}`, answer: b } }
  if (op === 'mul') { const a = rnd(...cfg.mul.a), b = rnd(...cfg.mul.b); return { op, text: `${a} × ${b}`, answer: a * b } }
  const a = rnd(...cfg.mul.a), b = rnd(...cfg.mul.b)
  return { op: 'div', text: `${a * b} ÷ ${a}`, answer: b }
}

const POW = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹']
const sup = (n) => String(n).split('').map((d) => POW[d]).join('')

const special = {
  square: () => { const n = rnd(11, 40); return { op: 'pow', text: `${n}²`, answer: n * n } },
  root: () => { const n = rnd(11, 40); return { op: 'pow', text: `√${n * n}`, answer: n } },
  pow2: () => { const k = rnd(5, 16); return { op: 'pow', text: `2${sup(k)}`, answer: 2 ** k } },
  cube: () => { const n = rnd(2, 12); return { op: 'pow', text: `${n}³`, answer: n ** 3 } },
  percent: () => {
    const p = pick([5, 10, 12.5, 15, 20, 25, 30, 40, 60, 75, 80])
    const unit = p === 12.5 ? 8 : 100 / gcd(p, 100)
    const x = unit * rnd(1, Math.max(2, Math.floor(400 / unit)))
    return { op: 'pct', text: `${String(p).replace('.', ',')} % de ${x}`, answer: Math.round((p * x) / 100) }
  },
  mul2: () => { const a = rnd(11, 99), b = rnd(11, 99); return { op: 'mul', text: `${a} × ${b}`, answer: a * b } },
  mul11: () => { const a = rnd(12, 99); return { op: 'mul', text: `${a} × 11`, answer: a * 11 } },
  div3: () => { const a = rnd(3, 19), b = rnd(12, 99); return { op: 'div', text: `${a * b} ÷ ${a}`, answer: b } },
  sub3: () => { const a = rnd(200, 999), b = rnd(101, a - 1); return { op: 'sub', text: `${a} − ${b}`, answer: a - b } },
  binom: () => { const n = rnd(4, 10), k = rnd(2, Math.min(4, n - 1)); return { op: 'comb', text: `C(${n}, ${k})`, answer: binom(n, k) } },
  mod: () => { const m = rnd(3, 13), a = rnd(20, 200); return { op: 'mod', text: `${a} mod ${m}`, answer: a % m } },
  fact: () => { const n = rnd(3, 8); return { op: 'comb', text: `${n}!`, answer: fact(n) } },
}

function gcd(a, b) { a = Math.round(a * 10); b = Math.round(b * 10); while (b) [a, b] = [b, a % b]; return a / 10 }
const fact = (n) => (n <= 1 ? 1 : n * fact(n - 1))
const binom = (n, k) => fact(n) / (fact(k) * fact(n - k))

export const PRESETS = {
  classic: { name: 'Classique', desc: 'Les réglages officiels de Zetamac : + − × ÷.', ops: ['add', 'sub', 'mul', 'div'] },
  addsub: { name: 'Additions & soustractions', desc: 'Pour gagner en vitesse sur les bases.', ops: ['add', 'sub'] },
  muldiv: { name: 'Tables & divisions', desc: '× et ÷ uniquement, tables jusqu’à 12.', ops: ['mul', 'div'] },
  powers: { name: 'Carrés & puissances', desc: 'n², √, 2ᵏ, n³ — réflexes d’ingénieur.', gen: ['square', 'root', 'pow2', 'cube'] },
  engineer: { name: 'Mixte ingénieur', desc: '2 chiffres × 2 chiffres, %, ×11, grandes divisions.', gen: ['mul2', 'percent', 'mul11', 'div3', 'sub3', 'square'] },
  discrete: { name: 'Maths discrètes', desc: 'Factorielles, binomiaux, modulo.', gen: ['binom', 'mod', 'fact', 'pow2'] },
}

export function makeGenerator(presetKey, cfg = CLASSIC, ops) {
  const p = PRESETS[presetKey] || PRESETS.classic
  if (p.gen) return () => special[pick(p.gen)]()
  const active = ops?.length ? ops : p.ops
  return () => classic(cfg, active)
}

export const OP_LABEL = { add: 'Addition', sub: 'Soustraction', mul: 'Multiplication', div: 'Division', pow: 'Puissances', pct: 'Pourcentages', comb: 'Combinatoire', mod: 'Modulo' }

// Échelle indicative pour le Zetamac classique (2 min)
export function zetaLevel(score) {
  const tiers = [
    [0, 'Débutant'], [20, 'Initié'], [35, 'Correct'], [50, 'Solide'], [65, 'Rapide'],
    [80, 'Très rapide'], [100, 'Quant'], [120, 'Élite'],
  ]
  let i = 0
  while (i + 1 < tiers.length && score >= tiers[i + 1][0]) i++
  return { name: tiers[i][1], next: tiers[i + 1]?.[0] ?? null, nextName: tiers[i + 1]?.[1] ?? null }
}

/** Recommandation d'entraînement d'après les temps par opération. */
export function weakestOp(perOp) {
  const rows = Object.entries(perOp || {}).filter(([, v]) => v.n >= 3)
  if (!rows.length) return null
  rows.sort((a, b) => b[1].ms / b[1].n - a[1].ms / a[1].n)
  return rows[0][0]
}

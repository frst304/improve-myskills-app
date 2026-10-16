import { today } from './store.js'

// ─── Niveaux ──────────────────────────────────────────────────────────
// XP cumulée pour atteindre le niveau n : 50·n·(n−1)  →  L2 = 100, L5 = 1000, L10 = 4500
export const xpForLevel = (n) => 50 * n * (n - 1)

export const TITLES = [
  [1, '∅', 'Ensemble vide'],
  [2, '𝔸', 'Axiome'],
  [4, '≝', 'Définition'],
  [6, 'ℒ', 'Lemme'],
  [9, '℘', 'Proposition'],
  [12, '∴', 'Théorème'],
  [16, '⊢', 'Corollaire'],
  [20, '∃', 'Conjecture'],
  [25, 'ℵ', 'Grand Théorème'],
  [30, '∮', 'Médaille Fields'],
  [40, 'e', "Niveau Euler"],
]

export function levelInfo(xp) {
  let level = 1
  while (xpForLevel(level + 1) <= xp) level++
  const [, symbol, title] = [...TITLES].reverse().find(([l]) => level >= l)
  const next = TITLES.find(([l]) => l > level)
  const floor = xpForLevel(level)
  const ceil = xpForLevel(level + 1)
  return {
    level, symbol, title, xp,
    into: xp - floor, span: ceil - floor,
    progress: (xp - floor) / (ceil - floor),
    nextTitle: next ? { level: next[0], title: next[2], symbol: next[1] } : null,
  }
}

// ─── Elo ──────────────────────────────────────────────────────────────
export function eloUpdate(rating, opponent, score, games) {
  const K = games < 15 ? 48 : games < 40 ? 32 : 20
  const expected = 1 / (1 + 10 ** ((opponent - rating) / 400))
  return Math.round(rating + K * (score - expected))
}

// ─── Séries ───────────────────────────────────────────────────────────
const dayShift = (d, n) => {
  const x = new Date(d + 'T12:00:00')
  x.setDate(x.getDate() + n)
  return today(x)
}

export function dailyDone(db, date) {
  const done = { chess: false, zetamac: false, code: false }
  for (const e of db.events) {
    if (e.date !== date || e.mode !== 'daily') continue
    if (e.type === 'puzzle') done.chess = true
    if (e.type === 'zetamac') done.zetamac = true
    if (e.type === 'code') done.code = true
  }
  return done
}

export function streaks(db) {
  const days = new Map()
  for (const e of db.events) {
    if (e.mode !== 'daily') continue
    const s = days.get(e.date) || new Set()
    s.add(e.type)
    days.set(e.date, s)
  }
  const run = (pred) => {
    let d = today()
    if (!pred(d)) d = dayShift(d, -1) // la série d'aujourd'hui n'est pas encore perdue
    let n = 0
    while (pred(d)) { n++; d = dayShift(d, -1) }
    return n
  }
  const any = (d) => days.has(d)
  const perfect = (d) => days.get(d)?.size === 3
  let best = 0, cur = 0
  for (const d of [...days.keys()].sort()) {
    cur = days.has(dayShift(d, -1)) ? cur + 1 : 1
    best = Math.max(best, cur)
  }
  return { current: run(any), perfect: run(perfect), best }
}

// ─── Statistiques dérivées ────────────────────────────────────────────
export function summary(db) {
  const ev = db.events
  const puzzles = ev.filter((e) => e.type === 'puzzle')
  const zetas = ev.filter((e) => e.type === 'zetamac' && e.data.preset === 'classic' && e.data.duration === 120)
  const codes = ev.filter((e) => e.type === 'code')
  const focus = ev.filter((e) => e.type === 'focus')
  const last = (arr, n) => arr.slice(-n)
  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)
  const zetaScores = zetas.map((e) => e.data.score)
  return {
    puzzles: {
      total: puzzles.length,
      solved: puzzles.filter((e) => e.data.solved).length,
      accuracy: puzzles.length ? puzzles.filter((e) => e.data.solved).length / puzzles.length : 0,
      last20: last(puzzles, 20).filter((e) => e.data.solved).length / Math.max(1, Math.min(20, puzzles.length)),
    },
    zetamac: {
      games: zetas.length,
      best: Math.max(0, ...zetaScores),
      avg5: Math.round(avg(last(zetaScores, 5))),
      allGames: ev.filter((e) => e.type === 'zetamac').length,
    },
    code: {
      attempts: codes.length,
      solved: db.solvedProblems.length,
    },
    focus: {
      minutes: Math.round(focus.reduce((a, e) => a + e.data.minutes, 0)),
      today: Math.round(focus.filter((e) => e.date === today()).reduce((a, e) => a + e.data.minutes, 0)),
      sessions: focus.length,
    },
  }
}

// ─── Succès ───────────────────────────────────────────────────────────
export const ACHIEVEMENTS = [
  { id: 'first', icon: '∅→1', name: 'Premier pas', desc: 'Termine ta première activité.', test: (s, db) => db.events.length >= 1 },
  { id: 'perfect-day', icon: '∀', name: 'Pour tout défi', desc: 'Termine les 3 défis du jour.', test: (s, db, x) => x.perfectToday },
  { id: 'streak-3', icon: 'Δ³', name: 'Série de 3', desc: '3 jours de suite avec au moins un défi.', test: (s, db, x) => x.streak.best >= 3 },
  { id: 'streak-7', icon: '7!', name: 'Une semaine', desc: '7 jours de suite.', test: (s, db, x) => x.streak.best >= 7 },
  { id: 'streak-30', icon: '∞', name: 'Habitude', desc: '30 jours de suite.', test: (s, db, x) => x.streak.best >= 30 },
  { id: 'puzzle-10', icon: '♞', name: 'Tacticien', desc: 'Résous 10 problèmes d’échecs.', test: (s) => s.puzzles.solved >= 10 },
  { id: 'puzzle-100', icon: '♛', name: 'Centurion', desc: 'Résous 100 problèmes d’échecs.', test: (s) => s.puzzles.solved >= 100 },
  { id: 'puzzle-1200', icon: '1200', name: 'Cap des 1200', desc: 'Atteins 1200 de classement puzzle.', test: (s, db) => db.ratings.puzzle.rating >= 1200 },
  { id: 'puzzle-1500', icon: '1500', name: 'Cap des 1500', desc: 'Atteins 1500 de classement puzzle.', test: (s, db) => db.ratings.puzzle.rating >= 1500 },
  { id: 'puzzle-1800', icon: '1800', name: 'Cap des 1800', desc: 'Atteins 1800 de classement puzzle.', test: (s, db) => db.ratings.puzzle.rating >= 1800 },
  { id: 'zeta-30', icon: '30', name: 'Calculateur', desc: 'Score de 30 au Zetamac classique.', test: (s) => s.zetamac.best >= 30 },
  { id: 'zeta-50', icon: '50', name: 'Boulier humain', desc: 'Score de 50 au Zetamac classique.', test: (s) => s.zetamac.best >= 50 },
  { id: 'zeta-70', icon: '70', name: 'Règle à calcul', desc: 'Score de 70 au Zetamac classique.', test: (s) => s.zetamac.best >= 70 },
  { id: 'zeta-100', icon: '10²', name: 'Ordinateur', desc: 'Score de 100 au Zetamac classique.', test: (s) => s.zetamac.best >= 100 },
  { id: 'code-1', icon: 'λ', name: 'Hello, world', desc: 'Résous ton premier exercice Python.', test: (s) => s.code.solved >= 1 },
  { id: 'code-10', icon: 'Σ', name: 'Algorithmicien', desc: 'Résous 10 exercices Python.', test: (s) => s.code.solved >= 10 },
  { id: 'code-l5', icon: 'Ω', name: 'Boss final', desc: 'Résous un exercice de niveau 5.', test: (s, db, x) => x.solvedLevels.has(5) },
  { id: 'code-all', icon: '⊨', name: 'Q.E.D.', desc: 'Résous tous les exercices.', test: (s, db, x) => db.solvedProblems.length >= x.problemCount },
  { id: 'focus-60', icon: '1h', name: 'Concentré', desc: '1 heure de focus cumulée.', test: (s) => s.focus.minutes >= 60 },
  { id: 'focus-600', icon: '10h', name: 'Moine', desc: '10 heures de focus cumulées.', test: (s) => s.focus.minutes >= 600 },
  { id: 'focus-3000', icon: '50h', name: 'Deep work', desc: '50 heures de focus cumulées.', test: (s) => s.focus.minutes >= 3000 },
  { id: 'mistakes-10', icon: '¬¬', name: 'Double négation', desc: 'Corrige 10 erreurs passées.', test: (s, db) => db.events.filter((e) => e.type === 'puzzle' && e.mode === 'mistakes' && e.data.solved).length >= 10 },
  { id: 'level-10', icon: 'X', name: 'Niveau 10', desc: 'Atteins le niveau 10.', test: (s, db) => levelInfo(db.xp).level >= 10 },
]

export function checkAchievements(db, problems) {
  const s = summary(db)
  const byId = new Map(problems.map((p) => [p.id, p]))
  const x = {
    streak: streaks(db),
    perfectToday: Object.values(dailyDone(db, today())).every(Boolean),
    solvedLevels: new Set(db.solvedProblems.map((id) => byId.get(id)?.level)),
    problemCount: problems.length,
  }
  const unlocked = []
  for (const a of ACHIEVEMENTS) {
    if (db.achievements[a.id]) continue
    if (a.test(s, db, x)) {
      db.achievements[a.id] = new Date().toISOString()
      unlocked.push({ id: a.id, icon: a.icon, name: a.name, desc: a.desc })
    }
  }
  return unlocked
}

export const publicAchievements = (db) =>
  ACHIEVEMENTS.map(({ test, ...a }) => ({ ...a, unlockedAt: db.achievements[a.id] || null }))

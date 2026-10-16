import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { load, save, replace, today } from './store.js'
import { nextPuzzle, puzzleById, lichessDaily, chesscom } from './external.js'
import { levelInfo, eloUpdate, streaks, summary, dailyDone, checkAchievements, publicAchievements, TITLES, xpForLevel } from './logic.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const PORT = Number(process.env.PORT) || 3001

const problems = JSON.parse(fs.readFileSync(path.join(ROOT, 'shared', 'problems.json'), 'utf8'))
const problemById = new Map(problems.map((p) => [p.id, p]))
const publicProblem = ({ solution, ...p }) => p

const db = load()
const app = express()
app.use(express.json({ limit: '5mb' }))

const wrap = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((err) => {
    console.error(err.message)
    res.status(err.status === 429 ? 429 : 502).json({ error: err.message })
  })

// ─── Initialisation du classement puzzle à partir de Chess.com ────────
async function seedFromChesscom() {
  if (db.ratings.puzzle.seeded) return
  try {
    const { stats } = await chesscom(db.profile.chesscomUser)
    const t = stats.tactics
    const tactics = t?.highest && t?.lowest ? (t.highest.rating + t.lowest.rating) / 2 : null
    const rapid = stats.chess_rapid?.last?.rating
    // Les classements tactiques Chess.com et puzzle Lichess sont proches à ce niveau ;
    // à défaut, on part du rapide + 500 (les puzzles sont bien plus « faciles » que les parties).
    const seed = Math.round(tactics ?? (rapid ? rapid + 500 : 1000))
    db.ratings.puzzle.rating = seed
    db.ratings.puzzle.seeded = true
    db.ratings.puzzle.history.push({ date: today(), rating: seed, seed: true })
    db.ratings.code.history.push({ date: today(), rating: db.ratings.code.rating, seed: true })
    save()
    console.log(`Classement puzzle initialisé à ${seed} (Chess.com ${db.profile.chesscomUser})`)
  } catch (e) {
    console.warn('Impossible de joindre Chess.com pour initialiser le classement :', e.message)
  }
}
seedFromChesscom()

// ─── État global ──────────────────────────────────────────────────────
function state() {
  return {
    today: today(),
    profile: db.profile,
    level: levelInfo(db.xp),
    ratings: db.ratings,
    streak: streaks(db),
    summary: summary(db),
    daily: dailyDone(db, today()),
    events: db.events,
    mistakes: db.mistakes,
    solvedProblems: db.solvedProblems,
    achievements: publicAchievements(db),
    titles: TITLES.map(([level, symbol, title]) => ({ level, symbol, title, xp: xpForLevel(level) })),
  }
}

app.get('/api/state', (req, res) => res.json(state()))

app.put('/api/profile', (req, res) => {
  const { name, chesscomUser, goals, pomodoro } = req.body
  if (typeof name === 'string') db.profile.name = name.slice(0, 40)
  if (typeof chesscomUser === 'string' && chesscomUser !== db.profile.chesscomUser) {
    db.profile.chesscomUser = chesscomUser.trim().slice(0, 40)
  }
  if (goals) db.profile.goals = { ...db.profile.goals, ...goals }
  if (pomodoro) db.profile.pomodoro = { ...db.profile.pomodoro, ...pomodoro }
  save()
  res.json(state())
})

// ─── Défis du jour ────────────────────────────────────────────────────
function pickProblem(date) {
  const target = db.ratings.code.rating + 100
  const unsolved = problems.filter((p) => !db.solvedProblems.includes(p.id))
  const pool = (unsolved.length ? unsolved : problems)
    .map((p) => ({ p, d: Math.abs(p.rating - target) }))
    .sort((a, b) => a.d - b.d)
  const best = pool.filter((x) => x.d === pool[0].d).map((x) => x.p)
  const seed = [...date].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)
  return best[seed % best.length].id
}

app.get('/api/daily', wrap(async (req, res) => {
  const date = today()
  const d = (db.daily[date] ||= {})
  if (!d.problemId) d.problemId = pickProblem(date)
  if (!d.puzzle) {
    d.puzzle = await nextPuzzle({ target: db.ratings.puzzle.rating + 50, exclude: db.seenPuzzles })
  }
  save()
  const results = db.events.filter((e) => e.date === date && e.mode === 'daily')
  res.json({
    date,
    puzzle: d.puzzle,
    problem: publicProblem(problemById.get(d.problemId)),
    done: dailyDone(db, date),
    results,
  })
}))

// ─── Échecs ───────────────────────────────────────────────────────────
app.get('/api/puzzles/next', wrap(async (req, res) => {
  const offset = Number(req.query.offset) || 0
  const target = db.ratings.puzzle.rating + offset
  res.json(await nextPuzzle({ target, angle: req.query.angle || 'mix', exclude: db.seenPuzzles }))
}))
app.get('/api/puzzles/lichess-daily', wrap(async (req, res) => res.json(await lichessDaily())))
app.get('/api/puzzles/:id', wrap(async (req, res) => res.json(await puzzleById(req.params.id))))

app.get('/api/chesscom', wrap(async (req, res) => res.json(await chesscom(req.query.user || db.profile.chesscomUser))))

// ─── Programmation ────────────────────────────────────────────────────
app.get('/api/problems', (req, res) => res.json(problems.map(publicProblem)))
app.get('/api/problems/:id/solution', (req, res) => {
  const p = problemById.get(req.params.id)
  if (!p) return res.status(404).json({ error: 'Exercice inconnu' })
  if (!db.revealedProblems.includes(p.id)) db.revealedProblems.push(p.id)
  save()
  res.json({ solution: p.solution })
})

// ─── Enregistrement d'une activité ────────────────────────────────────
app.post('/api/events', (req, res) => {
  const { type, mode = 'training', data = {} } = req.body
  if (!['puzzle', 'zetamac', 'code', 'focus'].includes(type)) return res.status(400).json({ error: 'type invalide' })
  const date = today()
  const isDaily = mode === 'daily'
  if (isDaily && type !== 'focus') {
    const kind = { puzzle: 'chess', zetamac: 'zetamac', code: 'code' }[type]
    if (dailyDone(db, date)[kind]) return res.status(409).json({ error: 'Défi du jour déjà terminé' })
  }

  let xp = 0
  const ratingChange = {}

  if (type === 'puzzle') {
    const r = db.ratings.puzzle
    const firstTime = !db.seenPuzzles.includes(data.puzzleId)
    if (firstTime && mode !== 'mistakes') {
      const before = r.rating
      r.rating = eloUpdate(r.rating, data.puzzleRating, data.solved ? (data.hint ? 0.5 : 1) : 0, r.games)
      r.games++
      r.history.push({ date, rating: r.rating })
      ratingChange.puzzle = r.rating - before
      db.seenPuzzles.push(data.puzzleId)
    }
    if (!data.solved && !db.mistakes.includes(data.puzzleId)) db.mistakes.push(data.puzzleId)
    if (data.solved && mode === 'mistakes') db.mistakes = db.mistakes.filter((id) => id !== data.puzzleId)
    xp = data.solved ? 15 + Math.max(0, Math.round((data.puzzleRating - r.rating) / 25)) : 3
  }

  if (type === 'zetamac') {
    const perMinute = data.score / Math.max(0.5, data.duration / 60)
    xp = Math.round(perMinute * 1.2)
  }

  if (type === 'code') {
    const p = problemById.get(data.problemId)
    if (!p) return res.status(400).json({ error: 'exercice inconnu' })
    const r = db.ratings.code
    const first = !db.events.some((e) => e.type === 'code' && e.data.problemId === p.id && e.data.solved)
    const revealed = db.revealedProblems.includes(p.id)
    if (first && !revealed) {
      const score = data.solved ? (data.usedHint ? 0.75 : 1) : 0
      const before = r.rating
      r.rating = eloUpdate(r.rating, p.rating, score, r.games)
      r.games++
      r.history.push({ date, rating: r.rating })
      ratingChange.code = r.rating - before
    }
    if (data.solved && !db.solvedProblems.includes(p.id)) db.solvedProblems.push(p.id)
    xp = data.solved ? (first && !revealed ? 25 * p.level : 5) : 2
  }

  if (type === 'focus') xp = Math.round(data.minutes / 2)

  if (isDaily && type !== 'focus') xp = Math.round(xp * 1.5) + 10
  db.xp += xp
  const event = { id: crypto.randomUUID(), type, mode, date, ts: Date.now(), data, xp, ratingChange }
  db.events.push(event)

  const before = levelInfo(db.xp - xp).level
  const unlocked = checkAchievements(db, problems)
  save()
  res.json({ event, xp, ratingChange, unlocked, levelUp: levelInfo(db.xp).level > before ? levelInfo(db.xp) : null, state: state() })
})

// ─── Sauvegarde ───────────────────────────────────────────────────────
app.get('/api/export', (req, res) => {
  res.setHeader('Content-Disposition', `attachment; filename="improve-myskills-${today()}.json"`)
  res.json(db)
})
app.post('/api/import', (req, res) => {
  if (!req.body?.events || !req.body?.ratings) return res.status(400).json({ error: 'fichier invalide' })
  replace(req.body)
  res.json({ ok: true })
})

// ─── Fichiers statiques (production) ──────────────────────────────────
const dist = path.join(ROOT, 'dist')
if (fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.get(/^\/(?!api).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')))
}

app.listen(PORT, () => console.log(`Improve myskills API → http://localhost:${PORT}`))

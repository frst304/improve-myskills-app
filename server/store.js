import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data')
const DB_FILE = path.join(DATA_DIR, 'db.json')

export const today = (d = new Date()) => d.toLocaleDateString('en-CA') // YYYY-MM-DD, heure locale

function fresh() {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    profile: {
      name: 'Frst',
      chesscomUser: '304frst',
      goals: { puzzle: 1400, zetamac: 60, code: 1300, focusMinutes: 60 },
      pomodoro: { focus: 25, short: 5, long: 15, cycles: 4 },
    },
    xp: 0,
    ratings: {
      puzzle: { rating: 1000, games: 0, seeded: false, history: [] },
      code: { rating: 900, games: 0, history: [] },
    },
    events: [],
    daily: {},
    mistakes: [],
    seenPuzzles: [],
    solvedProblems: [],
    revealedProblems: [],
    achievements: {},
  }
}

let db = null

export function load() {
  if (db) return db
  fs.mkdirSync(DATA_DIR, { recursive: true })
  if (fs.existsSync(DB_FILE)) {
    const base = fresh()
    const saved = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))
    db = { ...base, ...saved, profile: { ...base.profile, ...saved.profile, goals: { ...base.profile.goals, ...saved.profile?.goals } } }
  } else {
    db = fresh()
    save()
  }
  return db
}

export function save() {
  const tmp = DB_FILE + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(db, null, 1))
  fs.renameSync(tmp, DB_FILE)
}

// Remplace le contenu en place : les modules qui tiennent une référence à `db` restent à jour.
export function replace(next) {
  const merged = { ...fresh(), ...next }
  for (const k of Object.keys(db)) delete db[k]
  Object.assign(db, merged)
  save()
}

// Accès aux API publiques de Lichess et Chess.com (aucune clé nécessaire).
const UA = 'improve-myskills-app/1.0 (local training dashboard)'

async function getJSON(url) {
  const r = await fetch(url, { headers: { Accept: 'application/json', 'User-Agent': UA } })
  if (r.status === 429) throw Object.assign(new Error('Lichess limite les requêtes, réessaie dans une minute.'), { status: 429 })
  if (!r.ok) throw Object.assign(new Error(`${url} → HTTP ${r.status}`), { status: r.status })
  return r.json()
}

// Lichess : la difficulté anonyme est relative à 1500.
const DIFFICULTIES = { easiest: -600, easier: -300, normal: 0, harder: 300, hardest: 600 }

export function difficultyFor(target) {
  let best = 'normal'
  for (const [k, off] of Object.entries(DIFFICULTIES))
    if (Math.abs(1500 + off - target) < Math.abs(1500 + DIFFICULTIES[best] - target)) best = k
  return best
}

function normalize(raw) {
  const { game, puzzle } = raw
  return {
    id: puzzle.id,
    rating: puzzle.rating,
    plays: puzzle.plays,
    themes: puzzle.themes,
    solution: puzzle.solution,
    initialPly: puzzle.initialPly,
    pgn: game.pgn,
    gameId: game.id,
    players: game.players?.map((p) => ({ name: p.name, rating: p.rating, color: p.color })),
    url: `https://lichess.org/training/${puzzle.id}`,
  }
}

/** Puzzle proche de `target` : on en tire deux et on garde le plus proche de la cible. */
export async function nextPuzzle({ target = 1200, angle = 'mix', exclude = [] } = {}) {
  const url = new URL('https://lichess.org/api/puzzle/next')
  url.searchParams.set('difficulty', difficultyFor(target))
  if (angle && angle !== 'mix') url.searchParams.set('angle', angle)
  const results = await Promise.allSettled([getJSON(url), getJSON(url)])
  const ok = results.filter((r) => r.status === 'fulfilled').map((r) => normalize(r.value))
  if (!ok.length) throw results[0].reason
  const fresh = ok.filter((p) => !exclude.includes(p.id))
  const pool = fresh.length ? fresh : ok
  return pool.sort((a, b) => Math.abs(a.rating - target) - Math.abs(b.rating - target))[0]
}

export const puzzleById = async (id) => normalize(await getJSON(`https://lichess.org/api/puzzle/${encodeURIComponent(id)}`))
export const lichessDaily = async () => normalize(await getJSON('https://lichess.org/api/puzzle/daily'))

const ccCache = new Map()
export async function chesscom(user) {
  const key = user.toLowerCase()
  const hit = ccCache.get(key)
  if (hit && Date.now() - hit.at < 10 * 60_000) return hit.data
  const base = `https://api.chess.com/pub/player/${encodeURIComponent(key)}`
  const [profile, stats] = await Promise.all([getJSON(base), getJSON(`${base}/stats`)])
  const data = { profile, stats, fetchedAt: new Date().toISOString() }
  ccCache.set(key, { at: Date.now(), data })
  return data
}

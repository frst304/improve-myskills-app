// Estimation de la force de jeu à partir de Chess.com + du classement puzzle interne.
//
// Conversions approximatives (régressions publiques Chess.com ↔ Lichess, 2023-2025) :
//   Lichess rapide ≈ 0,675 × Chess.com rapide + 780
//   FIDE (indicatif) ≈ 0,62 × Chess.com rapide + 800
// Écart puzzle → partie à ce niveau : le classement puzzle dépasse d'environ 550 points
// le classement rapide Chess.com (les puzzles indiquent qu'il y a « un coup à trouver »).
const PUZZLE_GAP = 550

export function estimateElo(cc, puzzleRating) {
  const s = cc?.stats || {}
  const rapid = s.chess_rapid?.last
  const blitz = s.chess_blitz?.last
  const games = (r) => (r ? r.win + r.loss + r.draw : 0)
  const rapidGames = games(s.chess_rapid?.record)
  const fromPuzzle = puzzleRating - PUZZLE_GAP

  // Poids de Chess.com : fort si beaucoup de parties et RD faible, sinon on s'appuie sur les puzzles.
  let wCC = 0
  if (rapid) wCC = Math.min(0.8, rapidGames / (rapidGames + 25)) * (rapid.rd ? Math.min(1, 80 / rapid.rd) : 0.7)
  const blended = rapid ? wCC * rapid.rating + (1 - wCC) * fromPuzzle : fromPuzzle
  const est = Math.round(blended / 5) * 5
  const spread = Math.round((rapid?.rd ? Math.max(40, rapid.rd) : 120) * (1 - wCC / 2))

  const tactics = s.tactics?.highest && s.tactics?.lowest ? Math.round((s.tactics.highest.rating + s.tactics.lowest.rating) / 2) : null

  return {
    chesscom: est,
    low: est - spread,
    high: est + spread,
    lichess: Math.round((0.675 * est + 780) / 5) * 5,
    fide: Math.round((0.62 * est + 800) / 5) * 5,
    fromPuzzle,
    weightChesscom: wCC,
    rapid: rapid?.rating ?? null,
    rapidRd: rapid?.rd ?? null,
    rapidBest: s.chess_rapid?.best?.rating ?? null,
    rapidRecord: s.chess_rapid?.record ?? null,
    blitz: blitz?.rating ?? null,
    bullet: s.chess_bullet?.last?.rating ?? null,
    tactics,
    tacticsHigh: s.tactics?.highest?.rating ?? null,
  }
}

/** Palier suivant pour donner un objectif concret. */
export function nextMilestone(rating) {
  const steps = [600, 800, 1000, 1200, 1400, 1600, 1800, 2000, 2200]
  return steps.find((s) => s > rating) ?? rating + 200
}

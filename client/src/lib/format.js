export const fmtDate = (iso, opts = { weekday: 'long', day: 'numeric', month: 'long' }) =>
  new Date(iso.length === 10 ? iso + 'T12:00:00' : iso).toLocaleDateString('fr-FR', opts)

export const fmtShort = (iso) => fmtDate(iso, { day: 'numeric', month: 'short' })

export function fmtDuration(ms) {
  const s = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(s / 60)
  return m ? `${m} min ${String(s % 60).padStart(2, '0')} s` : `${s} s`
}

export function fmtClock(ms, { tenths = false } = {}) {
  const neg = ms < 0
  ms = Math.abs(ms)
  const total = tenths ? Math.floor(ms / 100) : Math.ceil(ms / 1000)
  const sec = tenths ? Math.floor(total / 10) : total
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  const pad = (n) => String(n).padStart(2, '0')
  let out = h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
  if (tenths) out += `.${total % 10}`
  return (neg ? '−' : '') + out
}

export const fmtMinutes = (min) => {
  const h = Math.floor(min / 60)
  return h ? `${h} h ${String(Math.round(min % 60)).padStart(2, '0')}` : `${Math.round(min)} min`
}

export const signed = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '±0')

export const greeting = () => {
  const h = new Date().getHours()
  return h < 5 ? 'Bonne nuit' : h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir'
}

export const THEMES_FR = {
  mix: 'Mélange', mateIn1: 'Mat en 1', mateIn2: 'Mat en 2', mateIn3: 'Mat en 3', mate: 'Mat',
  fork: 'Fourchette', pin: 'Clouage', skewer: 'Enfilade', hangingPiece: 'Pièce en prise',
  discoveredAttack: 'Attaque à la découverte', doubleCheck: 'Échec double', sacrifice: 'Sacrifice',
  deflection: 'Déviation', attraction: 'Attraction', backRankMate: 'Mat du couloir', trappedPiece: 'Pièce piégée',
  endgame: 'Finale', middlegame: 'Milieu de jeu', opening: 'Ouverture', short: 'Court', long: 'Long',
  oneMove: 'Un coup', advantage: 'Avantage', crushing: 'Écrasant', equality: 'Égalité', mateIn4: 'Mat en 4',
  kingsideAttack: 'Attaque côté roi', queensideAttack: 'Attaque côté dame', defensiveMove: 'Coup défensif',
  quietMove: 'Coup tranquille', xRayAttack: 'Rayons X', zugzwang: 'Zugzwang', promotion: 'Promotion',
  advancedPawn: 'Pion avancé', clearance: 'Dégagement', interference: 'Interférence', intermezzo: 'Coup intermédiaire',
  capturingDefender: 'Élimination du défenseur', exposedKing: 'Roi exposé', rookEndgame: 'Finale de tours',
  pawnEndgame: 'Finale de pions', queenEndgame: 'Finale de dames', bishopEndgame: 'Finale de fous',
  knightEndgame: 'Finale de cavaliers', master: 'Partie de maître', veryLong: 'Très long', smotheredMate: 'Mat à l’étouffée',
  anastasiaMate: 'Mat d’Anastasia', arabianMate: 'Mat arabe', hookMate: 'Mat du crochet', bodenMate: 'Mat de Boden',
  dovetailMate: 'Mat en queue d’aronde', castling: 'Roque', enPassant: 'En passant', underPromotion: 'Sous-promotion',
  attackingF2F7: 'Attaque f2/f7', masterVsMaster: 'Maître contre maître', superGM: 'Super GM',
}
export const themeFr = (t) => THEMES_FR[t] || t.replace(/([A-Z])/g, ' $1').toLowerCase()

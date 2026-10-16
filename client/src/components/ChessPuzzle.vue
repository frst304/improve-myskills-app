<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { Chess } from 'chess.js'
import { Chessground } from 'chessground'
import 'chessground/assets/chessground.base.css'
import 'chessground/assets/chessground.cburnett.css'
import { themeFr } from '../lib/format.js'
import { sounds } from '../lib/sound.js'

const props = defineProps({
  puzzle: { type: Object, required: true },
  label: { type: String, default: '' },
  nextLabel: { type: String, default: '' },
})
const emit = defineEmits(['result', 'next'])

const boardEl = ref(null)
const status = ref('intro') // intro | play | wrong | solved | solvedAfter | revealed
const playerColor = ref('white')
const hintLevel = ref(0) // étape d'indice pour le coup en cours
const hintUsed = ref(false)
const elapsed = ref(0)
const moveList = ref([])

let cg = null
let chess = null
let step = 0
let failed = false
let reported = false
let t0 = 0
let clock = null
let timers = []
const later = (fn, ms) => timers.push(setTimeout(fn, ms))

const turnName = computed(() => (playerColor.value === 'white' ? 'les Blancs' : 'les Noirs'))
const finished = computed(() => ['solved', 'solvedAfter', 'revealed'].includes(status.value))

function dests() {
  const map = new Map()
  for (const m of chess.moves({ verbose: true })) {
    if (!map.has(m.from)) map.set(m.from, [])
    map.get(m.from).push(m.to)
  }
  return map
}

function sync(lastMove) {
  const turn = chess.turn() === 'w' ? 'white' : 'black'
  const canMove = !finished.value && status.value !== 'intro' && turn === playerColor.value
  cg.set({
    fen: chess.fen(),
    turnColor: turn,
    lastMove,
    check: chess.inCheck() ? turn : false,
    movable: { color: canMove ? playerColor.value : undefined, dests: canMove ? dests() : new Map() },
  })
}

function applyUci(uci) {
  const m = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] })
  moveList.value.push(m.san)
  sync([m.from, m.to])
  return m
}

function report(solved) {
  if (reported) return
  reported = true
  clearInterval(clock)
  emit('result', { solved, hint: hintUsed.value, timeMs: Date.now() - t0 })
}

function onUserMove(orig, dest) {
  const expected = props.puzzle.solution[step]
  const piece = chess.get(orig)
  let promotion
  if (piece?.type === 'p' && (dest[1] === '8' || dest[1] === '1'))
    promotion = expected.startsWith(orig + dest) && expected[4] ? expected[4] : 'q'
  const uci = orig + dest + (promotion || '')
  const m = chess.move({ from: orig, to: dest, promotion })
  const mate = chess.isCheckmate()

  if (uci === expected || mate) {
    moveList.value.push(m.san)
    step++
    cg.setAutoShapes([])
    hintLevel.value = 0
    if (status.value === 'wrong') status.value = 'play'
    if (step >= props.puzzle.solution.length || mate) return win()
    sounds.good()
    sync([orig, dest])
    later(() => {
      applyUci(props.puzzle.solution[step])
      step++
      if (step >= props.puzzle.solution.length) win()
      else sync(cg.state.lastMove)
    }, 420)
  } else {
    chess.undo()
    sounds.bad()
    status.value = 'wrong'
    if (!failed) {
      failed = true
      report(false)
    }
    // montre le coup joué un instant, puis revient à la position
    cg.set({ movable: { color: undefined, dests: new Map() } })
    later(() => sync(cg.state.lastMove), 450)
  }
}

function win() {
  status.value = failed ? 'solvedAfter' : 'solved'
  if (!failed) sounds.chime()
  sync(cg.state.lastMove)
  report(!failed)
}

function hint() {
  if (finished.value) return
  hintLevel.value = Math.min(2, hintLevel.value + 1)
  hintUsed.value = true
  const uci = props.puzzle.solution[step]
  const shapes = [{ orig: uci.slice(0, 2), brush: 'green' }]
  if (hintLevel.value === 2) shapes[0] = { orig: uci.slice(0, 2), dest: uci.slice(2, 4), brush: 'green' }
  cg.setAutoShapes(shapes)
}

function reveal() {
  if (finished.value) return
  if (!failed) { failed = true; report(false) }
  status.value = 'revealed'
  cg.setAutoShapes([])
  const play = () => {
    if (step >= props.puzzle.solution.length) return sync(cg.state.lastMove)
    applyUci(props.puzzle.solution[step])
    step++
    later(play, 750)
  }
  play()
}

function setup() {
  timers.forEach(clearTimeout)
  timers = []
  clearInterval(clock)
  step = 0
  failed = false
  reported = false
  hintLevel.value = 0
  hintUsed.value = false
  moveList.value = []
  status.value = 'intro'

  chess = new Chess()
  const sans = props.puzzle.pgn.trim().split(/\s+/)
  for (const san of sans.slice(0, -1)) chess.move(san)
  // après le dernier coup de l'adversaire, c'est au joueur : sa couleur est l'inverse du trait actuel
  playerColor.value = chess.turn() === 'w' ? 'black' : 'white'

  const config = {
    fen: chess.fen(),
    orientation: playerColor.value,
    coordinates: true,
    animation: { enabled: true, duration: 230 },
    highlight: { lastMove: true, check: true },
    movable: { free: false, showDests: true, color: undefined, events: { after: onUserMove } },
    premovable: { enabled: false },
    draggable: { showGhost: true },
    drawable: { enabled: true },
  }
  if (cg) cg.set(config)
  else cg = Chessground(boardEl.value, config)
  cg.setAutoShapes([])

  later(() => {
    const m = chess.move(sans.at(-1))
    status.value = 'play'
    sync([m.from, m.to])
    t0 = Date.now()
    elapsed.value = 0
    clock = setInterval(() => (elapsed.value = Date.now() - t0), 1000)
  }, 700)
}

let ro = null
onMounted(() => {
  setup()
  ro = new ResizeObserver(() => cg?.redrawAll())
  ro.observe(boardEl.value)
})
onBeforeUnmount(() => {
  timers.forEach(clearTimeout)
  clearInterval(clock)
  ro?.disconnect()
  cg?.destroy()
})
watch(() => props.puzzle.id, () => nextTick(setup))

defineExpose({ hint, reveal })
</script>

<template>
  <div class="puzzle">
    <div class="board-wrap">
      <div ref="boardEl" class="board"></div>
    </div>

    <div class="panel card ticks">
      <div class="eyebrow"><span class="idx">♟</span> {{ label || 'Problème' }}</div>

      <div class="status" :class="status">
        <template v-if="status === 'intro'"><span class="pulse">Le dernier coup adverse arrive…</span></template>
        <template v-else-if="status === 'play'">
          <span class="turn" :class="playerColor"></span>
          <div><strong>À toi de jouer</strong><br /><span class="dim">Trouve le meilleur coup pour {{ turnName }}.</span></div>
        </template>
        <template v-else-if="status === 'wrong'">
          <span class="ico bad">✕</span>
          <div><strong>Ce n'est pas le coup</strong><br /><span class="dim">Réessaie — le résultat est compté comme raté.</span></div>
        </template>
        <template v-else-if="status === 'solved'">
          <span class="ico good">✓</span>
          <div><strong>Résolu !</strong><br /><span class="dim">Sans erreur{{ hintUsed ? ', avec indice' : '' }} en {{ Math.round(elapsed / 1000) }} s.</span></div>
        </template>
        <template v-else-if="status === 'solvedAfter'">
          <span class="ico warn">≈</span>
          <div><strong>Trouvé, après une erreur</strong><br /><span class="dim">Le puzzle est ajouté à ton carnet d'erreurs.</span></div>
        </template>
        <template v-else>
          <span class="ico">∴</span>
          <div><strong>Solution affichée</strong><br /><span class="dim">Rejoue-la de tête, puis passe au suivant.</span></div>
        </template>
      </div>

      <div class="meta">
        <div><span class="k">Classement</span><span class="v mono">{{ puzzle.rating }}</span></div>
        <div><span class="k">Temps</span><span class="v mono">{{ Math.floor(elapsed / 60000) }}:{{ String(Math.floor(elapsed / 1000) % 60).padStart(2, '0') }}</span></div>
        <div><span class="k">Coups</span><span class="v mono">{{ Math.ceil(puzzle.solution.length / 2) }}</span></div>
      </div>

      <div v-if="moveList.length" class="moves mono">
        <span v-for="(m, i) in moveList" :key="i">{{ m }}</span>
      </div>

      <div v-if="finished" class="themes">
        <span v-for="t in puzzle.themes" :key="t" class="chip">{{ themeFr(t) }}</span>
      </div>

      <div class="actions">
        <template v-if="!finished">
          <button class="btn" :disabled="status === 'intro'" @click="hint">
            {{ hintLevel === 0 ? 'Indice' : hintLevel === 1 ? 'Montrer le coup' : 'Indice affiché' }}
          </button>
          <button class="btn ghost" :disabled="status === 'intro'" @click="reveal">Voir la solution</button>
        </template>
        <button v-if="finished && nextLabel" class="btn primary" @click="emit('next')">{{ nextLabel }} →</button>
        <a class="btn ghost sm" :href="puzzle.url" target="_blank" rel="noopener">Lichess ↗</a>
      </div>
      <p v-if="puzzle.players?.length" class="game muted">
        Partie : {{ puzzle.players.map((p) => `${p.name} (${p.rating})`).join(' — ') }}
      </p>
    </div>
  </div>
</template>

<style scoped>
.puzzle { display: grid; grid-template-columns: minmax(0, 620px) minmax(260px, 1fr); gap: 20px; align-items: start; }
.board-wrap { padding: 10px; border-radius: 14px; background: var(--surface); border: 1px solid var(--line); box-shadow: var(--shadow); }
.board { width: 100%; aspect-ratio: 1 / 1; }
.panel { display: flex; flex-direction: column; gap: 16px; }
.status { display: flex; gap: 12px; align-items: center; padding: 14px; border-radius: 12px; background: var(--bg-2); border: 1px solid var(--line); min-height: 72px; }
.status.solved { border-color: rgba(12, 163, 12, 0.45); }
.status.wrong { border-color: rgba(230, 103, 103, 0.45); }
.turn { width: 22px; height: 22px; border-radius: 6px; border: 1px solid var(--line-3); flex: none; }
.turn.white { background: #eceef4; }
.turn.black { background: #111; }
.ico { width: 30px; height: 30px; flex: none; border-radius: 8px; display: grid; place-items: center; font-weight: 700; background: var(--surface-3); }
.ico.good { color: var(--good-text); background: rgba(12, 163, 12, 0.15); }
.ico.bad { color: var(--bad); background: rgba(230, 103, 103, 0.12); }
.ico.warn { color: var(--warn); background: rgba(250, 178, 25, 0.1); }
.meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
.meta > div { padding: 10px 12px; border-radius: 10px; border: 1px solid var(--line); display: flex; flex-direction: column; }
.k { font-size: 11px; color: var(--muted); }
.v { font-size: 17px; font-weight: 600; }
.moves { display: flex; flex-wrap: wrap; gap: 6px; font-size: 12.5px; }
.moves span { padding: 2px 7px; border-radius: 6px; background: var(--surface-3); }
.moves span:nth-child(even) { color: var(--muted); }
.themes { display: flex; flex-wrap: wrap; gap: 6px; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; }
.game { font-size: 12px; margin: 0; }
@media (max-width: 1100px) { .puzzle { grid-template-columns: 1fr; } .board-wrap { max-width: 620px; } }
</style>

<style>
/* Thème d'échiquier : ardoise froide, cohérent avec l'interface */
.cg-wrap cg-board { background-color: #c3cad8; background-image: url('../assets/board.svg'); border-radius: 6px; }
.cg-wrap cg-board square.last-move { background-color: rgba(144, 133, 233, 0.42); }
.cg-wrap cg-board square.selected { background-color: rgba(57, 135, 229, 0.5); }
.cg-wrap cg-board square.move-dest { background: radial-gradient(rgba(17, 19, 25, 0.38) 20%, rgba(0, 0, 0, 0) 22%); }
.cg-wrap cg-board square.oc.move-dest { background: radial-gradient(transparent 0%, transparent 78%, rgba(17, 19, 25, 0.38) 80%); }
.cg-wrap cg-board square.move-dest:hover { background: rgba(57, 135, 229, 0.35); }
.cg-wrap cg-board square.check { background: radial-gradient(ellipse at center, rgba(230, 103, 103, 1) 0%, rgba(230, 103, 103, 0.6) 30%, rgba(230, 103, 103, 0) 80%); }
.cg-wrap coords coord { color: rgba(17, 19, 25, 0.7) !important; font-family: var(--mono); font-size: 10px; font-weight: 700; }
.cg-wrap coords.files coord { text-transform: lowercase; }
</style>

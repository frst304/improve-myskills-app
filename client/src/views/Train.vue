<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, store, record, toast, loadProblems } from '../lib/store.js'
import { themeFr } from '../lib/format.js'
import { PRESETS, OP_LABEL, zetaLevel } from '../lib/zetamac.js'
import ChessPuzzle from '../components/ChessPuzzle.vue'
import ZetamacGame from '../components/ZetamacGame.vue'
import CodeChallenge from '../components/CodeChallenge.vue'

const route = useRoute()
const router = useRouter()
const tab = ref(['chess', 'math', 'code'].includes(route.query.tab) ? route.query.tab : 'chess')
watch(tab, (t) => router.replace({ query: { tab: t } }))
const s = computed(() => store.state)

/* ───────────── Échecs ───────────── */
const ANGLES = ['mix', 'mateIn1', 'mateIn2', 'fork', 'pin', 'skewer', 'hangingPiece', 'discoveredAttack', 'backRankMate', 'sacrifice', 'deflection', 'trappedPiece', 'endgame', 'opening', 'middlegame']
const DIFFS = [
  { off: -250, label: 'Facile' },
  { off: 0, label: 'Adapté' },
  { off: 200, label: 'Défi' },
  { off: 400, label: 'Difficile' },
]
const chessMode = ref('train') // train | mistakes | lichess
const angle = ref(ANGLES.includes(route.query.angle) ? route.query.angle : 'mix')
const offset = ref(0)
const puzzle = ref(null)
const loadingPuzzle = ref(false)
const puzzleError = ref(null)
const session = ref({ n: 0, ok: 0, streak: 0 })
let prefetch = null
let mistakeIdx = 0

const fetchNext = () => api.get(`/api/puzzles/next?offset=${offset.value}&angle=${angle.value}`)

async function loadPuzzle() {
  loadingPuzzle.value = true
  puzzleError.value = null
  try {
    if (chessMode.value === 'lichess') puzzle.value = await api.get('/api/puzzles/lichess-daily')
    else if (chessMode.value === 'mistakes') {
      const list = s.value.mistakes
      if (!list.length) { puzzle.value = null; return }
      puzzle.value = await api.get(`/api/puzzles/${list[mistakeIdx % list.length]}`)
      mistakeIdx++
    } else {
      puzzle.value = await (prefetch || fetchNext())
      prefetch = null
      prefetch = fetchNext()
      prefetch.catch(() => (prefetch = null))
    }
  } catch (e) {
    puzzleError.value = e.message
    prefetch = null
  } finally {
    loadingPuzzle.value = false
  }
}
watch([angle, offset, chessMode], () => { prefetch = null; mistakeIdx = 0; loadPuzzle() })

async function onPuzzle(r) {
  session.value.n++
  if (r.solved) { session.value.ok++; session.value.streak++ } else session.value.streak = 0
  const mode = chessMode.value === 'mistakes' ? 'mistakes' : 'training'
  try {
    await record('puzzle', mode, { puzzleId: puzzle.value.id, puzzleRating: puzzle.value.rating, themes: puzzle.value.themes, ...r })
    if (mode === 'mistakes' && r.solved) mistakeIdx = Math.max(0, mistakeIdx - 1)
  } catch (e) { toast({ title: 'Erreur', body: e.message }) }
}

/* ───────────── Calcul ───────────── */
const preset = ref('classic')
const duration = ref(120)
const classicOps = ref(['add', 'sub', 'mul', 'div'])
const gameKey = ref(0)
const zetaPlaying = ref(false)
const bests = computed(() => {
  const out = {}
  for (const e of s.value.events) if (e.type === 'zetamac') {
    const k = `${e.data.preset}:${e.data.duration}`
    out[k] = Math.max(out[k] || 0, e.data.score)
  }
  return out
})
const best = computed(() => (preset.value === 'classic' && classicOps.value.length < 4 ? 0 : bests.value[`${preset.value}:${duration.value}`] || 0))
const lastWeak = computed(() => {
  const z = [...s.value.events].reverse().find((e) => e.type === 'zetamac' && e.data.perOp)
  if (!z) return null
  const rows = Object.entries(z.data.perOp).filter(([, v]) => v.n >= 3).sort((a, b) => b[1].ms / b[1].n - a[1].ms / a[1].n)
  return rows[0]?.[0] || null
})
function toggleOp(op) {
  const i = classicOps.value.indexOf(op)
  if (i >= 0 && classicOps.value.length > 1) classicOps.value.splice(i, 1)
  else if (i < 0) classicOps.value.push(op)
}
function startZeta() { gameKey.value++; zetaPlaying.value = true }
async function onZeta(r) {
  const data = { ...r, preset: preset.value === 'classic' && classicOps.value.length < 4 ? 'classic-custom' : r.preset, ops: classicOps.value }
  try { await record('zetamac', 'training', data) } catch (e) { toast({ title: 'Erreur', body: e.message }) }
}

/* ───────────── Python ───────────── */
const problems = ref([])
const current = ref(null)
const levelFilter = ref(0)
onMounted(async () => { problems.value = await loadProblems() })
const solved = computed(() => new Set(s.value.solvedProblems))
const grouped = computed(() => {
  const g = {}
  for (const p of problems.value) if (!levelFilter.value || p.level === levelFilter.value) (g[p.level] ||= []).push(p)
  return g
})
function adapted() {
  const target = s.value.ratings.code.rating + 100
  const pool = problems.value.filter((p) => !solved.value.has(p.id) && p.id !== current.value?.id)
  const list = pool.length ? pool : problems.value
  return [...list].sort((a, b) => Math.abs(a.rating - target) - Math.abs(b.rating - target) || Math.random() - 0.5)[0]
}
const openProblem = (p) => { current.value = p; window.scrollTo({ top: 0 }) }
async function onCode(r) {
  const p = current.value
  try { await record('code', 'training', { problemId: p.id, title: p.title, level: p.level, ...r }) } catch (e) { toast({ title: 'Erreur', body: e.message }) }
}
const LEVEL = ['', 'Échauffement', 'Classique', 'Intermédiaire', 'Avancé', 'Expert']

onMounted(() => { if (tab.value === 'chess') loadPuzzle() })
watch(tab, (t) => { if (t === 'chess' && !puzzle.value) loadPuzzle() })
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <div class="eyebrow"><span class="idx">∇</span> Entraînement libre</div>
        <h1>Le gradient de ta progression.</h1>
        <p>Exercices illimités, calibrés sur ton niveau actuel. Chaque séance compte pour ton XP et tes classements.</p>
      </div>
      <div class="seg big">
        <button :class="{ on: tab === 'chess' }" @click="tab = 'chess'">♞ Échecs</button>
        <button :class="{ on: tab === 'math' }" @click="tab = 'math'">± Calcul</button>
        <button :class="{ on: tab === 'code' }" @click="tab = 'code'">λ Python</button>
      </div>
    </div>

    <!-- ═════ ÉCHECS ═════ -->
    <section v-if="tab === 'chess'">
      <div class="toolbar card flat">
        <div class="seg">
          <button :class="{ on: chessMode === 'train' }" @click="chessMode = 'train'">Puzzles adaptés</button>
          <button :class="{ on: chessMode === 'mistakes' }" @click="chessMode = 'mistakes'">Carnet d'erreurs <span class="mono">({{ s.mistakes.length }})</span></button>
          <button :class="{ on: chessMode === 'lichess' }" @click="chessMode = 'lichess'">Puzzle Lichess du jour</button>
        </div>
        <template v-if="chessMode === 'train'">
          <select v-model="angle" class="input" aria-label="Thème">
            <option v-for="a in ANGLES" :key="a" :value="a">{{ themeFr(a) }}</option>
          </select>
          <div class="seg">
            <button v-for="d in DIFFS" :key="d.off" :class="{ on: offset === d.off }" @click="offset = d.off">{{ d.label }}</button>
          </div>
        </template>
        <span class="spacer"></span>
        <span class="mono muted small">
          cible ≈ {{ s.ratings.puzzle.rating + (chessMode === 'train' ? offset : 0) }} · séance {{ session.ok }}/{{ session.n }}
          <template v-if="session.streak > 1"> · série {{ session.streak }} 🔥</template>
        </span>
      </div>

      <div v-if="puzzleError" class="card empty">
        {{ puzzleError }}
        <div style="margin-top: 12px"><button class="btn" @click="loadPuzzle">Réessayer</button></div>
      </div>
      <div v-else-if="chessMode === 'mistakes' && !s.mistakes.length" class="card empty">
        Ton carnet d'erreurs est vide. Chaque puzzle raté y est ajouté automatiquement ; le réussir l'en retire.
      </div>
      <div v-else-if="!puzzle" class="card empty pulse">Recherche d'un puzzle sur Lichess…</div>
      <ChessPuzzle
        v-else
        :puzzle="puzzle"
        :label="chessMode === 'mistakes' ? 'Carnet d’erreurs' : chessMode === 'lichess' ? 'Puzzle officiel Lichess' : `Entraînement · ${themeFr(angle)}`"
        :next-label="chessMode === 'lichess' ? '' : loadingPuzzle ? 'Chargement…' : 'Puzzle suivant'"
        @result="onPuzzle"
        @next="loadPuzzle"
      />
    </section>

    <!-- ═════ CALCUL ═════ -->
    <section v-else-if="tab === 'math'">
      <div v-if="!zetaPlaying" class="grid presets">
        <button v-for="(p, k) in PRESETS" :key="k" class="card preset" :class="{ on: preset === k }" @click="preset = k">
          <div class="row between">
            <span class="p-name">{{ p.name }}</span>
            <span v-if="bests[`${k}:${duration}`]" class="mono muted small">record {{ bests[`${k}:${duration}`] }}</span>
          </div>
          <p class="muted">{{ p.desc }}</p>
        </button>
      </div>

      <div v-if="!zetaPlaying" class="card flat config">
        <div class="row wrap">
          <span class="muted small">Durée</span>
          <div class="seg">
            <button v-for="d in [30, 60, 120, 180]" :key="d" :class="{ on: duration === d }" @click="duration = d">{{ d }} s</button>
          </div>
          <template v-if="preset === 'classic'">
            <span class="muted small" style="margin-left: 12px">Opérations</span>
            <div class="seg">
              <button v-for="op in ['add', 'sub', 'mul', 'div']" :key="op" :class="{ on: classicOps.includes(op) }" @click="toggleOp(op)">{{ OP_LABEL[op] }}</button>
            </div>
          </template>
          <span class="spacer"></span>
          <button class="btn primary" @click="startZeta">Lancer ▸</button>
        </div>
        <p v-if="lastWeak" class="muted small tip">
          D'après ta dernière partie, ton opération la plus lente est <b>{{ OP_LABEL[lastWeak] }}</b>.
          <template v-if="['mul', 'div'].includes(lastWeak)"> Essaie le mode « Tables & divisions ».</template>
          <template v-else-if="['add', 'sub'].includes(lastWeak)"> Essaie le mode « Additions & soustractions ».</template>
        </p>
        <p class="muted small tip">
          Ton niveau Zetamac : <b>{{ zetaLevel(s.summary.zetamac.avg5).name }}</b>
          <template v-if="zetaLevel(s.summary.zetamac.avg5).next"> — prochain palier « {{ zetaLevel(s.summary.zetamac.avg5).nextName }} » à {{ zetaLevel(s.summary.zetamac.avg5).next }} de moyenne.</template>
        </p>
      </div>

      <div v-if="zetaPlaying">
        <button class="btn ghost sm" style="margin-bottom: 12px" @click="zetaPlaying = false">← Modes</button>
        <ZetamacGame :key="gameKey" autostart :preset="preset" :duration="duration" :ops="preset === 'classic' ? classicOps : null" :best="best" @finish="onZeta" />
      </div>
    </section>

    <!-- ═════ PYTHON ═════ -->
    <section v-else>
      <template v-if="current">
        <div class="row" style="margin-bottom: 12px">
          <button class="btn ghost sm" @click="current = null">← Tous les exercices</button>
          <span class="spacer"></span>
          <button class="btn sm code" @click="openProblem(adapted())">Exercice adapté suivant →</button>
        </div>
        <CodeChallenge :problem="current" label="Entraînement Python" :solved-before="solved.has(current.id)" @result="onCode" @next="openProblem(adapted())" />
      </template>
      <template v-else>
        <div class="toolbar card flat">
          <div class="seg">
            <button :class="{ on: levelFilter === 0 }" @click="levelFilter = 0">Tous</button>
            <button v-for="l in 5" :key="l" :class="{ on: levelFilter === l }" @click="levelFilter = l">Niv. {{ l }}</button>
          </div>
          <span class="spacer"></span>
          <span class="mono muted small">{{ solved.size }}/{{ problems.length }} résolus · classement {{ s.ratings.code.rating }}</span>
          <button class="btn code" :disabled="!problems.length" @click="openProblem(adapted())">Exercice adapté à mon niveau</button>
        </div>
        <div v-for="(list, lvl) in grouped" :key="lvl" class="level-block">
          <div class="eyebrow"><span class="idx">N{{ lvl }}</span> {{ LEVEL[lvl] }} · {{ list[0].rating }}</div>
          <div class="grid plist">
            <button v-for="p in list" :key="p.id" class="card pcard" :class="{ solved: solved.has(p.id) }" @click="openProblem(p)">
              <div class="row between">
                <span class="p-name">{{ p.title }}</span>
                <span v-if="solved.has(p.id)" class="chip good">✓</span>
              </div>
              <div class="row wrap" style="gap: 4px; margin-top: 8px">
                <span v-for="t in p.tags" :key="t" class="chip">{{ t }}</span>
              </div>
            </button>
          </div>
        </div>
      </template>
    </section>
  </div>
</template>

<style scoped>
.seg.big button { padding: 7px 16px; font-size: 14px; }
.toolbar { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 16px; padding: 12px; }
.small { font-size: 12px; }
.presets { grid-template-columns: repeat(3, 1fr); margin-bottom: 16px; }
.preset { text-align: left; cursor: pointer; color: var(--text); transition: border-color 0.15s; }
.preset:hover { border-color: var(--line-3); }
.preset.on { border-color: color-mix(in srgb, var(--math) 70%, transparent); background: color-mix(in srgb, var(--math) 7%, var(--surface)); }
.preset p { margin: 6px 0 0; font-size: 12.5px; }
.p-name { font-weight: 600; }
.config { padding: 14px; }
.tip { margin: 12px 0 0; }
.tip b { color: var(--text); }
.level-block { margin-bottom: 24px; }
.plist { grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); margin-top: 10px; }
.pcard { text-align: left; cursor: pointer; color: var(--text); padding: 16px; transition: border-color 0.15s, transform 0.15s; }
.pcard:hover { border-color: color-mix(in srgb, var(--code) 55%, transparent); transform: translateY(-1px); }
.pcard.solved { opacity: 0.72; }
@media (max-width: 900px) { .presets { grid-template-columns: 1fr; } }
</style>

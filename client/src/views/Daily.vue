<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api, store, record, toast } from '../lib/store.js'
import { fmtDate, fmtDuration } from '../lib/format.js'
import ChessPuzzle from '../components/ChessPuzzle.vue'
import ZetamacGame from '../components/ZetamacGame.vue'
import CodeChallenge from '../components/CodeChallenge.vue'

const route = useRoute()
const router = useRouter()
const tab = ref(['chess', 'math', 'code'].includes(route.query.tab) ? route.query.tab : null)
const daily = ref(null)
const error = ref(null)
const playing = ref({ chess: false, math: false, code: false })

async function load() {
  try {
    daily.value = await api.get('/api/daily')
    error.value = null
    if (!tab.value) tab.value = ['chess', 'math', 'code'].find((k) => !done.value[k]) || 'chess'
  } catch (e) {
    error.value = e.message
  }
}
onMounted(load)
watch(tab, (t) => router.replace({ query: { tab: t } }))

const done = computed(() => {
  const d = store.state.daily
  return { chess: d.chess, math: d.zetamac, code: d.code }
})
const result = (type) => daily.value?.results.find((e) => e.type === type) || store.state.events.find((e) => e.type === type && e.mode === 'daily' && e.date === daily.value?.date)
const count = computed(() => Object.values(done.value).filter(Boolean).length)

async function save(type, data, key) {
  // à marquer avant l'enregistrement : sinon le composant serait démonté dès que l'état passe à « fait »
  playing.value[key] = true
  try {
    await record(type, 'daily', data)
    if (count.value === 3) toast({ kind: 'achievement', title: 'Journée parfaite', body: 'Les 3 défis sont faits. À demain !', icon: '∀' })
  } catch (e) {
    toast({ kind: 'xp', title: 'Erreur', body: e.message })
  }
}

const onPuzzle = (r) => save('puzzle', { puzzleId: daily.value.puzzle.id, puzzleRating: daily.value.puzzle.rating, themes: daily.value.puzzle.themes, ...r }, 'chess')
const onZeta = (r) => save('zetamac', r, 'math')
const onCode = (r) => save('code', { problemId: daily.value.problem.id, title: daily.value.problem.title, level: daily.value.problem.level, ...r }, 'code')

const TABS = [
  { key: 'chess', sym: '♞', label: 'Échecs' },
  { key: 'math', sym: '±', label: 'Zetamac' },
  { key: 'code', sym: 'λ', label: 'Python' },
]
const nextTab = () => TABS.find((t) => !done.value[t.key])?.key
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <div class="eyebrow"><span class="idx">∂</span> Défis du jour · {{ fmtDate(store.state.today) }}</div>
        <h1>Trois défis, un jour, zéro excuse.</h1>
        <p>Un puzzle Lichess calibré sur ton classement, un Zetamac de 120 s et un exercice d'algorithmie. Les défis rapportent ×1,5 XP.</p>
      </div>
      <div class="progress-pill mono">
        <span v-for="t in TABS" :key="t.key" class="pp" :class="[t.key, { on: done[t.key] }]"></span>
        <span>{{ count }}/3</span>
      </div>
    </div>

    <div class="tabs">
      <button v-for="t in TABS" :key="t.key" class="tab" :class="[t.key, { on: tab === t.key }]" @click="tab = t.key">
        <span class="serif sym">{{ t.sym }}</span>
        <span>{{ t.label }}</span>
        <span v-if="done[t.key]" class="ok">✓</span>
      </button>
    </div>

    <div v-if="error" class="card empty">
      Impossible de charger les défis : {{ error }}
      <div style="margin-top: 12px"><button class="btn" @click="load">Réessayer</button></div>
    </div>
    <div v-else-if="!daily" class="card empty pulse">Préparation des défis…</div>

    <template v-else>
      <!-- ÉCHECS -->
      <section v-show="tab === 'chess'">
        <div v-if="done.chess && !playing.chess" class="card done-card">
          <span class="big-ok">{{ result('puzzle')?.data.solved ? '✓' : '✕' }}</span>
          <div>
            <h2>Puzzle du jour {{ result('puzzle')?.data.solved ? 'résolu' : 'raté' }}</h2>
            <p class="dim">
              Classement du puzzle {{ result('puzzle')?.data.puzzleRating }} · {{ fmtDuration(result('puzzle')?.data.timeMs || 0) }}
              <template v-if="result('puzzle')?.ratingChange?.puzzle != null"> · Elo {{ result('puzzle').ratingChange.puzzle >= 0 ? '+' : '' }}{{ result('puzzle').ratingChange.puzzle }}</template>
            </p>
          </div>
          <div class="spacer"></div>
          <button class="btn" @click="playing.chess = true">Revoir</button>
          <router-link to="/train?tab=chess" class="btn chess">S'entraîner</router-link>
        </div>
        <ChessPuzzle v-else :puzzle="daily.puzzle" label="Défi d'échecs du jour" :next-label="nextTab() ? 'Défi suivant' : ''" @result="(r) => !done.chess && onPuzzle(r)" @next="tab = nextTab()" />
      </section>

      <!-- ZETAMAC -->
      <section v-show="tab === 'math'">
        <div v-if="done.math && !playing.math" class="card done-card">
          <span class="big-ok mono">{{ result('zetamac')?.data.score }}</span>
          <div>
            <h2>Zetamac du jour terminé</h2>
            <p class="dim">{{ result('zetamac')?.data.score }} bonnes réponses en 120 s · {{ ((result('zetamac')?.data.avgMs || 0) / 1000).toFixed(2) }} s par calcul</p>
          </div>
          <div class="spacer"></div>
          <router-link to="/train?tab=math" class="btn math">S'entraîner</router-link>
        </div>
        <ZetamacGame v-else daily preset="classic" :duration="120" :best="store.state.summary.zetamac.best" @finish="(r) => !done.math && onZeta(r)">
          <template #after>
            <button v-if="nextTab()" class="btn primary" @click="tab = nextTab()">Défi suivant →</button>
          </template>
        </ZetamacGame>
      </section>

      <!-- PYTHON -->
      <section v-show="tab === 'code'">
        <div v-if="done.code && !playing.code" class="card done-card">
          <span class="big-ok">{{ result('code')?.data.solved ? '∎' : '✕' }}</span>
          <div>
            <h2>{{ daily.problem.title }} — {{ result('code')?.data.solved ? 'résolu' : 'abandonné' }}</h2>
            <p class="dim">{{ result('code')?.data.attempts }} essai(s) · {{ fmtDuration(result('code')?.data.timeMs || 0) }}</p>
          </div>
          <div class="spacer"></div>
          <button class="btn" @click="playing.code = true">Revoir</button>
          <router-link to="/train?tab=code" class="btn code">S'entraîner</router-link>
        </div>
        <CodeChallenge
          v-else
          :problem="daily.problem"
          label="Défi Python du jour"
          :solved-before="store.state.solvedProblems.includes(daily.problem.id)"
          @result="(r) => !done.code && onCode(r)"
          @next="router.push('/train?tab=code')"
        />
      </section>
    </template>
  </div>
</template>

<style scoped>
.progress-pill { display: flex; align-items: center; gap: 6px; padding: 8px 14px; border: 1px solid var(--line-2); border-radius: 999px; background: var(--surface); }
.pp { width: 22px; height: 6px; border-radius: 3px; background: var(--surface-3); }
.pp.on.chess { background: var(--chess); } .pp.on.math { background: var(--math); } .pp.on.code { background: var(--code); }
.tabs { display: flex; gap: 8px; margin-bottom: 18px; flex-wrap: wrap; }
.tab { display: flex; align-items: center; gap: 10px; padding: 10px 18px; border-radius: 12px; border: 1px solid var(--line); background: var(--surface); color: var(--text-2); cursor: pointer; font-weight: 500; }
.tab .sym { font-size: 18px; color: var(--c); }
.tab.chess { --c: var(--chess); } .tab.math { --c: var(--math); } .tab.code { --c: var(--code); }
.tab:hover { color: var(--text); border-color: var(--line-2); }
.tab.on { color: var(--text); border-color: color-mix(in srgb, var(--c) 60%, transparent); background: color-mix(in srgb, var(--c) 10%, var(--surface)); }
.ok { color: var(--good-text); font-weight: 700; }
.done-card { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; }
.done-card h2 { font-size: 18px; }
.done-card p { margin: 4px 0 0; }
.big-ok { width: 64px; height: 64px; border-radius: 16px; display: grid; place-items: center; font-size: 28px; font-weight: 700; background: var(--bg-2); border: 1px solid var(--line-2); color: var(--accent-2); }
</style>

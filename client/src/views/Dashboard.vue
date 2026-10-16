<script setup>
import { computed, ref, onMounted } from 'vue'
import { store, api } from '../lib/store.js'
import { fmtDate, fmtShort, greeting, fmtMinutes, signed } from '../lib/format.js'
import { theoremOfDay } from '../lib/theorems.js'
import { estimateElo } from '../lib/elo.js'
import { zetaLevel } from '../lib/zetamac.js'
import MathText from '../components/MathText.vue'
import LineChart from '../components/LineChart.vue'
import ActivityHeatmap from '../components/ActivityHeatmap.vue'
import GoalRing from '../components/GoalRing.vue'

const s = computed(() => store.state)
const thm = theoremOfDay()
const cc = ref(null)
onMounted(async () => { try { cc.value = await api.get('/api/chesscom') } catch { /* hors ligne */ } })

const elo = computed(() => estimateElo(cc.value, s.value.ratings.puzzle.rating))

const zetaEvents = computed(() => s.value.events.filter((e) => e.type === 'zetamac' && e.data.preset === 'classic' && e.data.duration === 120))
const deltaSince = (hist, days) => {
  if (!hist.length) return 0
  const cut = new Date(Date.now() - days * 86400000).toLocaleDateString('en-CA')
  const base = [...hist].reverse().find((h) => h.date < cut) || hist[0]
  return hist.at(-1).rating - base.rating
}

const tiles = computed(() => {
  const r = s.value.ratings
  const z = s.value.summary.zetamac
  return [
    { key: 'chess', label: 'Puzzle (échecs)', value: r.puzzle.rating, delta: deltaSince(r.puzzle.history, 7), sub: `${s.value.summary.puzzles.solved} résolus · ${Math.round(s.value.summary.puzzles.accuracy * 100)} % réussite` },
    { key: 'math', label: 'Zetamac (moy. 5)', value: z.avg5 || '—', delta: null, sub: z.games ? `record ${z.best} · ${zetaLevel(z.avg5).name}` : 'aucune partie classique' },
    { key: 'code', label: 'Algo Python', value: r.code.rating, delta: deltaSince(r.code.history, 7), sub: `${s.value.summary.code.solved} exercices résolus` },
    { key: 'accent', label: 'Elo estimé (Chess.com)', value: cc.value ? elo.value.chesscom : '…', delta: null, sub: cc.value ? `≈ ${elo.value.lichess} Lichess · ${elo.value.low}–${elo.value.high}` : 'chargement Chess.com…' },
  ]
})

const chartTab = ref('chess')
const chart = computed(() => {
  const st = s.value
  const g = st.profile.goals
  if (chartTab.value === 'chess')
    return { color: 'var(--chess)', goal: g.puzzle, points: st.ratings.puzzle.history.map((h, i) => ({ x: h.date, y: h.rating, label: `${fmtShort(h.date)} · point ${i + 1}` })) }
  if (chartTab.value === 'math')
    return { color: 'var(--math)', goal: g.zetamac, points: zetaEvents.value.map((e) => ({ x: e.date, y: e.data.score, label: `${fmtShort(e.date)}${e.mode === 'daily' ? ' · défi' : ''}` })) }
  if (chartTab.value === 'code')
    return { color: 'var(--code)', goal: g.code, points: st.ratings.code.history.map((h, i) => ({ x: h.date, y: h.rating, label: `${fmtShort(h.date)} · point ${i + 1}` })) }
  const days = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toLocaleDateString('en-CA')
    days.push({ x: d, y: Math.round(st.events.filter((e) => e.type === 'focus' && e.date === d).reduce((a, e) => a + e.data.minutes, 0)) })
  }
  return { color: 'var(--accent)', goal: g.focusMinutes, points: days, unit: ' min' }
})

const dailyCards = computed(() => [
  { key: 'chess', title: 'Problème d’échecs', sym: '♞', desc: 'Un puzzle Lichess à ta mesure', done: s.value.daily.chess },
  { key: 'math', title: 'Zetamac 120 s', sym: '±', desc: 'Calcul mental, réglages classiques', done: s.value.daily.zetamac },
  { key: 'code', title: 'Algorithme Python', sym: 'λ', desc: 'Un exercice maths + code', done: s.value.daily.code },
])
const doneCount = computed(() => dailyCards.value.filter((c) => c.done).length)

const recent = computed(() => [...s.value.events].reverse().slice(0, 7))
const describe = (e) => {
  const d = e.data
  if (e.type === 'puzzle') return { sym: '♞', c: 'chess', t: `Puzzle ${d.puzzleRating} — ${d.solved ? 'résolu' : 'raté'}` }
  if (e.type === 'zetamac') return { sym: '±', c: 'math', t: `Zetamac ${d.score} pts (${d.duration} s)` }
  if (e.type === 'code') return { sym: 'λ', c: 'code', t: `${d.title || d.problemId} — ${d.solved ? 'résolu' : 'abandon'}` }
  return { sym: 'τ', c: 'accent', t: `Focus ${fmtMinutes(d.minutes)} · ${d.label}` }
}
</script>

<template>
  <div class="page">
    <!-- en-tête -->
    <section class="hero grid">
      <div class="card ticks hello rise">
        <div class="eyebrow"><span class="idx">§0</span> {{ fmtDate(s.today) }}</div>
        <h1>{{ greeting() }}, {{ s.profile.name }}.</h1>
        <p class="lead">
          <template v-if="doneCount === 3">Les trois défis du jour sont faits. ∎ Un peu d'entraînement libre ?</template>
          <template v-else>Il te reste <b>{{ 3 - doneCount }}</b> défi{{ 3 - doneCount > 1 ? 's' : '' }} aujourd'hui. Une petite marche chaque jour : <MathText inline text="$\lim_{n\to\infty} 1{,}01^n = \infty$" />.</template>
        </p>
        <div class="hero-stats">
          <div><span class="hs-v mono">{{ s.streak.current }}<small> j</small></span><span class="hs-k">série en cours</span></div>
          <div><span class="hs-v mono">{{ s.streak.perfect }}<small> j</small></span><span class="hs-k">série parfaite (3/3)</span></div>
          <div><span class="hs-v mono">{{ fmtMinutes(s.summary.focus.today) }}</span><span class="hs-k">focus aujourd'hui</span></div>
          <div><span class="hs-v mono">{{ s.level.xp }}</span><span class="hs-k">XP totale</span></div>
        </div>
      </div>
      <div class="card ticks thm rise" style="animation-delay: 60ms">
        <div class="eyebrow"><span class="idx">∴</span> Formule du jour</div>
        <div class="thm-name">{{ thm.name }}</div>
        <MathText :text="`$$${thm.tex}$$`" />
        <p class="muted thm-note">{{ thm.note }}</p>
      </div>
    </section>

    <!-- défis du jour -->
    <section class="section">
      <div class="sec-head">
        <div class="eyebrow"><span class="idx">§1</span> Défis du jour</div>
        <router-link to="/daily" class="btn sm">Ouvrir les défis →</router-link>
      </div>
      <div class="grid daily">
        <router-link v-for="(c, i) in dailyCards" :key="c.key" :to="`/daily?tab=${c.key}`" class="card dcard rise" :class="[c.key, { done: c.done }]" :style="{ animationDelay: `${80 + i * 40}ms` }">
          <span class="dsym serif">{{ c.sym }}</span>
          <div class="dbody">
            <div class="dtitle">{{ c.title }}</div>
            <div class="muted">{{ c.desc }}</div>
          </div>
          <span class="chip" :class="c.done ? 'good' : ''">{{ c.done ? '✓ fait' : 'à faire' }}</span>
        </router-link>
      </div>
    </section>

    <!-- tuiles -->
    <section class="section grid tiles">
      <div v-for="t in tiles" :key="t.key" class="card tile" :class="t.key">
        <div class="tile-k"><i></i>{{ t.label }}</div>
        <div class="row" style="align-items: baseline; gap: 10px">
          <span class="tile-v mono">{{ t.value }}</span>
          <span v-if="t.delta" class="mono delta" :class="t.delta > 0 ? 'up' : 'down'">{{ signed(t.delta) }} <small>7 j</small></span>
        </div>
        <div class="tile-s muted">{{ t.sub }}</div>
      </div>
    </section>

    <!-- courbes + objectifs -->
    <section class="section grid two">
      <div class="card">
        <div class="card-head">
          <div>
            <div class="card-title">Évolution</div>
            <div class="muted small">
              {{ { chess: 'Classement puzzle (Elo)', math: 'Score Zetamac classique — 120 s', code: 'Classement algorithmique', focus: 'Minutes de focus — 14 derniers jours' }[chartTab] }}
            </div>
          </div>
          <div class="seg">
            <button :class="{ on: chartTab === 'chess' }" @click="chartTab = 'chess'">Échecs</button>
            <button :class="{ on: chartTab === 'math' }" @click="chartTab = 'math'">Calcul</button>
            <button :class="{ on: chartTab === 'code' }" @click="chartTab = 'code'">Python</button>
            <button :class="{ on: chartTab === 'focus' }" @click="chartTab = 'focus'">Focus</button>
          </div>
        </div>
        <LineChart :points="chart.points" :color="chart.color" :goal="chart.goal" :unit="chart.unit || ''" :x-format="fmtShort" :height="240" empty-text="Fais ton premier défi pour voir la courbe" />
      </div>
      <div class="card">
        <div class="card-head">
          <span class="card-title">Objectifs</span>
          <router-link to="/profile" class="btn sm ghost">Modifier</router-link>
        </div>
        <div class="stack goals">
          <GoalRing :value="s.ratings.puzzle.rating" :goal="s.profile.goals.puzzle" color="var(--chess)" label="Puzzle" :sub="`${s.ratings.puzzle.rating} / ${s.profile.goals.puzzle}`" />
          <GoalRing :value="s.summary.zetamac.avg5" :goal="s.profile.goals.zetamac" color="var(--math)" label="Zetamac (moy. 5)" :sub="`${s.summary.zetamac.avg5} / ${s.profile.goals.zetamac}`" />
          <GoalRing :value="s.ratings.code.rating" :goal="s.profile.goals.code" color="var(--code)" label="Algo Python" :sub="`${s.ratings.code.rating} / ${s.profile.goals.code}`" />
          <GoalRing :value="s.summary.focus.today" :goal="s.profile.goals.focusMinutes" color="var(--accent)" label="Focus du jour" :sub="`${s.summary.focus.today} / ${s.profile.goals.focusMinutes} min`" />
        </div>
      </div>
    </section>

    <!-- activité -->
    <section class="section grid two">
      <div class="card">
        <div class="card-head"><span class="card-title">Activité — 26 semaines</span><span class="muted small mono">record de série : {{ s.streak.best }} j</span></div>
        <ActivityHeatmap :events="s.events" />
      </div>
      <div class="card">
        <div class="card-head"><span class="card-title">Récemment</span></div>
        <div v-if="!recent.length" class="empty">Rien pour l'instant. Commence par les défis du jour ↑</div>
        <div v-else class="recent">
          <div v-for="e in recent" :key="e.id" class="rec">
            <span class="rec-sym serif" :class="describe(e).c">{{ describe(e).sym }}</span>
            <span class="rec-t">{{ describe(e).t }}</span>
            <span class="mono muted rec-xp">+{{ e.xp }}</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.section { margin-top: 28px; }
.sec-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.hero { grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr); }
.hello h1 { margin: 10px 0 8px; font-size: 32px; }
.lead { color: var(--text-2); margin: 0; max-width: 620px; }
.lead b { color: var(--text); }
.hero-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; margin-top: 22px; background: var(--line); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }
.hero-stats > div { background: var(--surface); padding: 12px 14px; display: flex; flex-direction: column; gap: 2px; }
.hs-v { font-size: 22px; font-weight: 700; }
.hs-v small { font-size: 12px; color: var(--muted); font-weight: 500; }
.hs-k { font-size: 11.5px; color: var(--muted); }
.thm { display: flex; flex-direction: column; }
.thm-name { font-weight: 600; margin-top: 10px; }
.thm :deep(.katex-display) { margin: 18px 0 10px; font-size: 1.15em; }
.thm-note { margin: auto 0 0; font-size: 12.5px; }

.daily { grid-template-columns: repeat(3, 1fr); }
.dcard { display: flex; align-items: center; gap: 14px; color: var(--text); text-decoration: none !important; transition: border-color 0.2s, transform 0.2s; }
.dcard:hover { border-color: color-mix(in srgb, var(--c) 55%, transparent); transform: translateY(-1px); }
.dcard.chess { --c: var(--chess); } .dcard.math { --c: var(--math); } .dcard.code { --c: var(--code); }
.dsym { width: 46px; height: 46px; border-radius: 12px; display: grid; place-items: center; font-size: 24px; flex: none; color: var(--c); background: color-mix(in srgb, var(--c) 12%, var(--bg-2)); border: 1px solid color-mix(in srgb, var(--c) 35%, transparent); }
.dcard.done .dsym { opacity: 0.6; }
.dbody { flex: 1; min-width: 0; }
.dtitle { font-weight: 600; }
.dbody .muted { font-size: 12.5px; }

.tiles { grid-template-columns: repeat(4, 1fr); }
.tile.chess { --c: var(--chess); } .tile.math { --c: var(--math); } .tile.code { --c: var(--code); } .tile.accent { --c: var(--accent); }
.tile-k { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--text-2); }
.tile-k i { width: 8px; height: 8px; border-radius: 2px; background: var(--c); }
.tile-v { font-size: 34px; font-weight: 700; letter-spacing: -0.02em; margin-top: 6px; }
.tile-s { font-size: 12px; margin-top: 2px; }
.delta { font-size: 13px; font-weight: 600; }
.delta small { color: var(--muted); font-weight: 400; }
.delta.up { color: var(--good-text); }
.delta.down { color: var(--bad); }

.two { grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); }
.small { font-size: 12px; }
.goals { gap: 14px; }
.recent { display: flex; flex-direction: column; }
.rec { display: flex; align-items: center; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--line); font-size: 13px; }
.rec:last-child { border-bottom: 0; }
.rec-sym { width: 26px; height: 26px; border-radius: 7px; display: grid; place-items: center; background: var(--bg-2); border: 1px solid var(--line); }
.rec-sym.chess { color: var(--chess); } .rec-sym.math { color: var(--math); } .rec-sym.code { color: var(--code); } .rec-sym.accent { color: var(--accent); }
.rec-t { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.rec-xp { font-size: 12px; }

@media (max-width: 1100px) {
  .hero, .two { grid-template-columns: 1fr; }
  .tiles { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 700px) {
  .daily, .tiles { grid-template-columns: 1fr; }
  .hero-stats { grid-template-columns: repeat(2, 1fr); }
}
</style>

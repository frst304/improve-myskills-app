<script setup>
import { computed } from 'vue'
import { store } from '../lib/store.js'
import { fmtShort, fmtDate, themeFr, fmtMinutes } from '../lib/format.js'
import { PRESETS } from '../lib/zetamac.js'
import LineChart from '../components/LineChart.vue'

const s = computed(() => store.state)
const unlocked = computed(() => s.value.achievements.filter((a) => a.unlockedAt).length)

const series = computed(() => ({
  puzzle: s.value.ratings.puzzle.history.map((h) => ({ x: h.date, y: h.rating })),
  zeta: s.value.events.filter((e) => e.type === 'zetamac' && e.data.preset === 'classic' && e.data.duration === 120).map((e) => ({ x: e.date, y: e.data.score })),
  code: s.value.ratings.code.history.map((h) => ({ x: h.date, y: h.rating })),
}))

// Réussite par thème tactique : les thèmes les plus faibles d'abord
const themes = computed(() => {
  const m = {}
  for (const e of s.value.events) {
    if (e.type !== 'puzzle' || !e.data.themes) continue
    for (const t of e.data.themes) {
      if (['short', 'long', 'veryLong', 'oneMove', 'advantage', 'crushing', 'equality', 'master', 'masterVsMaster', 'superGM'].includes(t)) continue
      m[t] ||= { n: 0, ok: 0 }
      m[t].n++
      if (e.data.solved) m[t].ok++
    }
  }
  return Object.entries(m)
    .filter(([, v]) => v.n >= 2)
    .map(([t, v]) => ({ t, ...v, rate: v.ok / v.n }))
    .sort((a, b) => a.rate - b.rate || b.n - a.n)
    .slice(0, 10)
})

const records = computed(() => {
  const out = []
  for (const [k, p] of Object.entries(PRESETS)) {
    for (const d of [30, 60, 120, 180]) {
      const ev = s.value.events.filter((e) => e.type === 'zetamac' && e.data.preset === k && e.data.duration === d)
      if (ev.length) out.push({ name: p.name, d, best: Math.max(...ev.map((e) => e.data.score)), n: ev.length })
    }
  }
  return out
})

const focusByLabel = computed(() => {
  const m = {}
  for (const e of s.value.events) if (e.type === 'focus') m[e.data.label] = (m[e.data.label] || 0) + e.data.minutes
  const total = Object.values(m).reduce((a, b) => a + b, 0) || 1
  return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([label, min]) => ({ label, min, pct: min / total }))
})
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <div class="eyebrow"><span class="idx">∫</span> Progression</div>
        <h1>L'intégrale de tes efforts.</h1>
        <p>Niveaux, succès, records et points faibles. Ce que tu mesures, tu l'améliores.</p>
      </div>
    </div>

    <!-- Niveau -->
    <section class="card ticks levelcard">
      <div class="lv-left">
        <span class="lv-sym serif">{{ s.level.symbol }}</span>
        <div>
          <div class="eyebrow">Niveau {{ s.level.level }}</div>
          <h2 class="lv-title">{{ s.level.title }}</h2>
          <div class="muted mono small">{{ s.level.xp }} XP · encore {{ s.level.span - s.level.into }} XP avant le niveau {{ s.level.level + 1 }}</div>
        </div>
      </div>
      <div class="bar big"><i :style="{ width: `${s.level.progress * 100}%` }"></i></div>
      <div class="roadmap">
        <div v-for="t in s.titles" :key="t.level" class="rm" :class="{ reached: s.level.level >= t.level, current: s.level.symbol === t.symbol }">
          <span class="rm-sym serif">{{ t.symbol }}</span>
          <span class="rm-t">{{ t.title }}</span>
          <span class="rm-l mono">niv. {{ t.level }}</span>
        </div>
      </div>
      <p class="muted small xp-rules">
        Barème XP : puzzle réussi 15 + bonus de difficulté · Zetamac ≈ 1,2 × réponses/min · exercice Python 25 × niveau · focus 1 XP / 2 min ·
        défis du jour ×1,5 + 10.
      </p>
    </section>

    <!-- Courbes (petits multiples) -->
    <section class="grid three section">
      <div class="card">
        <div class="card-title">Puzzle (Elo)</div>
        <LineChart :points="series.puzzle" color="var(--chess)" :height="170" :x-format="fmtShort" />
      </div>
      <div class="card">
        <div class="card-title">Zetamac classique</div>
        <LineChart :points="series.zeta" color="var(--math)" :height="170" :x-format="fmtShort" />
      </div>
      <div class="card">
        <div class="card-title">Algo Python (Elo)</div>
        <LineChart :points="series.code" color="var(--code)" :height="170" :x-format="fmtShort" />
      </div>
    </section>

    <!-- Analyse -->
    <section class="grid three section">
      <div class="card">
        <div class="card-head"><span class="card-title">Thèmes tactiques à travailler</span></div>
        <div v-if="!themes.length" class="empty small">Résous quelques puzzles pour voir tes points faibles par thème.</div>
        <div v-for="t in themes" :key="t.t" class="th-row">
          <router-link :to="`/train?tab=chess&angle=${t.t}`" class="th-name" title="S'entraîner sur ce thème">{{ themeFr(t.t) }}</router-link>
          <div class="bar th-bar"><i :style="{ width: `${t.rate * 100}%`, '--c': 'var(--chess)' }"></i></div>
          <span class="mono small muted">{{ t.ok }}/{{ t.n }}</span>
        </div>
      </div>
      <div class="card">
        <div class="card-head"><span class="card-title">Records Zetamac</span></div>
        <div v-if="!records.length" class="empty small">Aucune partie jouée.</div>
        <table v-else class="tbl">
          <thead><tr><th>Mode</th><th>Durée</th><th>Record</th><th>Parties</th></tr></thead>
          <tbody>
            <tr v-for="r in records" :key="r.name + r.d"><td>{{ r.name }}</td><td class="mono">{{ r.d }} s</td><td class="mono strong">{{ r.best }}</td><td class="mono muted">{{ r.n }}</td></tr>
          </tbody>
        </table>
      </div>
      <div class="card">
        <div class="card-head"><span class="card-title">Focus par sujet</span><span class="mono muted small">{{ fmtMinutes(s.summary.focus.minutes) }}</span></div>
        <div v-if="!focusByLabel.length" class="empty small">Lance un pomodoro dans l'onglet Focus.</div>
        <div v-for="f in focusByLabel" :key="f.label" class="th-row">
          <span class="th-name">{{ f.label }}</span>
          <div class="bar th-bar"><i :style="{ width: `${f.pct * 100}%` }"></i></div>
          <span class="mono small muted">{{ fmtMinutes(f.min) }}</span>
        </div>
      </div>
    </section>

    <!-- Succès -->
    <section class="section">
      <div class="sec-head">
        <div class="eyebrow"><span class="idx">★</span> Succès · {{ unlocked }}/{{ s.achievements.length }}</div>
      </div>
      <div class="grid ach">
        <div v-for="a in s.achievements" :key="a.id" class="card ach-card" :class="{ on: a.unlockedAt }">
          <span class="ach-ico serif">{{ a.icon }}</span>
          <div>
            <div class="ach-name">{{ a.name }}</div>
            <div class="muted small">{{ a.desc }}</div>
            <div v-if="a.unlockedAt" class="mono small date">{{ fmtDate(a.unlockedAt, { day: 'numeric', month: 'short', year: 'numeric' }) }}</div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.section { margin-top: 20px; }
.sec-head { margin-bottom: 12px; }
.small { font-size: 12px; }
.levelcard { display: flex; flex-direction: column; gap: 18px; }
.lv-left { display: flex; gap: 18px; align-items: center; }
.lv-sym { width: 72px; height: 72px; border-radius: 18px; display: grid; place-items: center; font-size: 40px; background: var(--bg-2); border: 1px solid var(--line-2); color: var(--accent-2); box-shadow: 0 0 40px -10px rgba(144, 133, 233, 0.5); }
.lv-title { font-size: 26px; margin: 2px 0 4px; }
.bar.big { height: 8px; }
.roadmap { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 8px; }
.rm { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 10px 6px; border-radius: 10px; border: 1px solid var(--line); opacity: 0.45; text-align: center; }
.rm.reached { opacity: 1; }
.rm.current { border-color: var(--accent); background: rgba(144, 133, 233, 0.08); }
.rm-sym { font-size: 20px; color: var(--accent-2); }
.rm-t { font-size: 12px; font-weight: 600; }
.rm-l { font-size: 10.5px; color: var(--muted); }
.xp-rules { margin: 0; }
.three { grid-template-columns: repeat(3, 1fr); }
.card-title { margin-bottom: 10px; }
.th-row { display: grid; grid-template-columns: 130px 1fr auto; gap: 10px; align-items: center; padding: 6px 0; }
.th-name { font-size: 13px; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.th-bar { height: 6px; }
.tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.tbl th { text-align: left; font-weight: 500; color: var(--muted); font-size: 11.5px; padding: 6px 0; border-bottom: 1px solid var(--line-2); }
.tbl td { padding: 7px 0; border-bottom: 1px solid var(--line); font-variant-numeric: tabular-nums; }
.strong { font-weight: 700; }
.ach { grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); }
.ach-card { display: flex; gap: 14px; align-items: center; padding: 14px; opacity: 0.45; filter: grayscale(1); }
.ach-card.on { opacity: 1; filter: none; border-color: rgba(250, 178, 25, 0.3); }
.ach-ico { min-width: 46px; height: 46px; padding: 0 6px; border-radius: 12px; display: grid; place-items: center; font-size: 17px; font-weight: 600; background: var(--bg-2); border: 1px solid var(--line-2); color: var(--warn); }
.ach-name { font-weight: 600; }
.date { color: var(--warn); margin-top: 2px; }
@media (max-width: 1100px) { .three { grid-template-columns: 1fr; } }
</style>

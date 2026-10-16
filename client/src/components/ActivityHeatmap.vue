<script setup>
// Calendrier d'activité (XP par jour), rampe séquentielle mono-teinte.
import { computed, ref } from 'vue'
import { fmtDate } from '../lib/format.js'

const props = defineProps({ events: { type: Array, required: true }, weeks: { type: Number, default: 26 } })
const hover = ref(null)

const iso = (d) => d.toLocaleDateString('en-CA')

const data = computed(() => {
  const byDay = new Map()
  for (const e of props.events) {
    const d = byDay.get(e.date) || { xp: 0, types: new Set(), n: 0 }
    d.xp += e.xp
    d.n++
    d.types.add(e.type)
    byDay.set(e.date, d)
  }
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  const dow = (today.getDay() + 6) % 7 // lundi = 0
  const start = new Date(today)
  start.setDate(today.getDate() - dow - (props.weeks - 1) * 7)
  const cols = []
  const months = []
  for (let w = 0; w < props.weeks; w++) {
    const col = []
    for (let r = 0; r < 7; r++) {
      const d = new Date(start)
      d.setDate(start.getDate() + w * 7 + r)
      const key = iso(d)
      col.push({ key, future: d > today, ...(byDay.get(key) || { xp: 0, n: 0, types: new Set() }) })
      if (r === 0 && d.getDate() <= 7) months.push({ w, text: d.toLocaleDateString('fr-FR', { month: 'short' }) })
    }
    cols.push(col)
  }
  const max = Math.max(1, ...[...byDay.values()].map((d) => d.xp))
  return { cols, months, max }
})

const level = (xp) => (xp <= 0 ? 0 : Math.min(4, 1 + Math.floor((xp / data.value.max) * 3.999)))
const LABEL = { puzzle: 'échecs', zetamac: 'calcul', code: 'python', focus: 'focus' }
</script>

<template>
  <div class="hm">
    <div class="months mono">
      <span v-for="m in data.months" :key="m.w" :style="{ gridColumn: m.w + 1 }">{{ m.text }}</span>
    </div>
    <div class="grid-hm" :style="{ gridTemplateColumns: `repeat(${weeks}, 1fr)` }">
      <div v-for="(col, w) in data.cols" :key="w" class="col">
        <div
          v-for="d in col"
          :key="d.key"
          class="cell"
          :class="[`l${level(d.xp)}`, { future: d.future }]"
          @mouseenter="hover = d"
          @mouseleave="hover = null"
        ></div>
      </div>
    </div>
    <div class="foot">
      <span class="info muted">
        <template v-if="hover">
          <b>{{ fmtDate(hover.key, { weekday: 'short', day: 'numeric', month: 'short' }) }}</b> —
          {{ hover.xp }} XP<template v-if="hover.n"> · {{ [...hover.types].map((t) => LABEL[t]).join(', ') }}</template>
        </template>
        <template v-else>Survole un jour pour le détail</template>
      </span>
      <span class="legend muted">moins <i class="cell l0"></i><i class="cell l1"></i><i class="cell l2"></i><i class="cell l3"></i><i class="cell l4"></i> plus</span>
    </div>
  </div>
</template>

<style scoped>
.hm { width: 100%; }
.months { display: grid; grid-template-columns: repeat(v-bind(weeks), 1fr); font-size: 10.5px; color: var(--muted); margin-bottom: 6px; height: 14px; }
.grid-hm { display: grid; gap: 3px; }
.col { display: grid; grid-template-rows: repeat(7, 1fr); gap: 3px; }
.cell { aspect-ratio: 1; border-radius: 3px; background: var(--surface-3); display: block; }
.cell.l1 { background: color-mix(in srgb, var(--accent) 28%, var(--surface-3)); }
.cell.l2 { background: color-mix(in srgb, var(--accent) 52%, var(--surface-3)); }
.cell.l3 { background: color-mix(in srgb, var(--accent) 76%, var(--surface-3)); }
.cell.l4 { background: var(--accent-2); }
.cell.future { opacity: 0.25; }
.grid-hm .cell:hover { outline: 1px solid var(--text-2); }
.foot { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; font-size: 12px; gap: 12px; flex-wrap: wrap; }
.legend { display: inline-flex; align-items: center; gap: 3px; }
.legend .cell { width: 10px; height: 10px; }
.info b { color: var(--text); font-weight: 600; }
</style>

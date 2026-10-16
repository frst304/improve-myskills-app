<script setup>
// Courbe mono-série en SVG : ligne 2px, grille discrète, réticule + infobulle au survol.
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  points: { type: Array, required: true }, // [{ x: 'YYYY-MM-DD' | label, y: number, label? }]
  color: { type: String, default: 'var(--accent)' },
  height: { type: Number, default: 220 },
  goal: { type: Number, default: null },
  goalLabel: { type: String, default: 'objectif' },
  unit: { type: String, default: '' },
  xFormat: { type: Function, default: (x) => x },
  emptyText: { type: String, default: 'Pas encore de données' },
})

const wrap = ref(null)
const width = ref(600)
const hover = ref(null)
let ro
onMounted(() => {
  ro = new ResizeObserver(([e]) => (width.value = e.contentRect.width))
  ro.observe(wrap.value)
})
onBeforeUnmount(() => ro?.disconnect())

const pad = { l: 40, r: 14, t: 14, b: 26 }
const W = computed(() => Math.max(200, width.value))
const H = computed(() => props.height)

function niceTicks(min, max, count = 4) {
  if (min === max) { min -= 1; max += 1 }
  const span = max - min
  const step0 = span / count
  const mag = 10 ** Math.floor(Math.log10(step0))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= step0)
  const lo = Math.floor(min / step) * step
  const hi = Math.ceil(max / step) * step
  const ticks = []
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 1000) / 1000)
  return ticks
}

const scale = computed(() => {
  const ys = props.points.map((p) => p.y)
  if (props.goal != null) ys.push(props.goal)
  const ticks = niceTicks(Math.min(...ys), Math.max(...ys))
  const y0 = ticks[0], y1 = ticks.at(-1)
  const n = props.points.length
  const x = (i) => pad.l + (n <= 1 ? (W.value - pad.l - pad.r) / 2 : (i / (n - 1)) * (W.value - pad.l - pad.r))
  const y = (v) => pad.t + (1 - (v - y0) / (y1 - y0 || 1)) * (H.value - pad.t - pad.b)
  return { ticks, x, y }
})

const path = computed(() => props.points.map((p, i) => `${i ? 'L' : 'M'}${scale.value.x(i).toFixed(1)},${scale.value.y(p.y).toFixed(1)}`).join(''))
const area = computed(() => {
  if (props.points.length < 2) return ''
  const s = scale.value
  const base = H.value - pad.b
  return `${path.value}L${s.x(props.points.length - 1)},${base}L${s.x(0)},${base}Z`
})

const xLabels = computed(() => {
  const n = props.points.length
  if (!n) return []
  const idx = n === 1 ? [0] : n === 2 ? [0, 1] : [0, Math.floor((n - 1) / 2), n - 1]
  return idx.map((i) => ({ i, text: props.xFormat(props.points[i].x) }))
})

function onMove(e) {
  const r = wrap.value.getBoundingClientRect()
  const px = e.clientX - r.left
  const n = props.points.length
  if (!n) return
  const t = (px - pad.l) / (W.value - pad.l - pad.r)
  hover.value = Math.max(0, Math.min(n - 1, Math.round(t * (n - 1))))
}

const gid = `g${Math.random().toString(36).slice(2, 8)}`
const fmt = (v) => (Number.isInteger(v) ? v : v.toFixed(1))
</script>

<template>
  <div ref="wrap" class="lc" :style="{ height: `${height}px` }" @mousemove="onMove" @mouseleave="hover = null">
    <div v-if="!points.length" class="empty-chart muted">{{ emptyText }}</div>
    <svg v-else :width="W" :height="H" role="img">
      <defs>
        <linearGradient :id="gid" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" :stop-color="color" stop-opacity="0.22" />
          <stop offset="100%" :stop-color="color" stop-opacity="0" />
        </linearGradient>
      </defs>
      <g class="grid">
        <g v-for="t in scale.ticks" :key="t">
          <line :x1="pad.l" :x2="W - pad.r" :y1="scale.y(t)" :y2="scale.y(t)" />
          <text :x="pad.l - 8" :y="scale.y(t) + 4" text-anchor="end">{{ t }}</text>
        </g>
      </g>
      <g v-if="goal != null">
        <line class="goal" :x1="pad.l" :x2="W - pad.r" :y1="scale.y(goal)" :y2="scale.y(goal)" />
        <text class="goal-t" :x="W - pad.r" :y="scale.y(goal) - 6" text-anchor="end">{{ goalLabel }} {{ goal }}</text>
      </g>
      <path :d="area" :fill="`url(#${gid})`" />
      <path :d="path" fill="none" :stroke="color" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
      <template v-if="points.length <= 14">
        <circle v-for="(p, i) in points" :key="i" :cx="scale.x(i)" :cy="scale.y(p.y)" r="4" :fill="color" stroke="var(--surface)" stroke-width="2" />
      </template>
      <text v-for="l in xLabels" :key="l.i" class="xl" :x="scale.x(l.i)" :y="H - 6" :text-anchor="l.i === 0 && points.length > 1 ? 'start' : l.i === points.length - 1 && points.length > 1 ? 'end' : 'middle'">{{ l.text }}</text>
      <g v-if="hover != null">
        <line class="cross" :x1="scale.x(hover)" :x2="scale.x(hover)" :y1="pad.t" :y2="H - pad.b" />
        <circle :cx="scale.x(hover)" :cy="scale.y(points[hover].y)" r="5" :fill="color" stroke="var(--surface)" stroke-width="2" />
      </g>
    </svg>
    <div
      v-if="hover != null && points.length"
      class="tip"
      :style="{ left: `${Math.min(W - 150, Math.max(0, scale.x(hover) - 70))}px`, top: `${Math.max(0, scale.y(points[hover].y) - 64)}px` }"
    >
      <div class="tip-v mono">{{ fmt(points[hover].y) }}{{ unit }}</div>
      <div class="tip-x">{{ points[hover].label || xFormat(points[hover].x) }}</div>
    </div>
  </div>
</template>

<style scoped>
.lc { position: relative; width: 100%; }
svg { display: block; overflow: visible; }
.grid line { stroke: rgba(255, 255, 255, 0.06); }
.grid text, .xl { fill: var(--muted); font-family: var(--mono); font-size: 10.5px; font-variant-numeric: tabular-nums; }
.goal { stroke: var(--text-2); stroke-dasharray: 4 4; opacity: 0.5; }
.goal-t { fill: var(--text-2); font-size: 10.5px; font-family: var(--mono); opacity: 0.8; }
.cross { stroke: var(--line-3); }
.tip { position: absolute; pointer-events: none; background: var(--surface-3); border: 1px solid var(--line-2); border-radius: 8px; padding: 6px 10px; min-width: 140px; box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.8); }
.tip-v { font-size: 15px; font-weight: 600; color: var(--text); }
.tip-x { font-size: 11.5px; color: var(--muted); }
.empty-chart { height: 100%; display: grid; place-items: center; border: 1px dashed var(--line-2); border-radius: 10px; font-size: 13px; }
</style>

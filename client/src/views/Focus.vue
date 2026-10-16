<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { store, api } from '../lib/store.js'
import { fmtClock, fmtMinutes } from '../lib/format.js'
import {
  focus, display, progress, PHASE_LABEL, setMode, setPhase, setDuration,
  toggle, reset, skip, lap, stopwatchMs, logFocus, enableNotifications,
} from '../lib/focus.js'

defineOptions({ name: 'FocusView' })

const root = ref(null)
const isFull = ref(false)
const custom = ref(20)
const LABELS = ['Maths', 'Échecs', 'Code', 'Lecture', 'Autre']
const TIMER_PRESETS = [5, 10, 15, 20, 30, 45, 60, 90]

const pomo = computed(() => store.state.profile.pomodoro)
const todayFocus = computed(() => store.state.events.filter((e) => e.type === 'focus' && e.date === store.state.today))
const todayMinutes = computed(() => todayFocus.value.reduce((a, e) => a + e.data.minutes, 0))
const swMinutes = computed(() => (focus.tick, stopwatchMs() / 60000))

async function savePomo(k, v) {
  const n = Math.max(1, Math.min(180, Number(v) || 1))
  store.state = await api.put('/api/profile', { pomodoro: { ...pomo.value, [k]: n } })
  if (focus.mode === 'pomodoro' && !focus.running) setPhase(focus.phase)
}

function fullscreen() {
  if (document.fullscreenElement) document.exitFullscreen()
  else root.value?.requestFullscreen?.()
}
const onFs = () => (isFull.value = !!document.fullscreenElement)

function onKey(e) {
  if (e.target.closest?.('input, select, textarea')) return
  if (e.code === 'Space') { e.preventDefault(); toggle() }
  else if (e.key === 'r' || e.key === 'R') reset()
  else if (e.key === 'f' || e.key === 'F') fullscreen()
  else if ((e.key === 'l' || e.key === 'L') && focus.mode === 'stopwatch' && focus.running) lap()
  else if ((e.key === 'n' || e.key === 'N') && focus.mode === 'pomodoro') skip()
}
onMounted(() => {
  window.addEventListener('keydown', onKey)
  document.addEventListener('fullscreenchange', onFs)
  if (focus.mode === 'pomodoro' && !focus.running && focus.remaining === focus.duration) setPhase(focus.phase)
})
onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  document.removeEventListener('fullscreenchange', onFs)
})

async function saveStopwatch() {
  await logFocus(swMinutes.value)
  reset()
}
const phaseColor = computed(() => (focus.mode === 'pomodoro' && focus.phase !== 'focus' ? 'var(--code)' : 'var(--accent)'))
</script>

<template>
  <div ref="root" class="focus" :class="{ full: isFull, running: focus.running }">
    <div class="top">
      <div class="seg">
        <button :class="{ on: focus.mode === 'pomodoro' }" @click="setMode('pomodoro')">Pomodoro</button>
        <button :class="{ on: focus.mode === 'timer' }" @click="setMode('timer')">Minuteur</button>
        <button :class="{ on: focus.mode === 'stopwatch' }" @click="setMode('stopwatch')">Chrono</button>
      </div>
      <div class="row" style="gap: 6px">
        <button class="btn icon ghost" :title="focus.sound ? 'Son activé' : 'Son coupé'" @click="focus.sound = !focus.sound">{{ focus.sound ? '♪' : '∅' }}</button>
        <button class="btn icon ghost" :title="focus.notify ? 'Notifications activées' : 'Activer les notifications'" @click="focus.notify ? (focus.notify = false) : enableNotifications()">{{ focus.notify ? '◉' : '○' }}</button>
        <button class="btn icon ghost" title="Plein écran (F)" @click="fullscreen">{{ isFull ? '⤡' : '⤢' }}</button>
      </div>
    </div>

    <div class="center">
      <div v-if="focus.mode === 'pomodoro'" class="phases">
        <button v-for="p in ['focus', 'short', 'long']" :key="p" class="phase" :class="{ on: focus.phase === p }" @click="setPhase(p)">{{ PHASE_LABEL[p] }}</button>
      </div>
      <div v-else-if="focus.mode === 'timer' && !focus.running" class="phases">
        <button v-for="m in TIMER_PRESETS" :key="m" class="phase mono" :class="{ on: focus.duration === m * 60000 }" @click="setDuration(m * 60000)">{{ m }}′</button>
        <span class="custom">
          <input v-model.number="custom" class="input mono" type="number" min="1" max="600" aria-label="Minutes" />
          <button class="phase" @click="setDuration(custom * 60000)">OK</button>
        </span>
      </div>
      <div v-else class="phases"><span class="muted mono small">{{ focus.mode === 'timer' ? 'minuteur' : 'chronomètre' }}</span></div>

      <div class="digits mono" :class="{ sw: focus.mode === 'stopwatch' }">{{ display }}</div>
      <div class="line"><i :style="{ width: `${progress * 100}%`, background: phaseColor }"></i></div>

      <div v-if="focus.mode === 'pomodoro'" class="cycles">
        <span v-for="i in pomo.cycles" :key="i" class="cyc" :class="{ on: i <= focus.cycle % pomo.cycles || (focus.cycle && focus.cycle % pomo.cycles === 0) }"></span>
        <span class="muted mono small">#{{ focus.cycle + (focus.phase === 'focus' ? 1 : 0) }}</span>
      </div>

      <div class="controls">
        <button class="btn icon round ghost" title="Réinitialiser (R)" @click="reset">↺</button>
        <button class="btn primary play" @click="toggle">{{ focus.running ? 'Pause' : 'Démarrer' }}</button>
        <button v-if="focus.mode === 'pomodoro'" class="btn icon round ghost" title="Phase suivante (N)" @click="skip">⇥</button>
        <button v-else-if="focus.mode === 'stopwatch'" class="btn icon round ghost" title="Tour (L)" :disabled="!focus.running" @click="lap">⚑</button>
        <span v-else class="ph"></span>
      </div>

      <div class="labels">
        <button v-for="l in LABELS" :key="l" class="chip" :class="{ on: focus.label === l }" @click="focus.label = l">{{ l }}</button>
      </div>

      <div v-if="focus.mode === 'stopwatch' && !focus.running && swMinutes >= 1" class="save">
        <button class="btn sm" @click="saveStopwatch">Enregistrer {{ fmtMinutes(swMinutes) }} de focus</button>
      </div>
      <div v-if="focus.mode === 'stopwatch' && focus.laps.length" class="laps mono">
        <div v-for="l in focus.laps" :key="l.n" class="lap"><span class="muted">tour {{ l.n }}</span><span>{{ fmtClock(l.split, { tenths: true }) }}</span><span class="muted">{{ fmtClock(l.at, { tenths: true }) }}</span></div>
      </div>
    </div>

    <div v-if="!isFull" class="bottom">
      <div class="card flat settings">
        <div class="eyebrow">Réglages pomodoro</div>
        <div class="row wrap" style="gap: 10px; margin-top: 10px">
          <label class="field">Focus<input class="input mono" type="number" :value="pomo.focus" @change="savePomo('focus', $event.target.value)" /></label>
          <label class="field">Pause courte<input class="input mono" type="number" :value="pomo.short" @change="savePomo('short', $event.target.value)" /></label>
          <label class="field">Pause longue<input class="input mono" type="number" :value="pomo.long" @change="savePomo('long', $event.target.value)" /></label>
          <label class="field">Cycles<input class="input mono" type="number" :value="pomo.cycles" @change="savePomo('cycles', $event.target.value)" /></label>
        </div>
      </div>
      <div class="card flat today">
        <div class="eyebrow">Aujourd'hui</div>
        <div class="today-v mono">{{ fmtMinutes(todayMinutes) }}</div>
        <div class="muted small">{{ todayFocus.length }} session{{ todayFocus.length > 1 ? 's' : '' }} · objectif {{ store.state.profile.goals.focusMinutes }} min</div>
        <div class="bar" style="margin-top: 10px"><i :style="{ width: `${Math.min(100, (todayMinutes / store.state.profile.goals.focusMinutes) * 100)}%` }"></i></div>
      </div>
      <div class="card flat keys">
        <div class="eyebrow">Raccourcis</div>
        <div class="kl"><span class="kbd">Espace</span> démarrer / pause</div>
        <div class="kl"><span class="kbd">R</span> réinitialiser · <span class="kbd">F</span> plein écran</div>
        <div class="kl"><span class="kbd">N</span> phase suivante · <span class="kbd">L</span> tour</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.focus { min-height: 100vh; display: flex; flex-direction: column; padding: 24px 32px; position: relative; overflow: hidden; }
.focus::after {
  content: 'τ'; position: absolute; right: -40px; bottom: -160px; font-family: var(--serif); font-size: 620px; line-height: 1;
  color: rgba(144, 133, 233, 0.035); pointer-events: none; z-index: 0;
}
.focus.full { background: var(--bg); justify-content: center; }
.focus > * { position: relative; z-index: 1; }
.top { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
.center { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; padding: 40px 0; }
.phases { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; align-items: center; min-height: 34px; }
.phase { border: 1px solid var(--line); background: transparent; color: var(--muted); padding: 6px 14px; border-radius: 999px; cursor: pointer; font-size: 13px; }
.phase:hover { color: var(--text); border-color: var(--line-2); }
.phase.on { color: var(--text); background: var(--surface-2); border-color: var(--line-3); }
.custom { display: inline-flex; gap: 4px; margin-left: 6px; }
.custom .input { width: 72px; height: 32px; }
.digits { font-size: clamp(88px, 17vw, 220px); font-weight: 300; letter-spacing: -0.04em; line-height: 1; font-variant-numeric: tabular-nums; color: var(--text); user-select: none; }
.digits.sw { font-size: clamp(64px, 12vw, 160px); }
.running .digits { text-shadow: 0 0 60px rgba(144, 133, 233, 0.18); }
.line { width: min(560px, 80%); height: 2px; background: var(--surface-3); border-radius: 2px; overflow: hidden; }
.line i { display: block; height: 100%; transition: width 0.25s linear; }
.cycles { display: flex; gap: 8px; align-items: center; }
.cyc { width: 9px; height: 9px; border-radius: 50%; border: 1px solid var(--line-3); }
.cyc.on { background: var(--accent); border-color: var(--accent); }
.controls { display: flex; gap: 16px; align-items: center; margin-top: 6px; }
.play { height: 52px; min-width: 160px; border-radius: 999px; font-size: 16px; }
.round { width: 44px; height: 44px; border-radius: 50%; font-size: 18px; border: 1px solid var(--line-2) !important; }
.ph { width: 44px; }
.labels { display: flex; gap: 6px; flex-wrap: wrap; justify-content: center; }
.labels .chip { cursor: pointer; height: 26px; padding: 0 12px; background: transparent; }
.labels .chip.on { color: var(--text); border-color: var(--accent); background: rgba(144, 133, 233, 0.12); }
.laps { width: min(420px, 90%); max-height: 200px; overflow: auto; font-size: 13px; }
.lap { display: grid; grid-template-columns: 1fr 1fr 1fr; padding: 6px 0; border-bottom: 1px solid var(--line); text-align: right; }
.lap span:first-child { text-align: left; }
.bottom { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 12px; }
.settings .field { width: 100px; }
.settings .input { width: 100%; }
.today-v { font-size: 26px; font-weight: 700; margin-top: 6px; }
.kl { font-size: 12.5px; color: var(--text-2); margin-top: 8px; }
.small { font-size: 12px; }
@media (max-width: 1000px) { .bottom { grid-template-columns: 1fr; } .focus { padding: 20px 16px 100px; } }
</style>

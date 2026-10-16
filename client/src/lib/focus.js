// Moteur du minuteur / chrono — un singleton : il continue de tourner quand on change d'onglet.
import { reactive, computed, watch } from 'vue'
import { sounds } from './sound.js'
import { record, store } from './store.js'
import { fmtClock } from './format.js'

const now = () => Date.now()

export const focus = reactive({
  mode: 'pomodoro', // 'pomodoro' | 'timer' | 'stopwatch'
  label: 'Maths',
  running: false,
  // pomodoro
  phase: 'focus', // 'focus' | 'short' | 'long'
  cycle: 0, // pomodoros de focus terminés dans la série
  // compte à rebours (pomodoro + minuteur)
  duration: 25 * 60_000,
  endsAt: 0,
  remaining: 25 * 60_000,
  // chrono
  startedAt: 0,
  elapsedBefore: 0,
  laps: [],
  // affichage
  tick: now(),
  sound: true,
  notify: false,
  lastLogged: null,
})

const cfg = () => store.state?.profile?.pomodoro || { focus: 25, short: 5, long: 15, cycles: 4 }
const phaseMinutes = (p) => ({ focus: cfg().focus, short: cfg().short, long: cfg().long })[p]

export const PHASE_LABEL = { focus: 'Focus', short: 'Pause courte', long: 'Pause longue' }

let raf = null
function loop() {
  focus.tick = now()
  if (focus.running && focus.mode !== 'stopwatch') {
    focus.remaining = Math.max(0, focus.endsAt - focus.tick)
    if (focus.remaining === 0) complete()
  }
  raf = focus.running ? setTimeout(loop, 200) : null
}
const kick = () => { if (!raf) loop() }

export const display = computed(() => {
  focus.tick // dépendance
  if (focus.mode === 'stopwatch') return fmtClock(stopwatchMs(), { tenths: true })
  return fmtClock(focus.running ? Math.max(0, focus.endsAt - focus.tick) : focus.remaining)
})

export const progress = computed(() => {
  focus.tick
  if (focus.mode === 'stopwatch') return ((stopwatchMs() / 1000) % 60) / 60
  const rem = focus.running ? Math.max(0, focus.endsAt - focus.tick) : focus.remaining
  return 1 - rem / focus.duration
})

export function stopwatchMs() {
  return focus.elapsedBefore + (focus.running ? focus.tick - focus.startedAt : 0)
}

export function setMode(mode) {
  pause()
  focus.mode = mode
  if (mode === 'pomodoro') setPhase('focus')
  if (mode === 'timer') setDuration(timerMs)
  if (mode === 'stopwatch') resetStopwatch()
}

export function setPhase(phase) {
  focus.phase = phase
  setDuration(phaseMinutes(phase) * 60_000)
}

let timerMs = 10 * 60_000
export function setDuration(ms) {
  if (focus.mode === 'timer') timerMs = ms
  focus.running = false
  focus.duration = ms
  focus.remaining = ms
}

export function start() {
  if (focus.running) return
  if (focus.mode === 'stopwatch') focus.startedAt = now()
  else {
    if (focus.remaining <= 0) focus.remaining = focus.duration
    focus.endsAt = now() + focus.remaining
  }
  focus.running = true
  kick()
}

export function pause() {
  if (!focus.running) return
  if (focus.mode === 'stopwatch') focus.elapsedBefore += now() - focus.startedAt
  else focus.remaining = Math.max(0, focus.endsAt - now())
  focus.running = false
}

export const toggle = () => (focus.running ? pause() : start())

export function reset() {
  pause()
  if (focus.mode === 'stopwatch') return resetStopwatch()
  focus.remaining = focus.duration
}

function resetStopwatch() {
  focus.running = false
  focus.elapsedBefore = 0
  focus.startedAt = 0
  focus.laps = []
}

export function lap() {
  const t = stopwatchMs()
  const prev = focus.laps[0]?.at || 0
  focus.laps.unshift({ n: focus.laps.length + 1, at: t, split: t - prev })
}

export function skip() {
  if (focus.mode !== 'pomodoro') return
  pause()
  advance(false)
}

function advance(finishedFocus) {
  if (focus.phase === 'focus') {
    if (finishedFocus) focus.cycle++
    const long = focus.cycle > 0 && focus.cycle % cfg().cycles === 0
    setPhase(long ? 'long' : 'short')
  } else {
    setPhase('focus')
  }
}

async function complete() {
  focus.running = false
  focus.remaining = 0
  if (focus.sound) sounds.chime()
  const minutes = focus.duration / 60_000
  const wasFocus = focus.mode === 'timer' || focus.phase === 'focus'
  if (focus.notify && 'Notification' in window && Notification.permission === 'granted') {
    new Notification(wasFocus ? 'Session terminée ✓' : 'Fin de la pause', {
      body: wasFocus ? `${minutes} min de ${focus.label}. Prends une pause.` : 'On s’y remet ?',
      icon: '/favicon.svg',
    })
  }
  if (wasFocus) await logFocus(minutes)
  if (focus.mode === 'pomodoro') advance(true)
}

export async function logFocus(minutes) {
  if (minutes < 1) return
  focus.lastLogged = { minutes, at: now() }
  try { await record('focus', 'training', { minutes: Math.round(minutes * 10) / 10, label: focus.label, mode: focus.mode }) } catch { /* hors ligne */ }
}

export async function enableNotifications() {
  if (!('Notification' in window)) return false
  const p = await Notification.requestPermission()
  focus.notify = p === 'granted'
  return focus.notify
}

// Titre de l'onglet : affiche le temps restant quand ça tourne.
watch(() => [focus.running, display.value], ([running, d]) => {
  document.title = running ? `${d} · ${focus.mode === 'pomodoro' ? PHASE_LABEL[focus.phase] : focus.label}` : 'Improve myskills'
})

// Applique les réglages pomodoro dès qu'ils sont chargés / modifiés.
watch(() => store.state?.profile?.pomodoro, () => {
  if (focus.mode === 'pomodoro' && !focus.running && focus.remaining === focus.duration) setPhase(focus.phase)
}, { deep: true })

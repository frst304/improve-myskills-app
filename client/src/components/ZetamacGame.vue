<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { makeGenerator, PRESETS, OP_LABEL, zetaLevel, weakestOp } from '../lib/zetamac.js'
import { sounds } from '../lib/sound.js'

const props = defineProps({
  preset: { type: String, default: 'classic' },
  duration: { type: Number, default: 120 },
  ops: { type: Array, default: null },
  best: { type: Number, default: 0 },
  daily: Boolean,
  autostart: Boolean,
})
const emit = defineEmits(['finish'])

const phase = ref('ready') // ready | play | done
const q = ref(null)
const answer = ref('')
const score = ref(0)
const left = ref(props.duration * 1000)
const log = ref([])
const inputEl = ref(null)
const flash = ref(false)

let gen = null
let endsAt = 0
let qStart = 0
let timer = null

const seconds = computed(() => Math.ceil(left.value / 1000))
const ratio = computed(() => left.value / (props.duration * 1000))
const presetInfo = computed(() => PRESETS[props.preset])

function nextQuestion() {
  let n
  do n = gen()
  while (q.value && n.text === q.value.text)
  q.value = n
  qStart = performance.now()
}

async function start() {
  gen = makeGenerator(props.preset, undefined, props.ops)
  score.value = 0
  log.value = []
  answer.value = ''
  phase.value = 'play'
  endsAt = Date.now() + props.duration * 1000
  left.value = props.duration * 1000
  nextQuestion()
  timer = setInterval(() => {
    left.value = Math.max(0, endsAt - Date.now())
    if (left.value <= 0) finish()
  }, 100)
  await nextTick()
  inputEl.value?.focus()
}

function onInput() {
  const v = answer.value.trim().replace(',', '.')
  if (v !== '' && Number(v) === q.value.answer) {
    log.value.push({ text: q.value.text, op: q.value.op, answer: q.value.answer, ms: performance.now() - qStart })
    score.value++
    answer.value = ''
    flash.value = true
    setTimeout(() => (flash.value = false), 120)
    nextQuestion()
  }
}

const summary = computed(() => {
  const perOp = {}
  for (const l of log.value) {
    perOp[l.op] ||= { n: 0, ms: 0 }
    perOp[l.op].n++
    perOp[l.op].ms += l.ms
  }
  const slowest = [...log.value].sort((a, b) => b.ms - a.ms).slice(0, 5)
  const avg = log.value.length ? log.value.reduce((a, l) => a + l.ms, 0) / log.value.length : 0
  return { perOp, slowest, avg, weak: weakestOp(perOp) }
})

function finish() {
  clearInterval(timer)
  phase.value = 'done'
  sounds.chime()
  const s = summary.value
  emit('finish', {
    score: score.value,
    duration: props.duration,
    preset: props.preset,
    perOp: s.perOp,
    avgMs: Math.round(s.avg),
    slowest: s.slowest.map(({ text, answer, ms }) => ({ text, answer, ms: Math.round(ms) })),
  })
}

function onKey(e) {
  if (e.key === 'Enter' && phase.value === 'ready' && !e.target.closest?.('input, textarea, select, button')) start()
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  if (props.autostart) start()
})
onBeforeUnmount(() => {
  clearInterval(timer)
  window.removeEventListener('keydown', onKey)
})
const level = computed(() => zetaLevel(score.value * (120 / props.duration)))
</script>

<template>
  <div class="zeta card ticks">
    <!-- prêt -->
    <div v-if="phase === 'ready'" class="ready">
      <div class="eyebrow"><span class="idx">±</span> {{ presetInfo.name }} · {{ duration }} s</div>
      <div class="formula serif">{{ daily ? 'Défi Zetamac du jour' : presetInfo.name }}</div>
      <p class="dim">{{ presetInfo.desc }} Tape la réponse : elle est validée automatiquement, pas besoin d'Entrée.</p>
      <div class="row wrap" style="justify-content: center">
        <button class="btn primary lg" @click="start">Commencer <span class="kbd">Entrée</span></button>
      </div>
      <p v-if="best" class="muted mono small">record : {{ best }}</p>
    </div>

    <!-- jeu -->
    <div v-else-if="phase === 'play'" class="play">
      <div class="hud mono">
        <span>score <b>{{ score }}</b></span>
        <span :class="{ low: seconds <= 10 }">{{ seconds }} s</span>
      </div>
      <div class="timeline"><i :style="{ width: `${ratio * 100}%` }"></i></div>
      <div class="question mono" :class="{ flash }">
        <span>{{ q.text }}</span>
        <span class="eq">=</span>
        <input
          ref="inputEl"
          v-model="answer"
          class="answer mono"
          inputmode="numeric"
          autocomplete="off"
          spellcheck="false"
          aria-label="Réponse"
          @input="onInput"
        />
      </div>
    </div>

    <!-- résultats -->
    <div v-else class="done">
      <div class="eyebrow"><span class="idx">∎</span> Terminé</div>
      <div class="big mono">{{ score }}</div>
      <div class="row wrap" style="justify-content: center; gap: 8px">
        <span class="chip math dot">{{ level.name }}</span>
        <span v-if="score > best && best" class="chip good">Nouveau record (+{{ score - best }})</span>
        <span class="chip">{{ (summary.avg / 1000).toFixed(2) }} s / réponse</span>
      </div>
      <div class="split">
        <div>
          <h3>Par opération</h3>
          <div v-for="(v, k) in summary.perOp" :key="k" class="op-row">
            <span>{{ OP_LABEL[k] }}</span>
            <span class="mono muted">{{ v.n }} × {{ (v.ms / v.n / 1000).toFixed(2) }} s</span>
          </div>
          <p v-if="summary.weak" class="tip">
            Point faible : <strong>{{ OP_LABEL[summary.weak] }}</strong>. Entraîne-toi dessus en priorité.
          </p>
        </div>
        <div>
          <h3>Les plus lentes</h3>
          <div v-for="(s, i) in summary.slowest" :key="i" class="op-row">
            <span class="mono">{{ s.text }} = {{ s.answer }}</span>
            <span class="mono muted">{{ (s.ms / 1000).toFixed(1) }} s</span>
          </div>
        </div>
      </div>
      <slot name="after" />
      <button v-if="!daily" class="btn" @click="start">Rejouer</button>
    </div>
  </div>
</template>

<style scoped>
.zeta { min-height: 380px; display: flex; flex-direction: column; justify-content: center; outline: none; }
.ready, .done { display: flex; flex-direction: column; align-items: center; gap: 14px; text-align: center; padding: 20px 0; }
.formula { font-size: 34px; letter-spacing: -0.01em; }
.ready p { max-width: 460px; margin: 0; }
.small { font-size: 12px; margin: 0; }
.hud { display: flex; justify-content: space-between; color: var(--muted); font-size: 14px; }
.hud b { color: var(--text); font-size: 18px; }
.hud .low { color: var(--bad); }
.timeline { height: 3px; background: var(--surface-3); border-radius: 3px; margin: 10px 0 0; overflow: hidden; }
.timeline i { display: block; height: 100%; background: var(--math); transition: width 0.1s linear; }
.question { display: flex; align-items: center; justify-content: center; gap: 18px; font-size: clamp(34px, 6vw, 64px); padding: 60px 0; font-weight: 500; transition: color 0.1s; flex-wrap: wrap; }
.question.flash { color: var(--good-text); }
.eq { color: var(--muted); }
.answer {
  width: 4.2em; font-size: inherit; text-align: left; background: transparent; border: 0;
  border-bottom: 2px solid var(--math); outline: none; padding: 0 4px; color: var(--text);
}
.big { font-size: 88px; font-weight: 700; line-height: 1; color: var(--text); }
.split { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; width: 100%; text-align: left; margin-top: 8px; }
.split h3 { font-size: 13px; color: var(--muted); font-weight: 500; margin-bottom: 8px; }
.op-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--line); font-size: 13px; }
.tip { font-size: 13px; color: var(--text-2); }
@media (max-width: 700px) { .split { grid-template-columns: 1fr; } }
</style>

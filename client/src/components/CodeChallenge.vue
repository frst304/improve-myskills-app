<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import MathText from './MathText.vue'
import { createEditor, setDoc } from '../lib/editor.js'
import { runTests, warmup, pyStatus } from '../lib/python.js'
import { api } from '../lib/store.js'
import { sounds } from '../lib/sound.js'

const props = defineProps({
  problem: { type: Object, required: true },
  label: { type: String, default: 'Exercice' },
  solvedBefore: Boolean,
})
const emit = defineEmits(['result', 'next'])

const editorEl = ref(null)
const results = ref(null)
const running = ref(false)
const runError = ref(null)
const attempts = ref(0)
const showHint = ref(false)
const solution = ref(null)
const solved = ref(false)
const elapsed = ref(0)
let view = null
let t0 = Date.now()
let clock = null
let reported = false

const key = computed(() => `ims:code:${props.problem.id}`)
const examples = computed(() => props.problem.tests.slice(0, props.problem.examples))
const passed = computed(() => results.value?.tests.filter((t) => t.ok).length ?? 0)
const LEVEL = ['', 'Échauffement', 'Classique', 'Intermédiaire', 'Avancé', 'Expert']

const show = (v) => {
  // affichage façon Python (True/False, grands entiers décodés)
  const dec = (x) => (x && typeof x === 'object' && !Array.isArray(x) && '$big' in x ? x.$big : Array.isArray(x) ? `[${x.map(dec).join(', ')}]` : typeof x === 'boolean' ? (x ? 'True' : 'False') : typeof x === 'string' ? `'${x}'` : String(x))
  return dec(v)
}
const call = (t) => `${props.problem.func}(${t.args.map(show).join(', ')})`

function loadDraft() {
  try { return localStorage.getItem(key.value) || props.problem.starter } catch { return props.problem.starter }
}
function saveDraft(code) {
  try { localStorage.setItem(key.value, code) } catch { /* stockage indisponible */ }
}

function report(ok) {
  if (reported) return
  reported = true
  clearInterval(clock)
  emit('result', { solved: ok, attempts: attempts.value, timeMs: Date.now() - t0, usedHint: showHint.value })
}

async function run() {
  if (running.value) return
  running.value = true
  runError.value = null
  try {
    const code = view.state.doc.toString()
    const timeout = props.problem.level >= 4 ? 20_000 : 10_000
    results.value = await runTests({ code, func: props.problem.func, tests: props.problem.tests, tol: props.problem.tol }, timeout)
    attempts.value++
    const ok = !results.value.error && results.value.tests.every((t) => t.ok)
    if (ok && !solved.value) {
      solved.value = true
      sounds.chime()
      report(true)
    } else if (!ok) sounds.bad()
  } catch (e) {
    attempts.value++
    runError.value = e.message
  } finally {
    running.value = false
  }
}

async function reveal() {
  if (!solved.value && !confirm('Voir la solution ? L’exercice sera compté comme non résolu pour ton classement.')) return
  const r = await api.get(`/api/problems/${props.problem.id}/solution`)
  solution.value = r.solution
  if (!solved.value) report(false)
}

function reset() {
  if (!confirm('Remettre le code de départ ?')) return
  setDoc(view, props.problem.starter)
}

function init() {
  reported = false
  solved.value = false
  results.value = null
  runError.value = null
  attempts.value = 0
  showHint.value = false
  solution.value = null
  t0 = Date.now()
  elapsed.value = 0
  clearInterval(clock)
  clock = setInterval(() => (elapsed.value = Date.now() - t0), 1000)
  if (view) setDoc(view, loadDraft())
}

onMounted(() => {
  view = createEditor(editorEl.value, loadDraft(), { onChange: saveDraft, onRun: run })
  init()
  warmup().catch(() => {})
})
onBeforeUnmount(() => {
  clearInterval(clock)
  view?.destroy()
})
watch(() => props.problem.id, init)

const mmss = computed(() => `${Math.floor(elapsed.value / 60000)}:${String(Math.floor(elapsed.value / 1000) % 60).padStart(2, '0')}`)
</script>

<template>
  <div class="cc">
    <section class="statement card ticks">
      <div class="eyebrow"><span class="idx">λ</span> {{ label }}</div>
      <h2 class="title">{{ problem.title }}</h2>
      <div class="row wrap" style="gap: 6px; margin: 10px 0 16px">
        <span class="chip code dot">Niveau {{ problem.level }} · {{ LEVEL[problem.level] }}</span>
        <span class="chip mono">{{ problem.rating }}</span>
        <span v-for="t in problem.tags" :key="t" class="chip">{{ t }}</span>
        <span v-if="solvedBefore" class="chip good">déjà résolu</span>
      </div>
      <MathText :text="problem.statement" />

      <h3 class="sub">Exemples</h3>
      <div class="examples mono">
        <div v-for="(t, i) in examples" :key="i" class="ex">
          <span class="dim">{{ call(t) }}</span>
          <span class="arrow">→</span>
          <span>{{ show(t.expected) }}</span>
        </div>
        <div class="muted hidden-note">+ {{ problem.tests.length - examples.length }} tests cachés</div>
      </div>

      <div class="hint-box">
        <button v-if="!showHint" class="btn sm ghost" @click="showHint = true">💡 Afficher l'indice</button>
        <p v-else class="hint"><strong>Indice —</strong> {{ problem.hint }}</p>
      </div>
    </section>

    <section class="workspace">
      <div class="editor card">
        <div class="ed-head">
          <span class="mono muted">solution.py</span>
          <span class="spacer"></span>
          <span class="mono muted small">⏱ {{ mmss }}</span>
          <span class="py-status mono small" :class="pyStatus">
            {{ { idle: 'python', loading: 'chargement de Python…', ready: 'Python 3 · Pyodide', error: 'Python indisponible' }[pyStatus] }}
          </span>
        </div>
        <div ref="editorEl" class="ed"></div>
        <div class="ed-foot">
          <button class="btn primary" :disabled="running" @click="run">
            {{ running ? 'Exécution…' : 'Exécuter les tests' }} <span class="kbd">Ctrl ↵</span>
          </button>
          <button class="btn ghost sm" @click="reset">Réinitialiser</button>
          <span class="spacer"></span>
          <button class="btn ghost sm" @click="reveal">{{ solved ? 'Solution de référence' : 'Abandonner & voir la solution' }}</button>
        </div>
      </div>

      <div class="results card">
        <div class="card-head">
          <span class="card-title">Tests</span>
          <span v-if="results && !results.error" class="mono" :class="passed === problem.tests.length ? 'ok' : 'ko'">
            {{ passed }} / {{ problem.tests.length }}
          </span>
        </div>
        <div v-if="runError" class="err mono">{{ runError }}</div>
        <div v-else-if="!results" class="muted small">
          Écris ta fonction <code class="mono">{{ problem.func }}({{ problem.params.join(', ') }})</code> puis lance les tests.
          <span v-if="pyStatus === 'loading'"> Le premier chargement de Python prend quelques secondes.</span>
        </div>
        <template v-else>
          <pre v-if="results.error" class="err mono">{{ results.error }}</pre>
          <div v-else class="tests">
            <div v-for="(t, i) in results.tests" :key="i" class="test" :class="{ ok: t.ok }">
              <span class="mark">{{ t.ok ? '✓' : '✕' }}</span>
              <div class="body mono">
                <template v-if="i < problem.examples">
                  <div>{{ problem.func }}({{ t.args }})</div>
                  <div v-if="!t.ok" class="diff">
                    <span v-if="t.error" class="bad">{{ t.error }}</span>
                    <template v-else>obtenu <b class="bad">{{ t.got }}</b> · attendu <b>{{ t.expected }}</b></template>
                  </div>
                </template>
                <template v-else>
                  <div>test caché #{{ i - problem.examples + 1 }}</div>
                  <div v-if="!t.ok" class="diff">
                    <span v-if="t.error" class="bad">{{ t.error.split('\n').at(-1) }}</span>
                    <span v-else>mauvaise réponse</span>
                  </div>
                </template>
              </div>
              <span class="ms mono muted">{{ t.ms < 1 ? '<1' : Math.round(t.ms) }} ms</span>
            </div>
          </div>
          <pre v-if="results.stdout" class="stdout mono">{{ results.stdout }}</pre>
        </template>

        <div v-if="solved" class="win">
          <strong>Q.E.D. ∎</strong> Tous les tests passent en {{ attempts }} essai{{ attempts > 1 ? 's' : '' }}.
          <button class="btn sm" style="margin-left: auto" @click="emit('next')">Exercice suivant →</button>
        </div>
        <div v-if="solution" class="solution">
          <div class="eyebrow">Solution de référence</div>
          <pre class="mono">{{ solution }}</pre>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.cc { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 6fr); gap: 16px; align-items: start; }
.title { font-size: 22px; margin-top: 8px; }
.sub { font-size: 13px; color: var(--muted); font-weight: 500; margin: 18px 0 8px; }
.examples { display: flex; flex-direction: column; gap: 6px; font-size: 12.5px; background: var(--bg-2); border: 1px solid var(--line); border-radius: 10px; padding: 12px; overflow-x: auto; }
.ex { display: flex; gap: 10px; white-space: nowrap; }
.arrow { color: var(--code); }
.hidden-note { font-size: 11.5px; }
.hint-box { margin-top: 14px; }
.hint { margin: 0; padding: 12px; border-radius: 10px; background: rgba(250, 178, 25, 0.06); border: 1px solid rgba(250, 178, 25, 0.25); color: var(--text-2); font-size: 13px; }
.workspace { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.editor { padding: 0; overflow: hidden; }
.ed-head, .ed-foot { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-bottom: 1px solid var(--line); }
.ed-foot { border-bottom: 0; border-top: 1px solid var(--line); }
.ed { height: 360px; background: var(--bg-2); }
.ed :deep(.cm-editor) { height: 100%; }
.ed :deep(.cm-editor.cm-focused) { outline: none; }
.small { font-size: 12px; }
.py-status { padding: 2px 8px; border-radius: 6px; background: var(--surface-3); color: var(--muted); }
.py-status.ready { color: var(--code); }
.py-status.loading { color: var(--warn); }
.ok { color: var(--good-text); }
.ko { color: var(--bad); }
.tests { display: flex; flex-direction: column; gap: 6px; }
.test { display: flex; gap: 10px; align-items: flex-start; padding: 8px 10px; border-radius: 8px; background: var(--bg-2); border: 1px solid var(--line); font-size: 12.5px; }
.test .mark { color: var(--bad); font-weight: 700; width: 14px; }
.test.ok .mark { color: var(--good-text); }
.test .body { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.diff { color: var(--muted); margin-top: 2px; white-space: pre-wrap; }
.bad { color: var(--bad); }
.ms { font-size: 11px; white-space: nowrap; }
.err { color: var(--bad); white-space: pre-wrap; background: rgba(230, 103, 103, 0.06); border: 1px solid rgba(230, 103, 103, 0.25); border-radius: 8px; padding: 10px; margin: 0; font-size: 12.5px; }
.stdout { margin: 10px 0 0; padding: 10px; border-radius: 8px; background: var(--bg-2); border: 1px dashed var(--line-2); font-size: 12px; color: var(--text-2); max-height: 160px; overflow: auto; }
.win { display: flex; align-items: center; gap: 10px; margin-top: 14px; padding: 12px; border-radius: 10px; background: rgba(12, 163, 12, 0.08); border: 1px solid rgba(12, 163, 12, 0.35); color: var(--text-2); flex-wrap: wrap; }
.win strong { color: var(--good-text); }
.solution { margin-top: 14px; }
.solution pre { background: var(--bg-2); border: 1px solid var(--line); border-radius: 10px; padding: 12px; font-size: 12.5px; overflow-x: auto; color: var(--text-2); }
@media (max-width: 1100px) { .cc { grid-template-columns: 1fr; } }
</style>

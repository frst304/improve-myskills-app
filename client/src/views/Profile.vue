<script setup>
import { ref, computed, onMounted } from 'vue'
import { store, api, toast, refresh } from '../lib/store.js'
import { estimateElo, nextMilestone } from '../lib/elo.js'
import MathText from '../components/MathText.vue'

const s = computed(() => store.state)
const cc = ref(null)
const ccError = ref(null)
const form = ref({ name: s.value.profile.name, chesscomUser: s.value.profile.chesscomUser, goals: { ...s.value.profile.goals } })

async function loadCC() {
  cc.value = null
  ccError.value = null
  try { cc.value = await api.get(`/api/chesscom?user=${encodeURIComponent(form.value.chesscomUser)}`) } catch (e) { ccError.value = e.message }
}
onMounted(loadCC)

const elo = computed(() => estimateElo(cc.value, s.value.ratings.puzzle.rating))

async function save() {
  const changedUser = form.value.chesscomUser !== s.value.profile.chesscomUser
  store.state = await api.put('/api/profile', form.value)
  toast({ title: 'Profil enregistré' })
  if (changedUser) loadCC()
}

const fileEl = ref(null)
async function importData(e) {
  const f = e.target.files[0]
  if (!f) return
  try {
    const data = JSON.parse(await f.text())
    if (!confirm('Remplacer toutes les données actuelles par ce fichier ?')) return
    await api.post('/api/import', data)
    await refresh()
    toast({ title: 'Données importées' })
  } catch (err) {
    toast({ title: 'Import impossible', body: err.message })
  } finally {
    e.target.value = ''
  }
}
const avatar = computed(() => cc.value?.profile?.avatar)
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <div class="eyebrow"><span class="idx">ℝ</span> Profil & estimation Elo</div>
        <h1>Où en es-tu vraiment ?</h1>
        <p>L'estimation combine ton compte Chess.com et ta performance réelle sur les puzzles de l'app. Plus tu joues ici, plus elle devient précise.</p>
      </div>
    </div>

    <section class="grid top">
      <!-- Estimation -->
      <div class="card ticks est">
        <div class="eyebrow"><span class="idx">≈</span> Elo estimé · rapide</div>
        <div v-if="ccError" class="empty small">Chess.com injoignable : {{ ccError }}</div>
        <template v-else>
          <div class="est-main">
            <span class="est-v mono">{{ cc ? elo.chesscom : '…' }}</span>
            <span class="muted mono">intervalle {{ cc ? `${elo.low} – ${elo.high}` : '…' }}</span>
          </div>
          <div class="eq-grid">
            <div><span class="k">Équivalent Lichess</span><span class="v mono">{{ cc ? elo.lichess : '…' }}</span></div>
            <div><span class="k">Équivalent FIDE (indicatif)</span><span class="v mono">{{ cc ? elo.fide : '…' }}</span></div>
            <div><span class="k">Ton niveau tactique suggère</span><span class="v mono">{{ elo.fromPuzzle }}</span></div>
            <div><span class="k">Prochain palier</span><span class="v mono">{{ cc ? nextMilestone(elo.chesscom) : '…' }}</span></div>
          </div>
          <div class="method">
            <MathText :text="`$$\\hat R = w\\,R_{\\text{chess.com}} + (1-w)\\,(R_{\\text{puzzle}} - 550), \\quad w = ${elo.weightChesscom.toFixed(2)}$$`" />
            <p class="muted small">
              <MathText inline text="$w$" /> augmente avec le nombre de parties Chess.com et diminue quand leur incertitude (RD) est grande.
              L'écart de 550 points reflète qu'un puzzle annonce qu'il y a un coup à trouver, contrairement à une partie.
              Les conversions Lichess/FIDE sont des régressions approximatives.
            </p>
          </div>
        </template>
      </div>

      <!-- Chess.com -->
      <div class="card cc">
        <div class="card-head">
          <span class="card-title">Chess.com</span>
          <a v-if="cc" :href="cc.profile.url" target="_blank" rel="noopener" class="btn sm ghost">Profil ↗</a>
        </div>
        <div class="row" style="gap: 12px; margin-bottom: 14px">
          <img v-if="avatar" :src="avatar" alt="" class="avatar" />
          <span v-else class="avatar ph serif">♚</span>
          <div>
            <div class="strong">{{ cc?.profile?.username || form.chesscomUser }}</div>
            <div class="muted small" v-if="cc">{{ cc.profile.league ? `Ligue ${cc.profile.league} · ` : '' }}{{ cc.profile.followers }} abonnés</div>
          </div>
        </div>
        <div v-if="cc" class="cc-grid">
          <div><span class="k">Rapide</span><span class="v mono">{{ elo.rapid ?? '—' }}</span><span class="s mono" v-if="elo.rapidRd">RD {{ elo.rapidRd }}</span></div>
          <div><span class="k">Record rapide</span><span class="v mono">{{ elo.rapidBest ?? '—' }}</span></div>
          <div><span class="k">Blitz</span><span class="v mono">{{ elo.blitz ?? '—' }}</span></div>
          <div><span class="k">Bullet</span><span class="v mono">{{ elo.bullet ?? '—' }}</span></div>
          <div><span class="k">Tactique (moy.)</span><span class="v mono">{{ elo.tactics ?? '—' }}</span></div>
          <div><span class="k">Rapide V/N/D</span><span class="v mono small-v" v-if="elo.rapidRecord">{{ elo.rapidRecord.win }}/{{ elo.rapidRecord.draw }}/{{ elo.rapidRecord.loss }}</span></div>
        </div>
        <div v-else-if="!ccError" class="muted pulse small">chargement…</div>
        <p class="muted small" style="margin: 14px 0 0">Classement puzzle de l'app : <b class="mono">{{ s.ratings.puzzle.rating }}</b> ({{ s.ratings.puzzle.games }} puzzles notés). Il a été initialisé avec ton classement tactique Chess.com.</p>
      </div>
    </section>

    <section class="grid two section">
      <div class="card">
        <div class="card-head"><span class="card-title">Profil & objectifs</span></div>
        <div class="form">
          <label class="field">Prénom / pseudo<input v-model="form.name" class="input" /></label>
          <label class="field">Compte Chess.com<input v-model="form.chesscomUser" class="input mono" /></label>
          <label class="field">Objectif puzzle<input v-model.number="form.goals.puzzle" type="number" class="input mono" /></label>
          <label class="field">Objectif Zetamac (moy.)<input v-model.number="form.goals.zetamac" type="number" class="input mono" /></label>
          <label class="field">Objectif Python (Elo)<input v-model.number="form.goals.code" type="number" class="input mono" /></label>
          <label class="field">Focus quotidien (min)<input v-model.number="form.goals.focusMinutes" type="number" class="input mono" /></label>
        </div>
        <button class="btn primary" style="margin-top: 16px" @click="save">Enregistrer</button>
      </div>
      <div class="card">
        <div class="card-head"><span class="card-title">Données</span></div>
        <p class="dim small">Tout est stocké localement dans <code class="mono">data/db.json</code> (non versionné). Pense à exporter de temps en temps.</p>
        <div class="row wrap">
          <a class="btn" href="/api/export" download>Exporter (.json)</a>
          <button class="btn ghost" @click="fileEl.click()">Importer…</button>
          <input ref="fileEl" type="file" accept="application/json" hidden @change="importData" />
        </div>
        <div class="stats mono small">
          <div><span class="muted">activités</span> {{ s.events.length }}</div>
          <div><span class="muted">puzzles notés</span> {{ s.ratings.puzzle.games }}</div>
          <div><span class="muted">exercices notés</span> {{ s.ratings.code.games }}</div>
          <div><span class="muted">carnet d'erreurs</span> {{ s.mistakes.length }}</div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.section { margin-top: 16px; }
.top { grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); }
.two { grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); }
.small { font-size: 12.5px; }
.strong { font-weight: 600; }
.est-main { display: flex; align-items: baseline; gap: 16px; margin: 12px 0 18px; flex-wrap: wrap; }
.est-v { font-size: 64px; font-weight: 700; letter-spacing: -0.03em; line-height: 1; }
.eq-grid, .cc-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.cc-grid { grid-template-columns: repeat(3, 1fr); }
.eq-grid > div, .cc-grid > div { padding: 10px 12px; border-radius: 10px; border: 1px solid var(--line); display: flex; flex-direction: column; }
.k { font-size: 11.5px; color: var(--muted); }
.v { font-size: 20px; font-weight: 600; }
.small-v { font-size: 14px; }
.s { font-size: 11px; color: var(--muted); }
.method { margin-top: 16px; padding-top: 6px; border-top: 1px dashed var(--line-2); }
.method p { margin: 0; }
.avatar { width: 48px; height: 48px; border-radius: 12px; border: 1px solid var(--line-2); object-fit: cover; }
.avatar.ph { display: grid; place-items: center; font-size: 26px; background: var(--bg-2); }
.form { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-top: 18px; }
.stats > div { padding: 8px 10px; border-radius: 8px; background: var(--bg-2); border: 1px solid var(--line); display: flex; justify-content: space-between; }
@media (max-width: 1000px) { .top, .two { grid-template-columns: 1fr; } .cc-grid { grid-template-columns: repeat(2, 1fr); } }
</style>

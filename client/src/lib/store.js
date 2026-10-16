import { reactive } from 'vue'

async function request(method, url, body) {
  const r = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await r.json().catch(() => ({}))
  if (!r.ok) throw Object.assign(new Error(data.error || `HTTP ${r.status}`), { status: r.status })
  return data
}

export const api = {
  get: (url) => request('GET', url),
  post: (url, body) => request('POST', url, body),
  put: (url, body) => request('PUT', url, body),
}

export const store = reactive({
  state: null,
  loading: true,
  error: null,
  toasts: [],
  problems: null,
})

export async function refresh() {
  try {
    store.state = await api.get('/api/state')
    store.error = null
  } catch (e) {
    store.error = 'Le serveur ne répond pas. Lance `npm run dev` à la racine du projet.'
  } finally {
    store.loading = false
  }
}

let toastId = 0
export function toast(t) {
  const id = ++toastId
  store.toasts.push({ id, ...t })
  setTimeout(() => dismiss(id), t.duration || 4500)
}
export const dismiss = (id) => {
  const i = store.toasts.findIndex((t) => t.id === id)
  if (i >= 0) store.toasts.splice(i, 1)
}

/** Enregistre une activité et affiche XP, variation de classement, succès et passages de niveau. */
export async function record(type, mode, data) {
  const res = await api.post('/api/events', { type, mode, data })
  store.state = res.state
  const deltas = Object.entries(res.ratingChange || {})
    .map(([k, v]) => `${k === 'puzzle' ? 'Puzzle' : 'Python'} ${v >= 0 ? '+' : '−'}${Math.abs(v)}`)
    .join(' · ')
  toast({ kind: 'xp', title: `+${res.xp} XP`, body: deltas || undefined })
  for (const a of res.unlocked) toast({ kind: 'achievement', title: a.name, body: a.desc, icon: a.icon, duration: 7000 })
  if (res.levelUp) toast({ kind: 'level', title: `Niveau ${res.levelUp.level}`, body: `${res.levelUp.symbol} ${res.levelUp.title}`, icon: res.levelUp.symbol, duration: 7000 })
  return res
}

export async function loadProblems() {
  if (!store.problems) store.problems = await api.get('/api/problems')
  return store.problems
}

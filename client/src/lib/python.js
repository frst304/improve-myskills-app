import { ref } from 'vue'

// Statut partagé du runtime Python : 'idle' | 'loading' | 'ready' | 'error'
export const pyStatus = ref('idle')

let worker = null
let seq = 0
const pending = new Map()

function spawn() {
  worker = new Worker(new URL('./py.worker.js', import.meta.url))
  worker.onmessage = ({ data }) => {
    const p = pending.get(data.id)
    if (!p) return
    pending.delete(data.id)
    clearTimeout(p.timer)
    data.ok ? p.resolve(data.result) : p.reject(new Error(data.error))
  }
}

function call(kind, payload, timeout) {
  if (!worker) spawn()
  const id = ++seq
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      // Boucle infinie ou code trop lent : on tue le worker, il sera recréé au prochain appel.
      pending.delete(id)
      worker.terminate()
      worker = null
      pyStatus.value = 'idle'
      reject(Object.assign(new Error(`Temps limite dépassé (${timeout / 1000} s). Boucle infinie ou algorithme trop lent ?`), { timeout: true }))
    }, timeout)
    pending.set(id, { resolve, reject, timer })
    worker.postMessage({ id, kind, payload })
  })
}

export async function warmup() {
  if (pyStatus.value === 'ready' || pyStatus.value === 'loading') return
  pyStatus.value = 'loading'
  try {
    await call('init', null, 120_000)
    pyStatus.value = 'ready'
  } catch (e) {
    pyStatus.value = 'error'
    throw e
  }
}

/** Exécute `code` contre `tests` ; retourne { tests: [...], error, stdout }. */
export async function runTests({ code, func, tests, tol }, timeout = 12_000) {
  await warmup()
  // JSON : les objets réactifs de Vue (Proxy) ne passent pas le clonage structuré du worker
  return call('run', JSON.stringify({ code, func, tests, tol }), timeout)
}

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import AppSidebar from './components/AppSidebar.vue'
import ToastStack from './components/ToastStack.vue'
import { store, refresh } from './lib/store.js'
import { NAV } from './router.js'

const router = useRouter()
onMounted(refresh)

// Alt + 1…6 : navigation rapide
function onKey(e) {
  if (!e.altKey || e.ctrlKey || e.metaKey) return
  const i = Number(e.key) - 1
  if (NAV[i]) { e.preventDefault(); router.push(NAV[i].path) }
}
onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="shell">
    <AppSidebar />
    <main class="main">
      <div v-if="store.error" class="page">
        <div class="card ticks offline">
          <div class="eyebrow"><span class="idx">⊥</span> Serveur injoignable</div>
          <p>{{ store.error }}</p>
          <button class="btn" @click="refresh">Réessayer</button>
        </div>
      </div>
      <div v-else-if="store.loading" class="page boot">
        <span class="mono muted pulse">∫ chargement…</span>
      </div>
      <router-view v-else v-slot="{ Component }">
        <keep-alive include="FocusView">
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </main>
    <ToastStack />
  </div>
</template>

<style scoped>
.shell { display: grid; grid-template-columns: 248px 1fr; min-height: 100vh; }
.main { min-width: 0; }
.boot { display: grid; place-items: center; min-height: 60vh; }
.offline p { color: var(--text-2); margin: 10px 0 16px; }
@media (max-width: 900px) { .shell { grid-template-columns: 1fr; } }
</style>

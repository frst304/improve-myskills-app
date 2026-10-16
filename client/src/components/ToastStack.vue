<script setup>
import { store, dismiss } from '../lib/store.js'
</script>

<template>
  <div class="toasts" aria-live="polite">
    <TransitionGroup name="t">
      <div v-for="t in store.toasts" :key="t.id" class="toast" :class="t.kind" @click="dismiss(t.id)">
        <span v-if="t.icon" class="ico serif">{{ t.icon }}</span>
        <div>
          <div class="eyebrow" v-if="t.kind === 'achievement'">Succès débloqué</div>
          <div class="eyebrow" v-else-if="t.kind === 'level'">Niveau supérieur</div>
          <div class="title">{{ t.title }}</div>
          <div v-if="t.body" class="body">{{ t.body }}</div>
        </div>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toasts { position: fixed; right: 20px; bottom: 20px; display: flex; flex-direction: column; gap: 10px; z-index: 100; max-width: min(360px, calc(100vw - 32px)); }
.toast {
  display: flex; gap: 12px; align-items: center;
  padding: 12px 16px; border-radius: 12px; cursor: pointer;
  background: var(--surface-2); border: 1px solid var(--line-2);
  box-shadow: 0 16px 40px -12px rgba(0, 0, 0, 0.7);
}
.toast.xp .title { font-family: var(--mono); color: var(--accent-2); }
.toast.achievement { border-color: rgba(250, 178, 25, 0.45); }
.toast.level { border-color: rgba(144, 133, 233, 0.6); }
.ico { font-size: 20px; min-width: 40px; height: 40px; padding: 0 6px; display: grid; place-items: center; border-radius: 10px; background: var(--bg-2); border: 1px solid var(--line-2); color: var(--warn); }
.level .ico { color: var(--accent-2); }
.title { font-weight: 600; }
.body { color: var(--text-2); font-size: 12.5px; }
.eyebrow { font-size: 10px; }
.t-enter-active, .t-leave-active { transition: all 0.3s cubic-bezier(.2, .8, .2, 1); }
.t-enter-from, .t-leave-to { opacity: 0; transform: translateX(24px); }
@media (max-width: 900px) { .toasts { bottom: 84px; right: 16px; } }
</style>

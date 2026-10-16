<script setup>
import { computed } from 'vue'
import { NAV } from '../router.js'
import { store } from '../lib/store.js'
import { focus, display, PHASE_LABEL } from '../lib/focus.js'
import BrandMark from './BrandMark.vue'

const s = computed(() => store.state)
const dailyCount = computed(() => (s.value ? Object.values(s.value.daily).filter(Boolean).length : 0))
</script>

<template>
  <aside class="side">
    <router-link to="/" class="brand">
      <BrandMark :size="34" />
      <div>
        <div class="brand-name">Improve <em>myskills</em></div>
        <div class="brand-sub mono">∀ jour, progrès &gt; 0</div>
      </div>
    </router-link>

    <nav class="nav">
      <router-link v-for="(n, i) in NAV" :key="n.path" :to="n.path" class="nav-item" :title="`${n.label} (Alt+${i + 1})`">
        <span class="sym serif">{{ n.symbol }}</span>
        <span class="lbl">{{ n.label }}</span>
        <span v-if="n.name === 'daily' && s" class="badge mono" :class="{ done: dailyCount === 3 }">{{ dailyCount }}/3</span>
        <span v-if="n.name === 'focus' && focus.running" class="badge mono live">{{ display }}</span>
      </router-link>
    </nav>

    <router-link v-if="focus.running" to="/focus" class="mini-timer">
      <span class="dot pulse"></span>
      <span class="mono">{{ display }}</span>
      <span class="muted">{{ focus.mode === 'pomodoro' ? PHASE_LABEL[focus.phase] : focus.label }}</span>
    </router-link>

    <div v-if="s" class="level card flat">
      <div class="row between">
        <div class="row" style="gap: 10px">
          <span class="lvl-sym serif">{{ s.level.symbol }}</span>
          <div>
            <div class="lvl-title">{{ s.level.title }}</div>
            <div class="mono muted small">niveau {{ s.level.level }}</div>
          </div>
        </div>
        <div class="streak mono" :title="`Série actuelle — record ${s.streak.best} j`">
          <span>{{ s.streak.current }}</span><small>j</small>
        </div>
      </div>
      <div class="bar" style="margin-top: 12px"><i :style="{ width: `${s.level.progress * 100}%` }"></i></div>
      <div class="row between mono small muted" style="margin-top: 6px">
        <span>{{ s.level.into }} / {{ s.level.span }} XP</span>
        <span>{{ s.level.xp }} XP</span>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.side {
  position: sticky; top: 0; height: 100vh;
  display: flex; flex-direction: column; gap: 18px;
  padding: 20px 14px;
  border-right: 1px solid var(--line);
  background: linear-gradient(180deg, rgba(8, 9, 12, 0.92), rgba(8, 9, 12, 0.78));
  backdrop-filter: blur(10px);
  z-index: 10;
}
.brand { display: flex; gap: 12px; align-items: center; padding: 4px 8px 10px; text-decoration: none !important; color: var(--text); }
.brand-name { font-weight: 650; letter-spacing: -0.02em; font-size: 15px; }
.brand-name em { font-style: normal; color: var(--accent-2); }
.brand-sub { font-size: 10.5px; color: var(--muted); margin-top: 1px; }

.nav { display: flex; flex-direction: column; gap: 2px; }
.nav-item {
  display: flex; align-items: center; gap: 12px;
  padding: 9px 10px; border-radius: 10px;
  color: var(--text-2); text-decoration: none !important;
  font-weight: 500; position: relative;
  transition: background 0.15s, color 0.15s;
}
.nav-item:hover { background: var(--surface); color: var(--text); }
.nav-item.router-link-exact-active { background: var(--surface-2); color: var(--text); box-shadow: 0 0 0 1px var(--line) inset; }
.nav-item.router-link-exact-active::before {
  content: ''; position: absolute; left: -14px; top: 9px; bottom: 9px; width: 2px; border-radius: 2px; background: var(--accent);
}
.sym { width: 22px; text-align: center; font-size: 18px; color: var(--accent-2); line-height: 1; }
.lbl { flex: 1; }
.badge { font-size: 10.5px; padding: 1px 6px; border-radius: 6px; background: var(--surface-3); color: var(--muted); }
.badge.done { color: var(--good-text); background: rgba(12, 163, 12, 0.12); }
.badge.live { color: var(--accent-2); }

.mini-timer {
  display: flex; align-items: center; gap: 8px; margin-top: auto;
  padding: 10px 12px; border-radius: 10px; border: 1px solid var(--line-2);
  color: var(--text); text-decoration: none !important; font-size: 12.5px;
}
.mini-timer .dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); }
.level { margin-top: auto; padding: 14px; border-radius: 14px; }
.mini-timer + .level { margin-top: 0; }
.lvl-sym { font-size: 24px; width: 34px; height: 34px; display: grid; place-items: center; border-radius: 9px; background: var(--bg-2); border: 1px solid var(--line-2); color: var(--accent-2); }
.lvl-title { font-weight: 600; font-size: 13px; }
.small { font-size: 11px; }
.streak { font-size: 20px; font-weight: 700; color: var(--warn); }
.streak small { font-size: 11px; color: var(--muted); margin-left: 1px; font-weight: 500; }

@media (max-width: 900px) {
  .side {
    position: fixed; top: auto; bottom: 0; left: 0; right: 0; height: auto;
    flex-direction: row; padding: 8px; gap: 0; border-right: 0; border-top: 1px solid var(--line);
  }
  .brand, .level, .mini-timer { display: none; }
  .nav { flex-direction: row; flex: 1; justify-content: space-around; }
  .nav-item { flex-direction: column; gap: 2px; padding: 6px 4px; font-size: 10px; }
  .nav-item .lbl { flex: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 60px; }
  .nav-item .badge { position: absolute; top: 0; right: 0; font-size: 9px; }
  .nav-item.router-link-exact-active::before { display: none; }
}
@media (max-width: 600px) {
  .nav { justify-content: space-between; }
  .nav-item { flex: 1; min-width: 0; align-items: center; padding: 8px 0; }
  .nav-item .lbl { display: none; }
  .nav-item .badge.live { display: none; }
  .sym { font-size: 20px; }
}
</style>

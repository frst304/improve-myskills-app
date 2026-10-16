<script setup>
import { computed } from 'vue'
const props = defineProps({
  value: { type: Number, required: true },
  goal: { type: Number, required: true },
  color: { type: String, default: 'var(--accent)' },
  label: String,
  sub: String,
  size: { type: Number, default: 86 },
})
const r = 36
const C = 2 * Math.PI * r
const ratio = computed(() => Math.max(0, Math.min(1, props.value / (props.goal || 1))))
</script>

<template>
  <div class="ring">
    <svg :width="size" :height="size" viewBox="0 0 86 86">
      <circle cx="43" cy="43" :r="r" fill="none" stroke="var(--surface-3)" stroke-width="5" />
      <circle
        cx="43" cy="43" :r="r" fill="none" :stroke="color" stroke-width="5" stroke-linecap="round"
        :stroke-dasharray="C" :stroke-dashoffset="C * (1 - ratio)" transform="rotate(-90 43 43)"
        style="transition: stroke-dashoffset 0.8s cubic-bezier(.2,.8,.2,1)"
      />
      <text x="43" y="47" text-anchor="middle" class="pct">{{ Math.round(ratio * 100) }}%</text>
    </svg>
    <div>
      <div class="label">{{ label }}</div>
      <div class="sub mono">{{ sub }}</div>
    </div>
  </div>
</template>

<style scoped>
.ring { display: flex; align-items: center; gap: 12px; }
.pct { fill: var(--text); font-family: var(--mono); font-size: 14px; font-weight: 600; }
.label { font-weight: 600; font-size: 13px; }
.sub { font-size: 11.5px; color: var(--muted); }
</style>

<script setup>
defineProps({ size: { type: Number, default: 32 } })
</script>

<template>
  <svg :width="size" :height="size" viewBox="0 0 64 64" aria-hidden="true">
    <rect x="1" y="1" width="62" height="62" rx="15" fill="#111319" stroke="rgba(255,255,255,.12)" />
    <path d="M10 48 C 22 48, 26 16, 54 14" fill="none" stroke="rgba(144,133,233,.25)" stroke-width="1.5" stroke-dasharray="2 3" />
    <path d="M40 12c-6 0-8 4-9 10l-4 22c-1 5-3 8-7 8" fill="none" stroke="#9085e9" stroke-width="5" stroke-linecap="round" />
    <circle cx="20" cy="18" r="4" fill="#3987e5" />
    <circle cx="48" cy="24" r="3.4" fill="#d95926" />
    <circle cx="45" cy="45" r="5" fill="#199e70" />
  </svg>
</template>

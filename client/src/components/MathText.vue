<script setup>
// Markdown minimal (paragraphes, **gras**, *italique*, `code`) + formules KaTeX ($…$ et $$…$$).
import { computed } from 'vue'
import katex from 'katex'

const props = defineProps({ text: { type: String, default: '' }, inline: Boolean })

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const tex = (s, displayMode) => katex.renderToString(s, { displayMode, throwOnError: false, strict: false })

function inlineMd(s) {
  // on isole d'abord les formules pour ne pas interpréter * ou _ à l'intérieur
  const parts = s.split(/(\$[^$]+\$)/g)
  return parts
    .map((p) => {
      if (p.startsWith('$') && p.endsWith('$') && p.length > 2) return tex(p.slice(1, -1), false)
      return esc(p)
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    })
    .join('')
}

const html = computed(() => {
  if (props.inline) return inlineMd(props.text)
  const blocks = props.text.split(/(\$\$[\s\S]+?\$\$)/g)
  return blocks
    .map((b) => {
      if (b.startsWith('$$')) return tex(b.slice(2, -2).trim(), true)
      return b
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => `<p>${inlineMd(p.replace(/\n/g, ' '))}</p>`)
        .join('')
    })
    .join('')
})
</script>

<template>
  <span v-if="inline" v-html="html"></span>
  <div v-else class="prose" v-html="html"></div>
</template>

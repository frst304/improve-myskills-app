import { createApp } from 'vue'
import '@fontsource-variable/inter'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/700.css'
import 'katex/dist/katex.min.css'
import './style.css'
import App from './App.vue'
import { router } from './router.js'

createApp(App).use(router).mount('#app')

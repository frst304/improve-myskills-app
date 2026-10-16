import { createRouter, createWebHistory } from 'vue-router'

export const NAV = [
  { path: '/', name: 'dashboard', label: 'Tableau de bord', symbol: '∑', component: () => import('./views/Dashboard.vue') },
  { path: '/daily', name: 'daily', label: 'Défis du jour', symbol: '∂', component: () => import('./views/Daily.vue') },
  { path: '/train', name: 'train', label: 'Entraînement', symbol: '∇', component: () => import('./views/Train.vue') },
  { path: '/focus', name: 'focus', label: 'Focus', symbol: 'τ', component: () => import('./views/Focus.vue') },
  { path: '/progress', name: 'progress', label: 'Progression', symbol: '∫', component: () => import('./views/Progress.vue') },
  { path: '/profile', name: 'profile', label: 'Profil & Elo', symbol: 'ℝ', component: () => import('./views/Profile.vue') },
]

export const router = createRouter({
  history: createWebHistory(),
  routes: [...NAV, { path: '/:pathMatch(.*)*', redirect: '/' }],
  scrollBehavior: () => ({ top: 0 }),
})

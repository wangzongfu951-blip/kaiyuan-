import { createRouter, createWebHistory } from 'vue-router'
import { authStore } from '../stores/auth'

const protectedMeta = {
  transition: 'fade-slide',
  requiresAuth: true,
}

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/HomeView.vue'),
    meta: { transition: 'fade-slide' },
  },
  {
    path: '/dictionary',
    name: 'Dictionary',
    component: () => import('../views/DictionaryView.vue'),
    meta: { transition: 'fade-slide' },
  },
  {
    path: '/hotspots',
    name: 'Hotspots',
    component: () => import('../views/HotspotView.vue'),
    meta: { transition: 'fade-slide' },
  },
  {
    path: '/result/:word',
    name: 'Result',
    component: () => import('../views/ResultView.vue'),
    meta: { transition: 'fade-slide' },
  },
  {
    path: '/word/:word',
    name: 'WordDetail',
    component: () => import('../views/WordDetailView.vue'),
    meta: { transition: 'fade-slide' },
  },
  {
    path: '/quiz',
    name: 'Quiz',
    component: () => import('../views/quiz/QuizView.vue'),
    meta: protectedMeta,
  },
  {
    path: '/quiz/:module',
    name: 'QuizModule',
    component: () => import('../views/quiz/QuizPlay.vue'),
    meta: {
      transition: 'fade-scale',
      requiresAuth: true,
      hideNavigation: true,
    },
  },
  {
    path: '/ai',
    name: 'Ai',
    component: () => import('../views/ai/AiView.vue'),
    meta: protectedMeta,
  },
  {
    path: '/review',
    name: 'Review',
    component: () => import('../views/review/ReviewView.vue'),
    meta: protectedMeta,
  },
  {
    path: '/review/feynman/:word',
    name: 'Feynman',
    component: () => import('../views/review/FeynmanView.vue'),
    meta: {
      transition: 'fade-scale',
      requiresAuth: true,
      hideNavigation: true,
    },
  },
  {
    path: '/review-center',
    name: 'ReviewCenter',
    component: () => import('../views/review/ReviewCenterView.vue'),
    meta: protectedMeta,
  },
  {
    path: '/feynman-history',
    name: 'FeynmanHistory',
    component: () => import('../views/review/FeynmanHistoryView.vue'),
    meta: protectedMeta,
  },
  {
    path: '/plan',
    name: 'Plan',
    component: () => import('../views/study/PlanView.vue'),
    meta: protectedMeta,
  },
  {
    path: '/weekly-report',
    name: 'WeeklyReport',
    component: () => import('../views/study/WeeklyReport.vue'),
    meta: protectedMeta,
  },
  {
    path: '/learning-path',
    name: 'LearningPath',
    component: () => import('../views/learning/LearningPathView.vue'),
    meta: protectedMeta,
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('../views/ProfileView.vue'),
    meta: protectedMeta,
  },
  {
    path: '/favorites',
    name: 'Favorites',
    component: () => import('../views/FavoritesView.vue'),
    meta: protectedMeta,
  },
  {
    path: '/mistakes',
    name: 'Mistakes',
    component: () => import('../views/mistakes/MistakesView.vue'),
    meta: protectedMeta,
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/auth/LoginView.vue'),
    meta: {
      transition: 'fade',
      hideNavigation: true,
    },
  },
  {
    path: '/auth/wechat/callback',
    name: 'WeChatCallback',
    component: () => import('../views/auth/WeChatCallbackView.vue'),
    meta: {
      transition: 'fade',
      hideNavigation: true,
    },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

const isStaticPagesBuild = import.meta.env.VITE_STATIC_PAGES === 'true'

router.beforeEach(async (to) => {
  if (isStaticPagesBuild) {
    // GitHub Pages is a public, static demo: keep every feature route
    // reachable so taps do not appear to do nothing. Feature views provide
    // their own empty/local-state fallbacks when the API is unavailable.
    return true
  }

  await authStore.load()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return {
      name: 'Login',
      query: { redirect: to.fullPath },
    }
  }

  if (to.name === 'Login' && authStore.isAuthenticated) {
    const redirect =
      typeof to.query.redirect === 'string' &&
      to.query.redirect.startsWith('/')
        ? to.query.redirect
        : '/'
    return redirect
  }
})

export default router

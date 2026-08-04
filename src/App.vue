<template>
  <div class="app-shell">
    <main class="page-stage" :class="{ 'with-navigation': showNavigation }">
      <router-view v-slot="{ Component, route: viewRoute }">
        <transition
          :name="(viewRoute?.meta?.transition as string) || 'fade-slide'"
          mode="out-in"
        >
          <keep-alive :max="3" :exclude="/Result|WordDetail|Login/">
            <component :is="Component" :key="viewRoute?.path" />
          </keep-alive>
        </transition>
      </router-view>
    </main>

    <nav
      v-if="showNavigation"
      class="primary-navigation"
      aria-label="主要导航"
    >
      <div class="navigation-inner">
        <router-link
          v-for="tab in tabsWithBadge"
          :key="tab.to"
          :to="tab.to"
          class="navigation-item"
          :class="{ active: isActive(tab.to) }"
          :aria-current="isActive(tab.to) ? 'page' : undefined"
        >
          <span class="navigation-icon">
            <component
              :is="tab.icon"
              :size="23"
              :weight="isActive(tab.to) ? 'fill' : 'regular'"
              aria-hidden="true"
            />
            <span v-if="tab.badge > 0" class="navigation-badge">
              {{ tab.badge > 99 ? '99+' : tab.badge }}
            </span>
          </span>
          <span>{{ tab.label }}</span>
        </router-link>
      </div>
    </nav>
  </div>
</template>

<script setup lang="ts">
import { computed, markRaw } from 'vue'
import { useRoute } from 'vue-router'
import {
  PhBookOpenText,
  PhBrain,
  PhHouse,
  PhRepeat,
  PhUserCircle,
} from '@phosphor-icons/vue'
import { useMistakes, useReview } from './stores/app'

const route = useRoute()
const { dueToday } = useReview()
const { mistakes } = useMistakes()

const dueCount = computed(() => dueToday().length)
const mistakeCount = computed(() => mistakes.value.length)
const showNavigation = computed(() => !route.meta.hideNavigation)

const baseTabs = [
  { to: '/', label: '首页', icon: markRaw(PhHouse) },
  { to: '/dictionary', label: '词典', icon: markRaw(PhBookOpenText) },
  { to: '/quiz', label: '学习', icon: markRaw(PhBrain) },
  { to: '/review', label: '复习', icon: markRaw(PhRepeat) },
  { to: '/profile', label: '我的', icon: markRaw(PhUserCircle) },
]

const tabsWithBadge = computed(() =>
  baseTabs.map((tab) => ({
    ...tab,
    badge:
      tab.to === '/review'
        ? dueCount.value
        : tab.to === '/quiz'
          ? mistakeCount.value
          : 0,
  })),
)

function isActive(to: string) {
  if (to === '/') return route.path === '/'
  return route.path === to || route.path.startsWith(`${to}/`)
}
</script>

<style>
.app-shell {
  min-height: 100dvh;
  background: #f5f7fc;
}

.page-stage {
  min-height: 100dvh;
}

.page-stage.with-navigation {
  padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px));
}

.primary-navigation {
  position: fixed;
  z-index: 50;
  right: 0;
  bottom: 0;
  left: 0;
  padding-bottom: env(safe-area-inset-bottom, 0px);
  border-top: 1px solid rgba(216, 222, 238, 0.9);
  background: rgba(255, 255, 255, 0.94);
  box-shadow: 0 -8px 28px rgba(40, 52, 98, 0.07);
  backdrop-filter: blur(18px);
}

.navigation-inner {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  max-width: 620px;
  min-height: 68px;
  margin: 0 auto;
}

.navigation-item {
  display: flex;
  min-width: 0;
  min-height: 58px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 3px;
  color: #8c95aa;
  font-size: 11px;
  font-weight: 650;
  text-decoration: none;
  transition: color 180ms ease, transform 120ms ease;
}

.navigation-item:active {
  transform: scale(0.96);
}

.navigation-item.active {
  color: #4d60d4;
}

.navigation-icon {
  position: relative;
  display: grid;
  min-width: 32px;
  min-height: 30px;
  place-items: center;
}

.navigation-badge {
  position: absolute;
  top: -1px;
  right: -4px;
  display: grid;
  min-width: 16px;
  height: 16px;
  place-items: center;
  padding: 0 4px;
  border: 2px solid #fff;
  border-radius: 99px;
  color: #fff;
  background: #e25168;
  font-size: 9px;
  font-weight: 800;
  line-height: 1;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 180ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 200ms ease, transform 200ms ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-3px);
}

.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: opacity 180ms ease, transform 180ms ease;
}

.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.98);
}

@media (min-width: 768px) {
  .page-stage.with-navigation {
    padding-bottom: 0;
    padding-left: 88px;
  }

  .primary-navigation {
    top: 0;
    right: auto;
    width: 88px;
    padding: 18px 8px;
    border-top: 0;
    border-right: 1px solid rgba(216, 222, 238, 0.9);
  }

  .navigation-inner {
    grid-template-columns: 1fr;
    align-content: center;
    height: 100%;
    gap: 10px;
  }

  .navigation-item {
    min-height: 64px;
    border-radius: 16px;
  }

  .navigation-item.active {
    background: #eef1ff;
  }
}

@media (prefers-reduced-motion: reduce) {
  .fade-enter-active,
  .fade-leave-active,
  .fade-slide-enter-active,
  .fade-slide-leave-active,
  .fade-scale-enter-active,
  .fade-scale-leave-active,
  .navigation-item {
    transition: none;
  }
}
</style>

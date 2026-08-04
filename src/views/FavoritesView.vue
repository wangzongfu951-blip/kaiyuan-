<template>
  <div class="min-h-dvh bg-bg">
    <header class="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-warm-gray/20">
      <div class="max-w-lg mx-auto px-4 h-12 flex items-center justify-between">
        <button @click="$router.back()" class="p-1">
          <svg class="w-5 h-5 text-ink-body" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 class="text-base font-bold text-ink-title">收藏夹</h1>
        <div class="w-8"></div>
      </div>
    </header>
    <main class="max-w-lg mx-auto px-4 pb-8 pt-4">
      <div v-if="favorites.length === 0" class="text-center pt-16">
        <div class="text-5xl mb-4">❤️</div>
        <p class="text-sm font-bold text-ink-title mb-1">暂无收藏</p>
        <p class="text-xs text-ink-muted mb-4">搜索并收藏你想要记忆的成语</p>
        <button @click="$router.push('/dictionary')" class="px-6 py-2.5 bg-cinnabar text-white text-xs font-bold rounded-xl btn-press">去搜索 →</button>
      </div>
      <div v-else class="space-y-2.5">
        <div v-for="word in favorites" :key="word"
          class="bg-white rounded-xl p-4 shadow-sm flex items-center justify-between card-hover">
          <button @click="$router.push('/result/' + word)" class="flex-1 text-left">
            <p class="text-sm font-bold text-ink-title" style="font-family:'Noto Serif SC',serif;">{{ word }}</p>
          </button>
          <button @click="toggle(word)" class="p-2 text-cinnabar">
            <svg class="w-5 h-5 fill-cinnabar" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
          </button>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useFavorites } from '../stores/app'
const { favorites, toggle } = useFavorites()
</script>
<template>
  <div class="min-h-dvh bg-bg">
    <header class="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-warm-gray/20">
      <div class="max-w-lg mx-auto px-4 h-12 flex items-center justify-between">
        <h1 class="text-base font-bold text-ink-title">🧠 智能复习</h1>
        <button @click="$router.push('/review-center')" class="text-xs text-cinnabar font-medium">详情 →</button>
      </div>
    </header>
    <main class="max-w-lg mx-auto px-4 pb-8 pt-4">
      <!-- Memory Curve Visualization -->
      <div class="bg-white rounded-2xl p-5 shadow-sm mb-5 animate-slide-up">
        <h2 class="text-sm font-bold text-ink-title mb-3 flex items-center gap-2">
          <span class="w-1 h-4 bg-jade rounded-full"></span>记忆保持曲线
        </h2>
        <div class="relative h-32 mb-3">
          <svg class="w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
            <defs>
              <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#2e7d6f" stop-opacity="0.3"/>
                <stop offset="100%" stop-color="#2e7d6f" stop-opacity="0"/>
              </linearGradient>
            </defs>
            <path d="M0,10 Q50,80 100,60 T200,75 T300,85" fill="none" stroke="#2e7d6f" stroke-width="2"/>
            <path d="M0,10 Q50,80 100,60 T200,75 T300,85 L300,100 L0,100 Z" fill="url(#curveGrad)"/>
            <circle cx="0" cy="10" r="3" fill="#2e7d6f"/>
            <circle cx="50" cy="45" r="3" fill="#2e7d6f"/>
            <circle cx="100" cy="60" r="3" fill="#2e7d6f"/>
            <circle cx="150" cy="68" r="3" fill="#2e7d6f"/>
            <circle cx="200" cy="75" r="3" fill="#2e7d6f"/>
            <circle cx="250" cy="80" r="3" fill="#2e7d6f"/>
            <circle cx="300" cy="85" r="3" fill="#2e7d6f"/>
          </svg>
          <div class="absolute bottom-0 left-0 right-0 flex justify-between text-[9px] text-ink-muted">
            <span>学习日</span><span>1天</span><span>2天</span><span>4天</span><span>7天</span><span>15天</span><span>30天</span>
          </div>
        </div>
        <p class="text-[10px] text-ink-muted leading-relaxed">科学安排复习时间，在最佳节点巩固记忆，让学习事半功倍。</p>
      </div>

      <!-- Today's Due -->
      <div class="mb-5">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-bold text-ink-title flex items-center gap-2">
            <span class="w-1 h-4 bg-cinnabar rounded-full"></span>今日待复习
            <span class="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-cinnabar">{{ dueList.length }}个</span>
          </h2>
        </div>
        <div v-if="dueList.length > 0" class="space-y-2">
          <div v-for="item in dueList" :key="item.idiom"
            class="bg-white rounded-xl p-3.5 shadow-sm flex items-center justify-between cursor-pointer card-hover animate-slide-up"
            @click="$router.push('/result/' + item.idiom)">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-sm font-bold text-cinnabar" style="font-family:'Noto Serif SC',serif;">{{ item.idiom.charAt(0) }}</div>
              <div>
                <p class="text-sm font-bold text-ink-title">{{ item.idiom }}</p>
                <p class="text-[10px] text-ink-muted">第{{ item.level + 1 }} 轮复习</p>
              </div>
            </div>
            <button @click.stop="$router.push('/review/feynman/' + item.idiom)" class="px-3 py-1.5 bg-jade text-white rounded-lg text-[10px] font-medium">开始复习</button>
          </div>
        </div>
        <div v-else class="bg-white rounded-2xl p-8 shadow-sm text-center">
          <div class="text-4xl mb-3">🎉</div>
          <p class="text-sm font-bold text-ink-title mb-1">今日复习已完成！</p>
          <p class="text-xs text-ink-muted">继续保持，明天还有新的复习任务</p>
        </div>
      </div>

      <!-- Level Distribution -->
      <div class="bg-white rounded-2xl p-5 shadow-sm mb-5 animate-slide-up">
        <h2 class="text-sm font-bold text-ink-title mb-3 flex items-center gap-2">
          <span class="w-1 h-4 bg-indigo-500 rounded-full"></span>掌握程度分布
        </h2>
        <div class="space-y-2.5">
          <div v-for="level in levels" :key="level.name" class="flex items-center gap-3">
            <span class="text-xs text-ink-muted w-16">{{ level.name }}</span>
            <div class="flex-1 h-2 bg-warm-gray/20 rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all" :class="level.color" :style="{ width: level.percent + '%' }"></div>
            </div>
            <span class="text-xs text-ink-muted w-8 text-right">{{ level.count }}</span>
          </div>
        </div>
      </div>

      <!-- Review Stats -->
      <div class="grid grid-cols-2 gap-3 mb-5">
        <div class="bg-white rounded-2xl p-4 shadow-sm text-center animate-fade-up">
          <p class="text-2xl font-bold text-jade">{{ totalReviewed }}</p>
          <p class="text-[10px] text-ink-muted mt-0.5">累计复习</p>
        </div>
        <div class="bg-white rounded-2xl p-4 shadow-sm text-center animate-fade-up delay-1">
          <p class="text-2xl font-bold text-amber-600">{{ masteredCount }}</p>
          <p class="text-[10px] text-ink-muted mt-0.5">已掌握</p>
        </div>
      </div>

      <!-- Review Entry -->
      <button @click="$router.push('/review/feynman/' + (dueList[0]?.idiom || ''))"
        class="w-full bg-gradient-to-r from-jade to-emerald-600 rounded-2xl p-4 text-white flex items-center gap-3 shadow-sm btn-press animate-slide-up">
        <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-xl">🧠</div>
        <div class="text-left flex-1">
          <p class="text-sm font-bold">深度复习</p>
          <p class="text-[11px] text-white/70">用自己的语言解释，真正掌握</p>
        </div>
        <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
      </button>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useReview } from '../../stores/app'

const { allReviews, dueToday } = useReview()
const dueList = computed(() => dueToday())
const totalReviewed = computed(() => allReviews().reduce((sum: number, r: { level: number }) => sum + r.level, 0))
const masteredCount = computed(() => allReviews().filter((r: { level: number }) => r.level >= 5).length)

const levels = [
  { name: '初学', color: 'bg-red-400', count: allReviews().filter((r: { level: number }) => r.level === 1).length, percent: 20 },
  { name: '熟悉', color: 'bg-orange-400', count: allReviews().filter((r: { level: number }) => r.level === 2).length, percent: 15 },
  { name: '掌握', color: 'bg-amber-400', count: allReviews().filter((r: { level: number }) => r.level === 3).length, percent: 25 },
  { name: '熟练', color: 'bg-green-400', count: allReviews().filter((r: { level: number }) => r.level === 4).length, percent: 20 },
  { name: '精通', color: 'bg-jade', count: allReviews().filter((r: { level: number }) => r.level >= 5).length, percent: 20 },
]
</script>
<template>
  <div class="min-h-dvh pb-safe bg-bg">
    <header class="sticky top-0 z-40 bg-bg/90 backdrop-blur-xl border-b border-warm-gray/20">
      <div class="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
        <button @click="router.back()" class="flex items-center gap-1 text-[13px] text-gray-600 active:text-gray-800 -ml-1">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
          返回
        </button>
        <h1 class="text-[15px] font-bold text-gray-800">智能复习</h1>
        <button class="text-[12px] text-red-500 font-medium">详情 →</button>
      </div>
    </header>

    <div class="max-w-lg mx-auto px-4 pt-3 space-y-4 pb-8">
      <!-- Stats -->
      <div class="grid grid-cols-3 gap-3">
        <div class="bg-white rounded-2xl shadow-sm p-4 text-center border border-gray-50">
          <p class="text-[22px] font-bold text-red-500">{{ totalItems }}</p>
          <p class="text-[10px] text-gray-400 mt-0.5">总计</p>
        </div>
        <div class="bg-white rounded-2xl shadow-sm p-4 text-center border border-gray-50">
          <p class="text-[22px] font-bold text-emerald-500">{{ mastered }}</p>
          <p class="text-[10px] text-gray-400 mt-0.5">已掌握</p>
        </div>
        <div class="bg-white rounded-2xl shadow-sm p-4 text-center border border-gray-50">
          <p class="text-[22px] font-bold text-amber-500">{{ dueCount }}</p>
          <p class="text-[10px] text-gray-400 mt-0.5">待复习</p>
        </div>
      </div>

      <!-- Ebbinghaus curve illustration -->
      <section class="bg-white rounded-2xl shadow-sm p-5 border border-gray-50">
        <h3 class="text-[13px] font-bold text-gray-800 mb-3 flex items-center gap-2">
          <span class="w-1 h-4 bg-emerald-400 rounded-full"></span>记忆保持曲线
        </h3>
        <div class="h-32 flex items-end justify-between px-2 relative">
          <svg class="absolute inset-0 w-full h-full" viewBox="0 0 300 120" preserveAspectRatio="none">
            <defs><linearGradient id="cg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#34d399" stop-opacity="0.3"/><stop offset="100%" stop-color="#34d399" stop-opacity="0.05"/></linearGradient></defs>
            <path d="M0,10 Q75,10 150,60 T300,100" fill="none" stroke="#34d399" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M0,10 Q75,10 150,60 T300,100 L300,120 L0,120 Z" fill="url(#cg)"/>
            <circle cx="0" cy="10" r="4" fill="#34d399"/>
            <circle cx="75" cy="18" r="4" fill="#34d399"/>
            <circle cx="150" cy="60" r="4" fill="#f59e0b"/>
            <circle cx="225" cy="82" r="4" fill="#f59e0b"/>
            <circle cx="300" cy="100" r="4" fill="#ef4444"/>
          </svg>
          <div class="relative z-10 flex w-full justify-between text-[9px] text-gray-400 pt-1">
            <span>学习日</span><span>1天</span><span>2天</span><span>4天</span><span>7天</span><span>15天</span><span>30天</span>
          </div>
        </div>
        <p class="text-[10px] text-gray-400 text-center mt-2">科学安排复习时间，在最佳节点巩固记忆，让学习事半功倍。</p>
      </section>

      <!-- Due Review -->
      <section class="bg-white rounded-2xl shadow-sm p-5 border border-gray-50">
        <h3 class="text-[13px] font-bold text-gray-800 mb-3 flex items-center gap-2">
          <span class="w-1 h-4 bg-red-400 rounded-full"></span>今日待复习
          <span v-if="dueCount > 0" class="text-[10px] px-1.5 py-0.5 bg-red-50 text-red-500 rounded-full">{{ dueCount }}个</span>
        </h3>
        <div v-if="dueCount === 0" class="text-center py-6">
          <div class="text-4xl mb-3">🎉</div>
          <p class="text-sm font-bold text-gray-700">今日复习已完成!</p>
          <p class="text-[11px] text-gray-400 mt-1">继续保持，明天还有新的复习任务</p>
        </div>
        <div v-else class="space-y-2">
          <button v-for="(item, idx) in dueItems.slice(0, 5)" :key="idx"
            class="w-full flex items-center gap-3 p-3 bg-gray-50 rounded-xl active:bg-gray-100 transition-colors"
            @click="$router.push('/result/' + encodeURIComponent(item.idiom))">
            <div class="w-2 h-2 rounded-full" :class="item.level >= 4 ? 'bg-emerald-400' : item.level >= 2 ? 'bg-amber-400' : 'bg-red-400'"></div>
            <p class="flex-1 text-[13px] font-bold text-gray-800">{{ item.idiom }}</p>
            <span class="text-[10px] px-2 py-0.5 rounded-full"
              :class="item.level >= 4 ? 'bg-emerald-50 text-emerald-600' : item.level >= 2 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-500'">
              第{{ item.level + 1 }}轮
            </span>
          </button>
        </div>
      </section>

      <!-- Mastery Distribution -->
      <section class="bg-white rounded-2xl shadow-sm p-5 border border-gray-50">
        <h3 class="text-[13px] font-bold text-gray-800 mb-3 flex items-center gap-2">
          <span class="w-1 h-4 bg-blue-400 rounded-full"></span>掌握程度分布
        </h3>
        <div class="space-y-3">
          <div v-for="(level, idx) in masteryLevels" :key="idx" class="flex items-center gap-3">
            <span class="text-[11px] text-gray-500 w-10 text-right">{{ level.label }}</span>
            <div class="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
              <div class="h-full rounded-full transition-all duration-700" :class="level.color" :style="{ width: level.pct + '%' }"></div>
            </div>
            <span class="text-[11px] text-gray-400 w-6 text-right tabular-nums">{{ level.count }}</span>
          </div>
        </div>
      </section>

      <!-- Summary cards -->
      <div class="grid grid-cols-2 gap-3">
        <div class="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-50">
          <p class="text-2xl font-bold text-gray-800">{{ totalReviewed }}</p>
          <p class="text-[10px] text-gray-400 mt-0.5">累计复习</p>
        </div>
        <div class="bg-white rounded-2xl p-4 text-center shadow-sm border border-gray-50">
          <p class="text-2xl font-bold text-emerald-500">{{ mastered }}</p>
          <p class="text-[10px] text-gray-400 mt-0.5">已掌握</p>
        </div>
      </div>

      <!-- Deep Review -->
      <button class="w-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl p-4 text-white flex items-center justify-between active:scale-[0.98] transition-transform shadow-lg shadow-emerald-200">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
          </div>
          <div class="text-left">
            <p class="text-sm font-bold">深度复习</p>
            <p class="text-[10px] text-white/70">用自己的语言解释，真正掌握</p>
          </div>
        </div>
        <svg class="w-5 h-5 text-white/60" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>
      </button>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useReview } from '../../stores/app'

const router = useRouter()
const { records } = useReview()

const allItems = computed(() => records.value || [])
const totalItems = computed(() => allItems.value.length)
const mastered = computed(() => allItems.value.filter((i: any) => i.level >= 4).length)
const dueItems = computed(() => {
  const now = Date.now()
  return allItems.value.filter((i: any) => !i.nextReview || new Date(i.nextReview).getTime() <= now)
})
const dueCount = computed(() => dueItems.value.length)
const totalReviewed = computed(() => allItems.value.reduce((sum: number, i: any) => sum + (i.reviewCount || 0), 0))

const levels = [0, 1, 2, 3, 4].map(l => allItems.value.filter((i: any) => i.level === l).length)
const maxLevel = Math.max(...levels, 1)

const masteryLevels = [
  { label: '初学', color: 'bg-red-400', count: levels[0], pct: Math.round(levels[0] / maxLevel * 100) },
  { label: '熟悉', color: 'bg-amber-400', count: levels[1], pct: Math.round(levels[1] / maxLevel * 100) },
  { label: '掌握', color: 'bg-yellow-400', count: levels[2], pct: Math.round(levels[2] / maxLevel * 100) },
  { label: '熟练', color: 'bg-emerald-400', count: levels[3], pct: Math.round(levels[3] / maxLevel * 100) },
  { label: '精通', color: 'bg-teal-500', count: levels[4], pct: Math.round(levels[4] / maxLevel * 100) },
]
</script>

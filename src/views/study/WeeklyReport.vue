<template>
  <div class="min-h-dvh bg-bg">
    <header class="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-warm-gray/20">
      <div class="max-w-lg mx-auto px-4 h-12 flex items-center justify-between">
        <button @click="$router.back()" class="p-1">
          <svg class="w-5 h-5 text-ink-body" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 class="text-base font-bold text-ink-title">学习周报</h1>
        <div class="w-8"></div>
      </div>
    </header>
    <main class="max-w-lg mx-auto px-4 pb-8 pt-4">
      <div class="bg-white rounded-2xl p-5 shadow-sm mb-5 animate-slide-up text-center">
        <p class="text-xs text-ink-muted mb-2">本周学习概况</p>
        <div class="grid grid-cols-3 gap-4">
          <div>
            <p class="text-2xl font-bold text-cinnabar">{{ weeklyData.totalWords }}</p>
            <p class="text-[10px] text-ink-muted">学习成语</p>
          </div>
          <div>
            <p class="text-2xl font-bold text-jade">{{ weeklyData.totalQuiz }}</p>
            <p class="text-[10px] text-ink-muted">刷题数</p>
          </div>
          <div>
            <p class="text-2xl font-bold text-amber-600">{{ weeklyData.avgAccuracy }}%</p>
            <p class="text-[10px] text-ink-muted">平均正确率</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-2xl p-5 shadow-sm mb-5 animate-slide-up">
        <h3 class="text-sm font-bold text-ink-title mb-3">每日刷题量</h3>
        <div class="flex items-end gap-2 h-32">
          <div v-for="(day, i) in weekStats" :key="i" class="flex-1 flex flex-col items-center gap-1">
            <div class="w-full rounded-t transition-all"
              :class="day.total > 0 ? 'bg-cinnabar' : 'bg-warm-gray/20'"
              :style="{ height: barH(day.total) + 'px', minHeight: '4px' }"></div>
            <span class="text-[9px] text-ink-muted">{{ day.label }}</span>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-2xl p-5 shadow-sm animate-slide-up">
        <h3 class="text-sm font-bold text-ink-title mb-3">学习建议</h3>
        <div class="space-y-3">
          <div class="flex items-start gap-3">
            <span class="text-base">📅</span>
            <p class="text-xs text-ink-body leading-relaxed">保持每天固定时间学习，形成习惯后记忆效果最佳。</p>
          </div>
          <div class="flex items-start gap-3">
            <span class="text-base">🔄</span>
            <p class="text-xs text-ink-body leading-relaxed">利用艾宾浩斯复习法，在第1、2、4、7、15天进行复习。</p>
          </div>
          <div class="flex items-start gap-3">
            <span class="text-base">🧠</span>
            <p class="text-xs text-ink-body leading-relaxed">用费曼学习法检验掌握程度：用自己的话解释成语含义。</p>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useQuizHistory, usePlan } from '../../stores/app'

const { getWeeklyStats } = useQuizHistory()
const { plan } = usePlan()

const weekStats = computed(() => getWeeklyStats())
const weeklyData = computed(() => ({
  totalWords: plan.value.learned.length,
  totalQuiz: weekStats.value.reduce((s, d) => s + d.total, 0),
  avgAccuracy: (() => { const total = weekStats.value.reduce((s, d) => s + d.total, 0); const correct = weekStats.value.reduce((s, d) => s + d.correct, 0); return total > 0 ? Math.round(correct / total * 100) : 0 })(),
}))

function barH(total: number) {
  const maxVal = Math.max(...weekStats.value.map(d => d.total), 1)
  return Math.max(4, Math.round((total / maxVal) * 100))
}
</script>
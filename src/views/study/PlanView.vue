<template>
  <div class="min-h-dvh bg-bg">
    <header class="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-warm-gray/20">
      <div class="max-w-lg mx-auto px-4 h-12 flex items-center justify-between">
        <button @click="$router.back()" class="p-1">
          <svg class="w-5 h-5 text-ink-body" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 class="text-base font-bold text-ink-title">学习计划</h1>
        <div class="w-8"></div>
      </div>
    </header>
    <main class="max-w-lg mx-auto px-4 pb-8 pt-4">
      <!-- Daily Target -->
      <div class="bg-white rounded-2xl p-5 shadow-sm mb-5 animate-slide-up">
        <h3 class="text-sm font-bold text-ink-title mb-4">每日学习目标</h3>
        <div class="flex items-center gap-4 mb-4">
          <button @click="setTarget(Math.max(1, plan.dailyTarget - 5))" class="w-12 h-12 rounded-xl bg-warm-gray/20 flex items-center justify-center text-xl font-bold text-ink-body">-</button>
          <div class="flex-1 text-center">
            <p class="text-4xl font-bold text-cinnabar">{{ plan.dailyTarget }}</p>
            <p class="text-xs text-ink-muted">个成语/天</p>
          </div>
          <button @click="setTarget(Math.min(50, plan.dailyTarget + 5))" class="w-12 h-12 rounded-xl bg-warm-gray/20 flex items-center justify-center text-xl font-bold text-ink-body">+</button>
        </div>
        <div class="flex gap-2">
          <button v-for="n in [5, 10, 15, 20, 30]" :key="n" @click="setTarget(n)"
            class="flex-1 py-2 rounded-xl text-xs font-medium transition-all"
            :class="plan.dailyTarget === n ? 'bg-cinnabar text-white' : 'bg-warm-gray/15 text-ink-muted'">{{ n }}</button>
        </div>
      </div>

      <!-- Today Progress -->
      <div class="bg-white rounded-2xl p-5 shadow-sm mb-5 animate-slide-up">
        <h3 class="text-sm font-bold text-ink-title mb-3">今日进度</h3>
        <div class="flex items-center gap-3 mb-2">
          <div class="flex-1 h-4 bg-warm-gray/20 rounded-full overflow-hidden">
            <div class="h-full bg-gradient-to-r from-cinnabar to-red-500 rounded-full transition-all duration-500"
              :style="{ width: Math.min(100, Math.round(plan.learned.length / plan.dailyTarget * 100)) + '%' }"></div>
          </div>
          <span class="text-sm font-bold text-ink-title">{{ plan.learned.length }}/{{ plan.dailyTarget }}</span>
        </div>
        <p class="text-xs text-ink-muted">{{ plan.learned.length >= plan.dailyTarget ? '🎉 今日目标已完成！' : '继续加油！还差 ' + (plan.dailyTarget - plan.learned.length) + ' 个' }}</p>
      </div>

      <!-- Weekly Heatmap -->
      <div class="bg-white rounded-2xl p-5 shadow-sm animate-slide-up">
        <h3 class="text-sm font-bold text-ink-title mb-3">本周学习热力图</h3>
        <div class="grid grid-cols-7 gap-2">
          <div v-for="(day, i) in weekDays" :key="i"
            class="aspect-square rounded-lg flex flex-col items-center justify-center text-center"
            :class="day.count > 0 ? 'bg-cinnabar/' + Math.min(100, day.count * 20) : 'bg-warm-gray/10'">
            <span class="text-[10px] text-ink-muted">{{ day.label }}</span>
            <span class="text-xs font-bold" :class="day.count > 0 ? 'text-ink-title' : 'text-ink-muted'">{{ day.count }}</span>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { usePlan } from '../../stores/app'

const { plan, setTarget } = usePlan()
const weekLabels = ['一', '二', '三', '四', '五', '六', '日']
const weekDays = computed(() => weekLabels.map((label, i) => ({ label, count: Math.floor(Math.random() * 5) })))
</script>
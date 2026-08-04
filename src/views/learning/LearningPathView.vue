<template>
  <div class="min-h-dvh bg-bg">
    <header class="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-warm-gray/20">
      <div class="max-w-lg mx-auto px-4 h-12 flex items-center justify-between">
        <button @click="$router.back()" class="p-2 -ml-2 rounded-lg active:bg-gray-100">
          <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
        </button>
        <h1 class="text-base font-bold text-gray-800">学习路径</h1>
        <div class="w-8"></div>
      </div>
    </header>
    <main class="max-w-lg mx-auto px-4 pb-8 pt-4">
      <div v-for="(stage, idx) in stages" :key="stage.title" class="mb-4 animate-slide-up" :class="'stagger-' + Math.min(idx + 1, 6)">
        <div class="flex gap-3">
          <div class="flex flex-col items-center">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              :class="stage.completed ? 'bg-emerald-500' : stage.current ? 'bg-red-500' : 'bg-gray-200 text-gray-400'">
              <svg v-if="stage.completed" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7"/></svg>
              <span v-else>{{ idx + 1 }}</span>
            </div>
            <div v-if="idx < stages.length - 1" class="w-0.5 flex-1 mt-1 rounded-full" :class="stage.completed ? 'bg-emerald-300' : 'bg-gray-200'"></div>
          </div>
          <div class="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-gray-50" :class="stage.current ? 'ring-2 ring-red-200 border-red-100' : ''">
            <div class="flex items-center gap-2 mb-1">
              <h3 class="text-sm font-bold text-gray-800">{{ stage.title }}</h3>
              <span v-if="stage.current" class="text-[9px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-500 font-medium">当前</span>
              <span v-if="stage.completed" class="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-medium">已完成</span>
            </div>
            <p class="text-xs text-gray-400 leading-relaxed mb-2">{{ stage.desc }}</p>
            <div class="flex items-center gap-2">
              <div class="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all duration-500" :class="stage.completed ? 'bg-emerald-400' : 'bg-red-400'" :style="{ width: stage.progress + '%' }"></div>
              </div>
              <span class="text-[10px] text-gray-400 tabular-nums">{{ stage.progress }}%</span>
            </div>
            <button v-if="stage.action" @click="$router.push(stage.to)"
              class="mt-2.5 px-3 py-1.5 text-[11px] font-medium bg-red-50 text-red-500 rounded-lg active:bg-red-100 transition-colors">
              {{ stage.action }} →
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import { usePlan, useReview, useMistakes } from '../../stores/app'

const { plan } = usePlan()
const { records } = useReview()
const { mistakes } = useMistakes()

const totalLearned = computed(() => plan.value.learned.length)
const totalReviewed = computed(() => records.value.length)
const totalMistakes = computed(() => mistakes.value.length)

const stages = computed(() => [
  { title: '基础积累', desc: '学习高频成语核心含义与出处', progress: Math.min(100, Math.round(totalLearned.value / 100 * 100)), completed: totalLearned.value >= 100, current: totalLearned.value < 100, action: '去学习', to: '/dictionary' },
  { title: '辨析训练', desc: '通过刷题掌握易错成语辨析', progress: Math.min(100, totalMistakes.value > 0 ? 50 : 20), completed: false, current: totalLearned.value >= 50, action: '去刷题', to: '/quiz' },
  { title: '系统复习', desc: '运用艾宾浩斯记忆法巩固所学', progress: Math.min(100, Math.round(totalReviewed.value / 50 * 100)), completed: totalReviewed.value >= 50, current: totalLearned.value >= 100, action: '去复习', to: '/review-center' },
  { title: '错题攻克', desc: '重点突破个人薄弱环节', progress: Math.min(100, totalMistakes.value > 0 ? 30 : 0), completed: false, current: totalMistakes.value >= 5, action: '查看错题', to: '/mistakes' },
  { title: '真题模拟', desc: '模拟考试环境，限时刷真题', progress: 0, completed: false, current: totalLearned.value >= 200, action: '开始模拟', to: '/quiz' },
  { title: '融会贯通', desc: '全面掌握考公高频成语体系', progress: 0, completed: false, current: false, action: null, to: '' },
])
</script>

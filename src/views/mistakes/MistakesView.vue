<template>
  <div class="min-h-dvh bg-bg">
    <header class="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-warm-gray/20">
      <div class="max-w-lg mx-auto px-4 h-12 flex items-center justify-between">
        <button @click="$router.back()" class="p-1">
          <svg class="w-5 h-5 text-ink-body" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 class="text-base font-bold text-ink-title">错题本</h1>
        <button v-if="mistakes.length > 0" @click="clearMistakes" class="text-xs text-ink-muted">清空</button>
        <div v-else class="w-8"></div>
      </div>
    </header>
    <main class="max-w-lg mx-auto px-4 pb-8 pt-4">
      <div v-if="mistakes.length === 0" class="text-center pt-16">
        <div class="text-5xl mb-4">🎯</div>
        <p class="text-sm font-bold text-ink-title mb-1">暂无错题</p>
        <p class="text-xs text-ink-muted mb-4">做题中答错的题目会自动收录到这里</p>
        <button @click="$router.push('/quiz')" class="px-6 py-2.5 bg-cinnabar text-white text-xs font-bold rounded-xl btn-press">去刷题 →</button>
      </div>
      <div v-else class="space-y-2.5">
        <div v-for="(m, idx) in mistakes" :key="idx"
          class="bg-white rounded-xl p-4 shadow-sm border-l-4 border-cinnabar animate-slide-up"
          :class="'stagger-' + Math.min(idx + 1, 10)">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs px-2 py-0.5 rounded-full bg-red-50 text-cinnabar font-medium">{{ m.module }}</span>
            <span class="text-[10px] text-ink-muted">{{ formatDate(m.timestamp) }}</span>
          </div>
          <p class="text-xs text-ink-body">题目ID: {{ m.questionId }}</p>
          <div class="flex items-center gap-2 mt-2 text-[11px]">
            <span class="text-cinnabar">你的答案: {{ 'ABCD'[m.wrongAnswer] || '-' }}</span>
            <span class="text-jade">正确答案: {{ 'ABCD'[m.correctAnswer] }}</span>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useMistakes } from '../../stores/app'
const { mistakes, clearMistakes } = useMistakes()

function formatDate(ts: string) {
  try { return new Date(ts).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) }
  catch { return '' }
}
</script>
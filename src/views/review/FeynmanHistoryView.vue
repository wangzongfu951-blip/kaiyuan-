<template>
  <div class="min-h-dvh bg-bg">
    <header class="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-gray-200/50">
      <div class="max-w-lg mx-auto px-4 h-12 flex items-center justify-between">
        <button @click="$router.back()" class="p-1">
          <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 class="text-base font-bold text-gray-900">费曼学习记录</h1>
        <div class="w-8"></div>
      </div>
    </header>

    <main class="max-w-lg mx-auto px-4 pb-8 pt-4">
      <!-- Stats -->
      <div class="grid grid-cols-3 gap-3 mb-5">
        <div class="bg-white rounded-2xl p-3.5 shadow-sm text-center">
          <p class="text-xl font-bold text-red-600">{{ records.length }}</p>
          <p class="text-[10px] text-gray-400 mt-0.5">总计</p>
        </div>
        <div class="bg-white rounded-2xl p-3.5 shadow-sm text-center">
          <p class="text-xl font-bold text-green-600">{{ masteredCount }}</p>
          <p class="text-[10px] text-gray-400 mt-0.5">已掌握</p>
        </div>
        <div class="bg-white rounded-2xl p-3.5 shadow-sm text-center">
          <p class="text-xl font-bold text-amber-600">{{ records.length - masteredCount }}</p>
          <p class="text-[10px] text-gray-400 mt-0.5">学习中</p>
        </div>
      </div>

      <!-- Empty state -->
      <div v-if="records.length === 0" class="text-center pt-16">
        <div class="text-5xl mb-4">🧠</div>
        <p class="text-sm font-bold text-gray-900 mb-1">暂无费曼学习记录</p>
        <p class="text-xs text-gray-400 mb-4">在成语详情页使用费曼学习法，用自己的话解释成语</p>
        <button @click="$router.push('/dictionary')" class="px-6 py-2.5 bg-red-600 text-white text-xs font-bold rounded-xl">去学习 →</button>
      </div>

      <!-- History list -->
      <div v-else class="space-y-3">
        <div v-for="item in records" :key="item.idiom"
          class="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div class="p-4">
            <div class="flex items-center justify-between mb-2">
              <button @click="$router.push('/result/' + item.idiom)" class="text-lg font-bold text-gray-900" style="font-family:'Noto Serif SC',serif;">
                {{ item.idiom }}
              </button>
              <span class="text-[10px] px-2 py-0.5 rounded-full"
                :class="item.mastered ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'">
                {{ item.mastered ? '已掌握' : '学习中' }}
              </span>
            </div>

            <!-- User's explanation -->
            <div class="rounded-lg bg-gray-50 p-3 mb-2">
              <p class="text-[10px] text-gray-400 mb-1">你的解释</p>
              <p class="text-[12px] text-gray-700 leading-relaxed">{{ item.userExplanation }}</p>
            </div>

            <!-- Standard explanation -->
            <div class="rounded-lg bg-green-50/50 p-3 mb-2">
              <p class="text-[10px] text-green-700 mb-1">标准释义</p>
              <p class="text-[12px] text-gray-700 leading-relaxed">{{ item.standardExplanation }}</p>
            </div>

            <div class="flex items-center justify-between mt-2">
              <span class="text-[10px] text-gray-400">{{ formatDate(item.timestamp) }}</span>
              <div class="flex gap-2">
                <button @click="$router.push('/review/feynman/' + item.idiom)"
                  class="px-3 py-1.5 text-[11px] font-medium bg-gray-100 text-gray-600 rounded-lg">
                  重新练习
                </button>
                <button @click="$router.push('/result/' + item.idiom)"
                  class="px-3 py-1.5 text-[11px] font-medium bg-red-50 text-red-600 rounded-lg">
                  查看详情
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useFeynman } from '../../stores/app'

const { records } = useFeynman()
const masteredCount = computed(() => records.value.filter(r => r.mastered).length)

function formatDate(ts: string) {
  try {
    const d = new Date(ts)
    return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}
</script>
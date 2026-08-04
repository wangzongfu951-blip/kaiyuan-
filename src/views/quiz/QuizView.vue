<template>
  <div class="min-h-dvh bg-bg">
    <header class="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-warm-gray/20">
      <div class="max-w-lg mx-auto px-4 h-12 flex items-center justify-between">
        <h1 class="text-base font-bold text-ink-title">刷题中心</h1>
        <button @click="$router.push('/mistakes')" class="text-xs text-cinnabar font-medium">错题本 →</button>
      </div>
    </header>
    <main class="max-w-lg mx-auto px-4 pb-8 pt-4">
      <!-- Stats -->
      <div class="grid grid-cols-3 gap-3 mb-6">
        <div class="bg-white rounded-2xl p-3.5 shadow-sm text-center animate-fade-up">
          <p class="text-2xl font-bold text-cinnabar">{{ stats.total }}</p>
          <p class="text-[10px] text-ink-muted mt-0.5">已练习</p>
        </div>
        <div class="bg-white rounded-2xl p-3.5 shadow-sm text-center animate-fade-up delay-1">
          <p class="text-2xl font-bold text-jade">{{ stats.accuracy }}%</p>
          <p class="text-[10px] text-ink-muted mt-0.5">正确率</p>
        </div>
        <div class="bg-white rounded-2xl p-3.5 shadow-sm text-center animate-fade-up delay-2">
          <p class="text-2xl font-bold text-amber-600">{{ stats.streak }}</p>
          <p class="text-[10px] text-ink-muted mt-0.5">连续答对</p>
        </div>
      </div>

      <!-- Tab Switch -->
      <div class="flex bg-warm-gray/20 rounded-xl p-1 mb-5">
        <button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id"
          class="flex-1 py-2 text-xs font-medium rounded-lg transition-all text-center"
          :class="activeTab === tab.id ? 'bg-white text-ink-title shadow-sm' : 'text-ink-muted'">
          {{ tab.label }}
        </button>
      </div>

      <!-- Modules Tab -->
      <div v-if="activeTab === 'modules'" class="space-y-3">
        <div v-for="mod in modules" :key="mod.id"
          class="bg-white rounded-2xl p-4 shadow-sm cursor-pointer card-hover animate-slide-up"
          @click="$router.push('/quiz/' + mod.id)">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" :class="mod.bg">{{ mod.icon }}</div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between mb-1">
                <h3 class="text-sm font-bold text-ink-title">{{ mod.name }}</h3>
                <span class="text-[10px] text-ink-muted">{{ mod.done }}/{{ mod.total }}</span>
              </div>
              <div class="w-full h-1.5 bg-warm-gray/20 rounded-full overflow-hidden mb-1">
                <div class="h-full rounded-full transition-all" :class="mod.color" :style="{ width: (mod.total > 0 ? Math.round(mod.done / mod.total * 100) : 0) + '%' }"></div>
              </div>
              <p class="text-[10px] text-ink-muted">{{ mod.desc }}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Papers Tab -->
      <div v-if="activeTab === 'papers'" class="space-y-3">
        <div v-for="paper in papers" :key="paper.id" class="bg-white rounded-2xl p-4 shadow-sm card-hover animate-slide-up">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <span class="text-xs px-2 py-0.5 rounded-full font-medium" :class="paper.type === '国考' ? 'bg-red-50 text-cinnabar' : 'bg-blue-50 text-indigo-600'">{{ paper.type }}</span>
              <span class="text-sm font-bold text-ink-title">{{ paper.year }}</span>
            </div>
            <span class="text-[10px] text-ink-muted">{{ paper.questions }}题</span>
          </div>
          <p class="text-xs text-ink-body mb-3">{{ paper.title }}</p>
          <button @click="$router.push('/quiz/' + paper.moduleId + '?paper=' + encodeURIComponent(paper.id))" class="w-full py-2 bg-cinnabar text-white rounded-xl text-xs font-medium">开始做题</button>
        </div>
      </div>

      <!-- Tips Tab -->
      <div v-if="activeTab === 'tips'" class="space-y-3">
        <div v-for="tip in tips" :key="tip.title" class="bg-white rounded-2xl p-4 shadow-sm card-hover animate-slide-up">
          <div class="flex items-start gap-3">
            <div class="w-8 h-8 rounded-lg flex items-center justify-center text-lg" :class="tip.bg">{{ tip.icon }}</div>
            <div>
              <h3 class="text-sm font-bold text-ink-title mb-1">{{ tip.title }}</h3>
              <p class="text-xs text-ink-muted leading-relaxed">{{ tip.content }}</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useQuizHistory } from '../../stores/app'
import { loadStaticExamPapers } from '../../services/quiz-static'

const { quizHistory } = useQuizHistory()
const activeTab = ref('modules')

const tabs = [
  { id: 'modules', label: '练习模块' },
  { id: 'papers', label: '真题库' },
  { id: 'tips', label: '学习技巧' },
]

const stats = computed(() => {
  const total = quizHistory.value.reduce((s: number, h: { total: number }) => s + h.total, 0)
  const correct = quizHistory.value.reduce((s: number, h: { correct: number }) => s + h.correct, 0)
  return { total, accuracy: total > 0 ? Math.round(correct / total * 100) : 0, streak: 0 }
})

const modules = [
  { id: 'idiom-usage', name: '成语辨析', icon: '📖', desc: '高频易错成语含义辨析', total: 15, done: 0, bg: 'bg-red-50', color: 'bg-cinnabar' },
  { id: 'word-fill', name: '语境填词', icon: '✏️', desc: '根据语境选择正确成语', total: 8, done: 0, bg: 'bg-blue-50', color: 'bg-indigo-500' },
  { id: 'reading', name: '片段阅读', icon: '📚', desc: '文段主旨与细节理解', total: 6, done: 0, bg: 'bg-green-50', color: 'bg-jade' },
  { id: 'judgment', name: '语句排序', icon: '📝', desc: '打乱句子重新排列', total: 5, done: 0, bg: 'bg-purple-50', color: 'bg-purple-500' },
  { id: 'quantitative', name: '成语接龙', icon: '🔗', desc: '成语首尾字接龙练习', total: 4, done: 0, bg: 'bg-amber-50', color: 'bg-amber-500' },
  { id: 'data-analysis', name: '错题重练', icon: '🎯', desc: '针对错题强化训练', total: 4, done: 0, bg: 'bg-teal-50', color: 'bg-teal-500' },
]

interface PaperCard {
  id: string
  type: string
  year: string
  title: string
  questions: number
  moduleId: string
}

const papers = ref<PaperCard[]>([])

onMounted(async () => {
  try {
    const rows = await loadStaticExamPapers()
    papers.value = rows.map((row) => ({
      id: String(row.id),
      type: row.exam_type,
      year: String(row.year),
      title: row.title,
      // The local corpus records one verifiable question per paper entry. Do
      // not inflate this count with an invented full-paper total.
      questions: 1,
      moduleId: 'idiom-usage',
    }))
  } catch {
    papers.value = []
  }
})

const tips = [
  { icon: '🧠', title: '用自己的话解释', content: '尝试用自己的语言解释成语的含义，如果能讲清楚就说明真正理解了。', bg: 'bg-blue-50' },
  { icon: '📅', title: '间隔复习', content: '在学习后的第1、2、4、7、15天进行复习，可以将记忆保持率提升至90%以上。', bg: 'bg-green-50' },
  { icon: '✏️', title: '错题重点练', content: '错过的题目要反复练习，直到完全掌握。错题本是最好的提分工具。', bg: 'bg-amber-50' },
  { icon: '⏱', title: '计时做题', content: '行测考试时间紧迫，平时练习要养成计时习惯，提高做题速度。', bg: 'bg-red-50' },
]
</script>

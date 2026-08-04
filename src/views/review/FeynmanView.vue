<template>
  <div class="min-h-dvh pb-safe bg-bg">
    <nav class="sticky top-0 z-40 bg-bg/90 backdrop-blur-xl border-b border-warm-gray/20">
      <div class="max-w-lg mx-auto px-4 h-12 flex items-center justify-between">
        <button @click="router.back()" class="flex items-center gap-1 text-[13px] text-ink-body hover:text-ink transition-colors -ml-1">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
          返回
        </button>
        <h1 class="text-[14px] font-bold text-ink">费曼学习法</h1>
        <button @click="$router.push('/feynman-history')" class="text-[11px] text-cinnabar font-medium">记录 →</button>
      </div>
    </nav>

    <div class="max-w-lg mx-auto px-4 pt-4 space-y-4">
      <!-- Idiom display -->
      <section class="bg-white rounded-2xl shadow-sm text-center py-5 px-4">
        <h2 class="text-[32px] font-bold text-ink mb-1" style="font-family:'Noto Serif SC',serif;">{{ idiom }}</h2>
        <p class="text-[13px] text-ink-muted">{{ pinyin }}</p>
        <p v-if="explanation" class="text-xs text-ink-body mt-2 px-4 leading-relaxed">{{ explanation }}</p>
      </section>

      <!-- Method explanation -->
      <section class="bg-gradient-to-r from-green-50 to-green-50/30 rounded-2xl border border-green-200/30 p-5">
        <h3 class="text-[13px] font-bold text-ink mb-2 flex items-center gap-2">
          <span>🧠</span> 费曼学习法
        </h3>
        <p class="text-[12px] text-ink-body leading-[1.8]">
          用你自己的话解释【{{ idiom }}】的含义和用法。如果你能用简单语言让别人理解，说明你真正掌握了这个成语。
        </p>
      </section>

      <!-- User input -->
      <section class="bg-white rounded-2xl shadow-sm p-5">
        <h3 class="text-[13px] font-bold text-ink mb-3">请用自己的话解释</h3>
        <textarea
          v-model="userExplanation"
          rows="5"
          class="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 text-[14px] leading-[1.8] focus:outline-none focus:border-red-400 transition-colors resize-none placeholder:text-gray-400"
          placeholder="写下你的理解，例如：这个成语出自...，原意是...，现在常用来..."
        ></textarea>
        <div class="flex items-center justify-between mt-3">
          <span class="text-[11px] text-gray-400">{{ userExplanation.length }} 字</span>
          <button
            type="button"
            @click="submitExplanation"
            :disabled="userExplanation.trim().length < 2"
            class="px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all inline-flex items-center justify-center"
            :class="userExplanation.trim().length >= 2
              ? 'bg-red-600 text-white hover:bg-red-700 active:scale-[0.97] shadow-sm cursor-pointer'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'">
            提交对比
          </button>
        </div>
      </section>

      <!-- Comparison section -->
      <section v-if="showComparison" class="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div class="px-5 pt-5 pb-3">
          <h3 class="text-[13px] font-bold text-ink flex items-center gap-2">
            <span>📊</span> 对比分析
          </h3>
        </div>
        <div class="px-5 pb-5 space-y-3">
          <!-- Your explanation -->
          <div class="rounded-xl bg-gray-50 p-4">
            <p class="text-[11px] text-gray-400 mb-1">你的解释</p>
            <p class="text-[13px] text-ink leading-[1.8]">{{ userExplanation }}</p>
          </div>
          <!-- Standard explanation -->
          <div class="rounded-xl bg-green-50 border border-green-200/30 p-4">
            <p class="text-[11px] text-green-700 mb-1">标准释义</p>
            <p class="text-[13px] text-ink leading-[1.8]">{{ standardExplanation }}</p>
          </div>
          <!-- Context source -->
          <div v-if="context" class="rounded-xl bg-amber-50/50 border border-amber-200/30 p-4">
            <p class="text-[11px] text-amber-700 mb-1">📜 古籍原文</p>
            <p class="text-[13px] text-ink leading-[1.8]" style="font-family:'Noto Serif SC',serif;">{{ context }}</p>
            <p v-if="context_translation" class="text-[11px] text-gray-500 mt-2 leading-relaxed">
              <span class="font-medium">白话文：</span>{{ context_translation }}
            </p>
          </div>
          <!-- Exam trap -->
          <div v-if="exam_trap" class="rounded-xl bg-amber-50 border border-amber-200/30 p-4">
            <p class="text-[11px] text-amber-700 mb-1">⚠️ 考公易错点</p>
            <p class="text-[13px] text-ink leading-[1.8]">{{ exam_trap }}</p>
          </div>

          <button @click="markDone"
            class="w-full py-3 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white text-[13px] font-bold active:scale-[0.98] transition-all shadow-sm">
            ✅ 掌握了，标记已复习
          </button>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useRoute, useRouter } from "vue-router"
import { useReview, useFeynman } from "../../stores/app"
import { apiGet } from "../../api"

const route = useRoute()
const router = useRouter()
const { markReviewed } = useReview()
const { saveExplanation, markMastered, getRecord } = useFeynman()

const idiom = ref("")
const pinyin = ref("")
const explanation = ref("")
const standardExplanation = ref("")
const context = ref("")
const context_translation = ref("")
const exam_trap = ref("")
const userExplanation = ref("")
const showComparison = ref(false)

function submitExplanation() {
  if (userExplanation.value.trim().length >= 2) {
    showComparison.value = true
    // Save to persistent storage
    saveExplanation(idiom.value, userExplanation.value, standardExplanation.value)
  }
}

function markDone() {
  markMastered(idiom.value)
  markReviewed(idiom.value)
  router.back()
}

onMounted(async () => {
  const word = (route.params.word as string) || (route.query.idiom as string) || ""
  idiom.value = word

  // Load previous explanation if exists
  const existing = getRecord(word)
  if (existing) {
    userExplanation.value = existing.userExplanation
    if (existing.userExplanation.trim().length >= 2) {
      showComparison.value = true
    }
  }

  try {
    const res = await apiGet<{ ok: boolean; data: any }>(`/api/idioms/${encodeURIComponent(word)}`)
    if (res.data) {
      pinyin.value = res.data.pinyin || ''
      explanation.value = res.data.explanation || ''
      standardExplanation.value = res.data.explanation || ''
      context.value = res.data.context || ''
      context_translation.value = res.data.context_translation || ''
      exam_trap.value = res.data.exam_trap || ''
    }
  } catch {
    // fallback silent
  }
})
</script>
<template>
  <div class="min-h-dvh bg-bg">
    <!-- Header with gradient -->
    <header class="bg-gradient-to-br from-cinnabar to-red-800 text-white pt-safe">
      <div class="max-w-lg mx-auto px-4 pt-4 pb-6">
        <!-- Top bar -->
        <div class="flex items-center justify-between mb-5">
          <div class="flex items-center gap-2.5">
            <div class="w-9 h-9 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            </div>
            <div>
              <h1 class="text-lg font-bold tracking-wide">昭途</h1>
              <p class="text-[10px] text-white/60">· 考公智学</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button aria-label="打开学习计划" @click="$router.push('/plan')" class="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <svg class="w-4.5 h-4.5 text-white/90" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </button>
            <button aria-label="打开个人中心" @click="$router.push('/profile')" class="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <svg class="w-4.5 h-4.5 text-white/90" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
            </button>
          </div>
        </div>

        <!-- Exam countdown card -->
        <div class="bg-white/15 backdrop-blur-sm rounded-2xl p-4 mb-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-white/70 text-[11px] mb-1">距 2026 国考</p>
              <div class="flex items-baseline gap-1">
                <span class="text-4xl font-black tracking-tight">{{ examDays }}</span>
                <span class="text-sm text-white/70">天</span>
              </div>
            </div>
            <div class="text-right">
              <p class="text-[11px] text-white/60 mb-1.5">今日学习</p>
              <div class="flex items-center gap-2">
                <div class="w-20 h-2 bg-white/20 rounded-full overflow-hidden">
                  <div class="h-full bg-white rounded-full transition-all duration-700" :style="{ width: todayProgress + '%' }"></div>
                </div>
                <span class="text-sm font-bold tabular-nums">{{ learnedToday }}/{{ dailyTarget }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Search bar -->
        <div class="relative" @click="$router.push('/dictionary')">
          <div class="bg-white/20 backdrop-blur-sm rounded-2xl h-12 flex items-center px-4 gap-3 cursor-pointer active:bg-white/25 transition-colors">
            <svg class="w-4 h-4 text-white/50 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <span class="text-sm text-white/50">输入成语，溯源古籍与考公解析...</span>
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-lg mx-auto px-4 pb-24 pt-4">
      <!-- Today's Study Plan -->
      <section class="mb-4 animate-slide-up" data-testid="home-study-plan">
        <div class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div class="mb-3 flex items-start justify-between gap-3">
            <div>
              <p class="text-sm font-bold text-ink-title">今日学习计划</p>
              <p class="mt-0.5 text-[10px] text-ink-muted">
                已学习 {{ learnedToday }} 个，可直接调整每日目标
              </p>
            </div>
            <button
              type="button"
              class="min-h-9 rounded-lg px-2 text-[11px] font-medium text-cinnabar active:bg-red-50"
              @click="$router.push('/plan')"
            >
              详细计划
            </button>
          </div>
          <form class="flex items-center gap-2" @submit.prevent="saveHomeTarget">
            <label for="home-daily-target" class="sr-only">每日学习目标</label>
            <div class="flex min-h-11 flex-1 items-center rounded-xl bg-bg px-3">
              <input
                id="home-daily-target"
                v-model="homeTarget"
                type="number"
                inputmode="numeric"
                min="1"
                max="200"
                step="1"
                class="w-full bg-transparent text-center text-lg font-bold tabular-nums text-ink-title outline-none"
                aria-describedby="home-target-unit"
                @change="saveHomeTarget"
              >
              <span id="home-target-unit" class="whitespace-nowrap text-[11px] text-ink-muted">个/天</span>
            </div>
            <button
              type="submit"
              class="min-h-11 rounded-xl bg-cinnabar px-4 text-xs font-bold text-white active:opacity-80"
            >
              保存
            </button>
          </form>
        </div>
      </section>

      <!-- Daily Challenge -->
      <section class="mb-5 animate-slide-up stagger-1">
        <div class="bg-gradient-to-r from-indigo via-indigo/90 to-purple-500 rounded-2xl p-4 text-white cursor-pointer active:scale-[0.98] transition-transform shadow-lg shadow-indigo/20"
          @click="$router.push('/quiz/idiom-usage')">
          <div class="flex items-center gap-3">
            <div class="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 backdrop-blur">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-[10px] text-white/60 uppercase tracking-wider">每日一组</p>
              <p class="text-sm font-bold leading-tight">今日成语挑战</p>
              <p class="text-[10px] text-white/50 mt-0.5">10道精选易错题 · 限时15分钟</p>
            </div>
            <svg class="w-5 h-5 text-white/40 flex-shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>
          </div>
          <div class="mt-3 flex items-center gap-2">
            <div class="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div class="h-full bg-white rounded-full transition-all duration-500" :style="{ width: challengeProgress + '%' }"></div>
            </div>
            <span class="text-[10px] text-white/60 tabular-nums">{{ challengeDone }}/10</span>
          </div>
        </div>
      </section>

      <!-- High-frequency memory loop: one tap opens the same quiz engine with
           the bundled high-frequency corpus as its study set. -->
      <section class="mb-5 animate-slide-up stagger-2" data-testid="high-frequency-memory">
        <button
          type="button"
          class="w-full rounded-2xl border border-amber-100 bg-gradient-to-r from-amber-50 via-white to-orange-50 p-4 text-left shadow-sm active:scale-[0.99] transition-transform"
          @click="$router.push('/quiz/idiom-usage?focus=high-frequency')"
        >
          <div class="flex items-center gap-3">
            <div class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-amber-100 text-xl">🔥</div>
            <div class="min-w-0 flex-1">
              <p class="text-[10px] font-semibold uppercase tracking-wider text-amber-700">高频成语记忆</p>
              <p class="mt-0.5 text-sm font-bold text-ink-title">开始积累高频成语</p>
              <p class="mt-0.5 text-[10px] leading-relaxed text-ink-muted">按语境练习、标记已记住，并自动进入复习节奏</p>
            </div>
            <span class="flex-shrink-0 text-sm font-bold text-amber-600">开始 →</span>
          </div>
        </button>
      </section>

      <!-- Core Modules -->
      <section class="mb-5 animate-slide-up stagger-3">
        <h2 class="text-[13px] font-bold text-ink-title mb-3 flex items-center gap-2">
          <span class="w-1 h-4 bg-cinnabar rounded-full"></span>学习模块
        </h2>
        <div class="grid grid-cols-3 gap-2.5">
          <button v-for="mod in coreModules" :key="mod.id" @click="$router.push(mod.to)"
            class="bg-white rounded-2xl py-4 px-2 shadow-sm active:scale-95 transition-all flex flex-col items-center gap-2 border border-gray-50">
            <div class="w-11 h-11 rounded-xl flex items-center justify-center" :class="mod.bg">
              <svg v-if="mod.id==='dict'" class="w-5 h-5" :class="mod.iconColor" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
              <svg v-else-if="mod.id==='quiz'" class="w-5 h-5" :class="mod.iconColor" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>
              <svg v-else-if="mod.id==='review'" class="w-5 h-5" :class="mod.iconColor" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
              <svg v-else-if="mod.id==='mistakes'" class="w-5 h-5" :class="mod.iconColor" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <svg v-else-if="mod.id==='favorites'" class="w-5 h-5" :class="mod.iconColor" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg>
              <svg v-else class="w-5 h-5" :class="mod.iconColor" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
            </div>
            <span class="text-[11px] font-medium text-ink-body">{{ mod.label }}</span>
          </button>
        </div>
      </section>

      <!-- Search History -->
      <section v-if="history.length > 0" class="mb-5 animate-slide-up stagger-4">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-[13px] font-bold text-ink-title flex items-center gap-2">
            <span class="w-1 h-4 bg-gray-400 rounded-full"></span>搜索历史
          </h2>
          <button @click="clearHistory" class="text-[11px] text-ink-muted active:text-cinnabar">清空</button>
        </div>
        <div class="flex flex-wrap gap-2">
          <button v-for="word in history.slice(0, 8)" :key="word" @click="$router.push('/result/' + encodeURIComponent(word))"
            class="px-3 py-1.5 bg-white rounded-lg text-xs text-ink-body shadow-sm border border-gray-50 active:bg-gray-50 transition-colors">
            {{ word }}
          </button>
        </div>
      </section>

      <!-- Hot Error-prone Idioms -->
      <section class="mb-5 animate-slide-up stagger-5">
        <h2 class="text-[13px] font-bold text-ink-title mb-3 flex items-center gap-2">
          <span class="w-1 h-4 bg-amber rounded-full"></span>考公高频易错成语
        </h2>
        <div v-if="hotIdioms.length > 0" class="space-y-2">
          <button v-for="item in hotIdioms.slice(0, 6)" :key="item.idiom" @click="$router.push('/result/' + encodeURIComponent(item.idiom))"
            class="w-full bg-white rounded-xl p-3 shadow-sm border border-gray-50 text-left active:bg-gray-50 transition-colors flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-cinnabar/8 flex items-center justify-center flex-shrink-0">
              <span class="text-sm font-bold text-cinnabar">{{ item.idiom.charAt(0) }}</span>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-bold text-ink-title">{{ item.idiom }}</p>
              <p class="text-[11px] text-ink-muted line-clamp-1 mt-0.5">{{ item.explanation?.slice(0, 30) }}</p>
            </div>
            <span v-if="item.sentiment" class="text-[9px] px-1.5 py-0.5 rounded flex-shrink-0"
              :class="item.sentiment === '褒义' ? 'bg-emerald-50 text-emerald-600' : item.sentiment === '贬义' ? 'bg-red-50 text-red-500' : 'bg-gray-100 text-gray-500'">
              {{ item.sentiment }}
            </span>
          </button>
        </div>
        <div v-else class="flex flex-wrap gap-2">
          <button v-for="word in defaultHotIdioms" :key="word" @click="$router.push('/result/' + encodeURIComponent(word))"
            class="px-3 py-2 bg-white rounded-xl shadow-sm text-xs border border-gray-50 active:bg-gray-50 font-bold text-ink-title">
            {{ word }}
          </button>
        </div>
      </section>

      <!-- Bottom Quick Actions -->
      <section class="animate-slide-up stagger-6">
        <div class="grid grid-cols-2 gap-3">
          <button @click="$router.push('/learning-path')"
            class="bg-white rounded-2xl p-4 shadow-sm text-left active:scale-[0.98] transition-all border border-gray-50">
            <div class="w-10 h-10 rounded-xl bg-indigo/10 flex items-center justify-center mb-3">
              <svg class="w-5 h-5 text-indigo" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/></svg>
            </div>
            <p class="text-sm font-bold text-ink-title">学习路径</p>
            <p class="text-[10px] text-ink-muted mt-0.5">系统化学习计划</p>
          </button>
          <button @click="$router.push('/weekly-report')"
            class="bg-white rounded-2xl p-4 shadow-sm text-left active:scale-[0.98] transition-all border border-gray-50">
            <div class="w-10 h-10 rounded-xl bg-jade/10 flex items-center justify-center mb-3">
              <svg class="w-5 h-5 text-jade" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
            </div>
            <p class="text-sm font-bold text-ink-title">周报</p>
            <p class="text-[10px] text-ink-muted mt-0.5">本周学习报告</p>
          </button>
        </div>
      </section>
    </main>
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue"
import { useHistory, usePlan, useIdiomStore, useQuizHistory } from "../stores/app"
import { localDateKey } from "../domain/memoryCurve"

const { history, clearHistory } = useHistory()
const { dailyTarget, learnedToday, progress: todayProgress, setTarget } = usePlan()
const { idioms: hotIdioms, fetchRandom } = useIdiomStore()
const { quizHistory } = useQuizHistory()
const homeTarget = ref<number | string>(dailyTarget.value)

watch(dailyTarget, value => {
  homeTarget.value = value
})

function saveHomeTarget() {
  setTarget(homeTarget.value)
  homeTarget.value = dailyTarget.value
}

const defaultHotIdioms = ["差强人意", "首当其冲", "空穴来风", "万人空巷", "不刊之论", "明日黄花"]

const coreModules = [
  { id: "dict", label: "词典大全", bg: "bg-cinnabar/10", iconColor: "text-cinnabar", to: "/dictionary" },
  { id: "hotspots", label: "热点搭配", bg: "bg-red-50", iconColor: "text-red-600", to: "/hotspots" },
  { id: "quiz", label: "刷题练习", bg: "bg-indigo/10", iconColor: "text-indigo", to: "/quiz" },
  { id: "review", label: "复习中心", bg: "bg-jade/10", iconColor: "text-jade", to: "/review-center" },
  { id: "mistakes", label: "错题本", bg: "bg-amber/10", iconColor: "text-amber-600", to: "/mistakes" },
  { id: "favorites", label: "收藏夹", bg: "bg-pink-50", iconColor: "text-pink-500", to: "/favorites" },
  { id: "path", label: "学习路径", bg: "bg-blue-50", iconColor: "text-blue-500", to: "/learning-path" },
]

const challengeDone = computed(() => {
  const today = localDateKey()
  const completed = quizHistory.value
    .filter(record => record.date === today)
    .reduce((sum, record) => sum + record.total, 0)
  return Math.min(10, completed)
})
const challengeProgress = computed(() => Math.round((challengeDone.value / 10) * 100))

const examDays = computed(() => {
  const exam = new Date("2026-11-29")
  const today = new Date()
  return Math.max(0, Math.ceil((exam.getTime() - today.getTime()) / 86400000))
})

onMounted(() => { fetchRandom(8) })
</script>

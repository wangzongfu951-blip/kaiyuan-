<template>
  <div class="min-h-dvh bg-bg">
    <!-- Header -->
    <header class="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-warm-gray/20">
      <div class="max-w-lg mx-auto px-4 h-12 flex items-center justify-between">
        <button @click="$router.back()" class="p-1 -ml-1">
          <svg class="w-5 h-5 text-ink-body" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 class="text-base font-bold text-ink-title">🧠 学习分析</h1>
        <div class="w-8"></div>
      </div>
    </header>

    <div class="max-w-lg mx-auto px-4 pb-8">
      <!-- Tabs -->
      <div class="flex bg-warm-gray/20 rounded-xl p-1 mt-3 mb-4">
        <button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id"
          class="flex-1 py-2 text-xs font-medium rounded-lg transition-all text-center"
          :class="activeTab === tab.id ? 'bg-white text-ink-title shadow-sm' : 'text-ink-muted'">
          {{ tab.icon }} {{ tab.label }}
        </button>
      </div>

      <!-- ===== 概览 Tab ===== -->
      <div v-if="activeTab === 'overview'">
        <!-- Stats Grid -->
        <div class="grid grid-cols-2 gap-3 mb-5">
          <div class="bg-white rounded-2xl p-4 shadow-sm">
            <p class="text-[10px] text-ink-muted mb-1">已学成语</p>
            <p class="text-2xl font-bold text-ink-title">{{ stats.totalLearned }}</p>
            <p class="text-[10px] text-ink-muted mt-0.5">目标 {{ stats.dailyTarget }}/天</p>
          </div>
          <div class="bg-white rounded-2xl p-4 shadow-sm">
            <p class="text-[10px] text-ink-muted mb-1">刷题正确率</p>
            <p class="text-2xl font-bold" :class="stats.accuracy >= 80 ? 'text-jade' : stats.accuracy >= 60 ? 'text-amber' : 'text-cinnabar'">
              {{ stats.accuracy }}%
            </p>
            <p class="text-[10px] text-ink-muted mt-0.5">共 {{ stats.totalQuizzes }} 题</p>
          </div>
          <div class="bg-white rounded-2xl p-4 shadow-sm">
            <p class="text-[10px] text-ink-muted mb-1">待复习</p>
            <p class="text-2xl font-bold" :class="stats.dueReview > 5 ? 'text-cinnabar' : 'text-indigo'">
              {{ stats.dueReview }}
            </p>
            <p class="text-[10px] text-ink-muted mt-0.5">个成语</p>
          </div>
          <div class="bg-white rounded-2xl p-4 shadow-sm">
            <p class="text-[10px] text-ink-muted mb-1">错题本</p>
            <p class="text-2xl font-bold text-cinnabar">{{ stats.totalMistakes }}</p>
            <p class="text-[10px] text-ink-muted mt-0.5">道错题</p>
          </div>
        </div>

        <!-- Weekly Accuracy Chart -->
        <div class="bg-white rounded-2xl p-4 shadow-sm mb-5">
          <p class="text-xs font-bold text-ink-title mb-3">📈 本周刷题趋势</p>
          <div class="flex items-end gap-1.5 h-24">
            <div v-for="(day, i) in weeklyStats" :key="i" class="flex-1 flex flex-col items-center gap-1">
              <div class="w-full flex flex-col items-center">
                <div class="w-full bg-warm-gray/30 rounded-t" :style="{ height: barHeight(day.total) + 'px' }">
                  <div class="w-full rounded-t transition-all"
                    :class="day.accuracy >= 80 ? 'bg-jade' : day.accuracy >= 60 ? 'bg-amber' : 'bg-cinnabar'"
                    :style="{ height: (day.total > 0 ? Math.max(4, barHeight(day.total) * day.accuracy / 100) : 0) + 'px' }"></div>
                </div>
              </div>
              <span class="text-[9px] text-ink-muted">{{ weekdayLabel(day.weekday) }}</span>
            </div>
          </div>
          <div class="flex items-center justify-center gap-4 mt-2">
            <div class="flex items-center gap-1"><div class="w-2 h-2 rounded bg-jade"></div><span class="text-[9px] text-ink-muted">≥80%</span></div>
            <div class="flex items-center gap-1"><div class="w-2 h-2 rounded bg-amber"></div><span class="text-[9px] text-ink-muted">60-80%</span></div>
            <div class="flex items-center gap-1"><div class="w-2 h-2 rounded bg-cinnabar"></div><span class="text-[9px] text-ink-muted">&lt;60%</span></div>
          </div>
        </div>

        <!-- Learning Progress -->
        <div class="bg-white rounded-2xl p-4 shadow-sm mb-5">
          <p class="text-xs font-bold text-ink-title mb-3">🎯 今日进度</p>
          <div class="flex items-center gap-3 mb-2">
            <div class="flex-1 h-3 bg-warm-gray/20 rounded-full overflow-hidden">
              <div class="h-full bg-gradient-to-r from-cinnabar to-cinnabar-light rounded-full transition-all duration-500"
                :style="{ width: stats.todayProgress + '%' }"></div>
            </div>
            <span class="text-xs font-bold text-ink-title">{{ stats.todayProgress }}%</span>
          </div>
          <p class="text-[10px] text-ink-muted">今日已学 {{ stats.todayLearned }} 个成语</p>
        </div>
      </div>

      <!-- ===== 洞察 Tab ===== -->
      <div v-if="activeTab === 'insights'">
        <!-- AI Insights -->
        <div v-if="insights.length > 0" class="space-y-3 mb-5">
          <div v-for="(insight, i) in insights" :key="i"
            class="bg-white rounded-2xl p-4 shadow-sm animate-slide-up"
            :class="'stagger-' + Math.min(i + 1, 6)">
            <div class="flex items-start gap-3">
              <div class="w-8 h-8 rounded-lg flex items-center justify-center text-base" :class="insight.bg">{{ insight.icon }}</div>
              <div class="flex-1">
                <p class="text-sm font-bold text-ink-title mb-1">{{ insight.title }}</p>
                <p class="text-xs text-ink-body leading-relaxed">{{ insight.detail }}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Weak Points -->
        <div v-if="weakPoints.length > 0" class="mb-5">
          <h3 class="text-xs font-bold text-ink-title mb-3 flex items-center gap-2">
            <span class="w-1 h-4 bg-cinnabar rounded-full"></span>薄弱环节
          </h3>
          <div class="space-y-3">
            <div v-for="(wp, i) in weakPoints" :key="i"
              class="bg-white rounded-2xl p-4 shadow-sm border-l-4 border-cinnabar animate-slide-up">
              <div class="flex items-center justify-between mb-2">
                <p class="text-sm font-bold text-ink-title">{{ wp.category }}</p>
                <span class="text-xs px-2 py-0.5 rounded-full bg-cinnabar/10 text-cinnabar font-medium">
                  错误 {{ wp.errorCount }} 次
                </span>
              </div>
              <p class="text-xs text-ink-body leading-relaxed">{{ wp.advice }}</p>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="insights.length === 0 && weakPoints.length === 0"
          class="text-center pt-16">
          <div class="text-5xl mb-4">📚</div>
          <p class="text-sm font-bold text-ink-title mb-1">暂无分析数据</p>
          <p class="text-xs text-ink-muted">开始刷题和学习后，Agent 会自动分析你的学习行为</p>
          <button @click="$router.push('/quiz')"
            class="mt-4 px-6 py-2.5 bg-cinnabar text-white text-xs font-bold rounded-xl btn-press">
            开始刷题 →
          </button>
        </div>
      </div>

      <!-- ===== 建议 Tab ===== -->
      <div v-if="activeTab === 'suggest'">
        <div v-if="suggestions.length > 0" class="space-y-3">
          <div v-for="(s, i) in suggestions" :key="i"
            class="bg-white rounded-2xl p-4 shadow-sm animate-slide-up"
            :class="'stagger-' + Math.min(i + 1, 6)">
            <div class="flex items-start gap-3">
              <span class="text-xl mt-0.5">{{ s.icon }}</span>
              <div class="flex-1">
                <div class="flex items-center gap-2 mb-1">
                  <p class="text-sm font-bold text-ink-title">{{ s.title }}</p>
                  <span class="text-[9px] px-1.5 py-0.5 rounded-full font-medium"
                    :class="{
                      'bg-cinnabar/10 text-cinnabar': s.priority === 'high',
                      'bg-amber/10 text-amber': s.priority === 'medium',
                      'bg-jade/10 text-jade': s.priority === 'low',
                    }">
                    {{ s.priority === 'high' ? '优先' : s.priority === 'medium' ? '建议' : '了解' }}
                  </span>
                </div>
                <p class="text-xs text-ink-body leading-relaxed">{{ s.detail }}</p>
                <button v-if="s.action" @click="handleAction(s)"
                  class="mt-2 px-3 py-1.5 text-[11px] font-medium bg-cinnabar/5 text-cinnabar rounded-lg btn-press">
                  {{ s.action }} →
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="mt-5">
          <p class="text-xs font-bold text-ink-title mb-3">⚡ 快捷入口</p>
          <div class="grid grid-cols-2 gap-3">
            <button v-for="action in quickActions" :key="action.label"
              @click="$router.push(action.to)"
              class="bg-white rounded-2xl p-4 shadow-sm text-left card-hover animate-slide-up">
              <div class="text-2xl mb-2">{{ action.icon }}</div>
              <p class="text-sm font-bold text-ink-title mb-0.5">{{ action.label }}</p>
              <p class="text-[10px] text-ink-muted">{{ action.desc }}</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAgentAnalysis } from '../../composables/useAgent'

const router = useRouter()
const { insights, weakPoints, suggestions, statsOverview: stats, weeklyStats } = useAgentAnalysis()

const activeTab = ref('overview')

const tabs = [
  { id: 'overview', label: '概览', icon: '📊' },
  { id: 'insights', label: '洞察', icon: '💡' },
  { id: 'suggest', label: '建议', icon: '📋' },
]

const quickActions = [
  { icon: '📖', label: '成语词典', desc: '查询完整成语库', to: '/dictionary' },
  { icon: '🎯', label: '错题本', desc: '回顾做错的题目', to: '/mistakes' },
  { icon: '🔄', label: '复习中心', desc: '艾宾浩斯复习', to: '/review-center' },
  { icon: '📊', label: '周报', desc: '本周学习报告', to: '/weekly-report' },
]

function barHeight(total: number) {
  const maxVal = Math.max(...weeklyStats.value.map(d => d.total), 1)
  return Math.max(4, Math.round((total / maxVal) * 80))
}

function weekdayLabel(day: number) {
  return ['日', '一', '二', '三', '四', '五', '六'][day] || ''
}

function handleAction(s: any) {
  if (s.action === '去复习') router.push('/review-center')
  else if (s.action === '查看错题') router.push('/mistakes')
  else if (s.action === '去学习') router.push('/dictionary')
}
</script>
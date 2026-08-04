/**
 * 本地 Agent 分析引擎
 * 无需调用 AI API，基于用户行为数据本地计算学习分析、错题诊断、个性化建议
 */
import { computed } from 'vue'
import { useHistory, useFavorites, usePlan, useReview, useMistakes, useQuizHistory } from '../stores/app'

export interface AnalysisInsight {
  type: 'warning' | 'tip' | 'achievement' | 'suggestion'
  icon: string
  title: string
  detail: string
}

export interface WeakPoint {
  category: string
  errorCount: number
  examples: string[]
  advice: string
}

export interface StudySuggestion {
  priority: 'high' | 'medium' | 'low'
  icon: string
  title: string
  detail: string
  action?: string
}

export function useAgentAnalysis() {
  const { mistakes } = useMistakes()
  const { getWeeklyStats } = useQuizHistory()
  const { dueToday } = useReview()
  const { plan } = usePlan()

  const weeklyStats = computed(() => getWeeklyStats())
  const totalQuizzes = computed(() => weeklyStats.value.reduce((s, d) => s + d.total, 0))
  const totalCorrect = computed(() => weeklyStats.value.reduce((s, d) => s + d.correct, 0))
  const accuracy = computed(() => totalQuizzes.value > 0 ? Math.round((totalCorrect.value / totalQuizzes.value) * 100) : 0)

  const errorCategoryMap = computed(() => {
    const map: Record<string, number> = {}
    mistakes.value.forEach(m => {
      const key = m.module || '未分类'
      map[key] = (map[key] || 0) + 1
    })
    return map
  })

  const weakPoints = computed<WeakPoint[]>(() => {
    const points: WeakPoint[] = []
    const map = errorCategoryMap.value
    const adviceMap: Record<string, string> = {
      '成语辨析': '建议每天重点复习高频易错成语，结合古籍原文理解本义，避免望文生义。',
      '语境填词': '逻辑填空需要把握语境和词语搭配，建议积累成语的典型用例。',
      '片段阅读': '片段阅读重点是找主题句，建议练习快速定位关键词和关联词。',
      '语句排序': '语句排序关注首尾句和逻辑衔接词，建议多练习语感训练。',
      '成语接龙': '语句填空需要注意上下文逻辑和代词指代，建议关注前后句关系。',
      '错题重练': '错题是最宝贵的学习资料，建议定期回顾并总结错误原因。',
    }
    for (const [cat, count] of Object.entries(map)) {
      if (count >= 2) {
        points.push({
          category: cat,
          errorCount: count,
          examples: mistakes.value.filter(m => m.module === cat).slice(0, 3).map(m => m.questionId),
          advice: adviceMap[cat] || '建议加强该模块的练习。',
        })
      }
    }
    points.sort((a, b) => b.errorCount - a.errorCount)
    return points
  })

  const suggestions = computed<StudySuggestion[]>(() => {
    const list: StudySuggestion[] = []
    const learned = plan.value.learned.length
    const target = plan.value.dailyTarget
    const dueCount = dueToday().length
    const acc = accuracy.value

    if (learned < target * 0.5) {
      list.push({
        priority: 'high',
        icon: '⏰',
        title: '今日学习量不足',
        detail: `已学习 ${learned}/${target} 个成语，还差 ${target - learned} 个达到今日目标。建议现在开始学习！`,
      })
    }

    if (dueCount > 5) {
      list.push({
        priority: 'high',
        icon: '📖',
        title: '复习任务积压',
        detail: `有 ${dueCount} 个成语待复习。根据艾宾浩斯遗忘曲线，及时复习能将记忆保持率提升至 90% 以上。`,
        action: '去复习',
      })
    } else if (dueCount > 0) {
      list.push({
        priority: 'medium',
        icon: '📝',
        title: `${dueCount} 个成语需要复习`,
        detail: '利用碎片时间快速过一遍，巩固记忆。',
        action: '去复习',
      })
    }

    if (totalQuizzes.value >= 5) {
      if (acc >= 85) {
        list.push({
          priority: 'low',
          icon: '🏆',
          title: `正确率优秀：${acc}%`,
          detail: '保持当前节奏，可以尝试更高难度的题目来突破瓶颈。',
        })
      } else if (acc >= 60) {
        list.push({
          priority: 'medium',
          icon: '💪',
          title: `正确率中等：${acc}%`,
          detail: '建议重点复习错题本中的成语，分析错误原因，避免重复犯错。',
          action: '查看错题',
        })
      } else {
        list.push({
          priority: 'high',
          icon: '⚠️',
          title: `正确率偏低：${acc}%`,
          detail: '建议先系统学习成语基础知识，理解词义后再刷题。可以使用词典功能查阅成语释义。',
          action: '去学习',
        })
      }
    }

    const wp = weakPoints.value
    if (wp.length > 0) {
      list.push({
        priority: 'high',
        icon: '💡',
        title: '发现薄弱环节',
        detail: `${wp[0].category} 模块错误次数较多（${wp[0].errorCount} 次），${wp[0].advice}`,
      })
    }

    if (learned >= target) {
      list.push({
        priority: 'low',
        icon: '✅',
        title: '今日目标已完成！',
        detail: `已学习 ${learned} 个成语，继续加油，多学多练。`,
      })
    }

    const streak = parseInt(localStorage.getItem('streak') || '0')
    if (streak >= 7) {
      list.push({
        priority: 'low',
        icon: '🔥',
        title: `连续学习 ${streak} 天`,
        detail: '坚持就是胜利！持续的学习是掌握成语的关键。',
      })
    }

    list.sort((a, b) => {
      const p = { high: 0, medium: 1, low: 2 }
      return p[a.priority] - p[b.priority]
    })

    return list
  })

  const insights = computed<AnalysisInsight[]>(() => {
    const list: AnalysisInsight[] = []

    if (mistakes.value.length > 0) {
      const recent = mistakes.value.slice(-10)
      const moduleCounts: Record<string, number> = {}
      recent.forEach(m => { moduleCounts[m.module] = (moduleCounts[m.module] || 0) + 1 })
      const topModule = Object.entries(moduleCounts).sort((a, b) => b[1] - a[1])[0]
      if (topModule) {
        list.push({
          type: 'warning',
          icon: '📊',
          title: '错题模式分析',
          detail: `最近 10 道错题中，「${topModule[0]}」模块错误 ${topModule[1]} 次，建议重点突破。`,
        })
      }
    }

    const totalInDb = 31095
    const learned = plan.value.learned.length
    if (learned > 0) {
      const pct = Math.round((learned / totalInDb) * 100)
      list.push({
        type: 'tip',
        icon: '📈',
        title: '学习进度',
        detail: `已掌握 ${learned} 个成语（占总量 ${pct}%），${pct < 1 ? '继续保持学习节奏' : pct < 5 ? '稳步前进中' : '进展不错'}。`,
      })
    }

    return list
  })

  const statsOverview = computed(() => ({
    totalLearned: plan.value.learned.length,
    dailyTarget: plan.value.dailyTarget,
    todayProgress: Math.min(100, Math.round((plan.value.learned.length / plan.value.dailyTarget) * 100)),
    todayLearned: plan.value.learned.length,
    totalQuizzes: totalQuizzes.value,
    accuracy: accuracy.value,
    totalMistakes: mistakes.value.length,
    dueReview: dueToday().length,
    weakPointsCount: weakPoints.value.length,
    streak: parseInt(localStorage.getItem('streak') || '0'),
  }))

  return {
    insights,
    weakPoints,
    suggestions,
    statsOverview,
    weeklyStats,
  }
}

export default useAgentAnalysis
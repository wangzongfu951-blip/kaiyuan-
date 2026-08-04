import { reactive, computed, watch, ref } from "vue"
import type { StudyPlan, ReviewRecord, MistakeRecord, ChatMessage, QuizModule } from "../types"
import { addDailyLearned, migrateStudyPlan, normalizeStudyTarget } from "../domain/studyPlan"
import { localDateKey, REVIEW_INTERVALS, scheduleInitialReview } from "../domain/memoryCurve"
import { getStaticRandomIdioms } from "../services/dictionary-static"

export interface FeynmanRecord {
  idiom: string
  userExplanation: string
  standardExplanation: string
  timestamp: string
  mastered: boolean
}

function loadJSON<T>(key: string, fallback: T): T {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) as T : fallback } catch { return fallback }
}
function saveJSON(key: string, val: unknown) { localStorage.setItem(key, JSON.stringify(val)) }

const state = reactive({
  searchHistory: loadJSON<string[]>("history", []),
  favorites: loadJSON<string[]>("favorites", []),
  plan: migrateStudyPlan(loadJSON<Partial<StudyPlan>>("plan", {})),
  reviews: loadJSON<ReviewRecord[]>("reviews", []),
  mistakes: loadJSON<MistakeRecord[]>("mistakes", []),
  chatHistory: loadJSON<ChatMessage[]>("chat", []),
  streak: loadJSON<number>("streak", 0),
  lastStudyDate: loadJSON<string>("lastStudyDate", ""),
  weeklyStudy: loadJSON<number[]>("weeklyStudy", [0, 0, 0, 0, 0, 0, 0]),
  calendarData: loadJSON<Record<string, number>>("calendarData", {}),
  quizHistory: loadJSON<{ date: string; total: number; correct: number }[]>("quizHistory", []),
  feynmanHistory: loadJSON<FeynmanRecord[]>("feynmanHistory", []),
})

watch(() => state.searchHistory, (v) => saveJSON("history", v), { deep: true })
watch(() => state.favorites, (v) => saveJSON("favorites", v), { deep: true })
watch(() => state.plan, (v) => saveJSON("plan", v), { deep: true })
watch(() => state.reviews, (v) => saveJSON("reviews", v), { deep: true })
watch(() => state.mistakes, (v) => saveJSON("mistakes", v), { deep: true })
watch(() => state.chatHistory, (v) => saveJSON("chat", v), { deep: true })
watch(() => state.streak, (v) => saveJSON("streak", v))
watch(() => state.lastStudyDate, (v) => saveJSON("lastStudyDate", v))
watch(() => state.weeklyStudy, (v) => saveJSON("weeklyStudy", v), { deep: true })
watch(() => state.calendarData, (v) => saveJSON("calendarData", v), { deep: true })
watch(() => state.quizHistory, (v) => saveJSON("quizHistory", v), { deep: true })
watch(() => state.feynmanHistory, (v) => saveJSON("feynmanHistory", v), { deep: true })

function updateStreak() {
  const today = localDateKey()
  const yesterday = localDateKey(new Date(Date.now() - 86400000))
  if (state.lastStudyDate === today) return
  if (state.lastStudyDate === yesterday) { state.streak++ }
  else if (state.lastStudyDate !== today) { state.streak = 1 }
  state.lastStudyDate = today
  const dayIndex = new Date().getDay()
  state.weeklyStudy[dayIndex === 0 ? 6 : dayIndex - 1]++
  state.calendarData[today] = (state.calendarData[today] || 0) + 1
}

export function useHistory() {
  function add(word: string) { state.searchHistory = [word, ...state.searchHistory.filter(w => w !== word)].slice(0, 30) }
  function clearHistory() { state.searchHistory = [] }
  return { history: computed(() => state.searchHistory), add, clearHistory }
}

export function useFavorites() {
  function toggle(idiom: string) { const i = state.favorites.indexOf(idiom); i >= 0 ? state.favorites.splice(i, 1) : state.favorites.push(idiom) }
  function isFavorite(idiom: string) { return state.favorites.includes(idiom) }
  function clearAll() { state.favorites = [] }
  return { favorites: computed(() => state.favorites), toggle, toggleFavorite: toggle, isFavorite, clearAll }
}

export function usePlan() {
  function setTarget(n: number | string) {
    state.plan.dailyTarget = normalizeStudyTarget(n, state.plan.dailyTarget)
  }
  function markLearned(idiom: string) {
    const word = idiom.trim()
    if (!word || state.plan.learned.includes(word)) return false

    state.plan.learned.push(word)
    addDailyLearned(state.plan, word, localDateKey())
    if (!state.reviews.some(record => record.idiom === word)) {
      state.reviews.push(scheduleInitialReview(word))
    }
    updateStreak()
    return true
  }
  function todayLearned() {
    return state.plan.dailyLearned[localDateKey()]?.length ?? 0
  }
  function progress() {
    return Math.min(100, Math.round((todayLearned() / state.plan.dailyTarget) * 100))
  }
  function getWeekLearning() {
    const now = new Date()
    const day = now.getDay()
    const mondayOffset = day === 0 ? -6 : 1 - day
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(now)
      date.setDate(now.getDate() + mondayOffset + index)
      const key = localDateKey(date)
      return { date: key, count: state.plan.dailyLearned[key]?.length ?? 0 }
    })
  }
  const dailyTarget = computed(() => state.plan.dailyTarget)
  const learnedToday = computed(() => todayLearned())
  const weekLearning = computed(() => getWeekLearning())
  return {
    plan: computed(() => state.plan),
    setTarget,
    markLearned,
    todayLearned,
    progress,
    dailyTarget,
    learnedToday,
    weekLearning,
  }
}

export function useReview() {
  function schedule(idiom: string) {
    const existing = state.reviews.find(r => r.idiom === idiom)
    if (existing) return
    state.reviews.push(scheduleInitialReview(idiom))
  }
  function markReviewed(idiom: string) {
    const r = state.reviews.find(x => x.idiom === idiom)
    if (r) {
      r.level = Math.min(r.level + 1, REVIEW_INTERVALS.length - 1)
      const now = new Date()
      r.lastReview = localDateKey(now)
      const nextReview = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + REVIEW_INTERVALS[r.level],
      )
      r.nextReview = localDateKey(nextReview)
    }
  }
  function dueToday(): ReviewRecord[] {
    const today = localDateKey()
    return state.reviews.filter(r => r.nextReview <= today)
  }
  function allReviews() { return state.reviews }
  const records = computed(() => state.reviews)
  return { schedule, markReviewed, dueToday, allReviews, records }
}

export function useMistakes() {
  function add(qId: string, module: string, wrong: number, correct: number) {
    state.mistakes.push({ questionId: qId, module: module as QuizModule, wrongAnswer: wrong, correctAnswer: correct, timestamp: new Date().toISOString() })
  }
  function clearMistakes() { state.mistakes = [] }
  return { mistakes: computed(() => state.mistakes), add, clearMistakes }
}

export function useChat() {
  function addMsg(msg: { role: "user" | "assistant"; content: string; time?: string }) {
    state.chatHistory.push({ role: msg.role, content: msg.content, timestamp: msg.time || new Date().toISOString() })
  }
  function clearChat() { state.chatHistory = [] }
  return { messages: computed(() => state.chatHistory), addMsg, clearChat }
}

export function useCalendar() {
  function getDays(count: number) {
    const days = []
    const now = new Date()
    for (let i = count - 1; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const key = date.toISOString().slice(0, 10)
      days.push({ date: key, day: date.getDate(), month: date.getMonth(), weekday: date.getDay(), count: state.calendarData[key] || 0 })
    }
    return days
  }
  function recordStudy(activity: number = 1) {
    const today = localDateKey()
    state.calendarData[today] = (state.calendarData[today] || 0) + activity
  }
  return { getDays, recordStudy, calendarData: computed(() => state.calendarData) }
}

export function useQuizHistory() {
  function recordQuiz(total: number, correct: number) {
    const today = localDateKey()
    state.quizHistory.push({ date: today, total, correct })
  }
  function getWeeklyStats() {
    const now = new Date()
    const days = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = localDateKey(d)
      const dayRecords = state.quizHistory.filter(r => r.date === key)
      const totalQ = dayRecords.reduce((s, r) => s + r.total, 0)
      const correctQ = dayRecords.reduce((s, r) => s + r.correct, 0)
      days.push({ date: key, weekday: d.getDay(), total: totalQ, correct: correctQ, accuracy: totalQ > 0 ? Math.round((correctQ / totalQ) * 100) : 0 })
    }
    return days
  }
  const quizHistory = computed(() => state.quizHistory)
  return { recordQuiz, getWeeklyStats, quizHistory }
}

export function useStats() {
  const streak = computed(() => state.streak)
  const weeklyStudy = computed(() => state.weeklyStudy)
  const totalLearned = computed(() => state.plan.learned.length)
  const totalReviewed = computed(() => state.reviews.length)
  const totalMistakes = computed(() => state.mistakes.length)
  return { streak, weeklyStudy, totalLearned, totalReviewed, totalMistakes }
}

export function useIdiomStore() {
  const idioms = ref<any[]>([])
  const loading = ref(false)

  async function fetchRandom(count = 10) {
    loading.value = true
    try {
      if (import.meta.env.VITE_STATIC_PAGES === 'true') {
        idioms.value = await getStaticRandomIdioms(count)
      } else {
        const host = window.location.hostname
        const res = await fetch(`http://${host}:3000/api/idioms/random?count=${count}`)
        if (!res.ok) throw new Error(`idiom API ${res.status}`)
        const data = await res.json()
        idioms.value = data.data || []
      }
    } catch {
      idioms.value = await getStaticRandomIdioms(count).catch(() => [])
    } finally {
      loading.value = false
    }
  }

  return { idioms, loading, fetchRandom }
}

export function useFeynman() {
  function saveExplanation(idiom: string, userExplanation: string, standardExplanation: string) {
    const existing = state.feynmanHistory.find(f => f.idiom === idiom)
    if (existing) {
      existing.userExplanation = userExplanation
      existing.standardExplanation = standardExplanation
      existing.timestamp = new Date().toISOString()
    } else {
      state.feynmanHistory.push({
        idiom,
        userExplanation,
        standardExplanation,
        timestamp: new Date().toISOString(),
        mastered: false
      })
    }
  }
  function markMastered(idiom: string) {
    const existing = state.feynmanHistory.find(f => f.idiom === idiom)
    if (existing) existing.mastered = true
  }
  function getRecord(idiom: string) {
    return state.feynmanHistory.find(f => f.idiom === idiom)
  }
  function getHistory() {
    return [...state.feynmanHistory].sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  }
  return {
    records: computed(() => state.feynmanHistory),
    saveExplanation,
    markMastered,
    getRecord,
    getHistory
  }
}

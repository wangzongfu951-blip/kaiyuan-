<template>
  <div class="min-h-dvh pb-safe bg-bg">
    <nav class="sticky top-0 z-40 bg-bg/90 backdrop-blur-xl border-b border-warm-gray/20">
      <div class="max-w-lg mx-auto px-4 h-12 flex items-center justify-between">
        <button @click="handleBack" class="flex items-center gap-1 text-[13px] text-ink-body hover:text-ink transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
          返回
        </button>
        <span class="text-[13px] font-bold text-ink">{{ moduleInfo.name }}</span>
        <span v-if="started && !finished" class="text-[12px] text-ink-muted font-medium">{{ current + 1 }}/{{ questions.length }}</span>
        <span v-else class="w-12"></span>
      </div>
    </nav>

    <div class="max-w-lg mx-auto px-4 pt-4">
      <!-- Progress + Timer -->
      <div v-if="started && !finished" class="flex items-center gap-3 mb-5">
        <div class="flex-1 h-1.5 bg-warm-gray/30 rounded-full overflow-hidden">
          <div class="h-full bg-gradient-to-r from-cinnabar to-red-500 rounded-full transition-all duration-500" :style="{width: ((current+1)/questions.length*100)+'%'}"></div>
        </div>
        <div v-if="timedMode" class="flex items-center gap-1 shrink-0 px-2 py-1 rounded-full" :class="timeLeft <= 10 ? 'bg-red-50' : 'bg-warm-gray/20'">
          <svg class="w-3.5 h-3.5" :class="timeLeft <= 10 ? 'text-cinnabar' : 'text-ink-muted'" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span class="text-[12px] font-mono font-bold" :class="timeLeft <= 10 ? 'text-cinnabar' : 'text-ink-muted'">{{ formatTime(timeLeft) }}</span>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="fetching" class="text-center py-12">
        <div class="animate-spin w-8 h-8 border-2 border-cinnabar border-t-transparent rounded-full mx-auto mb-3"></div>
        <p class="text-sm text-ink-muted">正在加载题目...</p>
      </div>

      <!-- Pre-quiz Setup -->
      <div v-if="!started && !fetching">
        <div class="bg-white rounded-2xl shadow-sm overflow-hidden mb-4 animate-fade-up">
          <div class="bg-gradient-to-r from-cinnabar to-red-600 px-5 py-6 text-white">
            <h2 class="text-[20px] font-serif font-bold mb-1">{{ moduleInfo.name }}</h2>
            <p class="text-[12px] text-white/70">{{ moduleInfo.desc }}</p>
            <div class="flex items-center gap-4 mt-3">
              <span class="text-[11px] bg-white/15 px-2 py-0.5 rounded-full">共 {{ allQuestions.length }} 题</span>
              <span class="text-[11px] bg-white/15 px-2 py-0.5 rounded-full">支持计时模式</span>
            </div>
          </div>
        </div>

        <div class="bg-white rounded-2xl shadow-sm p-5 mb-4 animate-fade-up">
          <h3 class="text-[14px] font-bold text-ink mb-4 flex items-center gap-2"><span>⚙️</span> 练习设置</h3>
          <div class="mb-5">
            <p class="text-[12px] text-ink-body font-medium mb-2.5">难度筛选</p>
            <div class="grid grid-cols-4 gap-2">
              <button v-for="d in ['全部','基础','中等','较难']" :key="d" @click="selectedDifficulty = d"
                class="py-2 rounded-xl text-[12px] font-medium transition-all"
                :class="selectedDifficulty === d ? 'bg-cinnabar text-white' : 'bg-warm-gray/20 text-ink-body'">{{ d }}</button>
            </div>
          </div>
          <div class="mb-5">
            <p class="text-[12px] text-ink-body font-medium mb-2.5">计时模式</p>
            <div class="grid grid-cols-3 gap-2">
              <button v-for="t in [{l:'无限时',v:0},{l:'30秒/题',v:30},{l:'60秒/题',v:60}]" :key="t.v" @click="timePerQ = t.v"
                class="py-2 rounded-xl text-[12px] font-medium transition-all"
                :class="timePerQ === t.v ? 'bg-indigo text-white' : 'bg-warm-gray/20 text-ink-body'">{{ t.l }}</button>
            </div>
          </div>
          <button data-testid="start-quiz" @click="startQuiz" class="w-full py-3.5 rounded-xl bg-gradient-to-r from-cinnabar to-red-600 text-white text-[14px] font-bold btn-press">
            开始练习
          </button>
        </div>

        <div class="bg-white rounded-2xl shadow-sm p-5">
          <h3 class="text-[14px] font-bold text-ink mb-3">题目分布</h3>
          <div class="space-y-2.5">
            <div v-for="d in diffStats" :key="d.label" class="flex items-center gap-3">
              <span class="text-[12px] text-ink-body w-10">{{ d.label }}</span>
              <div class="flex-1 h-2 bg-warm-gray/20 rounded-full overflow-hidden">
                <div class="h-full rounded-full transition-all" :class="d.color" :style="{width: d.pct+'%'}"></div>
              </div>
              <span class="text-[11px] text-ink-muted w-8 text-right">{{ d.count }}题</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Question -->
      <div v-if="started && !finished && questions.length > 0">
        <div class="bg-white rounded-2xl shadow-sm overflow-hidden mb-4 animate-fade-up">
          <div class="px-5 py-4 border-b border-warm-gray/10">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-[10px] px-2 py-0.5 rounded-full font-medium" :class="getDiffClass(questions[current].difficulty)">
                {{ questions[current].difficulty }}
              </span>
              <span class="text-[10px] text-ink-muted">{{ questions[current].type }}</span>
            </div>
            <p class="text-[14px] text-ink leading-relaxed">{{ questions[current].question }}</p>
          </div>
          <div class="p-4 space-y-2.5">
            <button v-for="(opt, i) in questions[current].options" :key="i" data-testid="quiz-option" @click="selectAnswer(i)"
              class="w-full text-left px-4 py-3 rounded-xl border-[1.5px] text-[13px] leading-relaxed transition-all duration-200 btn-press"
              :class="getOptionClass(i)">
              <div class="flex items-start gap-3">
                <span class="w-5 h-5 rounded-full border-[1.5px] flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5 transition-all"
                  :class="getCircleClass(i)">
                  {{ answered && i === questions[current].answer ? '✓' : (answered && i === selected && !isCorrect ? '✗' : optionLabels[i]) }}
                </span>
                <span>{{ opt }}</span>
              </div>
            </button>
          </div>
        </div>

        <!-- Explanation -->
        <div v-if="answered" class="mb-4 animate-fade-up" data-testid="quiz-explanation">
          <div class="rounded-2xl p-4" :class="isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-lg">{{ isCorrect ? '✅' : '❌' }}</span>
              <span class="text-[13px] font-bold" :class="isCorrect ? 'text-green-700' : 'text-red-700'">
                {{ isCorrect ? '回答正确！' : '回答错误' }}
              </span>
            </div>
            <p class="text-[12px] leading-relaxed" :class="isCorrect ? 'text-green-800' : 'text-red-800'">
              {{ questions[current].explanation }}
            </p>
          </div>
          <div v-if="questions[current].word" class="mt-3 space-y-2">
            <button
              type="button"
              class="min-h-10 w-full rounded-xl border border-gray-200 bg-white text-[12px] font-medium text-ink-body active:bg-gray-50"
              @click="openCurrentDetail"
            >
              查看词条完整解析
            </button>
            <div class="grid grid-cols-2 gap-2">
              <button
                type="button"
                class="min-h-11 rounded-xl bg-gray-100 text-[13px] font-bold text-ink-body active:bg-gray-200"
                data-testid="study-forgot"
                @click="finishCurrentWord(false)"
              >
                还没记住
              </button>
              <button
                type="button"
                class="min-h-11 rounded-xl bg-cinnabar text-[13px] font-bold text-white active:opacity-80"
                data-testid="study-remembered"
                @click="finishCurrentWord(true)"
              >
                记住了
              </button>
            </div>
          </div>
          <button
            v-else
            type="button"
            class="mt-3 w-full rounded-xl bg-cinnabar py-3 text-[13px] font-bold text-white btn-press"
            @click="nextQuestion"
          >
            {{ current < questions.length - 1 ? '下一题 →' : '查看结果' }}
          </button>
        </div>
      </div>

      <!-- Result -->
      <div v-if="finished" class="animate-fade-up">
        <div class="bg-white rounded-2xl shadow-sm p-6 text-center mb-4">
          <div class="text-5xl mb-3 animate-bounce-in">{{ score >= 80 ? '🎉' : score >= 60 ? '👍' : '💪' }}</div>
          <h2 class="text-[22px] font-bold text-ink mb-1">{{ score }}分</h2>
          <p class="text-[13px] text-ink-muted mb-4">答对 {{ correctCount }}/{{ questions.length }} 题</p>
          <div class="grid grid-cols-3 gap-3 mb-5">
            <div class="bg-green-50 rounded-xl p-3">
              <p class="text-lg font-bold text-green-600">{{ correctCount }}</p>
              <p class="text-[10px] text-green-700">正确</p>
            </div>
            <div class="bg-red-50 rounded-xl p-3">
              <p class="text-lg font-bold text-red-600">{{ questions.length - correctCount }}</p>
              <p class="text-[10px] text-red-700">错误</p>
            </div>
            <div class="bg-blue-50 rounded-xl p-3">
              <p class="text-lg font-bold text-blue-600">{{ formatTime(totalTime) }}</p>
              <p class="text-[10px] text-blue-700">用时</p>
            </div>
          </div>
          <div class="flex gap-3">
            <button @click="restart" class="flex-1 py-3 bg-warm-gray/20 text-ink-body rounded-xl text-[13px] font-medium btn-press">重新练习</button>
            <button @click="router.push('/quiz')" class="flex-1 py-3 bg-cinnabar text-white rounded-xl text-[13px] font-medium btn-press">返回刷题中心</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiGet } from '../../api'
import { useQuizHistory, useMistakes, usePlan } from '../../stores/app'
import { useSafeBack } from '../../composables/useSafeBack'
import { getStaticHighFrequencyIdioms, getStaticRandomIdioms } from '../../services/dictionary-static'
import { getQuizQuestions } from '../../data/quiz'
import { getStaticExamPaper, toQuizQuestion } from '../../services/quiz-static'

interface RawIdiomQ {
  id: number; idiom: string; pinyin: string; explanation: string; exam_trap: string; category?: string; context?: string; modern_example?: string; frequency?: string; examOccurrences?: Array<{ passage?: string; termRole?: string; highlightTerm?: string }>
}
interface RawPaperQ {
  id: number; title: string; question_text: string; options: string; answer: string; answer_explanation: string; difficulty: string | number; related_idioms?: string; question_type?: string
}
interface QuizQ {
  id: string; question: string; options: string[]; answer: number; explanation: string; difficulty: string; type: string; word?: string
}

const route = useRoute()
const router = useRouter()
const { safeBack } = useSafeBack('/quiz')
const { recordQuiz } = useQuizHistory()
const { add: addMistake } = useMistakes()
const { markLearned } = usePlan()

const moduleIdMap: Record<string, string> = {
  "idiom-usage": "成语辨析",
  "word-fill": "语境填词",
  "reading": "片段阅读",
  "judgment": "语句排序",
  "quantitative": "成语接龙",
  "data-analysis": "错题重练",
}

const moduleInfo = computed(() => {
  const rawId = route.params.module as string
  const name = moduleIdMap[rawId] || rawId
  const descs: Record<string, string> = {
    "成语辨析": "考察易错成语的真实含义、感情色彩与语境适用",
    "语境填词": "根据上下文语境选择最恰当的成语填入",
    "片段阅读": "理解文段主旨与成语运用能力",
    "语句排序": "将打乱的句子重新排列",
    "成语接龙": "练习成语首尾字接龙，扩展储备",
    "错题重练": "针对之前做错的题目强化训练",
  }
  return { name, desc: descs[name] || "开始成语练习" }
})

const optionLabels = ['A', 'B', 'C', 'D']

const fetching = ref(true)
const allQuestions = ref<QuizQ[]>([])
const selectedDifficulty = ref("全部")
const timePerQ = ref(0)
const started = ref(false)
const current = ref(0)
const selected = ref(-1)
const answered = ref(false)
const correctCount = ref(0)
const finished = ref(false)
const timeLeft = ref(0)
const totalTime = ref(0)
let timer: ReturnType<typeof setInterval> | null = null

const questions = computed(() => {
  const all = allQuestions.value
  if (selectedDifficulty.value === '全部') return all
  return all.filter(q => q.difficulty === selectedDifficulty.value)
})

const timedMode = computed(() => timePerQ.value > 0)
const isCorrect = computed(() => selected.value === questions.value[current.value]?.answer)
const score = computed(() => questions.value.length > 0 ? Math.round((correctCount.value / questions.value.length) * 100) : 0)

const diffStats = computed(() => {
  const total = allQuestions.value.length || 1
  const easy = allQuestions.value.filter(q => q.difficulty === '基础').length
  const mid = allQuestions.value.filter(q => q.difficulty === '中等').length
  const hard = allQuestions.value.filter(q => q.difficulty === '较难').length
  return [
    { label: '基础', count: easy, pct: (easy/total)*100, color: 'bg-jade' },
    { label: '中等', count: mid, pct: (mid/total)*100, color: 'bg-amber-500' },
    { label: '较难', count: hard, pct: (hard/total)*100, color: 'bg-cinnabar' },
  ]
})

function formatTime(s: number) { const m = Math.floor(s/60); const sec = s % 60; return m > 0 ? m + ':' + String(sec).padStart(2,'0') : sec + 's' }
function getDiffClass(d: string) { if (d === '较难') return 'bg-red-50 text-cinnabar'; if (d === '中等') return 'bg-amber-50 text-amber-700'; return 'bg-green-50 text-green-700' }
function getOptionClass(i: number) {
  if (!answered.value) return 'bg-white border-warm-gray/30 hover:border-cinnabar/40 hover:bg-red-50/20'
  if (i === questions.value[current.value].answer) return 'bg-green-50 border-green-500'
  if (i === selected.value && !isCorrect.value) return 'bg-red-50 border-cinnabar'
  return 'bg-white border-warm-gray/15 opacity-40'
}
function getCircleClass(i: number) {
  if (!answered.value) return 'border-warm-gray text-ink-muted'
  if (i === questions.value[current.value].answer) return 'border-green-500 bg-green-500 text-white'
  if (i === selected.value && !isCorrect.value) return 'border-cinnabar bg-cinnabar text-white'
  return 'border-warm-gray/30 text-ink-muted/40'
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function cleanDefinition(text: unknown): string {
  return String(text || '')
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[【\[]?(?:正确含义|核心考点|释义|解释)[】\]:：]\s*/u, '')
    .replace(/(?:易误解为|误解为|错误理解为)[：:]?[\s\S]*$/u, '')
    .trim()
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function idiomContext(item: RawIdiomQ): string {
  const occurrences = Array.isArray(item.examOccurrences) ? item.examOccurrences : []
  const source = occurrences.find((occurrence) => occurrence?.passage?.trim())?.passage?.trim()
    || item.modern_example?.trim()
    || item.context?.trim()
    || ''
  if (!source) return '请根据语境选择最恰当的成语：______。'
  const target = item.idiom || ''
  let question = target ? source.replace(new RegExp(escapeRegex(target), 'g'), '______') : source
  if (question === source) question = source.replace(/_{2,}|…{2,}|（\s*）|\(\s*\)/u, '______')
  if (!question.includes('______')) question = `${source} 请根据语境选择最恰当的成语：______。`
  return question
}

function generateIdiomQuestion(item: RawIdiomQ, candidatePool: RawIdiomQ[] = []): QuizQ {
  const target = item.idiom
  const options: string[] = []
  for (const row of shuffleArray([item, ...candidatePool])) {
    const idiom = String(row?.idiom || '').trim()
    if (!idiom || options.includes(idiom)) continue
    options.push(idiom)
    if (options.length >= 4) break
  }
  for (const fallback of ['因地制宜', '按部就班', '相得益彰', '循序渐进', '实事求是', '一脉相承']) {
    if (!options.includes(fallback) && options.length < 4 && fallback !== target) options.push(fallback)
  }
  if (!options.includes(target)) options.unshift(target)
  const allOptions = shuffleArray(options.slice(0, 4))
  const correctIdx = allOptions.indexOf(target)
  const diff = item.category === '望文生义' ? '较难' : (item.frequency === '高频' ? '中等' : '基础')
  return {
    id: `idiom-${item.id}`,
    question: idiomContext(item),
    options: allOptions,
    answer: correctIdx,
    explanation: `${item.idiom}：${cleanDefinition(item.explanation) || '请结合语境理解其固定含义。'}${item.exam_trap ? `。${item.exam_trap}` : ''}`,
    difficulty: diff,
    type: '成语辨析',
    word: item.idiom,
  }
}

function generatePaperQuestion(item: RawPaperQ): QuizQ {
  let options: string[]
  try {
    const parsed = typeof item.options === 'string' ? JSON.parse(item.options) : item.options
    if (Array.isArray(parsed)) {
      options = parsed.map((option) => String(option))
    } else if (parsed && typeof parsed === 'object') {
      options = Object.entries(parsed as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([label, option]) => `${label}. ${String(option)}`)
    } else {
      options = []
    }
  } catch {
    options = []
  }
  options = options.filter(Boolean)
  // Parse answer
  let answerIdx = 0
  const ans = String(item.answer).trim()
  const numericAnswer = Number(ans)
  if (Number.isInteger(numericAnswer) && numericAnswer >= 0 && numericAnswer < options.length) {
    answerIdx = numericAnswer
  } else {
    // Letter-based answers are the format used by the local real-exam rows.
    const letter = ans.match(/[A-H]/i)?.[0]?.toUpperCase() || ''
    const letterIdx = 'ABCDEFGH'.indexOf(letter)
    if (letterIdx >= 0 && letterIdx < options.length) answerIdx = letterIdx
  }
  // Clean options: strip "A. " prefix
  options = options.map(o => o.replace(/^[A-Ha-h][.、．)）]\s*/, '').trim())
  if (options.length === 0) options = ['暂无可用选项']
  if (answerIdx >= options.length) answerIdx = 0
  
  const diff = typeof item.difficulty === 'string' ? item.difficulty :
    (Number(item.difficulty) >= 4 ? '较难' : Number(item.difficulty) >= 2 ? '中等' : '基础')
  
  return {
    id: `paper-${item.id}`,
    question: item.question_text,
    options,
    answer: answerIdx,
    explanation: item.answer_explanation || '暂无解析',
    difficulty: diff,
    type: item.question_type || '综合'
  }
}

function staticModuleName(): string {
  return moduleIdMap[String(route.params.module)] || '成语辨析'
}

function mapStaticQuestion(question: ReturnType<typeof toQuizQuestion>): QuizQ {
  return { ...question }
}

function toRawPaperQuestion(row: Awaited<ReturnType<typeof getStaticExamPaper>>): RawPaperQ | null {
  if (!row) return null
  return {
    id: row.id,
    title: row.title,
    question_text: row.question_text,
    options: JSON.stringify(row.options),
    answer: row.answer,
    answer_explanation: row.answer_explanation,
    difficulty: row.difficulty,
    related_idioms: JSON.stringify(row.related_idioms),
    question_type: row.question_type,
  }
}

async function loadLocalQuestions(): Promise<QuizQ[]> {
  const paperId = typeof route.query.paper === 'string' ? route.query.paper : ''
  if (paperId) {
    const rawPaperQuestion = toRawPaperQuestion(await getStaticExamPaper(paperId))
    return rawPaperQuestion ? [generatePaperQuestion(rawPaperQuestion)] : []
  }

  const highFrequencyFocus = route.query.focus === 'high-frequency'
  const curated = getQuizQuestions(staticModuleName()).map(toQuizQuestion).map(mapStaticQuestion)
  const curatedContextQuestions = curated.filter((question) => /_{2,}|填入|使用/u.test(question.question))
  if (staticModuleName() === '成语辨析') {
    const idioms = highFrequencyFocus
      ? await getStaticHighFrequencyIdioms(30)
      : await getStaticRandomIdioms(30)
    const generated = idioms.map((item) => generateIdiomQuestion(item, idioms))
    return highFrequencyFocus ? shuffleArray(generated) : shuffleArray([...curatedContextQuestions, ...generated])
  }
  if (curated.length > 0) return shuffleArray(curated)

  const idioms = await getStaticRandomIdioms(30)
  return shuffleArray(idioms.map((item) => generateIdiomQuestion(item, idioms)))
}

function isRealPaperRow(item: RawPaperQ): boolean {
  const title = String(item.title || '')
  // The API also contains generated “专项练习” rows. They are useful as
  // dictionary drills, but the 真题库 must not present them as past exams.
  return /\d{4}年/.test(title) && !/(专项练习|辨析|词义)/u.test(title)
}

async function fetchQuestions() {
  fetching.value = true
  try {
    // Static Pages and an explicit 真题 card both use the checked-in local
    // corpus. This keeps the practice loop usable when no backend is running.
    if (import.meta.env.VITE_STATIC_PAGES === 'true' || route.query.paper) {
      allQuestions.value = await loadLocalQuestions()
      return
    }

    const res = await apiGet<{ ok: boolean; data: { idiomQuestions: RawIdiomQ[]; paperQuestions: RawPaperQ[] } }>(
      '/api/quiz/questions', { module: moduleInfo.value.name, limit: 30 }
    )
    const highFrequencyFocus = route.query.focus === 'high-frequency'
    const sourceIdioms = (res.data?.idiomQuestions || [])
      .filter((item) => !highFrequencyFocus || item.frequency === '高频')
    const idiomQs = sourceIdioms.map((item) => generateIdiomQuestion(item, sourceIdioms))
    const paperQs = (res.data?.paperQuestions || [])
      .filter(isRealPaperRow)
      .map(generatePaperQuestion)
    allQuestions.value = shuffleArray([...idiomQs, ...paperQs])
    if (allQuestions.value.length === 0 || (highFrequencyFocus && idiomQs.length === 0)) allQuestions.value = await loadLocalQuestions()
  } catch {
    try { allQuestions.value = await loadLocalQuestions() } catch { allQuestions.value = [] }
  } finally {
    fetching.value = false
  }
}

function startQuiz() {
  if (questions.value.length === 0) return
  started.value = true
  current.value = 0
  selected.value = -1
  answered.value = false
  correctCount.value = 0
  finished.value = false
  if (timedMode.value) { timeLeft.value = timePerQ.value; startTimer() }
}

function startTimer() {
  stopTimer()
  timeLeft.value = timePerQ.value
  timer = setInterval(() => {
    timeLeft.value--
    totalTime.value++
    if (timeLeft.value <= 0) { selectAnswer(-1); setTimeout(nextQuestion, 1000) }
  }, 1000)
}

function stopTimer() { if (timer) { clearInterval(timer); timer = null } }

function selectAnswer(i: number) {
  if (answered.value) return
  stopTimer()
  selected.value = i
  answered.value = true
  if (i === questions.value[current.value].answer) correctCount.value++
  else addMistake(questions.value[current.value].id, moduleInfo.value.name, i, questions.value[current.value].answer)
}

function nextQuestion() {
  if (current.value < questions.value.length - 1) {
    current.value++; selected.value = -1; answered.value = false
    if (timedMode.value) startTimer()
  } else {
    finished.value = true; stopTimer()
    recordQuiz(questions.value.length, correctCount.value)
  }
}

function openCurrentDetail() {
  const word = questions.value[current.value]?.word
  if (word) router.push(`/result/${encodeURIComponent(word)}`)
}

function finishCurrentWord(remembered: boolean) {
  const word = questions.value[current.value]?.word
  if (remembered && word) markLearned(word)
  nextQuestion()
}

function handleBack() {
  if (started.value && !finished.value) {
    if (confirm('确定退出练习？当前进度将不会保存。')) { stopTimer(); safeBack() }
  } else { safeBack() }
}

function restart() {
  stopTimer()
  started.value = false; current.value = 0; selected.value = -1; answered.value = false
  correctCount.value = 0; finished.value = false; totalTime.value = 0
}

onMounted(fetchQuestions)
onUnmounted(stopTimer)
</script>

<style scoped>
.pb-safe { padding-bottom: env(safe-area-inset-bottom, 0px); }
.font-serif { font-family: 'Noto Serif SC', 'KaiTi', serif; }
</style>

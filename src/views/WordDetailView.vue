<template>
  <div class="min-h-dvh bg-bg">
    <header class="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-warm-gray/30">
      <div class="max-w-lg mx-auto px-4 h-12 flex items-center justify-center relative">
        <button aria-label="返回词典" @click="safeBack" class="absolute left-2 p-2 rounded-lg active:bg-gray-100">
          <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span class="text-sm font-medium text-gray-700">实词详情</span>
        <button @click="toggleFav" class="absolute right-2 p-2 rounded-lg">
          <svg class="w-5 h-5" :class="isFav ? 'text-red-500 fill-red-500' : 'text-gray-300'" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
        </button>
      </div>
    </header>

    <div v-if="loading" class="max-w-lg mx-auto px-5 pt-8">
      <div class="animate-pulse space-y-4">
        <div class="h-10 bg-gray-200 rounded w-28 mx-auto"></div>
        <div class="h-3 bg-gray-200 rounded w-20 mx-auto"></div>
        <div class="h-24 bg-gray-200 rounded-xl"></div>
      </div>
    </div>

    <main v-else-if="wordData" class="max-w-lg mx-auto px-5 pb-10 space-y-3 pt-4">
      <div class="text-center pb-2">
        <h1 class="text-ink-title tracking-widest mb-1" style="font-size:40px;font-family:'Noto Serif SC',serif;">{{ wordData.word }}</h1>
        <p v-if="wordData.pinyin" class="text-xs text-ink-muted tracking-wider" style="font-family:'Noto Serif SC',serif;">{{ formatPinyin(wordData.pinyin) }}</p>
        <span v-if="wordData.source === 'zhipu'" class="inline-block mt-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 text-[10px]">AI</span>
      </div>

      <div class="flex flex-wrap gap-1.5 justify-center">
        <span class="px-2 py-0.5 rounded bg-indigo-50 text-indigo text-[11px]">实词</span>
        <span v-if="wordData.sentiment" class="px-2 py-0.5 rounded text-[11px]" :class="sentimentClass">{{ wordData.sentiment }}</span>
        <span v-if="wordData.category" class="px-2 py-0.5 rounded bg-blue-50 text-blue-600 text-[11px]">{{ wordData.category }}</span>
      </div>

      <div class="bg-white rounded-xl p-4 shadow-sm">
        <h3 class="text-xs font-semibold text-ink-muted mb-2">📖 释义</h3>
        <p class="text-sm text-ink-body leading-relaxed">{{ wordData.explanation }}</p>
      </div>

      <div v-if="allExamples.length > 0" class="bg-white rounded-xl p-4 shadow-sm">
        <h3 class="text-xs font-semibold text-ink-muted mb-3">💬 语境举例</h3>
        <div class="space-y-2">
          <div v-for="(ex, idx) in allExamples" :key="idx" class="pl-3 border-l-2 border-indigo-300 bg-indigo-50/30 rounded-r-lg p-3">
            <p class="text-sm text-ink-body leading-relaxed" style="font-family:'Noto Serif SC',serif;" v-html="highlightWord(ex)"></p>
          </div>
        </div>
      </div>

      <div v-if="wordData.exam_trap && wordData.exam_trap.length > 5" class="bg-amber-50 rounded-xl p-4 border border-amber-100">
        <h3 class="text-xs font-semibold text-amber-700 mb-2">⚠️ 考公易错点</h3>
        <p class="text-xs text-amber-800 leading-relaxed">{{ wordData.exam_trap }}</p>
      </div>

      <section v-if="examReferences.length" class="bg-white rounded-xl p-4 shadow-sm" data-testid="word-exam-references">
        <h3 class="text-xs font-semibold text-ink-muted mb-1">📚 历年公考题干记录</h3>
        <p class="mb-3 text-[10px] leading-relaxed text-gray-400">仅展示数据库中保存的带年份题干片段；记录状态会明确标注，不把未存档题干冒充官方原卷链接。</p>
        <div class="space-y-3">
          <article v-for="(reference, idx) in examReferences" :key="`${reference.questionId || reference.year || 'record'}-${idx}`" class="rounded-xl border border-gray-100 p-3">
            <div class="flex items-start justify-between gap-2 mb-2">
              <p class="text-[11px] font-medium text-ink-title leading-relaxed">{{ reference.title || '本地 exam_questions 记录' }}</p>
              <span class="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] text-indigo">{{ reference.year || '历年' }}</span>
            </div>
            <p v-if="reference.questionSnippet" class="text-[12px] text-ink-body leading-[1.85]" style="font-family:'Noto Serif SC',serif;" v-html="highlightWord(reference.questionSnippet)"></p>
            <p class="mt-2 text-[10px] leading-relaxed text-gray-400">
              {{ reference.examType || '公考' }}{{ reference.province ? ` · ${reference.province}` : '' }} · {{ reference.verificationStatus === 'exam_question_record' ? '本地题干记录' : (reference.verificationStatus || '来源分层记录') }}
            </p>
          </article>
        </div>
      </section>

      <div v-if="synonymsList.length > 0" class="bg-white rounded-xl p-4 shadow-sm">
        <h3 class="text-xs font-semibold text-ink-muted mb-3">🔗 近义词</h3>
        <div class="flex flex-wrap gap-2">
          <span v-for="syn in synonymsList" :key="syn" @click="goToWord(syn)" class="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-[12px] font-medium cursor-pointer active:scale-95 transition-all">{{ syn }}</span>
        </div>
      </div>

      <div v-if="antonymsList.length > 0" class="bg-white rounded-xl p-4 shadow-sm">
        <h3 class="text-xs font-semibold text-ink-muted mb-3">🔄 反义词</h3>
        <div class="flex flex-wrap gap-2">
          <span v-for="ant in antonymsList" :key="ant" @click="goToWord(ant)" class="px-3 py-1.5 bg-red-50 text-red-600 rounded-full text-[12px] font-medium cursor-pointer active:scale-95 transition-all">{{ ant }}</span>
        </div>
      </div>
    
      <!-- 官媒原文出处 -->
      <div class="bg-white rounded-xl p-4 shadow-sm mb-3">
        <h3 class="text-[12px] font-semibold text-ink-muted mb-3 flex items-center gap-1">
          <span>📰</span> 官媒原文出处
          <span class="text-[10px] text-gray-400 font-normal">原文段落已内嵌</span>
        </h3>
        <div v-if="mediaEvidence.length === 0" class="text-[12px] leading-relaxed text-gray-400" data-testid="media-occurrences-empty">
          暂未收录该实词的权威媒体原文段落；不会跳转到不稳定的搜索页，也不会伪造出处。
        </div>
        <div v-else class="space-y-3" data-testid="media-occurrences">
          <div v-for="(article, idx) in mediaEvidence" :key="idx" class="rounded-xl border border-gray-100 p-3">
            <div v-if="article.paragraph || article.excerpt || article.sourceExcerpt" class="bg-gray-50 rounded-lg p-2.5 border-l-[3px] border-cinnabar/40 mb-2.5">
              <p class="text-[12px] text-ink-body leading-[1.8]" style="font-family:'Noto Serif SC',serif;" v-html="highlightMediaParagraph(article)"></p>
            </div>
            <div class="flex items-start justify-between gap-2">
              <p class="text-[10px] leading-relaxed text-gray-400">
                {{ article.organization || article.site || '权威媒体' }}<span v-if="article.publishDate || article.date"> · {{ article.publishDate || article.date }}</span>
              </p>
              <div class="max-w-[65%] text-right">
                <p class="truncate text-[12px] font-medium text-ink-title">{{ article.articleTitle || article.title || '权威媒体原文段落' }}</p>
                <a v-if="article.officialUrl || article.url" :href="article.officialUrl || article.url" target="_blank" rel="noopener noreferrer" class="text-[10px] text-blue-500 underline">打开已记录链接 ↗</a>
                <span v-else class="text-[10px] text-gray-400">原文已内嵌</span>
              </div>
            </div>
            <p v-if="article.note" class="mt-2 text-[10px] leading-relaxed text-gray-400">{{ article.note }}</p>
          </div>
        </div>
      </div>
</main>

    <div v-else class="max-w-lg mx-auto px-5 pt-16 text-center">
      <p class="text-sm text-gray-500 mb-3">未找到该实词</p>
      <button @click="safeBack" class="px-5 py-2 bg-gray-200 text-gray-600 text-xs rounded-lg">返回</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onActivated } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { apiGet } from '../api'
import { useHistory, useFavorites } from '../stores/app'
import { useSafeBack } from '../composables/useSafeBack'
import { getStaticIdiom, getStaticWord, type StaticMediaOccurrence } from '../services/dictionary-static'

interface WordData {
  id: number; word: string; word_type?: string; pinyin?: string; explanation?: string;
  pos?: string; examples?: string; synonyms?: string; antonyms?: string;
  category?: string; frequency?: string; sentiment?: string; source?: string;
  modern_example?: string; exam_trap?: string; original_text_url?: string;
  sourceKind?: string; verificationStatus?: string;
  examReferences?: Array<{
    questionId?: number; year?: number; title?: string; province?: string;
    examType?: string; source?: string; questionSnippet?: string;
    termRole?: string; verificationStatus?: string; note?: string;
  }>;
  mediaOccurrences?: StaticMediaOccurrence[]; mediaSources?: StaticMediaOccurrence[];
}

const route = useRoute()
const router = useRouter()
const { safeBack } = useSafeBack('/dictionary')
const { add: addHistory } = useHistory()
const { favorites, toggle } = useFavorites()
const isStaticPagesBuild = import.meta.env.VITE_STATIC_PAGES === 'true'

const loading = ref(false)
const wordData = ref<WordData | null>(null)
const mediaSources = ref<StaticMediaOccurrence[]>([])

const mediaEvidence = computed<StaticMediaOccurrence[]>(() => {
  // Some API versions include an empty `mediaOccurrences` field while the
  // media endpoint carries the verified records. Do not let that empty array
  // hide non-empty embedded/endpoint evidence.
  const embedded = [wordData.value?.mediaOccurrences, wordData.value?.mediaSources]
    .find((items) => Array.isArray(items) && items.length) || []
  if (embedded.length) return embedded
  return mediaSources.value
    .map((item: any) => ({
      articleTitle: item.articleTitle || item.title,
      title: item.title || item.articleTitle,
      organization: item.organization || item.site,
      site: item.site || item.organization,
      publishDate: item.publishDate || item.date,
      date: item.date || item.publishDate,
      officialUrl: item.officialUrl || item.url,
      url: item.url || item.officialUrl,
      paragraph: item.paragraph || item.excerpt,
      excerpt: item.excerpt || item.paragraph,
      sourceExcerpt: item.sourceExcerpt,
      highlightTerm: item.highlightTerm,
      sourceKind: item.sourceKind,
      note: item.note,
    }))
    .filter((item) => (item.paragraph || item.excerpt || item.sourceExcerpt || '').trim())
})

const isFav = computed(() => wordData.value ? favorites.value.includes(wordData.value.word) : false)

const sentimentClass = computed(() => {
  const s = wordData.value?.sentiment
  if (s === '褒义') return 'bg-emerald-50 text-emerald-600'
  if (s === '贬义') return 'bg-red-50 text-red-500'
  return 'bg-gray-100 text-gray-500'
})

function escapeRegex(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

function highlightWord(text: string): string {
  if (!text || !wordData.value) return text || ''
  const w = wordData.value.word
  if (!w) return text
  return text.replace(new RegExp(escapeRegex(w), 'g'), '<span style="color:#C0392B;font-weight:600">' + w + '</span>')
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function highlightMediaParagraph(article: StaticMediaOccurrence): string {
  const paragraph = article.paragraph || article.excerpt || article.sourceExcerpt || ''
  const term = article.highlightTerm || wordData.value?.word || ''
  const safe = escapeHtml(paragraph)
  if (!term) return safe
  return safe.replace(new RegExp(escapeRegex(term), 'g'), (match) => `<mark class="media-evidence-term" style="color:#c0392b;background:rgba(254,226,226,.85);font-weight:700;text-decoration:underline;text-decoration-thickness:1.5px;text-underline-offset:3px">${match}</mark>`)
}

function formatPinyin(py: string): string {
  if (!py) return ''
  if (py.includes(' ')) return py
  const vowels = 'aeiou\u0101\u00E1\u0113\u00E9\u012B\u00ED\u014D\u00F3\u016B\u00FA\u00FC'
  const cons = 'bpmfdtnlgkhjqxrzcsyw'
  return py.replace(new RegExp('([' + vowels + '])((?:[' + cons + '])?(?=[' + vowels + ']))', 'g'), '$1 $2')
}

const allExamples = computed(() => {
  const w = wordData.value?.word || ''
  const exs = (wordData.value?.examples || '').split('\n').filter(e => e.trim()).map(e => e.replace(/^[\u2460-\u2473\u24ea]\s*/, '').trim()).filter(Boolean)
  const mod = wordData.value?.modern_example || ''
  const merged = [...exs]
  if (mod && !merged.includes(mod) && mod !== w) merged.push(mod)
  return merged
})

function parseList(raw: string): string[] {
  if (!raw) return []
  let list: string[] = []
  try { list = JSON.parse(raw).map(String) } catch { list = raw.split(/[,，、；;]/).map(s => s.trim()) }
  return list.filter(s => s && !s.includes('待补充') && !s.includes('暂无') && s.length >= 2 && s.length <= 6 && /[\u4e00-\u9fa5]{2,}/.test(s))
}

const synonymsList = computed(() => parseList(wordData.value?.synonyms || ''))
const antonymsList = computed(() => parseList(wordData.value?.antonyms || ''))
const examReferences = computed(() => wordData.value?.examReferences || [])

function toggleFav() { if (wordData.value) toggle(wordData.value.word) }

function goToWord(w: string) {
  if (!w) return
  addHistory(w)
  if (isStaticPagesBuild) {
    Promise.all([getStaticIdiom(w).catch(() => null), getStaticWord(w).catch(() => null)]).then(([idiom, word]) => {
      router.push(idiom ? '/result/' + encodeURIComponent(w) : word ? { name: 'WordDetail', params: { word: w } } : '/dictionary')
    })
    return
  }
  apiGet('/api/idioms/' + encodeURIComponent(w)).then((r: any) => {
    if (r.ok && r.data) router.push('/result/' + encodeURIComponent(w))
    else router.push({ name: 'WordDetail', params: { word: w } })
  }).catch(async () => {
    const idiom = await getStaticIdiom(w).catch(() => null)
    router.push(idiom ? '/result/' + encodeURIComponent(w) : { name: 'WordDetail', params: { word: w } })
  })
}


async function loadMediaSources() {
  const w = wordData.value?.word || route.params.word || ''
  if (!w) return
  if (!isStaticPagesBuild) try {
    const res = await apiGet<{ ok: boolean; data: { articles: any[] } }>('/api/idioms/' + encodeURIComponent(w) + '/media-source')
    if (res.ok && res.data?.articles?.length > 0) {
      mediaSources.value = res.data.articles.map((a: any) => ({
        articleTitle: a.articleTitle || a.article_title,
        title: a.title || a.article_title,
        organization: a.organization || a.source_site,
        site: a.site || a.source_site,
        publishDate: a.publishDate || a.publish_date,
        date: a.date || a.publish_date,
        officialUrl: a.officialUrl || a.article_url,
        url: a.url || a.article_url,
        paragraph: a.paragraph || a.article_excerpt || '',
        excerpt: a.excerpt || a.article_excerpt || '',
        sourceExcerpt: a.sourceExcerpt,
        highlightTerm: a.highlightTerm || w,
        sourceKind: a.sourceKind,
        note: a.note,
      }))
      return
    }
  } catch {}
  // Do not manufacture search-page links. The learner should see only
  // database-backed excerpts, with an explicit empty state otherwise.
  mediaSources.value = []
}

async function loadData() {
  const wp = route.params.word as string
  if (!wp) return
  loading.value = true
  wordData.value = null
  try {
    let detail: WordData | null = null
    if (isStaticPagesBuild) {
      detail = await getStaticWord(wp) as WordData | null
    } else {
      detail = await apiGet('/api/words/' + encodeURIComponent(wp))
        .then((res: any) => res.ok && res.data ? res.data : null)
        .catch(() => null)
      if (!detail) detail = await getStaticWord(wp).catch(() => null) as WordData | null
    }
    if (detail) {
      wordData.value = detail
      addHistory(wp)
      loadMediaSources()
    } else if (!isStaticPagesBuild && wp.length >= 2 && /[\u4e00-\u9fa5]/.test(wp)) {
      const { apiPost } = await import('../api')
      await apiPost('/api/generate', { word: wp, type: 'word' })
      pollForAiResult(wp)
      return
    }
  } catch { wordData.value = null }
  loading.value = false
}

async function pollForAiResult(word: string) {
  let attempts = 0
  const poll = async () => {
    if (attempts >= 30) { loading.value = false; return }
    attempts++
    try {
      const res = await apiGet('/api/words/' + encodeURIComponent(word))
      if (res.ok && res.data) { wordData.value = res.data; loading.value = false; addHistory(word); loadMediaSources(); return }
    } catch {}
    setTimeout(poll, 2000)
  }
  poll()
}

watch(() => route.params.word, loadData, { immediate: false })
onMounted(loadData)
onActivated(() => { loadData() })
</script>

<style scoped>
.media-evidence-term {
  color: #c0392b;
  background: rgba(254, 226, 226, 0.85);
  font-weight: 700;
  text-decoration: underline;
  text-decoration-thickness: 1.5px;
  text-underline-offset: 3px;
}
</style>

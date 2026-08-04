<template>
  <div class="min-h-dvh bg-bg">
    <header class="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-warm-gray/30">
      <div class="max-w-lg mx-auto px-4 h-12 flex items-center justify-center relative">
        <button aria-label="返回词典" @click="safeBack" class="absolute left-2 p-2 rounded-lg active:bg-gray-100">
          <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <span class="text-sm font-medium text-gray-700">成语详情</span>
        <button :aria-label="idiom && isFavorite(idiom.idiom) ? '取消收藏' : '收藏词条'" @click="idiom && toggleFavorite(idiom.idiom)" class="absolute right-2 p-2 rounded-lg">
          <svg class="w-5 h-5" :class="isFav ? 'text-red-500 fill-red-500' : 'text-gray-300'" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
        </button>
      </div>
    </header>

    <div v-if="loading" class="max-w-lg mx-auto px-5 pt-8">
      <div class="animate-pulse space-y-4">
        <div class="h-10 bg-gray-200 rounded w-28 mx-auto"></div>
        <div class="h-3 bg-gray-200 rounded w-20 mx-auto"></div>
        <div class="h-24 bg-gray-200 rounded-xl"></div>
        <div class="h-20 bg-gray-200 rounded-xl"></div>
      </div>
    </div>

    <main v-else-if="idiom" class="max-w-lg mx-auto px-5 pb-10 pt-4">
      <div class="text-center pb-3">
        <h1 class="text-[40px] font-bold text-ink-title tracking-[0.15em] mb-1" style="font-family:'Noto Serif SC',serif;">{{ idiom.idiom }}</h1>
        <p class="text-[13px] text-ink-muted tracking-widest" style="font-family:'Noto Serif SC',serif;">{{ formatPinyin(idiom.pinyin) }}</p>
      </div>

      <div class="bg-white rounded-xl p-4 shadow-sm mb-3">
        <p class="text-[14px] text-ink-body leading-relaxed">{{ idiom.explanation }}</p>
        <div class="mt-2.5 flex flex-wrap gap-1.5">
          <span v-if="idiom.sentiment" class="px-2 py-0.5 rounded-full text-[11px] font-medium" :class="sentimentClass">{{ idiom.sentiment }}</span>
          <span v-if="idiom.frequency === '高频'" class="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-[11px] font-medium">🔥 高频</span>
          <span v-if="idiom.category" class="px-2 py-0.5 rounded-full bg-blue-50 text-[11px] text-indigo">{{ idiom.category }}</span>
          <span v-if="idiom.exam_category && idiom.exam_category !== idiom.category" class="px-2 py-0.5 rounded-full bg-red-50 text-[11px] text-cinnabar">{{ idiom.exam_category }}</span>
        </div>
      </div>

      <div v-if="modernExample" class="bg-white rounded-xl p-4 shadow-sm mb-3">
        <h3 class="text-[12px] font-semibold text-ink-muted mb-2.5 flex items-center gap-1">
          <span>💬</span> 语境举例
        </h3>
        <div class="pl-3 border-l-[3px] border-indigo-300 bg-indigo-50/30 rounded-r-lg p-3">
          <p class="text-[13px] text-ink-body leading-[1.9]" style="font-family:'Noto Serif SC',serif;" v-html="highlightIdiom(modernExample)"></p>
        </div>
      </div>

      <div v-if="idiom.exam_trap && idiom.exam_trap.length > 5" class="bg-amber-50/80 rounded-xl p-4 border border-amber-200/60 mb-3">
        <h3 class="text-[12px] font-semibold text-amber-700 mb-2 flex items-center gap-1">
          <span>⚠️</span> 考公易错点
        </h3>
        <p class="text-[12px] text-amber-800 leading-relaxed">{{ idiom.exam_trap }}</p>
      </div>

      <div v-if="cleanKnowledgePoints" class="bg-white rounded-xl p-4 shadow-sm mb-3">
        <h3 class="text-[12px] font-semibold text-ink-muted mb-2 flex items-center gap-1">
          <span>📝</span> 知识要点
        </h3>
        <p class="text-[12px] text-ink-body leading-relaxed whitespace-pre-line">{{ cleanKnowledgePoints }}</p>
      </div>

      <section v-if="examOccurrences.length" class="bg-white rounded-xl p-4 shadow-sm mb-3" data-testid="exam-occurrences">
        <h3 class="text-[12px] font-semibold text-ink-muted mb-1 flex items-center gap-1">
          <span>📚</span> 往届公考原题出处
        </h3>
        <p class="text-[10px] text-gray-400 mb-3">仅展示题干原段；成语在题干中以红色高亮，若为备选项则单独标注，不显示答案解析。</p>
        <div class="space-y-3">
          <article v-for="(occurrence, index) in examOccurrences" :key="`${occurrence.sourceType}-${occurrence.sourceId}-${index}`" class="rounded-xl border border-gray-100 p-3">
            <div class="flex items-center justify-between gap-2 mb-2">
              <p class="text-[11px] font-medium text-ink-title leading-relaxed">{{ occurrence.source }}</p>
              <span class="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] text-indigo">{{ occurrence.year || '历年' }}</span>
            </div>
            <p class="text-[13px] text-ink-body leading-[1.9] whitespace-pre-line" style="font-family:'Noto Serif SC',serif;" v-html="highlightExamPassage(occurrence)"></p>
            <p v-if="occurrence.termRole === 'option'" class="mt-2 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] leading-relaxed text-amber-800">
              本题题干以横线呈现，该成语属于备选词：<span class="font-semibold text-cinnabar">{{ occurrence.highlightTerm || idiom.idiom }}</span>
            </p>
            <div class="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-gray-400">
              <span>{{ occurrence.examType || '公考' }}{{ occurrence.province ? ` · ${occurrence.province}` : '' }} · {{ occurrence.questionType || '言语理解' }}</span>
              <a v-if="occurrence.sourceUrl" :href="occurrence.sourceUrl" target="_blank" rel="noopener noreferrer" class="text-blue-500 underline">打开已记录题面 ↗</a>
              <span v-else>{{ occurrence.sourceNote }}</span>
            </div>
          </article>
        </div>
      </section>
      <section v-else-if="idiom" class="rounded-xl border border-dashed border-gray-200 bg-white/80 p-4 mb-3" data-testid="exam-occurrences-empty">
        <h3 class="text-[12px] font-semibold text-ink-muted mb-1">📚 往届公考原题出处</h3>
        <p class="text-[11px] leading-relaxed text-gray-400">当前收录的可核验国考/省考原题中暂未匹配到该成语。专项练习和讲义题不会冒充真题出处；后续补入可核验原题后会自动显示在这里。</p>
      </section>

      <div v-if="synonymsList.length > 0 || antonymsList.length > 0 || similarIdioms.length > 0" class="bg-white rounded-xl p-4 shadow-sm mb-3">
        <h3 class="text-[12px] font-semibold text-ink-muted mb-2.5 flex items-center gap-1">
          <span>🔗</span> 相关成语
        </h3>
        <div v-if="synonymsList.length > 0" class="mb-3">
          <p class="text-[11px] font-medium text-emerald-600 mb-1.5">近义词</p>
          <div class="flex flex-wrap gap-1.5">
            <span v-for="s in synonymsList" :key="s" @click="goToWord(s)" class="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-[12px] rounded-lg cursor-pointer active:bg-emerald-100 inline-block">{{ s }}</span>
          </div>
        </div>
        <div v-if="antonymsList.length > 0" class="mb-3">
          <p class="text-[11px] font-medium text-red-500 mb-1.5">反义词</p>
          <div class="flex flex-wrap gap-1.5">
            <span v-for="a in antonymsList" :key="a" @click="goToWord(a)" class="px-3 py-1.5 bg-red-50 text-red-600 text-[12px] rounded-lg cursor-pointer active:bg-red-100 inline-block">{{ a }}</span>
          </div>
        </div>
        <div v-if="similarIdioms.length > 0">
          <p class="text-[11px] font-medium text-gray-500 mb-1.5">同分类推荐</p>
          <div class="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <span v-for="sim in similarIdioms" :key="sim.idiom" @click="goToWord(sim.idiom)" class="flex-shrink-0 bg-bg rounded-lg px-3 py-2 text-center min-w-[72px] cursor-pointer inline-block">
              <p class="text-[12px] font-bold text-ink-title">{{ sim.idiom }}</p>
              <p class="text-[10px] text-ink-muted mt-0.5">{{ formatPinyin(sim.pinyin) }}</p>
            </span>
          </div>
        </div>
      </div>


      <!-- 官媒原文出处 -->
      <div class="bg-white rounded-xl p-4 shadow-sm mb-3">
        <h3 class="text-[12px] font-semibold text-ink-muted mb-3 flex items-center gap-1">
          <span>📰</span> 官媒原文出处
          <span class="text-[10px] text-gray-400 font-normal">仅展示该成语在权威媒体文章中的相关段落</span>
        </h3>

        <div v-if="mediaEvidence.length === 0" class="text-[12px] text-gray-400">
          暂未收录该成语的权威媒体原文段落；上方的历年公考原题证据可直接核对。
        </div>

        <div v-else class="space-y-4" data-testid="media-occurrences">
          <div v-for="(article, idx) in mediaEvidence" :key="idx" class="rounded-xl border border-gray-100 p-3">
            <div v-if="article.paragraph || article.excerpt || article.sourceExcerpt" class="bg-gray-50 rounded-lg p-3 border-l-[3px] border-cinnabar/40 mb-2.5">
              <p class="text-[13px] text-ink-body leading-[1.9]" style="font-family:'Noto Serif SC',serif;" v-html="highlightMediaParagraph(article)"></p>
            </div>

            <div class="flex items-start justify-between gap-3">
              <p class="text-[11px] text-gray-500 leading-relaxed">
                来源：{{ article.organization || article.site || '权威媒体' }}
                <span v-if="article.publishDate || article.date"> · {{ article.publishDate || article.date }}</span>
              </p>
              <div class="flex-shrink-0 text-right max-w-[65%]">
                <p class="text-[12px] font-medium text-ink-title truncate">{{ article.articleTitle || article.title || '权威媒体原文段落' }}</p>
                <a v-if="article.officialUrl || article.url" :href="article.officialUrl || article.url" target="_blank" rel="noopener noreferrer" class="text-[10px] text-blue-500 underline">打开已记录链接 ↗</a>
                <span v-else class="text-[10px] text-gray-400">原文已内嵌</span>
              </div>
            </div>
            <p v-if="article.note" class="mt-2 text-[10px] leading-relaxed text-gray-400">{{ article.note }}</p>
          </div>
        </div>
      </div>

      <div class="space-y-2.5 pt-1">
        <button @click="goFeynman" class="w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-medium active:scale-[0.98] transition-transform">🧠 费曼学习法</button>

      </div>
    </main>
    <div v-if="!loading && !idiom" class="max-w-lg mx-auto px-5 pt-16 text-center">
      <div v-if="aiGenerating">
        <div class="inline-block w-6 h-6 border-2 border-cinnabar/30 border-t-cinnabar rounded-full animate-spin mb-3"></div>
        <p class="text-sm text-gray-700">AI 正在为您生成，请稍候...</p>
      </div>
      <div v-else>
        <p class="text-sm text-gray-500 mb-3">暂未找到该成语详情</p>
        <button @click="safeBack" class="px-5 py-2 bg-gray-200 text-gray-600 text-xs rounded-lg">返回</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onActivated, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFavorites, useHistory } from '../stores/app'
import { apiGet } from '../api'
import { useSafeBack } from '../composables/useSafeBack'
import { getStaticIdiom, getStaticSimilarIdioms, getStaticWord, type StaticExamOccurrence, type StaticMediaOccurrence } from '../services/dictionary-static'

const route = useRoute()
const router = useRouter()
const { safeBack } = useSafeBack('/dictionary')
const { isFavorite, toggleFavorite } = useFavorites()
const { add: addHistory } = useHistory()
const isStaticPagesBuild = import.meta.env.VITE_STATIC_PAGES === 'true'

interface IdiomData {
  idiom: string; pinyin: string; explanation: string
  source_book: string; source_chapter: string; context: string
  context_translation: string; exam_trap: string; original_text_url: string
  category: string; frequency: string; synonyms: string; antonyms: string
  knowledge_points: string; exam_points: string; modern_example: string
  exam_category: string; sentiment: string; source_text: string
  examOccurrences?: StaticExamOccurrence[]
  mediaOccurrences?: StaticMediaOccurrence[]
  mediaSources?: StaticMediaOccurrence[]
}

const loading = ref(true)
const idiom = ref<IdiomData | null>(null)
const similarIdioms = ref<any[]>([])
const aiGenerating = ref(false)
const mediaSources = ref<StaticMediaOccurrence[]>([])

const examOccurrences = computed<StaticExamOccurrence[]>(() => {
  const rows = idiom.value?.examOccurrences
  if (!Array.isArray(rows)) return []
  return rows.filter((row) => row && typeof row.passage === 'string' && row.passage.trim())
})

const mediaEvidence = computed<StaticMediaOccurrence[]>(() => {
  // An API may include `mediaOccurrences: []` while the dedicated media
  // endpoint returns verified articles. Prefer whichever embedded collection
  // is non-empty instead of letting an empty array mask the endpoint result.
  const embedded = [idiom.value?.mediaOccurrences, idiom.value?.mediaSources]
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

const isFav = computed(() => idiom.value ? isFavorite(idiom.value.idiom) : false)

const sentimentClass = computed(() => {
  const s = idiom.value?.sentiment
  if (s === '褒义') return 'bg-emerald-50 text-emerald-600'
  if (s === '贬义') return 'bg-red-50 text-red-500'
  return 'bg-gray-100 text-gray-500'
})

function formatPinyin(py: string): string {
  if (!py) return ''
  if (py.includes(' ')) return py
  const vowels = 'aeiou\u0101\u00E1\u0113\u00E9\u012B\u00ED\u014D\u00F3\u016B\u00FA\u00FC'
  const cons = 'bpmfdtnlgkhjqxrzcsyw'
  return py.replace(new RegExp('([' + vowels + '])((?:[' + cons + '])?(?=[' + vowels + ']))', 'g'), '$1 $2')
}

const modernExample = computed(() => {
  if (!idiom.value) return ''
  const me = (idiom.value.modern_example || '').trim()
  if (me && me.length > 2 && me !== '无') return me
  return ''
})

const cleanKnowledgePoints = computed(() => {
  if (!idiom.value?.knowledge_points) return ''
  return idiom.value.knowledge_points
    .replace(/原文出处[\s\S]*?(\n|$)/g, '')
    .replace(/语境举例[\s\S]*?(\n|$)/g, '')
    .replace(/出处来源[\s\S]*?(\n|$)/g, '')
    .replace(/用法举例[\s\S]*?(\n|$)/g, '')
    .trim()
})

function parseList(raw: string): string[] {
  if (!raw) return []
  let list: string[] = []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) list = parsed.map(String)
  } catch {
    list = raw.split(/[,，、；;]/).map((s: string) => s.trim()).filter(Boolean)
  }
  return list.filter((s: string) => {
    if (!s || s.includes('待补充') || s.includes('暂无') || s.length < 2 || s.length > 6) return false
    return /[\u4e00-\u9fa5]{2,}/.test(s)
  })
}

const synonymsList = computed(() => parseList(idiom.value?.synonyms || ''))
const antonymsList = computed(() => parseList(idiom.value?.antonyms || ''))

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function highlightIdiom(text: string): string {
  if (!text || !idiom.value) return text || ''
  const word = idiom.value.idiom
  if (!word || word.length < 2) return text
  return text.replace(new RegExp(escapeRegex(word), 'g'),
    '<span style="color:#C0392B;font-weight:600">' + word + '</span>')
}

function highlightMediaParagraph(article: StaticMediaOccurrence): string {
  const paragraph = article.paragraph || article.excerpt || article.sourceExcerpt || ''
  const term = article.highlightTerm || idiom.value?.idiom || ''
  const safe = escapeHtml(paragraph)
  if (!term) return safe
  const pattern = new RegExp(escapeRegex(term), 'g')
  return safe.replace(pattern, (match) => `<mark class="media-evidence-term" style="color:#c0392b;background:rgba(254,226,226,.85);font-weight:700;text-decoration:underline;text-decoration-thickness:1.5px;text-underline-offset:3px">${match}</mark>`)
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function highlightExamPassage(occurrence: StaticExamOccurrence): string {
  const passage = occurrence.passage || ''
  const term = occurrence.highlightTerm || idiom.value?.idiom || ''
  if (!term) return escapeHtml(passage)
  const pattern = new RegExp(escapeRegex(term), 'g')
  let output = ''
  let found = false
  let cursor = 0
  for (const match of passage.matchAll(pattern)) {
    found = true
    const start = match.index ?? 0
    output += escapeHtml(passage.slice(cursor, start))
    output += `<mark class="exam-evidence-term" style="color:#c0392b;background:rgba(254,226,226,.85);font-weight:700;text-decoration:underline;text-decoration-thickness:1.5px;text-underline-offset:3px">${escapeHtml(match[0])}</mark>`
    cursor = start + match[0].length
  }
  if (found) return output + escapeHtml(passage.slice(cursor))

  // In a fill-in-the-blank question the idiom is an option, not literal text
  // in the source paragraph. Keep the original wording while placing the
  // selected idiom at the blank so the learner can see the exact position.
  if (occurrence.termRole === 'option') {
    const blank = /_{2,}|…{2,}|（\s*）|\(\s*\)/u.exec(passage)
    if (blank && blank.index != null) {
      const before = passage.slice(0, blank.index)
      const after = passage.slice(blank.index + blank[0].length)
      return `${escapeHtml(before)}<mark class="exam-evidence-term" style="color:#c0392b;background:rgba(254,226,226,.85);font-weight:700;text-decoration:underline;text-decoration-thickness:1.5px;text-underline-offset:3px">${escapeHtml(term)}</mark>${escapeHtml(after)}`
    }
  }
  return escapeHtml(passage)
}

function goToWord(word: string) {
  if (!word) return
  addHistory(word)
  const targetPath = '/result/' + encodeURIComponent(word)
  if (route.path === targetPath) {
    loading.value = true
    loadData()
  } else {
    router.push(targetPath)
  }
}

async function loadMediaSources() {
  const word = route.params.word as string
  if (!word) return
  if (!isStaticPagesBuild) try {
    const res = await apiGet<{ ok: boolean; data: { articles: any[] } }>('/api/idioms/' + encodeURIComponent(word) + '/media-source')
    if (res.ok && res.data?.articles?.length > 0) {
      mediaSources.value = res.data.articles.map((a: any) => ({
        articleTitle: a.articleTitle || a.article_title || a.title,
        title: a.title || a.articleTitle || a.article_title,
        organization: a.organization || a.source_site || a.site,
        site: a.site || a.organization || a.source_site,
        publishDate: a.publishDate || a.publish_date || a.date,
        date: a.date || a.publishDate || a.publish_date,
        officialUrl: a.officialUrl || a.article_url || a.url,
        url: a.url || a.officialUrl || a.article_url,
        paragraph: a.paragraph || a.article_excerpt || a.excerpt || a.sourceExcerpt || '',
        excerpt: a.excerpt || a.article_excerpt || a.paragraph || a.sourceExcerpt || '',
        sourceExcerpt: a.sourceExcerpt || a.article_excerpt,
        highlightTerm: a.highlightTerm || word,
        sourceKind: a.sourceKind,
        note: a.note,
      }))
      return
    }
  } catch {}
  // Search pages are not evidence and several are unstable on mobile. Keep
  // this section empty when no verified excerpt was returned; the inline exam
  // occurrence block remains the primary source for this entry.
  mediaSources.value = []
}
async function loadData() {
  const word = route.params.word as string
  
  if (!word) return
  loading.value = true
  idiom.value = null
  similarIdioms.value = []
  aiGenerating.value = false
  try {
    const encoded = encodeURIComponent(word)
    let detail: IdiomData | null = null
    if (isStaticPagesBuild) {
      detail = await getStaticIdiom(word) as IdiomData | null
    } else {
      detail = await apiGet<{ ok: boolean; data: IdiomData }>('/api/idioms/' + encoded)
        .then((res) => res.ok && res.data ? res.data : null)
        .catch(() => null)
      if (!detail) detail = await getStaticIdiom(word).catch(() => null) as IdiomData | null
      // The API predates the provenance field. Merge the locally published
      // evidence when the server response does not carry it yet, so both the
      // development backend and GitHub Pages render the same source block.
      if (detail && (!Array.isArray(detail.examOccurrences) || detail.examOccurrences.length === 0)) {
        const staticDetail = await getStaticIdiom(word).catch(() => null)
        if (staticDetail?.examOccurrences?.length) detail = { ...detail, examOccurrences: staticDetail.examOccurrences }
      }
    }
    if (detail) {
      idiom.value = detail
      addHistory(word)
      if (isStaticPagesBuild) {
        similarIdioms.value = await getStaticSimilarIdioms(word).catch(() => [])
      } else {
        await apiGet('/api/idioms/' + encoded + '/similar')
          .then((r: any) => { similarIdioms.value = r.data || [] })
          .catch(async () => { similarIdioms.value = await getStaticSimilarIdioms(word).catch(() => []) })
      }
      loadMediaSources()
    } else {
      let wordExists = false
      if (isStaticPagesBuild) {
        wordExists = Boolean(await getStaticWord(word).catch(() => null))
      } else {
        wordExists = await apiGet('/api/words/' + encoded)
          .then((res: any) => Boolean(res.ok && res.data))
          .catch(async () => Boolean(await getStaticWord(word).catch(() => null)))
      }
      if (wordExists) { router.replace({ name: 'WordDetail', params: { word } }); return }
      if (!isStaticPagesBuild && word.length >= 2 && /[\u4e00-\u9fa5]/.test(word)) {
        aiGenerating.value = true
        const { apiPost } = await import('../api')
        await apiPost('/api/generate', { word, type: 'idiom' })
        pollForAiResult(word)
        return
      }
    }
  } catch {}
  loading.value = false
}

async function pollForAiResult(word: string) {
  let attempts = 0
  const poll = async () => {
    if (attempts >= 30) { aiGenerating.value = false; loading.value = false; return }
    attempts++
    try {
      const res = await apiGet('/api/idioms/' + encodeURIComponent(word))
      if (res.ok && res.data) {
        idiom.value = res.data; aiGenerating.value = false; loading.value = false
        addHistory(word)
        loadMediaSources()
        apiGet('/api/idioms/' + encodeURIComponent(word) + '/similar').then((r: any) => { similarIdioms.value = r.data || [] }).catch(() => {})
        return
      }
    } catch {}
    setTimeout(poll, 2000)
  }
  poll()
}

function goFeynman() {
  if (idiom.value) router.push('/review/feynman/' + encodeURIComponent(idiom.value.idiom))
}

watch(() => route.params.word, (newWord, oldWord) => {
  
  loadData()
}, { immediate: false })
onMounted(loadData)
onActivated(() => { loadData() })
</script>

<style scoped>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
.exam-evidence-term {
  color: #c0392b;
  background: rgba(254, 226, 226, 0.85);
  font-weight: 700;
  text-decoration: underline;
  text-decoration-thickness: 1.5px;
  text-underline-offset: 3px;
}
.media-evidence-term {
  color: #c0392b;
  background: rgba(254, 226, 226, 0.85);
  font-weight: 700;
  text-decoration: underline;
  text-decoration-thickness: 1.5px;
  text-underline-offset: 3px;
}
</style>

<template>
  <div class="min-h-dvh pb-safe">
    <header class="sticky top-0 z-40 bg-bg/85 backdrop-blur-lg border-b border-warm-gray/30">
      <div class="max-w-lg mx-auto px-4 h-12 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <button aria-label="返回首页" @click="safeBack" class="w-7 h-7 flex items-center justify-center rounded-full hover:bg-warm-gray/20 transition-colors">
            <svg class="w-4 h-4 text-ink" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
          </button>
          <h1 class="text-[15px] font-serif font-bold text-ink">词典大全</h1>
        </div>
        <span class="text-[11px] text-ink-muted">共 {{ total }} 条</span>
      </div>
    </header>

    <div class="max-w-lg mx-auto px-4 pt-4">
    <!-- Sticky search area -->
<div class="sticky top-12 z-30 bg-bg/95 backdrop-blur-lg pb-2 pt-2">

<!-- Toggle + Search -->
      <div class="mb-4 animate-fade-up">
        <div class="flex gap-2 mb-2.5">
          <input v-model="filter" type="text"
            :placeholder="searchType === 'idiom' ? '输入成语、拼音、释义...' : '输入实词、释义...'"
            class="flex-1 pl-4 pr-4 py-2.5 text-[14px] rounded-full bg-white border border-warm-gray shadow-[0_1px_4px_rgba(0,0,0,0.03)] focus:outline-none focus:border-cinnabar transition-colors placeholder:text-ink-muted/50"
            @input="onInput" @keydown.enter="fetchList" />
          <button @click="fetchList" class="px-4 py-2.5 rounded-full bg-cinnabar text-white text-sm font-medium shrink-0">搜索</button>
        </div>
        <!-- Toggle: 成语 / 实词 -->
        <div class="flex items-center gap-2">
          <div class="flex bg-warm-gray-light rounded-full p-0.5 flex-1">
            <button @click="switchType('idiom')"
              class="flex-1 py-1.5 text-[12px] font-medium rounded-full transition-all duration-200"
              :class="searchType === 'idiom' ? 'bg-white text-cinnabar shadow-sm' : 'text-ink-muted'">
              成语
            </button>
            <button @click="switchType('word')"
              class="flex-1 py-1.5 text-[12px] font-medium rounded-full transition-all duration-200"
              :class="searchType === 'word' ? 'bg-white text-cinnabar shadow-sm' : 'text-ink-muted'">
              实词
            </button>
          </div>
        </div>
      </div>

      <!-- Categories -->
      <div v-if="searchType === 'idiom'" class="mb-4 overflow-x-auto scrollbar-hide animate-fade-up delay-1">
        <div class="flex gap-2 pb-1 w-max">
          <button data-testid="frequency-high" :aria-selected="activeFrequency === '高频'" @click="selectFrequency('高频')"
            class="shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold transition-all"
            :class="activeFrequency === '高频' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'">高频成语</button>
          <button data-testid="frequency-all" :aria-selected="activeFrequency === '' && activeCat === ''" @click="selectFrequency('')"
            class="shrink-0 px-3 py-1 rounded-full text-[11px] font-medium transition-all"
            :class="activeFrequency === '' && activeCat === '' ? 'bg-cinnabar text-white' : 'bg-warm-gray-light text-ink-body hover:bg-warm-gray'">全部</button>
          <button v-for="cat in idiomCategories" :key="cat" @click="activeCat = cat; activeFrequency = ''; fetchList()"
            class="shrink-0 px-3 py-1 rounded-full text-[11px] font-medium transition-all"
            :class="activeCat === cat ? 'bg-cinnabar text-white' : 'bg-warm-gray-light text-ink-body hover:bg-warm-gray'">{{ cat }}</button>
        </div>
      </div>

      <div v-if="searchType === 'word' && wordCategories.length" class="mb-4 overflow-x-auto scrollbar-hide animate-fade-up delay-1">
        <div class="flex gap-2 pb-1 w-max">
          <button @click="activeCat = ''; activeFrequency = ''; fetchList()"
            class="shrink-0 px-3 py-1 rounded-full text-[11px] font-medium transition-all"
            :class="activeCat === '' ? 'bg-cinnabar text-white' : 'bg-warm-gray-light text-ink-body hover:bg-warm-gray'">全部</button>
          <button v-for="cat in wordCategories" :key="cat" @click="activeCat = cat; fetchList()"
            class="shrink-0 px-3 py-1 rounded-full text-[11px] font-medium transition-all"
            :class="activeCat === cat ? 'bg-cinnabar text-white' : 'bg-warm-gray-light text-ink-body hover:bg-warm-gray'">{{ cat }}</button>
        </div>
      </div>
</div>

<!-- Loading -->
      <div v-if="loading" class="py-8 text-center">
        <div class="inline-block w-6 h-6 border-2 border-cinnabar/30 border-t-cinnabar rounded-full animate-spin mb-2"></div>
        <p class="text-xs text-ink-muted">正在搜索...</p>
      </div>

      <!-- AI Generating -->
      <div v-else-if="aiGenerating" class="text-center py-12">
        <div class="inline-block w-8 h-8 border-2 border-cinnabar/30 border-t-cinnabar rounded-full animate-spin mb-3"></div>
        <p class="text-sm text-ink-body font-medium mb-1">AI 正在为您生成「{{ filter }}」...</p>
        <p class="text-xs text-ink-muted">首次查询需 2-5 秒，生成后将自动保存到词库</p>
      </div>

      <!-- Empty -->
      <div v-else-if="rows.length === 0 && !aiGenerating" class="text-center py-12">
        <div class="text-4xl mb-3">??</div>
        <p class="text-sm text-ink-muted mb-2">未找到相关内容</p>
        <p class="text-xs text-ink-muted">试试其他关键词，如拼音或释义</p>
      </div>

      <!-- Results -->
      <div v-else class="space-y-2.5 pb-8">
        <button v-for="(item, idx) in rows" :key="getItemKey(item)" @click="goTo(item)"
          class="w-full bg-white rounded-xl p-4 border border-warm-gray/30 shadow-[0_1px_4px_rgba(0,0,0,0.03)] text-left hover:shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-200 animate-slide-up"
          :class="'stagger-' + Math.min(idx + 1, 10)">
          <div class="flex items-center justify-between mb-1">
            <span class="text-[15px] font-serif font-bold text-ink" v-html="highlight(getItemName(item))"></span>
            <div class="flex items-center gap-1.5">
              <span v-if="searchType === 'idiom' && item.frequency === '高频'" class="px-1.5 py-0.5 rounded text-[9px] bg-amber-50 text-amber-700 font-medium">高频</span>
              <span v-if="searchType === 'idiom' && item.sentiment && item.sentiment !== 'neutral'" class="px-1.5 py-0.5 rounded text-[9px]"
                :class="item.sentiment === '褒义' ? 'bg-emerald-50 text-emerald-700' : item.sentiment === '贬义' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600'">
                {{ item.sentiment }}
              </span>
            </div>
          </div>
          <p v-if="item.pinyin" class="text-[11px] text-ink-muted mb-1" v-html="highlight(formatPinyin(item.pinyin))"></p>
          <p class="text-[12px] text-ink-body leading-relaxed line-clamp-2" v-html="highlight(item.explanation)"></p>
          <div v-if="searchType === 'word' && item.pos" class="mt-1.5">
            <span class="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded">{{ item.pos }}</span>
          </div>
        </button>

        <div v-if="rows.length < total" class="text-center py-4">
          <button @click="loadMore" class="px-6 py-2 bg-warm-gray/20 rounded-full text-xs text-ink-body hover:bg-warm-gray/30 transition-all">
            加载更多（{{ rows.length }}/{{ total }}）
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useRouter } from "vue-router"
import { apiGet } from "../api"
import { useHistory } from "../stores/app"
import { useSafeBack } from "../composables/useSafeBack"
import {
  getStaticIdiomCategories,
  getStaticWordCategories,
  searchStaticIdioms,
  searchStaticWords,
} from "../services/dictionary-static"

type SearchRow = Record<string, any>

const router = useRouter()
const { safeBack } = useSafeBack("/")
const { add } = useHistory()

const searchType = ref<'idiom' | 'word'>('idiom')
const filter = ref("")
const activeCat = ref("")
const activeFrequency = ref("")
const loading = ref(false)
const rows = ref<SearchRow[]>([])
const total = ref(0)
const wordCategories = ref<string[]>([])
const aiGenerating = ref(false)
let aiPollTimer: ReturnType<typeof setTimeout> | null = null


function formatPinyin(py: string): string {
  if (!py) return ''
  if (py.includes(' ')) return py
  const vowels = 'aeiou\u0101\u00E1\u0113\u00E9\u012B\u00ED\u014D\u00F3\u016B\u00FA\u00FC'
  const cons = 'bpmfdtnlgkhjqxrzcsyw'
  const re = new RegExp('([' + vowels + '])((?:[' + cons + '])?(?=[' + vowels + ']))', 'g')
  return py.replace(re, '$1 $2')
}

const idiomCategories = ref<string[]>([])

let debounceTimer: ReturnType<typeof setTimeout> | null = null
const isStaticPagesBuild = import.meta.env.VITE_STATIC_PAGES === 'true'

function onInput() {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => fetchList(), 300)
}

function switchType(type: 'idiom' | 'word') {
  if (searchType.value === type) return
  searchType.value = type
  activeCat.value = ""
  activeFrequency.value = ""
  rows.value = []
  total.value = 0
  filter.value = ""
  fetchList()
}

function getItemKey(item: SearchRow) {
  return searchType.value === 'idiom' ? item.idiom : item.word
}

function getItemName(item: SearchRow) {
  return searchType.value === 'idiom' ? item.idiom : item.word
}

function selectFrequency(frequency: string) {
  activeFrequency.value = frequency
  activeCat.value = ''
  fetchList()
}

// The API and the static export normally return this order already, but the
// view also enforces it so a stale cache or a different backend cannot push
// exam-high-frequency idioms below the alphabetical tail.  Keep exact/prefix
// query matches ahead of the frequency tie-breaker when the user is searching.
function frequencyRank(item: SearchRow) {
  const frequency = String(item.frequency ?? '').trim()
  return frequency === '高频' ? 0 : frequency === '中频' ? 1 : 2
}

function orderedRows(items: SearchRow[], query: string) {
  if (searchType.value !== 'idiom') return items
  const needle = query.trim().toLocaleLowerCase()
  return [...items].sort((a, b) => {
    if (needle) {
      const aName = String(a.idiom ?? '').toLocaleLowerCase()
      const bName = String(b.idiom ?? '').toLocaleLowerCase()
      const aMatch = aName === needle ? 0 : aName.startsWith(needle) ? 1 : 2
      const bMatch = bName === needle ? 0 : bName.startsWith(needle) ? 1 : 2
      if (aMatch !== bMatch) return aMatch - bMatch
    }
    return frequencyRank(a) - frequencyRank(b) || Number(a.id ?? 0) - Number(b.id ?? 0)
  })
}

async function fetchList() {
  if (aiPollTimer) { clearTimeout(aiPollTimer); aiPollTimer = null }
  aiGenerating.value = false
  loading.value = true
  const q = filter.value.trim()
  try {
    if (searchType.value === 'idiom') {
      const data = isStaticPagesBuild
        ? await searchStaticIdioms({ q, category: activeCat.value, frequency: activeFrequency.value, limit: 30 })
        : await apiGet<{ ok: boolean; total: number; rows: SearchRow[] }>('/api/idioms', { q: q || undefined, category: activeCat.value || undefined, frequency: activeFrequency.value || undefined, limit: 100 }).then((data) => {
            // Older servers ignore the optional frequency parameter. Filter
            // the returned rows locally so the first tap still opens a true
            // high-frequency memory set instead of a misleading list.
            if (activeFrequency.value) return { ...data, rows: (data.rows || []).filter((row: SearchRow) => row.frequency === activeFrequency.value) }
            return data
          }).catch(() => searchStaticIdioms({ q, category: activeCat.value, frequency: activeFrequency.value, limit: 30 }))
      rows.value = orderedRows(data.rows || [], q)
      total.value = data.total || 0
    } else {
      const data = isStaticPagesBuild
        ? await searchStaticWords({ q, category: activeCat.value, limit: 30 })
        : await apiGet<{ ok: boolean; total: number; rows: SearchRow[] }>('/api/words', { q: q || undefined, limit: 30 }).catch(() => searchStaticWords({ q, category: activeCat.value, limit: 30 }))
      rows.value = data.rows || []
      total.value = data.total || 0
    }
    // If no results and query looks like a valid Chinese word (2+ chars), trigger AI generation
    if (!isStaticPagesBuild && rows.value.length === 0 && q && q.length >= 2 && /[\u4e00-\u9fa5]/.test(q)) {
      const { apiPost } = await import('../api')
      await apiPost('/api/generate', { word: q, type: searchType.value === 'idiom' ? 'idiom' : 'word' })
      aiGenerating.value = true
      pollForAiResult(q)
    }
  } catch { rows.value = []; total.value = 0 } finally { loading.value = false }
}

async function pollForAiResult(word: string) {
  let attempts = 0
  const maxAttempts = 30
  const poll = async () => {
    if (attempts >= maxAttempts) { aiGenerating.value = false; return }
    attempts++
    try {
      if (searchType.value === 'idiom') {
        const data = await apiGet<{ ok: boolean; data: any }>('/api/idioms/' + encodeURIComponent(word))
        if (data.ok && data.data) {
          rows.value = [data.data]
          total.value = 1
          aiGenerating.value = false
          return
        }
      } else {
        const data = await apiGet<{ ok: boolean; data: any }>('/api/words/' + encodeURIComponent(word))
        if (data.ok && data.data) {
          rows.value = [data.data]
          total.value = 1
          aiGenerating.value = false
          return
        }
      }
    } catch {}
    aiPollTimer = setTimeout(poll, 2000)
  }
  poll()
}

async function loadMore() {
  try {
    if (searchType.value === 'idiom') {
      const q = filter.value.trim()
      const data = isStaticPagesBuild
        ? await searchStaticIdioms({ q, category: activeCat.value, frequency: activeFrequency.value, limit: 30, offset: rows.value.length })
        : await apiGet<{ ok: boolean; total: number; rows: SearchRow[] }>('/api/idioms', { q: q || undefined, category: activeCat.value || undefined, frequency: activeFrequency.value || undefined, limit: 100, offset: rows.value.length }).then((result) => activeFrequency.value ? { ...result, rows: (result.rows || []).filter((row: SearchRow) => row.frequency === activeFrequency.value) } : result).catch(() => searchStaticIdioms({ q, category: activeCat.value, frequency: activeFrequency.value, limit: 30, offset: rows.value.length }))
      rows.value = orderedRows([...rows.value, ...(data.rows || [])], q)
    } else {
      const q = filter.value.trim()
      const data = isStaticPagesBuild
        ? await searchStaticWords({ q, category: activeCat.value, limit: 30, offset: rows.value.length })
        : await apiGet<{ ok: boolean; total: number; rows: SearchRow[] }>('/api/words', { q: q || undefined, limit: 30, offset: rows.value.length }).catch(() => searchStaticWords({ q, category: activeCat.value, limit: 30, offset: rows.value.length }))
      rows.value.push(...(data.rows || []))
    }
  } catch {}
}

function highlight(text: string) {
  const q = filter.value.trim()
  if (!q || !text) return text || ''
  return text.replace(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g'), '<mark class="bg-yellow-200 rounded px-0.5">$1</mark>')
}

function goTo(item: SearchRow) {
  const name = getItemName(item)
  add(name)
  if (searchType.value === 'idiom') {
    router.push({ name: "Result", params: { word: name } })
  } else {
    router.push({ name: "WordDetail", params: { word: name } })
  }
}

import { onBeforeRouteLeave } from 'vue-router'

onBeforeRouteLeave(() => {
  if (aiPollTimer) { clearTimeout(aiPollTimer); aiPollTimer = null }
  aiGenerating.value = false
})

onMounted(async () => {
  fetchList()
  if (isStaticPagesBuild) {
    wordCategories.value = await getStaticWordCategories().catch(() => [])
    idiomCategories.value = await getStaticIdiomCategories().catch(() => [])
    return
  }
  wordCategories.value = await apiGet<{ ok: boolean; data: string[] }>('/api/words/categories')
    .then((data) => data.data || [])
    .catch(() => getStaticWordCategories().catch(() => []))
  idiomCategories.value = await apiGet<{ ok: boolean; data: string[] }>('/api/idioms/categories')
    .then((data) => data.data || [])
    .catch(() => getStaticIdiomCategories().catch(() => []))
})
</script>

<style scoped>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
.line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
</style>

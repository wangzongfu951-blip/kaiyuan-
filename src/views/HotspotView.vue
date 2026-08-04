<template>
  <div class="min-h-dvh bg-bg pb-safe">
    <header class="sticky top-0 z-40 border-b border-warm-gray/30 bg-bg/90 backdrop-blur-lg">
      <div class="mx-auto flex h-14 max-w-lg items-center gap-2 px-4">
        <button
          type="button"
          aria-label="返回首页"
          class="flex h-8 w-8 items-center justify-center rounded-full text-ink hover:bg-warm-gray/20"
          @click="safeBack"
        >
          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m15 19-7-7 7-7" />
          </svg>
        </button>
        <div class="min-w-0 flex-1">
          <h1 class="font-serif text-[16px] font-bold text-ink-title">热点词搭配</h1>
          <p class="text-[10px] text-ink-muted">按图片式短句积累政策表达</p>
        </div>
        <span v-if="total > 0" class="text-[11px] tabular-nums text-ink-muted">{{ total }} 条</span>
      </div>
    </header>

    <main class="mx-auto max-w-lg px-4 pb-10 pt-3">
      <section class="sticky top-14 z-30 -mx-4 bg-bg/95 px-4 pb-3 pt-1 backdrop-blur-lg">
        <div class="grid grid-cols-2 gap-2" role="tablist" aria-label="热点词库范围">
          <button
            type="button"
            role="tab"
            data-testid="hotspot-preset-image"
            :aria-selected="preset === 'image'"
            class="rounded-xl px-3 py-2 text-[12px] font-semibold transition-colors"
            :class="preset === 'image' ? 'bg-cinnabar text-white' : 'bg-warm-gray-light text-ink-body'"
            @click="selectPreset('image')"
          >
            图片模板 <span class="ml-1 text-[10px] opacity-80">66</span>
          </button>
          <button
            type="button"
            role="tab"
            data-testid="hotspot-preset-full"
            :aria-selected="preset === 'full'"
            class="rounded-xl px-3 py-2 text-[12px] font-semibold transition-colors"
            :class="preset === 'full' ? 'bg-cinnabar text-white' : 'bg-warm-gray-light text-ink-body'"
            @click="selectPreset('full')"
          >
            完整词库 <span class="ml-1 text-[10px] opacity-80">667</span>
          </button>
        </div>

        <div class="mt-2 flex items-center gap-2">
          <label class="sr-only" for="hotspot-search">搜索热点词或搭配</label>
          <div class="flex min-w-0 flex-1 items-center gap-2 rounded-2xl border border-warm-gray/70 bg-white px-3 py-2 shadow-[0_1px_4px_rgba(0,0,0,0.03)] focus-within:border-cinnabar">
            <svg class="h-4 w-4 shrink-0 text-ink-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m21 21-4.35-4.35m2.1-5.4a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" />
            </svg>
            <input
              id="hotspot-search"
              v-model="query"
              type="search"
              autocomplete="off"
              placeholder="搜索热点词或搭配"
              class="min-w-0 flex-1 bg-transparent text-[13px] text-ink-title outline-none placeholder:text-ink-muted/70"
              @keydown.enter="runSearch"
            >
            <button v-if="query" type="button" aria-label="清除搜索" class="text-ink-muted" @click="clearQuery">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m6 6 12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
          <button type="button" class="shrink-0 rounded-2xl bg-cinnabar px-3.5 py-2.5 text-[12px] font-semibold text-white" @click="runSearch">
            搜索
          </button>
        </div>

        <div v-if="preset === 'full' && topics.length" class="mt-2 flex gap-2 overflow-x-auto pb-1 scrollbar-hide" aria-label="按主题筛选">
          <button
            type="button"
            class="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors"
            :class="activeTopic === '' ? 'bg-cinnabar text-white' : 'bg-warm-gray-light text-ink-body'"
            @click="selectTopic('')"
          >
            全部主题
          </button>
          <button
            v-for="topic in topics"
            :key="topic"
            type="button"
            class="shrink-0 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors"
            :class="activeTopic === topic ? 'bg-cinnabar text-white' : 'bg-warm-gray-light text-ink-body'"
            @click="selectTopic(topic)"
          >
            {{ topic }}
          </button>
        </div>
      </section>

      <p v-if="errorMessage" class="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-[12px] leading-relaxed text-red-700" role="alert">
        {{ errorMessage }}
      </p>

      <div v-if="loading" class="space-y-3" aria-live="polite" aria-label="正在加载热点词搭配">
        <div v-for="item in 6" :key="item" class="h-12 animate-pulse rounded-xl bg-white/80" />
      </div>

      <div v-else-if="!filteredRows.length" class="rounded-2xl bg-white px-6 py-12 text-center shadow-sm">
        <p class="font-serif text-[15px] font-bold text-ink-title">暂未找到相关搭配</p>
        <p class="mt-2 text-[12px] leading-relaxed text-ink-muted">换一个热点词，或切换主题试试。</p>
      </div>

      <section v-else class="space-y-1" aria-label="热点词搭配列表" data-testid="hotspot-topic-list">
        <article v-for="row in visibleRows" :key="row.id" class="hotspot-line">
          <button type="button" class="hotspot-line-button" @click="toggleRow(row)">
            <span class="hotspot-line-text">
              <template v-for="(part, index) in highlightParts(rowText(row), row.hotTerm)" :key="`${row.id}-${index}`">
                <span v-if="part.hot" class="hotspot-term">{{ part.text }}</span>
                <span v-else>{{ part.text }}</span>
              </template>
            </span>
            <svg class="hotspot-chevron" :class="{ 'is-open': expandedId === row.id }" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="m9 18 6-6-6-6" />
            </svg>
          </button>

          <div v-if="expandedId === row.id" class="hotspot-detail" data-testid="hotspot-detail">
            <p class="hotspot-detail-item"><span>词义</span>{{ row.meaning }}</p>
            <p class="hotspot-detail-item"><span>用法与语境</span>{{ row.usageContext }}</p>
            <p class="hotspot-detail-item"><span>示例</span>{{ row.modelSentence }}</p>
            <p v-if="row.examFunction" class="hotspot-detail-item"><span>考场用法</span>{{ row.examFunction }}</p>
            <p v-if="row.commonErrors" class="hotspot-detail-item"><span>常见误用</span>{{ row.commonErrors }}</p>
            <div v-if="row.sourceEvidence?.length || row.modelSentence" class="hotspot-evidence">
              <p class="hotspot-evidence-title">来源证据（库内审校例句）</p>
              <div v-if="!row.sourceEvidence?.length" class="hotspot-evidence-card">
                <p class="hotspot-evidence-excerpt" v-html="highlightEvidence(row.modelSentence, row.hotTerm)"></p>
                <p class="hotspot-evidence-note">当前仅有库内审校例句，未将搜索页冒充为原文；请以已核验来源页面为准。</p>
              </div>
              <article v-for="evidence in row.sourceEvidence" :key="`${row.id}-${evidence.sourceKey}`" class="hotspot-evidence-card">
                <p class="hotspot-evidence-excerpt" v-html="highlightEvidence(evidence.excerpt, evidence.highlightTerm || row.hotTerm)"></p>
                <p v-if="evidence.highlightTerm && !evidence.excerpt.includes(evidence.highlightTerm)" class="hotspot-evidence-term-fallback">关联热点词：<mark>{{ evidence.highlightTerm }}</mark></p>
                <div class="hotspot-evidence-meta">
                  <span>{{ evidence.organization || '权威媒体' }}{{ evidence.date ? ` · ${evidence.date}` : '' }}</span>
                  <span v-if="evidence.authorityLevel">权威级别 {{ evidence.authorityLevel }}</span>
                  <span v-if="evidence.verificationStatus">{{ evidence.verificationStatus }}</span>
                </div>
                <a v-if="evidence.url" :href="evidence.url" target="_blank" rel="noopener noreferrer" class="hotspot-evidence-link">打开已核验来源 ↗</a>
                <p class="hotspot-evidence-note">{{ evidence.note }}</p>
              </article>
            </div>
          </div>
        </article>
      </section>

      <button
        v-if="visibleRows.length < filteredRows.length && !loading"
        type="button"
        class="mt-4 block w-full rounded-xl bg-white py-2.5 text-[12px] font-medium text-ink-body shadow-sm"
        @click="loadMore"
      >
        加载更多（还剩 {{ filteredRows.length - visibleRows.length }} 条）
      </button>
      <p v-if="!loading && visibleRows.length === filteredRows.length && filteredRows.length > 0" class="py-4 text-center text-[11px] text-ink-muted">
        已展示全部 {{ filteredRows.length }} 条
      </p>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { apiGet } from '../api'
import { useSafeBack } from '../composables/useSafeBack'
import { loadStaticHotspots, type HotspotStaticPreset, type HotspotStaticRow } from '../services/hotspots-static'

const { safeBack } = useSafeBack('/')
const preset = ref<HotspotStaticPreset>('image')
const query = ref('')
const activeTopic = ref('')
const sourceRows = ref<HotspotStaticRow[]>([])
const loading = ref(false)
const errorMessage = ref('')
const expandedId = ref('')
const visibleLimit = ref(40)

const topics = computed(() => [...new Set(sourceRows.value.map((row) => row.theme).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN')))
const filteredRows = computed(() => {
  const needle = query.value.trim().toLocaleLowerCase()
  return sourceRows.value.filter((row) => {
    if (activeTopic.value && row.theme !== activeTopic.value) return false
    if (!needle) return true
    return [row.hotTerm, row.collocation, row.theme, row.meaning, row.usageContext, row.modelSentence]
      .join('\n')
      .toLocaleLowerCase()
      .includes(needle)
  })
})
const visibleRows = computed(() => filteredRows.value.slice(0, visibleLimit.value))
const total = computed(() => filteredRows.value.length)

function rowText(row: HotspotStaticRow): string {
  return row.collocation.includes(row.hotTerm) ? row.collocation : `${row.hotTerm}：${row.collocation}`
}

function termVariants(term: string): string[] {
  const values = new Set<string>([term])
  term.replace(/[“”「」『』"']/g, '').split(/[／/、|｜]/).forEach((part) => {
    if (part.trim()) values.add(part.trim())
  })
  return [...values].sort((a, b) => b.length - a.length)
}

function highlightParts(text: string, term: string): Array<{ text: string; hot: boolean }> {
  const variants = termVariants(term)
  const parts: Array<{ text: string; hot: boolean }> = []
  let cursor = 0
  while (cursor < text.length) {
    let start = -1
    let matched = ''
    for (const variant of variants) {
      const candidate = text.indexOf(variant, cursor)
      if (candidate >= 0 && (start < 0 || candidate < start || (candidate === start && variant.length > matched.length))) {
        start = candidate
        matched = variant
      }
    }
    if (start < 0 || !matched) {
      parts.push({ text: text.slice(cursor), hot: false })
      break
    }
    if (start > cursor) parts.push({ text: text.slice(cursor, start), hot: false })
    parts.push({ text: matched, hot: true })
    cursor = start + matched.length
  }
  return parts.length ? parts : [{ text, hot: false }]
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function highlightEvidence(text: string, term: string): string {
  const passage = text || ''
  const needle = term || ''
  if (!needle) return escapeHtml(passage)
  const pattern = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
  let output = ''
  let cursor = 0
  for (const match of passage.matchAll(pattern)) {
    const start = match.index ?? 0
    output += escapeHtml(passage.slice(cursor, start))
    output += `<mark style="color:#cf3d4f;font-weight:700;text-decoration:underline;text-underline-offset:3px">${escapeHtml(match[0])}</mark>`
    cursor = start + match[0].length
  }
  return output + escapeHtml(passage.slice(cursor))
}

async function loadFromApi(): Promise<HotspotStaticRow[]> {
  const rows: HotspotStaticRow[] = []
  let offset = 0
  let total = 0
  do {
    const result = await apiGet<{ total?: number; rows?: Array<Record<string, unknown>> }>('/api/hotspots', {
      preset: preset.value === 'image' ? 'image' : undefined,
      limit: 100,
      offset,
    })
    total = Number(result.total || 0)
    const page = (result.rows || []).map((row) => ({
      id: String(row.id ?? row.recordId ?? ''),
      hotTerm: String(row.hotTerm ?? row.hot_term ?? ''),
      collocation: String(row.collocation ?? ''),
      theme: String(row.theme ?? ''),
      meaning: String(row.meaning ?? ''),
      usageContext: String(row.usageContext ?? row.usage_context ?? ''),
      modelSentence: String(row.modelSentence ?? row.model_sentence ?? ''),
      examFunction: String(row.examFunction ?? row.exam_function ?? ''),
      commonErrors: String(row.commonErrors ?? row.common_errors ?? ''),
      sourceKeys: String(row.sourceKeys ?? row.source_keys ?? ''),
      year: row.year == null ? null : Number(row.year),
      sourceEvidence: Array.isArray(row.sourceEvidence ?? row.sources)
        ? (row.sourceEvidence ?? row.sources).map((source: any) => ({
          sourceKey: String(source.sourceKey ?? source.key ?? ''),
          title: String(source.title ?? source.sourceTitle ?? ''),
          organization: String(source.organization ?? source.sourceOrg ?? ''),
          date: String(source.date ?? source.sourceDate ?? ''),
          url: String(source.url ?? source.sourceUrl ?? ''),
          authorityLevel: String(source.authorityLevel ?? ''),
          verificationStatus: String(source.verificationStatus ?? ''),
          excerpt: String(source.excerpt ?? source.evidenceText ?? ''),
          highlightTerm: String(source.highlightTerm ?? row.hotTerm ?? ''),
          evidenceKind: String(source.evidenceKind ?? 'database_example'),
          note: String(source.note ?? '来源元数据已核验；正文需以公开来源页面为准。'),
        }))
        : [],
    }))
    rows.push(...page)
    offset += page.length
    if (!page.length) break
  } while (rows.length < total)
  return rows
}

async function loadRows() {
  loading.value = true
  errorMessage.value = ''
  expandedId.value = ''
  try {
    sourceRows.value = await loadStaticHotspots(preset.value)
  } catch {
    try {
      sourceRows.value = await loadFromApi()
    } catch {
      sourceRows.value = []
      errorMessage.value = '热点词数据暂时无法加载，请稍后重试。'
    }
  } finally {
    loading.value = false
  }
}

function selectPreset(next: HotspotStaticPreset) {
  if (preset.value === next) return
  preset.value = next
}

function selectTopic(topic: string) {
  activeTopic.value = topic
  visibleLimit.value = 40
  expandedId.value = ''
}

function runSearch() {
  visibleLimit.value = 40
  expandedId.value = ''
}

function clearQuery() {
  query.value = ''
  runSearch()
}

function loadMore() {
  visibleLimit.value += 40
}

function toggleRow(row: HotspotStaticRow) {
  expandedId.value = expandedId.value === row.id ? '' : row.id
}

watch(preset, () => {
  activeTopic.value = ''
  visibleLimit.value = 40
  void loadRows()
})

watch([query, activeTopic], () => {
  visibleLimit.value = 40
  expandedId.value = ''
})

onMounted(() => {
  void loadRows()
})
</script>

<style scoped>
.hotspot-line {
  overflow: hidden;
  border-bottom: 1px solid rgba(223, 228, 239, 0.65);
}

.hotspot-line-button {
  display: flex;
  width: 100%;
  min-height: 44px;
  align-items: center;
  gap: 8px;
  padding: 8px 2px;
  color: #20283e;
  text-align: left;
}

.hotspot-line-button:hover,
.hotspot-line-button:focus-visible {
  color: #151c31;
}

.hotspot-line-text {
  flex: 1;
  font-family: var(--font-family-serif);
  font-size: 15px;
  font-weight: 650;
  line-height: 1.7;
}

.hotspot-term {
  color: #cf3d4f;
  text-decoration-line: underline;
  text-decoration-thickness: 1.5px;
  text-underline-offset: 3px;
}

.hotspot-chevron {
  width: 15px;
  height: 15px;
  flex: 0 0 auto;
  color: #a1a8b8;
  transition: transform 180ms ease;
}

.hotspot-chevron.is-open {
  transform: rotate(90deg);
}

.hotspot-detail {
  margin: 0 2px 10px;
  padding: 10px 12px;
  border-radius: 12px;
  background: #fff;
  box-shadow: 0 2px 10px rgba(32, 40, 62, 0.06);
}

.hotspot-detail-item {
  margin: 0 0 7px;
  color: #5f6981;
  font-size: 12px;
  line-height: 1.75;
}

.hotspot-detail-item:last-child {
  margin-bottom: 0;
}

.hotspot-detail-item > span {
  display: inline-block;
  margin-right: 6px;
  color: #4d60d4;
  font-size: 11px;
  font-weight: 700;
}

.hotspot-evidence {
  margin-top: 12px;
  border-top: 1px solid rgba(223, 228, 239, 0.8);
  padding-top: 10px;
}

.hotspot-evidence-title {
  margin: 0 0 8px;
  color: #4d60d4;
  font-size: 11px;
  font-weight: 700;
}

.hotspot-evidence-card {
  margin-bottom: 8px;
  padding: 9px 10px;
  border-radius: 10px;
  background: #fafbff;
}

.hotspot-evidence-card:last-child {
  margin-bottom: 0;
}

.hotspot-evidence-excerpt {
  margin: 0;
  color: #3f485c;
  font-family: var(--font-family-serif);
  font-size: 12px;
  line-height: 1.75;
}

.hotspot-evidence-term-fallback {
  margin: 5px 0 0;
  color: #8a93a6;
  font-size: 10px;
}

.hotspot-evidence-term-fallback mark {
  color: #cf3d4f;
  background: rgba(254, 226, 226, 0.85);
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.hotspot-evidence-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  margin-top: 5px;
  color: #8a93a6;
  font-size: 10px;
}

.hotspot-evidence-link {
  display: inline-block;
  margin-top: 4px;
  color: #4d60d4;
  font-size: 10px;
  text-decoration: underline;
}

.hotspot-evidence-note {
  margin: 4px 0 0;
  color: #a1a8b8;
  font-size: 10px;
  line-height: 1.5;
}

@media (prefers-reduced-motion: reduce) {
  .hotspot-chevron {
    transition: none;
  }
}
</style>

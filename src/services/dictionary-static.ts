export interface StaticIdiomRow {
  id: number
  idiom: string
  pinyin: string
  explanation: string
  source_book: string
  source_chapter: string
  source_text: string
  context: string
  context_translation: string
  exam_trap: string
  original_text_url: string
  category: string
  frequency: string
  word_type: string
  abbreviation: string
  exam_category: string
  synonyms: string
  antonyms: string
  knowledge_points: string
  exam_points: string
  modern_example: string
  sentiment: string
  examOccurrences?: StaticExamOccurrence[]
  /** Verified authority-media paragraphs stored in the static corpus. */
  mediaOccurrences?: StaticMediaOccurrence[]
  /** Backward-compatible alias used by older API snapshots. */
  mediaSources?: StaticMediaOccurrence[]
}

export interface StaticMediaOccurrence {
  articleTitle?: string
  title?: string
  organization?: string
  site?: string
  publishDate?: string
  date?: string
  officialUrl?: string
  url?: string
  paragraph?: string
  excerpt?: string
  sourceExcerpt?: string
  highlightTerm?: string
  sourceKind?: string
  note?: string
}

export interface StaticExamOccurrence {
  sourceType: 'exam_paper' | 'exam_question' | string
  sourceId: number
  paperId: number | null
  questionId: number | null
  title: string
  examTitle: string
  examType: string
  year: number | null
  province: string
  questionType: string
  passage: string
  termRole: 'stem' | 'option' | string
  highlightTerm: string
  source: string
  sourceUrl: string
  sourceNote: string
}

export interface StaticWordRow {
  id: number
  word: string
  word_type: string
  pinyin: string
  explanation: string
  pos: string
  examples: string
  synonyms: string
  antonyms: string
  category: string
  frequency: string
  sentiment: string
  source_book: string
  source_chapter: string
  source_text: string
  context: string
  context_translation: string
  modern_example: string
  exam_trap: string
  source: string
  sourceKind?: string
  verificationStatus?: string
  examReferences?: Array<{
    questionId?: number
    year?: number
    title?: string
    province?: string
    examType?: string
    source?: string
    questionSnippet?: string
    termRole?: string
    verificationStatus?: string
    note?: string
  }>
  mediaOccurrences?: StaticMediaOccurrence[]
  mediaSources?: StaticMediaOccurrence[]
}

interface StaticPayload<T> {
  version: number
  total: number
  rows: T[]
}

let idiomPromise: Promise<StaticIdiomRow[]> | null = null
let wordPromise: Promise<StaticWordRow[]> | null = null

function staticUrl(fileName: string): string {
  const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`
  return `${base}data/${fileName}`
}

async function loadPayload<T>(fileName: string): Promise<T[]> {
  const response = await fetch(staticUrl(fileName), { cache: 'no-cache' })
  if (!response.ok) throw new Error(`static dictionary request failed: ${response.status}`)
  const payload = await response.json() as StaticPayload<T>
  if (!payload || !Array.isArray(payload.rows)) throw new Error(`static dictionary payload is invalid: ${fileName}`)
  return payload.rows
}

export function loadStaticIdioms(): Promise<StaticIdiomRow[]> {
  idiomPromise ??= loadPayload<StaticIdiomRow>('idioms.json')
  return idiomPromise
}

export function loadStaticWords(): Promise<StaticWordRow[]> {
  wordPromise ??= loadPayload<StaticWordRow>('words.json')
  return wordPromise
}

function includesQuery(row: Record<string, unknown>, query: string, fields: string[]): boolean {
  const needle = query.trim().toLocaleLowerCase()
  if (!needle) return true
  return fields.some((field) => String(row[field] ?? '').toLocaleLowerCase().includes(needle))
}

function sortRows<T extends Record<string, unknown>>(rows: T[], query: string, nameField: string): T[] {
  if (!query.trim()) return rows
  const needle = query.trim().toLocaleLowerCase()
  return [...rows].sort((a, b) => {
    const aName = String(a[nameField] ?? '').toLocaleLowerCase()
    const bName = String(b[nameField] ?? '').toLocaleLowerCase()
    const aRank = aName === needle ? 0 : aName.startsWith(needle) ? 1 : 2
    const bRank = bName === needle ? 0 : bName.startsWith(needle) ? 1 : 2
    return aRank - bRank || Number(a.id ?? 0) - Number(b.id ?? 0)
  })
}

export async function searchStaticIdioms(options: { q?: string; category?: string; frequency?: string; limit?: number; offset?: number } = {}) {
  const all = await loadStaticIdioms()
  const q = options.q?.trim() || ''
  const category = options.category?.trim() || ''
  const frequency = options.frequency?.trim() || ''
  const filtered = all.filter((row) => (!category || row.category === category) && (!frequency || row.frequency === frequency) && includesQuery(row, q, [
    'idiom', 'pinyin', 'explanation', 'category', 'exam_category', 'abbreviation',
  ]))
  const sorted = sortRows(filtered, q, 'idiom')
  const offset = Math.max(0, Number(options.offset) || 0)
  const limit = Math.min(100, Math.max(1, Number(options.limit) || 30))
  return { total: sorted.length, rows: sorted.slice(offset, offset + limit) }
}

export async function searchStaticWords(options: { q?: string; category?: string; frequency?: string; limit?: number; offset?: number } = {}) {
  const all = await loadStaticWords()
  const q = options.q?.trim() || ''
  const category = options.category?.trim() || ''
  const frequency = options.frequency?.trim() || ''
  const filtered = all.filter((row) => (!category || row.category === category) && (!frequency || row.frequency === frequency) && includesQuery(row, q, [
    'word', 'pinyin', 'explanation', 'pos', 'category', 'examples',
  ]))
  const sorted = sortRows(filtered, q, 'word')
  const offset = Math.max(0, Number(options.offset) || 0)
  const limit = Math.min(100, Math.max(1, Number(options.limit) || 30))
  return { total: sorted.length, rows: sorted.slice(offset, offset + limit) }
}

export async function getStaticIdiom(word: string): Promise<StaticIdiomRow | null> {
  const rows = await loadStaticIdioms()
  return rows.find((row) => row.idiom === word) || null
}

export async function getStaticWord(word: string): Promise<StaticWordRow | null> {
  const rows = await loadStaticWords()
  return rows.find((row) => row.word === word) || null
}

export async function getStaticIdiomCategories(): Promise<string[]> {
  const rows = await loadStaticIdioms()
  const counts = new Map<string, number>()
  for (const row of rows) if (row.category && row.category !== 'AI') counts.set(row.category, (counts.get(row.category) || 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([category]) => category)
}

export async function getStaticWordCategories(): Promise<string[]> {
  const rows = await loadStaticWords()
  const counts = new Map<string, number>()
  for (const row of rows) if (row.category && row.category !== 'AI') counts.set(row.category, (counts.get(row.category) || 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([category]) => category)
}

export async function getStaticRandomIdioms(count = 10): Promise<StaticIdiomRow[]> {
  const rows = await loadStaticIdioms()
  const candidates = rows.filter((row) => row.exam_trap && row.idiom)
  return candidates.slice(0, Math.max(1, Math.min(50, count)))
}

export async function getStaticHighFrequencyIdioms(count = 30): Promise<StaticIdiomRow[]> {
  const result = await searchStaticIdioms({ frequency: '高频', limit: Math.max(1, Math.min(100, count)) })
  return result.rows
}

export async function getStaticSimilarIdioms(word: string, count = 6): Promise<StaticIdiomRow[]> {
  const rows = await loadStaticIdioms()
  const current = rows.find((row) => row.idiom === word)
  if (!current) return []
  return rows.filter((row) => row.idiom !== word && current.category && row.category === current.category).slice(0, count)
}

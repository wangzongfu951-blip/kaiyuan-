#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const databasePath = path.join(projectRoot, 'backend', 'data', 'idioms.db')
const hotspotsDatabasePath = path.join(projectRoot, 'backend', 'data', 'hotspots', 'hotspot-collocations.sqlite')
const officialMediaPath = path.join(projectRoot, 'backend', 'data', 'official-media-occurrences.json')
const outputDirectory = path.resolve(process.argv[2] || path.join(projectRoot, 'public', 'data'))

const idiomFields = [
  'id', 'idiom', 'pinyin', 'explanation', 'source_book', 'source_chapter', 'source_text',
  'context', 'context_translation', 'exam_trap', 'original_text_url', 'category',
  'frequency', 'word_type', 'exam_category', 'synonyms', 'antonyms', 'knowledge_points',
  'exam_points', 'modern_example', 'sentiment', 'abbreviation',
]
const wordFields = [
  'id', 'word', 'word_type', 'pinyin', 'explanation', 'pos', 'examples', 'synonyms',
  'antonyms', 'category', 'frequency', 'sentiment', 'source_book', 'source_chapter',
  'source_text', 'context', 'context_translation', 'modern_example', 'exam_trap', 'source',
]

function text(value) {
  return value == null ? '' : String(value).trim()
}

function pick(row, fields) {
  return Object.fromEntries(fields.map((field) => [field, field === 'id' ? Number(row[field]) : text(row[field])]))
}

function parseArray(value) {
  if (Array.isArray(value)) return value.map((item) => text(item)).filter(Boolean)
  if (typeof value !== 'string' || !value.trim()) return []
  try {
    const parsed = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.map((item) => text(item)).filter(Boolean) : []
  } catch {
    return []
  }
}

function parseObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value
  if (typeof value !== 'string' || !value.trim()) return {}
  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function loadOfficialMediaOccurrences() {
  if (!fs.existsSync(officialMediaPath)) {
    return { byTerm: new Map(), audit: { legacySearchPageRecords: 0, verifiedParagraphs: 0 } }
  }
  let payload
  try {
    payload = JSON.parse(fs.readFileSync(officialMediaPath, 'utf8'))
  } catch (error) {
    throw new Error(`official media evidence is not valid JSON: ${error.message}`)
  }
  const byTerm = new Map()
  for (const row of Array.isArray(payload?.rows) ? payload.rows : []) {
    const term = text(row.term || row.idiom || row.highlightTerm)
    const paragraph = text(row.paragraph || row.excerpt)
    const highlightTerm = text(row.highlightTerm || term)
    if (!term || !paragraph || !highlightTerm || !paragraph.includes(highlightTerm)) continue
    const occurrence = {
      articleTitle: text(row.articleTitle || row.title),
      organization: text(row.organization || row.site),
      publishDate: text(row.publishDate || row.date),
      officialUrl: text(row.officialUrl || row.url),
      paragraph,
      highlightTerm,
      sourceKind: text(row.sourceKind) || 'official_media_excerpt',
      verificationStatus: text(row.verificationStatus) || 'verified',
      note: text(row.note),
    }
    if (occurrence.officialUrl && !/^https?:\/\//i.test(occurrence.officialUrl)) continue
    const bucket = byTerm.get(term) || []
    const key = `${occurrence.officialUrl}|${occurrence.paragraph}`
    if (!bucket.some((item) => `${item.officialUrl}|${item.paragraph}` === key)) bucket.push(occurrence)
    byTerm.set(term, bucket)
  }
  return { byTerm, audit: payload?.audit || {} }
}

function firstUrl(value) {
  const candidates = [value?.url, value?.sourceUrl, value?.original_text_url, value?.originalTextUrl]
  return candidates.find((candidate) => /^https?:\/\//i.test(text(candidate))) ? text(candidates.find((candidate) => /^https?:\/\//i.test(text(candidate)))) : ''
}

function parseExamQuestionMeta(row, parsedRaw) {
  const firstLine = text(row.question_text).split(/\r?\n/)[0]
  const title = text(row.title) || text(parsedRaw.question) || firstLine
  const source = text(row.source) || title
  const match = `${title} ${source}`.match(/(20\d{2})\s*年?\s*([^\s（）()]{0,12})?(?:省考|联考|国考|市考|区考|县考)/u)
  const year = Number.parseInt(text(row.year) || match?.[1] || '', 10) || null
  let province = text(row.province)
  if (!province && match?.[2]) province = match[2].replace(/[（(]$/, '').trim()
  return { title, source, year, province, examType: '公考' }
}

function isOptionLine(line) {
  return /^(?:[A-HＡ-Ｈ])\s*[\.．、:：]|^(?:[A-HＡ-Ｈ])\s*[．.、]/u.test(line.trim())
}

function extractExamPassage(rawText) {
  const lines = text(rawText)
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  const kept = []
  for (const line of lines) {
    // A line that starts with an option label is never part of the source
    // paragraph, even when it contains several options separated by spaces.
    if (isOptionLine(line)) break
    const inlineBoundary = line.search(/\s+(?:依次填入|下列各项|以下哪项|最恰当的一项|选择最恰当|根据文意|[A-HＡ-Ｈ]\s*[．.、:：])/u)
    if (inlineBoundary > 0) {
      const stem = line.slice(0, inlineBoundary).trim()
      if (stem) kept.push(stem)
      break
    }
    if (/^(?:依次填入|下列各项|以下哪项|最恰当的一项|选择最恰当|根据文意)/u.test(line)) break
    if (/^(?:例题|第?\s*\d+\s*题|题号)/u.test(line)) continue
    kept.push(line)
  }
  return kept.join(' ').replace(/\s{2,}/g, ' ').trim()
}

function standardExamSource({ title, examType, year, province, questionType }) {
  const parts = []
  if (year) parts.push(`${year}年`)
  if (province) parts.push(province)
  parts.push(examType || '公考')
  if (questionType) parts.push(questionType)
  return `${parts.join('')} · ${title || '历年公考真题'}`
}

function collectExamOccurrences(db, idiomRows) {
  const names = idiomRows.map((row) => row.idiom).filter(Boolean).sort((a, b) => b.length - a.length)
  const nameSet = new Set(names)
  const byIdiom = new Map(names.map((name) => [name, []]))
  const papers = db.prepare(`
    SELECT id, title, exam_type, year, province, question_type, question_text, options, related_idioms, raw_json
    FROM exam_papers
    ORDER BY year DESC, id ASC
  `).all()
  // Only rows explicitly marked as national/provincial exams are exposed as
  // "往届公考原题". The same database also contains专项练习/讲义 rows; those
  // are useful for drills but have no verifiable exam provenance and must not
  // be presented as a past exam source.
  const verifiedPapers = papers.filter((paper) => (
    text(paper.exam_type).length <= 2 && /^20\d{2}/u.test(text(paper.title))
  ))

  function addOccurrence(term, occurrence) {
    if (!nameSet.has(term)) return
    const bucket = byIdiom.get(term)
    if (!bucket) return
    const key = `${occurrence.sourceType}:${occurrence.sourceId}:${occurrence.passage}`
    if (bucket.some((item) => `${item.sourceType}:${item.sourceId}:${item.passage}` === key)) return
    bucket.push({ ...occurrence, highlightTerm: term })
  }

  function termsInRow(rawText, related) {
    const haystack = text(rawText)
    const terms = new Set(parseArray(related).filter((term) => nameSet.has(term)))
    // The relation column is authoritative for blanks/options, while this
    // second pass captures idioms that occur directly in the printed stem.
    for (const name of names) if (haystack.includes(name)) terms.add(name)
    return [...terms]
  }

  for (const paper of verifiedPapers) {
    const parsedRaw = parseObject(paper.raw_json)
    const passage = extractExamPassage(paper.question_text) || text(paper.question_text)
    const optionText = parseArray(paper.options).join(' ')
    const terms = termsInRow(`${paper.question_text}\n${paper.options}\n${optionText}`, paper.related_idioms)
    for (const term of terms) {
      const title = text(paper.title)
      const year = Number(paper.year) || null
      const province = text(paper.province)
      const questionType = text(paper.question_type) || '言语理解'
      const sourceUrl = firstUrl(parsedRaw)
      addOccurrence(term, {
        sourceType: 'exam_paper',
        sourceId: Number(paper.id),
        paperId: Number(paper.id),
        questionId: null,
        title,
        examTitle: title,
        examType: text(paper.exam_type) || '公考',
        year,
        province,
        questionType,
        passage,
        termRole: passage.includes(term) ? 'stem' : 'option',
        source: standardExamSource({ title, examType: text(paper.exam_type) || '公考', year, province, questionType }),
        sourceUrl,
        sourceNote: sourceUrl
          ? '历年公考真题原题段落；点击来源可打开公开题面。'
          : '历年公考真题原题段落。数据库未记录公开网页地址，仍保留题面供核对。',
      })
    }
  }

  for (const occurrences of byIdiom.values()) {
    occurrences.sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0) || String(a.sourceType).localeCompare(String(b.sourceType)) || Number(a.sourceId) - Number(b.sourceId))
  }
  return {
    byIdiom,
    papers: papers.length,
    questions: db.prepare('SELECT COUNT(*) AS count FROM exam_questions').get().count,
    sourcePapers: verifiedPapers.length,
    sourceQuestions: 0,
  }
}

function exportHotspotEvidence() {
  if (!fs.existsSync(hotspotsDatabasePath)) return null
  const hotspotDb = new Database(hotspotsDatabasePath, { readonly: true, fileMustExist: true })
  try {
    const sourceRows = hotspotDb.prepare('SELECT source_id, source_key, source_title, source_org, source_date, source_url, authority_level, verification_status FROM sources').all()
    const sourceByKey = new Map(sourceRows.map((row) => [text(row.source_key), row]))
    const splitKeys = (value) => text(value).split(/[；;,]/u).map((item) => item.trim()).filter(Boolean)
    const sourceEvidence = (keys, term, sentence) => splitKeys(keys).map((key) => {
      const source = sourceByKey.get(key)
      if (!source) return null
      return {
        sourceKey: key,
        title: text(source.source_title),
        organization: text(source.source_org),
        date: text(source.source_date),
        url: text(source.source_url),
        authorityLevel: text(source.authority_level),
        verificationStatus: text(source.verification_status),
        excerpt: text(sentence),
        highlightTerm: text(term),
        evidenceKind: 'database_example',
        note: text(source.source_url)
          ? '当前数据库保留审校例句和权威来源元数据；公开文章正文未随链接稳定保存，避免将搜索页误作原文。'
          : '当前数据库保留审校例句和权威来源元数据；未保留稳定公开链接，例句不冒充文章原文。',
      }
    }).filter(Boolean)

    const fullRows = hotspotDb.prepare(`
      SELECT c.record_id AS id, t.hot_term AS hotTerm, c.collocation, t.theme,
             c.meaning, c.usage_context AS usageContext, c.model_sentence AS modelSentence,
             c.exam_function AS examFunction, c.common_errors AS commonErrors,
             c.source_keys AS sourceKeys, c.year
        FROM collocations c JOIN hot_terms t ON t.term_id = c.term_id
       ORDER BY c.record_id COLLATE NOCASE ASC
    `).all().map((row) => ({
      ...row,
      sourceEvidence: sourceEvidence(row.sourceKeys, row.hotTerm, row.modelSentence),
    }))
    const imageRows = hotspotDb.prepare(`
      SELECT record_id AS id, hot_term AS hotTerm, collocation, theme,
             meaning, usage_context AS usageContext, model_sentence AS modelSentence,
             exam_function AS examFunction, common_errors AS commonErrors,
             source_keys AS sourceKeys, year
        FROM image_seed_collocations
       ORDER BY seed_order ASC, record_id ASC
    `).all().map((row) => ({
      ...row,
      sourceEvidence: sourceEvidence(row.sourceKeys, row.hotTerm, row.modelSentence),
    }))
    const writeHotspots = (fileName, preset, rows) => {
      const outputPath = path.join(outputDirectory, fileName)
      const temporaryPath = `${outputPath}.tmp-${process.pid}`
      const payload = { version: 2, preset, total: rows.length, generatedAt: new Date().toISOString(), rows }
      fs.mkdirSync(outputDirectory, { recursive: true })
      fs.writeFileSync(temporaryPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
      fs.renameSync(temporaryPath, outputPath)
      return { file: outputPath, total: rows.length, bytes: fs.statSync(outputPath).size }
    }
    return {
      image: writeHotspots('hotspots-image.json', 'image', imageRows),
      full: writeHotspots('hotspots-full.json', '', fullRows),
    }
  } finally {
    hotspotDb.close()
  }
}

function writePayload(fileName, rows, kind, extra = {}) {
  const payload = {
    version: 1,
    kind,
    total: rows.length,
    generatedAt: new Date().toISOString(),
    ...extra,
    rows,
  }
  fs.mkdirSync(outputDirectory, { recursive: true })
  const outputPath = path.join(outputDirectory, fileName)
  const temporaryPath = `${outputPath}.tmp-${process.pid}`
  fs.writeFileSync(temporaryPath, `${JSON.stringify(payload)}\n`, 'utf8')
  fs.renameSync(temporaryPath, outputPath)
  return { file: outputPath, total: rows.length, bytes: fs.statSync(outputPath).size }
}

if (!fs.existsSync(databasePath)) throw new Error(`dictionary database not found: ${databasePath}`)

const db = new Database(databasePath, { readonly: true, fileMustExist: true })
try {
  const officialMedia = loadOfficialMediaOccurrences()
  const idioms = db.prepare(`
    SELECT ${idiomFields.join(', ')}
    FROM idioms
    ORDER BY CASE WHEN frequency = '高频' THEN 0 ELSE 1 END, id ASC
  `).all().map((row) => pick(row, idiomFields))
  const words = db.prepare(`
    SELECT ${wordFields.join(', ')}, raw_json
    FROM words
    ORDER BY id ASC
  `).all().map((row) => {
    const metadata = parseObject(row.raw_json)
    return {
      ...pick(row, wordFields),
      sourceKind: text(metadata.sourceKind),
      examReferences: Array.isArray(metadata.examReferences) ? metadata.examReferences : [],
      mediaOccurrences: Array.isArray(metadata.mediaOccurrences) ? metadata.mediaOccurrences : [],
      verificationStatus: text(metadata.verificationStatus),
    }
  })

  const exam = collectExamOccurrences(db, idioms)
  const enrichedIdioms = idioms.map((row) => ({
    ...row,
    examOccurrences: exam.byIdiom.get(row.idiom) || [],
    // Keep an explicit empty array for every term. This makes an unverified
    // media gap visible without manufacturing a search-page citation.
    mediaOccurrences: officialMedia.byTerm.get(row.idiom) || [],
  }))
  const hotspotEvidence = exportHotspotEvidence()

  if (idioms.length < 29000) throw new Error(`idiom corpus unexpectedly small: ${idioms.length}`)
  if (words.length < 50) throw new Error(`word corpus unexpectedly small: ${words.length}`)
  if (idioms.some((row) => !row.idiom || !row.explanation)) throw new Error('idiom export contains an incomplete row')
  if (words.some((row) => !row.word || !row.explanation)) throw new Error('word export contains an incomplete row')

  const result = {
    outputDirectory,
    idioms: writePayload('idioms.json', enrichedIdioms, 'idioms', {
      examCoverage: {
        papers: exam.sourcePapers,
        questions: exam.sourceQuestions,
        corpusPapers: exam.papers,
        corpusQuestions: exam.questions,
        linkedIdioms: enrichedIdioms.filter((row) => row.examOccurrences.length > 0).length,
        occurrences: enrichedIdioms.reduce((total, row) => total + row.examOccurrences.length, 0),
      },
      mediaCoverage: {
        reviewedOccurrences: enrichedIdioms.reduce((total, row) => total + row.mediaOccurrences.length, 0),
        linkedIdioms: enrichedIdioms.filter((row) => row.mediaOccurrences.length > 0).length,
        legacySearchPageRecords: Number(officialMedia.audit.legacySearchPageRecords) || 0,
        sourceNote: '仅发布逐页核验并保存连续正文段落的官方媒体记录；media_sources 中搜索页形式的旧记录不作为官媒原文。',
      },
    }),
    words: writePayload('words.json', words, 'words', {
      examCoverage: {
        linkedWords: words.filter((row) => row.examReferences.length > 0).length,
        candidateWords: words.filter((row) => row.verificationStatus === 'candidate').length,
        mediaLinkedWords: words.filter((row) => row.mediaOccurrences.length > 0).length,
        sourceNote: '实词题干与媒体原文分别按证据字段导出；无核验记录的实词保留空数组，不冒充真题或官媒出处。',
      },
    }),
    hotspots: hotspotEvidence,
  }
  console.log(JSON.stringify(result, null, 2))
} finally {
  db.close()
}

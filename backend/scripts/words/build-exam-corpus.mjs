#!/usr/bin/env node

/**
 * Build the real-word study corpus from the supplied high-frequency wordbook
 * and the exam-question records already stored in idioms.db.
 *
 * The script deliberately keeps provenance layered:
 * - exam_question_record: the exact stored question contains the word and a
 *   year marker; the reference is still labelled as a database record rather
 *   than an independently verified scan of an official paper.
 * - reference_wordbook: the term is present in the supplied wordbook but no
 *   year-bearing question record was found. It is useful study material, not a
 *   fabricated exam citation.
 *
 * It writes a reviewable candidate manifest, imports the rows into the
 * backend words table (metadata is retained in raw_json), and writes the
 * static public/data/words.json payload used by the GitHub Pages build.
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'
import { pinyin } from 'pinyin-pro'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')
const databasePath = path.join(projectRoot, 'backend', 'data', 'idioms.db')
const referencePath = path.join(projectRoot, 'docx_800word_parsed.json')
const candidatesPath = path.join(projectRoot, 'backend', 'data', 'words-exam-candidates.json')
const publicWordsPath = path.join(projectRoot, 'public', 'data', 'words.json')
const officialMediaPath = path.join(projectRoot, 'backend', 'data', 'official-media-occurrences.json')

const excludedReferenceTerms = new Set([
  // The source text contains this OCR error with an explanation for 窠臼.
  // Do not publish an invalid word as if it were a usable vocabulary item.
  '窠白',
])

function text(value) {
  return value == null ? '' : String(value).replace(/\s+/g, ' ').trim()
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

function loadOfficialMediaByTerm() {
  if (!fs.existsSync(officialMediaPath)) return new Map()
  const payload = JSON.parse(fs.readFileSync(officialMediaPath, 'utf8'))
  const byTerm = new Map()
  for (const row of Array.isArray(payload?.rows) ? payload.rows : []) {
    const term = text(row.term || row.word || row.highlightTerm)
    const paragraph = text(row.paragraph || row.excerpt)
    const highlightTerm = text(row.highlightTerm || term)
    if (!term || !paragraph || !highlightTerm || !paragraph.includes(highlightTerm)) continue
    const officialUrl = text(row.officialUrl || row.url)
    if (officialUrl && !/^https?:\/\//i.test(officialUrl)) continue
    const occurrence = {
      articleTitle: text(row.articleTitle || row.title),
      organization: text(row.organization || row.site),
      publishDate: text(row.publishDate || row.date),
      officialUrl,
      paragraph,
      highlightTerm,
      sourceKind: text(row.sourceKind) || 'official_media_excerpt',
      verificationStatus: text(row.verificationStatus) || 'verified',
      note: text(row.note),
    }
    const bucket = byTerm.get(term) || []
    if (!bucket.some((item) => item.officialUrl === occurrence.officialUrl && item.paragraph === occurrence.paragraph)) bucket.push(occurrence)
    byTerm.set(term, bucket)
  }
  return byTerm
}

const officialMediaByTerm = loadOfficialMediaByTerm()

function cleanExplanation(value) {
  return text(value).replace(/\s+/g, ' ').trim()
}

function cleanCategory(value) {
  const category = text(value)
    .replace(/【[^】]*】/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/（[^）]*）/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return category.length > 22 ? category.slice(0, 22).trim() : category
}

function inferPos(word, explanation) {
  const nounHints = new Set([
    '载体', '代表', '标志', '桥梁', '枢纽', '纽带', '引擎', '意蕴', '泥沼', '牢笼',
    '窠臼', '藩篱', '滥觞', '开端', '成就', '观照', '支撑', '媲美',
  ])
  const adjectiveHints = new Set(['审慎', '徜徉', '踟蹰', '徘徊'])
  if (nounHints.has(word)) return '名词/动词'
  if (adjectiveHints.has(word)) return '形容词/动词'
  if (/状态|过程|结果|现象|性质/.test(explanation) && !/指使|促使|进行|表示/.test(explanation)) return '名词'
  return '动词'
}

function parseExamMeta(rawText, source, questionId) {
  const normalized = text(rawText)
  const firstLine = text(String(rawText || '').split(/\r?\n/)[0])
  const match = normalized.match(/(20\d{2})\s*年\s*([^）)\n]{0,24})/u)
  if (!match) return null
  const year = Number(match[1])
  const label = text(match[2]).replace(/[，,。；;].*$/u, '').trim()
  if (!year || year < 2000 || year > 2100) return null
  const isNational = /国考/u.test(label) || /国考/u.test(normalized.slice(0, 100))
  const province = isNational
    ? '全国'
    : (label
      .replace(/省考|市考|区考|考|选调|事业单位|联考|公考/gu, '')
      .replace(/（.*$/u, '')
      .trim() || label || '地方')
  const examType = isNational ? '国考' : '省考/地方'
  const title = firstLine || `${year}年${label || examType}言语题`
  return {
    questionId: Number(questionId),
    title,
    year,
    province,
    examType,
    source: text(source) || `exam_questions #${questionId}`,
  }
}

function excerptAroundTerm(rawText, term, maxLength = 460) {
  const normalized = text(rawText)
  const index = normalized.indexOf(term)
  if (normalized.length <= maxLength) return normalized
  if (index < 0) return `${normalized.slice(0, maxLength - 1)}…`
  const half = Math.floor((maxLength - term.length) / 2)
  let start = Math.max(0, index - half)
  let end = Math.min(normalized.length, start + maxLength)
  if (end - start < maxLength) start = Math.max(0, end - maxLength)
  return `${start > 0 ? '…' : ''}${normalized.slice(start, end)}${end < normalized.length ? '…' : ''}`
}

function termRole(rawText, term) {
  const normalized = text(rawText)
  const optionIndex = normalized.search(/(?:^|\s)[A-DＡ-Ｄ][.．、]/u)
  const termIndex = normalized.indexOf(term)
  return optionIndex >= 0 && termIndex >= optionIndex ? 'option' : 'stem'
}

function collectExamReferences(db, term) {
  const questions = db.prepare(`
    SELECT id, question_text, source, related_words
      FROM exam_questions
     WHERE question_text LIKE '%' || ? || '%'
        OR related_words LIKE '%' || ? || '%'
     ORDER BY id ASC
  `).all(term, term)
  const references = []
  const seen = new Set()
  for (const question of questions) {
    const meta = parseExamMeta(question.question_text, question.source, question.id)
    if (!meta || seen.has(meta.questionId)) continue
    seen.add(meta.questionId)
    references.push({
      ...meta,
      questionSnippet: excerptAroundTerm(question.question_text, term),
      termRole: termRole(question.question_text, term),
      verificationStatus: 'exam_question_record',
      note: '题干来自本地 exam_questions 记录；年份与题干片段可核验，未将未存档的外部原卷链接冒充为官方原文。',
    })
    if (references.length >= 8) break
  }
  return references
}

function buildExample(word, explanation, examReferences) {
  if (examReferences.length > 0) return examReferences.map((item) => item.questionSnippet).join('\n')
  return `词书用法提示：“${word}”——${explanation}`
}

function sourceKindForRow(row) {
  const source = text(row.source)
  if (/四海|高频实词|华图/u.test(source)) return 'reference_wordbook'
  if (/智谱|zhipu|AI/iu.test(source)) return 'legacy_ai'
  return 'legacy_unclassified'
}

function normaliseLegacyRow(row) {
  const metadata = parseObject(row.raw_json)
  const examReferences = Array.isArray(metadata.examReferences) ? metadata.examReferences : []
  const word = text(row.word)
  const explanation = cleanExplanation(row.explanation)
  return {
    id: Number(row.id),
    word,
    word_type: text(row.word_type) || 'word',
    pinyin: text(row.pinyin) || pinyin(word),
    explanation,
    // The original 52-row seed predates the POS/example fields. Keep those
    // records usable without inventing an exam citation: the fallback is
    // explicitly presented as a wordbook usage prompt.
    pos: text(row.pos) || inferPos(word, explanation),
    examples: text(row.examples) || `词书用法提示：“${word}”——${explanation}`,
    synonyms: text(row.synonyms),
    antonyms: text(row.antonyms),
    category: text(row.category),
    frequency: text(row.frequency),
    sentiment: text(row.sentiment),
    source_book: text(row.source_book),
    source_chapter: text(row.source_chapter),
    source_text: text(row.source_text),
    context: text(row.context),
    context_translation: text(row.context_translation),
    modern_example: text(row.modern_example),
    exam_trap: text(row.exam_trap),
    source: text(row.source),
    sourceKind: metadata.sourceKind || sourceKindForRow(row),
    examReferences,
    mediaOccurrences: Array.isArray(metadata.mediaOccurrences)
      ? metadata.mediaOccurrences
      : (officialMediaByTerm.get(word) || []),
    verificationStatus: metadata.verificationStatus || 'legacy_record',
  }
}

function buildCandidates(db) {
  let referenceRows
  if (fs.existsSync(referencePath)) {
    referenceRows = JSON.parse(fs.readFileSync(referencePath, 'utf8'))
  } else if (fs.existsSync(candidatesPath)) {
    // The checked-in manifest is a compact, reviewable fallback for a clean
    // clone where the original DOCX parse is intentionally not present. It
    // preserves the 76 imported terms and their source grouping without
    // pretending to recreate the full source document.
    const manifest = JSON.parse(fs.readFileSync(candidatesPath, 'utf8'))
    referenceRows = Array.isArray(manifest?.rows)
      ? manifest.rows.map((row) => ({
          idiom: row.word,
          explanation: row.explanation,
          group: row.referenceGroup,
          sub_group: row.referenceSubGroup,
        }))
      : []
  } else {
    throw new Error(`wordbook source not found: ${referencePath}; checked-in manifest also missing: ${candidatesPath}`)
  }
  const idiomSet = new Set(db.prepare('SELECT idiom FROM idioms').all().map((row) => text(row.idiom)))
  const existingRows = db.prepare('SELECT word, raw_json FROM words').all()
  const existingWords = new Set(existingRows.map((row) => text(row.word)))
  const importedWordSet = new Set(existingRows
    .filter((row) => parseObject(row.raw_json).referenceGroup)
    .map((row) => text(row.word)))
  const uniqueReferenceRows = new Map()
  for (const row of referenceRows) {
    const word = text(row.idiom)
    if (!word || excludedReferenceTerms.has(word) || word.length < 2 || word.length > 6) continue
    if (!/[^\x00-\x7f]/u.test(word) || idiomSet.has(word)) continue
    // On subsequent runs, retain rows previously imported by this script so
    // the manifest remains reproducible and idempotent. Legacy words that
    // merely share the same wordbook source are not pulled in a second time.
    if (existingWords.has(word) && !importedWordSet.has(word)) continue
    uniqueReferenceRows.set(word, row)
  }

  return [...uniqueReferenceRows.entries()].map(([word, sourceRow]) => {
    const explanation = cleanExplanation(sourceRow.explanation) || `高频实词“${word}”的词义与用法待补充。`
    const examReferences = collectExamReferences(db, word)
    const sourceKind = examReferences.length > 0 ? 'exam_question_record' : 'reference_wordbook'
    const category = cleanCategory(sourceRow.sub_group) || cleanCategory(sourceRow.group) || '高频实词'
    const notes = examReferences.length > 0
      ? '至少一条带年份题干记录命中；记录状态为 exam_question_record，不等同于已下载官方原卷。'
      : '来自项目内高频实词词书，当前未匹配到带年份题干，按 candidate 学习资料保留。'
    return {
      id: null,
      word,
      word_type: 'word',
      pinyin: pinyin(word),
      explanation,
      pos: inferPos(word, explanation),
      examples: buildExample(word, explanation, examReferences),
      synonyms: '',
      antonyms: '',
      category,
      frequency: '高频',
      sentiment: '',
      source_book: '高频实词词书',
      source_chapter: text(sourceRow.group),
      source_text: '',
      context: '',
      context_translation: '',
      modern_example: examReferences[0]?.questionSnippet || '',
      exam_trap: '',
      source: sourceKind === 'exam_question_record'
        ? '历年公考题干记录（exam_questions）'
        : '高频实词词书（docx_800word_parsed.json）',
      sourceKind,
      examReferences,
      mediaOccurrences: officialMediaByTerm.get(word) || [],
      verificationStatus: examReferences.length > 0 ? 'exam_question_record' : 'candidate',
      referenceGroup: text(sourceRow.group),
      referenceSubGroup: text(sourceRow.sub_group),
      dataQualityNote: notes,
    }
  })
}

function writeJsonAtomic(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  const tempPath = `${filePath}.tmp-${process.pid}`
  fs.writeFileSync(tempPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8')
  fs.renameSync(tempPath, filePath)
}

function importCandidates(db, candidates) {
  const insert = db.prepare(`
    INSERT OR IGNORE INTO words
      (word, word_type, pinyin, explanation, pos, examples, synonyms, antonyms,
       category, frequency, sentiment, source_book, source_chapter, source_text,
       context, context_translation, modern_example, exam_trap, source, raw_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  const updateMetadata = db.prepare('UPDATE words SET raw_json = ? WHERE word = ?')
  const tx = db.transaction(() => {
    for (const row of candidates) {
      const rawJson = JSON.stringify({
        sourceKind: row.sourceKind,
        examReferences: row.examReferences,
        mediaOccurrences: row.mediaOccurrences,
        verificationStatus: row.verificationStatus,
        referenceGroup: row.referenceGroup,
        referenceSubGroup: row.referenceSubGroup,
        dataQualityNote: row.dataQualityNote,
      })
      insert.run(
        row.word, row.word_type, row.pinyin, row.explanation, row.pos, row.examples,
        row.synonyms, row.antonyms, row.category, row.frequency, row.sentiment,
        row.source_book, row.source_chapter, row.source_text, row.context,
        row.context_translation, row.modern_example, row.exam_trap, row.source, rawJson,
      )
      updateMetadata.run(rawJson, row.word)
    }
    // words_fts is an external-content FTS table in the existing database.
    // Rebuilding it keeps newly imported terms searchable through the API.
    db.prepare("INSERT INTO words_fts(words_fts) VALUES ('rebuild')").run()
  })
  tx()
}

function exportStaticWords(db, candidates) {
  const candidateByWord = new Map(candidates.map((row) => [row.word, row]))
  const rows = db.prepare('SELECT * FROM words ORDER BY id ASC').all().map((row) => {
    const candidate = candidateByWord.get(text(row.word))
    if (candidate) return { ...candidate, id: Number(row.id) }
    return normaliseLegacyRow(row)
  })
  const linked = rows.filter((row) => Array.isArray(row.examReferences) && row.examReferences.length > 0).length
  const mediaLinked = rows.filter((row) => Array.isArray(row.mediaOccurrences) && row.mediaOccurrences.length > 0).length
  writeJsonAtomic(publicWordsPath, {
    version: 2,
    kind: 'words',
    total: rows.length,
    generatedAt: new Date().toISOString(),
    examCoverage: {
      linkedWords: linked,
      candidateWords: rows.filter((row) => row.verificationStatus === 'candidate').length,
      mediaLinkedWords: mediaLinked,
      sourceNote: '题干引用来自本地 exam_questions 记录；无年份题干的词语只标注为 candidate，不冒充真题出处。',
    },
    rows,
  })
  return rows
}

if (!fs.existsSync(databasePath)) throw new Error(`dictionary database not found: ${databasePath}`)
if (!fs.existsSync(referencePath) && !fs.existsSync(candidatesPath)) {
  throw new Error(`wordbook source not found: ${referencePath}; checked-in manifest also missing: ${candidatesPath}`)
}

const db = new Database(databasePath)
try {
  const candidates = buildCandidates(db)
  importCandidates(db, candidates)
  const rows = exportStaticWords(db, candidates)
  const linkedCandidates = candidates.filter((row) => row.examReferences.length > 0)
  const candidateOnly = candidates.filter((row) => row.examReferences.length === 0)
  writeJsonAtomic(candidatesPath, {
    version: 1,
    kind: 'word-exam-candidates',
    generatedAt: new Date().toISOString(),
    total: candidates.length,
    linkedCandidates: linkedCandidates.length,
    candidateOnly: candidateOnly.length,
    excludedSourceTerms: [...excludedReferenceTerms],
    source: {
      referenceFile: 'docx_800word_parsed.json',
      examTable: 'exam_questions',
      note: '题干记录按年份标记分层；未匹配到年份的词语保留为 candidate。',
    },
    rows: candidates,
  })
  console.log(JSON.stringify({
    candidates: candidates.length,
    linkedCandidates: linkedCandidates.length,
    candidateOnly: candidateOnly.length,
    totalWords: rows.length,
    staticFile: publicWordsPath,
    manifestFile: candidatesPath,
  }, null, 2))
} finally {
  db.close()
}

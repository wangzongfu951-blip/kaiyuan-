import Database from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, '..', 'data', 'idioms.db');
const OFFICIAL_MEDIA_PATH = path.resolve(__dirname, '..', 'data', 'official-media-occurrences.json');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

const LIST_COLS = 'id, idiom, pinyin, explanation, source_book, source_chapter, category, frequency, word_type, sentiment';

function loadOfficialMediaOccurrences() {
  try {
    const payload = JSON.parse(fs.readFileSync(OFFICIAL_MEDIA_PATH, 'utf8'));
    return Array.isArray(payload?.rows) ? payload.rows.filter((row) => {
      const term = String(row.term || row.idiom || '').trim();
      const paragraph = String(row.paragraph || row.excerpt || '').trim();
      const highlightTerm = String(row.highlightTerm || term).trim();
      return term && paragraph && highlightTerm && paragraph.includes(highlightTerm);
    }) : [];
  } catch {
    return [];
  }
}

const officialMediaOccurrences = loadOfficialMediaOccurrences();

function collectOfficialMediaOccurrences(word) {
  return officialMediaOccurrences
    .filter((row) => String(row.term || row.idiom || '').trim() === word)
    .map((row) => ({
      articleTitle: String(row.articleTitle || row.title || '').trim(),
      organization: String(row.organization || row.site || '').trim(),
      publishDate: String(row.publishDate || row.date || '').trim(),
      officialUrl: String(row.officialUrl || row.url || '').trim(),
      paragraph: String(row.paragraph || row.excerpt || '').trim(),
      highlightTerm: String(row.highlightTerm || word).trim(),
      sourceKind: String(row.sourceKind || 'official_media_excerpt').trim(),
      verificationStatus: String(row.verificationStatus || 'verified').trim(),
      note: String(row.note || '').trim(),
    }));
}

export function getOfficialMediaOccurrences(word) {
  return collectOfficialMediaOccurrences(word);
}

function parseJsonArray(value) {
  if (Array.isArray(value)) return value.map((item) => String(item || '').trim()).filter(Boolean);
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map((item) => String(item || '').trim()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function parseJsonObject(value) {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function firstHttpUrl(value) {
  const raw = parseJsonObject(value);
  const candidates = [raw.url, raw.sourceUrl, raw.original_text_url, raw.originalTextUrl];
  return candidates.map((item) => String(item || '').trim()).find((item) => /^https?:\/\//i.test(item)) || '';
}

function extractExamPassage(value) {
  const lines = String(value || '')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  const kept = [];
  for (const line of lines) {
    if (/^(?:依次填入|下列各项|以下哪项|最恰当的一项|选择最恰当|根据文意)/u.test(line)) break;
    if (/^(?:[A-HＡ-Ｈ])\s*[\.．、:：]/u.test(line)) break;
    if (/^(?:例题|第?\s*\d+\s*题|题号)/u.test(line)) continue;
    kept.push(line);
  }
  return kept.join(' ').replace(/\s{2,}/g, ' ').trim();
}

function collectExamOccurrences(word) {
  const occurrences = [];
  const seen = new Set();
  const add = (occurrence) => {
    const key = `${occurrence.sourceType}:${occurrence.sourceId}:${occurrence.passage}`;
    if (!occurrence.passage || seen.has(key)) return;
    seen.add(key);
    occurrences.push(occurrence);
  };
  const paperRows = db.prepare(`
    SELECT id, title, exam_type, year, province, question_type, question_text, options, related_idioms, raw_json
      FROM exam_papers
     WHERE related_idioms LIKE ? OR question_text LIKE ? OR options LIKE ?
     ORDER BY year DESC, id ASC
  `).all(`%${word}%`, `%${word}%`, `%${word}%`);
  for (const row of paperRows) {
    const title = String(row.title || '').trim();
    // Keep the API in sync with the static export:专项练习 and讲义 rows are
    // not presented as verified national/provincial exam provenance.
    if (String(row.exam_type || '').trim().length > 2 || !/^20\d{2}/u.test(title)) continue;
    const related = parseJsonArray(row.related_idioms);
    if (!related.includes(word) && !String(row.question_text || '').includes(word) && !String(row.options || '').includes(word)) continue;
    const passage = extractExamPassage(row.question_text) || String(row.question_text || '').trim();
    const year = Number(row.year) || null;
    const province = String(row.province || '').trim();
    const examType = String(row.exam_type || '公考').trim();
    const questionType = String(row.question_type || '言语理解').trim();
    add({
      sourceType: 'exam_paper',
      sourceId: Number(row.id),
      paperId: Number(row.id),
      questionId: null,
      title,
      examTitle: title,
      examType,
      year,
      province,
      questionType,
      passage,
      termRole: passage.includes(word) ? 'stem' : 'option',
      highlightTerm: word,
      source: `${year ? `${year}年` : ''}${province}${examType} · ${title || '历年公考真题'}`,
      sourceUrl: firstHttpUrl(row.raw_json),
      sourceNote: firstHttpUrl(row.raw_json)
        ? '历年公考真题原题段落；点击来源可打开公开题面。'
        : '历年公考真题原题段落。数据库未记录公开网页地址，仍保留题面供核对。',
    });
  }
  return occurrences;
}

export function searchIdioms(q, limit = 20, offset = 0, category = "", frequency = "") {
  const query = typeof q === 'string' ? q.trim() : '';
  const cat = typeof category === 'string' ? category.trim() : '';
  const freq = typeof frequency === 'string' ? frequency.trim() : '';
  const hasQuery = query.length > 0;
  const hasCat = cat.length > 0;
  const hasFreq = freq.length > 0;
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  let safeOffset = Math.max(Number(offset) || 0, 0);

  // No text query: use one parameterized filter for category/frequency. This
  // is also the path used by the first-class 高频成语 tab and keeps pagination
  // and the total count consistent on the API-backed app.
  if (!hasQuery) {
    const clauses = [];
    const params = [];
    if (hasCat) { clauses.push('category = ?'); params.push(cat); }
    if (hasFreq) { clauses.push('frequency = ?'); params.push(freq); }
    const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
    const rows = db.prepare(
      `SELECT ${LIST_COLS} FROM idioms${where} ORDER BY CASE WHEN frequency='高频' THEN 0 ELSE 1 END, id ASC LIMIT ? OFFSET ?`
    ).all(...params, safeLimit, safeOffset);
    const total = db.prepare(`SELECT COUNT(*) AS count FROM idioms${where}`).get(...params).count;
    return { total, rows };
  }

  const like = `%${query}%`;
  const filterClauses = [];
  const filterParams = [];
  if (hasCat) { filterClauses.push('category = ?'); filterParams.push(cat); }
  if (hasFreq) { filterClauses.push('frequency = ?'); filterParams.push(freq); }
  const filters = filterClauses.length ? ` AND ${filterClauses.join(' AND ')}` : '';

  // Try FTS first. Category/frequency are applied after the id lookup so the
  // FTS table remains compatible with older database snapshots.
  let rows = [];
  try {
    const ftsRows = db.prepare(
      `SELECT rowid AS id FROM idioms_fts WHERE idioms_fts MATCH ? ORDER BY rank LIMIT ? OFFSET ?`
    ).all(query, safeLimit, safeOffset);
    if (ftsRows.length > 0) {
      const ids = ftsRows.map(r => r.id);
      const ph = ids.map(() => '?').join(',');
      rows = db.prepare(`SELECT ${LIST_COLS} FROM idioms WHERE id IN (${ph})${filters}`)
        .all(...ids, ...filterParams);
    }
  } catch (e) {
    // FTS might not exist, fall through to LIKE.
  }

  if (rows.length < safeLimit) {
    const existing = new Set(rows.map(r => r.id));
    const need = safeLimit - rows.length;
    const fb = db.prepare(
      `SELECT ${LIST_COLS} FROM idioms
       WHERE (idiom LIKE ? OR pinyin LIKE ? OR explanation LIKE ? OR abbreviation LIKE ? OR category LIKE ? OR exam_category LIKE ?)${filters}
       ORDER BY CASE WHEN idiom LIKE ? THEN 0 ELSE 1 END, id LIMIT ?`
    ).all(like, like, like, like, like, like, ...filterParams, like, need + safeOffset);
    for (const row of fb) {
      if (existing.has(row.id)) continue;
      if (safeOffset > 0) { safeOffset--; continue; }
      rows.push(row);
      if (rows.length >= safeLimit) break;
    }
  }

  const total = db.prepare(
    `SELECT COUNT(*) AS count FROM idioms WHERE (idiom LIKE ? OR pinyin LIKE ? OR explanation LIKE ? OR category LIKE ? OR exam_category LIKE ?)${filters}`
  ).get(like, like, like, like, like, ...filterParams).count;
  return { total, rows };
}

export function getIdiomByWord(word) {
  const row = db.prepare('SELECT * FROM idioms WHERE idiom = ? LIMIT 1').get(word);
  if (!row) return null;
  const examOccurrences = collectExamOccurrences(word);
  return {
    id: row.id, idiom: row.idiom, pinyin: row.pinyin, explanation: row.explanation,
    source_book: row.source_book, source_chapter: row.source_chapter, source_text: row.source_text,
    context: row.context, context_translation: row.context_translation, exam_trap: row.exam_trap,
    original_text_url: row.original_text_url, category: row.category, frequency: row.frequency,
    synonyms: row.synonyms, antonyms: row.antonyms, knowledge_points: row.knowledge_points,
    exam_points: row.exam_points, modern_example: row.modern_example, exam_category: row.exam_category,
    sentiment: row.sentiment,
    examOccurrences,
    mediaOccurrences: collectOfficialMediaOccurrences(word),
  };
}

export function getRandomExamIdioms(count = 10) {
  return db.prepare(
    `SELECT idiom, pinyin, explanation, exam_trap, category FROM idioms WHERE exam_trap != '' AND exam_trap IS NOT NULL AND idiom != '' ORDER BY RANDOM() LIMIT ?`
  ).all(count);
}

export function getSimilarIdioms(word, count = 6) {
  const row = db.prepare('SELECT category, frequency FROM idioms WHERE idiom = ? LIMIT 1').get(word);
  if (!row) return [];
  if (row.category) {
    return db.prepare(
      `SELECT idiom, pinyin, explanation, category, sentiment FROM idioms WHERE category = ? AND idiom != ? ORDER BY RANDOM() LIMIT ?`
    ).all(row.category, word, count);
  }
  return db.prepare(
    `SELECT idiom, pinyin, explanation, category, sentiment FROM idioms WHERE frequency = '高频' AND idiom != ? ORDER BY RANDOM() LIMIT ?`
  ).all(word, count);
}

export function getExamPapers() {
  return db.prepare('SELECT * FROM exam_papers ORDER BY year DESC, id ASC').all();
}

export function getExamQuestions(idiomWord) {
  return db.prepare(
    `SELECT * FROM exam_papers WHERE related_idioms LIKE ? ORDER BY year DESC`
  ).all('%' + idiomWord + '%');
}

export function getIdiomCategories() {
  const PRIORITY = ['考公高频', '高频积累', '望文生义', '对象误用', '褒贬误用', '言语表达', '含数字', '含动物', '描写人物', '自然风景', '战争军事', '品质修养', '学习态度'];
  const rows = db.prepare(
    "SELECT category, COUNT(*) as count FROM idioms WHERE category IS NOT NULL AND category != '' AND category != 'AI' GROUP BY category"
  ).all();
  return rows.sort((a, b) => {
    const ai = PRIORITY.indexOf(a.category);
    const bi = PRIORITY.indexOf(b.category);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return b.count - a.count;
  }).map(r => r.category);
}

export { db };

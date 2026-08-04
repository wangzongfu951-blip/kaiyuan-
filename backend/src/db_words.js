import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.resolve(__dirname, '..', 'data', 'idioms.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

const COLS = 'SELECT id, word, word_type, pinyin, explanation, pos, synonyms, antonyms, category, frequency, sentiment, source, source_book, source_chapter';

export function searchWords(q, limit = 20, offset = 0) {
  const hasQuery = q && q.trim().length > 0;
  if (!hasQuery) {
    const rows = db.prepare(COLS + ' FROM words ORDER BY id ASC LIMIT ? OFFSET ?').all(Number(limit), Number(offset));
    const total = db.prepare('SELECT COUNT(*) AS count FROM words').get()?.count || 0;
    return { total, rows };
  }
  // Only search by word name, not by explanation or category
  const like = '%' + q.trim() + '%';
  const rows = db.prepare(COLS + " FROM words WHERE word LIKE ? ORDER BY CASE WHEN word = ? THEN 0 WHEN word LIKE ? THEN 1 ELSE 2 END, id LIMIT ? OFFSET ?").all(like, q.trim(), like, Number(limit), Number(offset));
  const total = db.prepare("SELECT COUNT(*) AS count FROM words WHERE word LIKE ?").get(like).count;
  return { total, rows };
}

export function getWordByTitle(word) {
  const row = db.prepare('SELECT * FROM words WHERE word = ? LIMIT 1').get(word);
  if (!row) return null;
  let metadata = {};
  try {
    const parsed = row.raw_json ? JSON.parse(row.raw_json) : {};
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) metadata = parsed;
  } catch {}
  return {
    id: row.id,
    word: row.word,
    word_type: row.word_type,
    pinyin: row.pinyin,
    explanation: row.explanation,
    pos: row.pos,
    examples: row.examples,
    synonyms: row.synonyms,
    antonyms: row.antonyms,
    category: row.category,
    frequency: row.frequency,
    sentiment: row.sentiment,
    source: row.source,
    modern_example: row.modern_example,
    exam_trap: row.exam_trap,
    sourceKind: typeof metadata.sourceKind === 'string' ? metadata.sourceKind : '',
    verificationStatus: typeof metadata.verificationStatus === 'string' ? metadata.verificationStatus : '',
    examReferences: Array.isArray(metadata.examReferences) ? metadata.examReferences : [],
    mediaOccurrences: Array.isArray(metadata.mediaOccurrences) ? metadata.mediaOccurrences : [],
  };
}

export function getSimilarWords(word, count = 6) {
  const row = db.prepare('SELECT category, synonyms FROM words WHERE word = ? LIMIT 1').get(word);
  if (!row) return [];
  if (row.category) return db.prepare('SELECT word, pinyin, explanation, category, sentiment FROM words WHERE category = ? AND word != ? ORDER BY RANDOM() LIMIT ?').all(row.category, word, count);
  if (row.synonyms) {
    const syns = row.synonyms.split(/[,锟斤拷锟斤拷]/).map(s => s.trim()).filter(Boolean).slice(0, count);
    if (syns.length > 0) {
      const ph = syns.map(() => '?').join(',');
      return db.prepare('SELECT word, pinyin, explanation, category, sentiment FROM words WHERE word IN (' + ph + ') AND word != ? LIMIT ?').all(...syns, word, count);
    }
  }
  return db.prepare('SELECT word, pinyin, explanation, category, sentiment FROM words ORDER BY RANDOM() LIMIT ?').all(count);
}

export function getWordCategories() {
  const rows = db.prepare("SELECT category, COUNT(*) as count FROM words WHERE category IS NOT NULL AND category != '' AND category != 'AI' GROUP BY category ORDER BY count DESC").all();
  return rows.map(r => r.category);
}

export { db };



const fs = require('node:fs');
const path = require('node:path');
const Database = require('better-sqlite3');

const SOURCE = process.argv[2] || path.resolve(__dirname, '..', '..', 'full_idiom_data.json');
const raw = fs.readFileSync(SOURCE, 'utf8');
const list = JSON.parse(raw);

if (!Array.isArray(list)) { console.error('not array'); process.exit(1); }

const dbPath = path.resolve(__dirname, '..', 'data', 'idioms.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS idioms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    idiom TEXT NOT NULL UNIQUE,
    pinyin TEXT NOT NULL DEFAULT '',
    explanation TEXT NOT NULL DEFAULT '',
    source_book TEXT NOT NULL DEFAULT '',
    source_chapter TEXT NOT NULL DEFAULT '',
    source_text TEXT NOT NULL DEFAULT '',
    context TEXT NOT NULL DEFAULT '',
    context_translation TEXT NOT NULL DEFAULT '',
    exam_trap TEXT NOT NULL DEFAULT '',
    original_text_url TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT '',
    frequency TEXT NOT NULL DEFAULT '',
    word_type TEXT NOT NULL DEFAULT '',
    book TEXT NOT NULL DEFAULT '',
    abbreviation TEXT NOT NULL DEFAULT '',
    raw_json TEXT NOT NULL DEFAULT '{}'
  );
`);

db.exec(`
  CREATE VIRTUAL TABLE IF NOT EXISTS idioms_fts USING fts5(
    idiom, pinyin, explanation, source_text, context, category, abbreviation,
    content='idioms', content_rowid='id'
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS exam_papers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    exam_type TEXT NOT NULL DEFAULT '',
    year INTEGER NOT NULL DEFAULT 0,
    province TEXT NOT NULL DEFAULT '',
    question_type TEXT NOT NULL DEFAULT '',
    question_text TEXT NOT NULL DEFAULT '',
    options TEXT NOT NULL DEFAULT '[]',
    answer TEXT NOT NULL DEFAULT '',
    answer_explanation TEXT NOT NULL DEFAULT '',
    related_idioms TEXT NOT NULL DEFAULT '[]',
    difficulty INTEGER NOT NULL DEFAULT 3,
    raw_json TEXT NOT NULL DEFAULT '{}'
  );
`);

const upsert = db.prepare(`
  INSERT INTO idioms (idiom, pinyin, explanation, source_book, source_chapter, source_text, context, context_translation, exam_trap, original_text_url, category, frequency, word_type, book, abbreviation, raw_json)
  VALUES (@idiom, @pinyin, @explanation, @source_book, @source_chapter, @source_text, @context, @context_translation, @exam_trap, @original_text_url, @category, @frequency, @word_type, @book, @abbreviation, @raw_json)
  ON CONFLICT(idiom) DO UPDATE SET
    pinyin=excluded.pinyin, explanation=excluded.explanation, source_book=excluded.source_book,
    source_chapter=excluded.source_chapter, source_text=excluded.source_text, context=excluded.context,
    context_translation=excluded.context_translation, exam_trap=excluded.exam_trap,
    original_text_url=excluded.original_text_url, category=excluded.category,
    frequency=excluded.frequency, word_type=excluded.word_type, book=excluded.book,
    abbreviation=excluded.abbreviation, raw_json=excluded.raw_json
`);

function pinyinAbbr(p) {
  return (p || '').split(/\s+/).map(s => s.charAt(0)).join('').toLowerCase();
}

const tx = db.transaction((rows) => {
  let ok = 0, skip = 0;
  for (const row of rows) {
    const idiom = (row.idiom || '').trim();
    if (!idiom) { skip++; continue; }
    upsert.run({
      idiom,
      pinyin: row.pinyin || '',
      explanation: row.explanation || '',
      source_book: row.source_book || '',
      source_chapter: row.source_chapter || '',
      source_text: (row.source_book || '') + (row.source_chapter ? ' ' + row.source_chapter : ''),
      context: row.context || '',
      context_translation: row.context_translation || '',
      exam_trap: row.exam_trap || '',
      original_text_url: row.original_text_url || '',
      category: row.category || '',
      frequency: row.frequency || '',
      word_type: row.word_type || '',
      book: row.book || '',
      abbreviation: pinyinAbbr(row.pinyin),
      raw_json: JSON.stringify(row),
    });
    ok++;
  }
  return { ok, skip };
});

console.time('ingest');
const result = tx(list);
console.timeEnd('ingest');
console.log('result:', result);

db.exec(`
  INSERT INTO idioms_fts(rowid, idiom, pinyin, explanation, source_text, context, category, abbreviation)
  SELECT id, idiom, pinyin, explanation, source_text, context, category, abbreviation FROM idioms;
`);

const count = db.prepare('SELECT COUNT(*) AS c FROM idioms').get().c;
const ftsCount = db.prepare('SELECT COUNT(*) AS c FROM idioms_fts').get().c;
console.log('idioms count:', count);
console.log('fts count:', ftsCount);

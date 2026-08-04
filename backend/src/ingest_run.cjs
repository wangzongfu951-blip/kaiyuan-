const fs = require('node:fs');
const path = require('node:path');

function normalizeRow(row) {
  if (!row) return null;

  const idiom = (row.word || '').trim();
  if (!idiom) return null;

  const pinyin = (row.pinyin || '').trim();
  const sourceRaw = (row.derivation || '').trim();
  let sourceBook = '';
  let sourceChapter = '';

  const m = sourceRaw.match(/^(.*?[》\]\)】])(.*)$/s);
  if (m) {
    sourceBook = m[1].trim();
    sourceChapter = m[2].replace(/^[\s,，\-—:：、]+|[\s,，\-—:：、]+$/g, '').trim();
  } else {
    sourceBook = sourceRaw;
  }

  return {
    idiom,
    pinyin,
    explanation: (row.explanation || '').trim(),
    source_book: sourceBook,
    source_chapter: sourceChapter,
    source_text: sourceRaw,
    context: (row.example || '').trim(),
    abbreviation: (row.abbreviation || '').trim(),
    raw_json: JSON.stringify(row),
  };
}

function openDb() {
  const Database = require('better-sqlite3');
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
      abbreviation TEXT NOT NULL DEFAULT '',
      raw_json TEXT NOT NULL DEFAULT '{}'
    );
  `);

  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS idioms_fts USING fts5(
      idiom,
      pinyin,
      explanation,
      source_text,
      context,
      abbreviation,
      content='idioms',
      content_rowid='id'
    );
  `);

  return db;
}

const SOURCE = process.argv[2] || path.resolve(__dirname, '..', '..', 'raw_idiom_data.json');
const raw = fs.readFileSync(SOURCE, 'utf8');
const list = JSON.parse(raw);

if (!Array.isArray(list)) {
  console.error('source JSON is not array');
  process.exit(1);
}

const db = openDb();

const upsert = db.prepare(`
  INSERT INTO idioms (idiom, pinyin, explanation, source_book, source_chapter, source_text, context, context_translation, exam_trap, original_text_url, abbreviation, raw_json)
  VALUES (@idiom, @pinyin, @explanation, @source_book, @source_chapter, @source_text, @context, @context_translation, @exam_trap, @original_text_url, @abbreviation, @raw_json)
  ON CONFLICT(idiom) DO UPDATE SET
    pinyin=excluded.pinyin,
    explanation=excluded.explanation,
    source_book=excluded.source_book,
    source_chapter=excluded.source_chapter,
    source_text=excluded.source_text,
    context=excluded.context,
    abbreviation=excluded.abbreviation,
    raw_json=excluded.raw_json
`);

const tx = db.transaction((rows) => {
  let ok = 0;
  let skip = 0;
  for (const row of rows) {
    const n = normalizeRow(row);
    if (!n) { skip++; continue; }
    upsert.run({
      ...n,
      context_translation: '',
      exam_trap: '',
      original_text_url: '',
    });
    ok++;
  }
  return { ok, skip };
});

const result = tx(list);

db.exec(`
  INSERT INTO idioms_fts(rowid, idiom, pinyin, explanation, source_text, context, abbreviation)
  SELECT id, idiom, pinyin, explanation, source_text, context, abbreviation FROM idioms;
`);

console.log('ingest done:', result);

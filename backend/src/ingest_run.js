import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeRow } from './ingest.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SOURCE = process.argv[2] || path.resolve(__dirname, '..', '..', 'raw_idiom_data.json');
const DB_MODULE = await import('./db.js');

const raw = fs.readFileSync(SOURCE, 'utf8');
const list = JSON.parse(raw);

if (!Array.isArray(list)) {
  console.error('source JSON is not array');
  process.exit(1);
}

const { getDb } = DB_MODULE;

const db = await DB_MODULE.getDb();

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

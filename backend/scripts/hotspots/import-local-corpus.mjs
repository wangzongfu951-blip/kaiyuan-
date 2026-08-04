#!/usr/bin/env node

/**
 * Build the standalone hotspot SQLite adapter from the reviewed JSON snapshot.
 *
 * The import is intentionally separate from the idiom database. It can be
 * rerun after replacing the three merged_*.json files and writes a fresh
 * SQLite file, preserving the source/term/collocation relationships.
 */
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

function argument(name) {
  const index = process.argv.indexOf(`--${name}`)
  return index >= 0 ? process.argv[index + 1] : undefined
}

const inputDir = path.resolve(
  argument('input') || process.env.HOTSPOT_CORPUS_DIR || path.join(projectRoot, 'backend', 'data', 'hotspots'),
)
const outputPath = path.resolve(
  argument('output') || process.env.HOTSPOT_CORPUS_DB || path.join(inputDir, 'hotspot-collocations.sqlite'),
)

function readJson(name) {
  const file = path.join(inputDir, name)
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

const terms = readJson('merged_hot_terms.json')
const collocations = readJson('merged_collocations.json')
const sources = readJson('merged_sources.json')
const imageSeedFile = path.join(inputDir, 'manual_image_seeds.json')
const imageSeedSnapshot = fs.existsSync(imageSeedFile)
  ? readJson('manual_image_seeds.json')
  : { terms: [] }
const imageSeedTerms = Array.isArray(imageSeedSnapshot.terms) ? imageSeedSnapshot.terms : []

if (!Array.isArray(terms) || !Array.isArray(collocations) || !Array.isArray(sources)) {
  throw new Error('merged_hot_terms.json / merged_collocations.json / merged_sources.json must be arrays')
}

for (const [index, row] of imageSeedTerms.entries()) {
  if (!String(row.hot_term ?? '').trim() || !Array.isArray(row.collocations) || row.collocations.length === 0) {
    throw new Error(`manual_image_seeds.json term ${index + 1} is incomplete`)
  }
  for (const phrase of row.collocations) {
    if (!String(phrase ?? '').trim()) throw new Error(`manual_image_seeds.json term ${index + 1} has an empty collocation`)
  }
}

const termIds = new Set(terms.map((row) => Number(row.term_id)))
const sourceIds = new Set(sources.map((row) => Number(row.source_id)))
// Some reviewed records use a short alias (for example IMG2/IMG4) in
// source_keys while the canonical source row is keyed S16/E27.  Keep the
// source JSON untouched for auditability, but persist canonical keys in the
// SQLite snapshot so API/static exports can resolve every linked source.
const sourceAliasToKey = new Map()
for (const source of sources) {
  const aliases = Array.isArray(source.source_keys) && source.source_keys.length
    ? source.source_keys
    : [source.source_key]
  for (const alias of aliases) {
    const key = String(alias ?? '').trim()
    if (key) sourceAliasToKey.set(key, String(source.source_key ?? '').trim())
  }
}

function canonicalSourceKeys(value) {
  const raw = Array.isArray(value)
    ? value
    : String(value ?? '').split(/[；;,]/u)
  return [...new Set(raw
    .map((key) => String(key ?? '').trim())
    .filter(Boolean)
    .map((key) => sourceAliasToKey.get(key) || key))]
}

const recordIds = new Set()
for (const row of collocations) {
  if (recordIds.has(row.record_id)) throw new Error(`duplicate record_id: ${row.record_id}`)
  recordIds.add(row.record_id)
  if (!termIds.has(Number(row.term_id))) throw new Error(`unknown term_id: ${row.term_id}`)
  const linked = Array.isArray(row.source_ids) && row.source_ids.length ? row.source_ids : [row.source_id]
  for (const sourceId of linked) {
    if (!sourceIds.has(Number(sourceId))) throw new Error(`unknown source_id: ${sourceId}`)
  }
  for (const field of ['hot_term', 'collocation', 'meaning', 'usage_context', 'model_sentence']) {
    if (!String(row[field] ?? '').trim()) throw new Error(`${row.record_id} missing ${field}`)
  }
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true })
const temporaryPath = `${outputPath}.tmp-${process.pid}`
try { fs.rmSync(temporaryPath, { force: true }) } catch {}

const db = new Database(temporaryPath)
try {
  db.pragma('foreign_keys = ON')
  db.pragma('journal_mode = DELETE')
  db.exec(`
    CREATE TABLE hot_terms (
      term_id INTEGER PRIMARY KEY,
      hot_term TEXT NOT NULL UNIQUE,
      theme TEXT NOT NULL,
      part_of_speech TEXT NOT NULL,
      first_year INTEGER,
      currentness TEXT,
      notes TEXT
    );
    CREATE TABLE sources (
      source_id INTEGER PRIMARY KEY,
      source_key TEXT NOT NULL UNIQUE,
      source_title TEXT NOT NULL,
      source_org TEXT NOT NULL,
      source_date TEXT NOT NULL,
      source_url TEXT NOT NULL UNIQUE,
      authority_level TEXT NOT NULL,
      verification_status TEXT NOT NULL
    );
    CREATE TABLE collocations (
      record_id TEXT PRIMARY KEY,
      term_id INTEGER NOT NULL REFERENCES hot_terms(term_id),
      collocation TEXT NOT NULL,
      meaning TEXT NOT NULL,
      usage_context TEXT NOT NULL,
      model_sentence TEXT NOT NULL,
      exam_function TEXT NOT NULL,
      common_errors TEXT,
      source_id INTEGER NOT NULL REFERENCES sources(source_id),
      source_keys TEXT NOT NULL,
      year INTEGER,
      tags TEXT,
      verification_status TEXT NOT NULL
    );
    CREATE TABLE collocation_sources (
      record_id TEXT NOT NULL REFERENCES collocations(record_id) ON DELETE CASCADE,
      source_id INTEGER NOT NULL REFERENCES sources(source_id),
      PRIMARY KEY(record_id, source_id)
    );
    CREATE TABLE image_seed_collocations (
      record_id TEXT PRIMARY KEY,
      seed_order INTEGER NOT NULL,
      hot_term TEXT NOT NULL REFERENCES hot_terms(hot_term),
      theme TEXT NOT NULL,
      collocation TEXT NOT NULL,
      meaning TEXT NOT NULL,
      usage_context TEXT NOT NULL,
      model_sentence TEXT NOT NULL,
      exam_function TEXT NOT NULL,
      common_errors TEXT,
      source_keys TEXT NOT NULL,
      year INTEGER,
      UNIQUE(seed_order, hot_term, collocation)
    );
    CREATE INDEX idx_image_seed_order ON image_seed_collocations(seed_order, record_id);
    CREATE INDEX idx_collocations_term ON collocations(term_id);
    CREATE INDEX idx_collocations_year ON collocations(year);
    CREATE INDEX idx_collocations_theme ON hot_terms(theme);
    CREATE VIEW v_hotword_collocations AS
      SELECT c.record_id, t.hot_term, t.theme, t.part_of_speech,
             c.collocation, c.meaning, c.usage_context, c.model_sentence,
             c.exam_function, c.common_errors, c.year, c.source_keys,
             c.verification_status,
             s.source_title, s.source_org, s.source_date, s.source_url,
             s.authority_level, s.verification_status AS source_verification_status
        FROM collocations c
        JOIN hot_terms t ON t.term_id = c.term_id
        JOIN sources s ON s.source_id = c.source_id;
    CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `)

  const insertTerm = db.prepare('INSERT INTO hot_terms (term_id, hot_term, theme, part_of_speech, first_year, currentness, notes) VALUES (?, ?, ?, ?, ?, ?, ?)')
  const insertSource = db.prepare('INSERT INTO sources (source_id, source_key, source_title, source_org, source_date, source_url, authority_level, verification_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
  const insertCollocation = db.prepare('INSERT INTO collocations (record_id, term_id, collocation, meaning, usage_context, model_sentence, exam_function, common_errors, source_id, source_keys, year, tags, verification_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
  const insertLink = db.prepare('INSERT INTO collocation_sources (record_id, source_id) VALUES (?, ?)')
  const insertImageSeed = db.prepare('INSERT INTO image_seed_collocations (record_id, seed_order, hot_term, theme, collocation, meaning, usage_context, model_sentence, exam_function, common_errors, source_keys, year) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
  const insertMeta = db.prepare('INSERT INTO metadata (key, value) VALUES (?, ?)')
  const write = db.transaction(() => {
    for (const row of terms) insertTerm.run(row.term_id, row.hot_term, row.theme || '', row.part_of_speech || '', row.first_year ?? null, row.currentness || '', row.notes || '')
    for (const row of sources) insertSource.run(row.source_id, row.source_key, row.source_title || '', row.source_org || '', row.source_date || '', row.source_url || '', row.authority_level || '', row.verification_status || '')
    for (const row of collocations) {
      const linked = Array.isArray(row.source_ids) && row.source_ids.length ? row.source_ids : [row.source_id]
      insertCollocation.run(row.record_id, row.term_id, row.collocation, row.meaning, row.usage_context, row.model_sentence, row.exam_function || '', row.common_errors || '', linked[0], canonicalSourceKeys(row.source_keys).join('；'), row.year ?? null, row.tags || '', row.verification_status || '')
      for (const sourceId of linked) insertLink.run(row.record_id, sourceId)
    }
    imageSeedTerms.forEach((row, seedIndex) => {
      row.collocations.forEach((phrase, phraseIndex) => {
        const recordId = `IMG${String(seedIndex + 1).padStart(2, '0')}-${String(phraseIndex + 1).padStart(2, '0')}`
        insertImageSeed.run(
          recordId,
          seedIndex + 1,
          row.hot_term,
          row.theme || '',
          phrase,
          row.meaning || '',
          row.usage_context || '',
          row.model_sentence || '',
          row.exam_function || '',
          row.common_errors || '',
          canonicalSourceKeys(row.source_keys).join('；'),
          row.year ?? null,
        )
      })
    })
    const metadata = {
      database_name: '中国考公热点词搭配数据库',
      template_version: 'v1.0',
      coverage: '2016-2026',
      grain: '一行=一个热点词的一条搭配',
      source_snapshot: 'merged JSON snapshot',
      image_seed_terms: String(imageSeedTerms.length),
      image_seed_collocations: String(imageSeedTerms.reduce((total, row) => total + row.collocations.length, 0)),
    }
    for (const [key, value] of Object.entries(metadata)) insertMeta.run(key, value)
  })
  write()
  db.close()
  fs.rmSync(outputPath, { force: true })
  fs.renameSync(temporaryPath, outputPath)
  console.log(JSON.stringify({ outputPath, terms: terms.length, collocations: collocations.length, sources: sources.length }, null, 2))
} catch (error) {
  try { db.close() } catch {}
  try { fs.rmSync(temporaryPath, { force: true }) } catch {}
  throw error
}

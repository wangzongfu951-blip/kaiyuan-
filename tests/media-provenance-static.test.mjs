import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(process.cwd())
const payloadPath = path.join(root, 'public', 'data', 'idioms.json')
const evidencePath = path.join(root, 'backend', 'data', 'official-media-occurrences.json')
const exportScriptPath = path.join(root, 'backend', 'scripts', 'export-dictionary-static.mjs')
const wordsPayloadPath = path.join(root, 'public', 'data', 'words.json')

test('static idiom rows expose the reviewed media-occurrences contract', () => {
  const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'))
  assert.ok(Array.isArray(payload.rows) && payload.rows.length > 0)
  const rowsWithContract = payload.rows.filter((row) => Array.isArray(row.mediaOccurrences))
  assert.equal(rowsWithContract.length, payload.rows.length, 'every idiom row must have mediaOccurrences, including an explicit empty array')
  const reviewed = payload.rows.flatMap((row) => row.mediaOccurrences)
  assert.ok(reviewed.length >= 3, 'known official paragraphs should be exported')
  for (const item of reviewed) {
    assert.ok(item.articleTitle || item.title)
    assert.ok(item.organization || item.site)
    assert.ok(item.publishDate || item.date || item.note)
    assert.ok(item.paragraph || item.excerpt || item.note)
    assert.ok(item.highlightTerm)
    assert.ok(item.sourceKind)
    if (item.officialUrl || item.url) assert.match(item.officialUrl || item.url, /^https?:\/\//u)
  }
})

test('official media evidence is separate from unverified search-page records', () => {
  const evidence = JSON.parse(fs.readFileSync(evidencePath, 'utf8'))
  assert.equal(evidence.version, 1)
  assert.ok(Array.isArray(evidence.rows))
  assert.ok(evidence.rows.length >= 3)
  assert.ok(evidence.rows.every((row) => row.sourceKind === 'official_media_excerpt'))
  assert.ok(evidence.rows.every((row) => row.paragraph && row.highlightTerm && row.paragraph.includes(row.highlightTerm)))
  assert.ok(evidence.rows.every((row) => row.officialUrl === '' || /^https?:\/\//u.test(row.officialUrl)))
  assert.ok(evidence.audit?.legacySearchPageRecords === 53)
})

test('exporter reads reviewed media evidence without promoting media_sources search pages', () => {
  const source = fs.readFileSync(exportScriptPath, 'utf8')
  assert.match(source, /official-media-occurrences\.json/u)
  assert.match(source, /mediaOccurrences/u)
  assert.match(source, /legacySearchPageRecords/u)
  assert.doesNotMatch(source, /FROM media_sources/u)
})

test('static real-word rows expose explicit provenance arrays without invented media citations', () => {
  const payload = JSON.parse(fs.readFileSync(wordsPayloadPath, 'utf8'))
  assert.ok(Array.isArray(payload.rows) && payload.rows.length > 0)
  assert.ok(payload.rows.every((row) => Array.isArray(row.examReferences)))
  assert.ok(payload.rows.every((row) => Array.isArray(row.mediaOccurrences)))
  assert.ok(payload.rows.every((row) => row.mediaOccurrences.every((item) => item.paragraph && item.highlightTerm)))
  const linked = payload.rows.filter((row) => row.mediaOccurrences.length > 0).length
  assert.equal(payload.examCoverage?.mediaLinkedWords, linked)
})

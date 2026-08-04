import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(process.cwd())

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'))
}

test('dictionary default listing explicitly ranks high-frequency idioms first', () => {
  const source = fs.readFileSync(path.join(root, 'src/views/DictionaryView.vue'), 'utf8')
  assert.match(source, /frequency\s*===\s*['"]高频['"]/, 'the display comparator must use the database Unicode value')
  assert.match(source, /sort\s*\(/, 'the dictionary view must sort the fetched rows before rendering')
  assert.match(source, /rows\.value\s*=\s*orderedRows/i, 'the sorted list must be assigned to the rendered rows')
})

test('static hotspot snapshots retain complete, unique source-backed rows', () => {
  const expected = [
    ['public/data/hotspots-image.json', 66],
    ['public/data/hotspots-full.json', 667],
  ]
  for (const [file, count] of expected) {
    const payload = readJson(file)
    assert.equal(payload.total, count, `${file} total`)
    assert.equal(payload.rows.length, count, `${file} row count`)
    const ids = new Set()
    const phrases = new Set()
    for (const row of payload.rows) {
      assert.ok(row.id && row.hotTerm && row.collocation, `${file} row identity`)
      assert.ok(row.meaning && row.usageContext && row.modelSentence, `${file} row learning fields`)
      assert.ok(!ids.has(row.id), `${file} duplicate id ${row.id}`)
      ids.add(row.id)
      const phrase = `${row.hotTerm}\u0000${row.collocation}`
      assert.ok(!phrases.has(phrase), `${file} duplicate phrase ${row.hotTerm}/${row.collocation}`)
      phrases.add(phrase)
      assert.equal(typeof row.sourceKeys, 'string', `${file} source keys ${row.id}`)
      assert.ok(row.sourceKeys.trim(), `${file} source keys must not be empty ${row.id}`)
      assert.ok(Array.isArray(row.sourceEvidence), `${file} source evidence ${row.id}`)
      for (const evidence of row.sourceEvidence) {
        assert.ok(evidence.sourceKey && evidence.title && evidence.organization && evidence.verificationStatus, `${file} incomplete source evidence ${row.id}`)
        assert.ok(evidence.note, `${file} source evidence needs a transparent note ${row.id}`)
        if (evidence.url) assert.match(evidence.url, /^https?:\/\//, `${file} source URL must be absolute ${row.id}`)
      }
    }
    assert.ok(payload.rows.every((row) => row.sourceEvidence.length > 0), `${file} every reviewed row should resolve to a source`)
  }
})

test('hotspot exporter preserves source traceability fields', () => {
  const source = fs.readFileSync(path.join(root, 'backend/scripts/hotspots/export-static-corpus.mjs'), 'utf8')
  for (const field of ['sourceKeys', 'year', 'sourceEvidence']) {
    assert.match(source, new RegExp(field), `exporter must preserve ${field}`)
  }
})

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'

const root = path.resolve(process.cwd())
const databasePath = path.join(root, 'backend', 'data', 'idioms.db')
const exportScriptPath = path.join(root, 'backend', 'scripts', 'export-dictionary-static.mjs')
const payloadPath = path.join(root, 'public', 'data', 'idioms.json')
const hotspotPayloadPath = path.join(root, 'public', 'data', 'hotspots-full.json')

function parseArray(value) {
  try {
    const parsed = JSON.parse(value || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

test('exam corpus contains linked public-service idiom occurrences', () => {
  const db = new Database(databasePath, { readonly: true, fileMustExist: true })
  try {
    const idioms = new Set(db.prepare('SELECT idiom FROM idioms').all().map((row) => row.idiom))
    const papers = db.prepare('SELECT related_idioms FROM exam_papers').all()
    const linked = new Set()
    for (const paper of papers) {
      for (const term of parseArray(paper.related_idioms)) if (idioms.has(term)) linked.add(term)
    }
    assert.equal(papers.length, 481)
    assert.ok(linked.size >= 450, `expected at least 450 linked idioms, got ${linked.size}`)
  } finally {
    db.close()
  }
})

test('static exporter and payload preserve inline exam provenance', () => {
  const script = fs.readFileSync(exportScriptPath, 'utf8')
  assert.match(script, /collectExamOccurrences/)
  assert.match(script, /extractExamPassage/)
  assert.match(script, /sourceNote/)
  assert.match(script, /sourceEvidence/)

  const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'))
  assert.equal(payload.total, 29698)
  assert.equal(payload.examCoverage?.papers, 18)
  assert.equal(payload.examCoverage?.corpusPapers, 481)
  assert.equal(payload.examCoverage?.questions, 0)
  assert.ok(payload.examCoverage?.occurrences >= 25)
  const row = payload.rows.find((item) => item.idiom === '一日千里')
  assert.ok(row, 'sample idiom must be present')
  assert.ok(row.examOccurrences?.length >= 1)
  const occurrence = row.examOccurrences[0]
  assert.ok(occurrence.passage)
  assert.ok(occurrence.source)
  assert.ok(occurrence.sourceNote)
  assert.ok(['stem', 'option'].includes(occurrence.termRole))
  assert.doesNotMatch(occurrence.examType, /专项练习|讲义/u)
  assert.doesNotMatch(occurrence.passage, /^(?:A[．.、]|B[．.、])/u)
})

test('static hotspot payload exposes source metadata and a transparent evidence kind', () => {
  const payload = JSON.parse(fs.readFileSync(hotspotPayloadPath, 'utf8'))
  assert.equal(payload.total, 667)
  const row = payload.rows.find((item) => Array.isArray(item.sourceEvidence) && item.sourceEvidence.length)
  assert.ok(row, 'at least one hotspot must expose a source evidence record')
  const evidence = row.sourceEvidence[0]
  assert.ok(evidence.title)
  assert.ok(evidence.organization)
  assert.ok(evidence.url)
  assert.ok(evidence.verificationStatus)
  assert.equal(evidence.evidenceKind, 'database_example')
  assert.ok(evidence.excerpt)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const wordsPath = path.join(projectRoot, 'public', 'data', 'words.json')

function loadWords() {
  const payload = JSON.parse(fs.readFileSync(wordsPath, 'utf8'))
  assert.ok(Array.isArray(payload.rows), 'words static payload must expose rows')
  return payload.rows
}

test('实词静态库至少包含扩充后的考试词语，并保留来源分层', () => {
  const rows = loadWords()
  assert.ok(rows.length >= 120, `expected at least 120 words after corpus expansion, got ${rows.length}`)
  const sourced = rows.filter((row) => row.sourceKind === 'exam_question_record' || row.sourceKind === 'reference_wordbook')
  assert.ok(sourced.length >= 70, `expected at least 70 sourced expansion rows, got ${sourced.length}`)
  for (const row of sourced) {
    assert.equal(typeof row.word, 'string')
    assert.ok(row.word.length >= 2)
    assert.equal(typeof row.explanation, 'string')
    assert.ok(row.explanation.trim().length >= 4)
    assert.equal(typeof row.pos, 'string')
    assert.equal(typeof row.examples, 'string')
    assert.equal(typeof row.source, 'string')
    assert.ok(Array.isArray(row.examReferences), `${row.word} must expose examReferences array`)
  }
})

test('有可核验题干的实词必须携带年份、试卷与原题片段', () => {
  const rows = loadWords()
  const linked = rows.filter((row) => Array.isArray(row.examReferences) && row.examReferences.length > 0)
  assert.ok(linked.length >= 40, `expected at least 40 words linked to exam question records, got ${linked.length}`)
  for (const row of linked) {
    for (const ref of row.examReferences) {
      assert.match(String(ref.year), /^20\d{2}$/)
      assert.ok(String(ref.title).trim().length >= 4, `${row.word} reference title is incomplete`)
      assert.ok(String(ref.questionSnippet).trim().length >= 12, `${row.word} reference question snippet is incomplete`)
      assert.ok(['exam_question_record', 'candidate'].includes(ref.verificationStatus), `${row.word} reference verification status is invalid`)
    }
  }
})

import test from 'node:test'
import assert from 'node:assert/strict'
import { getWordByTitle } from '../backend/src/db_words.js'

test('实词详情 API 返回入库的来源分层与题干引用', () => {
  const row = getWordByTitle('铭刻')
  assert.ok(row, 'expected imported exam-linked word to exist')
  assert.equal(row.sourceKind, 'exam_question_record')
  assert.ok(Array.isArray(row.examReferences))
  assert.ok(row.examReferences.length > 0)
  assert.match(String(row.examReferences[0].year), /^20\d{2}$/)
  assert.ok(String(row.examReferences[0].questionSnippet).length >= 12)
})

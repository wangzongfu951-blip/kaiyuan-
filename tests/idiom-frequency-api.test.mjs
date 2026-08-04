import test from 'node:test'
import assert from 'node:assert/strict'
import { searchIdioms } from '../backend/src/db.js'

test('API dictionary frequency filter returns a complete high-frequency page', () => {
  const frequency = '\u9ad8\u9891'
  const result = searchIdioms('', 20, 0, '', frequency)
  assert.ok(result.total >= 1000, `expected the high-frequency corpus, got ${result.total}`)
  assert.equal(result.rows.length, 20)
  assert.ok(result.rows.every((row) => row.frequency === frequency))
})

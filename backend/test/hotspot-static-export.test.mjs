import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('static hotspot exports contain both public presets', () => {
  const image = JSON.parse(fs.readFileSync('public/data/hotspots-image.json', 'utf8'))
  const full = JSON.parse(fs.readFileSync('public/data/hotspots-full.json', 'utf8'))

  assert.equal(image.total, 66)
  assert.equal(full.total, 667)
  assert.equal(image.rows[0].hotTerm, '\u57ce\u4e61\u8054\u52a8')
  assert.ok(full.rows.every((row) => (
    row.id && row.hotTerm && row.collocation && row.meaning && row.usageContext && row.modelSentence
  )))
})

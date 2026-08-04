import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('handoff does not contain a live-looking API key', () => {
  const handoff = fs.readFileSync(new URL('../../HANDOFF.md', import.meta.url), 'utf8')
  assert.doesNotMatch(handoff, /\b[0-9a-f]{32}\.[A-Za-z0-9_-]{8,}\b/)
})

test('runtime secrets are ignored by git', () => {
  const ignore = fs.readFileSync(new URL('../../.gitignore', import.meta.url), 'utf8')
  assert.match(ignore, /^backend\/\.env$/m)
  assert.match(ignore, /^\.superpowers\/$/m)
})

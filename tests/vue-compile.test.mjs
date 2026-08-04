import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { parse, compileScript } from '@vue/compiler-sfc'

test('ResultView single-file component compiles', () => {
  const filename = new URL('../src/views/ResultView.vue', import.meta.url)
  const source = fs.readFileSync(filename, 'utf8')
  const { descriptor, errors } = parse(source, { filename: filename.pathname })

  assert.deepEqual(errors, [])
  assert.doesNotThrow(() => {
    compileScript(descriptor, { id: 'result-view' })
  })
})

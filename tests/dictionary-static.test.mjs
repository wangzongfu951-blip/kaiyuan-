import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(process.cwd())

function readJson(relativePath) {
  const file = path.join(root, relativePath)
  assert.ok(fs.existsSync(file), `${relativePath} should be generated for static publishing`)
  return JSON.parse(fs.readFileSync(file, 'utf8'))
}

test('static dictionary export contains the backend corpus and usable fields', () => {
  assert.ok(fs.existsSync(path.join(root, 'public/.nojekyll')), 'GitHub Pages must not let Jekyll drop Vite underscore assets')
  const idioms = readJson('public/data/idioms.json')
  const words = readJson('public/data/words.json')

  assert.ok(Array.isArray(idioms.rows))
  assert.ok(idioms.rows.length >= 29000, `expected the full idiom corpus, got ${idioms.rows.length}`)
  assert.ok(Array.isArray(words.rows))
  assert.ok(words.rows.length >= 50, `expected the real-word corpus, got ${words.rows.length}`)
  assert.ok(idioms.rows.some((row) => row.idiom === '差强人意'))
  assert.ok(words.rows.some((row) => row.word === '配合'))

  for (const row of [idioms.rows[0], words.rows[0]]) {
    assert.equal(typeof row.explanation, 'string')
    assert.ok(row.explanation.trim().length > 0)
  }
})

test('dictionary views and home store wire the static fallback and spacing fix', () => {
  const dictionary = fs.readFileSync(path.join(root, 'src/views/DictionaryView.vue'), 'utf8')
  const result = fs.readFileSync(path.join(root, 'src/views/ResultView.vue'), 'utf8')
  const wordDetail = fs.readFileSync(path.join(root, 'src/views/WordDetailView.vue'), 'utf8')
  const store = fs.readFileSync(path.join(root, 'src/stores/app.ts'), 'utf8')
  const home = fs.readFileSync(path.join(root, 'src/views/HomeView.vue'), 'utf8')
  const service = fs.readFileSync(path.join(root, 'src/services/dictionary-static.ts'), 'utf8')

  assert.match(service, /loadStaticIdioms/)
  assert.match(service, /loadStaticWords/)
  assert.match(dictionary, /loadStaticIdioms|searchStaticIdioms/)
  assert.match(dictionary, /loadStaticWords|searchStaticWords/)
  assert.match(result, /getStaticIdiom/)
  assert.match(wordDetail, /getStaticWord/)
  assert.match(store, /getStaticRandomIdioms/)
  assert.match(home, /pt-4/)
  assert.doesNotMatch(home, /relative z-10 -mt-1/)
})

test('static pages keep feature navigation instead of bouncing protected routes home', () => {
  const router = fs.readFileSync(path.join(root, 'src/router/index.ts'), 'utf8')

  assert.match(router, /const isStaticPagesBuild = import\.meta\.env\.VITE_STATIC_PAGES === 'true'/)
  assert.match(router, /if \(isStaticPagesBuild\) \{[\s\S]*?return true\s*\}/)
  assert.doesNotMatch(router, /if \(isStaticPagesBuild\) \{\s*return to\.meta\.requiresAuth \? \{ name: 'Home' \} : true\s*\}/)
})

test('static quiz pages fall back to the bundled idiom corpus', () => {
  const quiz = fs.readFileSync(path.join(root, 'src/views/quiz/QuizPlay.vue'), 'utf8')

  assert.match(quiz, /getStaticRandomIdioms/)
  assert.match(quiz, /VITE_STATIC_PAGES/)
})

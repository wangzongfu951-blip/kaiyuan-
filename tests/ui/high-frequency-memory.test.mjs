import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(process.cwd())
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')

test('dictionary exposes a first-class high-frequency tab before the all tab', () => {
  const source = read('src/views/DictionaryView.vue')
  const highIndex = source.indexOf('data-testid="frequency-high"')
  const allIndex = source.indexOf('data-testid="frequency-all"')
  assert.ok(highIndex >= 0, 'high-frequency tab must have a stable mobile test id')
  assert.ok(allIndex >= 0, 'all tab must have a stable mobile test id')
  assert.ok(highIndex < allIndex, 'high-frequency tab must be first')
  assert.ok(source.includes("activeFrequency === '\u9ad8\u9891'"), 'frequency state must use the canonical high-frequency value')
})

test('static dictionary search can filter the high-frequency memory set', () => {
  const service = read('src/services/dictionary-static.ts')
  assert.match(service, /frequency\?:\s*string/)
  assert.match(service, /row\.frequency\s*===\s*frequency/)
})

test('home has a tappable high-frequency memory entry that opens a study loop', () => {
  const home = read('src/views/HomeView.vue')
  assert.match(home, /data-testid="high-frequency-memory"/)
  assert.match(home, /quiz\/idiom-usage\?[^']*high-frequency|dictionary\?[^']*high-frequency/)
})

test('idiom details render embedded media occurrences and do not depend on search-page links', () => {
  const result = read('src/views/ResultView.vue')
  assert.match(result, /mediaOccurrences/)
  assert.match(result, /articleTitle|organization|publishDate|officialUrl|paragraph|sourceExcerpt/)
  assert.match(result, /highlightIdiom|media-evidence-term/)
  assert.match(result, /find\(\(items\).*items\.length/)
  assert.match(result, /a\.articleTitle|a\.officialUrl|a\.paragraph/)
  assert.doesNotMatch(result, /so\.people\.com\.cn|so\.news\.cn|so\.gmw\.cn/)
})

test('word details render embedded media occurrences and keep an honest empty state', () => {
  const word = read('src/views/WordDetailView.vue')
  assert.match(word, /examReferences/, 'word details should expose the stored national/provincial exam context')
  assert.match(word, /word-exam-references/, 'word exam references need an inline mobile section')
  assert.match(word, /mediaOccurrences/)
  assert.match(word, /officialUrl|url/)
  assert.match(word, /find\(\(items\).*items\.length/)
  assert.match(word, /\u6682\u672a|\u6682\u65e0|\u672a\u6536\u5f55|\u6ca1\u6709\u771f\u5b9e\u5165\u5e93/u)
  assert.doesNotMatch(word, /so\.people\.com\.cn|so\.news\.cn|so\.gmw\.cn/)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(process.cwd())
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')

test('idiom analysis uses a context blank and idiom-name distractors', () => {
  const quiz = read('src/views/quiz/QuizPlay.vue')
  const builder = quiz.slice(quiz.indexOf('function idiomContext'))
    .slice(0, quiz.indexOf('function generatePaperQuestion') - quiz.indexOf('function idiomContext'))
  assert.match(builder, /examOccurrences/)
  assert.match(builder, /modern_example/)
  assert.match(builder, /______|_{2,}/)
  assert.match(builder, /row\.idiom|candidatePool[\s\S]*?\.idiom/)
  assert.doesNotMatch(builder, /pickMeaning|fallbackDefinitions|correctAnswer/)
  assert.match(quiz, /curatedContextQuestions/)
})

test('idiom chain has practice questions at every difficulty', () => {
  const source = read('src/data/quiz.ts')
  const chain = source.split('"\u6210\u8bed\u63a5\u9f99":')[1].split('"\u9519\u9898\u91cd\u7ec3":')[0]
  for (const difficulty of ['\u57fa\u7840', '\u4e2d\u7b49', '\u8f83\u96be']) {
    const count = (chain.match(new RegExp(`difficulty: "${difficulty}"`, 'g')) || []).length
    assert.ok(count >= 2, `${difficulty} should have at least two chain questions, got ${count}`)
  }
})

test('real paper cards are backed by local exam_papers export', () => {
  const payload = JSON.parse(read('public/data/exam-papers.json'))
  assert.equal(payload.total, payload.rows.length)
  assert.ok(payload.rows.length >= 18)
  assert.ok(payload.rows.some((row) => row.exam_type === '\u56fd\u8003'))
  assert.ok(payload.rows.some((row) => row.exam_type === '\u7701\u8003'))
  assert.ok(payload.rows.some((row) => row.year === 2020))
  assert.ok(payload.rows.some((row) => row.year === 2024))
  for (const row of payload.rows) {
    assert.match(row.title, /\d{4}\u5e74/)
    assert.doesNotMatch(row.title, /\u4e13\u9879\u7ec3\u4e60|\u8fa8\u6790|\u8bcd\u4e49/u)
    assert.ok(Array.isArray(row.options) && row.options.length >= 4)
    assert.match(String(row.answer), /^[A-H]$/)
    assert.equal(typeof row.question_text, 'string')
  }
  const view = read('src/views/quiz/QuizView.vue')
  const play = read('src/views/quiz/QuizPlay.vue')
  assert.match(view, /loadStaticExamPapers/)
  assert.match(view, /\?paper=/)
  assert.match(play, /getStaticExamPaper/)
  assert.match(play, /route\.query\.paper/)
  assert.match(play, /isRealPaperRow/)
})

test('static quiz fallback supports modules without an API', () => {
  const play = read('src/views/quiz/QuizPlay.vue')
  assert.match(play, /import\.meta\.env\.VITE_STATIC_PAGES === 'true'/)
  assert.match(play, /getQuizQuestions\(staticModuleName\(\)\)/)
  assert.match(play, /loadLocalQuestions\(\)/)
  assert.match(play, /toQuizQuestion/)
})

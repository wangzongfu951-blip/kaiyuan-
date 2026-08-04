import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const source = fs.readFileSync(path.join(process.cwd(), 'src/views/quiz/QuizPlay.vue'), 'utf8')

test('idiom usage questions are context fill-in questions, not definition-choice questions', () => {
  const builder = source.slice(source.indexOf('function idiomContext'))
    .slice(0, source.indexOf('function generatePaperQuestion') - source.indexOf('function idiomContext'))
  assert.match(builder, /examOccurrences/, 'the question builder should prefer a verified exam passage')
  assert.match(builder, /modern_example/, 'the question builder needs a documented context fallback')
  assert.match(builder, /_{2,}|______/, 'the target idiom should be replaced with a blank')
  assert.match(builder, /candidatePool[\s\S]*?\.idiom|row\.idiom/, 'distractors should be idiom/word labels')
  assert.doesNotMatch(builder, /pickMeaning|correctAnswer/, 'the correct option must not be a definition sentence')
})

test('the high-frequency memory entry feeds a filtered question set', () => {
  assert.match(source, /route\.query\.focus/, 'quiz route should read the memory focus query')
  assert.match(source, /getStaticHighFrequencyIdioms|frequency.*高频/, 'memory mode should request high-frequency idioms')
})

import type { QuizQuestion } from '../types'

export interface StaticExamPaper {
  id: number
  title: string
  exam_type: string
  year: number
  province: string
  question_type: string
  question_text: string
  options: string[]
  answer: string
  answer_explanation: string
  related_idioms: string[]
  difficulty: number | string
}

interface StaticExamPayload {
  version: number
  total: number
  rows: StaticExamPaper[]
}

let papersPromise: Promise<StaticExamPaper[]> | null = null

function staticUrl(fileName: string): string {
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`
  return `${base}data/${fileName}`
}

export function loadStaticExamPapers(): Promise<StaticExamPaper[]> {
  papersPromise ??= fetch(staticUrl('exam-papers.json'), { cache: 'no-cache' })
    .then(async (response) => {
      if (!response.ok) throw new Error(`static exam request failed: ${response.status}`)
      const payload = await response.json() as StaticExamPayload
      if (!payload || !Array.isArray(payload.rows)) throw new Error('static exam payload is invalid')
      return payload.rows
    })
  return papersPromise
}

export async function getStaticExamPaper(id: string | number | undefined): Promise<StaticExamPaper | null> {
  if (id === undefined || id === null || id === '') return null
  const rows = await loadStaticExamPapers()
  return rows.find((row) => String(row.id) === String(id)) || null
}

export function toQuizQuestion(question: QuizQuestion): {
  id: string
  question: string
  options: string[]
  answer: number
  explanation: string
  difficulty: string
  type: string
} {
  return {
    id: question.id,
    question: question.question,
    options: [...question.options],
    answer: question.answer,
    explanation: question.explanation,
    difficulty: question.difficulty,
    type: question.module,
  }
}

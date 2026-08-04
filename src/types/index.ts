export interface IdiomDetail {
  id?: number
  idiom: string
  pinyin: string
  explanation: string
  source_book: string
  source_chapter: string
  source_text?: string
  context: string
  context_translation: string
  exam_trap: string
  original_text_url: string
  category?: string
  frequency?: string
  word_breakdown?: string
  error_usage?: string
  correct_usage?: string
  source_dynasty?: string
  similar_idioms?: string[]
}

export const errorCategories = [
  '望文生义',
  '古今异义',
  '对象误用',
  '褒贬误用',
  '谦敬误用',
  '语义重复',
] as const

export type ErrorCategory = typeof errorCategories[number]

export interface StudyPlan {
  dailyTarget: number
  startDate: string
  learned: string[]
  reviewing: string[]
}

export interface ReviewRecord {
  idiom: string
  level: number
  nextReview: string
  lastReview: string
}

export type QuizModule = 'idiom-usage' | 'word-fill' | 'reading' | 'sort' | 'chain' | 'mistakes'

export interface MistakeRecord {
  questionId: string
  module: QuizModule
  wrongAnswer: number
  correctAnswer: number
  timestamp: string
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface QuizQuestion {
  id: string
  module: string
  question: string
  options: string[]
  answer: number
  explanation: string
  difficulty: string
}
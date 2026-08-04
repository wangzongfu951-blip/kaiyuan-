import type { QuizQuestion } from "../types"

export interface ExamPaper {
  id: string
  year: number
  name: string
  region: string
  module: string
  questionCount: number
  difficulty: "基础" | "中等" | "较难"
}

export const examPapers: ExamPaper[] = [
  { id: "ep1", year: 2025, name: "2025国家公务员行测", region: "国考", module: "成语辨析", questionCount: 15, difficulty: "中等" },
  { id: "ep2", year: 2025, name: "2025国家公务员行测", region: "国考", module: "片段阅读", questionCount: 20, difficulty: "中等" },
  { id: "ep3", year: 2024, name: "2024国家公务员行测", region: "国考", module: "成语辨析", questionCount: 15, difficulty: "较难" },
  { id: "ep4", year: 2024, name: "2024省考联考行测", region: "联考", module: "判断推理", questionCount: 35, difficulty: "中等" },
  { id: "ep5", year: 2024, name: "2024广东省考行测", region: "广东", module: "语句排序", questionCount: 10, difficulty: "中等" },
  { id: "ep6", year: 2023, name: "2023国家公务员行测", region: "国考", module: "定义判断", questionCount: 10, difficulty: "基础" },
]

export const examTips = [
  { category: "成语辨析", tip: "注意望文生义类成语，如「差强人意」「首当其冲」「万人空巷」，是最常见的易错点。" },
  { category: "片段阅读", tip: "先看问题再读材料，注意转折词「但是」「然而」「却」后的内容往往是重点。" },
  { category: "语句排序", tip: "找首句（不能是关联词后半部分）、找捆绑（代词指代、关联词配对）、看逻辑顺序。" },
  { category: "判断推理", tip: "三段论注意「所有→有的」不能逆推。逆否命题是行测逻辑的核心考点。" },
  { category: "定义判断", tip: "抓住定义中的关键限定词，逐一排除不符合的选项。" },
  { category: "类比推理", tip: "先看词性关系，再看逻辑关系。常见关系：种属、并列、因果、工具、场所。" }
]
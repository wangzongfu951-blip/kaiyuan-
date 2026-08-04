import type { QuizQuestion } from "../types"

const quizDB: Record<string, QuizQuestion[]> = {
  "成语辨析": [
    {
      id: "q1",
      module: "成语辨析",
      question: "下列句子中，成语使用正确的一项是：",
      options: [
        "他这次考试差强人意，只考了60分",
        "金融危机中，中小企业首当其冲受到冲击",
        "他首当其冲完成了任务",
        "这完全是空穴来风，没有任何根据"
      ],
      answer: 1,
      explanation: "「首当其冲」仅用于遭受不幸或灾难的语境。A项「差强人意」误用为不满意，C项「首当其冲」误用为首先，D项「空穴来风」古义为有根据。",
      difficulty: "基础"
    },
    {
      id: "q2",
      module: "成语辨析",
      question: "「七月流火」的正确含义是：",
      options: ["天气炎热", "天气转凉", "火灾发生", "星光燃烧"],
      answer: 1,
      explanation: "「七月流火」中的「火」是星名（大火星），表示天气开始转凉，出自《诗经·豳风·七月》。",
      difficulty: "基础"
    },
    {
      id: "q3",
      module: "成语辨析",
      question: "下列成语中，属于褒义词的是：",
      options: ["异想天开", "始作俑者", "目无全牛", "弹冠相庆"],
      answer: 2,
      explanation: "「目无全牛」形容技艺纯熟，是褒义。始作俑者、弹冠相庆均为贬义。异想天开多含贬义。",
      difficulty: "中等"
    },
    {
      id: "q4",
      module: "成语辨析",
      question: "「不刊之论」中「刊」的意思是：",
      options: ["刊登", "删除修改", "刊物", "刊载"],
      answer: 1,
      explanation: "古代「刊」是削除、修改之意。「不刊之论」指不可删改的言论，形容言论精当无懈可击。",
      difficulty: "中等"
    },
    {
      id: "q5",
      module: "成语辨析",
      question: "下列句子中，成语使用错误的一项是：",
      options: [
        "万人空巷，家家户户都在观看春晚",
        "他的技艺已经达到目无全牛的境界",
        "这篇文章是不刊之论，没有杂志肯刊登",
        "天气渐凉，七月流火，九月授衣"
      ],
      answer: 2,
      explanation: "「不刊之论」意为不可磨灭的言论，不是「不能刊登」。C项将「不刊」误解为不能刊登。",
      difficulty: "较难"
    },
    {
      id: "q11",
      module: "成语辨析",
      question: "「文不加点」的正确含义是：",
      options: [
        "文章不加标点",
        "文章写得很快不用修改",
        "文章没有重点",
        "文章内容空洞"
      ],
      answer: 1,
      explanation: "「文不加点」意为写文章一气呵成，不需要修改。「点」是涂改之意，不是标点符号。",
      difficulty: "中等"
    },
    {
      id: "q12",
      module: "成语辨析",
      question: "下列成语使用正确的一项是：",
      options: [
        "他的建议不以为然，大家都不赞同",
        "他对这件事不以为意，毫不在意",
        "这篇文章差强人意，写得很差",
        "他弹冠相庆，庆祝升职"
      ],
      answer: 1,
      explanation: "「不以为意」意为不放在心上。「不以为然」意为不认为正确。「差强人意」是大体满意。「弹冠相庆」是贬义。",
      difficulty: "中等"
    }
  ],
  "语境填词": [
    {
      id: "q6",
      module: "语境填词",
      question: "面对突如其来的疫情，医护人员____，奔赴一线。填入最恰当的成语：",
      options: ["首当其冲", "义无反顾", "空穴来风", "差强人意"],
      answer: 1,
      explanation: "「义无反顾」意为勇往直前，毫不犹豫。用于形容医护人员的奉献精神最为恰当。",
      difficulty: "基础"
    },
    {
      id: "q7",
      module: "语境填词",
      question: "他的演讲____，全场观众都被深深打动了。填入最恰当的成语：",
      options: ["慷慨激昂", "炙手可热", "不以为然", "差强人意"],
      answer: 0,
      explanation: "「慷慨激昂」形容情绪激动，充满正气。用于形容演讲感染力最为恰当。",
      difficulty: "基础"
    },
    {
      id: "q8",
      module: "语境填词",
      question: "这项政策____，社会各界反响强烈。填入最恰当的成语：",
      options: ["空穴来风", "振聋发聩", "不刊之论", "目无全牛"],
      answer: 1,
      explanation: "「振聋发聩」比喻用言论唤醒糊涂麻木的人，强调影响力之大。适合形容政策的社会反响。",
      difficulty: "中等"
    },
    {
      id: "q18",
      module: "语境填词",
      question: "他的解释____，让人很难信服。填入最恰当的成语：",
      options: ["不以为然", "捉襟见肘", "差强人意", "牵强附会"],
      answer: 3,
      explanation: "「牵强附会」意为勉强把不相关的事物联系在一起，形容解释不自然、不可信。",
      difficulty: "中等"
    },
    {
      id: "q19",
      module: "语境填词",
      question: "老教授学识渊博，讲解深入浅出，____。填入最恰当的成语：",
      options: ["目无全牛", "不刊之论", "妙语连珠", "炙手可热"],
      answer: 2,
      explanation: "「妙语连珠」形容说话精彩有趣。用在此处最符合语境。",
      difficulty: "基础"
    }
  ],
  "片段阅读": [
    {
      id: "q9",
      module: "片段阅读",
      question: "成语是中华文化的活化石，每一个成语背后都有一段历史故事。这段话主要强调：",
      options: ["成语的数量", "成语的文化价值", "成语的难度", "成语的分类"],
      answer: 1,
      explanation: "片段将成语比喻为「活化石」，强调其承载历史文化的作用，重点在于成语的文化价值。",
      difficulty: "基础"
    },
    {
      id: "q21",
      module: "片段阅读",
      question: "在公务员考试中，成语辨析题考查的不是死记硬背，而是对语境的理解能力。这段话意在说明：",
      options: ["成语很难背", "语境理解更重要", "考试很难", "需要大量刷题"],
      answer: 1,
      explanation: "片段用「不是..而是..」的转折结构，强调语境理解能力比死记硬背更重要。",
      difficulty: "中等"
    }
  ],
  "语句排序": [
    {
      id: "q14",
      module: "语句排序",
      question: "排列：①因此要准确理解 ②很多成语容易望文生义 ③才能正确使用 ④只有掌握出处",
      options: ["②①④③", "①②③④", "④②①③", "②④①③"],
      answer: 0,
      explanation: "②指出问题→①因此→④只有→③才能，形成因果+条件逻辑链。",
      difficulty: "中等"
    },
    {
      id: "q15",
      module: "语句排序",
      question: "排列：①但过度依赖死记硬背效果差 ②成语学习需要积累 ③因此要理解记忆 ④比如通过故事来记忆",
      options: ["①②③④", "②①④③", "②①③④", "②③①④"],
      answer: 1,
      explanation: "②积累→①转折→④举例→③结论，形成转折+举例+总结逻辑链。",
      difficulty: "中等"
    }
  ],
  "成语接龙": [
    {
      id: "q22",
      module: "成语接龙",
      question: "「望梅止渴」的最后一个字是「渴」，下列哪个成语以「渴」字开头？",
      options: ["渴骥奔泉", "渴而掘井", "渴尘万斛", "以上都是"],
      answer: 3,
      explanation: "渴骥奔泉、渴而掘井、渴尘万斛都是以「渴」字开头的成语。成语接龙练习可以扩展成语储备。",
      difficulty: "中等"
    },
    {
      id: "q23",
      module: "成语接龙",
      question: "下列成语中，能与「画蛇添足」接龙的是（足字开头）：",
      options: ["足智多谋", "足不出户", "丰衣足食", "以上都是"],
      answer: 3,
      explanation: "足智多谋、足不出户、丰衣足食都是以「足」字开头的成语，都可以接龙。",
      difficulty: "基础"
    },
    {
      id: "q26",
      module: "成语接龙",
      question: "「万水千山」的最后一个字是「山」，下列哪个成语可以接在后面？",
      options: ["山清水秀", "海阔天空", "水到渠成", "春暖花开"],
      answer: 0,
      explanation: "「山清水秀」以「山」开头，符合接龙规则；其余选项的首字不是「山」。",
      difficulty: "基础"
    },
    {
      id: "q27",
      module: "成语接龙",
      question: "「四面楚歌」的最后一个字是「歌」，下列哪个成语可以接在后面？",
      options: ["歌舞升平", "舞文弄墨", "风和日丽", "龙飞凤舞"],
      answer: 0,
      explanation: "「歌舞升平」以「歌」开头，意为歌唱舞蹈庆祝太平，符合接龙规则。",
      difficulty: "基础"
    },
    {
      id: "q28",
      module: "成语接龙",
      question: "「一心一意」的最后一个字是「意」，下列哪个成语可以接在后面？",
      options: ["意味深长", "一举两得", "心安理得", "义无反顾"],
      answer: 0,
      explanation: "「意味深长」以「意」开头，形容含义深刻而耐人寻味。",
      difficulty: "基础"
    },
    {
      id: "q29",
      module: "成语接龙",
      question: "「破釜沉舟」的最后一个字是「舟」，下列哪个成语可以接在后面？",
      options: ["舟车劳顿", "风雨同舟", "同舟共济", "载舟覆舟"],
      answer: 0,
      explanation: "「舟车劳顿」以「舟」开头，形容旅途劳累；其他选项虽含「舟」，但首字并非「舟」。",
      difficulty: "中等"
    },
    {
      id: "q30",
      module: "成语接龙",
      question: "「同舟共济」的最后一个字是「济」，下列哪个成语可以接在后面？",
      options: ["济济一堂", "同甘共苦", "四海一家", "百废待兴"],
      answer: 0,
      explanation: "「济济一堂」以「济」开头，形容许多有才能的人聚集在一起。",
      difficulty: "中等"
    },
    {
      id: "q31",
      module: "成语接龙",
      question: "「百里挑一」的最后一个字是「一」，下列哪个成语可以接在后面？",
      options: ["一鸣惊人", "百发百中", "独一无二", "十全十美"],
      answer: 0,
      explanation: "「一鸣惊人」以「一」开头，比喻平时没有特殊表现，一下子作出惊人的成绩。",
      difficulty: "中等"
    },
    {
      id: "q32",
      module: "成语接龙",
      question: "「出奇制胜」的最后一个字是「胜」，下列哪个成语可以接在后面？",
      options: ["胜友如云", "旗开得胜", "势如破竹", "马到成功"],
      answer: 0,
      explanation: "「胜友如云」以「胜」开头，形容许多有才华的朋友聚集在一起。",
      difficulty: "较难"
    },
    {
      id: "q33",
      module: "成语接龙",
      question: "「锲而不舍」的最后一个字是「舍」，下列哪个成语可以接在后面？",
      options: ["舍生取义", "持之以恒", "半途而废", "义无反顾"],
      answer: 0,
      explanation: "「舍生取义」以「舍」开头，指为正义事业不惜牺牲生命。",
      difficulty: "较难"
    },
    {
      id: "q34",
      module: "成语接龙",
      question: "「相得益彰」的最后一个字是「彰」，下列哪个成语可以接在后面？",
      options: ["彰明较著", "相辅相成", "交相辉映", "光彩夺目"],
      answer: 0,
      explanation: "「彰明较著」以「彰」开头，指事情或道理非常明显。",
      difficulty: "较难"
    },
    {
      id: "q35",
      module: "成语接龙",
      question: "「顾全大局」的最后一个字是「局」，下列哪个成语可以接在后面？",
      options: ["局促不安", "顾此失彼", "举棋不定", "四面楚歌"],
      answer: 0,
      explanation: "「局促不安」以「局」开头，形容举止拘束、心中不安。",
      difficulty: "较难"
    }
  ],
  "错题重练": [
    {
      id: "q24",
      module: "错题重练",
      question: "（易错重练）「炙手可热」的正确用法是：",
      options: [
        "这款产品炙手可热，非常受欢迎",
        "他权倾一时，炙手可热，无人敢惹",
        "这首歌炙手可热，传遍大街小巷",
        "这个职业炙手可热，很多人报考"
      ],
      answer: 1,
      explanation: "「炙手可热」只能形容权势气焰，不能形容受欢迎程度。ACD项都是常见误用。",
      difficulty: "较难"
    },
    {
      id: "q25",
      module: "错题重练",
      question: "（易错重练）「空穴来风」的古义是：",
      options: ["毫无根据", "有根据有原因", "风很大", "很突然"],
      answer: 1,
      explanation: "「空穴来风」古义是有根据有原因（有了洞穴才进风），现代常被误用为毫无根据。这是典型的古今异义成语。",
      difficulty: "较难"
    }
  ]
}

export function getQuizQuestions(module: string): QuizQuestion[] {
  return quizDB[module] ?? quizDB["成语辨析"] ?? []
}
export function getDailyQuiz(): QuizQuestion { return quizDB["成语辨析"][0] }
export function getAllQuizModules(): string[] { return Object.keys(quizDB) }

import fetch from 'node-fetch';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Fallback: manually load .env if dotenv didn't work
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, '..', '.env');
try {
  const envContent = readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
} catch {}

const API_KEY = process.env.ZHIPU_API_KEY;
const BASE_URL = process.env.ZHIPU_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';

if (!API_KEY) console.error('[ai.js] WARNING: ZHIPU_API_KEY not loaded!');

async function callZhipu(messages, options = {}) {
  const res = await fetch(BASE_URL + '/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + API_KEY,
    },
    body: JSON.stringify({
      model: options.model || 'glm-4-flash',
      messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens || 2048,
      stream: options.stream || false,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error('Zhipu API ' + res.status + ': ' + text);
  }

  return res;
}

export async function aiChatStream(userMessage, history = [], res) {
  const systemPrompt = '你是昭途考公智学平台的 AI 学习助手，专注于公务员考试行测言语理解与表达模块。你的职责：1. 解答成语的含义、出处、用法、易错点 2. 解释成语在考公真题中的常见考法 3. 帮助用户理解言语理解题目的解题思路 4. 用简洁专业的语言回答，必要时举例说明';

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: userMessage },
  ];

  const upstream = await callZhipu(messages, { stream: true });
  const reader = upstream.body;

  let buffer = '';
  reader.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith('data:')) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === '[DONE]') {
        res.write('data: [DONE]\n\n');
        return;
      }
      try {
        const obj = JSON.parse(payload);
        const delta = obj.choices?.[0]?.delta?.content;
        if (delta) res.write('data: ' + JSON.stringify({ content: delta }) + '\n\n');
      } catch {}
    }
  });

  reader.on('end', () => {
    try { res.write('data: [DONE]\n\n'); } catch {}
    res.end();
  });

  reader.on('error', (err) => {
    try { res.write('data: ' + JSON.stringify({ error: err.message }) + '\n\n'); } catch {}
    res.end();
  });
}

export async function aiChat(userMessage, history = []) {
  const systemPrompt = '你是昭途考公智学平台的 AI 学习助手，专注于公务员考试行测言语理解与表达模块。';
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: userMessage },
  ];
  const res = await callZhipu(messages);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

export async function aiExplainIdiom(idiom) {
  const prompt = '请详细解释成语' + idiom + '，返回JSON格式：{"explanation":"详细释义","source":"出处","context_example":"一个真实的现代语境造句（不是定义，是用在句子中的例子）","exam_trap":"考公易错点","similar_idioms":["近义1","近义2"],"antonyms":["反义1","反义2"]} 只返回JSON。';

  const res = await callZhipu([{ role: 'user', content: prompt }], { temperature: 0.5 });
  const data = await res.json();
  const result = data.choices?.[0]?.message?.content || '';
  const jsonMatch = result.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI 返回格式异常');
  return JSON.parse(jsonMatch[0]);
}

export async function aiExplainWord(word) {
  const prompt = '请为词语「' + word + '」提供以下信息，只返回JSON，不要多余文字：{"pinyin":"拼音(带声调)","explanation":"释义，两句话以内","pos":"词性如动词/形容词/名词","context_example":"用该词造一个自然的现代句子","synonyms":["近义词1，必须是2-4字的词语而非成语"],"antonyms":["反义词，必须是2-4字的实词而非成语，不要四字成语"]}。要求：1.近义词和反义词都必须是实词，不要成语 2.pinyin必须有声调 3.只返回JSON。';
  const res = await callZhipu([{ role: 'user', content: prompt }], { temperature: 0.3, max_tokens: 512 });
  const data = await res.json();
  const result = data.choices?.[0]?.message?.content || '';
  const jsonMatch = result.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI 返回格式异常');
  return JSON.parse(jsonMatch[0]);
}


export async function aiSearchMediaSource(idiom) {
    // Provide real search links to authoritative media sites
    // Users can click to search for the idiom in real articles
    const sources = [
      { name: '人民日报', url: 'https://so.people.com.cn/n1?keyword=' + encodeURIComponent(idiom), icon: '📱' },
      { name: '新华网', url: 'https://so.news.cn/#search/0/' + encodeURIComponent(idiom) + '/1', icon: '📰' },
      { name: '光明网', url: 'https://so.gmw.cn/?keywords=' + encodeURIComponent(idiom), icon: '🗞️' },
      { name: '中国青年报', url: 'http://zqb.cyol.com/search?q=' + encodeURIComponent(idiom), icon: '📋' },
      { name: '科技日报', url: 'https://www.stdaily.com/search?keyword=' + encodeURIComponent(idiom), icon: '🔬' },
    ];

    // Also try to get AI-generated context if available
    let aiArticles = [];
    try {
      const prompt = '成语「' + idiom + '」在考公行测言语理解中常考。请简要说明：1）该成语常出现在什么语境的官媒文章中（如政策评论、社会民生等）；2）给出1-2个真实的使用例句。返回JSON：{"context":"常见使用语境","examples":["例句1","例句2"]} 只输出JSON。';
      const res = await callZhipu([{ role: 'user', content: prompt }], { temperature: 0.3, max_tokens: 512 });
      const data = await res.json();
      const result = data.choices?.[0]?.message?.content || '';
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.examples && Array.isArray(parsed.examples)) {
          aiArticles = parsed.examples.map((ex, i) => ({
            title: '官媒语境示例 ' + (i + 1),
            source: 'AI 分析',
            date: '',
            url: sources[i % sources.length].url,
            quote: ex
          }));
        }
      }
    } catch (e) {
      // AI context generation failed, just return search links
    }

    const articles = [
      ...aiArticles,
      ...sources.map(s => ({
        title: '在' + s.name + '中搜索「' + idiom + '」',
        source: s.name,
        date: '点击查看',
        url: s.url,
        quote: '点击前往' + s.name + '搜索该成语在权威媒体中的真实使用'
      }))
    ];

    return { articles };
  }

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { searchIdioms, getIdiomByWord, getRandomExamIdioms, getSimilarIdioms, getExamPapers, getExamQuestions, getIdiomCategories, getOfficialMediaOccurrences, db } from './db.js';
import { searchWords, getWordByTitle, getSimilarWords, getWordCategories } from './db_words.js';
import { aiChatStream, aiExplainIdiom, aiExplainWord } from './ai.js';
import { securityMiddleware, getSecurityStats } from './security.js';
import {
  listHotspots,
  getHotspotById,
  listHotspotTopics,
  getHotspotStats,
} from './hotspots-local.js';

export const app = express();

/* ============================================================
   SECURITY LAYER 1: Helmet (HTTP Security Headers)
   ============================================================ */
app.use(helmet({
  contentSecurityPolicy: false, // Vite dev needs inline scripts
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

/* ============================================================
   SECURITY LAYER 2: CORS
   ============================================================ */
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    if (/^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+):\d+$/.test(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: false,
}));

/* ============================================================
   SECURITY LAYER 3: Body Parsing
   ============================================================ */
app.use(express.json({ limit: '10kb' }));
app.use(hpp());

/* ============================================================
   SECURITY LAYER 4: Custom Rate Limiter (no package issues)
   ============================================================ */
const rateStore = new Map();

function getIp(req) {
  const ip = req.ip || req.socket?.remoteAddress || '127.0.0.1';
  if (ip === '::1' || ip === '::ffff:127.0.0.1') return '127.0.0.1';
  return ip;
}

function rateLimitMiddleware(maxPerMinute, maxPerSecond) {
  return (req, res, next) => {
    const ip = getIp(req);
    if (ip === '127.0.0.1' || /^192\.168\./.test(ip) || /^10\./.test(ip)) return next();

    const now = Date.now();
    let entry = rateStore.get(ip);
    if (!entry) { entry = { count: 0, firstSeen: now, perSec: [] }; rateStore.set(ip, entry); }

    // Per-second
    entry.perSec = entry.perSec.filter(t => now - t < 1000);
    entry.perSec.push(now);
    if (entry.perSec.length > maxPerSecond) {
      return res.status(429).json({ ok: false, error: 'Too fast' });
    }

    // Per-minute
    if (now - entry.firstSeen > 60000) { entry.count = 0; entry.firstSeen = now; }
    entry.count++;
    if (entry.count > maxPerMinute) {
      return res.status(429).json({ ok: false, error: 'Rate limit exceeded' });
    }
    next();
  };
}

app.use('/api/', rateLimitMiddleware(200, 15));


app.use('/api/ai/', rateLimitMiddleware(30, 5));
app.use('/api/generate', rateLimitMiddleware(20, 3));

// Cleanup
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateStore) {
    if (now - entry.firstSeen > 120000) rateStore.delete(ip);
  }
}, 60000);

/* ============================================================
   SECURITY LAYER 5: Custom Security Middleware
   ============================================================ */
app.use(securityMiddleware);

/* ============================================================
   SECURITY LAYER 6: Request ID + Logging
   ============================================================ */
app.use((req, res, next) => {
  req.requestId = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 5000) console.warn('[SLOW]', req.method, req.path, duration + 'ms');
  });
  next();
});

/* ============================================================
   Helpers
   ============================================================ */
function sanitize(str, maxLen = 200) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>'"&]/g, '').trim().slice(0, maxLen);
}

function safeInt(val, min, max, def) {
  const n = Number(val);
  if (isNaN(n) || n < min || n > max) return def;
  return Math.floor(n);
}

function cacheRes(maxAge) {
  return (_req, res, next) => { res.setHeader('Cache-Control', 'public, max-age=' + maxAge); next(); };
}

function decodeHotspotId(value) {
  if (typeof value !== 'string') return '';
  try {
    const decoded = decodeURIComponent(value);
    // Record IDs in the local corpus are opaque, URL-safe identifiers.  Keep
    // the allowlist narrow so a detail request can never become a path/SQL
    // traversal primitive.
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,99}$/.test(decoded)) return '';
    return decoded;
  } catch {
    return '';
  }
}

/* ============================================================
   LOCAL HOTSPOT COLLOCATION CORPUS
   ============================================================
   The compatibility app is mounted by both the legacy server and the
   versioned createApp wrapper.  Registering both prefixes here keeps the
   local SQLite corpus usable before/without a PostgreSQL content service.
   The static routes are registered before /:id so `topics` and `stats` can
   never be mistaken for a collocation record ID.
   ============================================================ */
function registerHotspotRoutes(prefix) {
  app.get(prefix, cacheRes(60), (req, res) => {
    try {
      const q = sanitize(req.query.q, 100);
      const theme = sanitize(req.query.theme || req.query.topic, 100);
      const preset = req.query.preset === 'image' ? 'image' : '';
      const limit = safeInt(req.query.limit, 1, 100, 20);
      const offset = safeInt(req.query.offset, 0, 10000, 0);
      const result = listHotspots({ q, theme, limit, offset, preset });
      res.json({
        ok: true,
        // `rows` is the established legacy shape; `data`/`items` are kept as
        // compatibility aliases for the newer hotspot learning view.
        data: result.rows,
        rows: result.rows,
        items: result.items,
        total: result.total,
        limit: result.limit,
        offset: result.offset,
        pagination: { total: result.total, limit: result.limit, offset: result.offset },
      });
    } catch (e) {
      console.error('[Hotspot List Error]', e.message);
      res.status(500).json({ ok: false, error: 'Server error' });
    }
  });

  app.get(`${prefix}/topics`, cacheRes(300), (req, res) => {
    try {
      const preset = req.query.preset === 'image' ? 'image' : '';
      const data = listHotspotTopics({ preset });
      res.json({ ok: true, data, topics: data.map((topic) => topic.theme) });
    } catch (e) {
      console.error('[Hotspot Topics Error]', e.message);
      res.status(500).json({ ok: false, error: 'Server error' });
    }
  });

  app.get(`${prefix}/stats`, cacheRes(300), (_req, res) => {
    try {
      const data = getHotspotStats();
      res.json({ ok: true, data });
    } catch (e) {
      console.error('[Hotspot Stats Error]', e.message);
      res.status(500).json({ ok: false, error: 'Server error' });
    }
  });

  app.get(`${prefix}/:id`, cacheRes(300), (req, res) => {
    try {
      const id = decodeHotspotId(req.params.id);
      if (!id) return res.status(400).json({ ok: false, error: 'Invalid hotspot id' });
      const data = getHotspotById(id);
      if (!data) return res.status(404).json({ ok: false, error: 'Not found' });
      return res.json({ ok: true, data });
    } catch (e) {
      console.error('[Hotspot Detail Error]', req.params.id, e.message);
      return res.status(500).json({ ok: false, error: 'Server error' });
    }
  });
}

registerHotspotRoutes('/api/hotspots');
registerHotspotRoutes('/api/v1/hotspots');

/* ============================================================
   API ROUTES
   ============================================================ */
app.get('/api/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

app.get('/api/security/stats', (req, res) => {
  const ip = getIp(req);
  if (ip !== '127.0.0.1') return res.status(403).json({ ok: false });
  res.json({ ok: true, data: getSecurityStats() });
});

// ---- Idioms ----
app.get('/api/idioms', cacheRes(60), (req, res) => {
  try {
    const q = sanitize(req.query.q, 50);
    const limit = safeInt(req.query.limit, 1, 100, 20);
    const offset = safeInt(req.query.offset, 0, 10000, 0);
    res.json({ ok: true, ...searchIdioms(q, limit, offset, String(req.query.category || ''), String(req.query.frequency || '')) });
  } catch (e) { res.status(500).json({ ok: false, error: 'Server error' }); }
});

app.get('/api/idioms/categories', cacheRes(300), (_req, res) => {
  try { res.json({ ok: true, data: getIdiomCategories() }); }
  catch (e) { res.status(500).json({ ok: false, error: 'Server error' }); }
});

app.get('/api/idioms/random', cacheRes(120), (req, res) => {
  try { res.json({ ok: true, data: getRandomExamIdioms(safeInt(req.query.count, 1, 50, 10)) }); }
  catch (e) { res.status(500).json({ ok: false, error: 'Server error' }); }
});

app.get('/api/idioms/:word/similar', (req, res) => {
  try {
    const word = sanitize(decodeURIComponent(req.params.word), 20);
    res.json({ ok: true, data: getSimilarIdioms(word, safeInt(req.query.count, 1, 20, 6)) });
  } catch (e) { res.status(500).json({ ok: false, error: 'Server error' }); }
});

app.get('/api/idioms/:word', (req, res) => {
  try {
    const word = sanitize(decodeURIComponent(req.params.word), 20);
    if (!word) return res.status(400).json({ ok: false, error: 'Invalid word' });
    let row = getIdiomByWord(word);
    if (!row) {
      res.json({ ok: false, error: 'Not found', _aiPending: true });
      generateAndCache(word).catch(() => {});
      return;
    }
    res.json({ ok: true, data: row });
    enhanceInBackground(row).catch(() => {});
  } catch (e) { res.status(500).json({ ok: false, error: 'Server error' }); }
});

/* AI Enhancement */
const _idiomEnhanceQueue = new Set();
const MAX_CONCURRENT_AI = 3;
let _currentAI = 0;

async function enhanceInBackground(row) {
  const word = row.idiom;
  if (_idiomEnhanceQueue.has(word) || _currentAI >= MAX_CONCURRENT_AI) return;
  const hasModern = row.modern_example && row.modern_example.length > 10;
  const hasSynonyms = row.synonyms && row.synonyms.length > 0;
  const hasAntonyms = row.antonyms && row.antonyms.length > 0;
  const hasPinyin = row.pinyin && row.pinyin.length > 2;
  if (hasModern && hasSynonyms && hasAntonyms && hasPinyin) return;
  if (!process.env.ZHIPU_API_KEY) return;
  _idiomEnhanceQueue.add(word);
  _currentAI++;
  try {
    const aiData = await aiExplainIdiom(word);
    if (!hasModern && aiData.context_example) db.prepare('UPDATE idioms SET modern_example = ? WHERE idiom = ?').run(aiData.context_example, word);
    if (!hasSynonyms && aiData.similar_idioms?.length > 0) db.prepare('UPDATE idioms SET synonyms = ? WHERE idiom = ?').run(JSON.stringify(aiData.similar_idioms), word);
    if (!hasAntonyms && aiData.antonyms?.length > 0) db.prepare('UPDATE idioms SET antonyms = ? WHERE idiom = ?').run(JSON.stringify(aiData.antonyms), word);
    if (!hasPinyin && aiData.pinyin) db.prepare('UPDATE idioms SET pinyin = ? WHERE idiom = ?').run(aiData.pinyin, word);
    console.log('[AI] Enhanced:', word);
  } catch (e) { console.error('[AI Error]', word, e.message); }
  finally { _idiomEnhanceQueue.delete(word); _currentAI--; }
}

async function generateAndCache(word) {
  if (!process.env.ZHIPU_API_KEY || _currentAI >= MAX_CONCURRENT_AI) return;
  _currentAI++;
  try {
    const aiData = await aiExplainIdiom(word);
    db.prepare('INSERT OR IGNORE INTO idioms (idiom, pinyin, explanation, source_book, context, modern_example, exam_trap, synonyms, category, frequency, sentiment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      word, aiData.pinyin || '', aiData.explanation || '', aiData.source || '', '', aiData.context_example || '', aiData.exam_trap || '', (aiData.similar_idioms || []).join(','), 'AI', 'medium', 'neutral'
    );
    console.log('[AI] Generated:', word);
  } catch (e) { console.error('[AI Gen Error]', word, e.message); }
  finally { _currentAI--; }
}

/* Words API */
app.get('/api/words', cacheRes(60), (req, res) => {
  try {
    res.json({ ok: true, ...searchWords(sanitize(req.query.q, 50), safeInt(req.query.limit, 1, 100, 20), safeInt(req.query.offset, 0, 10000, 0)) });
  } catch (e) { res.status(500).json({ ok: false, error: 'Server error' }); }
});

app.get('/api/words/categories', cacheRes(300), (_req, res) => {
  try { res.json({ ok: true, data: getWordCategories() }); }
  catch (e) { res.status(500).json({ ok: false, error: 'Server error' }); }
});

app.get('/api/words/:word/similar', (req, res) => {
  try { res.json({ ok: true, data: getSimilarWords(sanitize(decodeURIComponent(req.params.word), 20), safeInt(req.query.count, 1, 20, 6)) }); }
  catch (e) { res.status(500).json({ ok: false, error: 'Server error' }); }
});

app.get('/api/words/:word', (req, res) => {
  try {
    const word = sanitize(decodeURIComponent(req.params.word), 20);
    if (!word) return res.status(400).json({ ok: false, error: 'Invalid word' });
    let row = getWordByTitle(word);
    if (!row) {
      res.json({ ok: false, error: 'Not found', _aiPending: true });
      generateWordAI(word).catch(() => {});
      return;
    }
    res.json({ ok: true, data: row });
    enhanceWordInBackground(row).catch(() => {});
  } catch (e) { res.status(500).json({ ok: false, error: 'Server error' }); }
});

const _wordEnhanceQueue = new Set();
async function enhanceWordInBackground(row) {
  const word = row.word;
  if (_wordEnhanceQueue.has(word) || _currentAI >= MAX_CONCURRENT_AI) return;
  const hasModern = row.modern_example && row.modern_example.length > 10;
  const hasExamples = row.examples && row.examples.length > 10;
  const hasSynonyms = row.synonyms && row.synonyms.length > 0;
  const hasAntonyms = row.antonyms && row.antonyms.length > 0;
  const hasPinyin = row.pinyin && row.pinyin.length > 2;
  if (hasModern && hasExamples && hasSynonyms && hasAntonyms && hasPinyin) return;
  if (!process.env.ZHIPU_API_KEY) return;
  _wordEnhanceQueue.add(word);
  _currentAI++;
  try {
    const aiData = await aiExplainWord(word);
    const updates = [];
    if (!hasModern && aiData.context_example) updates.push(['modern_example', aiData.context_example]);
    if (!hasExamples && aiData.context_example) updates.push(['examples', aiData.context_example]);
    if (!hasSynonyms && aiData.synonyms?.length > 0) updates.push(['synonyms', aiData.synonyms.join(',')]);
    if (!hasAntonyms && aiData.antonyms?.length > 0) updates.push(['antonyms', aiData.antonyms.join(',')]);
    if (!hasPinyin && aiData.pinyin) updates.push(['pinyin', aiData.pinyin]);
    if (aiData.explanation && (!row.explanation || row.explanation.length < 10)) updates.push(['explanation', aiData.explanation]);
    for (const [col, val] of updates) db.prepare('UPDATE words SET ' + col + ' = ? WHERE word = ?').run(val, word);
    console.log('[AI] Updated word:', word);
  } catch (e) { console.error('[AI Word Error]', word, e.message); }
  finally { _wordEnhanceQueue.delete(word); _currentAI--; }
}

async function generateWordAI(word) {
  if (!process.env.ZHIPU_API_KEY || _currentAI >= MAX_CONCURRENT_AI) return;
  _currentAI++;
  try {
    const aiData = await aiExplainWord(word);
    db.prepare('INSERT OR IGNORE INTO words (word, word_type, explanation, pinyin, synonyms, antonyms, category, source, modern_example, examples) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
      word, 'word', aiData.explanation || '', aiData.pinyin || '', (aiData.synonyms || []).join(','), (aiData.antonyms || []).join(','), 'AI', 'zhipu', aiData.context_example || '', aiData.context_example || ''
    );
    console.log('[AI] Generated word:', word);
  } catch (e) { console.error('[AI Word Gen Error]', word, e.message); }
  finally { _currentAI--; }
}

/* Generate */
const _generating = new Set();
app.post('/api/generate', async (req, res) => {
  try {
    const word = sanitize(req.body?.word, 20);
    const type = req.body?.type === 'word' ? 'word' : 'idiom';
    if (!word) return res.status(400).json({ ok: false, error: 'No word' });
    const key = type + ':' + word;
    if (_generating.has(key)) return res.json({ ok: true, _aiPending: true });
    _generating.add(key);
    res.json({ ok: true, _aiPending: true });
    (async () => {
      try { type === 'word' ? await generateWordAI(word) : await generateAndCache(word); }
      catch (e) { console.error('[Gen Error]', word, e.message); }
      finally { _generating.delete(key); }
    })();
  } catch (e) { res.status(500).json({ ok: false, error: 'Server error' }); }
});

/* Exam */
app.get('/api/exam-papers', (_req, res) => {
  try { res.json({ ok: true, data: getExamPapers() }); }
  catch (e) { res.status(500).json({ ok: false, error: 'Server error' }); }
});

app.get('/api/exam-papers/:word', (req, res) => {
  try { res.json({ ok: true, data: getExamQuestions(sanitize(req.params.word, 20)) }); }
  catch (e) { res.status(500).json({ ok: false, error: 'Server error' }); }
});

app.get('/api/quiz/questions', (req, res) => {
  try {
    const mod = req.query.module === 'context' ? 'context' : 'idiom';
    const limit = safeInt(req.query.limit, 1, 100, 30);
    let rows = mod === 'idiom'
      ? db.prepare("SELECT id, idiom, pinyin, explanation, exam_trap, category, exam_category, knowledge_points FROM idioms WHERE exam_trap IS NOT NULL AND exam_trap != '' AND idiom != '' ORDER BY RANDOM() LIMIT ?").all(limit)
      : db.prepare("SELECT id, idiom, pinyin, explanation, context, exam_trap, category FROM idioms WHERE context IS NOT NULL AND context != '' AND idiom != '' AND exam_trap IS NOT NULL AND exam_trap != '' ORDER BY RANDOM() LIMIT ?").all(limit);
    const paperRows = db.prepare('SELECT id, title, question_type, question_text, options, answer, answer_explanation, related_idioms, difficulty FROM exam_papers ORDER BY RANDOM() LIMIT ?').all(Math.min(limit, 20));
    res.json({ ok: true, data: { idiomQuestions: rows, paperQuestions: paperRows } });
  } catch (e) { res.status(500).json({ ok: false, error: 'Server error' }); }
});

/* AI Chat */
app.post('/api/ai/chat', async (req, res) => {
  try {
    const message = sanitize(req.body?.message, 1000);
    if (!message) return res.status(400).json({ ok: false, error: 'No message' });
    const history = Array.isArray(req.body?.history) ? req.body.history.slice(-10).map(h => ({
      role: h.role === 'assistant' ? 'assistant' : 'user',
      content: sanitize(h.content, 500),
    })) : [];
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
    await aiChatStream(message, history, res);
  } catch (e) {
    if (!res.headersSent) res.status(500).json({ ok: false, error: 'AI unavailable' });
    else { try { res.write('data: ' + JSON.stringify({ error: 'AI error' }) + '\n\n'); res.end(); } catch {} }
  }
});

/* Media Source Search - Official media articles from database */
  app.get('/api/idioms/:word/media-source', (req, res) => {
    try {
      const word = decodeURIComponent(req.params.word);
      if (!word) return res.status(400).json({ ok: false, error: 'Invalid word' });
      // Only reviewed, paragraph-backed records are exposed. Legacy
      // media_sources rows are search-page candidates and must never be
      // returned as official media evidence.
      const rows = getOfficialMediaOccurrences(word).map((item) => ({
        ...item,
        source_site: item.organization,
        article_title: item.articleTitle,
        article_excerpt: item.paragraph,
        article_url: item.officialUrl,
      }));
      res.json({ ok: true, data: { articles: rows } });
    } catch (e) {
      console.error('[MediaSource Error]', req.params.word, e.message);
      res.json({ ok: true, data: { articles: [] } });
    }
  });

  app.post('/api/idioms/:word/media-source', (req, res) => {
    try {
      const word = decodeURIComponent(req.params.word);
      const { source_site, article_title, article_excerpt, article_url } = req.body;
      if (!word || !source_site || !article_title || !article_excerpt || !article_url) {
        return res.status(400).json({ ok: false, error: 'Missing required fields' });
      }
      const stmt = db.prepare('INSERT INTO media_sources (idiom, source_site, article_title, article_excerpt, article_url) VALUES (?, ?, ?, ?, ?)');
      const info = stmt.run(word, source_site, article_title, article_excerpt, article_url);
      res.json({ ok: true, id: info.lastInsertRowid });
    } catch (e) {
      console.error('[MediaSource Insert Error]', req.params.word, e.message);
      res.json({ ok: false, error: 'Insert failed' });
    }
  });

  /* Bulk insert media sources */
  app.post('/api/media-sources/bulk', (req, res) => {
    try {
      const { sources } = req.body;
      if (!Array.isArray(sources) || sources.length === 0) {
        return res.status(400).json({ ok: false, error: 'No sources provided' });
      }
      const stmt = db.prepare('INSERT INTO media_sources (idiom, source_site, article_title, article_excerpt, article_url) VALUES (?, ?, ?, ?, ?)');
      const insertMany = db.transaction((items) => {
        let count = 0;
        for (const item of items) {
          if (item.idiom && item.source_site && item.article_title && item.article_excerpt && item.article_url) {
            stmt.run(item.idiom, item.source_site, item.article_title, item.article_excerpt, item.article_url);
            count++;
          }
        }
        return count;
      });
      const inserted = insertMany(sources);
      res.json({ ok: true, inserted });
    } catch (e) {
      console.error('[BulkInsert Error]', e.message);
      res.json({ ok: false, error: 'Bulk insert failed' });
    }
  });
/* Error Handlers */
app.use((err, _req, res, _next) => { console.error('Unhandled:', err.message); res.status(500).json({ ok: false, error: 'Server error' }); });
app.use((_req, res) => { res.status(404).json({ ok: false, error: 'Not found' }); });

export function startLegacyServer(port = safeInt(process.env.PORT, 1, 65535, 3000)) {
  return app.listen(port, '0.0.0.0', () => {
    console.log('Backend listening on http://0.0.0.0:' + port);
    console.log('Security: Helmet + CORS + RateLimit + AntiBot + InputValidation + Honeypot');
    console.log('Time:', new Date().toISOString());
  });
}

const isDirectRun = process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) startLegacyServer();

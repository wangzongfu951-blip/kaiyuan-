import crypto from 'node:crypto';

/* ============================================================
   Security Middleware Stack for 昭途考公智学平台
   ============================================================ */

// ---- Whitelist: localhost and local network ----
function isWhitelisted(ip) {
  return ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(ip) ||
    /^192\.168\.\d+\.\d+$/.test(ip) ||
    /^10\.\d+\.\d+\.\d+$/.test(ip) ||
    /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(ip);
}

// ---- 1. Bot / Crawler Detection ----
const BOT_PATTERNS = [
  /bot/i, /crawl/i, /spider/i, /slurp/i, /mediapartners/i,
  /Googlebot/i, /Baiduspider/i, /bingbot/i, /YandexBot/i,
  /Sogou/i, /exabot/i, /facebot/i, /ia_archiver/i,
  /SemrushBot/i, /AhrefsBot/i, /MJ12bot/i, /DotBot/i,
  /BLEXBot/i, /SEOkicks/i, /Bytespider/i, /GPTBot/i,
  /CCBot/i, /ClaudeBot/i, /anthropic/i, /ChatGPT/i,
  /cohere/i, /DataForSeoBot/i, /FacebookBot/i,
  /Applebot/i, /Amazonbot/i, /PetalBot/i,
];

const BAD_UA_PATTERNS = [
  /^$/, /^-\s*$/, /python-requests/i, /python-urllib/i,
  /Go-http-client/i, /Java\//i, /Apache-HttpClient/i,
  /scrapy/i, /httpx/i, /axios\/[\d.]+$/i, /node-fetch/i,
  /PostmanRuntime/i, /insomnia/i, /HttpClient/i,
];

const MALICIOUS_PATHS = [
  /\.\./, /\/etc\/passwd/i, /\/proc\//i,
  /wp-admin/i, /wp-login/i, /xmlrpc/i,
  /\.env/i, /\.git/i, /\.svn/i,
  /phpmyadmin/i, /admin\.php/i, /config\.php/i,
  /shell\.php/i, /UNION\s+SELECT/i, /SELECT\s.*FROM/i,
  /<script/i, /javascript:/i, /onerror=/i,
];

// ---- 2. IP Tracker ----
class IPTracker {
  constructor() {
    this.requests = new Map();
    this.suspicious = new Map();
    this.MAX_REQUESTS_PER_MINUTE = 120;
    this.MAX_REQUESTS_PER_SECOND = 15;
    this.BLOCK_DURATION_MS = 10 * 60_000;
    this.SUSPICIOUS_THRESHOLD = 10;
    setInterval(() => this.cleanup(), 60000);
  }

  cleanup() {
    const now = Date.now();
    for (const [ip, data] of this.requests) {
      if (now - data.firstSeen > 120000) this.requests.delete(ip);
    }
    for (const [ip, data] of this.suspicious) {
      if (now - data.lastSeen > 600000) this.suspicious.delete(ip);
    }
  }

  check(ip) {
    const now = Date.now();
    let entry = this.requests.get(ip);
    if (entry?.blocked && now < entry.blockExpiry) {
      return { allowed: false, reason: 'IP blocked', retryAfter: Math.ceil((entry.blockExpiry - now) / 1000) };
    }
    if (entry?.blocked && now >= entry.blockExpiry) {
      entry.blocked = false;
      entry.count = 0;
      entry.firstSeen = now;
    }
    if (!entry) {
      entry = { count: 1, firstSeen: now, blocked: false, blockExpiry: 0, perSecond: [{ t: now }] };
      this.requests.set(ip, entry);
      return { allowed: true };
    }
    entry.count++;
    if (!entry.perSecond) entry.perSecond = [];
    entry.perSecond = entry.perSecond.filter(r => now - r.t < 1000);
    entry.perSecond.push({ t: now });
    if (entry.perSecond.length > this.MAX_REQUESTS_PER_SECOND) {
      this.addSuspicion(ip, 3, 'rate_per_second');
      return { allowed: false, reason: 'Too many requests per second' };
    }
    const elapsed = now - entry.firstSeen;
    if (elapsed < 60000 && entry.count > this.MAX_REQUESTS_PER_MINUTE) {
      this.addSuspicion(ip, 5, 'rate_per_minute');
      return { allowed: false, reason: 'Rate limit exceeded' };
    }
    if (elapsed >= 60000) {
      entry.count = 1;
      entry.firstSeen = now;
    }
    return { allowed: true };
  }

  addSuspicion(ip, score, reason) {
    let s = this.suspicious.get(ip) || { score: 0, reasons: [], lastSeen: Date.now() };
    s.score += score;
    s.reasons.push(reason + ' @ ' + new Date().toISOString());
    if (s.reasons.length > 20) s.reasons = s.reasons.slice(-20);
    s.lastSeen = Date.now();
    this.suspicious.set(ip, s);
    if (s.score >= this.SUSPICIOUS_THRESHOLD) {
      const entry = this.requests.get(ip) || { count: 0, firstSeen: Date.now() };
      entry.blocked = true;
      entry.blockExpiry = Date.now() + this.BLOCK_DURATION_MS;
      this.requests.set(ip, entry);
      console.warn('[SECURITY] IP BLOCKED:', ip, 'score:', s.score);
    }
  }

  getStats() {
    let blocked = 0;
    for (const [, v] of this.requests) if (v.blocked) blocked++;
    return { trackedIPs: this.requests.size, suspiciousIPs: this.suspicious.size, blockedIPs: blocked };
  }
}

const tracker = new IPTracker();

// ---- 3. Anti-Scraping ----
const requestFingerprints = new Map();

function detectScraping(ip, req) {
  const ua = req.headers['user-agent'] || '';
  const accept = req.headers['accept'] || '';
  let score = 0;

  if (!ua || BAD_UA_PATTERNS.some(p => p.test(ua))) score += 5;
  if (BOT_PATTERNS.some(p => p.test(ua))) score += 8;
  if (!accept.includes('text/html') && !accept.includes('application/json')) score += 2;
  if (!req.headers['accept-language']) score += 2;
  if (!req.headers['accept-encoding']) score += 2;

  let fp = requestFingerprints.get(ip);
  if (!fp) { fp = { paths: [], lastReset: Date.now() }; requestFingerprints.set(ip, fp); }
  fp.paths.push({ path: req.path, t: Date.now() });
  if (fp.paths.length > 50) fp.paths = fp.paths.slice(-50);
  const recentPaths = fp.paths.filter(p => Date.now() - p.t < 30000);
  const uniquePaths = new Set(recentPaths.map(p => p.path));
  if (recentPaths.length > 10 && uniquePaths.size / recentPaths.length > 0.8) score += 4;

  if (score > 0) tracker.addSuspicion(ip, score, 'scraping_detected');
  return score;
}

// ---- 4. Request Validation ----
function validateRequest(req) {
  const issues = [];
  const fullPath = req.originalUrl || req.url;
  for (const pattern of MALICIOUS_PATHS) {
    if (pattern.test(fullPath)) issues.push('malicious_path');
  }
  for (const [key, val] of Object.entries(req.query)) {
    if (typeof val === 'string') {
      if (/<script/i.test(val) || /javascript:/i.test(val)) issues.push('xss:' + key);
      if (/UNION\s+SELECT/i.test(val) || /OR\s+1\s*=\s*1/i.test(val)) issues.push('sqli:' + key);
      if (val.length > 500) issues.push('oversized:' + key);
    }
  }
  if (req.body && typeof req.body === 'object') {
    const bodyStr = JSON.stringify(req.body);
    if (bodyStr.length > 10000) issues.push('oversized_body');
    if (/<script/i.test(bodyStr)) issues.push('xss_body');
  }
  return issues;
}

// ---- 5. Honeypot ----
const HONEYPOT_PATHS = [
  '/admin', '/login', '/wp-admin', '/wp-login.php',
  '/.env', '/config', '/phpmyadmin', '/api/admin',
  '/api/v1/admin', '/debug', '/test', '/.git/config',
];

// ---- 6. Anti-Replay ----
const seenNonces = new Map();
function verifyRequestSignature(req) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return true;
  const ts = req.headers['x-req-timestamp'];
  const nonce = req.headers['x-req-nonce'];
  if (!ts || !nonce) return true;
  const now = Date.now();
  if (Math.abs(now - Number(ts)) > 30000) return false;
  if (seenNonces.has(nonce)) return false;
  seenNonces.set(nonce, now);
  if (seenNonces.size > 10000) {
    for (const [n, t] of seenNonces) { if (now - t > 60000) seenNonces.delete(n); }
  }
  return true;
}

// ---- 7. Main Middleware ----
export function securityMiddleware(req, res, next) {
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  const whitelisted = isWhitelisted(ip);

  // Honeypot (even whitelisted gets 404)
  if (HONEYPOT_PATHS.includes(req.path)) {
    if (!whitelisted) tracker.addSuspicion(ip, 10, 'honeypot_hit');
    return res.status(404).json({ ok: false, error: 'Not found' });
  }

  // Rate limit (skip for whitelisted)
  if (!whitelisted) {
    const rateCheck = tracker.check(ip);
    if (!rateCheck.allowed) {
      res.setHeader('Retry-After', rateCheck.retryAfter || 60);
      return res.status(429).json({ ok: false, error: 'Too many requests', retryAfter: rateCheck.retryAfter || 60 });
    }
    detectScraping(ip, req);
  }

  // Validation (apply to all but don't block whitelisted)
  const issues = validateRequest(req);
  if (issues.length > 0) {
    if (!whitelisted) {
      tracker.addSuspicion(ip, issues.length * 2, 'validation_fail');
      return res.status(400).json({ ok: false, error: 'Invalid request' });
    }
  }

  // Anti-replay (skip for whitelisted)
  if (!whitelisted && !verifyRequestSignature(req)) {
    tracker.addSuspicion(ip, 3, 'replay_attack');
    return res.status(400).json({ ok: false, error: 'Invalid request' });
  }

  // Security headers (always apply)
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  next();
}

// ---- 8. Stats ----
export function getSecurityStats() {
  return { tracker: tracker.getStats(), honeypotPaths: HONEYPOT_PATHS.length, uptime: process.uptime() };
}

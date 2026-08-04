# Platform Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the secure modular backend, PostgreSQL/Redis infrastructure, phone and WeChat identity model, cross-device event transport, and the first mobile login experience that every later lexicon and learning feature will use.

**Architecture:** Keep Vue 3 and Express, but construct the Express app from focused routers and services. PostgreSQL is the source of truth, Redis stores short-lived OTP/OAuth state, and opaque hashed session tokens live in secure cookies. Provider interfaces allow deterministic local tests while production adapters use configured SMS and WeChat credentials.

**Tech Stack:** Vue 3.5, TypeScript 5.8, Vite 6, Express 4, Node.js 24, PostgreSQL 16, Redis 7, `pg`, `redis`, `cookie-parser`, Node built-in test runner.

## Global Constraints

- All user-visible copy is natural Chinese.
- The public lexicon remains readable without login; learning and cross-device sync require login.
- Mobile is primary; tablet layouts must not be a stretched phone canvas.
- Never store plaintext OTPs, session tokens, provider secrets, or full phone numbers in logs.
- AI output cannot enter published content without manual review.
- Existing `backend/data/idioms.db` is read-only migration input, not the multi-user production database.
- All public endpoints use the `/api/v1` prefix.
- Frontend API calls use same-origin `/api/v1`; no hard-coded host or port.

---

## Planned File Structure

### Backend

- `backend/src/app.js`: constructs the Express application without starting a port.
- `backend/src/server.js`: starts the HTTP server and closes dependencies on shutdown.
- `backend/src/config.js`: validates and exposes environment configuration.
- `backend/src/http/errors.js`: typed HTTP errors and the final JSON error handler.
- `backend/src/http/cookies.js`: cookie parsing and session cookie options.
- `backend/src/infrastructure/postgres.js`: PostgreSQL pool and transaction helper.
- `backend/src/infrastructure/redis.js`: Redis client and lifecycle.
- `backend/src/infrastructure/migrate.js`: applies ordered SQL migrations.
- `backend/migrations/001_identity.sql`: users, identities, sessions, devices, sync events.
- `backend/src/auth/token.js`: random token creation and one-way hashing.
- `backend/src/auth/phone.js`: phone normalization and masking.
- `backend/src/auth/otp-store.js`: OTP generation, hashing, verification, and throttling.
- `backend/src/auth/sms-provider.js`: development and production SMS provider interface.
- `backend/src/auth/wechat-provider.js`: WeChat authorization URL, code exchange, and profile lookup.
- `backend/src/auth/auth-repository.js`: PostgreSQL identity/session persistence.
- `backend/src/auth/auth-service.js`: phone/WeChat login and account binding use cases.
- `backend/src/auth/auth-router.js`: `/api/v1/auth/*` endpoints.
- `backend/src/sync/sync-repository.js`: idempotent client event storage.
- `backend/src/sync/sync-router.js`: `/api/v1/sync/events` endpoint.
- `backend/test/*.test.js`: deterministic unit and HTTP tests.

### Frontend

- `src/services/http.ts`: same-origin JSON client and credentials handling.
- `src/services/auth.ts`: auth endpoint types and calls.
- `src/stores/auth.ts`: reactive session state.
- `src/views/auth/LoginView.vue`: phone and WeChat login.
- `src/views/auth/WeChatCallbackView.vue`: OAuth callback completion.
- `src/components/auth/PhoneLoginPanel.vue`: OTP request and verification form.
- `src/components/auth/WeChatLoginPanel.vue`: WeChat launch and status UI.
- `src/router/index.ts`: login routes and protected-route guard.
- `src/api.ts`: compatibility wrapper routed through the new HTTP client.

---

### Task 1: Repository Safety and Configuration

**Files:**
- Create: `.gitignore`
- Create: `backend/.env.example`
- Modify: `HANDOFF.md`
- Modify: `backend/package.json`

**Interfaces:**
- Consumes: existing Vite and Express projects.
- Produces: safe repository boundaries and explicit runtime dependency declarations.

- [ ] **Step 1: Add a failing secret-scan test**

Create `backend/test/repository-safety.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('handoff does not contain a live-looking API key', () => {
  const handoff = fs.readFileSync(new URL('../../HANDOFF.md', import.meta.url), 'utf8');
  assert.doesNotMatch(handoff, /\b[0-9a-f]{32}\.[A-Za-z0-9_-]{8,}\b/);
});

test('runtime secrets are ignored by git', () => {
  const ignore = fs.readFileSync(new URL('../../.gitignore', import.meta.url), 'utf8');
  assert.match(ignore, /^backend\/\.env$/m);
  assert.match(ignore, /^\.superpowers\/$/m);
});
```

- [ ] **Step 2: Run the test and verify failure**

Run: `node --test backend/test/repository-safety.test.js`

Expected: FAIL because `.gitignore` is missing and `HANDOFF.md` contains a live-looking key.

- [ ] **Step 3: Add repository safety files**

Create `.gitignore`:

```gitignore
node_modules/
backend/node_modules/
dist/
coverage/
.superpowers/
backend/.env
*.log
chrome-profile*/
temp-pw/
screenshots/
pdf_pages/
backend/data/*.db-wal
backend/data/*.db-shm
```

Create `backend/.env.example`:

```dotenv
NODE_ENV=development
PORT=3000
APP_ORIGIN=http://localhost:5173
DATABASE_URL=postgres://zhaotu:zhaotu@127.0.0.1:5432/zhaotu
REDIS_URL=redis://127.0.0.1:6379
SESSION_COOKIE_NAME=zt_session
SESSION_TTL_DAYS=30
OTP_HMAC_SECRET=replace-with-at-least-32-random-characters
SMS_PROVIDER=development
SMS_SIGN_NAME=
SMS_TEMPLATE_CODE=
WECHAT_APP_ID=
WECHAT_APP_SECRET=
WECHAT_REDIRECT_URI=http://localhost:5173/auth/wechat/callback
ZHIPU_API_KEY=
ZHIPU_BASE_URL=https://open.bigmodel.cn/api/paas/v4
```

Rewrite the secret section of `HANDOFF.md` to:

```markdown
## 外部服务配置

智谱、短信和微信密钥不得写入文档或仓库。复制 `backend/.env.example` 为
`backend/.env`，再通过本地安全渠道填写。历史智谱密钥已暴露，必须在服务商控制台撤销。
```

Add backend scripts and dependencies:

```json
{
  "scripts": {
    "dev": "node --watch src/server.js",
    "start": "node src/server.js",
    "test": "node --test test/*.test.js",
    "migrate": "node src/infrastructure/migrate.js"
  },
  "dependencies": {
    "cookie-parser": "^1.4.7",
    "pg": "^8.16.3",
    "redis": "^5.8.2"
  }
}
```

- [ ] **Step 4: Install declared dependencies and rerun the test**

Run: `npm.cmd install --prefix backend`

Expected: exit 0 and updated `backend/package-lock.json`.

Run: `node --test backend/test/repository-safety.test.js`

Expected: 2 tests PASS.

- [ ] **Step 5: Initialize version control and commit**

Run:

```powershell
git init
git add .gitignore HANDOFF.md backend/.env.example backend/package.json backend/package-lock.json backend/test/repository-safety.test.js docs/superpowers
git commit -m "chore: secure configuration and document architecture"
```

Expected: a root commit without `backend/.env`, databases, generated screenshots, or `node_modules`.

### Task 2: Modular Express App and Validated Configuration

**Files:**
- Create: `backend/src/config.js`
- Create: `backend/src/http/errors.js`
- Create: `backend/src/app.js`
- Create: `backend/src/server.js`
- Test: `backend/test/config.test.js`
- Test: `backend/test/health.test.js`
- Modify: `backend/src/index.js`

**Interfaces:**
- Consumes: `loadConfig(env: NodeJS.ProcessEnv)`.
- Produces: `createApp(deps) -> Express.Application`, `startServer() -> Promise<http.Server>`.

- [ ] **Step 1: Write failing configuration and health tests**

Create `backend/test/config.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config.js';

test('loadConfig rejects a short OTP secret', () => {
  assert.throws(
    () => loadConfig({ NODE_ENV: 'test', OTP_HMAC_SECRET: 'short' }),
    /OTP_HMAC_SECRET/
  );
});

test('loadConfig supplies safe local defaults in test', () => {
  const config = loadConfig({
    NODE_ENV: 'test',
    OTP_HMAC_SECRET: '12345678901234567890123456789012',
  });
  assert.equal(config.port, 3000);
  assert.equal(config.cookieName, 'zt_session');
});
```

Create `backend/test/health.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';

test('GET /api/v1/health returns a versioned health response', async () => {
  const app = createApp({ now: () => new Date('2026-07-24T00:00:00.000Z') });
  const server = app.listen(0);
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/api/v1/health`);
  const body = await response.json();
  server.close();
  assert.equal(response.status, 200);
  assert.deepEqual(body, { ok: true, version: 'v1', time: '2026-07-24T00:00:00.000Z' });
});
```

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test backend/test/config.test.js backend/test/health.test.js`

Expected: FAIL with missing `config.js` and `app.js`.

- [ ] **Step 3: Implement configuration and app factory**

Create `backend/src/config.js` exporting:

```js
export function loadConfig(env = process.env) {
  const isTest = env.NODE_ENV === 'test';
  const otpSecret = env.OTP_HMAC_SECRET || '';
  if (otpSecret.length < 32) throw new Error('OTP_HMAC_SECRET must contain at least 32 characters');
  return Object.freeze({
    nodeEnv: env.NODE_ENV || 'development',
    port: Number(env.PORT || 3000),
    appOrigin: env.APP_ORIGIN || 'http://localhost:5173',
    databaseUrl: env.DATABASE_URL || (isTest ? '' : undefined),
    redisUrl: env.REDIS_URL || (isTest ? '' : undefined),
    cookieName: env.SESSION_COOKIE_NAME || 'zt_session',
    sessionTtlDays: Number(env.SESSION_TTL_DAYS || 30),
    otpSecret,
    smsProvider: env.SMS_PROVIDER || 'development',
    wechat: {
      appId: env.WECHAT_APP_ID || '',
      appSecret: env.WECHAT_APP_SECRET || '',
      redirectUri: env.WECHAT_REDIRECT_URI || '',
    },
  });
}
```

Create `backend/src/http/errors.js`:

```js
export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function errorHandler(error, _req, res, _next) {
  const status = error instanceof HttpError ? error.status : 500;
  const code = error instanceof HttpError ? error.code : 'INTERNAL_ERROR';
  res.status(status).json({ ok: false, error: { code, message: status === 500 ? '服务暂时不可用' : error.message } });
}
```

Create `backend/src/app.js`:

```js
import express from 'express';
import cookieParser from 'cookie-parser';
import { errorHandler } from './http/errors.js';

export function createApp({ now = () => new Date(), authRouter, syncRouter } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '32kb' }));
  app.use(cookieParser());
  app.get('/api/v1/health', (_req, res) => {
    res.json({ ok: true, version: 'v1', time: now().toISOString() });
  });
  if (authRouter) app.use('/api/v1/auth', authRouter);
  if (syncRouter) app.use('/api/v1/sync', syncRouter);
  app.use(errorHandler);
  return app;
}
```

Create `backend/src/server.js` so it loads `backend/.env`, validates config, creates dependencies, starts `createApp`, and closes PostgreSQL/Redis on `SIGINT` and `SIGTERM`. Replace `backend/src/index.js` with a compatibility re-export that imports `./server.js`.

- [ ] **Step 4: Run tests and syntax checks**

Run: `node --test backend/test/config.test.js backend/test/health.test.js`

Expected: all tests PASS.

Run: `node --check backend/src/app.js && node --check backend/src/server.js`

Expected: exit 0.

- [ ] **Step 5: Commit**

Run:

```powershell
git add backend/src/config.js backend/src/http/errors.js backend/src/app.js backend/src/server.js backend/src/index.js backend/test/config.test.js backend/test/health.test.js
git commit -m "refactor: create modular backend application"
```

### Task 3: PostgreSQL, Redis, and Identity Migration

**Files:**
- Create: `backend/src/infrastructure/postgres.js`
- Create: `backend/src/infrastructure/redis.js`
- Create: `backend/src/infrastructure/migrate.js`
- Create: `backend/migrations/001_identity.sql`
- Test: `backend/test/migration-shape.test.js`

**Interfaces:**
- Produces: `createPostgres(databaseUrl)`, `withTransaction(pool, fn)`, `createRedis(redisUrl)`, `runMigrations(pool, migrationsDir)`.
- Database tables: `users`, `auth_identities`, `auth_sessions`, `user_devices`, `sync_events`.

- [ ] **Step 1: Write a failing migration-shape test**

Create `backend/test/migration-shape.test.js`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('identity migration contains required unique and privacy constraints', () => {
  const sql = fs.readFileSync(new URL('../migrations/001_identity.sql', import.meta.url), 'utf8');
  for (const table of ['users', 'auth_identities', 'auth_sessions', 'user_devices', 'sync_events']) {
    assert.match(sql, new RegExp(`CREATE TABLE ${table}`));
  }
  assert.match(sql, /UNIQUE \(provider, provider_subject\)/);
  assert.match(sql, /UNIQUE \(user_id, client_event_id\)/);
  assert.doesNotMatch(sql, /plaintext_token|plaintext_otp/);
});
```

- [ ] **Step 2: Run test and verify failure**

Run: `node --test backend/test/migration-shape.test.js`

Expected: FAIL because the migration does not exist.

- [ ] **Step 3: Implement migration and infrastructure**

Create `backend/migrations/001_identity.sql` with:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name text NOT NULL DEFAULT '昭途用户',
  avatar_url text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled', 'deleted')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE auth_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('phone', 'wechat')),
  provider_subject text NOT NULL,
  profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  verified_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_subject)
);

CREATE TABLE auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  device_name text,
  expires_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_key text NOT NULL,
  label text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_key)
);

CREATE TABLE sync_events (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_event_id uuid NOT NULL,
  device_key text NOT NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  occurred_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_event_id)
);
```

Implement PostgreSQL and Redis constructors that do not connect at module import time. `runMigrations` stores applied filenames in a `schema_migrations` table and executes each new SQL file in a transaction.

- [ ] **Step 4: Run tests**

Run: `node --test backend/test/migration-shape.test.js`

Expected: PASS.

Run: `node --check backend/src/infrastructure/postgres.js && node --check backend/src/infrastructure/redis.js && node --check backend/src/infrastructure/migrate.js`

Expected: exit 0.

- [ ] **Step 5: Commit**

Run:

```powershell
git add backend/migrations/001_identity.sql backend/src/infrastructure backend/test/migration-shape.test.js
git commit -m "feat: add identity persistence infrastructure"
```

### Task 4: Phone OTP Authentication Domain

**Files:**
- Create: `backend/src/auth/token.js`
- Create: `backend/src/auth/phone.js`
- Create: `backend/src/auth/otp-store.js`
- Create: `backend/src/auth/sms-provider.js`
- Create: `backend/src/auth/auth-repository.js`
- Create: `backend/src/auth/auth-service.js`
- Test: `backend/test/phone-auth.test.js`

**Interfaces:**
- Consumes: Redis commands, PostgreSQL pool, `config.otpSecret`.
- Produces: `normalizeChinaPhone`, `maskPhone`, `OtpStore.request`, `OtpStore.verify`, `AuthService.requestPhoneCode`, `AuthService.loginWithPhone`.

- [ ] **Step 1: Write failing phone auth tests**

Create `backend/test/phone-auth.test.js` covering:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeChinaPhone, maskPhone } from '../src/auth/phone.js';
import { createToken, hashToken } from '../src/auth/token.js';

test('normalizes mainland China phone numbers', () => {
  assert.equal(normalizeChinaPhone('138 0013 8000'), '+8613800138000');
  assert.equal(normalizeChinaPhone('+86-13800138000'), '+8613800138000');
  assert.throws(() => normalizeChinaPhone('12345'), /手机号格式不正确/);
});

test('masks phone numbers and hashes opaque tokens', () => {
  assert.equal(maskPhone('+8613800138000'), '138****8000');
  const token = createToken();
  assert.notEqual(token, hashToken(token));
  assert.equal(hashToken(token), hashToken(token));
});
```

Add fake Redis/repository tests proving OTP expiry, attempt limits, one-time verification, existing-user login, and new-user creation.

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test backend/test/phone-auth.test.js`

Expected: FAIL with missing auth modules.

- [ ] **Step 3: Implement the phone auth domain**

Implement token helpers with `crypto.randomBytes(32).toString('base64url')` and SHA-256. Store only HMAC-SHA256 OTP digests in Redis keys `otp:phone:<normalized>`, with a five-minute TTL, a sixty-second resend interval, five verification attempts, and ten sends per phone per day.

`AuthService.loginWithPhone` must:

1. verify the OTP;
2. find or create the `phone` identity in one PostgreSQL transaction;
3. generate an opaque session token;
4. persist only its SHA-256 hash;
5. return `{ user, sessionToken, expiresAt }`.

The development SMS provider writes only a masked phone and development code to the returned object; production logging must never print the code.

- [ ] **Step 4: Run phone auth tests**

Run: `node --test backend/test/phone-auth.test.js`

Expected: all tests PASS.

- [ ] **Step 5: Commit**

Run:

```powershell
git add backend/src/auth backend/test/phone-auth.test.js
git commit -m "feat: add secure phone authentication domain"
```

### Task 5: WeChat OAuth and Account Binding

**Files:**
- Create: `backend/src/auth/wechat-provider.js`
- Modify: `backend/src/auth/auth-service.js`
- Test: `backend/test/wechat-auth.test.js`

**Interfaces:**
- Produces: `WechatProvider.createAuthorizeUrl(mode, state)`, `WechatProvider.exchangeCode(code)`, `AuthService.loginWithWechat(profile)`, `AuthService.bindIdentity(userId, identity)`.

- [ ] **Step 1: Write failing WeChat tests**

Test that mobile mode builds `https://open.weixin.qq.com/connect/oauth2/authorize`, QR mode builds `https://open.weixin.qq.com/connect/qrconnect`, state is required, provider errors are converted to a safe Chinese error, and binding an already-owned WeChat identity returns a conflict rather than merging silently.

- [ ] **Step 2: Run test and verify failure**

Run: `node --test backend/test/wechat-auth.test.js`

Expected: FAIL with missing `wechat-provider.js`.

- [ ] **Step 3: Implement WeChat provider and binding**

The provider uses injected `fetch` and never exposes `appSecret` in URLs returned to the browser. `exchangeCode` calls the WeChat token endpoint, then the user-info endpoint, and returns:

```js
{
  provider: 'wechat',
  subject: unionid || openid,
  profile: { openid, unionid, nickname, avatarUrl }
}
```

`AuthService.bindIdentity` requires an authenticated user and rejects identities attached to another user with code `IDENTITY_ALREADY_BOUND`.

- [ ] **Step 4: Run tests**

Run: `node --test backend/test/wechat-auth.test.js`

Expected: all tests PASS.

- [ ] **Step 5: Commit**

Run:

```powershell
git add backend/src/auth/wechat-provider.js backend/src/auth/auth-service.js backend/test/wechat-auth.test.js
git commit -m "feat: add WeChat login and identity binding"
```

### Task 6: Versioned Auth HTTP API

**Files:**
- Create: `backend/src/http/cookies.js`
- Create: `backend/src/auth/session-middleware.js`
- Create: `backend/src/auth/auth-router.js`
- Modify: `backend/src/app.js`
- Modify: `backend/src/server.js`
- Test: `backend/test/auth-http.test.js`

**Interfaces:**
- Produces endpoints: `POST /phone/code`, `POST /phone/login`, `GET /wechat/url`, `GET /wechat/callback`, `GET /me`, `POST /logout`, `POST /logout-all`.
- Produces `requireUser(req, res, next)` and `optionalUser(req, res, next)`.

- [ ] **Step 1: Write failing HTTP tests**

Using `createApp` with a fake `AuthService`, test:

- invalid phone returns 400 with Chinese message;
- development OTP request succeeds without returning a live code when `NODE_ENV=production`;
- login sets an `HttpOnly` session cookie;
- `/me` returns 401 without a valid cookie;
- logout clears the cookie.

- [ ] **Step 2: Run tests and verify failure**

Run: `node --test backend/test/auth-http.test.js`

Expected: FAIL because the router is missing.

- [ ] **Step 3: Implement router and middleware**

Use a single session cookie with:

```js
export function sessionCookieOptions(config) {
  return {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: config.sessionTtlDays * 86_400_000,
  };
}
```

All routes validate body length and type before calling services. The callback redirects only to the configured app origin, never to a user-provided URL.

- [ ] **Step 4: Run HTTP tests**

Run: `node --test backend/test/auth-http.test.js`

Expected: all tests PASS.

- [ ] **Step 5: Commit**

Run:

```powershell
git add backend/src/http/cookies.js backend/src/auth/session-middleware.js backend/src/auth/auth-router.js backend/src/app.js backend/src/server.js backend/test/auth-http.test.js
git commit -m "feat: expose versioned authentication API"
```

### Task 7: Idempotent Cross-Device Event Transport

**Files:**
- Create: `backend/src/sync/sync-repository.js`
- Create: `backend/src/sync/sync-service.js`
- Create: `backend/src/sync/sync-router.js`
- Modify: `backend/src/app.js`
- Modify: `backend/src/server.js`
- Test: `backend/test/sync.test.js`

**Interfaces:**
- Consumes authenticated `req.user.id`.
- Produces `POST /api/v1/sync/events` and `GET /api/v1/sync/cursor`.
- Event input: `{ clientEventId, deviceKey, eventType, payload, occurredAt }`.

- [ ] **Step 1: Write failing sync tests**

Test that an unauthenticated upload returns 401, the same `clientEventId` submitted twice is stored once, events from two devices receive a monotonically increasing server cursor, and payloads over 16 KB are rejected.

- [ ] **Step 2: Run test and verify failure**

Run: `node --test backend/test/sync.test.js`

Expected: FAIL with missing sync modules.

- [ ] **Step 3: Implement idempotent event storage**

Use:

```sql
INSERT INTO sync_events (user_id, client_event_id, device_key, event_type, payload, occurred_at)
VALUES ($1, $2, $3, $4, $5::jsonb, $6)
ON CONFLICT (user_id, client_event_id) DO NOTHING
RETURNING id;
```

Return `{ accepted, cursor }` for every event. A duplicate returns its existing cursor. Validate UUID, device-key length, event-type allowlist, JSON size, and occurred-at range.

- [ ] **Step 4: Run sync tests**

Run: `node --test backend/test/sync.test.js`

Expected: all tests PASS.

- [ ] **Step 5: Commit**

Run:

```powershell
git add backend/src/sync backend/src/app.js backend/src/server.js backend/test/sync.test.js
git commit -m "feat: add idempotent cross-device event transport"
```

### Task 8: Frontend Auth Client and Mobile Login

**Files:**
- Create: `src/services/http.ts`
- Create: `src/services/auth.ts`
- Create: `src/stores/auth.ts`
- Create: `src/components/auth/PhoneLoginPanel.vue`
- Create: `src/components/auth/WeChatLoginPanel.vue`
- Create: `src/views/auth/LoginView.vue`
- Create: `src/views/auth/WeChatCallbackView.vue`
- Modify: `src/api.ts`
- Modify: `src/router/index.ts`
- Test: `tests/e2e/auth.spec.ts`

**Interfaces:**
- Produces: `http<T>(path, init)`, `authStore.load`, `authStore.loginWithPhone`, `authStore.logout`.
- Routes: `/login`, `/auth/wechat/callback`.

- [ ] **Step 1: Write a failing Playwright auth test**

Create `tests/e2e/auth.spec.ts` that intercepts `/api/v1/auth/me`, `/phone/code`, and `/phone/login`, visits `/review`, verifies redirect to `/login`, submits phone and OTP, verifies Chinese validation copy, and confirms navigation back to `/review`.

- [ ] **Step 2: Run test and verify failure**

Run: `npx.cmd playwright test tests/e2e/auth.spec.ts`

Expected: FAIL because the login route does not exist.

- [ ] **Step 3: Implement the same-origin client and auth UI**

`src/services/http.ts` must call:

```ts
export async function http<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers },
  })
  const body = await response.json()
  if (!response.ok) throw new Error(body?.error?.message || '请求失败，请稍后重试')
  return body as T
}
```

The login page uses the confirmed blue-purple visual direction, contains only Chinese copy, supports phone and WeChat, uses 44-pixel minimum targets, masks phone display, disables resend during countdown, and preserves the originally requested route.

Add `meta: { requiresAuth: true }` to learning, review, plan, report, favorites, mistakes, and profile routes. The global guard awaits `authStore.load()` once, then redirects guests to `/login?redirect=<encoded path>`.

Update `src/api.ts` to delegate to the same-origin client while preserving its existing exported signatures for untouched pages.

- [ ] **Step 4: Run frontend verification**

Run: `npx.cmd vue-tsc --noEmit`

Expected: exit 0.

Run: `npx.cmd playwright test tests/e2e/auth.spec.ts`

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```powershell
git add src/services src/stores/auth.ts src/components/auth src/views/auth src/api.ts src/router/index.ts tests/e2e/auth.spec.ts
git commit -m "feat: add mobile phone and WeChat login"
```

### Task 9: Foundation Verification and Operations Documentation

**Files:**
- Create: `backend/README.md`
- Create: `docs/operations/account-services.md`
- Modify: `package.json`
- Modify: `backend/package.json`

**Interfaces:**
- Produces repeatable local startup, migration, test, and production credential instructions.

- [ ] **Step 1: Add unified verification scripts**

Set root scripts:

```json
{
  "scripts": {
    "test:types": "vue-tsc --noEmit",
    "test:e2e": "playwright test",
    "test:backend": "npm --prefix backend test",
    "verify": "npm run test:types && npm run test:backend && npm run build"
  }
}
```

- [ ] **Step 2: Document exact local startup**

`backend/README.md` must include:

```powershell
Copy-Item backend/.env.example backend/.env
docker compose up -d postgres redis
npm.cmd install --prefix backend
npm.cmd run migrate --prefix backend
npm.cmd run dev --prefix backend
npm.cmd run dev
```

`docs/operations/account-services.md` must list the exact environment variables, WeChat callback URL, SMS template requirements, cookie/HTTPS requirement, secret rotation procedure, and how to switch from development SMS to the production provider.

- [ ] **Step 3: Run the full verification suite**

Run: `npm.cmd run verify`

Expected: Vue typecheck PASS, backend tests PASS, Vite production build PASS.

- [ ] **Step 4: Run a secret scan**

Run:

```powershell
rg -n --hidden -g '!node_modules/**' -g '!backend/node_modules/**' -g '!.git/**' '\b[0-9a-f]{32}\.[A-Za-z0-9_-]{8,}\b|WECHAT_APP_SECRET=.+|OTP_HMAC_SECRET=.{32,}' .
```

Expected: no live credentials; only blank example values or documentation placeholders.

- [ ] **Step 5: Commit**

Run:

```powershell
git add package.json backend/package.json backend/README.md docs/operations/account-services.md
git commit -m "docs: add foundation verification and operations guide"
```

## Plan Self-Review

- Spec coverage: modular backend, PostgreSQL, Redis, phone, WeChat, secure sessions, account binding, cross-device event transport, mobile login, migration boundary, and external credential requirements are each assigned to a task.
- Placeholders: no implementation step delegates unspecified validation or error handling; exact behaviors and commands are present.
- Type consistency: auth endpoints use `/api/v1/auth`, sync endpoints use `/api/v1/sync`, opaque session tokens are returned only inside the service and written to cookies by the router, and frontend calls same-origin `/api/v1`.
- Deferred by design: lexicon migration, official-media ingestion, memory-state projection, and the full visual redesign belong to their separate approved specifications and will receive separate implementation plans after this foundation passes verification.

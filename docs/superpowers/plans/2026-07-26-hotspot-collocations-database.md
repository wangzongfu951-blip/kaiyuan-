# 时事热点词语搭配库 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建成可持续扩充的考公时事热点词语搭配库，并提供权威原文采集、规范化去重、详细用法整理、人工审核、批量发布和移动端学习页面。

**Architecture:** PostgreSQL 保存规范搭配、主题、来源文档、原文证据、导入批次和审核事件；Node.js 模块负责采集、解析、候选提取、编辑草稿、审核发布和公开查询；Vue 3 提供主题简表、详细学习卡及审核工作台。官媒原文与编辑整理永远分层保存，机器生成内容只能进入草稿态。

**Tech Stack:** Node.js 24、Express 4、PostgreSQL 16、`pg`、Cheerio、Vue 3、TypeScript、Vite、Tailwind CSS、Node test runner、Playwright。

## Global Constraints

- 正式发布数据只写入 PostgreSQL；`backend/data/idioms.db` 保持迁移源和历史对照身份。
- 强制来源区间为 2017-01-01 至 2026-07-26，共十个自然年且逐年覆盖；2022-01-01 至 2026-07-26 为近五年核心层，在采集、审核和热度排序中优先。
- 2017 年以前首次出现的表达只有在 2017—2026 年权威材料中再次出现时才进入正式库，并且至少保留一条十年区间内证据。
- 第一批发布目标为 3,000 至 5,000 条，持续扩充至 10,000 条以上；缺少完整证据和审核的记录不得为凑数发布。
- 一级主题固定为设计说明中的 17 类；每条搭配只有一个主主题，可以拥有多个关联主题。
- S/A 级来源可以支持正式内容；B 级只能补充语境或频次；C 级只能发现候选和计算备考关注度。
- 官媒原句必须能在来源正文中连续、精确定位；不得拼接、改写或让 AI 生成。
- 来源的正式发布日期、正文落款日期和网页发布时间分栏保存；十年覆盖使用已核验的 `published_on`，不得用转载页时间替代文件日期。
- AI 只能生成编辑内容草稿，不得修改证据，不得自动将记录改为 `published`。
- 公开 API 统一使用 `/api/v1`；前端统一使用同源请求，不硬编码主机或端口。
- 公开记录必填字段完整率和证据定位率均为 100%；每个发布批次抽查不少于 200 条，语义准确率低于 98% 时整批退回。
- 批量发布必须在事务内完成，保留导入批次、内容版本、审核事件和批次撤回能力。

---

## Planned File Structure

### Database and backend domain

- `backend/migrations/003_content_roles.sql`: 内容审核角色与授权记录。
- `backend/migrations/004_hotspot_collocations.sql`: 热点词、搭配、主题、来源、证据、批次和审核事件表。
- `backend/src/hotspots/hotspot-normalization.js`: 规范词形、搭配去重键和原文定位校验。
- `backend/src/hotspots/hotspot-scoring.js`: 可重复计算的 100 分热度模型。
- `backend/src/hotspots/hotspot-validation.js`: 草稿、证据和发布前完整性校验。
- `backend/src/hotspots/hotspot-repository.js`: 公开查询和详细卡读取。
- `backend/src/hotspots/hotspot-service.js`: 查询参数校验和公开 DTO 组装。
- `backend/src/hotspots/hotspot-router.js`: `/api/v1/hotspots` 公开接口。
- `backend/src/hotspots/authorization-repository.js`: PostgreSQL 内容角色查询。
- `backend/src/hotspots/hotspot-review-repository.js`: 批次、候选、审核和事务发布。
- `backend/src/hotspots/hotspot-review-service.js`: 审核状态机和发布门禁。
- `backend/src/hotspots/hotspot-admin-router.js`: `/api/v1/admin/hotspots` 审核接口。

### Ingestion and corpus

- `backend/src/hotspots/source-allowlist.js`: 权威域名白名单和来源等级。
- `backend/src/hotspots/source-fetcher.js`: 受限抓取、重定向校验、大小和超时控制。
- `backend/src/hotspots/source-parser.js`: 标题、机构、日期、正文段落和规范 URL 解析。
- `backend/src/hotspots/candidate-extractor.js`: 固定组合和政策动宾短语提取。
- `backend/src/hotspots/editorial-provider.js`: 可注入的智谱编辑草稿提供器。
- `backend/src/hotspots/editorial-draft-service.js`: 只生成详细用法草稿，不接触原文证据。
- `backend/data/hotspots/topics.json`: 17 类主题及二级主题种子。
- `backend/data/hotspots/policy-verbs.json`: 规范政策动词和语气修饰词。
- `backend/data/hotspots/fixed-combinations.json`: 对偶、并列和固定政策表达。
- `backend/data/hotspots/source-manifest.json`: 已核验来源清单。
- `backend/scripts/hotspots/ingest-manifest.js`: 抓取、解析、提取并写入草稿批次。
- `backend/scripts/hotspots/draft-editorial.js`: 为已有证据的候选生成编辑草稿。
- `backend/scripts/hotspots/import-reviewed.js`: 导入线下审核结果，不自动发布未审核项。
- `backend/scripts/hotspots/audit-corpus.js`: 数量、主题、来源、证据和质量报告。

### Frontend

- `src/types/hotspots.ts`: 公开和审核 DTO 类型。
- `src/services/hotspots.ts`: 同源热点 API 客户端。
- `src/views/hotspots/HotspotListView.vue`: 图片式主题简表与搜索筛选。
- `src/views/hotspots/HotspotDetailView.vue`: 详细学习卡和权威证据。
- `src/views/admin/HotspotReviewView.vue`: 原文对照、修订、通过和驳回。
- `src/router/index.ts`: `/hotspots`、`/hotspots/:id` 和 `/admin/hotspots`。
- `src/views/HomeView.vue`: 增加热点搭配入口，不改现有整体视觉语言。

### Tests and operations

- `backend/test/hotspot-migration-shape.test.js`
- `backend/test/hotspot-domain.test.js`
- `backend/test/hotspot-http.test.js`
- `backend/test/hotspot-ingestion.test.js`
- `backend/test/hotspot-review.test.js`
- `backend/test/fixtures/hotspots/official-document.html`
- `tests/hotspot-components.test.mjs`
- `tests/e2e/hotspots.spec.ts`
- `docs/operations/hotspot-collocations.md`

---

### Task 1: Add the PostgreSQL content schema and role model

**Files:**
- Create: `backend/migrations/003_content_roles.sql`
- Create: `backend/migrations/004_hotspot_collocations.sql`
- Create: `backend/test/hotspot-migration-shape.test.js`

**Interfaces:**
- Consumes: existing `users(id)` and `schema_migrations` infrastructure.
- Produces: all relational tables and constraints used by every later task.

- [ ] **Step 1: Write the failing migration-shape test**

Create `backend/test/hotspot-migration-shape.test.js`:

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const rolesSql = fs.readFileSync(
  new URL('../migrations/003_content_roles.sql', import.meta.url),
  'utf8',
)
const hotspotSql = fs.readFileSync(
  new URL('../migrations/004_hotspot_collocations.sql', import.meta.url),
  'utf8',
)

test('content schema contains the normalized hotspot tables', () => {
  assert.match(rolesSql, /CREATE TABLE user_roles/)
  for (const table of [
    'hotspot_terms',
    'hotspot_topics',
    'source_documents',
    'content_import_batches',
    'hotspot_collocations',
    'collocation_variants',
    'collocation_topics',
    'collocation_evidence',
    'content_review_events',
  ]) {
    assert.match(hotspotSql, new RegExp(`CREATE TABLE ${table}`))
  }
})

test('published content is constrained and deduplicated', () => {
  assert.match(hotspotSql, /normalized_phrase text NOT NULL UNIQUE/)
  assert.match(hotspotSql, /WHERE is_primary/)
  assert.match(hotspotSql, /CHECK \(status IN \('draft', 'reviewed', 'published', 'retired'\)\)/)
  assert.match(hotspotSql, /UNIQUE \(collocation_id, source_document_id, paragraph_no, start_offset, end_offset\)/)
})

test('source dates retain separate meanings', () => {
  assert.match(hotspotSql, /published_on date NOT NULL/)
  assert.match(hotspotSql, /published_date_basis text NOT NULL/)
  assert.match(hotspotSql, /document_dated_on date/)
  assert.match(hotspotSql, /web_published_at timestamptz/)
})
```

- [ ] **Step 2: Run the test and verify the missing migrations fail**

Run: `npm.cmd test --prefix backend -- --test-name-pattern="content schema|published content"`

Expected: FAIL with `ENOENT` for `003_content_roles.sql`.

- [ ] **Step 3: Create the role migration**

Create `backend/migrations/003_content_roles.sql`:

```sql
CREATE TABLE user_roles (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role text NOT NULL
    CHECK (role IN ('content_reviewer', 'content_admin')),
  granted_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role)
);

CREATE INDEX user_roles_role_idx ON user_roles (role, user_id);
```

- [ ] **Step 4: Create the normalized hotspot migration**

Create `backend/migrations/004_hotspot_collocations.sql` with the following tables and constraints:

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE hotspot_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term text NOT NULL,
  normalized_term text NOT NULL UNIQUE,
  pinyin text,
  part_of_speech text,
  definition text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'reviewed', 'published', 'retired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE hotspot_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  parent_id uuid REFERENCES hotspot_topics(id) ON DELETE RESTRICT,
  level smallint NOT NULL CHECK (level IN (1, 2)),
  sort_order integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'inactive'))
);

CREATE TABLE source_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publisher text NOT NULL,
  authority_tier text NOT NULL
    CHECK (authority_tier IN ('S', 'A', 'B', 'C')),
  title text NOT NULL,
  document_type text NOT NULL,
  published_on date NOT NULL,
  published_date_basis text NOT NULL
    CHECK (published_date_basis IN ('document_date', 'official_web_publication', 'gazette_publication', 'event_date')),
  document_dated_on date,
  web_published_at timestamptz,
  original_url text NOT NULL,
  canonical_url text NOT NULL UNIQUE,
  canonical_domain text NOT NULL,
  source_parent_id uuid REFERENCES source_documents(id) ON DELETE SET NULL,
  body_hash text NOT NULL,
  fetched_at timestamptz NOT NULL,
  last_checked_at timestamptz NOT NULL,
  http_status integer NOT NULL,
  content_state text NOT NULL DEFAULT 'current'
    CHECK (content_state IN ('current', 'changed', 'unavailable', 'recheck')),
  copyright_policy text NOT NULL DEFAULT 'excerpt_only'
    CHECK (copyright_policy IN ('excerpt_only', 'licensed_full_text'))
);

CREATE TABLE content_import_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_name text NOT NULL UNIQUE,
  source_scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  pipeline_version text NOT NULL,
  status text NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'staged', 'reviewed', 'published', 'failed', 'rolled_back')),
  candidate_count integer NOT NULL DEFAULT 0,
  reviewed_count integer NOT NULL DEFAULT 0,
  published_count integer NOT NULL DEFAULT 0,
  rejected_count integer NOT NULL DEFAULT 0,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  rolled_back_at timestamptz
);

CREATE TABLE hotspot_collocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  term_id uuid NOT NULL REFERENCES hotspot_terms(id) ON DELETE RESTRICT,
  import_batch_id uuid REFERENCES content_import_batches(id) ON DELETE SET NULL,
  canonical_phrase text NOT NULL,
  normalized_phrase text NOT NULL UNIQUE,
  pattern_type text NOT NULL
    CHECK (pattern_type IN ('动宾', '偏正', '主谓', '并列', '递进', '对偶', '固定表达')),
  detailed_meaning text NOT NULL DEFAULT '',
  applicable_objects text[] NOT NULL DEFAULT '{}',
  usage_contexts text[] NOT NULL DEFAULT '{}',
  semantic_focus text NOT NULL DEFAULT '',
  editorial_example text NOT NULL DEFAULT '',
  common_mistake text NOT NULL DEFAULT '',
  mistake_reason text NOT NULL DEFAULT '',
  correction_advice text NOT NULL DEFAULT '',
  hot_score numeric(5,2) NOT NULL DEFAULT 0 CHECK (hot_score BETWEEN 0 AND 100),
  validity text NOT NULL DEFAULT 'current'
    CHECK (validity IN ('current', 'long_term', 'historical')),
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'reviewed', 'published', 'retired')),
  content_version integer NOT NULL DEFAULT 1 CHECK (content_version > 0),
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  first_published_at timestamptz,
  last_verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE collocation_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collocation_id uuid NOT NULL REFERENCES hotspot_collocations(id) ON DELETE CASCADE,
  variant_text text NOT NULL,
  relation_type text NOT NULL
    CHECK (relation_type IN ('expanded', 'fixed_combination', 'near_synonym', 'confusable')),
  difference_note text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  UNIQUE (collocation_id, variant_text, relation_type)
);

CREATE TABLE collocation_topics (
  collocation_id uuid NOT NULL REFERENCES hotspot_collocations(id) ON DELETE CASCADE,
  topic_id uuid NOT NULL REFERENCES hotspot_topics(id) ON DELETE RESTRICT,
  is_primary boolean NOT NULL DEFAULT false,
  PRIMARY KEY (collocation_id, topic_id)
);

CREATE UNIQUE INDEX collocation_one_primary_topic_idx
  ON collocation_topics (collocation_id)
  WHERE is_primary;

CREATE TABLE collocation_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collocation_id uuid NOT NULL REFERENCES hotspot_collocations(id) ON DELETE CASCADE,
  source_document_id uuid NOT NULL REFERENCES source_documents(id) ON DELETE RESTRICT,
  quote_text text NOT NULL,
  paragraph_no integer NOT NULL CHECK (paragraph_no >= 0),
  start_offset integer NOT NULL CHECK (start_offset >= 0),
  end_offset integer NOT NULL CHECK (end_offset > start_offset),
  context_before text NOT NULL DEFAULT '',
  context_after text NOT NULL DEFAULT '',
  locator_text text NOT NULL,
  text_fragment_url text,
  quote_hash text NOT NULL,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'reviewed', 'published', 'recheck', 'retired')),
  reviewed_by uuid REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (collocation_id, source_document_id, paragraph_no, start_offset, end_offset)
);

CREATE TABLE content_review_events (
  id bigserial PRIMARY KEY,
  entity_type text NOT NULL
    CHECK (entity_type IN ('collocation', 'evidence', 'batch')),
  entity_id uuid NOT NULL,
  action text NOT NULL
    CHECK (action IN ('create', 'revise', 'approve', 'reject', 'publish', 'retire', 'rollback')),
  actor_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  note text NOT NULL DEFAULT '',
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX hotspot_phrase_trgm_idx
  ON hotspot_collocations USING gin (canonical_phrase gin_trgm_ops);
CREATE INDEX hotspot_meaning_trgm_idx
  ON hotspot_collocations USING gin (detailed_meaning gin_trgm_ops);
CREATE INDEX hotspot_public_score_idx
  ON hotspot_collocations (status, validity, hot_score DESC);
CREATE INDEX evidence_document_idx
  ON collocation_evidence (source_document_id, status);
CREATE INDEX review_events_entity_idx
  ON content_review_events (entity_type, entity_id, created_at DESC);
```

- [ ] **Step 5: Run the migration test and full backend suite**

Run: `npm.cmd test --prefix backend`

Expected: all backend tests PASS, including the two new schema tests.

- [ ] **Step 6: Commit the schema**

```powershell
git add backend/migrations/003_content_roles.sql backend/migrations/004_hotspot_collocations.sql backend/test/hotspot-migration-shape.test.js
git commit -m "feat: add hotspot content schema"
```

---

### Task 2: Implement deterministic normalization, evidence validation, and scoring

**Files:**
- Create: `backend/src/hotspots/hotspot-normalization.js`
- Create: `backend/src/hotspots/hotspot-validation.js`
- Create: `backend/src/hotspots/hotspot-scoring.js`
- Create: `backend/test/hotspot-domain.test.js`

**Interfaces:**
- Produces: `normalizeChineseText(value) -> string`, `normalizePhrase(value) -> string`, `validateExactEvidence(input) -> object`, `validatePublishableCollocation(input) -> object`, and `calculateHotScore(input) -> number`.
- Later repository, ingestion, review, and import tasks must call these exact functions.

- [ ] **Step 1: Write failing domain tests**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizePhrase,
  validateExactEvidence,
} from '../src/hotspots/hotspot-normalization.js'
import { validatePublishableCollocation } from '../src/hotspots/hotspot-validation.js'
import { calculateHotScore } from '../src/hotspots/hotspot-scoring.js'

test('normalizePhrase collapses presentation differences only', () => {
  assert.equal(normalizePhrase(' 做优增量，盘活存量 '), '做优增量盘活存量')
  assert.equal(normalizePhrase('增强改革系统性、整体性、协同性'), '增强改革系统性整体性协同性')
})

test('evidence must point to the exact quote offsets', () => {
  const paragraphText = '持续扩大内需、优化供给，做优增量、盘活存量。'
  const startOffset = paragraphText.indexOf('盘活存量')
  assert.deepEqual(
    validateExactEvidence({
      phrase: '盘活存量',
      quoteText: '盘活存量',
      paragraphText,
      startOffset,
      endOffset: startOffset + 4,
    }),
    { startOffset, endOffset: startOffset + 4 },
  )
  assert.throws(
    () => validateExactEvidence({
      phrase: '盘活存量',
      quoteText: '优化存量',
      paragraphText,
      startOffset,
      endOffset: startOffset + 4,
    }),
    /原文定位不一致/,
  )
})

test('publish validation requires teaching fields and published evidence', () => {
  assert.throws(
    () => validatePublishableCollocation({
      canonicalPhrase: '盘活存量',
      detailedMeaning: '',
      applicableObjects: ['存量资产'],
      usageContexts: ['宏观经济'],
      semanticFocus: '提高已有资源利用效率',
      editorialExample: '通过城市更新盘活存量资产。',
      commonMistake: '盘活新增资源',
      mistakeReason: '盘活针对已有存量',
      correctionAdvice: '改为盘活存量资源',
      primaryTopicCode: 'macro-economy',
      evidence: [{ status: 'published' }],
    }),
    /详细释义不能为空/,
  )
})

test('hot score follows the approved 100 point model', () => {
  assert.equal(calculateHotScore({
    publishedOn: '2026-07-01',
    now: '2026-07-26',
    authorityTier: 'S',
    distinctDocuments: 5,
    distinctPublishers: 3,
    inCurrentCentralDocument: true,
    examRelevance: 8,
  }), 94)
})
```

- [ ] **Step 2: Run the tests and verify module-not-found failures**

Run: `node --test backend/test/hotspot-domain.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement normalization and exact evidence validation**

Use NFKC normalization, whitespace removal, and presentation-punctuation removal for the dedupe key. Preserve word order and Chinese characters. `validateExactEvidence` must verify all of the following before returning offsets:

```js
const actual = paragraphText.slice(startOffset, endOffset)
if (actual !== quoteText || !quoteText.includes(phrase)) {
  throw new Error('原文定位不一致')
}
```

Reject negative offsets, reversed ranges, and offsets beyond `paragraphText.length` with `原文定位越界`.

- [ ] **Step 4: Implement publish validation**

`validatePublishableCollocation(input)` must reject a record unless:

```js
const requiredText = [
  ['标准搭配', input.canonicalPhrase],
  ['详细释义', input.detailedMeaning],
  ['语义侧重', input.semanticFocus],
  ['规范例句', input.editorialExample],
  ['易错用法', input.commonMistake],
  ['错误原因', input.mistakeReason],
  ['纠正建议', input.correctionAdvice],
]
for (const [label, value] of requiredText) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label}不能为空`)
  }
}
if (!Array.isArray(input.applicableObjects) || input.applicableObjects.length === 0) {
  throw new Error('适用对象不能为空')
}
if (!Array.isArray(input.usageContexts) || input.usageContexts.length === 0) {
  throw new Error('使用语境不能为空')
}
if (!input.primaryTopicCode) throw new Error('主主题不能为空')
if (!input.evidence?.some((item) => item.status === 'published')) {
  throw new Error('至少需要一条已核验权威证据')
}
```

- [ ] **Step 5: Implement the exact heat formula**

`calculateHotScore` uses calendar-year distance (`currentYear - sourceYear`) and assigns recency `25` for 0–1 years, `20` for 2–4 years, `12` for 5–7 years, `5` for 8–9 years, and `0` outside the formal ten-year window. It assigns authority `S=25/A=20/B=10/C=0`, document breadth up to `20` at four points per document, publisher breadth up to `10` at two points per publisher, current central-document presence `10`, and bounded exam relevance `0..10`. Return an integer between 0 and 100. This makes 2022–2026 the explicit near-five-year priority layer when the reference year is 2026.

- [ ] **Step 6: Run the focused and full backend tests**

Run: `node --test backend/test/hotspot-domain.test.js`

Expected: 4 tests PASS.

Run: `npm.cmd test --prefix backend`

Expected: full backend suite PASS.

- [ ] **Step 7: Commit the domain rules**

```powershell
git add backend/src/hotspots/hotspot-normalization.js backend/src/hotspots/hotspot-validation.js backend/src/hotspots/hotspot-scoring.js backend/test/hotspot-domain.test.js
git commit -m "feat: validate and score hotspot collocations"
```

---

### Task 3: Add the published hotspot repository and public API

**Files:**
- Create: `backend/src/hotspots/hotspot-repository.js`
- Create: `backend/src/hotspots/hotspot-service.js`
- Create: `backend/src/hotspots/hotspot-router.js`
- Create: `backend/test/hotspot-http.test.js`
- Modify: `backend/src/app.js`
- Modify: `backend/src/server.js`

**Interfaces:**
- `HotspotRepository.listPublished({ q, topic, validity, limit, offset }) -> Promise<{ rows, total }>`
- `HotspotRepository.getPublishedById(id) -> Promise<object|null>`
- `HotspotRepository.listTopics() -> Promise<object[]>`
- `HotspotService.list(query)`, `detail(id)`, and `topics()`.
- Public endpoints: `GET /api/v1/hotspots`, `GET /api/v1/hotspots/topics`, `GET /api/v1/hotspots/:id`.

- [ ] **Step 1: Write the failing public HTTP tests**

Create a fake service with one “盘活存量” record. Test that `GET /api/v1/hotspots?topic=macro-economy&limit=20` returns it, `GET /api/v1/hotspots/hotspots-not-a-uuid` returns `400 HOTSPOT_ID_INVALID`, an absent UUID returns `404 HOTSPOT_NOT_FOUND`, and no unpublished item can be returned by the repository SQL.

The successful assertion must be exact:

```js
assert.deepEqual(body, {
  ok: true,
  data: {
    total: 1,
    rows: [{
      id: '75d7b168-89c7-4c55-aa6a-b67f601cf76e',
      canonicalPhrase: '盘活存量',
      coreTerm: '盘活',
      primaryTopic: { code: 'macro-economy', name: '宏观经济与高质量发展' },
      hotScore: 94,
      validity: 'current',
    }],
  },
})
```

- [ ] **Step 2: Run the HTTP tests and verify failure**

Run: `node --test backend/test/hotspot-http.test.js`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement parameterized public queries**

The list query must always contain `c.status = 'published'` and join exactly one primary topic. Use `$1..$n` parameters for query text, topic, validity, limit, and offset. The detail query must aggregate variants, topics, and only `e.status = 'published'` evidence; it must never return stored article bodies.

- [ ] **Step 4: Implement service validation and router responses**

Use these bounds:

```js
const limit = query.limit === undefined ? 30 : Number(query.limit)
const offset = query.offset === undefined ? 0 : Number(query.offset)
if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
  throw new HttpError(400, 'HOTSPOT_LIMIT_INVALID', '每页数量须为 1 至 100')
}
if (!Number.isSafeInteger(offset) || offset < 0) {
  throw new HttpError(400, 'HOTSPOT_OFFSET_INVALID', '分页位置格式不正确')
}
```

The router returns `{ ok: true, data }` consistently and uses the existing `HttpError` handler.

- [ ] **Step 5: Wire the router without breaking standalone authentication**

Add `hotspotRouter` and `hotspotAdminRouter` optional dependencies to `createApp`. Mount the public router at `/api/v1/hotspots`. In `startServer`, create hotspot services only when the PostgreSQL pool exists; current SQLite standalone mode remains available for unrelated legacy work.

- [ ] **Step 6: Run tests**

Run: `node --test backend/test/hotspot-http.test.js`

Expected: all hotspot HTTP tests PASS.

Run: `npm.cmd test --prefix backend`

Expected: full backend suite PASS.

- [ ] **Step 7: Commit the public API**

```powershell
git add backend/src/hotspots/hotspot-repository.js backend/src/hotspots/hotspot-service.js backend/src/hotspots/hotspot-router.js backend/src/app.js backend/src/server.js backend/test/hotspot-http.test.js
git commit -m "feat: expose published hotspot collocations"
```

---

### Task 4: Build the safe authoritative-source fetcher and parser

**Files:**
- Create: `backend/src/hotspots/source-allowlist.js`
- Create: `backend/src/hotspots/source-fetcher.js`
- Create: `backend/src/hotspots/source-parser.js`
- Create: `backend/test/fixtures/hotspots/official-document.html`
- Create: `backend/test/hotspot-ingestion.test.js`
- Modify: `backend/package.json`
- Modify: `backend/package-lock.json`

**Interfaces:**
- `classifySourceUrl(url) -> { allowed, sourceFamily, canonicalDomain }`
- `classifyDocumentAuthority({ publisher, documentType }) -> 'S' | 'A' | 'B' | 'C'`
- `fetchSourceDocument(url, { fetchImpl, timeoutMs, maxBytes }) -> Promise<{ finalUrl, body, contentType, status, fetchedAt }>`
- `parseOfficialDocument({ body, contentType, url, fetchedAt, expectedMetadata, parsePdf }) -> { publisher, title, publishedOn, publishedDateBasis, documentDatedOn, webPublishedAt, canonicalUrl, paragraphs, bodyHash, contentState }`.

- [ ] **Step 1: Create a synthetic official-document fixture**

The fixture must contain a title, official web publication time `2026-03-13 09:00`, document date `2026-03-01`, publisher “新华社”, one navigation block that must be discarded, and these two body paragraphs:

```html
<p>持续扩大内需、优化供给，做优增量、盘活存量。</p>
<p>因地制宜发展新质生产力，持续防范化解重点领域风险。</p>
```

- [ ] **Step 2: Write failing allowlist, fetch, and parse tests**

Tests must prove:

- `https://www.gov.cn/...`, `https://www.moe.gov.cn/...`, and `https://www.xinhuanet.com/...` are allowed transport sources;
- authority tier is determined from the verified issuing institution and document type, not inferred from the hostname alone;
- an S-level central document mirrored on an approved ministry or provincial-government domain remains S only after title, issuer, and date validation; link its canonical parent when one exists, otherwise record the mirror publisher and authorized-release provenance explicitly;
- `http://example.com/...`, `file:///...`, credentials in URLs, and an allowed URL redirecting to an unapproved domain are rejected;
- responses larger than 12 MiB and unsupported types such as `image/png` are rejected;
- HTML, plain text, and PDF are accepted; the PDF test injects a deterministic fake adapter;
- the fixture parser returns exactly two paragraphs, separates webpage time from document date, and excludes the navigation block.

- [ ] **Step 3: Run ingestion tests and verify failure**

Run: `node --test backend/test/hotspot-ingestion.test.js`

Expected: FAIL with missing hotspot ingestion modules.

- [ ] **Step 4: Implement the explicit whitelist**

Allow HTTPS only. Treat `gov.cn` and its subdomains as approved government transport sources; explicitly allow `xinhuanet.com`, `news.cn`, `people.com.cn`, `cctv.com`, `cctv.cn`, `gmw.cn`, `ce.cn`, and `qstheory.cn`. Reject lookalike domains such as `gov.cn.example.com`. Domain approval is not an authority-grade assignment: grade the content from the issuing institution and document type defined in the design. Link a mirror to its canonical parent when one exists; otherwise store mirror publisher and authorized-release provenance rather than inventing a parent URL.

- [ ] **Step 5: Implement bounded fetching**

Defaults are `timeoutMs=15000` and `maxBytes=12 * 1024 * 1024`. Validate both the requested URL and `response.url` after redirects. Accept only `text/html`, `application/xhtml+xml`, `text/plain`, or `application/pdf`; buffer as bytes while enforcing the limit before parsing. Reject missing or misleading content types and verify `%PDF-` magic bytes for PDFs.

- [ ] **Step 6: Implement deterministic HTML and PDF parsing**

Install the pinned backend dependency first:

```powershell
npm.cmd install pdf-parse@2.4.5 --prefix backend
```

For HTML, decode from the declared charset, then use Cheerio to remove `script`, `style`, `nav`, `footer`, `header`, forms, comments, share widgets, and elements hidden with `display:none`. Extract paragraphs from `article p`, `.article p`, `.content p`, `.pages_content p`, and finally `body p`.

For PDF, the default adapter creates `new PDFParse({ data: body })`, calls `getText()`, and always calls `destroy()` in `finally`. Keep `parsePdf` injectable for deterministic tests. Split extracted pages into paragraphs without reordering text. `expectedMetadata` comes from the reviewed manifest, but the parser must confirm title, publisher, and at least one supplied date in extracted text or page metadata; otherwise return `contentState: 'recheck'` and create no candidates.

For both formats, normalize whitespace, discard paragraphs shorter than 8 Chinese characters, preserve paragraph order, separate `publishedOn`, `documentDatedOn`, and `webPublishedAt`, and compute a SHA-256 hash over joined paragraphs.

- [ ] **Step 7: Run tests and commit**

Run: `node --test backend/test/hotspot-ingestion.test.js`

Expected: all ingestion tests PASS.

```powershell
git add backend/src/hotspots/source-allowlist.js backend/src/hotspots/source-fetcher.js backend/src/hotspots/source-parser.js backend/test/fixtures/hotspots/official-document.html backend/test/hotspot-ingestion.test.js backend/package.json backend/package-lock.json
git commit -m "feat: parse approved official sources"
```

---

### Task 5: Extract normalized collocation candidates with exact offsets

**Files:**
- Create: `backend/data/hotspots/policy-verbs.json`
- Create: `backend/data/hotspots/fixed-combinations.json`
- Create: `backend/src/hotspots/candidate-extractor.js`
- Modify: `backend/test/hotspot-ingestion.test.js`

**Interfaces:**
- `extractCandidates(document, lexicons) -> Array<{ canonicalPhrase, observedPhrase, coreTerm, patternType, paragraphNo, startOffset, endOffset, quoteText }>`.
- The extractor only proposes drafts; it cannot assign `reviewed` or `published`.

- [ ] **Step 1: Add failing extraction tests**

Use the fixture paragraphs and assert these candidates and offsets:

```js
assert.deepEqual(
  candidates.map((item) => item.canonicalPhrase),
  [
    '扩大内需',
    '优化供给',
    '做优增量',
    '盘活存量',
    '因地制宜发展新质生产力',
    '防范化解重点领域风险',
  ],
)
for (const item of candidates) {
  const paragraph = document.paragraphs[item.paragraphNo]
  assert.equal(
    paragraph.slice(item.startOffset, item.endOffset),
    item.quoteText,
  )
}
```

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `node --test backend/test/hotspot-ingestion.test.js`

Expected: FAIL because `candidate-extractor.js` is missing.

- [ ] **Step 3: Add the initial deterministic lexicons**

`policy-verbs.json` contains these core actions and no generated prose:

```json
{
  "modifiers": ["持续", "深入", "加快", "全面", "着力", "扎实", "稳步", "纵深", "积极", "大力", "不断", "进一步", "切实", "有效", "因地制宜"],
  "verbs": ["扩大", "优化", "做优", "盘活", "推进", "推动", "提升", "增强", "强化", "完善", "健全", "促进", "激发", "释放", "保障", "巩固", "拓展", "防范", "化解", "筑牢", "守牢", "夯实", "补齐", "打通", "畅通", "构建", "打造", "培育", "塑造", "统筹", "深化", "落实", "维护"]
}
```

`fixed-combinations.json` begins with verified expressions only:

```json
[
  "做优增量、盘活存量",
  "扩大内需、优化供给",
  "稳就业、稳企业、稳市场、稳预期",
  "系统性、整体性、协同性",
  "质的有效提升和量的合理增长",
  "破立并举、先立后破"
]
```

- [ ] **Step 4: Implement extraction without semantic invention**

Split each paragraph on `。！？；` and each clause on comma boundaries. Preserve the original offsets. Strip a leading modifier only when creating the canonical phrase; keep it in `observedPhrase`. Keep 4–18 Chinese-character candidates, except a fixed-combination match may exceed 18 characters. Reject strings ending in function words such as `的、地、得、和、与、及、或、在、为`.

Every candidate must pass `validateExactEvidence` before being returned.

- [ ] **Step 5: Run tests and commit**

Run: `node --test backend/test/hotspot-ingestion.test.js`

Expected: parser and extraction tests PASS.

```powershell
git add backend/data/hotspots/policy-verbs.json backend/data/hotspots/fixed-combinations.json backend/src/hotspots/candidate-extractor.js backend/test/hotspot-ingestion.test.js
git commit -m "feat: extract official collocation candidates"
```

---

### Task 6: Generate detailed editorial drafts without contaminating evidence

**Files:**
- Create: `backend/src/hotspots/editorial-provider.js`
- Create: `backend/src/hotspots/editorial-draft-service.js`
- Create: `backend/test/hotspot-editorial.test.js`
- Modify: `backend/src/config.js`
- Modify: `backend/.env.example`

**Interfaces:**
- `ZhipuEditorialProvider.generate(input) -> Promise<object>`.
- `EditorialDraftService.createDraft({ candidate, evidence }) -> Promise<object>`.
- Output fields: `detailedMeaning`, `applicableObjects`, `usageContexts`, `semanticFocus`, `editorialExample`, `commonMistake`, `mistakeReason`, `correctionAdvice`, `variants`.
- The service never returns `officialQuote`, `sourceUrl`, `status`, `reviewedBy`, or `publishedAt` from model output.

- [ ] **Step 1: Write failing editorial isolation tests**

Inject a fake provider returning valid teaching fields plus a malicious `officialQuote: '伪造原句'` and `status: 'published'`. Assert the service output contains the teaching fields, drops both forbidden fields, sets `status: 'draft'`, and copies evidence only from the caller-provided evidence object.

- [ ] **Step 2: Run the test and verify failure**

Run: `node --test backend/test/hotspot-editorial.test.js`

Expected: FAIL with missing editorial modules.

- [ ] **Step 3: Extend configuration safely**

Expose this frozen shape from `loadConfig` without making the key mandatory for ordinary startup:

```js
editorialAi: Object.freeze({
  apiKey: env.ZHIPU_API_KEY || '',
  baseUrl: env.ZHIPU_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4',
  model: env.ZHIPU_EDITORIAL_MODEL || 'glm-4-flash',
}),
```

Add `ZHIPU_EDITORIAL_MODEL=glm-4-flash` to `.env.example`; keep all secret values blank or explicit non-secret placeholders.

- [ ] **Step 4: Implement strict JSON drafting**

The provider prompt must include the canonical phrase, exact short evidence, topic, and this rule: “只整理释义和教学内容，不得生成、改写或补充官媒原句与网址。” Parse a single JSON object, reject Markdown fences that contain extra prose, cap the response at 2,000 output tokens, and use temperature `0.2`.

The draft service applies `validatePublishableCollocation` with evidence temporarily marked `published` only to check structural completeness, then returns the record as `draft`; it does not update any database row.

- [ ] **Step 5: Run tests and commit**

Run: `node --test backend/test/hotspot-editorial.test.js backend/test/config.test.js`

Expected: all focused tests PASS.

```powershell
git add backend/src/hotspots/editorial-provider.js backend/src/hotspots/editorial-draft-service.js backend/src/config.js backend/.env.example backend/test/hotspot-editorial.test.js
git commit -m "feat: draft detailed hotspot usage guidance"
```

---

### Task 7: Implement import batches, role-gated review, and transactional publishing

**Files:**
- Create: `backend/src/hotspots/authorization-repository.js`
- Create: `backend/src/hotspots/hotspot-review-repository.js`
- Create: `backend/src/hotspots/hotspot-review-service.js`
- Create: `backend/src/hotspots/hotspot-admin-router.js`
- Create: `backend/test/hotspot-review.test.js`
- Modify: `backend/src/app.js`
- Modify: `backend/src/server.js`

**Interfaces:**
- `AuthorizationRepository.hasRole(userId, roles) -> Promise<boolean>`.
- `HotspotReviewRepository.createBatch(input)`, `stageCandidate(batchId, input)`, `listCandidates(query)`, `recordDecision(input)`, `publishBatch(batchId, actorUserId)`, and `rollbackBatch(batchId, actorUserId)`.
- Admin endpoints under `/api/v1/admin/hotspots`.

- [ ] **Step 1: Write failing authorization and state-machine tests**

Test these exact outcomes:

- guest request returns `401 AUTH_REQUIRED`;
- authenticated non-reviewer returns `403 CONTENT_ROLE_REQUIRED`;
- reviewer can change `draft` to `reviewed` or reject it;
- reviewer cannot publish a batch;
- content administrator can publish only records with complete teaching fields, one reviewed/published evidence item, and a primary topic;
- any incomplete record leaves the entire publish transaction uncommitted;
- rollback retires the batch's published rows and records one `rollback` event.

- [ ] **Step 2: Run review tests and verify failure**

Run: `node --test backend/test/hotspot-review.test.js`

Expected: FAIL with missing review modules.

- [ ] **Step 3: Implement role checking**

Use a parameterized query against `user_roles`. The middleware accepts `['content_reviewer', 'content_admin']` for review routes and only `['content_admin']` for publish/rollback routes. It runs after `optionalUser` and `requireUser` from the existing session middleware.

- [ ] **Step 4: Implement the review state machine**

Allowed transitions are exact:

```js
const transitions = {
  draft: new Set(['reviewed', 'retired']),
  reviewed: new Set(['draft', 'published', 'retired']),
  published: new Set(['reviewed', 'retired']),
  retired: new Set(['draft']),
}
```

Each transition inserts a `content_review_events` row containing before and after snapshots. Reject an illegal transition with `409 CONTENT_STATE_CONFLICT`.

- [ ] **Step 5: Implement transactional publish and rollback**

Inside `withTransaction`, lock the batch and its candidate rows with `FOR UPDATE`, validate every candidate and evidence, update eligible records and evidence to `published`, set timestamps and reviewer, update batch counts, and insert audit events. Throwing on any item must roll back all writes.

- [ ] **Step 6: Mount the admin router and run tests**

Mount at `/api/v1/admin/hotspots` only when PostgreSQL-backed dependencies exist.

Run: `node --test backend/test/hotspot-review.test.js`

Expected: all review tests PASS.

Run: `npm.cmd test --prefix backend`

Expected: full backend suite PASS.

- [ ] **Step 7: Commit the review workflow**

```powershell
git add backend/src/hotspots/authorization-repository.js backend/src/hotspots/hotspot-review-repository.js backend/src/hotspots/hotspot-review-service.js backend/src/hotspots/hotspot-admin-router.js backend/src/app.js backend/src/server.js backend/test/hotspot-review.test.js
git commit -m "feat: review and publish hotspot batches"
```

---

### Task 8: Add the topic seeds, verified source manifest, and ingestion CLIs

**Files:**
- Create: `backend/data/hotspots/topics.json`
- Create: `backend/data/hotspots/source-manifest.json`
- Create: `backend/scripts/hotspots/ingest-manifest.js`
- Create: `backend/scripts/hotspots/draft-editorial.js`
- Create: `backend/scripts/hotspots/import-reviewed.js`
- Create: `backend/scripts/hotspots/audit-corpus.js`
- Create: `backend/test/hotspot-cli.test.js`
- Modify: `backend/package.json`

**Interfaces:**
- CLI commands accept explicit manifest/batch paths and return nonzero exit codes on any failed validation.
- Machine-readable audit output is JSON; the same command writes a concise Markdown report.

- [ ] **Step 1: Write failing CLI contract tests**

Import the CLI `main` functions without executing the process. Test that an empty manifest is rejected, duplicate canonical URLs are rejected, a C-level source cannot be promoted to S/A, and `auditCorpus` reports missing primary topics and evidence counts.

- [ ] **Step 2: Run the CLI tests and verify failure**

Run: `node --test backend/test/hotspot-cli.test.js`

Expected: FAIL with missing CLI modules.

- [ ] **Step 3: Add all 17一级主题 seeds**

Each topic object uses `{ "code", "name", "level", "sortOrder", "children" }`. Codes are stable English kebab-case values such as `overall-modernization`, `macro-economy`, `new-quality-productive-forces`, `rural-revitalization`, `social-governance`, `public-livelihood`, `ecological-civilization`, and `party-building`.

- [ ] **Step 4: Add the first authoritative anchor documents**

The first manifest is a JSON array containing these verified canonical source records, with the shown tier and date:

```json
[
  {
    "title": "2026年政府工作报告",
    "publisher": "国务院",
    "publishedOn": "2026-03-13",
    "publishedDateBasis": "official_web_publication",
    "authorityTier": "S",
    "documentType": "government_work_report",
    "url": "https://www.gov.cn/yaowen/liebiao/202603/content_7062625.htm"
  },
  {
    "title": "中共中央 国务院关于锚定农业农村现代化 扎实推进乡村全面振兴的意见",
    "publisher": "中共中央、国务院",
    "publishedOn": "2026-02-03",
    "publishedDateBasis": "official_web_publication",
    "documentDatedOn": "2026-01-03",
    "webPublishedAt": "2026-02-03T18:19:53+08:00",
    "authorityTier": "S",
    "documentType": "central_document",
    "url": "https://www.news.cn/politics/zywj/20260203/724188820db8404ebc739feacc64a2d3/c.html"
  },
  {
    "title": "中共中央关于制定国民经济和社会发展第十五个五年规划的建议",
    "publisher": "中共中央",
    "publishedOn": "2025-10-28",
    "publishedDateBasis": "official_web_publication",
    "authorityTier": "S",
    "documentType": "central_decision",
    "url": "https://www.gov.cn/gongbao/2025/issue_12386/material/gwygb202531.pdf"
  },
  {
    "title": "中共中央关于进一步全面深化改革 推进中国式现代化的决定",
    "publisher": "中共中央",
    "publishedOn": "2024-07-21",
    "publishedDateBasis": "official_web_publication",
    "authorityTier": "S",
    "documentType": "central_decision",
    "url": "https://www.mee.gov.cn/zcwj/zyygwj/202407/t20240721_1082070.shtml"
  },
  {
    "title": "中央经济工作会议在北京举行",
    "publisher": "新华社",
    "publishedOn": "2025-12-11",
    "publishedDateBasis": "official_web_publication",
    "authorityTier": "A",
    "documentType": "authoritative_report",
    "url": "https://www.mofcom.gov.cn/xwfb/ldrhd/art/2025/art_adf875bf69c14d6e8b22f8bdfa70e44c.html"
  },
  {
    "title": "高举中国特色社会主义伟大旗帜 为全面建设社会主义现代化国家而团结奋斗",
    "publisher": "中国共产党第二十次全国代表大会",
    "publishedOn": "2022-10-16",
    "publishedDateBasis": "document_date",
    "authorityTier": "S",
    "documentType": "party_congress_report",
    "url": "https://sfj.beijing.gov.cn/sfj/sfdt/ztzl74/xxxcgcddesdjs/hyjs/326015605/index.html"
  },
  {
    "title": "中华人民共和国国民经济和社会发展第十四个五年规划和2035年远景目标纲要",
    "publisher": "全国人民代表大会",
    "publishedOn": "2021-03-13",
    "publishedDateBasis": "official_web_publication",
    "authorityTier": "S",
    "documentType": "national_plan",
    "url": "https://www.ndrc.gov.cn/xxgk/zcfb/ghwb/202103/P020210323538797779059.pdf"
  },
  {
    "title": "2025年政府工作报告",
    "publisher": "国务院",
    "publishedOn": "2025-03-12",
    "publishedDateBasis": "official_web_publication",
    "authorityTier": "S",
    "documentType": "government_work_report",
    "url": "https://www.gov.cn/gongbao/2025/issue_11946/material/gwygb202509.pdf"
  }
]
```

All manifest records must include `publishedDateBasis`; optional `documentDatedOn` and `webPublishedAt` preserve distinct date meanings. PDF records use the Task 4 PDF adapter; if text extraction fails, required metadata cannot be confirmed, or characters are garbled, mark the document `recheck` and do not create candidates.

- [ ] **Step 5: Implement the four deterministic CLIs**

- `ingest-manifest.js`: validate manifest, create one import batch, fetch and parse each document, upsert documents, extract candidates, calculate evidence offsets, and stage deduplicated drafts.
- `draft-editorial.js`: select only drafts with exact S/A evidence, call `EditorialDraftService`, save teaching fields, and leave status `draft`.
- `import-reviewed.js`: read a UTF-8 JSON array containing `collocationId`, `decision`, `note`, and optional field corrections; call the review service for each row; never interpret absence as approval.
- `audit-corpus.js`: output counts by status, topic, tier, year, evidence count, missing field, broken link, and import batch.

Add these scripts:

```json
{
  "hotspots:ingest": "node scripts/hotspots/ingest-manifest.js",
  "hotspots:draft": "node scripts/hotspots/draft-editorial.js",
  "hotspots:review-import": "node scripts/hotspots/import-reviewed.js",
  "hotspots:audit": "node scripts/hotspots/audit-corpus.js"
}
```

- [ ] **Step 6: Run tests and commit**

Run: `node --test backend/test/hotspot-cli.test.js`

Expected: all CLI contract tests PASS.

```powershell
git add backend/data/hotspots backend/scripts/hotspots backend/package.json backend/test/hotspot-cli.test.js
git commit -m "feat: add hotspot corpus ingestion commands"
```

---

### Task 9: Build and audit the 2017—2026 large corpus without auto-publishing drafts

**Files:**
- Modify: `backend/data/hotspots/source-manifest.json`
- Create: `docs/audit/hotspot-source-coverage.json`
- Create: `docs/audit/hotspot-corpus-audit.md`
- Create: `docs/audit/hotspot-review-batches.md`

**Interfaces:**
- Consumes all ingestion and review CLIs.
- Produces a PostgreSQL staging corpus, verified-source coverage report, and explicit review batches.

- [ ] **Step 1: Back up and migrate the target database**

Create a PostgreSQL custom-format backup using a timestamped file outside the repository, record its absolute path in the operator log, then run:

```powershell
npm.cmd run migrate --prefix backend
```

Expected: migrations `003_content_roles.sql` and `004_hotspot_collocations.sql` apply once; rerunning reports the schema is current.

- [ ] **Step 2: Expand sources across all 17 themes and all ten years**

For each一级主题, add at least 20 distinct S/A documents from 2017–2026. Use official document pages or direct government-gazette PDFs, verify title/date/publisher before adding, and exclude search-result pages. Each theme must include at least one S-level anchor and three distinct publishers. The source audit must include a `yearTopicMatrix` covering every year from 2017 through 2026; no year may have zero verified documents. Give 2022–2026 sources first-pass ingestion and review priority, but retain qualified 2017–2021 documents in the same database. Record exact per-theme and per-year counts in `hotspot-source-coverage.json`.

- [ ] **Step 3: Run staged ingestion and inspect rejects**

```powershell
npm.cmd run hotspots:ingest --prefix backend -- --manifest data/hotspots/source-manifest.json --batch-name core-2017-2026-v1
npm.cmd run hotspots:audit --prefix backend -- --batch core-2017-2026-v1 --json ../docs/audit/hotspot-source-coverage.json --markdown ../docs/audit/hotspot-corpus-audit.md
```

Expected: all stored evidence matches exact offsets; failed sources and rejected candidates are reported with a reason rather than silently skipped.

- [ ] **Step 4: Generate detailed drafts in bounded batches**

Run batches of at most 100 candidates, resume by cursor, and stop on provider or validation errors:

```powershell
npm.cmd run hotspots:draft --prefix backend -- --batch core-2017-2026-v1 --limit 100
```

After each run, audit that no row changed to `reviewed` or `published` and no model-produced field entered `collocation_evidence` or `source_documents`.

- [ ] **Step 5: Form review batches with concrete acceptance checks**

Divide candidates by primary theme and hot score into review batches of 100. `docs/audit/hotspot-review-batches.md` records batch ID, theme, score range, candidate count, missing-field count, evidence-tier distribution, reviewer decision count, and publication eligibility. Do not mark an uninspected batch reviewed.

- [ ] **Step 6: Meet the first-release evidence and content gates**

Before publishing, the audit must show:

- 3,000–5,000 reviewed candidates with every required teaching field;
- 17一级主题 each containing at least 100 reviewed candidates;
- 2017–2026 each year represented by verified S/A source documents and at least one staged candidate;
- 2022–2026 identified as the near-five-year priority layer in audit output and public ranking;
- every candidate has at least one exact S/A evidence item;
- every high-frequency candidate has evidence from two distinct documents or two distinct central sources;
- 0 duplicate `normalized_phrase` values;
- 0 AI-authored evidence fields;
- a random sample of at least 200 manually checked rows with at least 98% semantic accuracy.

If the gate is not met, keep the available records in `draft` or `reviewed` and publish none from the failing batch.

- [ ] **Step 7: Publish and verify one complete batch transaction**

Use the content-admin endpoint or a review import signed in as a content administrator. Rerun the corpus audit and verify published totals, evidence totals, theme distribution, and batch audit events.

- [ ] **Step 8: Commit only manifests and non-sensitive audit artifacts**

```powershell
git add backend/data/hotspots/source-manifest.json docs/audit/hotspot-source-coverage.json docs/audit/hotspot-corpus-audit.md docs/audit/hotspot-review-batches.md
git commit -m "data: stage verified hotspot source corpus"
```

Do not commit database dumps, scraped full articles, API keys, cookies, or local reviewer credentials.

---

### Task 10: Add the public topic list and detailed learning card

**Files:**
- Create: `src/types/hotspots.ts`
- Create: `src/services/hotspots.ts`
- Create: `src/views/hotspots/HotspotListView.vue`
- Create: `src/views/hotspots/HotspotDetailView.vue`
- Create: `tests/hotspot-components.test.mjs`
- Create: `tests/e2e/hotspots.spec.ts`
- Modify: `src/router/index.ts`
- Modify: `src/views/HomeView.vue`

**Interfaces:**
- `listHotspots(params)`, `getHotspot(id)`, and `listHotspotTopics()` call same-origin `/api/v1/hotspots`.
- Routes: `/hotspots` and `/hotspots/:id` are public.

- [ ] **Step 1: Define exact frontend DTOs**

```ts
export interface HotspotTopic {
  code: string
  name: string
  count: number
}

export interface HotspotSummary {
  id: string
  canonicalPhrase: string
  coreTerm: string
  primaryTopic: Pick<HotspotTopic, 'code' | 'name'>
  hotScore: number
  validity: 'current' | 'long_term' | 'historical'
}

export interface HotspotEvidence {
  publisher: string
  title: string
  publishedOn: string
  quoteText: string
  locatorText: string
  canonicalUrl: string
  authorityTier: 'S' | 'A' | 'B'
}

export interface HotspotDetail extends HotspotSummary {
  detailedMeaning: string
  applicableObjects: string[]
  usageContexts: string[]
  semanticFocus: string
  editorialExample: string
  commonMistake: string
  mistakeReason: string
  correctionAdvice: string
  variants: Array<{
    text: string
    relationType: 'expanded' | 'fixed_combination' | 'near_synonym' | 'confusable'
    differenceNote: string
  }>
  evidence: HotspotEvidence[]
  lastVerifiedAt: string
}
```

- [ ] **Step 2: Write failing component compile tests**

Parse and compile both new Vue files with `@vue/compiler-sfc`; assert that the list source contains `data-testid="hotspot-topic-list"` and the detail source contains `data-testid="hotspot-evidence"`, “适用对象”, “使用语境”, “易错用法”, and “权威原文”.

- [ ] **Step 3: Run compile tests and verify missing-file failure**

Run: `node --test tests/hotspot-components.test.mjs`

Expected: FAIL because the Vue files do not exist.

- [ ] **Step 4: Implement the screenshot-style list**

Preserve the existing mobile-first colors, rounded cards, spacing, and typography. The page includes search,一级主题 chips, current/long-term filter, total count, loading/error/empty states, and grouped lines such as “扩大内需、优化供给；做优增量、盘活存量”。Each phrase is a real button with an accessible name and routes to its detail.

- [ ] **Step 5: Implement the detailed learning card**

Render separate sections for detailed meaning, standard/expanded/fixed combinations, applicable objects, contexts, semantic focus, editorial example, misuse and correction, near/confusable expressions, and verified evidence. Label editorial material “学习解析”; label exact excerpts “权威原文”. External links open the canonical URL and show publisher/date/tier.

- [ ] **Step 6: Add routes and a subordinate home entry**

Add a “热点搭配” module card to the existing home learning modules without changing the bottom five-tab navigation. Add router entries before the catch-all route.

- [ ] **Step 7: Add Playwright API-contract coverage**

Intercept `/api/v1/hotspots/topics`, `/api/v1/hotspots`, and `/api/v1/hotspots/:id`. Verify topic filtering, navigation to the detail card, distinct “学习解析/权威原文” labels, and a visible canonical source link.

- [ ] **Step 8: Run frontend verification and commit**

Run: `node --test tests/hotspot-components.test.mjs`

Run: `npx.cmd vue-tsc --noEmit`

Run: `npx.cmd playwright test tests/e2e/hotspots.spec.ts`

Expected: compile, typecheck, and E2E tests PASS.

```powershell
git add src/types/hotspots.ts src/services/hotspots.ts src/views/hotspots/HotspotListView.vue src/views/hotspots/HotspotDetailView.vue src/router/index.ts src/views/HomeView.vue tests/hotspot-components.test.mjs tests/e2e/hotspots.spec.ts
git commit -m "feat: add hotspot collocation learning views"
```

---

### Task 11: Add the role-gated review workspace

**Files:**
- Create: `src/views/admin/HotspotReviewView.vue`
- Create: `tests/e2e/hotspot-review.spec.ts`
- Modify: `src/types/hotspots.ts`
- Modify: `src/services/hotspots.ts`
- Modify: `src/router/index.ts`

**Interfaces:**
- `listHotspotCandidates`, `reviewHotspotCandidate`, `publishHotspotBatch`, and `rollbackHotspotBatch` call `/api/v1/admin/hotspots`.
- Route `/admin/hotspots` requires login; the server remains the final role authority.

- [ ] **Step 1: Write failing E2E review tests**

Mock a reviewer session and candidate API. Verify the page shows source title/date/domain, exact quote with highlighted target phrase, teaching fields, missing-field warnings, and buttons “退回草稿”, “审核通过”, “驳回”. Verify a `403 CONTENT_ROLE_REQUIRED` response renders “当前账号没有内容审核权限” and exposes no mutation controls.

- [ ] **Step 2: Run the E2E test and verify failure**

Run: `npx.cmd playwright test tests/e2e/hotspot-review.spec.ts`

Expected: FAIL because the review route does not exist.

- [ ] **Step 3: Implement the review view**

Use a two-column desktop/tablet layout and a stacked mobile fallback. The source excerpt is read-only; only teaching fields and topic selection are editable. Every decision requires a nonempty note for reject/retire and displays the resulting audit event ID. Publish and rollback controls appear only when the API reports the current user as `content_admin`.

- [ ] **Step 4: Add types, service calls, and route**

Use `src/services/http.ts` so backend error codes remain available. Do not place the admin route in the public home card or bottom navigation.

- [ ] **Step 5: Run tests and commit**

Run: `npx.cmd playwright test tests/e2e/hotspot-review.spec.ts`

Run: `npx.cmd vue-tsc --noEmit`

Expected: E2E test and typecheck PASS.

```powershell
git add src/views/admin/HotspotReviewView.vue src/types/hotspots.ts src/services/hotspots.ts src/router/index.ts tests/e2e/hotspot-review.spec.ts
git commit -m "feat: add hotspot content review workspace"
```

---

### Task 12: Complete operational documentation and end-to-end verification

**Files:**
- Create: `docs/operations/hotspot-collocations.md`
- Modify: `package.json`
- Modify: `backend/package.json`
- Modify: `docs/audit/hotspot-corpus-audit.md`

**Interfaces:**
- Produces one documented, repeatable path from migration through audit and publish.

- [ ] **Step 1: Add unified verification scripts**

Root `package.json` receives:

```json
{
  "scripts": {
    "test:types": "vue-tsc --noEmit",
    "test:backend": "npm --prefix backend test",
    "test:hotspots": "node --test tests/hotspot-components.test.mjs && playwright test tests/e2e/hotspots.spec.ts tests/e2e/hotspot-review.spec.ts",
    "verify": "npm run test:types && npm run test:backend && npm run test:hotspots && npm run build"
  }
}
```

- [ ] **Step 2: Write the exact operator runbook**

Document environment variables, migration, backup, role grant, source-manifest rules, ingest, drafting, review import, admin review, audit, publish, rollback, link recheck, and secret rotation. Include these safe setup commands:

```powershell
Copy-Item backend/.env.example backend/.env
npm.cmd run migrate --prefix backend
npm.cmd run hotspots:ingest --prefix backend -- --manifest data/hotspots/source-manifest.json --batch-name core-2017-2026-v1
npm.cmd run hotspots:audit --prefix backend -- --batch core-2017-2026-v1
```

State explicitly that `DEVELOPMENT_STANDALONE=false` and reachable PostgreSQL/Redis are required for the formal content pipeline.

- [ ] **Step 3: Run the complete verification suite**

Run: `npm.cmd run verify`

Expected: Vue typecheck PASS, backend tests PASS, hotspot component/E2E tests PASS, and Vite production build PASS.

- [ ] **Step 4: Verify a live PostgreSQL batch**

Run migrations twice, ingest a test manifest containing the synthetic fixture through an injected fetch adapter, review one candidate, publish it, query it through `/api/v1/hotspots`, roll back the batch, and verify it disappears from the public API while its audit history remains.

- [ ] **Step 5: Perform page-by-page visual and interaction QA**

At mobile `390×844`, tablet `768×1024`, and desktop `1440×900`, verify list grouping, long Chinese phrases, search, topic chips, detail sections, external source links, review diff, keyboard focus, loading/error/empty states, and reduced motion. Save screenshots and the interaction report under `docs/qa/hotspots/`.

- [ ] **Step 6: Run a secret and forbidden-artifact scan**

```powershell
rg -n --hidden -g '!node_modules/**' -g '!backend/node_modules/**' -g '!.git/**' '\b[0-9a-f]{32}\.[A-Za-z0-9_-]{8,}\b|WECHAT_APP_SECRET=.+|ZHIPU_API_KEY=.+' .
git status --short
```

Expected: no live credentials, database dumps, scraped full articles, cookies, or unrelated generated artifacts are staged.

- [ ] **Step 7: Update the final audit and commit operations work**

The audit records total drafts/reviewed/published, all 17 theme counts, S/A/B source counts, evidence-per-collocation distribution, duplicate count, link failures, required-field failures, and the 200-row semantic sample result.

```powershell
git add package.json backend/package.json docs/operations/hotspot-collocations.md docs/audit/hotspot-corpus-audit.md docs/qa/hotspots
git commit -m "docs: verify hotspot corpus operations"
```

---

## Plan Self-Review

- Spec coverage: schema, 17 themes, source tiers, recent and long-term time ranges, exact evidence, normalized dedupe, heat scoring, AI draft isolation, role-based review, transactional publish/rollback, large corpus staging, public list/detail UI, review workspace, audits, source rechecks, security and visual QA each have an assigned task.
- Boundary check: SQLite is never a formal target; all public content comes from PostgreSQL and `published` rows only.
- Placeholder scan: implementation steps use exact files, interfaces, commands, error codes, constraints, test expectations and seed records; no unresolved field names or route names remain.
- Type consistency: backend uses `canonicalPhrase`, `coreTerm`, `primaryTopic`, `hotScore`, `validity`, `evidence`; frontend DTOs and E2E fixtures use the same names. Public routes use `/api/v1/hotspots`; review routes use `/api/v1/admin/hotspots`.
- Safety check: downloaded full text is processed for extraction and hashing but not committed; excerpts stay short and attributable; AI fields cannot enter evidence; publish and rollback are role-gated and transactional.
- Time coverage check: the required corpus spans every year from 2017 through 2026, while 2022–2026 is the explicitly prioritized near-five-year layer; no pre-2017-only evidence can support a formal record.
- Source fidelity check: HTML and PDF use one bounded parser contract; authority is based on issuer and document type, while official publication date, document date, and webpage timestamp remain distinct and auditable.
- Scale check: the pipeline can stage more than 10,000 rows, but the first publication remains gated at 3,000–5,000 reviewed records rather than automatically publishing machine output.

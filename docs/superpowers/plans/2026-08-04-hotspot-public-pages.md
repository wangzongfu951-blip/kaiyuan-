# 热点词公开版 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将热点词模块扩展为 66 条图片模板 + 667 条完整词库的可搜索学习页面，并通过 GitHub Pages 公开访问。

**Architecture:** SQLite 继续作为本地审校快照；导出脚本生成两个静态 JSON；Vue 热点页使用静态数据优先、后端 API 回退；GitHub Actions 负责导出、构建和 Pages 部署。

**Tech Stack:** Node.js ESM、better-sqlite3、Vue 3、TypeScript、Vite、Playwright、GitHub Actions。

## Global Constraints

- 默认图片模板必须按 `manual_image_seeds.json` 顺序展示 22 个词、66 条搭配。
- 完整词库必须展示现有 167 个热点词、667 条搭配；导出失败或字段不完整时构建失败。
- 模板行和详情卡不显示年份、来源编号等审计字段。
- 不提交与热点功能无关的现有工作区改动，不提交密钥、cookie 或临时脚本。
- GitHub Pages 公开版不依赖运行中的 Node/SQLite 服务；本地后端接口保留为开发回退。

---

### Task 1: 导出静态热点数据包

**Files:**
- Create: `backend/scripts/hotspots/export-static-corpus.mjs`
- Modify: `backend/package.json`
- Create: `public/data/hotspots-image.json`
- Create: `public/data/hotspots-full.json`
- Create: `backend/test/hotspot-static-export.test.mjs`

**Interfaces:**
- CLI: `npm.cmd run hotspots:export --prefix backend -- --output D:\kg\public\data`
- Exported JSON shape: `{ version: 1, preset: "image"|"full", total, generatedAt, rows }`.
- Each row exposes `id`, `hotTerm`, `collocation`, `theme`, `meaning`, `usageContext`, `modelSentence`, `examFunction`, and `commonErrors`.

- [ ] **Step 1: Write the failing export contract test**

```js
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('static hotspot exports contain both public presets', () => {
  const image = JSON.parse(fs.readFileSync('public/data/hotspots-image.json', 'utf8'))
  const full = JSON.parse(fs.readFileSync('public/data/hotspots-full.json', 'utf8'))
  assert.equal(image.total, 66)
  assert.equal(full.total, 667)
  assert.equal(image.rows[0].hotTerm, '城乡联动')
  assert.ok(full.rows.every((row) => row.id && row.hotTerm && row.collocation && row.meaning && row.usageContext && row.modelSentence))
})
```

- [ ] **Step 2: Run the contract test and verify the expected missing-file failure**

Run: `node --test backend/test/hotspot-static-export.test.mjs`

Expected: FAIL because the static export files and exporter do not exist yet.

- [ ] **Step 3: Implement the deterministic exporter**

Read `listHotspots({ preset: 'image', limit: 1000 })` and `listHotspots({ limit: 1000 })`, map only the public learning fields, assert totals 66 and 667, reject duplicate IDs and empty required fields, write UTF-8 JSON atomically, and call `closeHotspotsDb()` before exit.

- [ ] **Step 4: Add the package script and run the export**

Add:

```json
{
  "hotspots:export": "node scripts/hotspots/export-static-corpus.mjs"
}
```

Run: `npm.cmd run hotspots:export --prefix backend -- --output D:\kg\public\data`

Expected: both JSON files are written with the required counts.

- [ ] **Step 5: Run the export contract test and commit the bounded data change**

Run: `node --test backend/test/hotspot-static-export.test.mjs`

Expected: PASS with no empty required fields or duplicate IDs.

```powershell
git add backend/scripts/hotspots/export-static-corpus.mjs backend/package.json backend/test/hotspot-static-export.test.mjs public/data/hotspots-image.json public/data/hotspots-full.json
git commit -m "feat: export static hotspot learning data"
```

---

### Task 2: Add the dual-view static learning page

**Files:**
- Modify: `src/views/HotspotView.vue`
- Create: `src/services/hotspots-static.ts`
- Create: `tests/hotspots-static-view.test.mjs`

**Interfaces:**
- `loadStaticHotspots(preset): Promise<HotspotStaticRow[]>` fetches `/data/hotspots-image.json` or `/data/hotspots-full.json`.
- View state: `preset = 'image' | 'full'`, `query`, `activeTopic`, `visibleLimit`, `expandedId`.

- [ ] **Step 1: Add a failing source contract test**

Assert the view source contains two preset controls, `data-testid="hotspot-preset-image"`, `data-testid="hotspot-preset-full"`, the five detail labels, search, theme filtering, and a static JSON loader.

- [ ] **Step 2: Run the source contract test to verify it fails**

Run: `node --test tests/hotspots-static-view.test.mjs`

Expected: FAIL because the dual-view controls and static loader do not exist.

- [ ] **Step 3: Implement static-first loading and local filtering**

Load the selected JSON once, derive topics from rows, filter against `hotTerm`, `collocation`, `theme`, `meaning`, `usageContext`, and `modelSentence`, and paginate in memory. If static fetch fails during local development, call the existing `/api/hotspots` route and preserve the same DTO.

- [ ] **Step 4: Implement the visible controls and detail card**

Keep the existing image-style typography and red underline. Add accessible buttons for the two presets, show the current count, render theme chips only for the full preset, and keep years/source fields out of the template. Detail expansion must show `词义`, `用法与语境`, `示例`, `考场用法`, and `常见误用`.

- [ ] **Step 5: Run the source contract and typecheck**

Run: `node --test tests/hotspots-static-view.test.mjs`

Run: `npx.cmd vue-tsc --noEmit`

Expected: both PASS.

- [ ] **Step 6: Commit the dual-view page**

```powershell
git add src/views/HotspotView.vue src/services/hotspots-static.ts tests/hotspots-static-view.test.mjs
git commit -m "feat: add full hotspot library view"
```

---

### Task 3: Configure GitHub Pages build and SPA refresh

**Files:**
- Modify: `vite.config.ts`
- Modify: `package.json`
- Create: `.github/workflows/deploy-pages.yml`
- Create: `public/404.html`
- Create: `docs/operations/hotspot-github-pages.md`

**Interfaces:**
- Build reads `VITE_BASE_PATH` and defaults to `/` locally.
- Workflow runs on `main` pushes and manual dispatch, then deploys `dist` with `actions/deploy-pages`.

- [ ] **Step 1: Add a failing build-path check**

Build with `VITE_BASE_PATH=/hotspot-demo/` and assert `dist/index.html` references the base path and `dist/404.html` exists.

- [ ] **Step 2: Implement base-path-aware Vite config and router fallback**

Use `base: process.env.VITE_BASE_PATH || '/'`, configure the router with `import.meta.env.BASE_URL`, and add a static 404 fallback that preserves the SPA entry. Keep local development at `http://127.0.0.1:5173`.

- [ ] **Step 3: Add the Pages workflow**

The workflow installs root dependencies, installs backend dependencies, exports static data, runs export verification, builds with the repository name as `VITE_BASE_PATH`, uploads `dist`, and deploys Pages. It must not require secrets for the public hotspot page.

- [ ] **Step 4: Document repository settings and URL format**

Document enabling Pages with GitHub Actions and the final URL format; explicitly state that the public static scope is the hotspot module and that authenticated backend modules still require the local/server deployment.

- [ ] **Step 5: Run the build-path test and production build**

Run: `npm.cmd run build`

Expected: Vite build exits 0 and `dist/404.html` is present.

- [ ] **Step 6: Commit deployment configuration**

```powershell
git add vite.config.ts package.json .github/workflows/deploy-pages.yml public/404.html docs/operations/hotspot-github-pages.md
git commit -m "ci: publish hotspot page to GitHub Pages"
```

---

### Task 4: Run end-to-end verification and visual QA

**Files:**
- Create: `tests/e2e/hotspots-static.spec.ts`
- Modify: `docs/qa/hotspots/hotspot-mobile.png`
- Create: `docs/qa/hotspots/hotspot-full-library.png`

**Interfaces:**
- Playwright starts Vite with the exported JSON and exercises `/hotspots` without the backend.

- [ ] **Step 1: Add failing browser scenarios**

Cover default image count/order, red-underlined terms, switching to full library, search for a known full-library term, topic filtering, load-more, click-to-expand detail labels, and absence of visible `年份`/`来源` labels.

- [ ] **Step 2: Run the scenarios before implementation and record the expected failure**

Run: `npx.cmd playwright test tests/e2e/hotspots-static.spec.ts`

Expected: FAIL until Tasks 1–3 are implemented.

- [ ] **Step 3: Run the complete verification set**

Run: `npm.cmd run hotspots:verify --prefix backend`

Run: `node --test backend/test/hotspot-static-export.test.mjs tests/hotspots-static-view.test.mjs`

Run: `npx.cmd vue-tsc --noEmit`

Run: `npm.cmd test --prefix backend`

Run: `npx.cmd playwright test tests/e2e/hotspots-static.spec.ts`

Run: `npm.cmd run build`

- [ ] **Step 4: Inspect mobile screenshots**

Capture 390×844 screenshots for both presets and inspect them with the image viewer. Confirm long Chinese phrases wrap, controls remain reachable, and the fixed navigation does not cover the active row.

- [ ] **Step 5: Commit QA artifacts and documentation**

```powershell
git add tests/e2e/hotspots-static.spec.ts docs/qa/hotspots
git commit -m "test: verify hotspot static learning flows"
```

---

### Task 5: Publish the scoped branch to GitHub

**Files:**
- Only the files from Tasks 1–4 and the approved hotspot documentation.

- [ ] **Step 1: Confirm scoped status and remote**

Run `git status -sb`, `git diff --cached --stat`, and `git remote -v`. Do not stage unrelated files. If no remote exists, stop and request the repository URL.

- [ ] **Step 2: Create a scoped release branch if still on the default branch**

Use `agent/hotspot-pages` when the current branch is the repository default; otherwise preserve the current feature branch and publish only the explicit hotspot paths.

- [ ] **Step 3: Run the final verification before staging**

Run the complete command set from Task 4 and record exit codes.

- [ ] **Step 4: Stage and commit only hotspot files**

Use explicit paths; never use `git add -A` in this mixed worktree.

- [ ] **Step 5: Push with tracking and enable Pages**

Push the scoped branch or default branch according to the confirmed repository workflow. GitHub CLI authentication or a connected GitHub app is required for PR/Pages setup; report the exact blocker if credentials or repository URL are missing.

- [ ] **Step 6: Verify the public URL**

Open the final Pages URL, check the home link and `/hotspots`, switch presets, search, filter, expand an explanation, refresh, and confirm no 404 or API dependency.

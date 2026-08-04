import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const root = path.resolve(import.meta.dirname, '../..')
const outputDir = path.join(root, 'docs', 'qa')
fs.mkdirSync(outputDir, { recursive: true })

const browser = await chromium.launch({
  channel: 'msedge',
  headless: true,
  timeout: 10_000,
})

try {
  const sourcePage = await browser.newPage({
    viewport: { width: 1200, height: 900 },
    deviceScaleFactor: 1,
  })
  const sourceHtml = fs.readFileSync(
    path.join(
      root,
      '.superpowers',
      'brainstorm',
      'ui-20260724-112752',
      'content',
      'visual-style.html',
    ),
    'utf8',
  )
  await sourcePage.setContent(
    `<!doctype html><html lang="zh-CN"><body>${sourceHtml}</body></html>`,
  )
  await sourcePage.locator('.direction.b .phone').screenshot({
    path: path.join(outputDir, 'source-direction-b-mobile.png'),
  })

  const implementationPage = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
  })
  const consoleErrors = []
  implementationPage.on('console', (message) => {
    const text = message.text()
    const expectedGuestResponse =
      message.type() === 'error' &&
      /Failed to load resource.*401 \(Unauthorized\)/.test(text)
    if (message.type() === 'error' && !expectedGuestResponse) {
      consoleErrors.push(text)
    }
  })
  implementationPage.on('pageerror', (error) => {
    consoleErrors.push(error.message)
  })
  await implementationPage.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: false,
        error: { code: 'AUTH_REQUIRED', message: '请先登录' },
      }),
    })
  })
  await implementationPage.goto('http://127.0.0.1:4173/login', {
    waitUntil: 'networkidle',
    timeout: 15_000,
  })
  await implementationPage.screenshot({
    path: path.join(outputDir, 'implementation-login-390x844.png'),
    fullPage: true,
  })
  await implementationPage.locator('.login-card').screenshot({
    path: path.join(outputDir, 'implementation-login-card.png'),
  })
  await implementationPage.getByRole('button', {
    name: '没有账号，立即注册',
  }).click()
  await implementationPage.screenshot({
    path: path.join(outputDir, 'implementation-register-390x844.png'),
    fullPage: true,
  })
  if (consoleErrors.length) {
    throw new Error(`Browser console errors: ${consoleErrors.join(' | ')}`)
  }

  const source = fs.readFileSync(
    path.join(outputDir, 'source-direction-b-mobile.png'),
  ).toString('base64')
  const implementation = fs.readFileSync(
    path.join(outputDir, 'implementation-login-390x844.png'),
  ).toString('base64')
  const background = fs.readFileSync(
    path.join(root, 'public', 'assets', 'auth-liquid-glass-bg.png'),
  ).toString('base64')

  const comparisonPage = await browser.newPage({
    viewport: { width: 1200, height: 980 },
    deviceScaleFactor: 1,
  })
  await comparisonPage.setContent(`<!doctype html>
    <html lang="zh-CN">
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; padding: 30px; background: #eef1f6; font-family: system-ui, sans-serif; color: #1d2538; }
          h1 { margin: 0 0 22px; font-size: 24px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; }
          .panel { padding: 20px; border-radius: 22px; background: #fff; box-shadow: 0 12px 36px rgba(31,42,78,.1); }
          h2 { margin: 0 0 14px; font-size: 16px; }
          .source-row { display: grid; grid-template-columns: 242px 1fr; gap: 16px; align-items: start; }
          .mock { width: 242px; }
          .bg { width: 100%; height: 442px; object-fit: cover; border-radius: 18px; }
          .implementation { display: block; width: 390px; max-width: 100%; margin: 0 auto; border-radius: 22px; }
          p { margin: 12px 0 0; color: #707b92; font-size: 12px; line-height: 1.6; }
        </style>
      </head>
      <body>
        <h1>昭途移动端登录视觉对照</h1>
        <div class="grid">
          <section class="panel">
            <h2>设计来源：方案 B + 用户确认的极简液态玻璃背景</h2>
            <div class="source-row">
              <img class="mock" src="data:image/png;base64,${source}" />
              <img class="bg" src="data:image/png;base64,${background}" />
            </div>
            <p>方案 B 负责蓝紫品牌、圆角和信息层级；最终背景按用户反馈收敛为近乎纯浅灰白的边缘玻璃折射。</p>
          </section>
          <section class="panel">
            <h2>实现：390 × 844 手机登录页</h2>
            <img class="implementation" src="data:image/png;base64,${implementation}" />
          </section>
        </div>
      </body>
    </html>`)
  await comparisonPage.screenshot({
    path: path.join(outputDir, 'login-design-comparison.png'),
    fullPage: true,
  })
} finally {
  await browser.close()
}

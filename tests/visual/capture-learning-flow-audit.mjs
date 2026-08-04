import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const root = path.resolve(import.meta.dirname, '../..')
const outputDir = path.join(root, 'docs', 'audit', '2026-07-24-learning-flow-before')
fs.mkdirSync(outputDir, { recursive: true })

const browser = await chromium.launch({
  channel: 'msedge',
  headless: true,
})

const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
})

const consoleErrors = []
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text())
})
page.on('pageerror', (error) => consoleErrors.push(error.message))

await page.addInitScript(() => {
  const today = new Date().toISOString().slice(0, 10)
  localStorage.setItem('plan', JSON.stringify({
    dailyTarget: 20,
    startDate: today,
    learned: ['披荆斩棘', '来日大难', '儿女亲家'],
    reviewing: [],
  }))
  localStorage.setItem('reviews', JSON.stringify([
    {
      idiom: '披荆斩棘',
      level: 0,
      lastReview: today,
      nextReview: today,
    },
    {
      idiom: '来日大难',
      level: 3,
      lastReview: today,
      nextReview: today,
    },
    {
      idiom: '儿女亲家',
      level: 5,
      lastReview: today,
      nextReview: today,
    },
  ]))
})

async function stableScreenshot(name) {
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(650)
  await page.screenshot({
    path: path.join(outputDir, name),
    fullPage: false,
  })
}

try {
  await page.goto('http://127.0.0.1:4173/login')
  await page.getByTestId('fill-test-account').click()
  await page.getByTestId('account-login').click()
  await page.waitForURL('http://127.0.0.1:4173/')
  await stableScreenshot('01-home-overlap.png')

  await page.locator('header button').first().click()
  await page.waitForURL('**/plan')
  await stableScreenshot('02-plan-fixed-targets.png')

  await page.locator('header button').first().click()
  await page.waitForURL('http://127.0.0.1:4173/')
  await page.getByText('今日成语挑战', { exact: true }).click()
  await page.waitForURL('**/quiz/idiom-usage')
  await stableScreenshot('03-challenge-entry.png')

  await page.getByText('返回', { exact: true }).click()
  await page.waitForURL('http://127.0.0.1:4173/')
  await page.getByRole('link', { name: '复习' }).click()
  await page.waitForURL('**/review')
  await stableScreenshot('04-review-static-curve.png')

  await page.getByRole('button', { name: /详情/ }).click()
  await page.waitForURL('**/review-center')
  await stableScreenshot('05-review-center-static-curve.png')

  fs.writeFileSync(
    path.join(outputDir, 'console-errors.json'),
    JSON.stringify(consoleErrors, null, 2),
  )
} finally {
  await browser.close()
}

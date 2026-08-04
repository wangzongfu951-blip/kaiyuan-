import path from 'node:path'
import { chromium } from 'playwright'

const browser = await chromium.connectOverCDP('http://127.0.0.1:9222')
const pages = browser.contexts().flatMap((context) => context.pages())
const page = pages.find((candidate) =>
  candidate.url().includes('127.0.0.1:4173'),
) || pages.find((candidate) => candidate.url().startsWith('http'))

if (!page) {
  throw new Error('没有找到手机上的昭途登录页')
}

await page.bringToFront()
await page.evaluate(async () => {
  await fetch('/api/v1/auth/logout', {
    method: 'POST',
    credentials: 'include',
  })
})
await page.goto('http://127.0.0.1:4173/login', {
  waitUntil: 'domcontentloaded',
  timeout: 15_000,
})
await page.waitForTimeout(1_000)

const existingSession = await page.evaluate(async () => {
  const response = await fetch('/api/v1/auth/me', { credentials: 'include' })
  return {
    status: response.status,
    body: await response.json(),
  }
})

if (
  existingSession.status === 200 &&
  existingSession.body?.data?.user?.displayName === 'test_study'
) {
  await page.screenshot({
    path: path.resolve(
      import.meta.dirname,
      '../../docs/qa/physical-account-authenticated.png',
    ),
  })
  console.log(JSON.stringify({
    device: 'V2405A',
    account: 'test_study',
    status: existingSession.status,
    redirectedTo: new URL(page.url()).pathname,
    user: existingSession.body.data.user.displayName,
    identities: existingSession.body.data.user.identities,
    reusedSession: true,
  }))
  process.exit(0)
}

await page.getByTestId('fill-test-account').waitFor({
  state: 'visible',
  timeout: 15_000,
})
await page.getByTestId('fill-test-account').click({ force: true })

const account = await page.getByTestId('account-input').inputValue()
const password = await page.getByTestId('account-password').inputValue()
if (account !== 'test_study' || password !== 'Study2026!') {
  throw new Error('测试账号未正确填入')
}

const responsePromise = page.waitForResponse(
  (response) =>
    response.url().includes('/api/v1/auth/account/login') &&
    response.request().method() === 'POST',
)
await page.getByTestId('account-login').click()
const response = await responsePromise
const body = await response.json()

if (response.status() !== 200 || body?.ok !== true) {
  throw new Error(
    `手机账号登录失败：${response.status()} ${JSON.stringify(body)}`,
  )
}

await page.waitForURL((url) => !url.pathname.startsWith('/login'))
await page.getByText('距 2026 国考', { exact: true }).waitFor({
  state: 'visible',
  timeout: 15_000,
})
await page.waitForFunction(() => window.scrollY === 0)
await page.waitForTimeout(700)
await page.screenshot({
  path: path.resolve(
    import.meta.dirname,
    '../../docs/qa/physical-account-authenticated.png',
  ),
})

console.log(JSON.stringify({
  device: 'V2405A',
  account,
  status: response.status(),
  redirectedTo: new URL(page.url()).pathname,
  user: body.data.user.displayName,
  identities: body.data.user.identities,
}))
process.exit(0)

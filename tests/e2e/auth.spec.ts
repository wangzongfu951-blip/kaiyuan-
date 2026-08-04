import { expect, test } from 'playwright/test'

test('guest completes Chinese phone login and returns to learning', async ({
  page,
}) => {
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: false,
        error: { code: 'AUTH_REQUIRED', message: '请先登录' },
      }),
    })
  })
  await page.route('**/api/v1/auth/phone/code', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        data: { sent: true, developmentCode: '246810' },
      }),
    })
  })
  await page.route('**/api/v1/auth/phone/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        data: {
          user: {
            id: 'user-1',
            displayName: '昭途用户',
            phone: '138****8000',
            identities: ['phone'],
          },
          expiresAt: '2026-08-23T00:00:00.000Z',
        },
      }),
    })
  })

  await page.goto('/review')
  await expect(page).toHaveURL(/\/login\?redirect=\/review/)
  await expect(page.getByRole('heading', { name: '登录后继续今日学习' }))
    .toBeVisible()

  await page.getByRole('tab', { name: '手机号登录' }).click()
  await page.getByTestId('phone-input').fill('12345')
  await page.getByTestId('request-code').click()
  await expect(page.getByRole('alert')).toContainText(
    '请输入正确的 11 位手机号',
  )

  await page.getByTestId('phone-input').fill('13800138000')
  await page.getByTestId('request-code').click()
  await expect(page.getByTestId('code-input')).toBeVisible()
  await page.getByTestId('code-input').fill('246810')
  await page.getByTestId('phone-login').click()

  await expect(page).toHaveURL(/\/review$/)
  await expect(page.getByText('智能复习')).toBeVisible()
})

test('development test account can be filled and logged in with one tap', async ({
  page,
}) => {
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: false,
        error: { code: 'AUTH_REQUIRED', message: '请先登录' },
      }),
    })
  })
  await page.route('**/api/v1/auth/account/login', async (route) => {
    const input = route.request().postDataJSON()
    expect(input.account).toBe('test_study')
    expect(input.password).toBe('Study2026!')
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        data: {
          user: {
            id: 'development-user',
            displayName: 'test_study',
            identities: ['account', 'email'],
          },
          expiresAt: '2026-08-23T00:00:00.000Z',
        },
      }),
    })
  })

  await page.goto('/login')
  await page.getByTestId('fill-test-account').click()
  await expect(page.getByTestId('account-input')).toHaveValue('test_study')
  await page.getByTestId('account-login').click()
  await expect(page).toHaveURL(/\/$/)
})

test('new account registration requires a verified email binding', async ({
  page,
}) => {
  await page.route('**/api/v1/auth/me', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: false,
        error: { code: 'AUTH_REQUIRED', message: '请先登录' },
      }),
    })
  })
  await page.route('**/api/v1/auth/account/code', async (route) => {
    const input = route.request().postDataJSON()
    expect(input.bindingType).toBe('email')
    expect(input.bindingValue).toBe('learner@example.com')
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        data: { sent: true, developmentCode: '135790' },
      }),
    })
  })
  await page.route('**/api/v1/auth/account/register', async (route) => {
    const input = route.request().postDataJSON()
    expect(input.bindingType).toBe('email')
    expect(input.code).toBe('135790')
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        data: {
          user: {
            id: 'registered-user',
            displayName: 'learner_2026',
            email: 'l***r@example.com',
            identities: ['account', 'email'],
          },
          expiresAt: '2026-08-23T00:00:00.000Z',
        },
      }),
    })
  })

  await page.goto('/login')
  await page.getByRole('button', { name: '没有账号，立即注册' }).click()
  await page.getByTestId('account-input').fill('learner_2026')
  await page.getByTestId('account-password').fill('Memory2026!')
  await page.getByTestId('confirm-password').fill('Memory2026!')
  await page.getByRole('button', { name: '绑定邮箱' }).click()
  await page.getByTestId('binding-input').fill('learner@example.com')
  await page.getByTestId('registration-code-button').click()
  await expect(page.getByText('本地调试验证码：135790')).toBeVisible()
  await page.getByTestId('registration-code').fill('135790')
  await page.getByTestId('account-register').click()
  await expect(page).toHaveURL(/\/$/)
})

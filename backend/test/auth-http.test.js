import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createApp } from '../src/app.js'
import { createAuthRouter } from '../src/auth/auth-router.js'
import { normalizeChinaPhone } from '../src/auth/phone.js'

const productionConfig = Object.freeze({
  nodeEnv: 'production',
  appOrigin: 'https://app.example.test',
  cookieName: 'zt_session',
  sessionTtlDays: 30,
})

class FakeAuthService {
  constructor() {
    this.revoked = []
    this.phoneBindings = []
  }

  async requestPhoneCode(phone) {
    normalizeChinaPhone(phone)
    return { developmentCode: '246810' }
  }

  async loginWithPhone({ phone }) {
    normalizeChinaPhone(phone)
    return {
      user: {
        id: 'user-1',
        displayName: '昭途用户',
        identities: ['phone'],
      },
      sessionToken: 'opaque-session-token',
      expiresAt: '2026-08-23T00:00:00.000Z',
    }
  }

  async authenticateSession(token) {
    if (token !== 'valid-token') return null
    return {
      id: 'user-1',
      displayName: '昭途用户',
      identities: ['phone'],
    }
  }

  async logout(token) {
    this.revoked.push(token)
  }

  async logoutAll() {
    return 2
  }

  async bindPhone(userId, input) {
    this.phoneBindings.push({ userId, ...input })
    return { bound: true, alreadyBound: false }
  }

  async requestRegistrationCode(input) {
    this.registrationCodeRequest = input
    return { developmentCode: '135790' }
  }

  async registerWithAccount(input) {
    this.registrationInput = input
    return {
      user: {
        id: 'account-user-1',
        displayName: input.account,
        identities: ['account', input.bindingType],
      },
      sessionToken: 'account-registration-token',
      expiresAt: '2026-08-23T00:00:00.000Z',
    }
  }

  async loginWithAccount(input) {
    this.accountLoginInput = input
    return {
      user: {
        id: 'account-user-1',
        displayName: input.account,
        identities: ['account', 'phone'],
      },
      sessionToken: 'account-login-token',
      expiresAt: '2026-08-23T00:00:00.000Z',
    }
  }
}

function makeRouter({
  config = productionConfig,
  authService = new FakeAuthService(),
} = {}) {
  const createdStates = []
  return {
    authService,
    createdStates,
    router: createAuthRouter({
      authService,
      wechatProvider: {
        createAuthorizeUrl(_mode, state) {
          return `https://open.weixin.qq.com/mock?state=${state}`
        },
      },
      oauthStateStore: {
        async create(context) {
          createdStates.push(context)
          return 'oauth-state'
        },
        async consume() {
          return 'mobile'
        },
      },
      config,
    }),
  }
}

async function withServer(t, router) {
  const app = createApp({ authRouter: router })
  const server = app.listen(0, '127.0.0.1')
  t.after(() => server.close())
  await once(server, 'listening')
  return `http://127.0.0.1:${server.address().port}/api/v1/auth`
}

test('invalid phone returns a Chinese 400 response', async (t) => {
  const { router } = makeRouter()
  const origin = await withServer(t, router)
  const response = await fetch(`${origin}/phone/code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '12345' }),
  })
  const body = await response.json()

  assert.equal(response.status, 400)
  assert.equal(body.error.code, 'INVALID_PHONE')
  assert.equal(body.error.message, '手机号格式不正确')
})

test('production OTP response never returns a development code', async (t) => {
  const { router } = makeRouter()
  const origin = await withServer(t, router)
  const response = await fetch(`${origin}/phone/code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '13800138000' }),
  })
  const body = await response.json()

  assert.equal(response.status, 200)
  assert.deepEqual(body, { ok: true, data: { sent: true } })
  assert.doesNotMatch(JSON.stringify(body), /246810/)
})

test('phone login sets an HttpOnly secure session cookie', async (t) => {
  const { router } = makeRouter()
  const origin = await withServer(t, router)
  const response = await fetch(`${origin}/phone/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: '13800138000',
      code: '246810',
      deviceName: '手机',
    }),
  })
  const body = await response.json()
  const cookie = response.headers.get('set-cookie')

  assert.equal(response.status, 200)
  assert.equal(body.data.user.id, 'user-1')
  assert.doesNotMatch(JSON.stringify(body), /opaque-session-token/)
  assert.match(cookie, /^zt_session=opaque-session-token/)
  assert.match(cookie, /HttpOnly/i)
  assert.match(cookie, /Secure/i)
  assert.match(cookie, /SameSite=Lax/i)
})

test('/me returns 401 without a valid cookie and user data with one', async (t) => {
  const { router } = makeRouter()
  const origin = await withServer(t, router)

  const guestResponse = await fetch(`${origin}/me`)
  assert.equal(guestResponse.status, 401)

  const userResponse = await fetch(`${origin}/me`, {
    headers: { Cookie: 'zt_session=valid-token' },
  })
  const body = await userResponse.json()
  assert.equal(userResponse.status, 200)
  assert.equal(body.data.user.id, 'user-1')
})

test('logout revokes the current token and clears its cookie', async (t) => {
  const { router, authService } = makeRouter()
  const origin = await withServer(t, router)
  const response = await fetch(`${origin}/logout`, {
    method: 'POST',
    headers: { Cookie: 'zt_session=valid-token' },
  })
  const cookie = response.headers.get('set-cookie')

  assert.equal(response.status, 200)
  assert.deepEqual(authService.revoked, ['valid-token'])
  assert.match(cookie, /^zt_session=/)
  assert.match(cookie, /Expires=Thu, 01 Jan 1970 00:00:00 GMT/i)
})

test('WeChat URL endpoint stores state and returns an authorization URL', async (t) => {
  const { router } = makeRouter()
  const origin = await withServer(t, router)
  const response = await fetch(`${origin}/wechat/url?mode=mobile`)
  const body = await response.json()

  assert.equal(response.status, 200)
  assert.equal(
    body.data.url,
    'https://open.weixin.qq.com/mock?state=oauth-state',
  )
})

test('phone identity binding requires login and verifies through the service', async (t) => {
  const { router, authService } = makeRouter()
  const origin = await withServer(t, router)
  const payload = JSON.stringify({
    phone: '13800138000',
    code: '246810',
  })

  const guest = await fetch(`${origin}/phone/bind`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
  })
  assert.equal(guest.status, 401)

  const response = await fetch(`${origin}/phone/bind`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: 'zt_session=valid-token',
    },
    body: payload,
  })
  const body = await response.json()

  assert.equal(response.status, 200)
  assert.equal(body.data.bound, true)
  assert.deepEqual(authService.phoneBindings, [{
    userId: 'user-1',
    phone: '13800138000',
    code: '246810',
  }])
})

test('WeChat binding URL requires login and stores binding context', async (t) => {
  const { router, createdStates } = makeRouter()
  const origin = await withServer(t, router)

  const guest = await fetch(`${origin}/wechat/url?mode=mobile&purpose=bind`)
  assert.equal(guest.status, 401)

  const response = await fetch(
    `${origin}/wechat/url?mode=mobile&purpose=bind`,
    { headers: { Cookie: 'zt_session=valid-token' } },
  )

  assert.equal(response.status, 200)
  assert.deepEqual(createdStates.at(-1), {
    mode: 'mobile',
    purpose: 'bind',
    userId: 'user-1',
  })
})

test('account registration code and login endpoints hide secrets from responses', async (t) => {
  const { router, authService } = makeRouter()
  const origin = await withServer(t, router)

  const codeResponse = await fetch(`${origin}/account/code`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bindingType: 'email',
      bindingValue: 'learner@example.com',
    }),
  })
  const codeBody = await codeResponse.json()
  assert.deepEqual(codeBody, { ok: true, data: { sent: true } })
  assert.doesNotMatch(JSON.stringify(codeBody), /135790/)

  const loginResponse = await fetch(`${origin}/account/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      account: 'study_user',
      password: 'memory2026',
      deviceName: '手机',
    }),
  })
  const loginBody = await loginResponse.json()
  assert.equal(loginResponse.status, 200)
  assert.equal(loginBody.data.user.id, 'account-user-1')
  assert.doesNotMatch(JSON.stringify(loginBody), /account-login-token/)
  assert.match(
    loginResponse.headers.get('set-cookie'),
    /^zt_session=account-login-token/,
  )
  assert.equal(authService.accountLoginInput.account, 'study_user')
})

test('account registration requires binding fields and starts a session', async (t) => {
  const { router, authService } = makeRouter()
  const origin = await withServer(t, router)
  const missingBinding = await fetch(`${origin}/account/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      account: 'study_user',
      password: 'memory2026',
    }),
  })
  assert.equal(missingBinding.status, 400)

  const response = await fetch(`${origin}/account/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      account: 'study_user',
      password: 'memory2026',
      bindingType: 'phone',
      bindingValue: '13800138000',
      code: '246810',
      deviceName: '手机',
    }),
  })
  const body = await response.json()

  assert.equal(response.status, 200)
  assert.equal(body.data.user.id, 'account-user-1')
  assert.match(
    response.headers.get('set-cookie'),
    /^zt_session=account-registration-token/,
  )
  assert.equal(authService.registrationInput.bindingType, 'phone')
})

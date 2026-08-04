import test from 'node:test'
import assert from 'node:assert/strict'
import { WechatProvider } from '../src/auth/wechat-provider.js'
import { AuthService } from '../src/auth/auth-service.js'
import { hashToken } from '../src/auth/token.js'

function createProvider(fetchFn = async () => {
  throw new Error('unexpected fetch')
}) {
  return new WechatProvider({
    appId: 'wx-app-id',
    appSecret: 'server-only-secret',
    redirectUri: 'https://example.test/auth/wechat/callback',
    fetchFn,
  })
}

test('builds mobile and QR WeChat authorization URLs without exposing secret', () => {
  const provider = createProvider()
  const mobile = new URL(provider.createAuthorizeUrl('mobile', 'state-mobile'))
  const qr = new URL(provider.createAuthorizeUrl('qr', 'state-qr'))

  assert.equal(
    mobile.origin + mobile.pathname,
    'https://open.weixin.qq.com/connect/oauth2/authorize',
  )
  assert.equal(mobile.searchParams.get('scope'), 'snsapi_userinfo')
  assert.equal(mobile.searchParams.get('state'), 'state-mobile')
  assert.equal(
    qr.origin + qr.pathname,
    'https://open.weixin.qq.com/connect/qrconnect',
  )
  assert.equal(qr.searchParams.get('scope'), 'snsapi_login')
  assert.equal(qr.searchParams.get('state'), 'state-qr')
  assert.doesNotMatch(`${mobile}${qr}`, /server-only-secret/)
})

test('requires state before creating an authorization URL', () => {
  const provider = createProvider()
  assert.throws(
    () => provider.createAuthorizeUrl('mobile', ''),
    /微信授权状态无效/,
  )
})

test('exchanges a WeChat code for a normalized identity profile', async () => {
  const calls = []
  const responses = [
    {
      access_token: 'access-token',
      openid: 'openid-1',
      unionid: 'unionid-1',
    },
    {
      openid: 'openid-1',
      unionid: 'unionid-1',
      nickname: '晨读用户',
      headimgurl: 'https://example.test/avatar.png',
    },
  ]
  const provider = createProvider(async (url) => {
    calls.push(String(url))
    return {
      ok: true,
      async json() {
        return responses.shift()
      },
    }
  })

  const identity = await provider.exchangeCode('authorization-code')

  assert.deepEqual(identity, {
    provider: 'wechat',
    subject: 'unionid-1',
    profile: {
      openid: 'openid-1',
      unionid: 'unionid-1',
      nickname: '晨读用户',
      avatarUrl: 'https://example.test/avatar.png',
    },
  })
  assert.equal(calls.length, 2)
  assert.match(calls[0], /authorization-code/)
  assert.match(calls[1], /openid-1/)
})

test('converts WeChat provider failures to a safe Chinese error', async () => {
  const provider = createProvider(async () => ({
    ok: true,
    async json() {
      return { errcode: 40029, errmsg: 'invalid code and internal detail' }
    },
  }))

  await assert.rejects(
    provider.exchangeCode('bad-code'),
    (error) => {
      assert.equal(error.code, 'WECHAT_AUTH_FAILED')
      assert.equal(error.message, '微信授权失败，请重新尝试')
      assert.doesNotMatch(error.message, /internal detail/)
      return true
    },
  )
})

class FakeWechatRepository {
  constructor() {
    this.owners = new Map([['wechat:owned-unionid', 'user-2']])
    this.sessions = []
    this.created = 0
  }

  async findIdentityOwner(identity) {
    return this.owners.get(`${identity.provider}:${identity.subject}`) || null
  }

  async addIdentity(userId, identity) {
    this.owners.set(`${identity.provider}:${identity.subject}`, userId)
    return true
  }

  async findOrCreateIdentity(identity) {
    const key = `${identity.provider}:${identity.subject}`
    let userId = this.owners.get(key)
    if (!userId) {
      this.created += 1
      userId = `wechat-user-${this.created}`
      this.owners.set(key, userId)
    }
    return {
      id: userId,
      displayName: identity.profile.nickname,
      avatarUrl: identity.profile.avatarUrl,
      identities: ['wechat'],
    }
  }

  async createSession(session) {
    this.sessions.push(session)
  }
}

test('rejects binding a WeChat identity owned by another user', async () => {
  const repository = new FakeWechatRepository()
  const service = new AuthService({ repository })

  await assert.rejects(
    service.bindIdentity('user-1', {
      provider: 'wechat',
      subject: 'owned-unionid',
      profile: {},
    }),
    (error) => {
      assert.equal(error.status, 409)
      assert.equal(error.code, 'IDENTITY_ALREADY_BOUND')
      return true
    },
  )
})

test('logs in with WeChat and persists only the session token hash', async () => {
  const repository = new FakeWechatRepository()
  const service = new AuthService({
    repository,
    sessionTtlDays: 30,
    now: () => new Date('2026-07-24T00:00:00.000Z'),
  })

  const result = await service.loginWithWechat({
    provider: 'wechat',
    subject: 'new-unionid',
    profile: {
      nickname: '微信用户',
      avatarUrl: 'https://example.test/wx.png',
    },
  }, '手机微信')

  assert.equal(result.user.displayName, '微信用户')
  assert.equal(repository.sessions.length, 1)
  assert.notEqual(repository.sessions[0].tokenHash, result.sessionToken)
  assert.equal(
    repository.sessions[0].tokenHash,
    hashToken(result.sessionToken),
  )
})

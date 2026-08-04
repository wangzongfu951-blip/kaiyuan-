import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeChinaPhone, maskPhone } from '../src/auth/phone.js'
import { createToken, hashToken } from '../src/auth/token.js'
import { OtpStore } from '../src/auth/otp-store.js'
import { AuthService } from '../src/auth/auth-service.js'

class FakeRedis {
  constructor() {
    this.values = new Map()
    this.expirations = new Map()
  }

  purge(key) {
    const expiry = this.expirations.get(key)
    if (expiry && expiry <= Date.now()) {
      this.values.delete(key)
      this.expirations.delete(key)
    }
  }

  async get(key) {
    this.purge(key)
    return this.values.get(key) ?? null
  }

  async set(key, value, options = {}) {
    this.purge(key)
    if (options.NX && this.values.has(key)) return null
    this.values.set(key, String(value))
    if (options.EX) this.expirations.set(key, Date.now() + options.EX * 1000)
    return 'OK'
  }

  async del(...keys) {
    let deleted = 0
    for (const key of keys) {
      if (this.values.delete(key)) deleted += 1
      this.expirations.delete(key)
    }
    return deleted
  }

  async incr(key) {
    this.purge(key)
    const value = Number(this.values.get(key) || 0) + 1
    this.values.set(key, String(value))
    return value
  }

  async expire(key, seconds) {
    if (!this.values.has(key)) return 0
    this.expirations.set(key, Date.now() + seconds * 1000)
    return 1
  }
}

class FakeAuthRepository {
  constructor() {
    this.usersByIdentity = new Map()
    this.sessions = []
    this.createdUsers = 0
  }

  async findOrCreateIdentity(identity) {
    const key = `${identity.provider}:${identity.subject}`
    if (!this.usersByIdentity.has(key)) {
      this.createdUsers += 1
      this.usersByIdentity.set(key, {
        id: `user-${this.createdUsers}`,
        displayName: '昭途用户',
        avatarUrl: null,
        identities: [identity.provider],
      })
    }
    return this.usersByIdentity.get(key)
  }

  async createSession(session) {
    this.sessions.push(session)
    return session
  }
}

function createOtpHarness({ code = 246810 } = {}) {
  const sent = []
  const redis = new FakeRedis()
  const smsProvider = {
    async sendCode(message) {
      sent.push(message)
      return { developmentCode: message.code }
    },
  }
  const store = new OtpStore({
    redis,
    hmacSecret: '12345678901234567890123456789012',
    smsProvider,
    randomInt: () => code,
    today: () => '2026-07-24',
  })
  return { redis, sent, store }
}

test('normalizes mainland China phone numbers', () => {
  assert.equal(normalizeChinaPhone('138 0013 8000'), '+8613800138000')
  assert.equal(normalizeChinaPhone('+86-13800138000'), '+8613800138000')
  assert.throws(() => normalizeChinaPhone('12345'), /手机号格式不正确/)
})

test('masks phone numbers and hashes opaque tokens', () => {
  assert.equal(maskPhone('+8613800138000'), '138****8000')
  const token = createToken()
  assert.notEqual(token, hashToken(token))
  assert.equal(hashToken(token), hashToken(token))
})

test('OTP can be verified only once', async () => {
  const { store, sent } = createOtpHarness()
  const requested = await store.request('+8613800138000')

  assert.equal(sent.length, 1)
  assert.equal(sent[0].phone, '+8613800138000')
  assert.equal(requested.developmentCode, '246810')
  await store.verify('+8613800138000', '246810')
  await assert.rejects(
    store.verify('+8613800138000', '246810'),
    /验证码已过期/,
  )
})

test('OTP locks after five wrong attempts', async () => {
  const { store } = createOtpHarness()
  await store.request('+8613800138000')

  for (let attempt = 1; attempt < 5; attempt += 1) {
    await assert.rejects(
      store.verify('+8613800138000', '000000'),
      /验证码不正确/,
    )
  }
  await assert.rejects(
    store.verify('+8613800138000', '000000'),
    /错误次数过多/,
  )
  await assert.rejects(
    store.verify('+8613800138000', '246810'),
    /验证码已过期/,
  )
})

test('phone login reuses identity and stores only session hash', async () => {
  const { redis, store } = createOtpHarness()
  const repository = new FakeAuthRepository()
  const service = new AuthService({
    repository,
    otpStore: store,
    sessionTtlDays: 30,
    now: () => new Date('2026-07-24T00:00:00.000Z'),
  })

  await service.requestPhoneCode('13800138000')
  const first = await service.loginWithPhone({
    phone: '13800138000',
    code: '246810',
    deviceName: '手机',
  })

  await redis.del('otp:cooldown:+8613800138000')
  await service.requestPhoneCode('13800138000')
  const second = await service.loginWithPhone({
    phone: '13800138000',
    code: '246810',
    deviceName: '平板',
  })

  assert.equal(repository.createdUsers, 1)
  assert.equal(first.user.id, second.user.id)
  assert.equal(repository.sessions.length, 2)
  assert.notEqual(repository.sessions[0].tokenHash, first.sessionToken)
  assert.equal(
    repository.sessions[0].tokenHash,
    hashToken(first.sessionToken),
  )
  assert.equal(first.user.phone, '138****8000')
})

test('authenticated user can bind a verified phone identity', async () => {
  const { store } = createOtpHarness()
  const repository = new FakeAuthRepository()
  repository.findIdentityOwner = async () => null
  repository.addIdentity = async (userId, identity) => {
    repository.boundIdentity = { userId, identity }
    return userId
  }
  const service = new AuthService({ repository, otpStore: store })

  await service.requestPhoneCode('13800138000')
  const result = await service.bindPhone('user-existing', {
    phone: '13800138000',
    code: '246810',
  })

  assert.equal(result.bound, true)
  assert.equal(repository.boundIdentity.userId, 'user-existing')
  assert.equal(repository.boundIdentity.identity.provider, 'phone')
  assert.equal(
    repository.boundIdentity.identity.subject,
    '+8613800138000',
  )
})

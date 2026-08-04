import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {
  maskEmail,
  normalizeEmail,
} from '../src/auth/email.js'
import {
  normalizeAccount,
  validatePassword,
} from '../src/auth/account.js'
import {
  hashPassword,
  verifyPassword,
} from '../src/auth/password.js'
import { AuthService } from '../src/auth/auth-service.js'
import { hashToken } from '../src/auth/token.js'

test('normalizes accounts and email addresses', () => {
  assert.equal(normalizeAccount(' Study_User '), 'study_user')
  assert.equal(normalizeEmail(' Learner@Example.COM '), 'learner@example.com')
  assert.equal(maskEmail('learner@example.com'), 'l***r@example.com')
  assert.throws(() => normalizeAccount('中文账号'), /账号格式/)
  assert.throws(() => normalizeEmail('invalid-email'), /邮箱格式/)
})

test('password validation and hash verification never store plaintext', async () => {
  validatePassword('memory2026')
  assert.throws(() => validatePassword('123'), /至少 8 位/)

  const digest = await hashPassword('memory2026')
  assert.doesNotMatch(digest, /memory2026/)
  assert.equal(await verifyPassword('memory2026', digest), true)
  assert.equal(await verifyPassword('wrong-password', digest), false)
})

class FakeAccountRepository {
  constructor(passwordHash) {
    this.passwordHash = passwordHash
    this.sessions = []
    this.registrations = []
  }

  async registerAccount(input) {
    this.registrations.push(input)
    return {
      id: 'account-user-1',
      displayName: input.account,
      avatarUrl: null,
      identities: ['account', input.binding.provider],
    }
  }

  async findAccountCredential(account) {
    if (account !== 'study_user') return null
    return {
      user: {
        id: 'account-user-1',
        displayName: 'study_user',
        avatarUrl: null,
        identities: ['account', 'email'],
      },
      passwordHash: this.passwordHash,
    }
  }

  async createSession(session) {
    this.sessions.push(session)
  }
}

function verificationStore() {
  return {
    requests: [],
    verifications: [],
    async request(value) {
      this.requests.push(value)
      return { developmentCode: '246810' }
    },
    async verify(value, code) {
      this.verifications.push({ value, code })
      return true
    },
  }
}

test('registration requires a verified phone or email binding', async () => {
  const repository = new FakeAccountRepository('')
  const phoneOtpStore = verificationStore()
  const emailOtpStore = verificationStore()
  const service = new AuthService({
    repository,
    otpStore: phoneOtpStore,
    emailOtpStore,
    now: () => new Date('2026-07-24T00:00:00.000Z'),
  })

  await assert.rejects(
    service.registerWithAccount({
      account: 'study_user',
      password: 'memory2026',
      bindingType: 'none',
      bindingValue: '',
      code: '',
    }),
    /必须绑定手机号或邮箱/,
  )

  const result = await service.registerWithAccount({
    account: 'Study_User',
    password: 'memory2026',
    bindingType: 'email',
    bindingValue: 'Learner@Example.COM',
    code: '246810',
    deviceName: '手机',
  })

  assert.deepEqual(emailOtpStore.verifications, [{
    value: 'learner@example.com',
    code: '246810',
  }])
  assert.equal(repository.registrations[0].account, 'study_user')
  assert.equal(repository.registrations[0].binding.provider, 'email')
  assert.doesNotMatch(
    repository.registrations[0].passwordHash,
    /memory2026/,
  )
  assert.equal(result.user.email, 'l***r@example.com')
  assert.equal(
    repository.sessions[0].tokenHash,
    hashToken(result.sessionToken),
  )
})

test('account login rejects wrong password and creates a hashed session', async () => {
  const passwordHash = await hashPassword('memory2026')
  const repository = new FakeAccountRepository(passwordHash)
  const service = new AuthService({
    repository,
    now: () => new Date('2026-07-24T00:00:00.000Z'),
  })

  await assert.rejects(
    service.loginWithAccount({
      account: 'study_user',
      password: 'wrong-password',
    }),
    (error) => {
      assert.equal(error.status, 401)
      assert.equal(error.code, 'ACCOUNT_LOGIN_FAILED')
      assert.equal(error.message, '账号或密码不正确')
      return true
    },
  )

  const result = await service.loginWithAccount({
    account: 'study_user',
    password: 'memory2026',
    deviceName: '平板',
  })
  assert.equal(result.user.id, 'account-user-1')
  assert.equal(repository.sessions.length, 1)
  assert.equal(
    repository.sessions[0].tokenHash,
    hashToken(result.sessionToken),
  )
})

test('account migration adds password credentials and identity providers', () => {
  const sql = fs.readFileSync(
    new URL('../migrations/002_account_credentials.sql', import.meta.url),
    'utf8',
  )
  assert.match(sql, /CREATE TABLE auth_password_credentials/)
  assert.match(sql, /provider IN \('phone', 'wechat', 'account', 'email'\)/)
  assert.doesNotMatch(sql, /plaintext_password/)
})

import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEVELOPMENT_TEST_ACCOUNT,
  seedDevelopmentAccount,
} from '../src/auth/development-account.js'
import { verifyPassword } from '../src/auth/password.js'

class FakeRepository {
  constructor() {
    this.registration = null
  }

  async findAccountCredential() {
    return null
  }

  async registerAccount(input) {
    this.registration = input
    return {
      id: 'development-user',
      displayName: input.account,
      avatarUrl: null,
      identities: ['account', input.binding.provider],
    }
  }
}

test('development test account is seeded with a hashed password and email binding', async () => {
  const repository = new FakeRepository()
  const result = await seedDevelopmentAccount({
    repository,
    nodeEnv: 'development',
  })

  assert.equal(result.account, 'test_study')
  assert.equal(DEVELOPMENT_TEST_ACCOUNT.password, 'Study2026!')
  assert.equal(repository.registration.binding.provider, 'email')
  assert.equal(
    await verifyPassword(
      DEVELOPMENT_TEST_ACCOUNT.password,
      repository.registration.passwordHash,
    ),
    true,
  )
  assert.doesNotMatch(
    repository.registration.passwordHash,
    /Study2026!/,
  )
})

test('development test account cannot be seeded in production', async () => {
  await assert.rejects(
    seedDevelopmentAccount({
      repository: new FakeRepository(),
      nodeEnv: 'production',
    }),
    /仅允许在开发或测试环境创建测试账号/,
  )
})

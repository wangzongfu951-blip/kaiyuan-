import test from 'node:test'
import assert from 'node:assert/strict'
import Database from 'better-sqlite3'
import { SqliteAuthRepository } from '../src/auth/sqlite-auth-repository.js'

test('standalone SQLite repository persists accounts and hashed sessions', async () => {
  const database = new Database(':memory:')
  const repository = new SqliteAuthRepository({ database })

  const user = await repository.registerAccount({
    account: 'test_study',
    passwordHash: 'scrypt$hash-only',
    binding: {
      provider: 'email',
      subject: 'test-study@example.invalid',
      profile: { development: true },
    },
  })
  assert.deepEqual(user.identities, ['account', 'email'])

  const credential = await repository.findAccountCredential('test_study')
  assert.equal(credential.passwordHash, 'scrypt$hash-only')

  await repository.createSession({
    userId: user.id,
    tokenHash: 'sha256-token-hash',
    deviceName: '手机',
    expiresAt: new Date(Date.now() + 60_000),
  })
  const sessionUser = await repository.findSessionByTokenHash(
    'sha256-token-hash',
  )
  assert.equal(sessionUser.id, user.id)
  assert.equal(await repository.revokeSession('sha256-token-hash'), true)
  assert.equal(
    await repository.findSessionByTokenHash('sha256-token-hash'),
    null,
  )

  database.close()
})

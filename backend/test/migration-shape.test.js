import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

test('identity migration contains required unique and privacy constraints', () => {
  const sql = fs.readFileSync(
    new URL('../migrations/001_identity.sql', import.meta.url),
    'utf8',
  )

  for (const table of [
    'users',
    'auth_identities',
    'auth_sessions',
    'user_devices',
    'sync_events',
  ]) {
    assert.match(sql, new RegExp(`CREATE TABLE ${table}`))
  }

  assert.match(sql, /UNIQUE \(provider, provider_subject\)/)
  assert.match(sql, /UNIQUE \(user_id, client_event_id\)/)
  assert.doesNotMatch(sql, /plaintext_token|plaintext_otp/)
})


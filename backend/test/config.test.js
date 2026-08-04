import test from 'node:test'
import assert from 'node:assert/strict'
import { loadConfig } from '../src/config.js'

test('loadConfig rejects a short OTP secret', () => {
  assert.throws(
    () => loadConfig({ NODE_ENV: 'test', OTP_HMAC_SECRET: 'short' }),
    /OTP_HMAC_SECRET/,
  )
})

test('loadConfig supplies safe local defaults in test', () => {
  const config = loadConfig({
    NODE_ENV: 'test',
    OTP_HMAC_SECRET: '12345678901234567890123456789012',
  })

  assert.equal(config.port, 3000)
  assert.equal(config.cookieName, 'zt_session')
  assert.equal(config.databaseUrl, '')
  assert.equal(config.redisUrl, '')
})

test('loadConfig requires production database and Redis URLs', () => {
  const env = {
    NODE_ENV: 'production',
    OTP_HMAC_SECRET: '12345678901234567890123456789012',
  }

  assert.throws(() => loadConfig(env), /DATABASE_URL/)
})


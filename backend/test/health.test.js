import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createApp } from '../src/app.js'

test('GET /api/v1/health returns a versioned health response', async (t) => {
  const app = createApp({ now: () => new Date('2026-07-24T00:00:00.000Z') })
  const server = app.listen(0, '127.0.0.1')
  t.after(() => server.close())
  await once(server, 'listening')

  const address = server.address()
  assert.notEqual(address, null)
  assert.equal(typeof address, 'object')

  const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/health`)
  const body = await response.json()

  assert.equal(response.status, 200)
  assert.deepEqual(body, {
    ok: true,
    version: 'v1',
    time: '2026-07-24T00:00:00.000Z',
  })
})

test('unknown API route returns a stable Chinese error', async (t) => {
  const app = createApp()
  const server = app.listen(0, '127.0.0.1')
  t.after(() => server.close())
  await once(server, 'listening')

  const address = server.address()
  assert.notEqual(address, null)
  assert.equal(typeof address, 'object')

  const response = await fetch(`http://127.0.0.1:${address.port}/api/v1/missing`)
  const body = await response.json()

  assert.equal(response.status, 404)
  assert.equal(body.error.code, 'NOT_FOUND')
  assert.equal(body.error.message, '接口不存在')
})

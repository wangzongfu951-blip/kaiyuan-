import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { createApp } from '../src/app.js'
import { SyncService } from '../src/sync/sync-service.js'
import { createSyncRouter } from '../src/sync/sync-router.js'

const config = {
  cookieName: 'zt_session',
}

class FakeSyncRepository {
  constructor() {
    this.nextCursor = 1
    this.byClientId = new Map()
    this.events = []
  }

  async storeEvent(userId, event) {
    const key = `${userId}:${event.clientEventId}`
    const existing = this.byClientId.get(key)
    if (existing) return { accepted: false, cursor: existing.cursor }

    const stored = {
      ...event,
      userId,
      cursor: this.nextCursor,
    }
    this.nextCursor += 1
    this.byClientId.set(key, stored)
    this.events.push(stored)
    return { accepted: true, cursor: stored.cursor }
  }

  async getEventsAfter(userId, cursor, limit) {
    return this.events
      .filter((event) => event.userId === userId && event.cursor > cursor)
      .slice(0, limit)
  }
}

function event(overrides = {}) {
  return {
    clientEventId: '5f9f4774-7a2e-4fcb-bca5-622bc8689a91',
    deviceKey: 'phone-a',
    eventType: 'memory.grade',
    payload: { entryId: 'idiom-1', grade: 'remembered' },
    occurredAt: '2026-07-24T08:00:00.000Z',
    ...overrides,
  }
}

function createHarness() {
  const repository = new FakeSyncRepository()
  const syncService = new SyncService({
    repository,
    now: () => new Date('2026-07-24T09:00:00.000Z'),
  })
  const authService = {
    async authenticateSession(token) {
      return token === 'valid-token'
        ? { id: 'user-1', displayName: '昭途用户' }
        : null
    },
  }
  const router = createSyncRouter({
    syncService,
    authService,
    config,
  })
  return { repository, syncService, router }
}

async function withServer(t, router) {
  const app = createApp({ syncRouter: router })
  const server = app.listen(0, '127.0.0.1')
  t.after(() => server.close())
  await once(server, 'listening')
  return `http://127.0.0.1:${server.address().port}/api/v1/sync`
}

test('unauthenticated event upload returns 401', async (t) => {
  const { router } = createHarness()
  const origin = await withServer(t, router)
  const response = await fetch(`${origin}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ events: [event()] }),
  })
  const body = await response.json()

  assert.equal(response.status, 401)
  assert.equal(body.error.code, 'AUTH_REQUIRED')
})

test('submitting the same client event twice stores it only once', async () => {
  const { repository, syncService } = createHarness()

  const first = await syncService.pushEvents('user-1', [event()])
  const second = await syncService.pushEvents('user-1', [event()])

  assert.equal(repository.events.length, 1)
  assert.deepEqual(first.results[0], { accepted: true, cursor: 1 })
  assert.deepEqual(second.results[0], { accepted: false, cursor: 1 })
})

test('events from two devices receive monotonically increasing cursors', async () => {
  const { syncService } = createHarness()
  const first = await syncService.pushEvents('user-1', [
    event({ deviceKey: 'phone-a' }),
  ])
  const second = await syncService.pushEvents('user-1', [
    event({
      clientEventId: 'd76d75fa-a41b-472d-a71e-e35f1f9706ad',
      deviceKey: 'tablet-b',
    }),
  ])
  const pulled = await syncService.pullEvents('user-1', 0)

  assert.equal(first.cursor, 1)
  assert.equal(second.cursor, 2)
  assert.deepEqual(
    pulled.events.map((item) => item.cursor),
    [1, 2],
  )
  assert.equal(pulled.cursor, 2)
})

test('payloads over 16 KB are rejected', async () => {
  const { syncService } = createHarness()

  await assert.rejects(
    syncService.pushEvents('user-1', [
      event({ payload: { text: '字'.repeat(16_385) } }),
    ]),
    (error) => {
      assert.equal(error.status, 413)
      assert.equal(error.code, 'SYNC_PAYLOAD_TOO_LARGE')
      return true
    },
  )
})

test('authenticated clients can upload and pull events over HTTP', async (t) => {
  const { router } = createHarness()
  const origin = await withServer(t, router)
  const upload = await fetch(`${origin}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: 'zt_session=valid-token',
    },
    body: JSON.stringify({ events: [event()] }),
  })
  const uploaded = await upload.json()
  const pull = await fetch(`${origin}/cursor?after=0`, {
    headers: { Cookie: 'zt_session=valid-token' },
  })
  const pulled = await pull.json()

  assert.equal(upload.status, 200)
  assert.equal(uploaded.data.cursor, 1)
  assert.equal(pull.status, 200)
  assert.equal(pulled.data.events.length, 1)
  assert.equal(pulled.data.cursor, 1)
})

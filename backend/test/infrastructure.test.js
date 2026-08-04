import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { withTransaction } from '../src/infrastructure/postgres.js'
import { runMigrations } from '../src/infrastructure/migrate.js'

function fakePool({ applied = [] } = {}) {
  const calls = []
  const client = {
    async query(sql, params = []) {
      calls.push({ sql: String(sql), params })
      if (String(sql).includes('SELECT filename FROM schema_migrations')) {
        return { rows: applied.map((filename) => ({ filename })) }
      }
      return { rows: [] }
    },
    release() {
      calls.push({ sql: 'RELEASE', params: [] })
    },
  }
  return {
    calls,
    async connect() {
      return client
    },
    async query(sql, params = []) {
      return client.query(sql, params)
    },
  }
}

test('withTransaction commits successful work and releases client', async () => {
  const pool = fakePool()
  const result = await withTransaction(pool, async (client) => {
    await client.query('SELECT 1')
    return '完成'
  })

  assert.equal(result, '完成')
  assert.deepEqual(
    pool.calls.map((call) => call.sql),
    ['BEGIN', 'SELECT 1', 'COMMIT', 'RELEASE'],
  )
})

test('withTransaction rolls back failed work and releases client', async () => {
  const pool = fakePool()

  await assert.rejects(
    withTransaction(pool, async () => {
      throw new Error('失败')
    }),
    /失败/,
  )

  assert.deepEqual(
    pool.calls.map((call) => call.sql),
    ['BEGIN', 'ROLLBACK', 'RELEASE'],
  )
})

test('runMigrations applies only unapplied SQL files in filename order', async (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'zhaotu-migrations-'))
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }))
  fs.writeFileSync(path.join(directory, '002_second.sql'), 'SELECT 2;')
  fs.writeFileSync(path.join(directory, '001_first.sql'), 'SELECT 1;')

  const pool = fakePool({ applied: ['001_first.sql'] })
  const applied = await runMigrations(pool, directory)

  assert.deepEqual(applied, ['002_second.sql'])
  assert.equal(pool.calls.some((call) => call.sql === 'SELECT 1;'), false)
  assert.equal(pool.calls.some((call) => call.sql === 'SELECT 2;'), true)
  assert.equal(
    pool.calls.some(
      (call) =>
        call.sql.includes('INSERT INTO schema_migrations') &&
        call.params[0] === '002_second.sql',
    ),
    true,
  )
})

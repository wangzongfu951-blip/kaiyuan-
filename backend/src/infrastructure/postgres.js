import pg from 'pg'

const { Pool } = pg

export function createPostgres(databaseUrl, options = {}) {
  if (!databaseUrl) throw new Error('DATABASE_URL is required')

  return new Pool({
    connectionString: databaseUrl,
    max: options.maxConnections || 10,
    idleTimeoutMillis: options.idleTimeoutMillis || 30_000,
    connectionTimeoutMillis: options.connectionTimeoutMillis || 5_000,
    allowExitOnIdle: options.allowExitOnIdle ?? false,
  })
}

export async function withTransaction(pool, work) {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const result = await work(client)
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}


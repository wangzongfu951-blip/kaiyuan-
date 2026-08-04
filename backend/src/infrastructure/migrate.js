import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { loadConfig } from '../config.js'
import { createPostgres, withTransaction } from './postgres.js'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const defaultMigrationsDirectory = path.resolve(currentDirectory, '../../migrations')

export async function runMigrations(pool, migrationsDirectory = defaultMigrationsDirectory) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `)

  const result = await pool.query(
    'SELECT filename FROM schema_migrations ORDER BY filename',
  )
  const alreadyApplied = new Set(result.rows.map((row) => row.filename))
  const filenames = fs
    .readdirSync(migrationsDirectory)
    .filter((filename) => filename.endsWith('.sql'))
    .sort((left, right) => left.localeCompare(right))
  const applied = []

  for (const filename of filenames) {
    if (alreadyApplied.has(filename)) continue
    const sql = fs.readFileSync(path.join(migrationsDirectory, filename), 'utf8')

    await withTransaction(pool, async (client) => {
      await client.query(sql)
      await client.query(
        'INSERT INTO schema_migrations (filename) VALUES ($1)',
        [filename],
      )
    })
    applied.push(filename)
  }

  return applied
}

async function main() {
  const config = loadConfig()
  const pool = createPostgres(config.databaseUrl)

  try {
    const applied = await runMigrations(pool)
    console.log(
      applied.length > 0
        ? `Applied migrations: ${applied.join(', ')}`
        : 'Database schema is current',
    )
  } finally {
    await pool.end()
  }
}

const isDirectRun = process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url

if (isDirectRun) {
  main().catch((error) => {
    console.error(error.message)
    process.exitCode = 1
  })
}


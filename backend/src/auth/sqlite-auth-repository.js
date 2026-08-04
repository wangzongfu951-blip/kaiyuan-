import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const defaultDatabasePath = path.resolve(
  currentDirectory,
  '../../data/auth-development.db',
)

function asIso(value) {
  return value instanceof Date ? value.toISOString() : String(value)
}

export class SqliteAuthRepository {
  constructor({ database, databasePath = defaultDatabasePath } = {}) {
    this.ownsDatabase = !database
    this.database = database || new Database(databasePath)
    this.initialize()
  }

  initialize() {
    this.database.pragma('foreign_keys = ON')
    this.database.exec(`
      CREATE TABLE IF NOT EXISTS local_auth_users (
        id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        avatar_url TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS local_auth_identities (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES local_auth_users(id) ON DELETE CASCADE,
        provider TEXT NOT NULL,
        provider_subject TEXT NOT NULL,
        profile TEXT NOT NULL DEFAULT '{}',
        verified_at TEXT NOT NULL,
        UNIQUE (provider, provider_subject)
      );

      CREATE TABLE IF NOT EXISTS local_auth_credentials (
        user_id TEXT PRIMARY KEY
          REFERENCES local_auth_users(id) ON DELETE CASCADE,
        password_hash TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS local_auth_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES local_auth_users(id) ON DELETE CASCADE,
        token_hash TEXT NOT NULL UNIQUE,
        device_name TEXT,
        expires_at TEXT NOT NULL,
        revoked_at TEXT,
        created_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS local_auth_sessions_token_idx
        ON local_auth_sessions (token_hash);
    `)
  }

  mapUser(userId) {
    const user = this.database.prepare(
      `SELECT id, display_name, avatar_url
         FROM local_auth_users
        WHERE id = ? AND status = 'active'`,
    ).get(userId)
    if (!user) return null
    const identities = this.database.prepare(
      `SELECT provider
         FROM local_auth_identities
        WHERE user_id = ?
        ORDER BY provider`,
    ).all(userId).map((row) => row.provider)
    return {
      id: user.id,
      displayName: user.display_name,
      avatarUrl: user.avatar_url,
      identities,
    }
  }

  async findOrCreateIdentity({ provider, subject, profile = {} }) {
    const owner = await this.findIdentityOwner({ provider, subject })
    if (owner) return this.mapUser(owner)

    return this.database.transaction(() => {
      const now = new Date().toISOString()
      const userId = randomUUID()
      this.database.prepare(
        `INSERT INTO local_auth_users
           (id, display_name, avatar_url, created_at)
         VALUES (?, ?, ?, ?)`,
      ).run(
        userId,
        profile.nickname || '昭途用户',
        profile.avatarUrl || null,
        now,
      )
      this.database.prepare(
        `INSERT INTO local_auth_identities
           (id, user_id, provider, provider_subject, profile, verified_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).run(
        randomUUID(),
        userId,
        provider,
        subject,
        JSON.stringify(profile),
        now,
      )
      return this.mapUser(userId)
    })()
  }

  async registerAccount({ account, passwordHash, binding }) {
    try {
      return this.database.transaction(() => {
        const now = new Date().toISOString()
        const userId = randomUUID()
        this.database.prepare(
          `INSERT INTO local_auth_users
             (id, display_name, created_at)
           VALUES (?, ?, ?)`,
        ).run(userId, account, now)
        const insertIdentity = this.database.prepare(
          `INSERT INTO local_auth_identities
             (id, user_id, provider, provider_subject, profile, verified_at)
           VALUES (?, ?, ?, ?, ?, ?)`,
        )
        insertIdentity.run(
          randomUUID(),
          userId,
          'account',
          account,
          '{}',
          now,
        )
        insertIdentity.run(
          randomUUID(),
          userId,
          binding.provider,
          binding.subject,
          JSON.stringify(binding.profile || {}),
          now,
        )
        this.database.prepare(
          `INSERT INTO local_auth_credentials
             (user_id, password_hash, updated_at)
           VALUES (?, ?, ?)`,
        ).run(userId, passwordHash, now)
        return this.mapUser(userId)
      })()
    } catch (error) {
      if (String(error?.code || '').startsWith('SQLITE_CONSTRAINT')) {
        error.code = '23505'
      }
      throw error
    }
  }

  async findAccountCredential(account) {
    const row = this.database.prepare(
      `SELECT users.id, credentials.password_hash
         FROM local_auth_identities identity
         JOIN local_auth_users users ON users.id = identity.user_id
         JOIN local_auth_credentials credentials
           ON credentials.user_id = users.id
        WHERE identity.provider = 'account'
          AND identity.provider_subject = ?
          AND users.status = 'active'`,
    ).get(account)
    if (!row) return null
    return {
      user: this.mapUser(row.id),
      passwordHash: row.password_hash,
    }
  }

  async updateAccountPassword(userId, passwordHash) {
    this.database.prepare(
      `UPDATE local_auth_credentials
          SET password_hash = ?, updated_at = ?
        WHERE user_id = ?`,
    ).run(passwordHash, new Date().toISOString(), userId)
  }

  async createSession({
    userId,
    tokenHash,
    deviceName = null,
    expiresAt,
  }) {
    const now = new Date().toISOString()
    const id = randomUUID()
    this.database.prepare(
      `INSERT INTO local_auth_sessions
         (id, user_id, token_hash, device_name, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(id, userId, tokenHash, deviceName, asIso(expiresAt), now)
    return { id, user_id: userId, device_name: deviceName }
  }

  async findIdentityOwner({ provider, subject }) {
    const row = this.database.prepare(
      `SELECT user_id
         FROM local_auth_identities
        WHERE provider = ? AND provider_subject = ?`,
    ).get(provider, subject)
    return row?.user_id || null
  }

  async addIdentity(userId, { provider, subject, profile = {} }) {
    const owner = await this.findIdentityOwner({ provider, subject })
    if (owner) return owner
    this.database.prepare(
      `INSERT INTO local_auth_identities
         (id, user_id, provider, provider_subject, profile, verified_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      randomUUID(),
      userId,
      provider,
      subject,
      JSON.stringify(profile),
      new Date().toISOString(),
    )
    return userId
  }

  async findSessionByTokenHash(tokenHash) {
    const row = this.database.prepare(
      `SELECT user_id
         FROM local_auth_sessions
        WHERE token_hash = ?
          AND revoked_at IS NULL
          AND expires_at > ?`,
    ).get(tokenHash, new Date().toISOString())
    return row ? this.mapUser(row.user_id) : null
  }

  async revokeSession(tokenHash) {
    const result = this.database.prepare(
      `UPDATE local_auth_sessions
          SET revoked_at = ?
        WHERE token_hash = ? AND revoked_at IS NULL`,
    ).run(new Date().toISOString(), tokenHash)
    return result.changes > 0
  }

  async revokeAllSessions(userId) {
    const result = this.database.prepare(
      `UPDATE local_auth_sessions
          SET revoked_at = ?
        WHERE user_id = ? AND revoked_at IS NULL`,
    ).run(new Date().toISOString(), userId)
    return result.changes
  }

  close() {
    if (this.ownsDatabase) this.database.close()
  }
}

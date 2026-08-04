import { withTransaction } from '../infrastructure/postgres.js'

function mapUser(row) {
  return {
    id: row.id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    identities: row.identities || [],
  }
}

async function findIdentity(client, provider, subject) {
  const result = await client.query(
    `SELECT u.id, u.display_name, u.avatar_url,
            array_agg(ai_all.provider ORDER BY ai_all.provider) AS identities
       FROM auth_identities ai
       JOIN users u ON u.id = ai.user_id
       JOIN auth_identities ai_all ON ai_all.user_id = u.id
      WHERE ai.provider = $1
        AND ai.provider_subject = $2
        AND u.status = 'active'
      GROUP BY u.id`,
    [provider, subject],
  )

  return result.rows[0] ? mapUser(result.rows[0]) : null
}

export class AuthRepository {
  constructor(pool) {
    this.pool = pool
  }

  async findOrCreateIdentity({ provider, subject, profile = {} }) {
    return withTransaction(this.pool, async (client) => {
      const existing = await findIdentity(client, provider, subject)
      if (existing) return existing

      const displayName = profile.nickname || '昭途用户'
      const avatarUrl = profile.avatarUrl || null
      const userResult = await client.query(
        `INSERT INTO users (display_name, avatar_url)
         VALUES ($1, $2)
         RETURNING id, display_name, avatar_url`,
        [displayName, avatarUrl],
      )
      const candidate = userResult.rows[0]
      const identityResult = await client.query(
        `INSERT INTO auth_identities
           (user_id, provider, provider_subject, profile)
         VALUES ($1, $2, $3, $4::jsonb)
         ON CONFLICT (provider, provider_subject) DO NOTHING
         RETURNING user_id`,
        [candidate.id, provider, subject, JSON.stringify(profile)],
      )

      if (identityResult.rowCount === 0) {
        await client.query('DELETE FROM users WHERE id = $1', [candidate.id])
        return findIdentity(client, provider, subject)
      }

      return mapUser({
        ...candidate,
        identities: [provider],
      })
    })
  }

  async registerAccount({ account, passwordHash, binding }) {
    return withTransaction(this.pool, async (client) => {
      const userResult = await client.query(
        `INSERT INTO users (display_name)
         VALUES ($1)
         RETURNING id, display_name, avatar_url`,
        [account],
      )
      const user = userResult.rows[0]

      await client.query(
        `INSERT INTO auth_identities
           (user_id, provider, provider_subject, profile)
         VALUES
           ($1, 'account', $2, '{}'::jsonb),
           ($1, $3, $4, $5::jsonb)`,
        [
          user.id,
          account,
          binding.provider,
          binding.subject,
          JSON.stringify(binding.profile || {}),
        ],
      )
      await client.query(
        `INSERT INTO auth_password_credentials (user_id, password_hash)
         VALUES ($1, $2)`,
        [user.id, passwordHash],
      )

      return mapUser({
        ...user,
        identities: ['account', binding.provider],
      })
    })
  }

  async findAccountCredential(account) {
    const result = await this.pool.query(
      `SELECT u.id, u.display_name, u.avatar_url,
              credentials.password_hash,
              array_agg(ai_all.provider ORDER BY ai_all.provider) AS identities
         FROM auth_identities account_identity
         JOIN users u ON u.id = account_identity.user_id
         JOIN auth_password_credentials credentials
           ON credentials.user_id = u.id
         JOIN auth_identities ai_all ON ai_all.user_id = u.id
        WHERE account_identity.provider = 'account'
          AND account_identity.provider_subject = $1
          AND u.status = 'active'
        GROUP BY u.id, credentials.password_hash`,
      [account],
    )
    if (!result.rows[0]) return null
    return {
      user: mapUser(result.rows[0]),
      passwordHash: result.rows[0].password_hash,
    }
  }

  async updateAccountPassword(userId, passwordHash) {
    await this.pool.query(
      `UPDATE auth_password_credentials
          SET password_hash = $2,
              updated_at = now()
        WHERE user_id = $1`,
      [userId, passwordHash],
    )
  }

  async createSession({
    userId,
    tokenHash,
    deviceName = null,
    expiresAt,
  }) {
    const result = await this.pool.query(
      `INSERT INTO auth_sessions
         (user_id, token_hash, device_name, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING id, user_id, device_name, expires_at, created_at`,
      [userId, tokenHash, deviceName, expiresAt],
    )

    return result.rows[0]
  }

  async findIdentityOwner({ provider, subject }) {
    const result = await this.pool.query(
      `SELECT user_id
         FROM auth_identities
        WHERE provider = $1 AND provider_subject = $2`,
      [provider, subject],
    )
    return result.rows[0]?.user_id || null
  }

  async addIdentity(userId, { provider, subject, profile = {} }) {
    return withTransaction(this.pool, async (client) => {
      const inserted = await client.query(
        `INSERT INTO auth_identities
           (user_id, provider, provider_subject, profile)
         VALUES ($1, $2, $3, $4::jsonb)
         ON CONFLICT (provider, provider_subject) DO NOTHING
         RETURNING user_id`,
        [userId, provider, subject, JSON.stringify(profile)],
      )
      if (inserted.rows[0]) return inserted.rows[0].user_id

      const existing = await client.query(
        `SELECT user_id
           FROM auth_identities
          WHERE provider = $1 AND provider_subject = $2`,
        [provider, subject],
      )
      return existing.rows[0]?.user_id || null
    })
  }

  async findSessionByTokenHash(tokenHash) {
    const result = await this.pool.query(
      `SELECT u.id, u.display_name, u.avatar_url,
              array_agg(ai.provider ORDER BY ai.provider) AS identities
         FROM auth_sessions session
         JOIN users u ON u.id = session.user_id
         JOIN auth_identities ai ON ai.user_id = u.id
        WHERE session.token_hash = $1
          AND session.revoked_at IS NULL
          AND session.expires_at > now()
          AND u.status = 'active'
        GROUP BY u.id`,
      [tokenHash],
    )

    return result.rows[0] ? mapUser(result.rows[0]) : null
  }

  async revokeSession(tokenHash) {
    const result = await this.pool.query(
      `UPDATE auth_sessions
          SET revoked_at = COALESCE(revoked_at, now())
        WHERE token_hash = $1
          AND revoked_at IS NULL`,
      [tokenHash],
    )
    return result.rowCount > 0
  }

  async revokeAllSessions(userId) {
    const result = await this.pool.query(
      `UPDATE auth_sessions
          SET revoked_at = COALESCE(revoked_at, now())
        WHERE user_id = $1
          AND revoked_at IS NULL`,
      [userId],
    )
    return result.rowCount
  }
}

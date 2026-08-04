import { randomBytes } from 'node:crypto'

const STATE_TTL_SECONDS = 10 * 60

export class OAuthStateStore {
  constructor({ redis, ttlSeconds = STATE_TTL_SECONDS }) {
    this.redis = redis
    this.ttlSeconds = ttlSeconds
  }

  async create(context) {
    const state = randomBytes(24).toString('base64url')
    const value =
      typeof context === 'string' ? context : JSON.stringify(context)
    await this.redis.set(`oauth:wechat:${state}`, value, {
      EX: this.ttlSeconds,
    })
    return state
  }

  async consume(state) {
    if (!state) return null
    const key = `oauth:wechat:${state}`

    const value = typeof this.redis.getDel === 'function'
      ? await this.redis.getDel(key)
      : await this.redis.get(key)
    if (value && typeof this.redis.getDel !== 'function') {
      await this.redis.del(key)
    }
    if (!value) return null

    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }
}

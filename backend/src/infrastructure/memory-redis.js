export class MemoryRedis {
  constructor() {
    this.values = new Map()
    this.expirations = new Map()
    this.isOpen = true
  }

  purge(key) {
    const expiry = this.expirations.get(key)
    if (expiry && expiry <= Date.now()) {
      this.values.delete(key)
      this.expirations.delete(key)
    }
  }

  async set(key, value, options = {}) {
    this.purge(key)
    if (options.NX && this.values.has(key)) return null
    this.values.set(key, String(value))
    if (options.EX) {
      this.expirations.set(key, Date.now() + Number(options.EX) * 1000)
    } else {
      this.expirations.delete(key)
    }
    return 'OK'
  }

  async get(key) {
    this.purge(key)
    return this.values.get(key) ?? null
  }

  async getDel(key) {
    const value = await this.get(key)
    await this.del(key)
    return value
  }

  async incr(key) {
    this.purge(key)
    const next = Number(this.values.get(key) || 0) + 1
    this.values.set(key, String(next))
    return next
  }

  async expire(key, seconds) {
    this.purge(key)
    if (!this.values.has(key)) return false
    this.expirations.set(key, Date.now() + Number(seconds) * 1000)
    return true
  }

  async del(...keys) {
    let removed = 0
    for (const key of keys) {
      if (this.values.delete(key)) removed += 1
      this.expirations.delete(key)
    }
    return removed
  }

  async quit() {
    this.values.clear()
    this.expirations.clear()
    this.isOpen = false
  }
}

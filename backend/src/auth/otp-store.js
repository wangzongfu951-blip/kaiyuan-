import { randomInt as cryptoRandomInt } from 'node:crypto'
import { HttpError } from '../http/errors.js'
import { hashOtp, secureDigestEqual } from './token.js'

const CODE_TTL_SECONDS = 5 * 60
const COOLDOWN_SECONDS = 60
const DAILY_TTL_SECONDS = 24 * 60 * 60
const MAX_DAILY_REQUESTS = 10
const MAX_VERIFY_ATTEMPTS = 5

function systemToday() {
  return new Date().toISOString().slice(0, 10)
}

export class OtpStore {
  constructor({
    redis,
    hmacSecret,
    smsProvider,
    deliveryProvider,
    namespace = 'otp',
    recipientField = 'phone',
    randomInt = cryptoRandomInt,
    today = systemToday,
  }) {
    this.redis = redis
    this.hmacSecret = hmacSecret
    this.deliveryProvider = deliveryProvider || smsProvider
    this.namespace = namespace
    this.recipientField = recipientField
    this.randomInt = randomInt
    this.today = today
  }

  keys(recipient) {
    return {
      code: `${this.namespace}:code:${recipient}`,
      attempts: `${this.namespace}:attempts:${recipient}`,
      cooldown: `${this.namespace}:cooldown:${recipient}`,
      daily: `${this.namespace}:daily:${recipient}:${this.today()}`,
    }
  }

  async request(recipient) {
    const keys = this.keys(recipient)
    const cooldownCreated = await this.redis.set(keys.cooldown, '1', {
      EX: COOLDOWN_SECONDS,
      NX: true,
    })

    if (!cooldownCreated) {
      throw new HttpError(
        429,
        'OTP_TOO_FREQUENT',
        '验证码发送过于频繁，请稍后再试',
      )
    }

    const dailyRequests = await this.redis.incr(keys.daily)
    if (dailyRequests === 1) {
      await this.redis.expire(keys.daily, DAILY_TTL_SECONDS)
    }
    if (dailyRequests > MAX_DAILY_REQUESTS) {
      await this.redis.del(keys.cooldown)
      throw new HttpError(
        429,
        'OTP_DAILY_LIMIT',
        '今日验证码发送次数已达上限',
      )
    }

    const code = String(this.randomInt(100000, 1000000)).padStart(6, '0')
    const digest = hashOtp(this.hmacSecret, recipient, code)

    await this.redis.set(keys.code, digest, { EX: CODE_TTL_SECONDS })
    await this.redis.del(keys.attempts)

    return this.deliveryProvider.sendCode({
      recipient,
      [this.recipientField]: recipient,
      code,
    })
  }

  async verify(recipient, code) {
    const keys = this.keys(recipient)
    const expectedDigest = await this.redis.get(keys.code)

    if (!expectedDigest) {
      throw new HttpError(400, 'OTP_EXPIRED', '验证码已过期，请重新获取')
    }

    const actualDigest = hashOtp(this.hmacSecret, recipient, code)
    if (secureDigestEqual(expectedDigest, actualDigest)) {
      await this.redis.del(keys.code, keys.attempts)
      return true
    }

    const attempts = await this.redis.incr(keys.attempts)
    if (attempts === 1) {
      await this.redis.expire(keys.attempts, CODE_TTL_SECONDS)
    }
    if (attempts >= MAX_VERIFY_ATTEMPTS) {
      await this.redis.del(keys.code, keys.attempts)
      throw new HttpError(
        429,
        'OTP_ATTEMPTS_EXCEEDED',
        '验证码错误次数过多，请重新获取',
      )
    }

    throw new HttpError(400, 'OTP_INVALID', '验证码不正确')
  }
}

import { maskPhone, normalizeChinaPhone } from './phone.js'
import { createToken, hashToken } from './token.js'
import { HttpError } from '../http/errors.js'
import {
  normalizeAccount,
  validatePassword,
} from './account.js'
import { maskEmail, normalizeEmail } from './email.js'
import { hashPassword, verifyPassword } from './password.js'

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000

export class AuthService {
  constructor({
    repository,
    otpStore,
    emailOtpStore,
    sessionTtlDays = 30,
    now = () => new Date(),
  }) {
    this.repository = repository
    this.otpStore = otpStore
    this.emailOtpStore = emailOtpStore
    this.sessionTtlDays = sessionTtlDays
    this.now = now
  }

  async requestPhoneCode(rawPhone) {
    const phone = normalizeChinaPhone(rawPhone)
    return this.otpStore.request(phone)
  }

  async loginWithPhone({ phone: rawPhone, code, deviceName }) {
    const phone = normalizeChinaPhone(rawPhone)
    await this.otpStore.verify(phone, code)

    const user = await this.repository.findOrCreateIdentity({
      provider: 'phone',
      subject: phone,
      profile: { phoneMasked: maskPhone(phone) },
    })
    return this.createSessionResult(
      { ...user, phone: maskPhone(phone) },
      deviceName,
    )
  }

  async requestRegistrationCode({ bindingType, bindingValue }) {
    if (bindingType === 'phone') {
      const phone = normalizeChinaPhone(bindingValue)
      return this.otpStore.request(phone)
    }
    if (bindingType === 'email') {
      const email = normalizeEmail(bindingValue)
      if (!this.emailOtpStore) {
        throw new HttpError(
          503,
          'EMAIL_PROVIDER_UNAVAILABLE',
          '邮箱验证码服务尚未配置',
        )
      }
      return this.emailOtpStore.request(email)
    }
    throw new HttpError(
      400,
      'REGISTRATION_BINDING_REQUIRED',
      '注册账号必须绑定手机号或邮箱',
    )
  }

  async registerWithAccount({
    account: rawAccount,
    password: rawPassword,
    bindingType,
    bindingValue,
    code,
    deviceName,
  }) {
    const account = normalizeAccount(rawAccount)
    const password = validatePassword(rawPassword)
    let binding
    let publicIdentity

    if (bindingType === 'phone') {
      const phone = normalizeChinaPhone(bindingValue)
      await this.otpStore.verify(phone, code)
      binding = {
        provider: 'phone',
        subject: phone,
        profile: { phoneMasked: maskPhone(phone) },
      }
      publicIdentity = { phone: maskPhone(phone) }
    } else if (bindingType === 'email') {
      const email = normalizeEmail(bindingValue)
      if (!this.emailOtpStore) {
        throw new HttpError(
          503,
          'EMAIL_PROVIDER_UNAVAILABLE',
          '邮箱验证码服务尚未配置',
        )
      }
      await this.emailOtpStore.verify(email, code)
      binding = {
        provider: 'email',
        subject: email,
        profile: { emailMasked: maskEmail(email) },
      }
      publicIdentity = { email: maskEmail(email) }
    } else {
      throw new HttpError(
        400,
        'REGISTRATION_BINDING_REQUIRED',
        '注册账号必须绑定手机号或邮箱',
      )
    }

    try {
      const user = await this.repository.registerAccount({
        account,
        passwordHash: await hashPassword(password),
        binding,
      })
      return this.createSessionResult(
        { ...user, ...publicIdentity },
        deviceName,
      )
    } catch (error) {
      if (error?.code === '23505') {
        throw new HttpError(
          409,
          'ACCOUNT_OR_IDENTITY_EXISTS',
          '账号、手机号或邮箱已被使用',
        )
      }
      throw error
    }
  }

  async loginWithAccount({ account: rawAccount, password, deviceName }) {
    const account = normalizeAccount(rawAccount)
    const credential = await this.repository.findAccountCredential(account)
    const valid = credential
      ? await verifyPassword(String(password ?? ''), credential.passwordHash)
      : false
    if (!valid) {
      throw new HttpError(
        401,
        'ACCOUNT_LOGIN_FAILED',
        '账号或密码不正确',
      )
    }
    return this.createSessionResult(credential.user, deviceName)
  }

  async loginWithWechat(identity, deviceName) {
    if (
      identity?.provider !== 'wechat' ||
      !identity.subject ||
      !identity.profile
    ) {
      throw new HttpError(
        400,
        'WECHAT_IDENTITY_INVALID',
        '微信身份信息无效',
      )
    }

    const user = await this.repository.findOrCreateIdentity(identity)
    return this.createSessionResult(user, deviceName)
  }

  async bindPhone(userId, { phone: rawPhone, code }) {
    const phone = normalizeChinaPhone(rawPhone)
    await this.otpStore.verify(phone, code)
    return this.bindIdentity(userId, {
      provider: 'phone',
      subject: phone,
      profile: { phoneMasked: maskPhone(phone) },
    })
  }

  async bindIdentity(userId, identity) {
    if (!userId) {
      throw new HttpError(401, 'AUTH_REQUIRED', '请先登录')
    }
    if (!identity?.provider || !identity.subject) {
      throw new HttpError(400, 'IDENTITY_INVALID', '账号身份信息无效')
    }

    const ownerId = await this.repository.findIdentityOwner(identity)
    if (ownerId && ownerId !== userId) {
      throw new HttpError(
        409,
        'IDENTITY_ALREADY_BOUND',
        '该账号已绑定其他用户',
      )
    }
    if (ownerId === userId) {
      return { bound: true, alreadyBound: true }
    }

    const boundOwner = await this.repository.addIdentity(userId, identity)
    if (typeof boundOwner === 'string' && boundOwner !== userId) {
      throw new HttpError(
        409,
        'IDENTITY_ALREADY_BOUND',
        '该账号已绑定其他用户',
      )
    }

    return { bound: true, alreadyBound: false }
  }

  async createSessionResult(user, deviceName) {
    const sessionToken = createToken()
    const expiresAt = new Date(
      this.now().getTime() + this.sessionTtlDays * MILLISECONDS_PER_DAY,
    )

    await this.repository.createSession({
      userId: user.id,
      tokenHash: hashToken(sessionToken),
      deviceName,
      expiresAt,
    })

    return {
      user,
      sessionToken,
      expiresAt: expiresAt.toISOString(),
    }
  }

  async authenticateSession(sessionToken) {
    if (!sessionToken) return null
    return this.repository.findSessionByTokenHash(hashToken(sessionToken))
  }

  async logout(sessionToken) {
    if (!sessionToken) return false
    return this.repository.revokeSession(hashToken(sessionToken))
  }

  async logoutAll(userId) {
    if (!userId) {
      throw new HttpError(401, 'AUTH_REQUIRED', '请先登录')
    }
    return this.repository.revokeAllSessions(userId)
  }
}

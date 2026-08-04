import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

function read(path) {
  return fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
}

test('frontend auth client uses same-origin versioned API', () => {
  const http = read('src/services/http.ts')
  const legacyApi = read('src/api.ts')

  assert.match(http, /fetch\(`\/api\/v1\$\{path\}`/)
  assert.match(http, /credentials:\s*['"]include['"]/)
  assert.doesNotMatch(legacyApi, /:3000/)
})

test('router includes Chinese login flow and protected learning routes', () => {
  const router = read('src/router/index.ts')

  assert.match(router, /path:\s*['"]\/login['"]/)
  assert.match(router, /auth\/wechat\/callback/)
  assert.match(router, /requiresAuth:\s*true/)
  assert.match(router, /beforeEach/)
})

test('mobile login exposes account registration, phone, and WeChat controls', () => {
  const login = read('src/views/auth/LoginView.vue')
  const account = read('src/components/auth/AccountLoginPanel.vue')
  const phone = read('src/components/auth/PhoneLoginPanel.vue')
  const wechat = read('src/components/auth/WeChatLoginPanel.vue')

  assert.match(login, /账号登录/)
  assert.match(login, /手机号登录/)
  assert.match(login, /微信登录/)
  assert.match(account, /没有账号，立即注册/)
  assert.match(account, /绑定手机号/)
  assert.match(account, /绑定邮箱/)
  assert.match(account, /确认密码/)
  assert.match(phone, /获取验证码/)
  assert.match(phone, /登录并同步学习进度/)
  assert.match(wechat, /使用微信安全登录/)
})

test('primary navigation is the approved five-tab Chinese structure', () => {
  const app = read('src/App.vue')
  for (const label of ['首页', '词典', '学习', '复习', '我的']) {
    assert.match(app, new RegExp(`label:\\s*["']${label}["']`))
  }
  assert.doesNotMatch(app, /<svg/)
})

test('profile exposes real account binding and sync controls', () => {
  const profile = read('src/views/ProfileView.vue')

  for (const text of [
    '账号与同步',
    '手机号',
    '微信',
    '已同步',
    '退出登录',
  ]) {
    assert.match(profile, new RegExp(text))
  }
  assert.doesNotMatch(profile, /[❤️❌📊🗺️📅]/u)
  assert.doesNotMatch(profile, /<svg/)
})

test('generated login background is project-bound and size-limited', () => {
  const asset = new URL(
    '../public/assets/auth-liquid-glass-bg.png',
    import.meta.url,
  )
  const stat = fs.statSync(asset)
  assert.ok(stat.size > 100_000)
  assert.ok(stat.size < 2_000_000)
})

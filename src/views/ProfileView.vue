<template>
  <div class="profile-page">
    <header class="profile-header">
      <div>
        <p>个人中心</p>
        <h1>我的</h1>
      </div>
      <span class="sync-pill">
        <PhCloudCheck :size="17" weight="fill" aria-hidden="true" />
        已同步
      </span>
    </header>

    <main class="profile-content">
      <section class="identity-card">
        <div class="avatar">
          <img
            v-if="auth.state.user?.avatarUrl"
            :src="auth.state.user.avatarUrl"
            alt=""
          />
          <span v-else>{{ avatarText }}</span>
        </div>
        <div class="identity-copy">
          <h2>{{ auth.state.user?.displayName || '昭途用户' }}</h2>
          <p>坚持学习第 {{ streak }} 天</p>
        </div>
        <PhSealCheck :size="24" weight="fill" aria-label="账号已验证" />
      </section>

      <section class="stats-grid" aria-label="学习概览">
        <article>
          <strong>{{ totalLearned }}</strong>
          <span>已学词语</span>
        </article>
        <article>
          <strong>{{ totalReviewed }}</strong>
          <span>已复习</span>
        </article>
        <article>
          <strong>{{ totalMistakes }}</strong>
          <span>待巩固</span>
        </article>
      </section>

      <section class="section-card">
        <div class="section-title">
          <div>
            <p>账号安全</p>
            <h2>账号与同步</h2>
          </div>
          <PhArrowsClockwise :size="23" weight="duotone" aria-hidden="true" />
        </div>

        <div class="account-row">
          <span class="account-icon account">
            <PhIdentificationCard :size="23" weight="duotone" aria-hidden="true" />
          </span>
          <div>
            <strong>账号密码</strong>
            <span>{{ hasAccount ? '可使用账号密码登录' : '当前未设置' }}</span>
          </div>
          <span v-if="hasAccount" class="bound-state">
            <PhCheckCircle :size="17" weight="fill" /> 已启用
          </span>
          <span v-else class="unbound-state">未启用</span>
        </div>

        <div class="account-row">
          <span class="account-icon email">
            <PhEnvelopeSimple :size="23" weight="duotone" aria-hidden="true" />
          </span>
          <div>
            <strong>邮箱</strong>
            <span>{{ hasEmail ? auth.state.user?.email || '已绑定邮箱' : '尚未绑定' }}</span>
          </div>
          <span v-if="hasEmail" class="bound-state">
            <PhCheckCircle :size="17" weight="fill" /> 已绑定
          </span>
          <span v-else class="unbound-state">未绑定</span>
        </div>

        <div class="account-row">
          <span class="account-icon phone">
            <PhDeviceMobile :size="23" weight="duotone" aria-hidden="true" />
          </span>
          <div>
            <strong>手机号</strong>
            <span>
              {{ hasPhone ? auth.state.user?.phone || '已绑定' : '尚未绑定' }}
            </span>
          </div>
          <span v-if="hasPhone" class="bound-state">
            <PhCheckCircle :size="17" weight="fill" /> 已绑定
          </span>
          <button v-else type="button" @click="showPhoneBind = !showPhoneBind">
            {{ showPhoneBind ? '收起' : '去绑定' }}
          </button>
        </div>

        <form
          v-if="showPhoneBind && !hasPhone"
          class="bind-form"
          @submit.prevent="bindPhone"
        >
          <label>
            <span>手机号</span>
            <input
              v-model.trim="bindPhoneNumber"
              type="tel"
              inputmode="numeric"
              maxlength="11"
              placeholder="请输入 11 位手机号"
            />
          </label>
          <label>
            <span>验证码</span>
            <span class="bind-code-row">
              <input
                v-model.trim="bindCode"
                type="text"
                inputmode="numeric"
                maxlength="6"
                placeholder="短信验证码"
              />
              <button
                type="button"
                :disabled="bindCountdown > 0 || bindingCode"
                @click="requestBindCode"
              >
                {{ bindCountdown > 0 ? `${bindCountdown} 秒` : '获取验证码' }}
              </button>
            </span>
          </label>
          <p v-if="bindDevelopmentCode" class="development-hint">
            本地调试验证码：{{ bindDevelopmentCode }}
          </p>
          <p v-if="bindError" class="bind-error" role="alert">{{ bindError }}</p>
          <button class="bind-submit" type="submit" :disabled="bindingPhone">
            {{ bindingPhone ? '正在绑定' : '确认绑定手机号' }}
          </button>
        </form>

        <div class="account-row">
          <span class="account-icon wechat">
            <PhWechatLogo :size="23" weight="fill" aria-hidden="true" />
          </span>
          <div>
            <strong>微信</strong>
            <span>{{ hasWechat ? '已关联微信账号' : '尚未绑定' }}</span>
          </div>
          <span v-if="hasWechat" class="bound-state">
            <PhCheckCircle :size="17" weight="fill" /> 已绑定
          </span>
          <button
            v-else
            type="button"
            :disabled="bindingWechat"
            @click="bindWechat"
          >
            {{ bindingWechat ? '正在打开' : '去绑定' }}
          </button>
        </div>
      </section>

      <section class="section-card">
        <div class="section-title">
          <div>
            <p>学习管理</p>
            <h2>学习工具</h2>
          </div>
        </div>
        <button
          v-for="item in menuItems"
          :key="item.label"
          class="menu-row"
          type="button"
          @click="router.push(item.to)"
        >
          <span class="menu-icon">
            <component :is="item.icon" :size="22" weight="duotone" />
          </span>
          <span>{{ item.label }}</span>
          <PhCaretRight :size="18" aria-hidden="true" />
        </button>
      </section>

      <section class="section-card daily-plan">
        <div class="section-title">
          <div>
            <p>学习节奏</p>
            <h2>每日学习目标</h2>
          </div>
          <strong>{{ dailyTarget }} <small>个/天</small></strong>
        </div>
        <div class="target-options">
          <button
            v-for="target in [5, 10, 15, 20]"
            :key="target"
            type="button"
            :class="{ active: dailyTarget === target }"
            @click="setTarget(target)"
          >
            {{ target }}
          </button>
        </div>
      </section>

      <button class="logout-button" type="button" @click="logout">
        <PhSignOut :size="20" aria-hidden="true" />
        退出登录
      </button>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, markRaw, onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  PhArrowsClockwise,
  PhBookBookmark,
  PhCalendarDots,
  PhCaretRight,
  PhChartLineUp,
  PhCheckCircle,
  PhCloudCheck,
  PhDeviceMobile,
  PhEnvelopeSimple,
  PhIdentificationCard,
  PhMapTrifold,
  PhSealCheck,
  PhSignOut,
  PhWechatLogo,
  PhXCircle,
} from '@phosphor-icons/vue'
import { usePlan, useStats } from '../stores/app'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const { streak, totalLearned, totalReviewed, totalMistakes } = useStats()
const { dailyTarget, setTarget } = usePlan()
const showPhoneBind = ref(false)
const bindPhoneNumber = ref('')
const bindCode = ref('')
const bindCountdown = ref(0)
const bindDevelopmentCode = ref('')
const bindError = ref('')
const bindingCode = ref(false)
const bindingPhone = ref(false)
const bindingWechat = ref(false)
let bindTimer: number | undefined

const identities = computed(() => auth.state.user?.identities || [])
const hasAccount = computed(() => identities.value.includes('account'))
const hasEmail = computed(() => identities.value.includes('email'))
const hasPhone = computed(() => identities.value.includes('phone'))
const hasWechat = computed(() => identities.value.includes('wechat'))
const avatarText = computed(
  () => auth.state.user?.displayName?.slice(0, 1) || '学',
)

const menuItems = [
  { icon: markRaw(PhBookBookmark), label: '我的收藏', to: '/favorites' },
  { icon: markRaw(PhXCircle), label: '错题本', to: '/mistakes' },
  { icon: markRaw(PhChartLineUp), label: '学习周报', to: '/weekly-report' },
  { icon: markRaw(PhMapTrifold), label: '学习路径', to: '/learning-path' },
  { icon: markRaw(PhCalendarDots), label: '学习计划', to: '/plan' },
]

function validPhone() {
  if (!/^1[3-9]\d{9}$/.test(bindPhoneNumber.value)) {
    bindError.value = '请输入正确的 11 位手机号'
    return false
  }
  return true
}

function startBindCountdown() {
  window.clearInterval(bindTimer)
  bindCountdown.value = 60
  bindTimer = window.setInterval(() => {
    bindCountdown.value -= 1
    if (bindCountdown.value <= 0) window.clearInterval(bindTimer)
  }, 1000)
}

async function requestBindCode() {
  if (!validPhone()) return
  bindingCode.value = true
  bindError.value = ''
  try {
    const { data } = await auth.requestPhoneCode(bindPhoneNumber.value)
    bindDevelopmentCode.value = data.developmentCode || ''
    startBindCountdown()
  } catch (error) {
    bindError.value = (error as Error).message
  } finally {
    bindingCode.value = false
  }
}

async function bindPhone() {
  if (!validPhone()) return
  if (!/^\d{4,8}$/.test(bindCode.value)) {
    bindError.value = '请输入短信验证码'
    return
  }
  bindingPhone.value = true
  bindError.value = ''
  try {
    await auth.bindPhone({
      phone: bindPhoneNumber.value,
      code: bindCode.value,
    })
    await auth.load(true)
    showPhoneBind.value = false
  } catch (error) {
    bindError.value = (error as Error).message
  } finally {
    bindingPhone.value = false
  }
}

async function bindWechat() {
  bindingWechat.value = true
  try {
    const mode = window.matchMedia('(min-width: 768px)').matches
      ? 'qr'
      : 'mobile'
    const { data } = await auth.getWechatUrl(mode, 'bind')
    window.location.assign(data.url)
  } catch (error) {
    bindError.value = (error as Error).message
    bindingWechat.value = false
  }
}

async function logout() {
  await auth.logout()
  await router.replace('/login')
}

onBeforeUnmount(() => window.clearInterval(bindTimer))
</script>

<style scoped>
.profile-page {
  min-height: 100dvh;
  background: #f4f6fb;
}

.profile-header {
  position: sticky;
  z-index: 20;
  top: 0;
  display: flex;
  min-height: 64px;
  align-items: center;
  justify-content: space-between;
  padding: max(10px, env(safe-area-inset-top)) 18px 10px;
  border-bottom: 1px solid rgba(221, 226, 239, 0.78);
  background: rgba(248, 249, 253, 0.82);
  backdrop-filter: blur(22px) saturate(135%);
}

.profile-header p,
.section-title p {
  margin: 0 0 2px;
  color: #8993aa;
  font-size: 11px;
}

.profile-header h1,
.section-title h2 {
  margin: 0;
  color: #172039;
  font-size: 20px;
}

.sync-pill {
  display: inline-flex;
  min-height: 34px;
  align-items: center;
  gap: 5px;
  padding: 0 11px;
  border: 1px solid #dbe4ff;
  border-radius: 99px;
  color: #4358c7;
  background: rgba(239, 243, 255, 0.82);
  font-size: 12px;
  font-weight: 700;
}

.profile-content {
  display: grid;
  width: min(100%, 720px);
  box-sizing: border-box;
  gap: 14px;
  margin: 0 auto;
  padding: 16px 16px 30px;
}

.identity-card,
.section-card,
.stats-grid article {
  border: 1px solid rgba(255, 255, 255, 0.86);
  background: rgba(255, 255, 255, 0.78);
  box-shadow:
    0 12px 34px rgba(41, 54, 98, 0.07),
    inset 0 1px 0 rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(18px);
}

.identity-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  border-radius: 22px;
}

.identity-card > svg {
  color: #4d60d4;
}

.avatar {
  display: grid;
  width: 56px;
  height: 56px;
  flex: 0 0 auto;
  place-items: center;
  overflow: hidden;
  border-radius: 19px;
  color: #fff;
  background: #5366d8;
  font-size: 22px;
  font-weight: 800;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.identity-copy {
  flex: 1;
  min-width: 0;
}

.identity-copy h2 {
  margin: 0 0 4px;
  color: #172039;
  font-size: 18px;
}

.identity-copy p {
  margin: 0;
  color: #7e899f;
  font-size: 13px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.stats-grid article {
  display: grid;
  gap: 4px;
  padding: 15px 8px;
  border-radius: 18px;
  text-align: center;
}

.stats-grid strong {
  color: #465bd0;
  font-size: 23px;
}

.stats-grid span {
  color: #8a93a7;
  font-size: 11px;
}

.section-card {
  overflow: hidden;
  border-radius: 22px;
}

.section-title {
  display: flex;
  min-height: 66px;
  align-items: center;
  justify-content: space-between;
  box-sizing: border-box;
  padding: 13px 17px;
  border-bottom: 1px solid #edf0f6;
}

.section-title > svg {
  color: #5366d8;
}

.account-row,
.menu-row {
  display: flex;
  min-height: 64px;
  align-items: center;
  gap: 12px;
  padding: 9px 16px;
  border: 0;
  border-bottom: 1px solid #edf0f6;
  background: transparent;
  text-align: left;
}

.account-row:last-child,
.menu-row:last-child {
  border-bottom: 0;
}

.account-icon,
.menu-icon {
  display: grid;
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 13px;
}

.account-icon.phone,
.menu-icon {
  color: #4d60d4;
  background: #eef1ff;
}

.account-icon.account {
  color: #4d60d4;
  background: #eef1ff;
}

.account-icon.email {
  color: #9a5f2a;
  background: #fff5e9;
}

.account-icon.wechat {
  color: #1f9f55;
  background: #edf9f1;
}

.account-row > div {
  display: grid;
  flex: 1;
  gap: 3px;
}

.account-row strong {
  color: #222b43;
  font-size: 14px;
}

.account-row div span {
  color: #929aab;
  font-size: 12px;
}

.account-row button {
  min-width: 64px;
  min-height: 38px;
  border: 1px solid #dce2f2;
  border-radius: 12px;
  color: #4d60d4;
  background: rgba(255, 255, 255, 0.66);
  font-size: 12px;
  font-weight: 700;
}

.bound-state {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #238953;
  font-size: 11px;
  font-weight: 700;
}

.unbound-state {
  color: #9aa2b4;
  font-size: 11px;
  font-weight: 700;
}

.bind-form {
  display: grid;
  gap: 12px;
  padding: 14px 16px 18px;
  border-bottom: 1px solid #edf0f6;
  background: rgba(244, 247, 253, 0.68);
}

.bind-form label {
  display: grid;
  gap: 6px;
  color: #616c84;
  font-size: 12px;
  font-weight: 700;
}

.bind-form input {
  width: 100%;
  min-height: 44px;
  box-sizing: border-box;
  padding: 0 12px;
  border: 1px solid #dce2f0;
  border-radius: 12px;
  outline: 0;
  color: #1d263e;
  background: rgba(255, 255, 255, 0.8);
  font-size: 15px;
}

.bind-code-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 92px;
  gap: 8px;
}

.bind-code-row button {
  border: 1px solid #dce2f0;
  border-radius: 12px;
  color: #4d60d4;
  background: #fff;
  font-size: 12px;
  font-weight: 700;
}

.development-hint,
.bind-error {
  margin: 0;
  font-size: 12px;
}

.development-hint { color: #5265cc; }
.bind-error { color: #c44052; }

.bind-submit {
  min-height: 46px;
  border: 0;
  border-radius: 13px;
  color: #fff;
  background: #4d60d4;
  font-weight: 750;
}

.menu-row {
  width: 100%;
  color: #2d364e;
  font-size: 14px;
}

.menu-row > span:nth-child(2) {
  flex: 1;
}

.menu-row > svg {
  color: #9ba3b5;
}

.daily-plan .section-title > strong {
  color: #4d60d4;
  font-size: 24px;
}

.daily-plan small {
  color: #8f98ac;
  font-size: 11px;
}

.target-options {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  padding: 14px 16px 17px;
}

.target-options button {
  min-height: 42px;
  border: 1px solid #e0e5f0;
  border-radius: 12px;
  color: #7d879c;
  background: #f7f8fb;
  font-weight: 700;
}

.target-options button.active {
  border-color: #4d60d4;
  color: #fff;
  background: #4d60d4;
}

.logout-button {
  display: flex;
  min-height: 50px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 1px solid #e6dfe4;
  border-radius: 16px;
  color: #b34255;
  background: rgba(255, 255, 255, 0.72);
  font-size: 14px;
  font-weight: 750;
}

@media (min-width: 760px) {
  .profile-content {
    grid-template-columns: 1fr 1fr;
    align-items: start;
    padding: 24px;
  }

  .identity-card,
  .stats-grid {
    grid-column: 1 / -1;
  }

  .logout-button {
    grid-column: 1 / -1;
  }
}
</style>

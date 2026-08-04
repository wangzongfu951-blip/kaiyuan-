<template>
  <main class="login-page">
    <section class="brand-panel" aria-labelledby="login-title">
      <div class="brand">
        <span class="brand-icon" aria-hidden="true">
          <PhBrain :size="30" weight="duotone" />
        </span>
        <span>昭途</span>
      </div>
      <div class="brand-copy">
        <p class="eyebrow">考公词语智能记忆系统</p>
        <h1 id="login-title">把每一次遗忘，<br />变成下一次记住。</h1>
        <p>
          用艾宾浩斯记忆节奏学习成语和实词，让手机与平板上的进度始终一致。
        </p>
      </div>
      <ul class="benefits" aria-label="系统特点">
        <li>
          <PhCalendarCheck :size="21" weight="duotone" aria-hidden="true" />
          <span>按遗忘节奏安排复习</span>
        </li>
        <li>
          <PhCloudCheck :size="21" weight="duotone" aria-hidden="true" />
          <span>多设备自动同步进度</span>
        </li>
        <li>
          <PhShieldCheck :size="21" weight="duotone" aria-hidden="true" />
          <span>账号、手机号与微信安全登录</span>
        </li>
      </ul>
    </section>

    <section class="login-card" aria-label="登录">
      <header>
        <p>欢迎使用昭途</p>
        <h2>登录后继续今日学习</h2>
      </header>

      <div class="login-tabs" role="tablist" aria-label="登录方式">
        <button
          type="button"
          role="tab"
          :aria-selected="activeTab === 'account'"
          :class="{ active: activeTab === 'account' }"
          @click="activeTab = 'account'"
        >
          账号登录
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="activeTab === 'phone'"
          :class="{ active: activeTab === 'phone' }"
          @click="activeTab = 'phone'"
        >
          手机号登录
        </button>
        <button
          type="button"
          role="tab"
          :aria-selected="activeTab === 'wechat'"
          :class="{ active: activeTab === 'wechat' }"
          @click="activeTab = 'wechat'"
        >
          微信登录
        </button>
      </div>

      <AccountLoginPanel
        v-if="activeTab === 'account'"
        @success="finishLogin"
      />
      <PhoneLoginPanel
        v-else-if="activeTab === 'phone'"
        @success="finishLogin"
      />
      <WeChatLoginPanel v-else />

      <footer>
        登录即表示你同意
        <button type="button">用户协议</button>
        和
        <button type="button">隐私政策</button>
      </footer>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  PhBrain,
  PhCalendarCheck,
  PhCloudCheck,
  PhShieldCheck,
} from '@phosphor-icons/vue'
import PhoneLoginPanel from '../../components/auth/PhoneLoginPanel.vue'
import AccountLoginPanel from '../../components/auth/AccountLoginPanel.vue'
import WeChatLoginPanel from '../../components/auth/WeChatLoginPanel.vue'

const route = useRoute()
const router = useRouter()
const activeTab = ref<'account' | 'phone' | 'wechat'>('account')

async function finishLogin() {
  const redirect =
    typeof route.query.redirect === 'string' &&
    route.query.redirect.startsWith('/')
      ? route.query.redirect
      : '/'
  await router.replace(redirect)
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
}
</script>

<style scoped>
.login-page {
  position: relative;
  display: grid;
  min-height: 100dvh;
  align-content: center;
  gap: 28px;
  padding:
    max(24px, env(safe-area-inset-top))
    20px
    max(28px, env(safe-area-inset-bottom));
  overflow-x: hidden;
  overflow-y: auto;
  background: #f5f7fb url('/assets/auth-liquid-glass-bg.png')
    center / cover no-repeat;
}

.login-page::after {
  position: absolute;
  inset: 0;
  content: '';
  pointer-events: none;
  background: rgba(250, 251, 254, 0.08);
}

.brand-panel,
.login-card {
  position: relative;
  z-index: 1;
  width: min(100%, 430px);
  margin: 0 auto;
}

.brand-panel {
  display: grid;
  gap: 20px;
  color: #18213b;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #3448b5;
  font-size: 24px;
  font-weight: 850;
  letter-spacing: 0.08em;
}

.brand-icon {
  display: grid;
  width: 46px;
  height: 46px;
  place-items: center;
  border: 1px solid #dce3f6;
  border-radius: 15px;
  background: rgba(255, 255, 255, 0.84);
  box-shadow: 0 8px 22px rgba(64, 78, 146, 0.1);
}

.brand-copy {
  display: none;
}

.benefits {
  display: none;
}

.login-card {
  padding: 24px 20px 20px;
  border: 1px solid rgba(255, 255, 255, 0.82);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.62);
  box-shadow:
    0 24px 70px rgba(64, 74, 112, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(28px) saturate(135%);
}

.login-card header p {
  margin: 0 0 5px;
  color: #6e7b9d;
  font-size: 13px;
  font-weight: 650;
}

.login-card header h2 {
  margin: 0;
  color: #17203a;
  font-size: clamp(23px, 6vw, 28px);
  line-height: 1.28;
}

.login-tabs {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 5px;
  margin: 22px 0;
  padding: 4px;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 14px;
  background: rgba(232, 236, 246, 0.54);
}

.login-tabs button {
  min-height: 42px;
  border: 0;
  border-radius: 10px;
  color: #77819a;
  background: transparent;
  padding: 0 5px;
  font-size: 13px;
  font-weight: 700;
}

.login-tabs button.active {
  color: #3347b5;
  background: rgba(255, 255, 255, 0.82);
  box-shadow:
    0 5px 16px rgba(49, 65, 137, 0.1),
    inset 0 1px 0 #fff;
}

footer {
  margin-top: 20px;
  color: #98a0b2;
  font-size: 11px;
  line-height: 1.6;
  text-align: center;
}

footer button {
  min-height: 32px;
  padding: 0 2px;
  border: 0;
  color: #5b69be;
  background: transparent;
  font: inherit;
}

@media (min-width: 820px) {
  .login-page {
    grid-template-columns: minmax(300px, 470px) minmax(380px, 450px);
    justify-content: center;
    align-items: center;
    gap: clamp(48px, 8vw, 100px);
    padding-inline: 48px;
  }

  .brand-panel,
  .login-card {
    width: 100%;
  }

  .brand-copy,
  .benefits {
    display: block;
  }

  .brand-copy .eyebrow {
    margin: 0 0 12px;
    color: #5364bd;
    font-size: 14px;
    font-weight: 750;
    letter-spacing: 0.12em;
  }

  .brand-copy h1 {
    margin: 0;
    color: #15203d;
    font-size: clamp(38px, 4.2vw, 56px);
    line-height: 1.18;
    letter-spacing: -0.04em;
  }

  .brand-copy > p:last-child {
    max-width: 430px;
    margin: 20px 0 0;
    color: #68748f;
    font-size: 16px;
    line-height: 1.8;
  }

  .benefits {
    margin: 6px 0 0;
    padding: 0;
    list-style: none;
  }

  .benefits li {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 13px;
    color: #53607c;
    font-size: 14px;
  }

  .benefits svg {
    color: #5265cc;
  }

  .login-card {
    padding: 32px;
  }
}

@media (max-height: 700px) and (max-width: 819px) {
  .login-page {
    align-content: start;
    padding-top: 32px;
  }
}
</style>

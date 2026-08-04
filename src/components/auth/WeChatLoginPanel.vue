<template>
  <div class="wechat-panel">
    <div class="wechat-mark" aria-hidden="true">
      <PhWechatLogo :size="34" weight="fill" />
    </div>
    <div class="wechat-copy">
      <h2>使用微信安全登录</h2>
      <p>手机内直接授权，电脑或平板可使用微信扫码。</p>
    </div>

    <p v-if="error" class="wechat-error" role="alert">{{ error }}</p>

    <button
      class="wechat-button"
      type="button"
      :disabled="loading"
      data-testid="wechat-login"
      @click="startWechat"
    >
      <PhSpinnerGap
        v-if="loading"
        class="spin"
        :size="21"
        aria-hidden="true"
      />
      <PhWechatLogo v-else :size="22" weight="fill" aria-hidden="true" />
      {{ loading ? '正在打开微信' : buttonLabel }}
    </button>

    <p class="wechat-note">
      登录后可同步成语、实词、错题与艾宾浩斯复习记录。
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { PhSpinnerGap, PhWechatLogo } from '@phosphor-icons/vue'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
const loading = ref(false)
const error = ref('')
const isWideScreen = window.matchMedia('(min-width: 768px)')
const mode = computed<'mobile' | 'qr'>(() =>
  isWideScreen.matches ? 'qr' : 'mobile',
)
const buttonLabel = computed(() =>
  mode.value === 'qr' ? '打开微信扫码登录' : '微信一键登录',
)

async function startWechat() {
  loading.value = true
  error.value = ''
  try {
    const { data } = await auth.getWechatUrl(mode.value)
    window.location.assign(data.url)
  } catch (requestError) {
    error.value = (requestError as Error).message
    loading.value = false
  }
}
</script>

<style scoped>
.wechat-panel {
  display: grid;
  justify-items: center;
  gap: 16px;
  padding: 8px 0 2px;
  text-align: center;
}

.wechat-mark {
  display: grid;
  width: 66px;
  height: 66px;
  place-items: center;
  border-radius: 22px;
  color: #1f9f55;
  background: #edf9f1;
  border: 1px solid #d9f1e1;
}

.wechat-copy h2 {
  margin: 0 0 7px;
  color: #182036;
  font-size: 20px;
}

.wechat-copy p,
.wechat-note {
  margin: 0;
  color: #7a859d;
  font-size: 13px;
  line-height: 1.65;
}

.wechat-button {
  display: flex;
  width: 100%;
  min-height: 52px;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border: 0;
  border-radius: 15px;
  color: #fff;
  background: #1f9f55;
  font-size: 16px;
  font-weight: 750;
  box-shadow: 0 12px 24px rgba(31, 159, 85, 0.18);
}

.wechat-button:hover:not(:disabled) {
  background: #198a49;
}

.wechat-button:disabled {
  opacity: 0.62;
}

.wechat-error {
  margin: 0;
  color: #c44052;
  font-size: 13px;
}

.spin {
  animation: spin 800ms linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>

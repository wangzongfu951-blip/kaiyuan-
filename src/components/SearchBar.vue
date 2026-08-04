<template>
  <div class="relative">
    <input
      ref="inputRef"
      :value="modelValue"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      @keydown.enter="$emit('search')"
      type="text"
      :placeholder="placeholder"
      class="w-full pl-5 pr-20 py-3.5 text-[15px] rounded-full bg-white border border-warm-gray
             shadow-[0_2px_12px_rgba(0,0,0,0.04)]
             focus:outline-none focus:border-cinnabar focus:shadow-[0_2px_16px_rgba(178,34,34,0.1)]
             transition-all duration-300 placeholder:text-ink-muted/50"
      :aria-label="ariaLabel"
    />
    <button
      @click="$emit('search')"
      class="absolute right-1.5 top-1/2 -translate-y-1/2 px-4 py-2 rounded-full
             bg-cinnabar text-white text-sm font-medium shadow-sm
             hover:bg-red-700 active:scale-[0.97] transition-all duration-200"
      aria-label="搜索成语"
    >
      搜索
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"

defineProps<{
  modelValue: string
  placeholder?: string
  ariaLabel?: string
}>()

defineEmits<{
  "update:modelValue": [value: string]
  search: []
}>()

const inputRef = ref<HTMLInputElement | null>(null)
</script>
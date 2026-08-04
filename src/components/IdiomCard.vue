<template>
  <button
    @click="$emit('click')"
    class="group relative bg-white rounded-xl p-4 border border-warm-gray/40
           shadow-[0_1px_4px_rgba(0,0,0,0.03)] text-left w-full
           hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:-translate-y-0.5
           transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cinnabar/30"
    :aria-label="'查看 ' + idiom + ' 解析'"
  >
    <div class="flex items-start justify-between mb-1">
      <span class="text-base font-serif font-bold text-ink group-hover:text-cinnabar transition-colors">
        {{ idiom }}
      </span>
      <span class="shrink-0 ml-2 px-1.5 py-0.5 rounded text-[9px] bg-red-50 text-cinnabar font-medium">
        易错点
      </span>
    </div>
    <div class="flex items-center gap-1 mt-1.5">
      <span class="w-1 h-1 rounded-full bg-cinnabar/40"></span>
      <span class="text-[11px] text-ink-muted">查看解析</span>
    </div>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  idiom: string
}>()

defineEmits<{
  click: []
}>()
</script>
<script setup lang="ts">
defineProps<{
  title?: string
}>()
</script>

<template>
  <div style="padding: 12px 14px; background: rgba(255,255,255,0.4); border-radius: 12px; display: flex; flex-direction: column; gap: 10px;">
    <span v-if="title" class="text-sm font-medium text-gray-700">{{ title }}</span>
    <slot />
  </div>
</template>

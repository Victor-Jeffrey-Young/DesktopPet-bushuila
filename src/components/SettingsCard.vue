<script setup lang="ts">
defineProps<{
  title?: string
}>()
</script>

<template>
  <section class="settings-card">
    <header v-if="title" class="settings-card-header">
      <span>{{ title }}</span>
    </header>
    <div class="settings-card-body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.settings-card {
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: var(--shadow-card);
}

.settings-card-header {
  padding: 13px 16px 0;
  color: var(--muted);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.035em;
  line-height: 1.2;
}

.settings-card-body {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 13px 16px 16px;
}
</style>

<script setup lang="ts">
defineProps<{
  modelValue: boolean
  label: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()
</script>

<template>
  <label class="switch-row">
    <span class="switch-label">{{ label }}</span>
    <div class="switch-track">
      <input
        type="checkbox"
        :checked="modelValue"
        class="peer sr-only"
        @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
      />
      <div class="switch-track-bg"></div>
      <span class="switch-thumb"></span>
    </div>
  </label>
</template>

<style scoped>
.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 28px;
  cursor: pointer;
  user-select: none;
}

.switch-label {
  color: var(--ink);
  font-size: 13px;
}

.switch-track {
  position: relative;
  flex: 0 0 auto;
  width: 37px;
  height: 22px;
}

.switch-track-bg {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: var(--switch-track-off);
  transition: background 200ms ease;
}

.switch-row:hover .switch-track-bg {
  background: var(--switch-track-off-hover);
}

.peer:checked ~ .switch-track-bg {
  background: var(--accent);
}

.peer:checked ~ .switch-track-bg:hover {
  background: var(--accent-hover);
}

.switch-thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--thumb);
  box-shadow: 0 1px 3px var(--thumb-shadow);
  transition: transform 200ms ease;
}

.peer:checked ~ .switch-thumb {
  transform: translateX(15px);
}
</style>

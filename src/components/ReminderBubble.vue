<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  count: number
  snoozeMinutes: number
}>()

const emit = defineEmits<{
  dismiss: []
  snooze: []
}>()

const progress = computed(() => Math.min(100, Math.round((props.count / 8) * 100)))
</script>

<template>
  <div class="reminder-layer" role="dialog" aria-label="喝水提醒">
    <section class="reminder-card">
      <header class="reminder-header">
        <div class="reminder-mark" aria-hidden="true">💧</div>
        <div class="reminder-heading">
          <span>补水提醒</span>
          <small>现在</small>
        </div>
        <span class="reminder-pulse" aria-hidden="true"></span>
      </header>

      <div class="reminder-copy">
        <h2>补水啦</h2>
        <p>给自己一点清爽的时间。</p>
      </div>

      <div class="reminder-progress" aria-label="今日喝水进度">
        <div class="progress-summary">
          <span>今日已喝</span>
          <strong>{{ count }} <small>/ 8 杯</small></strong>
        </div>
        <div class="progress-track"><span :style="{ width: `${progress}%` }"></span></div>
      </div>

      <div class="reminder-actions">
        <button type="button" class="action-button action-button-secondary" @click="emit('snooze')">
          稍后 {{ snoozeMinutes }} 分钟
        </button>
        <button type="button" class="action-button action-button-primary" @click="emit('dismiss')">
          已喝水
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.reminder-layer {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  pointer-events: none;
}

.reminder-card {
  width: min(100%, 280px);
  padding: 18px;
  overflow: hidden;
  border: 1px solid var(--line-strong);
  border-radius: 15px;
  background: var(--surface-raised);
  box-shadow: var(--shadow-pop);
  color: var(--ink);
  pointer-events: auto;
  backdrop-filter: blur(22px) saturate(145%);
  animation: reminder-enter 240ms cubic-bezier(0.22, 1, 0.36, 1);
}

.reminder-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.reminder-mark {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 9px;
  background: linear-gradient(145deg, #7fc8ff, #1679d6);
  box-shadow: 0 3px 8px rgba(0, 122, 255, 0.24);
  font-size: 19px;
}

.reminder-heading {
  min-width: 0;
  flex: 1;
}

.reminder-heading span,
.reminder-heading small {
  display: block;
}

.reminder-heading span {
  color: var(--ink);
  font-size: 13px;
  font-weight: 650;
}

.reminder-heading small {
  margin-top: 2px;
  color: var(--muted);
  font-size: 10px;
}

.reminder-pulse {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #ff9f0a;
  box-shadow: 0 0 0 3px rgba(255, 159, 10, 0.14);
}

.reminder-copy {
  margin-top: 13px;
}

.reminder-copy h2 {
  font-size: 25px;
  font-weight: 720;
  letter-spacing: -0.045em;
  line-height: 1.05;
}

.reminder-copy p {
  margin-top: 4px;
  color: var(--ink-secondary);
  font-size: 12px;
  line-height: 1.35;
}

.reminder-progress {
  margin-top: 12px;
  padding: 10px 11px 11px;
  border-radius: 9px;
  background: var(--accent-soft);
}

.progress-summary {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  color: var(--ink-secondary);
  font-size: 11px;
}

.progress-summary strong {
  color: var(--accent);
  font-size: 14px;
  font-variant-numeric: tabular-nums;
}

.progress-summary small {
  color: var(--muted);
  font-size: 9px;
  font-weight: 500;
}

.progress-track {
  height: 4px;
  margin-top: 7px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--accent-soft-strong);
}

.progress-track span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--accent);
  transition: width 300ms ease;
}

.reminder-actions {
  display: grid;
  grid-template-columns: 1fr 1.08fr;
  gap: 6px;
  margin-top: 11px;
}

.action-button {
  min-width: 0;
  min-height: 38px;
  padding: 0 7px;
  border: 0;
  border-radius: 9px;
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  transition: transform 140ms ease, background 140ms ease, color 140ms ease;
}

.action-button:active {
  transform: scale(0.97);
}

.action-button-secondary {
  border: 1px solid var(--line);
  background: var(--import-bg);
  color: var(--ink-secondary);
}

.action-button-secondary:hover {
  background: var(--surface-solid);
  color: var(--ink);
}

.action-button-primary {
  background: var(--accent);
  color: white;
  box-shadow: 0 2px 5px rgba(0, 122, 255, 0.22);
}

.action-button-primary:hover {
  background: var(--accent-hover);
}

@keyframes reminder-enter {
  from { opacity: 0; transform: translateY(8px) scale(0.96); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
</style>

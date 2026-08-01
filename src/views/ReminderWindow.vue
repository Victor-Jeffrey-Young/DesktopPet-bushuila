<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { emit as emitEvent, listen, type UnlistenFn } from '@tauri-apps/api/event'
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import ReminderBubble from '../components/ReminderBubble.vue'
import { useTheme } from '../composables/useTheme'

interface ReminderPayload {
  count: number
  snoozeMinutes: number
}

const reminder = ref<ReminderPayload>({ count: 0, snoozeMinutes: 5 })
const win = getCurrentWebviewWindow()
useTheme()

let unlistenData: UnlistenFn | null = null

async function handleDismiss() {
  await emitEvent('reminder-dismiss')
  await win.hide()
}

async function handleSnooze() {
  await emitEvent('reminder-snooze')
  await win.hide()
}

onMounted(async () => {
  document.title = '补水提醒'
  unlistenData = await listen<ReminderPayload>('reminder-data', event => {
    reminder.value = event.payload
  })
  await emitEvent('reminder-ready')
})

onUnmounted(() => {
  unlistenData?.()
})
</script>

<template>
  <ReminderBubble
    :count="reminder.count"
    :snooze-minutes="reminder.snoozeMinutes"
    @dismiss="handleDismiss"
    @snooze="handleSnooze"
  />
</template>

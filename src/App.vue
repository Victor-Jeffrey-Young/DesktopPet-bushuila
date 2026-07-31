<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { ref } from 'vue'
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window'
import SpritePet from './components/SpritePet.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import ReminderBubble from './components/ReminderBubble.vue'
import { useAppStore } from './stores/app'
import { useReminderTimer } from './composables/useReminderTimer'
import { useAudio } from './composables/useAudio'

const store = useAppStore()
const { scheduleReminder, snooze: snoozeTimer, countdown, formatCountdown } = useReminderTimer()
const { play: playAudio, playBeep } = useAudio()
const showSettings = ref(false)
const showBubble = ref(false)
const appWindow = getCurrentWindow()

// 提醒时播放语音
watch(() => store.spriteState, (state) => {
  if (state !== 'reminding') return

  if (store.settings.voiceSource === 'custom' && store.customVoices.length > 0) {
    const idx = Math.floor(Math.random() * store.customVoices.length)
    playAudio(store.customVoices[idx].dataUrl)
  } else {
    playBeep(800, 300)
  }
})

async function toggleSettings() {
  showSettings.value = !showSettings.value
  if (showSettings.value) {
    await appWindow.setSize(new LogicalSize(420, 560))
    await appWindow.center()
  } else {
    await appWindow.setSize(new LogicalSize(200, 280))
  }
}

async function handleCloseSettings() {
  showSettings.value = false
  await appWindow.setSize(new LogicalSize(200, 280))
  scheduleReminder()
}

function handleDismiss() {
  showBubble.value = false
  store.spriteState = 'idle'
  scheduleReminder()
}

function handleSnooze() {
  showBubble.value = false
  snoozeTimer()
}

onMounted(() => {
  scheduleReminder()
})
</script>

<template>
  <div class="w-full h-full flex items-center justify-center relative">
    <SpritePet
      :state="store.spriteState"
      :countdown="formatCountdown(countdown)"
      @right-click="toggleSettings"
      @click="store.spriteState === 'reminding' ? (showBubble = true) : null"
    />

    <ReminderBubble
      v-if="store.spriteState === 'reminding' && showBubble"
      :count="store.todayCount"
      @dismiss="handleDismiss"
      @snooze="handleSnooze"
    />

    <SettingsPanel v-if="showSettings" @close="handleCloseSettings" />
  </div>
</template>
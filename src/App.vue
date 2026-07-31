<script setup lang="ts">
import { onMounted, watch, onErrorCaptured } from 'vue'
import { ref } from 'vue'
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window'
import SpritePet from './components/SpritePet.vue'
import SettingsPanel from './components/SettingsPanel.vue'
import ReminderBubble from './components/ReminderBubble.vue'
import { useAppStore } from './stores/app'
import { useReminderTimer } from './composables/useReminderTimer'
import { useAudio } from './composables/useAudio'
import { readVoiceFile } from './utils/storage'

const store = useAppStore()
const { scheduleReminder, snooze: snoozeTimer, countdown, formatCountdown } = useReminderTimer()
const { play: playAudio, playBeep } = useAudio()
const showSettings = ref(false)
const showBubble = ref(false)
const hasError = ref(false)
const appWindow = getCurrentWindow()

onErrorCaptured((err) => {
  hasError.value = true
  console.error('[Component Error]', err)
  return false
})

async function playVoiceFromPath(filePath: string) {
  const buffer = await readVoiceFile(filePath)
  await playAudio(buffer)
}

watch(() => store.spriteState, (state) => {
  if (state !== 'reminding') return

  showBubble.value = true

  if (store.settings.voiceSource === 'custom' && store.customVoices.length > 0) {
    const idx = Math.floor(Math.random() * store.customVoices.length)
    const voice = store.customVoices[idx]
    if (voice.filePath) {
      playVoiceFromPath(voice.filePath)
    }
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

function handleReload() {
  globalThis.location.reload()
}

onMounted(() => {
  store.loadBuiltinPets()
  store.migrateVoices()
  scheduleReminder()
})
</script>

<template>
  <div v-if="hasError" class="w-full h-full flex items-center justify-center">
    <div class="text-center space-y-2">
      <span class="text-3xl">😵</span>
      <p class="text-sm text-white/70">精灵遇到了问题</p>
      <button
        class="text-xs text-white/50 underline"
        @click="handleReload"
      >
        重新加载
      </button>
    </div>
  </div>
  <div v-else class="w-full h-full flex items-center justify-center relative">
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
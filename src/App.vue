<script setup lang="ts">
import { onMounted, watch, onErrorCaptured, onUnmounted } from 'vue'
import { ref } from 'vue'
import SpritePet from './components/SpritePet.vue'
import ReminderBubble from './components/ReminderBubble.vue'
import { useAppStore } from './stores/app'
import { useReminderTimer } from './composables/useReminderTimer'
import { useAudio } from './composables/useAudio'
import { readVoiceFile } from './utils/storage'
import { openPanel } from './windows'
import { useTheme } from './composables/useTheme'

const store = useAppStore()
useTheme()
const { scheduleReminder, resetTimer, snooze: snoozeTimer, countdown, formatCountdown } = useReminderTimer()
const { play: playAudio, playBeep } = useAudio()
const showBubble = ref(false)
const hasError = ref(false)

onErrorCaptured((err) => {
  hasError.value = true
  console.error('[Component Error]', err instanceof Error ? err.message : err, err instanceof Error ? err.stack : '')
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

/** 设置面板：独立窗口，不再改变宠物窗口尺寸 */
function openSettings() {
  openPanel('settings')
}

function handleDismiss() {
  showBubble.value = false
  store.confirmDrink()
  resetTimer()
}

function handleSnooze() {
  showBubble.value = false
  snoozeTimer()
}

function handleReload() {
  globalThis.location.reload()
}

/** 设置窗口在 localStorage 写入后同步刷新本窗口 store（storage 事件跨窗口触发） */
function onStorage(e: StorageEvent) {
  if (!e.key) return
  store.reloadFromStorage()
  if (store.spriteState === 'idle') scheduleReminder()
}

onMounted(() => {
  window.addEventListener('storage', onStorage)
  store.loadBuiltinPets()
  store.migrateVoices()
  scheduleReminder()
})

onUnmounted(() => {
  window.removeEventListener('storage', onStorage)
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
      @right-click="openSettings"
      @click="store.spriteState === 'reminding' ? (showBubble = true) : null"
    />

    <ReminderBubble
      v-if="store.spriteState === 'reminding' && showBubble"
      :count="store.todayCount"
      :snooze-minutes="store.settings.snoozeMinutes"
      @dismiss="handleDismiss"
      @snooze="handleSnooze"
    />
  </div>
</template>

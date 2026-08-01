<script setup lang="ts">
import { onMounted, watch, onErrorCaptured, onUnmounted } from 'vue'
import { ref } from 'vue'
import { emit as emitEvent, listen, type UnlistenFn } from '@tauri-apps/api/event'
import SpritePet from './components/SpritePet.vue'
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
const hasError = ref(false)
let reminderReadyUnlisten: UnlistenFn | null = null
let reminderDismissUnlisten: UnlistenFn | null = null
let reminderSnoozeUnlisten: UnlistenFn | null = null

onErrorCaptured((err) => {
  hasError.value = true
  console.error('[Component Error]', err instanceof Error ? err.message : err, err instanceof Error ? err.stack : '')
  return false
})

async function playVoiceFromPath(filePath: string) {
  const buffer = await readVoiceFile(filePath)
  await playAudio(buffer)
}

async function sendReminderData() {
  if (store.spriteState !== 'reminding') return
  await emitEvent('reminder-data', {
    count: store.todayCount,
    snoozeMinutes: store.settings.snoozeMinutes,
  })
}

watch(() => store.spriteState, (state) => {
  if (state !== 'reminding') return

  void openPanel('reminder').then(() => sendReminderData())

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
  store.confirmDrink()
  resetTimer()
}

function handleSnooze() {
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

onMounted(async () => {
  window.addEventListener('storage', onStorage)
  reminderReadyUnlisten = await listen('reminder-ready', sendReminderData)
  reminderDismissUnlisten = await listen('reminder-dismiss', handleDismiss)
  reminderSnoozeUnlisten = await listen('reminder-snooze', handleSnooze)
  store.loadBuiltinPets()
  store.migrateVoices()
  scheduleReminder()
})

onUnmounted(() => {
  window.removeEventListener('storage', onStorage)
  reminderReadyUnlisten?.()
  reminderDismissUnlisten?.()
  reminderSnoozeUnlisten?.()
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
    />
  </div>
</template>

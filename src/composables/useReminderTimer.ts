import { ref, onMounted, onUnmounted } from 'vue'
import { useAppStore } from '../stores/app'

export function useReminderTimer() {
  const store = useAppStore()
  const timerId = ref<ReturnType<typeof setTimeout> | null>(null)
  const countdown = ref(0)
  const countdownId = ref<ReturnType<typeof setInterval> | null>(null)

  function startCountdown() {
    const target = store.nextReminderTime
    countdown.value = Math.max(0, Math.floor((target - Date.now()) / 1000))

    if (countdownId.value) clearInterval(countdownId.value)
    countdownId.value = setInterval(() => {
      countdown.value = Math.max(0, Math.floor((target - Date.now()) / 1000))
      if (countdown.value <= 0 && countdownId.value) {
        clearInterval(countdownId.value)
        countdownId.value = null
      }
    }, 1000)
  }

  function scheduleReminder() {
    if (timerId.value) clearTimeout(timerId.value)

    const delay = store.nextReminderTime - Date.now()
    startCountdown()

    timerId.value = setTimeout(() => {
      store.startReminder()
      // 下一次常规提醒应由“已喝水”或“稍后提醒”决定。
      // 若在这里立刻重置，会在提醒仍显示时创建一轮额外的常规计时。
      timerId.value = null
    }, Math.max(delay, 0))
  }

  function resetTimer() {
    store.updateSettings({ intervalMinutes: store.settings.intervalMinutes })
    scheduleReminder()
  }

  function snooze(minutes?: number) {
    const mins = minutes ?? store.settings.snoozeMinutes
    store.snooze(mins)
    scheduleReminder()
  }

  function dismiss() {
    store.spriteState = 'idle'
    resetTimer()
  }

  function formatCountdown(seconds: number): string {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  // 窗口可见性检测：隐藏时暂停倒计时，恢复时重新计算
  let isTabHidden = false

  function onVisibilityChange() {
    if (document.hidden) {
      isTabHidden = true
      if (countdownId.value) {
        clearInterval(countdownId.value)
        countdownId.value = null
      }
    } else if (isTabHidden) {
      isTabHidden = false
      // 恢复时重新计算差值并启动倒计时
      const target = store.nextReminderTime
      countdown.value = Math.max(0, Math.floor((target - Date.now()) / 1000))
      if (countdown.value > 0) {
        startCountdown()
      }
    }
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange)
  })

  onUnmounted(() => {
    if (timerId.value) clearTimeout(timerId.value)
    if (countdownId.value) clearInterval(countdownId.value)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  })

  return {
    countdown,
    scheduleReminder,
    resetTimer,
    snooze,
    dismiss,
    formatCountdown,
  }
}

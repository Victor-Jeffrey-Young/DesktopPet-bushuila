import { ref, onMounted, onUnmounted } from 'vue'
import { useAppStore } from '../stores/app'

export type ThemePref = 'system' | 'light' | 'dark'

const systemMedia = window.matchMedia('(prefers-color-scheme: dark)')

/** 解析最终主题：system → 跟随系统 */
export function resolveTheme(pref: ThemePref): 'light' | 'dark' {
  if (pref === 'dark') return 'dark'
  if (pref === 'light') return 'light'
  return systemMedia.matches ? 'dark' : 'light'
}

/** 将主题应用到当前窗口的 document */
export function applyThemeToDocument(theme: 'light' | 'dark') {
  document.documentElement.dataset.theme = theme
}

/**
 * 主题管理：根据 store 偏好 + 系统设置应用主题到当前窗口，
 * 并响应系统切换与跨窗口设置变更（storage 事件）。
 */
export function useTheme() {
  const store = useAppStore()

  function apply() {
    applyThemeToDocument(resolveTheme(store.settings.theme ?? 'system'))
  }

  function onSystemChange() {
    if ((store.settings.theme ?? 'system') === 'system') apply()
  }

  function onStorage(e: StorageEvent) {
    if (!e.key) return
    store.reloadFromStorage()
    apply()
  }

  onMounted(() => {
    apply()
    systemMedia.addEventListener('change', onSystemChange)
    window.addEventListener('storage', onStorage)
  })

  onUnmounted(() => {
    systemMedia.removeEventListener('change', onSystemChange)
    window.removeEventListener('storage', onStorage)
  })

  return { apply }
}

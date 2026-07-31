import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'
import { invoke } from '@tauri-apps/api/core'
import { useAppStore } from '../stores/app'

const appWindow = getCurrentWebviewWindow()

export function useWindowDrag() {
  const store = useAppStore()

  /**
   * 使用 Tauri 原生拖拽 API 避免透明窗口残影。
   * 原生 startDragging() 由 OS 窗口管理器直接移动窗口 GPU 表面，
   * 无需 WebKit 重渲染，彻底消除 setPosition() 手动拖拽导致的残影。
   */
  async function startDrag(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('.no-drag')) return
    await appWindow.startDragging()
  }

  /**
   * 根据系统托盘设置决定关闭行为：
   * - 启用托盘：隐藏窗口到托盘
   * - 禁用托盘：彻底退出应用
   */
  async function closeOrHide() {
    if (store.settings.systemTray) {
      await appWindow.hide()
    } else {
      await invoke('quit_app')
    }
  }

  /** 强制隐藏到托盘（忽略设置） */
  async function hide() {
    await appWindow.hide()
  }

  async function close() {
    await appWindow.close()
  }

  async function minimize() {
    await appWindow.minimize()
  }

  return { startDrag, closeOrHide, hide, close, minimize }
}
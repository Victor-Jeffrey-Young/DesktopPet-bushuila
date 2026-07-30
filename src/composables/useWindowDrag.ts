import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow'

const appWindow = getCurrentWebviewWindow()

export function useWindowDrag() {
  /**
   * 使用 Tauri 原生拖拽 API 避免透明窗口残影。
   * 原生 startDragging() 由 OS 窗口管理器直接移动窗口 GPU 表面，
   * 无需 WebKit 重渲染，彻底消除 setPosition() 手动拖拽导致的残影。
   */
  async function startDrag(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('.no-drag')) return
    await appWindow.startDragging()
  }

  async function hide() {
    await appWindow.hide()
  }

  async function close() {
    await appWindow.close()
  }

  async function minimize() {
    await appWindow.minimize()
  }

  return { startDrag, hide, close, minimize }
}
import { WebviewWindow } from '@tauri-apps/api/webviewWindow'

export const PANEL_SIZE = { width: 420, height: 560 }
export const REMINDER_SIZE = { width: 320, height: 300 }

const PANELS: Record<string, { view: string; title: string; width: number; height: number; windowOptions?: Record<string, boolean> }> = {
  settings: { view: 'settings', title: '设置', width: PANEL_SIZE.width, height: PANEL_SIZE.height },
  debug: { view: 'debug', title: 'Debug', width: PANEL_SIZE.width, height: PANEL_SIZE.height },
  reminder: {
    view: 'reminder',
    title: '补水提醒',
    width: REMINDER_SIZE.width,
    height: REMINDER_SIZE.height,
    windowOptions: {
      decorations: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
    },
  },
}

/**
 * 打开面板窗口（已存在则显示 + 聚焦，否则创建）。
 * 面板窗口独立于宠物窗口，互不遮挡。
 */
export async function openPanel(name: 'settings' | 'debug' | 'reminder'): Promise<WebviewWindow | null> {
  const cfg = PANELS[name]
  const existing = await WebviewWindow.getByLabel(name)
  if (existing) {
    await existing.show()
    await existing.setFocus()
    return existing
  }
  const win = new WebviewWindow(name, {
    url: `index.html?view=${cfg.view}`,
    title: cfg.title,
    width: cfg.width,
    height: cfg.height,
    resizable: cfg.windowOptions?.resizable ?? true,
    center: true,
    ...cfg.windowOptions,
  })
  return win
}

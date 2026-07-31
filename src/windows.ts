import { WebviewWindow } from '@tauri-apps/api/webviewWindow'

export const PANEL_SIZE = { width: 420, height: 560 }

const PANELS: Record<string, { view: string; title: string }> = {
  settings: { view: 'settings', title: '设置' },
  debug: { view: 'debug', title: 'Debug' },
}

/**
 * 打开面板窗口（已存在则显示 + 聚焦，否则创建）。
 * 面板窗口独立于宠物窗口，互不遮挡。
 */
export async function openPanel(name: 'settings' | 'debug'): Promise<WebviewWindow | null> {
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
    width: PANEL_SIZE.width,
    height: PANEL_SIZE.height,
    resizable: true,
    center: true,
  })
  return win
}

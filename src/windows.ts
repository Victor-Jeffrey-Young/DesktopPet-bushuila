import { WebviewWindow } from '@tauri-apps/api/webviewWindow'
import { LogicalSize } from '@tauri-apps/api/dpi'
import { useAppStore } from './stores/app'

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
  // 面板尺寸跟随宠物缩放倍率（与主窗口一致）
  const scale = useAppStore().settings.petScale ?? 1
  const win = new WebviewWindow(name, {
    url: `index.html?view=${cfg.view}`,
    title: cfg.title,
    width: Math.round(cfg.width * scale),
    height: Math.round(cfg.height * scale),
    resizable: cfg.windowOptions?.resizable ?? true,
    center: true,
    ...cfg.windowOptions,
  })
  // 统一逻辑尺寸：创建参数为物理像素，不同 DPI 缩放（13寸/27寸屏）下 CSS 视口会变化；
  // 按 LogicalSize 重设后任意 DPI 下窗口内 UI 尺寸一致
  await win.setSize(new LogicalSize(Math.round(cfg.width * scale), Math.round(cfg.height * scale)))
  // Windows：WebView2 背景显式全透明，防止透明窗口出现白/黑底矩形
  if (cfg.windowOptions?.transparent) {
    void win.setBackgroundColor([0, 0, 0, 0])
  }
  return win
}

/** 关闭面板窗口（不存在则无操作） */
export async function closePanel(name: 'settings' | 'debug' | 'reminder'): Promise<void> {
  const existing = await WebviewWindow.getByLabel(name)
  if (existing) {
    await existing.close()
  }
}

/** 已打开的面板窗口按缩放倍率统一调整逻辑尺寸（宠物大小变化时同步） */
export async function resizeAllPanels(scale: number): Promise<void> {
  for (const [name, cfg] of Object.entries(PANELS)) {
    const win = await WebviewWindow.getByLabel(name)
    if (win) {
      await win.setSize(new LogicalSize(Math.round(cfg.width * scale), Math.round(cfg.height * scale)))
    }
  }
}

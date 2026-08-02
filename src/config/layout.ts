/** 布局常量与边界计算（宠物窗口内布局，可单测） */

export const LAYOUT = {
  /** 精灵容器垂直位置（窗口高度百分比，偏上减少顶部留白） */
  petVerticalPct: 40,
  /** 精灵本体半宽（w-28 = 112px / 2） */
  petHalf: 56,
  /** 倒计时高度（精灵下方） */
  countdownH: 36,
  /** 边缘安全边距 */
  edge: 8,
  /** 操作按钮宽度 */
  buttonW: 28,
  /** 操作按钮组高度（2×28 + gap 8） */
  buttonGroupH: 64,
  /** 按钮与精灵间距 */
  buttonGap: 8,
} as const

/** 布局参数（可缩放项为 number，便于按倍率生成变体） */
export interface PetLayout {
  petVerticalPct: number
  petHalf: number
  countdownH: number
  edge: number
  buttonW: number
  buttonGroupH: number
  buttonGap: number
}

/** 主窗口逻辑基准尺寸（px），随宠物缩放按比例放大 */
export const WINDOW_LOGICAL_SIZE = { width: 160, height: 200 } as const

/** 按缩放倍率生成布局常量（宠物、按钮、倒计时等比缩放） */
export function scaledLayout(scale: number, layout: PetLayout = LAYOUT): PetLayout {
  return {
    ...layout,
    petHalf: layout.petHalf * scale,
    countdownH: layout.countdownH * scale,
    buttonW: layout.buttonW * scale,
    buttonGroupH: layout.buttonGroupH * scale,
    buttonGap: layout.buttonGap * scale,
  }
}

export interface WanderBounds {
  maxX: number
  maxUp: number
  maxDown: number
}

/** 计算 wander 各方向最大移动距离，保证精灵（含倒计时）不超出窗口 */
export function clampWanderBounds(winW: number, winH: number, layout: PetLayout = LAYOUT): WanderBounds {
  const { petHalf, countdownH, edge, petVerticalPct } = layout
  return {
    maxX: Math.max(winW / 2 - petHalf - edge, 10),
    maxUp: Math.max((winH * petVerticalPct) / 100 - petHalf - edge, 0),
    maxDown: Math.max(winH - (winH * petVerticalPct) / 100 - petHalf - countdownH - edge, 10),
  }
}

export interface ButtonPos {
  left: number
  top: number
}

/**
 * 按钮位置：优先精灵右缘 +gap，右侧空间不足时翻转到左侧；垂直居中于精灵。
 * 结果 clamp 在窗口内。
 */
export function clampButtonPos(
  petCenterX: number,
  petCenterY: number,
  winW: number,
  winH: number,
  layout: PetLayout = LAYOUT,
): ButtonPos {
  const { petHalf, buttonW, buttonGroupH, buttonGap, edge } = layout
  let left = petCenterX + petHalf + buttonGap
  if (left + buttonW > winW - edge) {
    left = petCenterX - petHalf - buttonGap - buttonW
  }
  left = Math.min(Math.max(left, edge), winW - buttonW - edge)
  const top = Math.min(Math.max(petCenterY - buttonGroupH / 2, edge), winH - buttonGroupH - edge)
  return { left, top }
}

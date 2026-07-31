/** spritesheet 行分析：纯函数逻辑（可单测），canvas 像素读取由调用方提供 */

export interface RowAnalysis {
  row: number
  /** 每帧内容量（非透明采样数） */
  counts: number[]
  /** 相邻有效帧差异（0-1，仅有效帧之间） */
  diffs: number[]
  /** 有效帧数（内容量截断后） */
  frames: number
  /** 是否真正的动画（帧间差异均值 >= 5%） */
  isAnimation: boolean
}

/** Codex 标准 9/11 行网格的动作行映射 */
export const CODEX_STANDARD_ACTIONS: Array<[string, number]> = [
  ['waving', 1],
  ['running', 2],
  ['waiting', 3],
  ['review', 4],
]

export interface ActionMapEntry {
  name: string
  row: number
  frames: number
}

/** 内容量截断：连续帧内容量低于最大帧 20% 视为收尾/无效帧 */
export function computeFramesFromCounts(counts: number[]): number {
  const max = Math.max(...counts, 0)
  if (max <= 0) return 0
  let frames = 0
  for (const cnt of counts) {
    if (cnt < max * 0.2) break
    frames++
  }
  return frames
}

/** 帧间差异判定：有效帧间差异均值 >= 5% 才算动画（排除静态/方向行） */
export function computeIsAnimation(diffs: number[]): boolean {
  if (diffs.length === 0) return false
  const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length
  return avg >= 0.05
}

/** 判断是否为标准 Codex 网格（192×208，9/11 行） */
export function isStandardCodexGrid(frameWidth: number, frameHeight: number, rows: number): boolean {
  return frameWidth === 192 && frameHeight === 208 && (rows === 9 || rows === 11)
}

/**
 * 构建动作映射：显式动作 + 标准行动作 + 剩余行的检测动作。
 * @param rows 行数
 * @param usedRows 已被状态/显式动作占用的行
 * @param analyses 每行分析结果（下标 = 行号）
 * @param isStandardGrid 是否标准 Codex 网格
 */
export function buildActionMap(
  rows: number,
  usedRows: Set<number>,
  analyses: RowAnalysis[],
  isStandardGrid: boolean,
): { names: string[]; extras: Record<string, { row: number; frames: number }> } {
  const names: string[] = []
  const extras: Record<string, { row: number; frames: number }> = {}

  const rowActions: Array<[string, number]> = isStandardGrid ? CODEX_STANDARD_ACTIONS : []

  rowActions.forEach(([name, row]) => {
    if (row >= rows || usedRows.has(row)) return
    const a = analyses[row]
    if (!a || a.frames <= 0 || !a.isAnimation) return
    extras[name] = { row, frames: a.frames }
    names.push(name)
  })

  // 标准网格：标准动作行（1-4）已处理，从 row 5 开始检测额外行
  // 非标准网格：扫描所有未占用行（动画行可能出现在任意位置）
  const scanStart = isStandardGrid ? 5 : 0
  for (let row = scanStart; row < rows; row++) {
    if (usedRows.has(row)) continue
    const a = analyses[row]
    if (!a || a.frames <= 0 || !a.isAnimation) continue
    const name = isStandardGrid ? `extra${row - 4}` : `action${names.length + 1}`
    extras[name] = { row, frames: a.frames }
    names.push(name)
  }

  return { names, extras }
}

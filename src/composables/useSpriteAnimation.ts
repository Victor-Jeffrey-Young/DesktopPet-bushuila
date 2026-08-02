import { ref, computed, shallowRef } from 'vue'
import type { CodexSpriteConfig, AnimationConfig } from '../types'
import { canTransition, defaultAnimForState } from './animMachine'
import type { AnimMachineState, AnimPriority } from './animMachine'
import {
  buildActionMap,
  computeFramesFromCounts,
  computeIsAnimation,
  isStandardCodexGrid,
} from '../utils/spritesheetAnalyzer'
import type { RowAnalysis } from '../utils/spritesheetAnalyzer'
import { getCachedAnalysis, setCachedAnalysis } from '../utils/analysisCache'

export interface PlayOptions {
  loop?: boolean
  priority?: AnimPriority
}

export interface DiagnosticsSnapshot {
  machineState: AnimMachineState
  currentAnim: string
  currentFrame: number
  frameCount: number
  isLooping: boolean
  isLoaded: boolean
  availableActions: string[]
  frameWidth: number
  frameHeight: number
  spritesheetUrl?: string
  rows: Array<{ name: string; row: number; frames: number; loop: boolean }>
}

/** 精灵表帧动画的核心逻辑（显式状态机驱动） */
export function useSpriteAnimation() {
  const config = shallowRef<CodexSpriteConfig | null>(null)
  const image = shallowRef<HTMLImageElement | null>(null)
  const isLoaded = ref(false)
  const loadError = ref<string | null>(null)

  const machineState = ref<AnimMachineState>('loading')
  const currentAnimName = ref('')
  const currentFrame = ref(0)
  const availableActions = ref<string[]>([])

  let animTimer: ReturnType<typeof setTimeout> | null = null
  let animationActive = false
  /** 加载令牌：setConfig 递增，使旧的 onload 结果失效（防止切换宠物时旧图覆盖新图） */
  let loadToken = 0
  /** asset 协议图片的 blob URL，setConfig 时 revoke 防止泄漏 */
  let currentObjectUrl: string | null = null

  /** 设置/更新精灵表配置，同时重新加载图片 */
  function setConfig(cfg: CodexSpriteConfig | null) {
    loadToken++
    stopAnimation()
    if (currentObjectUrl) {
      URL.revokeObjectURL(currentObjectUrl)
      currentObjectUrl = null
    }
    config.value = cfg
    availableActions.value = []
    machineState.value = 'loading'
    currentAnimName.value = ''
    currentFrame.value = 0
    image.value = null
    isLoaded.value = false
    loadError.value = null
    if (!cfg) {
      return
    }
    loadImage(cfg.spritesheetUrl)
  }

  async function loadImage(url: string) {
    const token = loadToken
    isLoaded.value = false
    loadError.value = null
    currentFrame.value = 0
    const img = new Image()
    // Windows 上 asset URL 为 http://asset.localhost（非 asset: 前缀），统一识别走 fetch→blob，
    // 保证 canvas 可读像素（getImageData 不受 CORS 限制）
    if (url.startsWith('asset:') || url.includes('asset.localhost')) {
      // asset 协议图片先转 blob URL（同源），保证 canvas 可读像素（getImageData 不受 CORS 限制）
      try {
        const resp = await fetch(url)
        const blob = await resp.blob()
        currentObjectUrl = URL.createObjectURL(blob)
        img.src = currentObjectUrl
      } catch (e) {
        if (token === loadToken) loadError.value = `SpriteSheet 加载失败: ${url}`
        return
      }
    } else {
      img.src = url
    }
    img.onload = () => {
      if (token !== loadToken) return
      image.value = img
      isLoaded.value = true
      detectExtraActions()
      setMachine('idle')
    }
    img.onerror = () => {
      if (token !== loadToken) return
      loadError.value = `SpriteSheet 加载失败: ${url}`
    }
  }

  /** 内部状态切换：总是启动动画（loading 除外） */
  function setMachine(state: AnimMachineState, animName?: string) {
    machineState.value = state
    currentAnimName.value = animName ?? defaultAnimForState(state)
    currentFrame.value = 0
    startAnimation()
  }

  /**
   * 统一播放入口。
   * - priority: 'business'（reminding/snoozing/idle 业务切换，可抢占任何状态）
   * - loop: true（移动类，仅 idle → moving）
   * - 默认：一次性动作（仅 idle → action，播完自动回 idle）
   */
  function play(name: string, opts: PlayOptions = {}): boolean {
    if (!config.value?.animations[name]) return false
    const from = machineState.value
    const priority = opts.priority ?? 'normal'
    const to: AnimMachineState = priority === 'business'
      ? name as AnimMachineState
      : opts.loop
        ? 'moving'
        : name === 'idle'
          ? 'idle'
          : 'action'
    if (!canTransition(from, to, priority)) return false
    setMachine(to, name)
    return true
  }

  /** 检测 spritesheet 每行有效帧数，生成动作映射（canvas 读取壳，判定逻辑在 spritesheetAnalyzer 纯函数） */
  function detectExtraActions() {
    const c = config.value
    const img = image.value
    if (!c || !img) return

    const rows = Math.floor(img.height / c.frameHeight)
    const cols = Math.floor(img.width / c.frameWidth)
    const usedRows = new Set(Object.values(c.animations).map(a => a.row))
    const isStandardGrid = isStandardCodexGrid(c.frameWidth, c.frameHeight, rows)

    // 缓存命中：复用上次的行分析结果，跳过主线程同步像素读取
    let analyses = getCachedAnalysis(c.spritesheetUrl, c.frameWidth, c.frameHeight)
    if (!analyses) {
      const computed: RowAnalysis[] = []
      for (let row = 0; row < rows; row++) {
        const a = readRowPixels(img, c, row, cols)
        if (!a) return
        const frames = computeFramesFromCounts(a.counts)
        const diffs = a.thumbs.length > 1 ? computeRowDiffs(a.thumbs, frames) : []
        computed.push({
          row,
          counts: a.counts,
          diffs,
          frames,
          isAnimation: computeIsAnimation(diffs),
        })
      }
      analyses = computed
      setCachedAnalysis(c.spritesheetUrl, c.frameWidth, c.frameHeight, computed)
    }

    const { names, extras } = buildActionMap(rows, usedRows, analyses, isStandardGrid)
    // pet.json 显式配置的动作（如 running/waving）也纳入可用动作
    for (const key of Object.keys(c.animations)) {
      if (key !== 'idle' && key !== 'reminding' && key !== 'snoozing' && !names.includes(key)) {
        names.push(key)
      }
    }

    if (names.length > 0) {
      const extraConfigs: Record<string, AnimationConfig> = {}
      for (const [name, e] of Object.entries(extras)) {
        extraConfigs[name] = { ...e, fps: 8, loop: false }
      }
      c.animations = { ...c.animations, ...extraConfigs }
      availableActions.value = names
    }
  }

  /** 读取一行的帧内容量（步长 2 采样 alpha）；CORS 失败返回 null */
  function readRowPixels(img: HTMLImageElement, c: CodexSpriteConfig, row: number, cols: number) {
    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = c.frameHeight
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return null

    let data: Uint8ClampedArray
    try {
      ctx.clearRect(0, 0, img.width, c.frameHeight)
      ctx.drawImage(img, 0, row * c.frameHeight, img.width, c.frameHeight, 0, 0, img.width, c.frameHeight)
      data = ctx.getImageData(0, 0, img.width, c.frameHeight).data
    } catch {
      return null
    }

    const counts: number[] = []
    for (let f = 0; f < cols; f++) {
      let cnt = 0
      const x0 = f * c.frameWidth
      for (let y = 0; y < c.frameHeight; y += 2) {
        for (let x = x0; x < x0 + c.frameWidth; x += 2) {
          if (data[(y * img.width + x) * 4 + 3] > 30) cnt++
        }
      }
      counts.push(cnt)
    }

    // 逐帧缩略图（24px 宽，保持比例），供帧间差异计算
    const tw = 24
    const th = Math.max(4, Math.round((tw * c.frameHeight) / c.frameWidth))
    const tCanvas = document.createElement('canvas')
    tCanvas.width = tw
    tCanvas.height = th
    const tctx = tCanvas.getContext('2d', { willReadFrequently: true })
    if (!tctx) return null
    const thumbs: Uint8ClampedArray[] = []
    for (let f = 0; f < cols; f++) {
      tctx.clearRect(0, 0, tw, th)
      tctx.drawImage(img, f * c.frameWidth, row * c.frameHeight, c.frameWidth, c.frameHeight, 0, 0, tw, th)
      thumbs.push(tctx.getImageData(0, 0, tw, th).data)
    }

    return { counts, thumbs }
  }

  /** 计算有效帧（前 frames 帧）之间的相邻差异 */
  function computeRowDiffs(thumbs: Uint8ClampedArray[], frames: number): number[] {
    const diffs: number[] = []
    for (let f = 1; f < frames; f++) {
      const a = thumbs[f - 1]
      const b = thumbs[f]
      let diff = 0
      for (let i = 0; i < a.length; i += 4) {
        if (Math.abs(a[i + 3] - b[i + 3]) > 60 || Math.abs(a[i] - b[i]) > 60) diff++
      }
      diffs.push(diff / (a.length / 4))
    }
    return diffs
  }

  /** 当前动画的帧信息 */
  const currentAnim = computed(() => config.value?.animations[currentAnimName.value])

  const frameCount = computed(() => currentAnim.value?.frames ?? 1)
  const frameRate = computed(() => currentAnim.value?.fps ?? 8)
  const isLooping = computed(() => {
    // moving 状态强制循环（running/walking 动画本身可能声明 loop: false）
    if (machineState.value === 'moving') return true
    return currentAnim.value?.loop ?? true
  })
  const currentRow = computed(() => currentAnim.value?.row ?? 0)

  /** 当前帧在 spritesheet 中的裁剪区域 */
  const drawRect = computed(() => {
    const c = config.value
    if (!c) return { sx: 0, sy: 0, sw: 1, sh: 1 }
    const anim = currentAnim.value
    const sourceY = anim?.sourceY ?? 0
    const sourceH = anim?.sourceH ?? c.frameHeight
    return {
      sx: currentFrame.value * c.frameWidth,
      sy: currentRow.value * c.frameHeight + sourceY,
      sw: c.frameWidth,
      sh: sourceH,
    }
  })

  /** 绘制当前帧到 Canvas（保持原始宽高比，contain 模式：完整显示，居中，多余透明区域留空） */
  function drawToCanvas(ctx: CanvasRenderingContext2D, dx: number, dy: number, dw: number, dh: number) {
    if (!image.value || !isLoaded.value || !config.value) return
    const r = drawRect.value

    const srcAspect = r.sw / r.sh
    const dstAspect = dw / dh

    let drawW: number, drawH: number, offX: number, offY: number
    if (srcAspect > dstAspect) {
      drawW = dw
      drawH = dw / srcAspect
      offX = 0
      offY = (dh - drawH) / 2
    } else {
      drawH = dh
      drawW = dh * srcAspect
      offX = (dw - drawW) / 2
      offY = 0
    }

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    ctx.drawImage(image.value, r.sx, r.sy, r.sw, r.sh, dx + offX, dy + offY, drawW, drawH)
  }

  function startAnimation() {
    if (animationActive || !config.value || machineState.value === 'loading') return
    animationActive = true
    scheduleNextFrame()
  }

  function stopAnimation() {
    animationActive = false
    if (animTimer !== null) {
      clearTimeout(animTimer)
      animTimer = null
    }
  }

  function scheduleNextFrame() {
    if (!animationActive) return
    const interval = 1000 / frameRate.value
    animTimer = setTimeout(() => {
      if (!animationActive) return
      const next = currentFrame.value + 1
      if (next >= frameCount.value) {
        if (isLooping.value) {
          currentFrame.value = 0
        } else {
          if (machineState.value === 'action') {
            // 一次性动作播完：自动回到 idle 继续循环
            setMachine('idle')
            scheduleNextFrame()
            return
          }
          currentFrame.value = frameCount.value - 1
          animationActive = false
          return
        }
      } else {
        currentFrame.value = next
      }
      scheduleNextFrame()
    }, interval)
  }

  /** 调试快照：当前状态、动画名、帧号、可用动作、行映射 */
  function getDiagnostics(): DiagnosticsSnapshot {
    const c = config.value
    return {
      machineState: machineState.value,
      currentAnim: currentAnimName.value,
      currentFrame: currentFrame.value,
      frameCount: frameCount.value,
      isLooping: isLooping.value,
      isLoaded: isLoaded.value,
      availableActions: [...availableActions.value],
      frameWidth: c?.frameWidth ?? 0,
      frameHeight: c?.frameHeight ?? 0,
      spritesheetUrl: c?.spritesheetUrl,
      rows: c ? Object.entries(c.animations).map(([name, anim]) => ({
        name,
        row: anim.row,
        frames: anim.frames,
        loop: !!anim.loop,
      })) : [],
    }
  }

  /** 清理（由消费者在 onUnmounted 中调用） */
  function dispose() {
    stopAnimation()
    image.value = null
    isLoaded.value = false
    machineState.value = 'loading'
    currentAnimName.value = ''
  }

  return {
    config,
    image,
    isLoaded,
    loadError,
    machineState,
    currentAnimName,
    currentFrame,
    availableActions,
    setConfig,
    play,
    drawToCanvas,
    drawRect,
    getDiagnostics,
    dispose,
  }
}

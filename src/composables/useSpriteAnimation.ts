import { ref, computed, shallowRef } from 'vue'
import type { CodexSpriteConfig, AnimationConfig } from '../types'

export type SpriteAnimState = string

/** Codex 标准 9/11 行网格的动作行映射（row → 动作名） */
const CODEX_STANDARD_ACTIONS: Array<[string, number]> = [
  ['waving', 1],
  ['running', 2],
  ['waiting', 3],
  ['review', 4],
]

/** 精灵表帧动画的核心逻辑（无生命周期依赖，可在 computed 外安全使用） */
export function useSpriteAnimation() {
  const config = shallowRef<CodexSpriteConfig | null>(null)
  const image = shallowRef<HTMLImageElement | null>(null)
  const isLoaded = ref(false)
  const loadError = ref<string | null>(null)

  const currentState = ref<SpriteAnimState>('idle')
  const currentFrame = ref(0)
  const availableActions = ref<string[]>([])

  let animTimer: ReturnType<typeof setTimeout> | null = null
  let animationActive = false
  let returnToIdle = false
  let forcedLoop: boolean | null = null

  /** 设置/更新精灵表配置，同时重新加载图片 */
  function setConfig(cfg: CodexSpriteConfig | null) {
    stopAnimation()
    config.value = cfg
    availableActions.value = []
    if (!cfg) {
      image.value = null
      isLoaded.value = false
      loadError.value = null
      return
    }
    loadImage(cfg.spritesheetUrl)
  }

  async function loadImage(url: string) {
    isLoaded.value = false
    loadError.value = null
    currentFrame.value = 0
    const img = new Image()
    if (url.startsWith('asset:')) {
      // asset 协议图片先转 blob URL（同源），保证 canvas 可读像素（getImageData 不受 CORS 限制）
      try {
        const resp = await fetch(url)
        const blob = await resp.blob()
        img.src = URL.createObjectURL(blob)
      } catch (e) {
        loadError.value = `SpriteSheet 加载失败: ${url}`
        return
      }
    } else {
      img.src = url
    }
    img.onload = () => {
      image.value = img
      isLoaded.value = true
      detectExtraActions()
      startAnimation()
    }
    img.onerror = () => {
      loadError.value = `SpriteSheet 加载失败: ${url}`
    }
  }

  /** 检测 spritesheet 每行有效帧数，生成动作映射（跳过状态已占用的行和静态/方向行） */
  function detectExtraActions() {
    const c = config.value
    const img = image.value
    if (!c || !img) return

    const rows = Math.floor(img.height / c.frameHeight)
    const cols = Math.floor(img.width / c.frameWidth)
    const usedRows = new Set(Object.values(c.animations).map(a => a.row))
    // 标准 Codex 网格（192×208，9/11 行）才使用标准动作名，其他网格用通用名
    const isStandardGrid = c.frameWidth === 192 && c.frameHeight === 208 && (rows === 9 || rows === 11)

    const canvas = document.createElement('canvas')
    canvas.width = img.width
    canvas.height = c.frameHeight
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    const names: string[] = []
    const extras: Record<string, AnimationConfig> = {}
    // pet.json 显式配置的动作（如 running/waving）也纳入可用动作
    for (const key of Object.keys(c.animations)) {
      if (key !== 'idle' && key !== 'reminding' && key !== 'snoozing') {
        names.push(key)
      }
    }

    const rowActions: Array<[string, number]> = isStandardGrid
      ? CODEX_STANDARD_ACTIONS
      : []

    rowActions.forEach(([name, row]) => {
      if (row >= rows || usedRows.has(row)) return
      const frames = detectRowFrames(ctx, img, c, row)
      if (frames <= 0 || !detectRowIsAnimation(img, c, row, frames)) return
      extras[name] = { row, frames, fps: 8, loop: false }
      names.push(name)
    })

    for (let row = 5; row < rows; row++) {
      if (usedRows.has(row)) continue
      const frames = detectRowFrames(ctx, img, c, row)
      if (frames <= 0 || !detectRowIsAnimation(img, c, row, frames)) continue
      const name = isStandardGrid ? `extra${row - 4}` : `action${names.length + 1}`
      extras[name] = { row, frames, fps: 8, loop: false }
      names.push(name)
    }

    if (names.length > 0) {
      c.animations = { ...c.animations, ...extras }
      availableActions.value = names
    }
  }

  /** 检测指定行的有效帧数：内容量低于最大帧 20% 的帧视为收尾/无效帧，从该处截断；CORS 失败返回 -1 */
  function detectRowFrames(ctx: CanvasRenderingContext2D, img: HTMLImageElement, c: CodexSpriteConfig, row: number): number {
    let data: Uint8ClampedArray
    try {
      ctx.clearRect(0, 0, img.width, c.frameHeight)
      ctx.drawImage(img, 0, row * c.frameHeight, img.width, c.frameHeight, 0, 0, img.width, c.frameHeight)
      data = ctx.getImageData(0, 0, img.width, c.frameHeight).data
    } catch {
      return -1
    }
    const cols = Math.floor(img.width / c.frameWidth)

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

    const max = Math.max(...counts)
    if (max <= 0) return 0
    let frames = 0
    for (const cnt of counts) {
      if (cnt < max * 0.2) break
      frames++
    }
    return frames
  }

  /** 检测指定行是否为真正的动画：有效帧之间的差异均值 >= 5%（排除静态/方向行） */
  function detectRowIsAnimation(img: HTMLImageElement, c: CodexSpriteConfig, row: number, frames: number): boolean {
    const tw = 24
    const th = Math.max(4, Math.round((tw * c.frameHeight) / c.frameWidth))
    const canvas = document.createElement('canvas')
    canvas.width = tw
    canvas.height = th
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return false

    const thumbs: ImageData[] = []
    for (let f = 0; f < frames; f++) {
      ctx.clearRect(0, 0, tw, th)
      ctx.drawImage(img, f * c.frameWidth, row * c.frameHeight, c.frameWidth, c.frameHeight, 0, 0, tw, th)
      thumbs.push(ctx.getImageData(0, 0, tw, th))
    }

    let diffSum = 0
    let pairs = 0
    for (let f = 1; f < frames; f++) {
      const a = thumbs[f - 1].data
      const b = thumbs[f].data
      let diff = 0
      for (let i = 0; i < a.length; i += 4) {
        if (Math.abs(a[i + 3] - b[i + 3]) > 60 || Math.abs(a[i] - b[i]) > 60) diff++
      }
      diffSum += diff / (a.length / 4)
      pairs++
    }
    return pairs > 0 && diffSum / pairs >= 0.05
  }

  /** 当前动画的帧信息 */
  const frameCount = computed(() => {
    const c = config.value
    const anim = c?.animations[currentState.value]
    return anim?.frames ?? 1
  })
  const frameRate = computed(() => {
    const c = config.value
    const anim = c?.animations[currentState.value]
    return anim?.fps ?? 8
  })
  const isLooping = computed(() => {
    const c = config.value
    const anim = c?.animations[currentState.value]
    return forcedLoop ?? anim?.loop ?? true
  })
  const currentRow = computed(() => {
    const c = config.value
    const anim = c?.animations[currentState.value]
    return anim?.row ?? 0
  })

  /** 切换到指定状态并重置帧 */
  function setState(state: SpriteAnimState) {
    if (currentState.value === state) return
    forcedLoop = null
    returnToIdle = false
    currentState.value = state
    currentFrame.value = 0
    if (animationActive) {
      stopAnimation()
      startAnimation()
    }
  }

  /** 播放一次性动作，结束后自动回到 idle */
  function playOnce(name: string) {
    if (!config.value?.animations[name]) return
    forcedLoop = null
    returnToIdle = true
    currentState.value = name
    currentFrame.value = 0
    if (animationActive) {
      stopAnimation()
      startAnimation()
    }
  }

  /** 循环播放动作（如移动动画），直到 setState/playOnce/playLoop 切换 */
  function playLoop(name: string) {
    if (!config.value?.animations[name]) return
    forcedLoop = true
    returnToIdle = false
    currentState.value = name
    currentFrame.value = 0
    if (animationActive) {
      stopAnimation()
      startAnimation()
    }
  }

  /** 当前帧在 spritesheet 中的裁剪区域 */
  const drawRect = computed(() => {
    const c = config.value
    if (!c) return { sx: 0, sy: 0, sw: 1, sh: 1 }
    const anim = c.animations[currentState.value]
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
    if (animationActive || !config.value) return
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
          if (returnToIdle) {
            returnToIdle = false
            currentState.value = 'idle'
            currentFrame.value = 0
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

  /** 清理（由消费者在 onUnmounted 中调用） */
  function dispose() {
    stopAnimation()
    image.value = null
    isLoaded.value = false
  }

  return {
    config,
    image,
    isLoaded,
    loadError,
    currentState,
    currentFrame,
    availableActions,
    setConfig,
    setState,
    playOnce,
    playLoop,
    drawToCanvas,
    drawRect,
    startAnimation,
    stopAnimation,
    dispose,
  }
}

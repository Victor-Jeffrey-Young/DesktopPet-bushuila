import { ref, computed, shallowRef } from 'vue'
import type { CodexSpriteConfig } from '../types'

export type SpriteAnimState = 'idle' | 'reminding' | 'snoozing'

/** 精灵表帧动画的核心逻辑（无生命周期依赖，可在 computed 外安全使用） */
export function useSpriteAnimation() {
  const config = shallowRef<CodexSpriteConfig | null>(null)
  const image = shallowRef<HTMLImageElement | null>(null)
  const isLoaded = ref(false)
  const loadError = ref<string | null>(null)

  const currentState = ref<SpriteAnimState>('idle')
  const currentFrame = ref(0)

  let animTimer: ReturnType<typeof setTimeout> | null = null
  let animationActive = false

  /** 设置/更新精灵表配置，同时重新加载图片 */
  function setConfig(cfg: CodexSpriteConfig | null) {
    stopAnimation()
    config.value = cfg
    if (!cfg) {
      image.value = null
      isLoaded.value = false
      loadError.value = null
      return
    }
    loadImage(cfg.spritesheetUrl)
  }

  function loadImage(url: string) {
    isLoaded.value = false
    loadError.value = null
    currentFrame.value = 0
    const img = new Image()
    img.onload = () => {
      image.value = img
      isLoaded.value = true
      startAnimation()
    }
    img.onerror = () => {
      loadError.value = `SpriteSheet 加载失败: ${url}`
    }
    img.src = url
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
    return anim?.loop ?? true
  })
  const currentRow = computed(() => {
    const c = config.value
    const anim = c?.animations[currentState.value]
    return anim?.row ?? 0
  })

  /** 切换到指定状态并重置帧 */
  function setState(state: SpriteAnimState) {
    if (currentState.value === state) return
    currentState.value = state
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

    // contain：无论帧是宽还是高，都完整显示在画布内，保持比例，居中
    const srcAspect = r.sw / r.sh
    const dstAspect = dw / dh

    let drawW: number, drawH: number, offX: number, offY: number
    if (srcAspect > dstAspect) {
      // 源图更宽 → 按宽度适配，上下留空
      drawW = dw
      drawH = dw / srcAspect
      offX = 0
      offY = (dh - drawH) / 2
    } else {
      // 源图更高 → 按高度适配，左右留空
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
    setConfig,
    setState,
    drawToCanvas,
    drawRect,
    startAnimation,
    stopAnimation,
    dispose,
  }
}

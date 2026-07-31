<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useWindowDrag } from '../composables/useWindowDrag'
import { useAppStore } from '../stores/app'
import { useSpriteAnimation } from '../composables/useSpriteAnimation'
import type { MicroAction, CodexSpriteConfig } from '../types'

const props = defineProps<{
  state: 'idle' | 'reminding' | 'snoozing'
  countdown: string
}>()

const emit = defineEmits<{
  rightClick: []
  click: []
}>()

const store = useAppStore()
const { startDrag, closeOrHide } = useWindowDrag()

const theme = computed(() => store.currentPetConfig)

/** 当前状态下的渐变样式（自定义精灵用 inline style，预设用 Tailwind） */
const gradientStyle = computed(() => {
  if (theme.value.isCustom) {
    const style = theme.value.gradients[props.state].style
    return style ? { background: style, WebkitBackfaceVisibility: 'hidden' as const, backfaceVisibility: 'hidden' as const } : { WebkitBackfaceVisibility: 'hidden' as const, backfaceVisibility: 'hidden' as const }
  }
  return { WebkitBackfaceVisibility: 'hidden' as const, backfaceVisibility: 'hidden' as const }
})

// 随机散步
const wanderX = ref(0)
const wanderY = ref(0)
const isWalking = ref(false)
const isHovered = ref(false)
const showButtons = ref(false)
let hideButtonsTimer: ReturnType<typeof setTimeout> | null = null
let wanderTimer: ReturnType<typeof setTimeout> | null = null
let actionTimer: ReturnType<typeof setTimeout> | null = null
let unmounted = false
const currentAction = ref<MicroAction>('idle')
const thoughtEmoji = ref('')

/** 当前激活的自定义精灵完整配置（用于读取自定义微动作表情） */
const activeCustomPet = computed(() =>
  store.settings.petTheme.pet === 'custom'
    ? store.customPets.find(p => p.id === store.settings.petTheme.customPetId)
    : undefined,
)

function randomPosition() {
  if (unmounted || isHovered.value || props.state !== 'idle') return
  const maxX = 60
  const maxY = 80
  wanderX.value = (Math.random() - 0.5) * maxX * 2
  wanderY.value = (Math.random() - 0.5) * maxY * 2
  isWalking.value = true
  setTimeout(() => { if (!unmounted) isWalking.value = false }, 600)
}

function setThoughtEmoji(action: MicroAction) {
  // 优先使用自定义精灵配置的表情
  if (activeCustomPet.value && action in activeCustomPet.value.emoji) {
    const customEmoji = activeCustomPet.value.emoji[action as keyof typeof activeCustomPet.value.emoji]
    if (customEmoji) {
      thoughtEmoji.value = customEmoji
      return
    }
  }
  const defaultEmojis: Partial<Record<MicroAction, string>> = {
    happy: ['✨', '💫', '❤️', '🎵'][Math.floor(Math.random() * 4)],
    thinking: '❓',
    dancing: ['🎵', '♪', '♫'][Math.floor(Math.random() * 3)],
    sleeping: '💤',
    working: '✍️',
    stretching: '🥱',
  }
  thoughtEmoji.value = defaultEmojis[action] ?? ''
}

function getActionDuration(action: MicroAction): number {
  const durations: Record<MicroAction, number> = {
    idle: 0, look: 1800, blink: 2000, happy: 2500,
    thinking: 3000, working: 2500, dancing: 2000, sleeping: 4000, stretching: 2500,
  }
  return durations[action]
}

function randomAction() {
  if (unmounted) return
  const actions: MicroAction[] = [
    'look', 'blink', 'happy', 'thinking',
    'working', 'dancing', 'sleeping', 'stretching',
  ]
  currentAction.value = actions[Math.floor(Math.random() * actions.length)]
  setThoughtEmoji(currentAction.value)
  setTimeout(() => { if (!unmounted) currentAction.value = 'idle' }, getActionDuration(currentAction.value))
}

function scheduleWander() {
  wanderTimer = setTimeout(() => {
    if (unmounted) return
    if (props.state === 'idle') randomPosition()
    scheduleWander()
  }, 2000 + Math.random() * 4000)
}

function scheduleAction() {
  actionTimer = setTimeout(() => {
    if (unmounted) return
    if (props.state === 'idle' && !isHovered.value) randomAction()
    scheduleAction()
  }, 3000 + Math.random() * 5000)
}

// ===== Codex 精灵表渲染 =====
const canvasRef = ref<HTMLCanvasElement | null>(null)
const spriteCanvasSize = 112 // w-28 h-28

/** 精灵表动画引擎（顶层调用，无生命周期限制） */
const spriteAnim = useSpriteAnimation()
const spriteLoadFailed = ref(false)

/** 根据当前宠物主题更新精灵表配置 */
watch(() => [theme.value.isCodex, theme.value.spritesheetUrl], () => {
  spriteLoadFailed.value = false
  if (!theme.value.isCodex || !theme.value.spritesheetUrl) {
    spriteAnim.setConfig(null)
    return
  }
  spriteAnim.setConfig({
    spritesheetUrl: theme.value.spritesheetUrl,
    frameWidth: 192,
    frameHeight: 234,
    // 所有动画统一 192×234 帧，不裁剪，保持相同显示大小
    // 帧内的透明空白在透明窗口下不可见
    animations: {
      idle:      { row: 0, frames: 6, fps: 6,  loop: true },
      reminding: { row: 1, frames: 8, fps: 10, loop: true },
      snoozing:  { row: 3, frames: 5, fps: 4,  loop: true },
    },
  })
}, { immediate: true })

/** 状态同步：spriteState → 动画状态 */
watch(() => props.state, (state) => {
  if (!theme.value.isCodex) return
  spriteAnim.setState(state)
})

/** 每帧动画更新后重绘 canvas */
watch(() => [spriteAnim.currentFrame.value, spriteAnim.isLoaded.value], () => {
  if (!spriteAnim.isLoaded.value || !canvasRef.value) return
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const size = spriteCanvasSize
  if (canvas.width !== size || canvas.height !== size) {
    canvas.width = size
    canvas.height = size
  }
  ctx.imageSmoothingEnabled = false
  spriteAnim.drawToCanvas(ctx, 0, 0, size, size)
})

/** spritesheet 加载失败时回退到 emoji */
watch(() => spriteAnim.loadError.value, (err) => {
  if (err) {
    console.warn('[SpritePet]', err)
    spriteLoadFailed.value = true
  }
})

onMounted(() => {
  scheduleWander()
  scheduleAction()
})

onUnmounted(() => {
  unmounted = true
  if (wanderTimer) clearTimeout(wanderTimer)
  if (actionTimer) clearTimeout(actionTimer)
  spriteAnim.dispose()
})

const idleAnimClass = computed(() => {
  if (isWalking.value) return 'animate-walk'
  return 'animate-idle'
})

const actionAnimClass = computed(() => {
  const map: Partial<Record<MicroAction, string>> = {
    look: 'animate-look',
    blink: 'animate-blink',
    happy: 'animate-happy-bounce',
    thinking: 'animate-think',
    working: 'animate-work',
    dancing: 'animate-dance',
    sleeping: 'animate-sleep',
    stretching: 'animate-stretch',
  }
  return map[currentAction.value] ?? ''
})

function onMouseEnter() {
  isHovered.value = true
  showButtons.value = true
  if (hideButtonsTimer) clearTimeout(hideButtonsTimer)
}

function onMouseLeave() {
  isHovered.value = false
  hideButtonsTimer = setTimeout(() => {
    if (!unmounted) showButtons.value = false
  }, 1500)
}

function handleContextMenu(e: MouseEvent) {
  e.preventDefault()
  emit('rightClick')
}

function openSettings(e: MouseEvent) {
  e.stopPropagation()
  emit('rightClick')
}
</script>

<template>
  <div
    class="relative w-full h-full cursor-grab active:cursor-grabbing select-none"
    style="will-change: transform"
    @mousedown="startDrag"
    @contextmenu="handleContextMenu"
    @click="emit('click')"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <!-- 精灵本体（纯 transform 移动，只触发 Composite，不触发 Layout/Paint，消除残影） -->
    <div
      class="absolute flex flex-col items-center"
      :style="{
        left: '50%',
        top: '50%',
        transform: `translate(calc(-50% + ${wanderX}px), calc(-50% + ${wanderY}px))`,
        transition: isWalking ? 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' : 'transform 0.3s ease',
      }"
    >
      <div
        :class="[
          'w-28 h-28 rounded-full flex items-center justify-center relative overflow-hidden',
          !theme.isCodex && state === 'idle' && !theme.isCustom && theme.gradients.idle.class,
          !theme.isCodex && state === 'idle' && idleAnimClass,
          !theme.isCodex && state === 'reminding' && !theme.isCustom && theme.gradients.reminding.class,
          !theme.isCodex && state === 'reminding' && 'animate-remind',
          !theme.isCodex && state === 'snoozing' && !theme.isCustom && theme.gradients.snoozing.class,
          !theme.isCodex && state === 'snoozing' && 'animate-snooze',
          theme.isCodex && 'bg-transparent',
        ]"
        :style="theme.isCodex ? undefined : gradientStyle"
      >
        <!-- Codex 精灵：Canvas 渲染（由 spritesheet 帧动画驱动，不叠加 CSS 动画） -->
        <canvas
          v-if="theme.isCodex && !spriteLoadFailed"
          ref="canvasRef"
          class="block w-full h-full"
          style="image-rendering: pixelated; -webkit-backface-visibility: hidden; backface-visibility: hidden;"
        />
        <!-- Codex 精灵加载失败回退 -->
        <span v-else-if="theme.isCodex && spriteLoadFailed"
          class="text-5xl"
          style="-webkit-backface-visibility: hidden; backface-visibility: hidden;">
          {{ theme.emoji[state] }}
        </span>
        <!-- 普通精灵：Emoji -->
        <span v-else
          :class="['text-5xl', state === 'reminding' && 'animate-wiggle', actionAnimClass]"
          style="-webkit-backface-visibility: hidden; backface-visibility: hidden;">
          {{ theme.emoji[state] }}
        </span>

        <!-- 表情气泡（微动作时显示） -->
        <div
          v-if="thoughtEmoji && state === 'idle' && currentAction !== 'idle'"
          :class="[
            'absolute pointer-events-none animate-float-up',
            currentAction === 'thinking' ? '-top-7 left-1/2 -translate-x-1/2 text-2xl' : '-top-6 -right-2 text-lg',
          ]"
        >
          {{ thoughtEmoji }}
        </div>
      </div>

      <!-- 倒计时 -->
      <div
        v-if="state === 'idle'"
        class="mt-1.5 px-4 py-1.5 rounded-full bg-black/30 border border-white/15 shadow-lg inline-flex items-center justify-center"
      >
        <span class="text-[11px] font-mono text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)] tracking-wider">
          {{ countdown }}
        </span>
      </div>

      <!-- 操作按钮 -->
      <div
        class="absolute -right-8 top-1/2 -translate-y-1/2 flex flex-col gap-2 transition-all duration-300"
          :class="showButtons ? 'opacity-100' : 'opacity-0'"
      >
        <button
          class="no-drag w-7 h-7 rounded-full bg-white/10 border border-white/20 shadow-lg text-white/70 hover:bg-red-500/70 hover:text-white hover:border-red-300/40 text-[11px] flex items-center justify-center transition-all duration-200 hover:scale-110"
          @mousedown.stop
          @click.stop="closeOrHide"
          title="关闭"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3.5 h-3.5">
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
          </svg>
        </button>
        <button
          class="no-drag w-7 h-7 rounded-full bg-white/10 border border-white/20 shadow-lg text-white/70 hover:bg-blue-500/70 hover:text-white hover:border-blue-300/40 text-sm flex items-center justify-center transition-all duration-200 hover:scale-110 hover:rotate-90"
          @mousedown.stop
          @click.stop="openSettings"
          title="设置"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
            <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
            <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* --- 基础状态 --- */
@keyframes idle {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-3px) scale(1.02); }
}

@keyframes remind {
  0%, 100% { transform: scale(1); }
  25% { transform: scale(1.08) rotate(-3deg); }
  50% { transform: scale(1.12); }
  75% { transform: scale(1.08) rotate(3deg); }
}

@keyframes wiggle {
  0%, 100% { transform: rotate(0deg); }
  15% { transform: rotate(-15deg); }
  30% { transform: rotate(15deg); }
  45% { transform: rotate(-10deg); }
  60% { transform: rotate(10deg); }
  75% { transform: rotate(-5deg); }
}

@keyframes snooze {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(2px); }
}

/* --- 散步/走路 --- */
@keyframes walk {
  0%, 100% { transform: translateY(0) scale(1); }
  25% { transform: translateY(-4px) scale(1.03) rotate(-2deg); }
  50% { transform: translateY(0) scale(1); }
  75% { transform: translateY(-2px) scale(1.02) rotate(2deg); }
}

/* --- 小动作 --- */
@keyframes look {
  0%, 100% { transform: rotate(0deg); }
  20% { transform: rotate(-8deg); }
  40% { transform: rotate(8deg); }
  60% { transform: rotate(-5deg); }
}

@keyframes blink {
  0%, 100% { transform: scaleY(1); }
  45% { transform: scaleY(1); }
  50% { transform: scaleY(0.15); }
  55% { transform: scaleY(1); }
}

@keyframes happy-bounce {
  0%, 100% { transform: translateY(0) scale(1); }
  30% { transform: translateY(-8px) scale(1.1); }
  50% { transform: translateY(-4px) scale(1.05); }
  70% { transform: translateY(-6px) scale(1.08); }
}

@keyframes float-up {
  0% { opacity: 1; transform: translateY(0) scale(1); }
  100% { opacity: 0; transform: translateY(-24px) scale(1.3); }
}

/* --- 应用 --- */
.animate-idle { animation: idle 3s ease-in-out infinite; }
.animate-remind { animation: remind 0.6s ease-in-out infinite; }
.animate-wiggle { animation: wiggle 0.5s ease-in-out infinite; }
.animate-snooze { animation: snooze 2s ease-in-out infinite; }
.animate-walk { animation: walk 0.4s ease-in-out infinite; }
.animate-look { animation: look 0.6s ease-out; }
.animate-blink { animation: blink 2s ease-out; }
.animate-happy-bounce { animation: happy-bounce 0.8s ease-out; }
.animate-float-up { animation: float-up 1.2s ease-out forwards; }

/* --- 新增微动作动画 --- */
@keyframes think {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  20% { transform: translateY(-2px) rotate(-5deg); }
  40% { transform: translateY(0) rotate(0deg); }
  60% { transform: translateY(-3px) rotate(5deg); }
  80% { transform: translateY(-1px) rotate(-3deg); }
}

@keyframes work {
  0%, 100% { transform: translateY(0); }
  20% { transform: translateY(-2px) scale(1.02); }
  40% { transform: translateY(0) scale(0.98); }
  60% { transform: translateY(-1px) scale(1.01); }
  80% { transform: translateY(0) scale(0.99); }
}

@keyframes dance {
  0%, 100% { transform: rotate(0deg) scale(1); }
  15% { transform: rotate(-8deg) scale(1.05); }
  30% { transform: rotate(8deg) scale(1.05); }
  45% { transform: rotate(-12deg) scale(1.1); }
  60% { transform: rotate(12deg) scale(1.1); }
  75% { transform: rotate(-6deg) scale(1.05); }
}

@keyframes sleep {
  0%, 100% { transform: translateY(0) scale(1); }
  25% { transform: translateY(2px) scale(0.95) rotate(2deg); }
  50% { transform: translateY(3px) scale(0.93) rotate(4deg); }
  75% { transform: translateY(1px) scale(0.96) rotate(2deg); }
}

@keyframes stretch {
  0% { transform: translateY(0) scaleY(1); }
  30% { transform: translateY(-4px) scaleY(1.15); }
  60% { transform: translateY(-6px) scaleY(1.2); }
  100% { transform: translateY(0) scaleY(1); }
}

.animate-think { animation: think 1.5s ease-in-out infinite; }
.animate-work { animation: work 0.8s ease-in-out infinite; }
.animate-dance { animation: dance 0.6s ease-in-out infinite; }
.animate-sleep { animation: sleep 3s ease-in-out infinite; }
.animate-stretch { animation: stretch 1.2s ease-out; }
</style>
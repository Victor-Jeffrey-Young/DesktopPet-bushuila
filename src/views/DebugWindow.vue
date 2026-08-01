<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { emit as emitEvent, listen, type UnlistenFn } from '@tauri-apps/api/event'
import type { DiagnosticsSnapshot } from '../composables/useSpriteAnimation'
import { useTheme } from '../composables/useTheme'

useTheme()

const diagnostics = ref<DiagnosticsSnapshot | null>(null)
const gridRef = ref<HTMLCanvasElement | null>(null)
const spriteImage = ref<HTMLImageElement | null>(null)
const hitboxEnabled = ref(false)
let loadedSpriteUrl = ''
let unlisten: UnlistenFn | null = null

const STATE_COLORS: Record<string, string> = {
  loading: '#ff9f0a',
  idle: '#30d158',
  reminding: '#ff453a',
  snoozing: '#64d2ff',
  moving: '#bf5af2',
  action: '#ffd60a',
}

onMounted(async () => {
  document.title = 'Animation Inspector'
  await emitEvent('debug-hitbox-toggle', false)
  unlisten = await listen<DiagnosticsSnapshot>('debug-diagnostics', (event) => {
    diagnostics.value = event.payload
    void loadSprite(event.payload.spritesheetUrl)
  })
})

onUnmounted(() => {
  unlisten?.()
  void emitEvent('debug-hitbox-toggle', false)
})

async function toggleHitbox() {
  hitboxEnabled.value = !hitboxEnabled.value
  await emitEvent('debug-hitbox-toggle', hitboxEnabled.value)
}

async function loadSprite(url?: string) {
  if (!url || url === loadedSpriteUrl) return
  loadedSpriteUrl = url
  spriteImage.value = null
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    const image = new Image()
    image.onload = () => {
      if (url !== loadedSpriteUrl) return
      spriteImage.value = image
      drawGrid()
    }
    image.src = URL.createObjectURL(blob)
  } catch {
    spriteImage.value = null
  }
}

function drawGrid() {
  const canvas = gridRef.value
  const image = spriteImage.value
  const snapshot = diagnostics.value
  if (!canvas || !image || !snapshot?.frameWidth || !snapshot.frameHeight) return

  const scale = 0.2
  const width = Math.round(image.width * scale)
  const height = Math.round(image.height * scale)
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d')
  if (!context) return
  context.clearRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)

  const frameWidth = Math.max(1, Math.round(snapshot.frameWidth * scale))
  const frameHeight = Math.max(1, Math.round(snapshot.frameHeight * scale))
  const rowCount = Math.floor(image.height / snapshot.frameHeight)

  context.strokeStyle = 'rgba(255, 69, 58, 0.48)'
  context.lineWidth = 1
  for (let x = 0; x <= width; x += frameWidth) {
    context.beginPath()
    context.moveTo(x, 0)
    context.lineTo(x, height)
    context.stroke()
  }
  for (let y = 0; y <= height; y += frameHeight) {
    context.beginPath()
    context.moveTo(0, y)
    context.lineTo(width, y)
    context.stroke()
  }

  const currentRow = snapshot.rows.find(row => row.name === snapshot.currentAnim)?.row
  if (currentRow !== undefined) {
    context.fillStyle = 'rgba(10, 132, 255, 0.34)'
    context.fillRect(0, currentRow * frameHeight, width, frameHeight)
  }

  context.fillStyle = 'rgba(0, 0, 0, 0.72)'
  context.font = '8px monospace'
  for (let row = 0; row < rowCount; row++) {
    const animation = snapshot.rows.find(item => item.row === row)
    context.fillText(animation ? `${row}  ${animation.name}` : `${row}  —`, 4, row * frameHeight + 10)
  }
}

watch(
  () => [
    diagnostics.value?.machineState,
    diagnostics.value?.currentAnim,
    diagnostics.value?.currentFrame,
    diagnostics.value?.availableActions,
  ],
  drawGrid,
)
</script>

<template>
  <div class="inspector-shell">
    <header class="inspector-header">
      <div class="inspector-brand">
        <span class="inspector-mark">▦</span>
        <div>
          <strong>Animation Inspector</strong>
          <small>补水啦 / 实时诊断</small>
        </div>
      </div>
      <span class="live-badge"><i></i> LIVE</span>
    </header>

    <main class="inspector-scroll">
      <section class="hitbox-control">
        <div class="hitbox-control-copy">
          <span class="hitbox-control-icon">⌗</span>
          <span><strong>显示交互区域</strong><small>红框：拖拽范围 · 橙框：宠物本体</small></span>
        </div>
        <button
          type="button"
          class="debug-switch"
          :class="hitboxEnabled && 'debug-switch-on'"
          :aria-pressed="hitboxEnabled"
          aria-label="切换交互区域标记"
          @click="toggleHitbox"
        >
          <span></span>
        </button>
      </section>

      <template v-if="diagnostics">
        <section class="state-hero">
          <div class="state-line">
            <span class="state-dot" :style="{ background: STATE_COLORS[diagnostics.machineState] ?? '#98989d' }"></span>
            <span class="state-name">{{ diagnostics.machineState }}</span>
            <code>{{ diagnostics.currentAnim }}</code>
          </div>
          <div class="frame-readout">
            <strong>{{ String(diagnostics.currentFrame).padStart(2, '0') }}</strong>
            <span>/ {{ String(diagnostics.frameCount).padStart(2, '0') }} frames</span>
          </div>
          <div class="state-meta">
            <span>{{ diagnostics.isLooping ? 'LOOPING' : 'ONE SHOT' }}</span>
            <span>{{ diagnostics.frameWidth }} × {{ diagnostics.frameHeight }} px</span>
            <span>{{ diagnostics.isLoaded ? 'READY' : 'LOADING' }}</span>
          </div>
        </section>

        <section class="inspector-section">
          <div class="section-heading">
            <div><span class="section-index">01</span><strong>Available actions</strong></div>
            <span>{{ diagnostics.availableActions.length }} actions</span>
          </div>
          <div class="action-grid">
            <span v-for="action in diagnostics.availableActions" :key="action" :class="['action-chip', action === diagnostics.currentAnim && 'action-chip-active']">
              <i></i>{{ action }}
            </span>
            <span v-if="diagnostics.availableActions.length === 0" class="empty-line">No detected actions</span>
          </div>
        </section>

        <section class="inspector-section sheet-section">
          <div class="section-heading">
            <div><span class="section-index">02</span><strong>Sprite atlas</strong></div>
            <span>{{ diagnostics.frameWidth }} × {{ diagnostics.frameHeight }}</span>
          </div>
          <div class="atlas-frame">
            <canvas ref="gridRef" />
            <span class="atlas-label">CURRENT ROW</span>
          </div>
          <div class="atlas-legend"><span><i class="blue-key"></i>current animation</span><span><i class="red-key"></i>frame grid</span></div>
        </section>

        <section class="inspector-section mapping-section">
          <div class="section-heading">
            <div><span class="section-index">03</span><strong>Row mapping</strong></div>
            <span>{{ diagnostics.rows.length }} entries</span>
          </div>
          <div class="mapping-list">
            <div v-for="row in diagnostics.rows" :key="`${row.name}-${row.row}`" :class="['mapping-row', row.name === diagnostics.currentAnim && 'mapping-row-active']">
              <span class="mapping-row-number">{{ String(row.row).padStart(2, '0') }}</span>
              <span class="mapping-row-name">{{ row.name }}</span>
              <span class="mapping-row-frames">{{ row.frames }}f · {{ row.loop ? 'loop' : 'once' }}</span>
            </div>
          </div>
        </section>
      </template>

      <div v-else class="inspector-empty">
        <span class="empty-mark">◌</span>
        <strong>Waiting for sprite data</strong>
        <small>Double-click the pet to start diagnostics</small>
      </div>
    </main>
  </div>
</template>

<style scoped>
.inspector-shell {
  --blue: var(--accent);
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--app-bg);
  color: var(--ink);
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif;
}

.inspector-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--line);
  background: var(--sidebar-bg);
  backdrop-filter: blur(20px);
}

.inspector-brand { display: flex; align-items: center; gap: 9px; }
.inspector-mark { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; background: var(--accent-soft-strong); color: var(--accent); font-size: 16px; }
.inspector-brand strong, .inspector-brand small { display: block; }
.inspector-brand strong { font-size: 13px; letter-spacing: -.01em; }
.inspector-brand small { margin-top: 2px; color: var(--muted); font-size: 10px; }
.live-badge { display: flex; align-items: center; gap: 5px; color: var(--success); font-size: 9px; font-weight: 700; letter-spacing: .08em; }
.live-badge i { width: 6px; height: 6px; border-radius: 50%; background: var(--success); box-shadow: 0 0 0 3px rgba(48,209,88,.12); animation: pulse 1.8s infinite; }

.inspector-scroll { height: calc(100% - 61px); overflow-y: auto; padding: 16px 18px 20px; }
.inspector-scroll > * + * { margin-top: 12px; }
.hitbox-control { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 12px; border: 1px solid var(--line); border-radius: 10px; background: var(--surface); }
.hitbox-control-copy { display: flex; align-items: center; gap: 8px; min-width: 0; }
.hitbox-control-copy > span:last-child { min-width: 0; }
.hitbox-control-copy strong, .hitbox-control-copy small { display: block; }
.hitbox-control-copy strong { color: var(--ink); font-size: 11px; font-weight: 600; }
.hitbox-control-copy small { margin-top: 2px; color: var(--muted); font-size: 9px; }
.hitbox-control-icon { display: grid; place-items: center; flex: 0 0 auto; width: 24px; height: 24px; border-radius: 7px; background: var(--accent-soft); color: var(--accent); font-size: 14px; }
.debug-switch { position: relative; flex: 0 0 auto; width: 37px; height: 22px; padding: 0; border: 0; border-radius: 999px; background: var(--track-strong); transition: background 180ms ease; }
.debug-switch span { position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%; background: var(--thumb); box-shadow: 0 1px 3px var(--thumb-shadow); transition: transform 180ms ease; }
.debug-switch-on { background: var(--accent); }
.debug-switch-on span { transform: translateX(15px); }

.state-hero { padding: 15px; border: 1px solid var(--line); border-radius: 12px; background: var(--surface); box-shadow: var(--shadow-card); }
.state-line { display: flex; align-items: center; gap: 7px; }
.state-dot { width: 8px; height: 8px; border-radius: 50%; box-shadow: 0 0 0 3px var(--line); }
.state-name { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .07em; }
.state-line code { margin-left: auto; color: var(--accent); font: 11px "SF Mono", ui-monospace, monospace; }
.frame-readout { display: flex; align-items: baseline; gap: 7px; margin-top: 10px; }
.frame-readout strong { font: 38px/1 "SF Mono", ui-monospace, monospace; letter-spacing: -.08em; }
.frame-readout span { color: var(--muted); font: 11px "SF Mono", ui-monospace, monospace; }
.state-meta { display: flex; gap: 10px; margin-top: 13px; color: var(--muted); font: 9px "SF Mono", ui-monospace, monospace; }

.inspector-section { overflow: hidden; border: 1px solid var(--line); border-radius: 11px; background: var(--surface); }
.section-heading { display: flex; align-items: center; justify-content: space-between; min-height: 39px; padding: 0 13px; border-bottom: 1px solid var(--line); color: var(--muted); font-size: 10px; }
.section-heading > div { display: flex; align-items: center; gap: 8px; }
.section-heading strong { color: var(--ink); font-size: 11px; font-weight: 600; }
.section-index { color: var(--faint); font: 9px "SF Mono", ui-monospace, monospace; }
.action-grid { display: flex; flex-wrap: wrap; gap: 6px; padding: 12px 13px 14px; }
.action-chip { display: inline-flex; align-items: center; gap: 5px; padding: 5px 8px; border: 1px solid var(--line); border-radius: 6px; background: var(--tile-bg); color: var(--ink-secondary); font: 10px "SF Mono", ui-monospace, monospace; }
.action-chip i { width: 5px; height: 5px; border-radius: 50%; background: var(--faint); }
.action-chip-active { border-color: var(--accent-soft-border); background: var(--accent-soft); color: var(--accent); }
.action-chip-active i { background: var(--blue); box-shadow: 0 0 0 2px var(--accent-soft); }
.empty-line { color: var(--faint); font-size: 11px; }

.atlas-frame { position: relative; overflow: auto; padding: 12px; background: var(--app-bg); }
.atlas-frame canvas { display: block; max-width: 100%; height: auto; image-rendering: pixelated; border: 1px solid var(--line); border-radius: 4px; }
.atlas-label { position: absolute; top: 18px; right: 18px; padding: 3px 5px; border-radius: 3px; background: var(--accent); color: white; font: 8px "SF Mono", ui-monospace, monospace; }
.atlas-legend { display: flex; gap: 12px; padding: 8px 13px 10px; color: var(--muted); font-size: 9px; }
.atlas-legend span { display: flex; align-items: center; gap: 4px; }
.atlas-legend i { display: block; width: 6px; height: 6px; border-radius: 1px; }
.blue-key { background: var(--blue); }
.red-key { background: var(--danger); }

.mapping-list { padding: 4px 13px 8px; }
.mapping-row { display: grid; grid-template-columns: 25px 1fr auto; align-items: center; gap: 7px; min-height: 28px; border-bottom: 1px solid var(--line); color: var(--ink-secondary); font-size: 10px; }
.mapping-row:last-child { border-bottom: 0; }
.mapping-row-active { color: var(--accent); }
.mapping-row-number, .mapping-row-frames { color: var(--faint); font: 9px "SF Mono", ui-monospace, monospace; }
.mapping-row-name { font: 10px "SF Mono", ui-monospace, monospace; }
.inspector-empty { display: flex; flex-direction: column; align-items: center; padding: 72px 20px; color: var(--muted); text-align: center; }
.empty-mark { color: var(--faint); font-size: 34px; }
.inspector-empty strong { margin-top: 10px; color: var(--ink); font-size: 13px; font-weight: 500; }
.inspector-empty small { margin-top: 5px; color: var(--faint); font-size: 10px; }

.inspector-scroll::-webkit-scrollbar { width: 7px; }
.inspector-scroll::-webkit-scrollbar-thumb { border: 2px solid transparent; border-radius: 999px; background: var(--scroller); background-clip: content-box; }

@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .45; } }
</style>

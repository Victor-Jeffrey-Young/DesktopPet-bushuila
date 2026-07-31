<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import type { DiagnosticsSnapshot } from '../composables/useSpriteAnimation'

const diagnostics = ref<DiagnosticsSnapshot | null>(null)
const gridRef = ref<HTMLCanvasElement | null>(null)
const spriteImage = ref<HTMLImageElement | null>(null)

let unlisten: UnlistenFn | null = null

onMounted(async () => {
  document.title = 'Debug'
  unlisten = await listen<DiagnosticsSnapshot>('debug-diagnostics', (e) => {
    diagnostics.value = e.payload
    loadSprite(e.payload.spritesheetUrl)
  })
})

onUnmounted(() => {
  unlisten?.()
})

/** 宠物窗口推送的 spritesheet URL，本窗口独立加载（asset 协议转 blob 保证 canvas 可读像素） */
async function loadSprite(url?: string) {
  if (!url || spriteImage.value) return
  try {
    const resp = await fetch(url)
    const blob = await resp.blob()
    const img = new Image()
    img.onload = () => {
      spriteImage.value = img
      drawGrid()
    }
    img.src = URL.createObjectURL(blob)
  } catch {
    spriteImage.value = null
  }
}

function drawGrid() {
  const canvas = gridRef.value
  const img = spriteImage.value
  const d = diagnostics.value
  if (!canvas || !img || !d || !d.frameWidth || !d.frameHeight) return

  const scale = 0.2
  const w = Math.round(img.width * scale)
  const h = Math.round(img.height * scale)
  if (canvas.width !== w) canvas.width = w
  if (canvas.height !== h) canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.clearRect(0, 0, w, h)
  ctx.drawImage(img, 0, 0, w, h)
  ctx.strokeStyle = 'rgba(255,80,80,0.6)'
  ctx.lineWidth = 1

  const fw = Math.max(1, Math.round(d.frameWidth * scale))
  const fh = Math.max(1, Math.round(d.frameHeight * scale))
  const rows = Math.floor(img.height / d.frameHeight)

  for (let x = 0; x <= w; x += fw) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
  }
  for (let y = 0; y <= h; y += fh) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
  }

  const curRow = d.rows.find(r => r.name === d.currentAnim)?.row
  if (curRow !== undefined) {
    ctx.fillStyle = 'rgba(80,160,255,0.35)'
    ctx.fillRect(0, curRow * fh, w, fh)
  }

  ctx.fillStyle = 'rgba(0,0,0,0.65)'
  ctx.font = '8px monospace'
  for (let r = 0; r < rows; r++) {
    const anim = d.rows.find(a => a.row === r)
    const label = anim ? `${r}: ${anim.name} (${anim.frames}f)` : `${r}: —`
    ctx.fillText(label, 3, r * fh + 9)
  }
}

watch(() => [diagnostics.value?.machineState, diagnostics.value?.currentAnim, diagnostics.value?.currentFrame, diagnostics.value?.availableActions], drawGrid)
</script>

<template>
  <div class="w-full h-full bg-black/90 text-white/90 p-4 text-xs overflow-y-auto">
    <h3 class="font-bold text-sm mb-3">🐛 Debug <span class="text-white/40 font-normal">（实时推送，双击宠物刷新）</span></h3>

    <template v-if="diagnostics">
      <div class="space-y-1 font-mono mb-3">
        <div>状态: <span class="text-blue-300">{{ diagnostics.machineState }}</span></div>
        <div>动画: <span class="text-blue-300">{{ diagnostics.currentAnim }}</span> 帧 {{ diagnostics.currentFrame }}/{{ diagnostics.frameCount }}</div>
        <div>循环: {{ diagnostics.isLooping ? '是' : '否' }} · 加载: {{ diagnostics.isLoaded ? '是' : '否' }}</div>
        <div>帧尺寸: {{ diagnostics.frameWidth }}×{{ diagnostics.frameHeight }}</div>
        <div>可用动作: <span class="text-green-300">{{ diagnostics.availableActions.join(', ') || '无' }}</span></div>
      </div>

      <div class="text-white/50 mb-1">行映射（当前行高亮）</div>
      <canvas ref="gridRef" class="border border-white/20 rounded" />
    </template>
    <div v-else class="text-white/50">等待数据...（双击宠物窗口的精灵推送）</div>
  </div>
</template>

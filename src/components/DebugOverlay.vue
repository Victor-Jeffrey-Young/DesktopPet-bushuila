<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import type { DiagnosticsSnapshot } from '../composables/useSpriteAnimation'

const props = defineProps<{
  diagnostics: DiagnosticsSnapshot
  image: HTMLImageElement | null
}>()

const emit = defineEmits<{ close: [] }>()

const gridRef = ref<HTMLCanvasElement | null>(null)

/** spritesheet 缩略图 + 网格线 + 行标注 */
function drawGrid() {
  const canvas = gridRef.value
  if (!canvas || !props.image) return
  const img = props.image
  const d = props.diagnostics
  const scale = 0.35
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
  const cols = Math.floor(img.width / d.frameWidth)
  const rows = Math.floor(img.height / d.frameHeight)

  // 网格线
  for (let x = 0; x <= w; x += fw) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
  }
  for (let y = 0; y <= h; y += fh) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
  }

  // 当前动画行高亮
  const curRow = props.diagnostics.rows.find(r => r.name === props.diagnostics.currentAnim)?.row
  if (curRow !== undefined) {
    ctx.fillStyle = 'rgba(80,160,255,0.35)'
    ctx.fillRect(0, curRow * fh, w, fh)
  }

  // 行标注
  ctx.fillStyle = 'rgba(0,0,0,0.65)'
  ctx.font = '9px monospace'
  for (let r = 0; r < rows; r++) {
    const anim = props.diagnostics.rows.find(a => a.row === r)
    const label = anim ? `${r}: ${anim.name} (${anim.frames}f)` : `${r}: —`
    ctx.fillText(label, 3, r * fh + 10)
  }

  void cols
}

watch(() => [props.diagnostics, props.image], drawGrid)
onMounted(drawGrid)
</script>

<template>
  <div class="fixed inset-0 z-[70] flex items-center justify-center" @click.self="emit('close')">
    <div class="bg-black/85 text-white/90 rounded-xl p-4 w-[340px] max-h-[90%] overflow-y-auto text-xs shadow-2xl border border-white/10">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-bold text-sm">🐛 Debug</h3>
        <button class="w-6 h-6 rounded hover:bg-white/10" @click="emit('close')">✕</button>
      </div>

      <div class="space-y-1.5 mb-3 font-mono">
        <div>状态: <span class="text-blue-300">{{ diagnostics.machineState }}</span></div>
        <div>动画: <span class="text-blue-300">{{ diagnostics.currentAnim }}</span> 帧 {{ diagnostics.currentFrame }}/{{ diagnostics.frameCount }}</div>
        <div>循环: {{ diagnostics.isLooping ? '是' : '否' }} · 加载: {{ diagnostics.isLoaded ? '是' : '否' }}</div>
        <div>帧尺寸: {{ diagnostics.frameWidth }}×{{ diagnostics.frameHeight }}</div>
        <div>可用动作: <span class="text-green-300">{{ diagnostics.availableActions.join(', ') || '无' }}</span></div>
      </div>

      <div class="mb-2 text-white/60">行映射（当前行高亮）</div>
      <canvas ref="gridRef" class="w-full border border-white/20 rounded" />
    </div>
  </div>
</template>

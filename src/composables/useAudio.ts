import { ref } from 'vue'

const audioCtx = ref<AudioContext | null>(null)

/** 解码结果缓存（按 URL/文件路径），提醒间隔最短 5 分钟，2 个容量足够 */
const MAX_BUFFER_CACHE = 2
const bufferCache = new Map<string, AudioBuffer>()

function getCachedBuffer(key: string): AudioBuffer | null {
  const hit = bufferCache.get(key)
  if (hit) {
    // LRU：重新插入，保证最近使用保留在末尾
    bufferCache.delete(key)
    bufferCache.set(key, hit)
    return hit
  }
  return null
}

function setCachedBuffer(key: string, buffer: AudioBuffer) {
  if (bufferCache.size >= MAX_BUFFER_CACHE) {
    const oldest = bufferCache.keys().next().value
    if (oldest !== undefined) bufferCache.delete(oldest)
  }
  bufferCache.set(key, buffer)
}

function getCtx(): AudioContext {
  if (!audioCtx.value) {
    audioCtx.value = new AudioContext()
  }
  return audioCtx.value
}

export function useAudio() {
  const isPlaying = ref(false)

  async function ensureResumed() {
    if (audioCtx.value?.state === 'suspended') {
      await audioCtx.value.resume()
    }
  }

  async function play(source: ArrayBuffer | string) {
    await ensureResumed()
    isPlaying.value = true
    try {
      const ctx = getCtx()
      let buf: ArrayBuffer
      let cacheKey: string | null = null
      if (source instanceof ArrayBuffer) {
        buf = source
      } else {
        cacheKey = source
        const cached = getCachedBuffer(cacheKey)
        if (cached) {
          const src = ctx.createBufferSource()
          src.buffer = cached
          src.connect(ctx.destination)
          src.onended = () => { isPlaying.value = false }
          src.start(0)
          return
        }
        const resp = await fetch(source)
        buf = await resp.arrayBuffer()
      }
      const decoded = await ctx.decodeAudioData(buf)
      if (cacheKey) setCachedBuffer(cacheKey, decoded)
      const src = ctx.createBufferSource()
      src.buffer = decoded
      src.connect(ctx.destination)
      src.onended = () => { isPlaying.value = false }
      src.start(0)
    } catch (e) {
      console.error('Audio playback failed:', e)
      isPlaying.value = false
    }
  }

  async function playBeep(frequency = 800, duration = 200) {
    await ensureResumed()
    isPlaying.value = true
    const ctx = getCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = frequency
    gain.gain.value = 0.3
    osc.start()
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000)
    osc.stop(ctx.currentTime + duration / 1000)
    setTimeout(() => { isPlaying.value = false }, duration)
  }

  return { isPlaying, play, playBeep, ensureResumed }
}
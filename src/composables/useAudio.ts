import { ref } from 'vue'

const audioCtx = ref<AudioContext | null>(null)

function getCtx(): AudioContext {
  if (!audioCtx.value) {
    audioCtx.value = new AudioContext()
  }
  return audioCtx.value
}

export function useAudio() {
  const isPlaying = ref(false)

  async function play(source: string) {
    isPlaying.value = true
    try {
      const ctx = getCtx()
      const resp = await fetch(source)
      const buf = await resp.arrayBuffer()
      const decoded = await ctx.decodeAudioData(buf)
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

  function playBeep(frequency = 800, duration = 200) {
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

  return { isPlaying, play, playBeep }
}
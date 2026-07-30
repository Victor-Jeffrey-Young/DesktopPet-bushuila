<script setup lang="ts">
defineProps<{
  count: number
}>()

const emit = defineEmits<{
  dismiss: []
  snooze: []
}>()
</script>

<template>
  <div class="fixed inset-0 flex items-center justify-center z-40 pointer-events-none">
    <div class="pointer-events-auto bg-white/85 rounded-2xl p-7 shadow-2xl border border-white/30 w-[calc(100vw-32px)] max-w-[300px] animate-pop-in">
      <div class="text-center">
        <div class="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-4">
          <span class="text-3xl">💧</span>
        </div>
        <h3 class="text-2xl font-bold text-gray-800 mb-1.5">补水啦！</h3>
        <p class="text-sm text-gray-400 mb-7">
          今天已喝 <span class="font-semibold text-blue-500">{{ count }}</span> 杯水
        </p>
        <div class="space-y-2.5">
          <button
            class="w-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-xl py-3 text-sm font-semibold shadow-lg shadow-blue-200/50 transition"
            @click="emit('dismiss')"
          >
            已喝水
          </button>
          <button
            class="w-full bg-white/50 hover:bg-white/80 text-gray-400 hover:text-gray-600 rounded-xl py-3 text-sm font-medium border border-gray-200/40 transition"
            @click="emit('snooze')"
          >
            稍后提醒
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes pop-in {
  0% { transform: scale(0.5); opacity: 0; }
  70% { transform: scale(1.05); }
  100% { transform: scale(1); opacity: 1; }
}

.animate-pop-in {
  animation: pop-in 0.3s ease-out;
}
</style>
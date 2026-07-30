<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import type { CustomPetConfig } from '../types'

const props = defineProps<{
  pet?: CustomPetConfig
}>()

const emit = defineEmits<{
  save: [data: Omit<CustomPetConfig, 'id' | 'createdAt'>]
  cancel: []
}>()

const emojiOptions = [
  '🐱', '🐶', '🐰', '🦊', '🐼', '🐨', '🐸', '🦁',
  '🐯', '🐷', '🐵', '🦄', '🐲', '🌟', '🌈', '🍀',
  '🌸', '🎀', '🦋', '🐢',
]

interface FormData {
  name: string
  emojiIdle: string
  emojiReminding: string
  emojiSnoozing: string
  colorIdleFrom: string
  colorIdleTo: string
  colorRemindingFrom: string
  colorRemindingTo: string
  colorSnoozingFrom: string
  colorSnoozingTo: string
}

const form = reactive<FormData>({
  name: props.pet?.name ?? '',
  emojiIdle: props.pet?.emoji.idle ?? '🐱',
  emojiReminding: props.pet?.emoji.reminding ?? '',
  emojiSnoozing: props.pet?.emoji.snoozing ?? '',
  colorIdleFrom: props.pet?.colors.idle[0] ?? '#4A90D9',
  colorIdleTo: props.pet?.colors.idle[1] ?? '#8EC5FC',
  colorRemindingFrom: props.pet?.colors.reminding[0] ?? '#FF6B6B',
  colorRemindingTo: props.pet?.colors.reminding[1] ?? '#FFA07A',
  colorSnoozingFrom: props.pet?.colors.snoozing[0] ?? '#9B59B6',
  colorSnoozingTo: props.pet?.colors.snoozing[1] ?? '#DDA0DD',
})

const remindingEmoji = computed(() => form.emojiReminding || form.emojiIdle)
const snoozingEmoji = computed(() => form.emojiSnoozing || form.emojiIdle)

const isValid = computed(() => form.name.trim().length > 0 && form.emojiIdle.length > 0)

function handleSave() {
  if (!isValid.value) return
  emit('save', {
    name: form.name.trim(),
    emoji: {
      idle: form.emojiIdle,
      reminding: remindingEmoji.value,
      snoozing: snoozingEmoji.value,
    },
    colors: {
      idle: [form.colorIdleFrom, form.colorIdleTo],
      reminding: [form.colorRemindingFrom, form.colorRemindingTo],
      snoozing: [form.colorSnoozingFrom, form.colorSnoozingTo],
    },
  })
}
</script>

<template>
  <div class="fixed inset-0 flex items-center justify-center z-[60]" @click.self="emit('cancel')">
    <div class="bg-white/90 rounded-2xl w-[400px] shadow-2xl border border-white/30 overflow-hidden animate-slide-up">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 pt-5 pb-3">
        <h2 class="text-lg font-bold text-gray-800">
          {{ pet ? '编辑精灵' : '创建自定义精灵' }}
        </h2>
        <button class="w-7 h-7 rounded-full hover:bg-black/5 flex items-center justify-center text-gray-300 hover:text-gray-500 transition" @click="emit('cancel')">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
          </svg>
        </button>
      </div>

      <div class="px-6 pb-5 max-h-[520px] overflow-y-auto space-y-4">
        <!-- 名称 -->
        <div class="bg-white/60 rounded-xl p-4 space-y-2">
          <label class="text-sm font-medium text-gray-700">名称</label>
          <input
            v-model="form.name"
            type="text"
            maxlength="20"
            placeholder="给你的精灵取个名字"
            class="w-full px-3 py-2 rounded-lg border border-gray-200/60 bg-white/80 text-sm text-gray-700 placeholder-gray-300 focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-200 transition"
          />
        </div>

        <!-- 表情选择 -->
        <div class="bg-white/60 rounded-xl p-4 space-y-3">
          <div class="space-y-2">
            <label class="text-sm font-medium text-gray-700">待机表情 *</label>
            <div class="grid grid-cols-5 gap-1.5">
              <button
                v-for="emoji in emojiOptions"
                :key="emoji"
                :class="[
                  'w-10 h-10 flex items-center justify-center rounded-lg text-lg transition border',
                  form.emojiIdle === emoji
                    ? 'bg-blue-50 border-blue-200 scale-110'
                    : 'bg-white/60 border-gray-200/30 hover:border-gray-300',
                ]"
                @click="form.emojiIdle = emoji"
              >
                {{ emoji }}
              </button>
            </div>
          </div>

          <div class="flex gap-3">
            <div class="flex-1 space-y-2">
              <label class="text-xs text-gray-500">提醒表情</label>
              <div class="flex items-center gap-2">
                <span class="text-2xl">{{ remindingEmoji }}</span>
                <select
                  v-model="form.emojiReminding"
                  class="flex-1 px-2 py-1.5 rounded-lg border border-gray-200/60 bg-white/80 text-xs text-gray-600 focus:outline-none focus:border-blue-300"
                >
                  <option value="">同待机</option>
                  <option v-for="emoji in emojiOptions" :key="emoji" :value="emoji">{{ emoji }}</option>
                </select>
              </div>
            </div>
            <div class="flex-1 space-y-2">
              <label class="text-xs text-gray-500">小憩表情</label>
              <div class="flex items-center gap-2">
                <span class="text-2xl">{{ snoozingEmoji }}</span>
                <select
                  v-model="form.emojiSnoozing"
                  class="flex-1 px-2 py-1.5 rounded-lg border border-gray-200/60 bg-white/80 text-xs text-gray-600 focus:outline-none focus:border-blue-300"
                >
                  <option value="">同待机</option>
                  <option v-for="emoji in emojiOptions" :key="emoji" :value="emoji">{{ emoji }}</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- 颜色选择 -->
        <div class="bg-white/60 rounded-xl p-4 space-y-3">
          <span class="text-sm font-medium text-gray-700">配色</span>

          <div class="space-y-2">
            <label class="text-xs text-gray-500">待机</label>
            <div class="flex items-center gap-3">
              <input type="color" v-model="form.colorIdleFrom" class="w-8 h-8 rounded-lg cursor-pointer border-0 p-0" />
              <span class="text-gray-300">→</span>
              <input type="color" v-model="form.colorIdleTo" class="w-8 h-8 rounded-lg cursor-pointer border-0 p-0" />
              <div class="flex-1 h-8 rounded-lg" :style="{ background: `linear-gradient(135deg, ${form.colorIdleFrom}, ${form.colorIdleTo})` }"></div>
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-xs text-gray-500">提醒</label>
            <div class="flex items-center gap-3">
              <input type="color" v-model="form.colorRemindingFrom" class="w-8 h-8 rounded-lg cursor-pointer border-0 p-0" />
              <span class="text-gray-300">→</span>
              <input type="color" v-model="form.colorRemindingTo" class="w-8 h-8 rounded-lg cursor-pointer border-0 p-0" />
              <div class="flex-1 h-8 rounded-lg" :style="{ background: `linear-gradient(135deg, ${form.colorRemindingFrom}, ${form.colorRemindingTo})` }"></div>
            </div>
          </div>

          <div class="space-y-2">
            <label class="text-xs text-gray-500">小憩</label>
            <div class="flex items-center gap-3">
              <input type="color" v-model="form.colorSnoozingFrom" class="w-8 h-8 rounded-lg cursor-pointer border-0 p-0" />
              <span class="text-gray-300">→</span>
              <input type="color" v-model="form.colorSnoozingTo" class="w-8 h-8 rounded-lg cursor-pointer border-0 p-0" />
              <div class="flex-1 h-8 rounded-lg" :style="{ background: `linear-gradient(135deg, ${form.colorSnoozingFrom}, ${form.colorSnoozingTo})` }"></div>
            </div>
          </div>
        </div>

        <!-- 预览 -->
        <div class="bg-white/60 rounded-xl p-6 flex items-center justify-center">
          <div
            class="w-20 h-20 rounded-full flex items-center justify-center shadow-lg"
            :style="{ background: `linear-gradient(135deg, ${form.colorIdleFrom}, ${form.colorIdleTo})` }"
          >
            <span class="text-3xl">{{ form.emojiIdle }}</span>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="px-6 pb-5 pt-1 flex gap-3">
        <button
          class="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-xl py-3 text-sm font-medium transition"
          @click="emit('cancel')"
        >
          取消
        </button>
        <button
          class="flex-1 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-xl py-3 text-sm font-semibold shadow-lg shadow-blue-200/50 transition disabled:opacity-40 disabled:cursor-not-allowed"
          :disabled="!isValid"
          @click="handleSave"
        >
          保存
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes slide-up {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.animate-slide-up {
  animation: slide-up 0.25s ease-out;
}

/* 自定义 color input 样式 */
input[type="color"] {
  -webkit-appearance: none;
  border: none;
  padding: 0;
  cursor: pointer;
}

input[type="color"]::-webkit-color-swatch-wrapper {
  padding: 0;
}

input[type="color"]::-webkit-color-swatch {
  border: 1px solid rgba(0,0,0,0.1);
  border-radius: 6px;
}
</style>

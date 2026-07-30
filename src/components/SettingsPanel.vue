<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAppStore } from '../stores/app'
import { PET_THEMES, convertCustomPetToResolvedConfig } from '../types'
import type { PetType, CustomPetConfig } from '../types'
import CustomPetEditor from './CustomPetEditor.vue'

const emit = defineEmits<{ close: [] }>()
const store = useAppStore()

const activeTab = ref<'general' | 'voice' | 'appearance' | 'history'>('general')
const intervalInput = ref(store.settings.intervalMinutes)
const snoozeInput = ref(store.settings.snoozeMinutes)
const voiceSourceInput = ref(store.settings.voiceSource)
const petTypeInput = ref<PetType | 'custom'>(store.settings.petTheme.pet)
const selectedCustomPetId = ref<string | undefined>(store.settings.petTheme.customPetId)
const fileInputRef = ref<HTMLInputElement | null>(null)

// 自定义精灵编辑器状态
const showEditor = ref(false)
const editingPet = ref<CustomPetConfig | undefined>()

function saveSettings() {
  store.updateSettings({
    intervalMinutes: intervalInput.value,
    snoozeMinutes: snoozeInput.value,
    voiceSource: voiceSourceInput.value,
    petTheme: {
      pet: petTypeInput.value,
      customPetId: selectedCustomPetId.value,
    },
  })
  emit('close')
}

function selectPresetPet(key: PetType) {
  petTypeInput.value = key
  selectedCustomPetId.value = undefined
}

function selectCustomPet(id: string) {
  petTypeInput.value = 'custom'
  selectedCustomPetId.value = id
}

function isCustomPetSelected(id: string): boolean {
  return petTypeInput.value === 'custom' && selectedCustomPetId.value === id
}

function openEditor(pet?: CustomPetConfig) {
  editingPet.value = pet
  showEditor.value = true
}

function handleEditorSave(data: Omit<CustomPetConfig, 'id' | 'createdAt'>) {
  if (editingPet.value) {
    store.updateCustomPet(editingPet.value.id, data)
    // 如果编辑的是当前选中的自定义精灵，同步更新它的选中状态
    if (selectedCustomPetId.value === editingPet.value.id) {
      selectCustomPet(editingPet.value.id)
    }
  } else {
    const id = store.createCustomPet(data)
    // 创建后自动选中
    selectCustomPet(id)
  }
  showEditor.value = false
  editingPet.value = undefined
}

function deleteCustomPetConfirm(id: string) {
  const pet = store.customPets.find(p => p.id === id)
  if (pet && confirm(`确定删除精灵"${pet.name}"吗？`)) {
    store.deleteCustomPet(id)
    // 更新本地选中状态（store 已处理回退，但本地 ref 需要同步）
    if (selectedCustomPetId.value === id) {
      selectedCustomPetId.value = undefined
      petTypeInput.value = store.settings.petTheme.pet
    }
  }
}

/** 预览区配置 */
const previewConfig = computed(() => {
  if (petTypeInput.value === 'custom' && selectedCustomPetId.value) {
    const custom = store.customPets.find(p => p.id === selectedCustomPetId.value)
    if (custom) return convertCustomPetToResolvedConfig(custom)
  }
  const type = petTypeInput.value === 'custom' ? 'drop' : petTypeInput.value
  return {
    id: type,
    label: PET_THEMES[type].label,
    isCustom: false as const,
    emoji: PET_THEMES[type].emoji,
    gradients: {
      idle: { class: PET_THEMES[type].colors.idle, style: null as string | null },
      reminding: { class: PET_THEMES[type].colors.reminding, style: null as string | null },
      snoozing: { class: PET_THEMES[type].colors.snoozing, style: null as string | null },
    },
  }
})

async function handleFileImport(e: Event) {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return

  for (const file of files) {
    try {
      const dataUrl = await readFileAsDataUrl(file)
      store.addCustomVoice(file.name, dataUrl)
    } catch (err) {
      console.error('导入语音失败:', file.name, err)
    }
  }

  // 清空 input 以便重复选择同一个文件
  input.value = ''
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

const todayDate = computed(() => {
  const d = new Date()
  return `${d.getMonth() + 1}月${d.getDate()}日`
})
</script>

<template>
  <div class="fixed inset-0 flex items-center justify-center z-50" @click.self="emit('close')">
    <div class="bg-white/85 rounded-2xl w-[400px] shadow-2xl border border-white/30 overflow-hidden animate-slide-up">
      <!-- Header -->
      <div class="flex items-center justify-between px-6 pt-5 pb-3">
        <h2 class="text-lg font-bold text-gray-800">设置</h2>
        <button class="w-7 h-7 rounded-full hover:bg-black/5 flex items-center justify-center text-gray-300 hover:text-gray-500 transition" @click="emit('close')">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
          </svg>
        </button>
      </div>

      <!-- Pill Tabs -->
      <div class="px-6 pb-4">
        <div class="flex bg-white/30 rounded-xl p-1">
          <button
            v-for="tab in (['general', 'voice', 'appearance', 'history'] as const)"
            :key="tab"
            :class="[
              'flex-1 py-2 text-sm font-medium rounded-lg transition',
              activeTab === tab
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-400 hover:text-gray-600',
            ]"
            @click="activeTab = tab"
          >
            {{ tab === 'general' ? '常规' : tab === 'voice' ? '语音' : tab === 'appearance' ? '形象' : '历史' }}
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="px-6 pb-5 max-h-[420px] overflow-y-auto space-y-5">

        <!-- ===== 常规 Tab ===== -->
        <template v-if="activeTab === 'general'">

          <!-- 提醒间隔 -->
          <div class="bg-white/40 rounded-xl p-4 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-700">提醒间隔</span>
              <span class="text-sm font-mono font-semibold text-blue-600">{{ intervalInput }} 分钟</span>
            </div>
            <input
              v-model.number="intervalInput"
              type="range"
              min="1"
              max="120"
              step="1"
              class="w-full accent-blue-500 h-1.5 rounded-full appearance-none bg-gray-200/60 cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md
                [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-gray-200/60
                [&::-webkit-slider-thumb]:cursor-pointer"
            />
          </div>

          <!-- 稍后提醒 -->
          <div class="bg-white/40 rounded-xl p-4 space-y-3">
            <span class="text-sm font-medium text-gray-700">稍后提醒</span>
            <div class="flex gap-2">
              <button
                v-for="m in [5, 10, 15]"
                :key="m"
                :class="[
                  'flex-1 py-2 rounded-lg text-sm font-medium transition border',
                  snoozeInput === m
                    ? 'bg-blue-50 border-blue-200 text-blue-600'
                    : 'bg-white/50 border-gray-200/40 text-gray-400 hover:text-gray-600 hover:border-gray-300',
                ]"
                @click="snoozeInput = m"
              >
                {{ m }} 分钟
              </button>
            </div>
          </div>

          <!-- Toggle 开关 -->
          <div class="bg-white/40 rounded-xl p-4 space-y-4">
            <label class="flex items-center justify-between cursor-pointer">
              <span class="text-sm text-gray-700">开机自启动</span>
              <div class="relative">
                <input type="checkbox" :checked="store.settings.autoStart" class="sr-only peer" />
                <div class="w-10 h-6 bg-gray-200/60 rounded-full peer-checked:bg-blue-500 transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-5 after:h-5 after:rounded-full after:bg-white after:shadow-sm after:transition-all peer-checked:after:translate-x-4"></div>
              </div>
            </label>
            <label class="flex items-center justify-between cursor-pointer">
              <span class="text-sm text-gray-700">系统托盘常驻</span>
              <div class="relative">
                <input type="checkbox" :checked="store.settings.systemTray" class="sr-only peer" />
                <div class="w-10 h-6 bg-gray-200/60 rounded-full peer-checked:bg-blue-500 transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:w-5 after:h-5 after:rounded-full after:bg-white after:shadow-sm after:transition-all peer-checked:after:translate-x-4"></div>
              </div>
            </label>
          </div>

        </template>

        <!-- ===== 语音 Tab ===== -->
        <template v-if="activeTab === 'voice'">

          <!-- 语音来源 -->
          <div class="bg-white/40 rounded-xl p-4 space-y-3">
            <span class="text-sm font-medium text-gray-700">语音来源</span>
            <div class="space-y-1.5">
              <label class="flex items-center gap-3 p-3 rounded-lg border border-blue-200 bg-blue-50/40 cursor-pointer transition hover:bg-blue-50/60">
                <input type="radio" name="voice" value="builtin" v-model="voiceSourceInput" class="accent-blue-500" />
                <span class="text-sm text-gray-700">🎭 魔性语音（内置）</span>
              </label>
              <label class="flex items-center gap-3 p-3 rounded-lg border border-gray-200/40 bg-transparent cursor-pointer transition hover:bg-white/30">
                <input type="radio" name="voice" value="ai" v-model="voiceSourceInput" class="accent-blue-500" />
                <span class="text-sm text-gray-700">🤖 AI 语音合成</span>
              </label>
              <label class="flex items-center gap-3 p-3 rounded-lg border border-gray-200/40 bg-transparent cursor-pointer transition hover:bg-white/30">
                <input type="radio" name="voice" value="custom" v-model="voiceSourceInput" class="accent-blue-500" />
                <span class="text-sm text-gray-700">🎵 自定义语音包</span>
              </label>
            </div>
          </div>

          <!-- 文件选择 -->
          <input type="file" accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/mp4,audio/x-m4a,audio/aac,.m4a" multiple ref="fileInputRef" class="hidden" @change="handleFileImport" />

          <button class="w-full border-2 border-dashed border-gray-300/40 rounded-xl py-3.5 text-sm text-gray-400 hover:text-blue-500 hover:border-blue-300/60 transition bg-white/20" @click="fileInputRef?.click()">
            + 导入语音文件
          </button>

          <!-- 已导入列表 -->
          <div v-if="store.customVoices.length > 0" class="space-y-1.5">
            <div v-for="voice in store.customVoices" :key="voice.id" class="flex items-center justify-between p-3 rounded-lg bg-white/40 border border-gray-200/30">
              <div class="flex items-center gap-2.5 min-w-0">
                <span class="text-sm">🎵</span>
                <span class="text-sm text-gray-600 truncate">{{ voice.name }}</span>
              </div>
              <button class="shrink-0 w-6 h-6 rounded-full hover:bg-red-50 flex items-center justify-center text-gray-300 hover:text-red-400 transition" @click="store.removeCustomVoice(voice.id)" title="删除">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3.5 h-3.5">
                  <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                </svg>
              </button>
            </div>
          </div>

          <div class="rounded-xl p-3 bg-white/20">
            <p class="text-xs text-gray-400">💡 支持 MP3、WAV、OGG、M4A 格式。自定义语音将在提醒时随机播放。</p>
          </div>

        </template>

        <!-- ===== 形象 Tab ===== -->
        <template v-if="activeTab === 'appearance'">
          <!-- 预设精灵 -->
          <div class="bg-white/40 rounded-xl p-4 space-y-3">
            <span class="text-sm font-medium text-gray-700">内置精灵</span>
            <div class="grid grid-cols-4 gap-2.5">
              <button
                v-for="(cfg, key) in PET_THEMES"
                :key="key"
                :class="[
                  'flex flex-col items-center gap-1 p-3 rounded-xl border transition',
                  petTypeInput === key && !selectedCustomPetId
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-white/40 border-gray-200/30 hover:border-gray-300',
                ]"
                @click="selectPresetPet(key)"
              >
                <span class="text-2xl">{{ cfg.emoji.idle }}</span>
                <span class="text-[10px] text-gray-500">{{ cfg.label }}</span>
              </button>
            </div>
          </div>

          <!-- 自定义精灵 -->
          <div class="bg-white/40 rounded-xl p-4 space-y-3">
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-gray-700">自定义精灵</span>
              <button
                class="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 font-medium hover:bg-blue-100 transition"
                @click="openEditor()"
              >
                + 新建
              </button>
            </div>

            <div v-if="store.customPets.length === 0" class="text-xs text-gray-400 text-center py-3">
              还没有自定义精灵，点击"新建"创建你的专属精灵
            </div>

            <div v-else class="grid grid-cols-4 gap-2.5">
              <button
                v-for="pet in store.customPets"
                :key="pet.id"
                :class="[
                  'flex flex-col items-center gap-1 p-3 rounded-xl border transition relative group',
                  isCustomPetSelected(pet.id)
                    ? 'bg-blue-50 border-blue-200'
                    : 'bg-white/40 border-gray-200/30 hover:border-gray-300',
                ]"
                @click="selectCustomPet(pet.id)"
              >
                <span class="text-2xl">{{ pet.emoji.idle }}</span>
                <span class="text-[10px] text-gray-500 truncate max-w-full">{{ pet.name }}</span>
                <!-- hover 编辑/删除 -->
                <div class="absolute -top-1.5 -right-1.5 hidden group-hover:flex gap-0.5">
                  <button
                    class="w-4 h-4 rounded-full bg-white shadow text-gray-400 hover:text-blue-500 text-[8px] flex items-center justify-center"
                    @click.stop="openEditor(pet)"
                  >✏️</button>
                  <button
                    class="w-4 h-4 rounded-full bg-white shadow text-gray-400 hover:text-red-500 text-[8px] flex items-center justify-center"
                    @click.stop="deleteCustomPetConfirm(pet.id)"
                  >✕</button>
                </div>
              </button>
            </div>
          </div>

          <!-- 当前预览 -->
          <div class="bg-white/40 rounded-xl p-4 space-y-3">
            <span class="text-sm font-medium text-gray-700">当前预览</span>
            <div class="flex items-center justify-center py-4">
              <div
                v-if="!previewConfig.isCustom"
                :class="[
                  'w-20 h-20 rounded-full flex items-center justify-center shadow-lg bg-gradient-to-br',
                  previewConfig.gradients.idle.class,
                ]"
              >
                <span class="text-3xl">{{ previewConfig.emoji.idle }}</span>
              </div>
              <div
                v-else
                class="w-20 h-20 rounded-full flex items-center justify-center shadow-lg"
                :style="{ background: previewConfig.gradients.idle.style! }"
              >
                <span class="text-3xl">{{ previewConfig.emoji.idle }}</span>
              </div>
            </div>
            <div class="flex justify-center gap-3 text-xs text-gray-400">
              <span>待机 {{ previewConfig.emoji.idle }}</span>
              <span>提醒 {{ previewConfig.emoji.reminding }}</span>
              <span>小憩 {{ previewConfig.emoji.snoozing }}</span>
            </div>
          </div>
        </template>

        <!-- ===== 历史 Tab ===== -->
        <template v-if="activeTab === 'history'">
          <div class="bg-white/40 rounded-xl p-6 text-center space-y-3">
            <div class="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto">
              <span class="text-2xl">💧</span>
            </div>
            <div>
              <div class="text-3xl font-bold text-blue-500">{{ store.todayCount }}</div>
              <div class="text-xs text-gray-400 mt-0.5">{{ todayDate }} 喝水记录</div>
            </div>
            <div class="pt-1">
              <div class="flex items-center justify-between text-xs text-gray-400 mb-1.5">
                <span>进度</span>
                <span>{{ Math.min(100, Math.round((store.todayCount / 8) * 100)) }}%</span>
              </div>
              <div class="w-full bg-gray-200/50 rounded-full h-2">
                <div class="bg-blue-500 h-2 rounded-full transition-all duration-500" :style="{ width: `${Math.min(100, (store.todayCount / 8) * 100)}%` }"></div>
              </div>
              <div class="text-xs text-gray-400 mt-1.5">目标：每日 8 杯</div>
            </div>
          </div>
          <div class="text-center text-xs text-gray-400">
            <p>右键点击精灵打开设置</p>
          </div>
        </template>
      </div>

      <!-- Footer -->
      <div class="px-6 pb-5 pt-1">
        <button
          class="w-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-xl py-3 text-sm font-semibold shadow-lg shadow-blue-200/50 transition"
          @click="saveSettings"
        >
          保存设置
        </button>
      </div>
    </div>
  </div>

  <!-- 自定义精灵编辑器 -->
  <CustomPetEditor
    v-if="showEditor"
    :pet="editingPet"
    @save="handleEditorSave"
    @cancel="showEditor = false"
  />
</template>

<style scoped>
@keyframes slide-up {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.animate-slide-up {
  animation: slide-up 0.25s ease-out;
}
</style>
<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAppStore } from '../stores/app'
import { PET_THEMES, convertCustomPetToResolvedConfig } from '../types'
import type { PetType, CustomPetConfig } from '../types'
import CustomPetEditor from './CustomPetEditor.vue'
import SettingsCard from './SettingsCard.vue'
import ToggleSwitch from './ToggleSwitch.vue'
import { enable as enableAutostart, disable as disableAutostart } from '@tauri-apps/plugin-autostart'

const emit = defineEmits<{ close: [] }>()
const store = useAppStore()

// --- Tab 定义 ---
const tabs = [
  { id: 'general' as const, icon: '◎', label: '常规' },
  { id: 'voice' as const, icon: '▶', label: '语音' },
  { id: 'appearance' as const, icon: '◆', label: '形象' },
  { id: 'history' as const, icon: '●', label: '历史' },
]
const activeTab = ref<'general' | 'voice' | 'appearance' | 'history'>('general')

// --- 表单状态 ---
const intervalInput = ref(store.settings.intervalMinutes)
const snoozeInput = ref(store.settings.snoozeMinutes)
const voiceSourceInput = ref(store.settings.voiceSource)
const autoStartInput = ref(store.settings.autoStart)
const systemTrayInput = ref(store.settings.systemTray)
const petTypeInput = ref<PetType | 'custom'>(store.settings.petTheme.pet)
const selectedCustomPetId = ref<string | undefined>(store.settings.petTheme.customPetId)
const fileInputRef = ref<HTMLInputElement | null>(null)

const showEditor = ref(false)
const editingPet = ref<CustomPetConfig | undefined>()

const todayDate = computed(() => {
  const d = new Date()
  return `${d.getMonth() + 1}月${d.getDate()}日`
})

// --- 预览 ---
const previewStyle = computed(() => {
  if (petTypeInput.value === 'custom' && selectedCustomPetId.value) {
    const pet = store.customPets.find(p => p.id === selectedCustomPetId.value)
    if (pet) return { background: `linear-gradient(135deg, ${pet.colors.idle[0]}, ${pet.colors.idle[1]})` }
  }
  const type = petTypeInput.value === 'custom' ? 'drop' : petTypeInput.value
  return { class: `bg-gradient-to-br ${PET_THEMES[type].colors.idle}` }
})

const previewEmoji = computed(() => {
  if (petTypeInput.value === 'custom' && selectedCustomPetId.value) {
    const pet = store.customPets.find(p => p.id === selectedCustomPetId.value)
    if (pet) return { idle: pet.emoji.idle, reminding: pet.emoji.reminding, snoozing: pet.emoji.snoozing }
  }
  const type = petTypeInput.value === 'custom' ? 'drop' : petTypeInput.value
  const theme = PET_THEMES[type]
  return { idle: theme.emoji.idle, reminding: theme.emoji.reminding, snoozing: theme.emoji.snoozing }
})

// --- 操作 ---
async function saveSettings() {
  store.updateSettings({
    intervalMinutes: intervalInput.value,
    snoozeMinutes: snoozeInput.value,
    voiceSource: voiceSourceInput.value,
    autoStart: autoStartInput.value,
    systemTray: systemTrayInput.value,
    petTheme: {
      pet: petTypeInput.value,
      customPetId: selectedCustomPetId.value,
    },
  })

  try {
    if (autoStartInput.value) await enableAutostart()
    else await disableAutostart()
  } catch (e) {
    console.error('Autostart toggle failed:', e)
  }

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
    if (selectedCustomPetId.value === editingPet.value.id) selectCustomPet(editingPet.value.id)
  } else {
    const id = store.createCustomPet(data)
    selectCustomPet(id)
  }
  showEditor.value = false
  editingPet.value = undefined
}

function deleteCustomPetConfirm(id: string) {
  const pet = store.customPets.find(p => p.id === id)
  if (pet && confirm(`确定删除精灵"${pet.name}"吗？`)) {
    store.deleteCustomPet(id)
    if (selectedCustomPetId.value === id) {
      selectedCustomPetId.value = undefined
      petTypeInput.value = store.settings.petTheme.pet
    }
  }
}

async function handleFileImport(e: Event) {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return
  for (const file of files) {
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      store.addCustomVoice(file.name, dataUrl)
    } catch (err) {
      console.error('导入语音失败:', file.name, err)
    }
  }
  input.value = ''
}
</script>

<template>
  <div class="fixed inset-0 flex items-center justify-center z-50" @click.self="emit('close')">
    <div class="bg-white/85 rounded-xl w-[400px] shadow-2xl border border-white/30 overflow-hidden animate-slide-up">
      <!-- Header -->
      <div class="flex items-center justify-between" style="padding: 24px 28px 16px 28px;">
        <h2 class="text-lg font-bold text-gray-800">设置</h2>
        <button
          class="w-7 h-7 rounded-full hover:bg-black/5 flex items-center justify-center text-gray-300 hover:text-gray-500 transition"
          @click="emit('close')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-4 h-4">
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
          </svg>
        </button>
      </div>

      <!-- Pill Tabs -->
      <div style="padding: 0 28px 20px 28px;">
        <div class="flex bg-white/30 rounded-xl p-1">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            :class="[
              'flex-1 py-2 text-sm font-medium rounded-lg transition flex items-center justify-center gap-1.5',
              activeTab === tab.id
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-400 hover:text-gray-600',
            ]"
            @click="activeTab = tab.id"
          >
            <span>{{ tab.icon }}</span>
            <span>{{ tab.label }}</span>
          </button>
        </div>
      </div>

      <!-- Content -->
      <div style="padding: 0 28px 24px 28px; display: flex; flex-direction: column; gap: 20px;" class="max-h-[420px] overflow-y-auto">

        <!-- ===== 常规 ===== -->
        <template v-if="activeTab === 'general'">
          <SettingsCard title="提醒间隔">
            <div class="flex items-center justify-between">
              <span class="text-sm text-gray-500">每</span>
              <span class="text-sm font-mono font-semibold text-blue-600">{{ intervalInput }} 分钟</span>
            </div>
            <input
              v-model.number="intervalInput"
              type="range" min="1" max="120" step="1"
              class="slider w-full"
            />
          </SettingsCard>

          <SettingsCard title="稍后提醒">
            <div class="flex gap-2">
              <button
                v-for="m in [5, 10, 15]" :key="m"
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
          </SettingsCard>

          <SettingsCard>
            <ToggleSwitch v-model="autoStartInput" label="开机自启动" />
            <div class="pt-4 border-t border-gray-200/30">
              <ToggleSwitch v-model="systemTrayInput" label="系统托盘常驻" />
            </div>
          </SettingsCard>
        </template>

        <!-- ===== 语音 ===== -->
        <template v-if="activeTab === 'voice'">
          <SettingsCard title="语音来源">
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
          </SettingsCard>

          <button
            class="w-full border-2 border-dashed border-gray-300/40 rounded-xl py-3.5 text-sm text-gray-400 hover:text-blue-500 hover:border-blue-300/60 transition bg-white/20"
            @click="fileInputRef?.click()"
          >
            + 导入语音文件
          </button>
          <input type="file" accept="audio/*" multiple ref="fileInputRef" class="hidden" @change="handleFileImport" />

          <SettingsCard v-if="store.customVoices.length > 0">
            <div class="space-y-1.5">
              <div
                v-for="voice in store.customVoices" :key="voice.id"
                class="flex items-center justify-between p-3 rounded-lg bg-white/40 border border-gray-200/30"
              >
                <div class="flex items-center gap-2.5 min-w-0">
                  <span class="text-sm">🎵</span>
                  <span class="text-sm text-gray-600 truncate">{{ voice.name }}</span>
                </div>
                <button
                  class="shrink-0 w-6 h-6 rounded-full hover:bg-red-50 flex items-center justify-center text-gray-300 hover:text-red-400 transition"
                  @click="store.removeCustomVoice(voice.id)"
                  title="删除"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3.5 h-3.5">
                    <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                  </svg>
                </button>
              </div>
            </div>
          </SettingsCard>

          <div class="rounded-xl p-3 bg-white/20">
            <p class="text-xs text-gray-400">💡 支持 MP3、WAV、OGG、M4A 格式。自定义语音将在提醒时随机播放。</p>
          </div>
        </template>

        <!-- ===== 形象 ===== -->
        <template v-if="activeTab === 'appearance'">
          <SettingsCard title="内置精灵">
            <div class="grid grid-cols-4 gap-2.5">
              <button
                v-for="(cfg, key) in PET_THEMES" :key="key"
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
          </SettingsCard>

          <SettingsCard title="自定义精灵">
            <template #default>
              <div class="flex items-center justify-between">
                <span class="text-xs text-gray-400">创建你的专属精灵</span>
                <button
                  class="text-xs px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 font-medium hover:bg-blue-100 transition"
                  @click="openEditor()"
                >
                  + 新建
                </button>
              </div>
              <div v-if="store.customPets.length === 0" class="text-xs text-gray-400 text-center py-3">
                还没有自定义精灵
              </div>
              <div v-else class="grid grid-cols-4 gap-2.5">
                <button
                  v-for="pet in store.customPets" :key="pet.id"
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
            </template>
          </SettingsCard>

          <SettingsCard title="当前预览">
            <div class="flex flex-col items-center gap-4 py-3">
              <div
                class="w-20 h-20 rounded-full flex items-center justify-center shadow-lg"
                :class="previewStyle.class ?? undefined"
                :style="previewStyle.class ? undefined : previewStyle"
              >
                <span class="text-3xl">{{ previewEmoji.idle }}</span>
              </div>
              <div class="flex justify-center gap-4 text-xs text-gray-400">
                <span>待机 {{ previewEmoji.idle }}</span>
                <span>提醒 {{ previewEmoji.reminding }}</span>
                <span>小憩 {{ previewEmoji.snoozing }}</span>
              </div>
            </div>
          </SettingsCard>
        </template>

        <!-- ===== 历史 ===== -->
        <template v-if="activeTab === 'history'">
          <SettingsCard>
            <div class="text-center space-y-3 py-2">
              <div class="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mx-auto">
                <span class="text-2xl">💧</span>
              </div>
              <div>
                <div class="text-3xl font-bold text-blue-500">{{ store.todayCount }}</div>
                <div class="text-xs text-gray-400 mt-0.5">{{ todayDate }} 喝水记录</div>
              </div>
              <div>
                <div class="flex items-center justify-between text-xs text-gray-400 mb-1.5">
                  <span>进度</span>
                  <span>{{ Math.min(100, Math.round((store.todayCount / 8) * 100)) }}%</span>
                </div>
                <div class="w-full bg-gray-200/50 rounded-full h-2">
                  <div
                    class="bg-blue-500 h-2 rounded-full transition-all duration-500"
                    :style="{ width: `${Math.min(100, (store.todayCount / 8) * 100)}%` }"
                  ></div>
                </div>
                <div class="text-xs text-gray-400 mt-1.5">目标：每日 8 杯</div>
              </div>
              <div class="text-[10px] text-gray-300 pt-1">右键点击精灵打开设置</div>
            </div>
          </SettingsCard>
        </template>
      </div>

      <!-- Footer -->
      <div style="padding: 8px 28px 24px 28px;">
        <button
          class="w-full bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white rounded-xl py-3 text-sm font-semibold shadow-lg shadow-blue-200/50 transition"
          @click="saveSettings"
        >
          保存设置
        </button>
      </div>
    </div>
  </div>

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

/* 自定义滑块 */
.slider {
  -webkit-appearance: none;
  appearance: none;
  height: 6px;
  border-radius: 999px;
  background: rgba(156, 163, 175, 0.3);
  cursor: pointer;
  accent-color: #3b82f6;
}

.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  border: 1px solid rgba(156, 163, 175, 0.2);
  cursor: pointer;
  transition: transform 0.15s ease;
}

.slider::-webkit-slider-thumb:hover {
  transform: scale(1.15);
}

.slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: white;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  border: 1px solid rgba(156, 163, 175, 0.2);
  cursor: pointer;
}
</style>

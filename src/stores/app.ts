import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ReminderSettings, DrinkRecord, CustomVoice, SpriteState, CustomPetConfig } from '../types'
import { resolvePetConfig } from '../types'

const STORAGE_KEY_SETTINGS = 'bushuila_settings'
const STORAGE_KEY_VOICES = 'bushuila_custom_voices'
const STORAGE_KEY_RECORDS = 'bushuila_drink_records'
const STORAGE_KEY_CUSTOM_PETS = 'bushuila_custom_pets'

const DEFAULT_SETTINGS: ReminderSettings = {
  intervalMinutes: 30,
  snoozeMinutes: 5,
  autoStart: false,
  systemTray: true,
  voiceSource: 'builtin',
  petTheme: { pet: 'drop' },
}

function loadFromStorage<T>(key: string): T[] {
  try {
    const data = localStorage.getItem(key)
    return data ? JSON.parse(data) : []
  } catch {
    return []
  }
}

function saveToStorage<T>(key: string, data: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (e) {
    console.error('Failed to persist:', key, e)
  }
}

function loadSettings(): ReminderSettings {
  try {
    const data = localStorage.getItem(STORAGE_KEY_SETTINGS)
    const parsed = data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : { ...DEFAULT_SETTINGS }
    // 校验: 如果 pet 是 'custom' 但缺少 customPetId，回退到默认
    if (parsed.petTheme?.pet === 'custom' && !parsed.petTheme?.customPetId) {
      parsed.petTheme = { pet: DEFAULT_SETTINGS.petTheme.pet }
    }
    return parsed
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

function saveSettingsToStorage(settings: ReminderSettings) {
  try {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings))
  } catch (e) {
    console.error('Failed to persist settings:', e)
  }
}

export const useAppStore = defineStore('app', () => {
  const settings = ref<ReminderSettings>(loadSettings())

  const spriteState = ref<SpriteState>('idle')
  const drinkRecords = ref<DrinkRecord[]>(loadFromStorage<DrinkRecord>(STORAGE_KEY_RECORDS))
  const customVoices = ref<CustomVoice[]>(loadFromStorage<CustomVoice>(STORAGE_KEY_VOICES))
  const customPets = ref<CustomPetConfig[]>(loadFromStorage<CustomPetConfig>(STORAGE_KEY_CUSTOM_PETS))
  const nextReminderTime = ref<number>(Date.now() + settings.value.intervalMinutes * 60 * 1000)

  /** 解析当前选中的精灵（预设或自定义） */
  const currentPetConfig = computed(() =>
    resolvePetConfig(
      settings.value.petTheme.pet,
      settings.value.petTheme.customPetId,
      customPets.value,
    ),
  )

  const todayRecords = computed(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return drinkRecords.value.filter(r => r.timestamp >= today.getTime())
  })

  const todayCount = computed(() => todayRecords.value.length)

  function addDrinkRecord(amount?: number) {
    drinkRecords.value.push({
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      amount,
    })
    saveToStorage(STORAGE_KEY_RECORDS, drinkRecords.value)
  }

  function startReminder() {
    spriteState.value = 'reminding'
    addDrinkRecord()
  }

  function snooze(minutes?: number) {
    const mins = minutes ?? settings.value.snoozeMinutes
    spriteState.value = 'snoozing'
    nextReminderTime.value = Date.now() + mins * 60 * 1000
    setTimeout(() => {
      spriteState.value = 'idle'
    }, 1000)
  }

  function updateSettings(newSettings: Partial<ReminderSettings>) {
    settings.value = { ...settings.value, ...newSettings }
    nextReminderTime.value = Date.now() + settings.value.intervalMinutes * 60 * 1000
    saveSettingsToStorage(settings.value)
  }

  function addCustomVoice(name: string, dataUrl: string) {
    customVoices.value.push({
      id: crypto.randomUUID(),
      name,
      dataUrl,
    })
    saveToStorage(STORAGE_KEY_VOICES, customVoices.value)
  }

  function removeCustomVoice(id: string) {
    customVoices.value = customVoices.value.filter(v => v.id !== id)
    saveToStorage(STORAGE_KEY_VOICES, customVoices.value)
  }

  // --- 自定义精灵 CRUD ---

  function createCustomPet(config: Omit<CustomPetConfig, 'id' | 'createdAt'>): string {
    const id = crypto.randomUUID()
    customPets.value.push({
      ...config,
      id,
      createdAt: Date.now(),
    })
    saveToStorage(STORAGE_KEY_CUSTOM_PETS, customPets.value)
    return id
  }

  function updateCustomPet(id: string, updates: Partial<CustomPetConfig>) {
    const idx = customPets.value.findIndex(p => p.id === id)
    if (idx !== -1) {
      customPets.value[idx] = { ...customPets.value[idx], ...updates }
      saveToStorage(STORAGE_KEY_CUSTOM_PETS, customPets.value)
    }
  }

  function deleteCustomPet(id: string) {
    customPets.value = customPets.value.filter(p => p.id !== id)
    saveToStorage(STORAGE_KEY_CUSTOM_PETS, customPets.value)
    // 如果被删除的是当前选中的精灵，回退到默认
    if (settings.value.petTheme.customPetId === id) {
      settings.value.petTheme = { pet: DEFAULT_SETTINGS.petTheme.pet }
      saveSettingsToStorage(settings.value)
    }
  }

  return {
    settings,
    spriteState,
    drinkRecords,
    customVoices,
    customPets,
    currentPetConfig,
    nextReminderTime,
    todayRecords,
    todayCount,
    addDrinkRecord,
    startReminder,
    snooze,
    updateSettings,
    addCustomVoice,
    removeCustomVoice,
    createCustomPet,
    updateCustomPet,
    deleteCustomPet,
  }
})
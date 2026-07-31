import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ReminderSettings, DrinkRecord, CustomVoice, SpriteState, CustomPetConfig, PetPackage } from '../types'
import { convertPetPackageToResolvedConfig } from '../types'
import { resolvePetConfig } from '../types'
import { saveVoiceFile, deleteVoiceFile, dataUrlToUint8Array, savePetSprite } from '../utils/storage'
import { loadAllBuiltinPets, resolveSpritesheetUrl } from '../utils/petLoader'

const STORAGE_KEY_SETTINGS = 'bushuila_settings'
const STORAGE_KEY_VOICES = 'bushuila_custom_voices'
const STORAGE_KEY_RECORDS = 'bushuila_drink_records'
const STORAGE_KEY_CUSTOM_PETS = 'bushuila_custom_pets'
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000

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
  const drinkRecords = ref<DrinkRecord[]>(
    loadFromStorage<DrinkRecord>(STORAGE_KEY_RECORDS)
      .filter(r => r.timestamp >= Date.now() - RETENTION_MS),
  )
  const customVoices = ref<CustomVoice[]>(loadFromStorage<CustomVoice>(STORAGE_KEY_VOICES))
  const customPets = ref<CustomPetConfig[]>(loadFromStorage<CustomPetConfig>(STORAGE_KEY_CUSTOM_PETS))
  const builtinPets = ref<PetPackage[]>([])
  const importedPets = ref<PetPackage[]>(loadFromStorage<PetPackage>('bushuila_imported_pets'))
  const nextReminderTime = ref<number>(Date.now() + settings.value.intervalMinutes * 60 * 1000)

  const allPets = computed(() => [...builtinPets.value, ...importedPets.value])

  const currentPetConfig = computed(() => {
    const petId = settings.value.petTheme.pet === 'custom'
      ? settings.value.petTheme.customPetId
      : settings.value.petTheme.pet

    if (settings.value.petTheme.pet === 'custom' && settings.value.petTheme.customPetId) {
      const custom = customPets.value.find(p => p.id === settings.value.petTheme.customPetId)
      if (custom) return resolvePetConfig('custom', custom.id, customPets.value)
    }

    const pkg = allPets.value.find(p => p.id === petId)
    if (pkg) return convertPetPackageToResolvedConfig(pkg, resolveSpritesheetUrl(pkg))

    const fallbackPkg = builtinPets.value.find(p => p.id === 'drop')
    if (fallbackPkg) return convertPetPackageToResolvedConfig(fallbackPkg, resolveSpritesheetUrl(fallbackPkg))

    return resolvePetConfig('drop', undefined, [])
  })

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
    const cutoff = Date.now() - RETENTION_MS
    drinkRecords.value = drinkRecords.value.filter(r => r.timestamp >= cutoff)
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
  }

  function updateSettings(newSettings: Partial<ReminderSettings>) {
    settings.value = { ...settings.value, ...newSettings }
    nextReminderTime.value = Date.now() + settings.value.intervalMinutes * 60 * 1000
    saveSettingsToStorage(settings.value)
  }

  async function addCustomVoice(name: string, data: Uint8Array) {
    const id = crypto.randomUUID()
    const filePath = await saveVoiceFile(id, data)
    customVoices.value.push({ id, name, filePath })
    saveToStorage(STORAGE_KEY_VOICES, customVoices.value)
  }

  async function removeCustomVoice(id: string) {
    const voice = customVoices.value.find(v => v.id === id)
    if (voice?.filePath) {
      await deleteVoiceFile(voice.filePath)
    }
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

  async function migrateVoices() {
    const needsMigration = customVoices.value.some(v => v.dataUrl && !v.filePath)
    if (!needsMigration) return
    for (const voice of customVoices.value) {
      if (voice.dataUrl && !voice.filePath) {
        try {
          const bytes = dataUrlToUint8Array(voice.dataUrl)
          voice.filePath = await saveVoiceFile(voice.id, bytes)
          delete voice.dataUrl
        } catch (e) {
          console.error('Voice migration failed:', voice.id, e)
        }
      }
    }
    saveToStorage(STORAGE_KEY_VOICES, customVoices.value)
  }

  async function loadBuiltinPets() {
    if (builtinPets.value.length > 0) return
    builtinPets.value = await loadAllBuiltinPets()
  }

  function setActivePet(petId: string) {
    const pkg = allPets.value.find(p => p.id === petId)
    if (!pkg) return
    settings.value.petTheme = { pet: petId as any }
    saveSettingsToStorage(settings.value)
  }

  async function importPetPackage(pkg: PetPackage, spritesheetData?: Uint8Array) {
    pkg.source = 'imported'
    if (pkg.spritesheetPath && spritesheetData) {
      try {
        pkg.localPath = await savePetSprite(pkg.id, pkg.spritesheetPath, spritesheetData)
      } catch (e) {
        console.error('Failed to save pet spritesheet:', pkg.id, e)
      }
    }
    const existing = importedPets.value.findIndex(p => p.id === pkg.id)
    if (existing >= 0) {
      importedPets.value[existing] = pkg
    } else {
      importedPets.value.push(pkg)
    }
    saveToStorage('bushuila_imported_pets', importedPets.value)
  }

  function removeImportedPet(petId: string) {
    importedPets.value = importedPets.value.filter(p => p.id !== petId)
    saveToStorage('bushuila_imported_pets', importedPets.value)
    if (settings.value.petTheme.pet === petId) {
      settings.value.petTheme = { pet: 'drop' }
      saveSettingsToStorage(settings.value)
    }
  }

  return {
    settings,
    spriteState,
    drinkRecords,
    customVoices,
    customPets,
    builtinPets,
    importedPets,
    allPets,
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
    migrateVoices,
    loadBuiltinPets,
    setActivePet,
    importPetPackage,
    removeImportedPet,
  }
})
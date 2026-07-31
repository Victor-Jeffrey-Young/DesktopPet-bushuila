import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAppStore } from '../app'

vi.mock('@tauri-apps/plugin-fs', () => ({
  writeBinaryFile: vi.fn(),
  readBinaryFile: vi.fn(),
  removeFile: vi.fn(),
  exists: vi.fn().mockResolvedValue(true),
  mkdir: vi.fn(),
}))

vi.mock('@tauri-apps/api/path', () => ({
  appDataDir: vi.fn().mockResolvedValue('/mock/appdata'),
  join: vi.fn().mockImplementation((...args: string[]) => Promise.resolve(args.join('/'))),
}))

beforeEach(() => {
  setActivePinia(createPinia())
  localStorage.clear()
})

describe('useAppStore', () => {
  describe('drink records', () => {
    it('should add drink record and persist', () => {
      const store = useAppStore()
      store.addDrinkRecord(250)

      expect(store.drinkRecords.length).toBe(1)
      expect(store.drinkRecords[0].amount).toBe(250)
      expect(store.todayCount).toBe(1)

      const stored = localStorage.getItem('bushuila_drink_records')
      expect(stored).toBeTruthy()
      expect(JSON.parse(stored!)).toHaveLength(1)
    })

    it('should filter today records correctly', () => {
      const store = useAppStore()
      const now = Date.now()
      const yesterday = now - 24 * 60 * 60 * 1000

      store.drinkRecords = [
        { id: '1', timestamp: now },
        { id: '2', timestamp: yesterday },
      ]

      expect(store.todayCount).toBe(1)
      expect(store.todayRecords).toHaveLength(1)
    })

    it('should clean records older than 7 days on addDrinkRecord', () => {
      const store = useAppStore()
      const now = Date.now()
      const eightDaysAgo = now - 8 * 24 * 60 * 60 * 1000

      store.drinkRecords = [{ id: 'old', timestamp: eightDaysAgo }]
      store.addDrinkRecord(200)

      expect(store.drinkRecords).toHaveLength(1)
      expect(store.drinkRecords[0].id).not.toBe('old')
    })
  })

  describe('settings', () => {
    it('should load default settings', () => {
      const store = useAppStore()

      expect(store.settings.intervalMinutes).toBe(30)
      expect(store.settings.snoozeMinutes).toBe(5)
      expect(store.settings.petTheme.pet).toBe('drop')
    })

    it('should update settings and persist', () => {
      const store = useAppStore()
      store.updateSettings({ intervalMinutes: 60 })

      expect(store.settings.intervalMinutes).toBe(60)
      const stored = JSON.parse(localStorage.getItem('bushuila_settings')!)
      expect(stored.intervalMinutes).toBe(60)
    })

    it('should reset nextReminderTime on updateSettings', () => {
      const store = useAppStore()
      const before = store.nextReminderTime
      store.updateSettings({ intervalMinutes: 10 })

      expect(store.nextReminderTime).not.toBe(before)
    })
  })

  describe('reminder state', () => {
    it('should set spriteState to reminding and add drink record', () => {
      const store = useAppStore()
      store.startReminder()

      expect(store.spriteState).toBe('reminding')
      expect(store.drinkRecords).toHaveLength(1)
    })

    it('should set spriteState to snoozing and update nextReminderTime', () => {
      const store = useAppStore()
      store.snooze(10)

      expect(store.spriteState).toBe('snoozing')
    })
  })

  describe('custom pets', () => {
    it('should create custom pet and return id', () => {
      const store = useAppStore()
      const id = store.createCustomPet({
        name: '我的精灵',
        emoji: { idle: '🐶', reminding: '🐕', snoozing: '🥱' },
        colors: {
          idle: ['#aaa', '#bbb'],
          reminding: ['#ccc', '#ddd'],
          snoozing: ['#eee', '#fff'],
        },
      })

      expect(id).toBeTruthy()
      expect(store.customPets).toHaveLength(1)
      expect(store.customPets[0].name).toBe('我的精灵')
    })

    it('should update custom pet', () => {
      const store = useAppStore()
      const id = store.createCustomPet({
        name: '原始名称',
        emoji: { idle: '🐶', reminding: '🐕', snoozing: '🥱' },
        colors: {
          idle: ['#aaa', '#bbb'],
          reminding: ['#ccc', '#ddd'],
          snoozing: ['#eee', '#fff'],
        },
      })
      store.updateCustomPet(id, { name: '新名称' })

      expect(store.customPets[0].name).toBe('新名称')
    })

    it('should delete custom pet and fallback settings if it was selected', () => {
      const store = useAppStore()
      const id = store.createCustomPet({
        name: '待删除',
        emoji: { idle: '🐶', reminding: '🐕', snoozing: '🥱' },
        colors: {
          idle: ['#aaa', '#bbb'],
          reminding: ['#ccc', '#ddd'],
          snoozing: ['#eee', '#fff'],
        },
      })
      store.updateSettings({ petTheme: { pet: 'custom', customPetId: id } })
      store.deleteCustomPet(id)

      expect(store.customPets).toHaveLength(0)
      expect(store.settings.petTheme.pet).toBe('drop')
    })

    it('should not change settings when deleting non-selected pet', () => {
      const store = useAppStore()
      const id = store.createCustomPet({
        name: '待删除',
        emoji: { idle: '🐶', reminding: '🐕', snoozing: '🥱' },
        colors: {
          idle: ['#aaa', '#bbb'],
          reminding: ['#ccc', '#ddd'],
          snoozing: ['#eee', '#fff'],
        },
      })
      store.updateSettings({ petTheme: { pet: 'cat' } })
      store.deleteCustomPet(id)

      expect(store.settings.petTheme.pet).toBe('cat')
    })
  })

  describe('currentPetConfig', () => {
    it('should resolve to preset pet by default', () => {
      const store = useAppStore()

      expect(store.currentPetConfig.id).toBe('drop')
      expect(store.currentPetConfig.isCustom).toBe(false)
    })

    it('should resolve to custom pet when selected', () => {
      const store = useAppStore()
      const id = store.createCustomPet({
        name: '自定义',
        emoji: { idle: '🐱', reminding: '😾', snoozing: '😴' },
        colors: {
          idle: ['#111', '#222'],
          reminding: ['#333', '#444'],
          snoozing: ['#555', '#666'],
        },
      })
      store.updateSettings({ petTheme: { pet: 'custom', customPetId: id } })

      expect(store.currentPetConfig.isCustom).toBe(true)
      expect(store.currentPetConfig.label).toBe('自定义')
    })
  })
})

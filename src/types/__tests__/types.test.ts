import { describe, it, expect } from 'vitest'
import {
  resolvePetConfig,
  convertCustomPetToResolvedConfig,
  convertPresetToResolvedConfig,
  PET_THEMES,
} from '../index'
import type { CustomPetConfig, PetType } from '../index'

const sampleCustomPet: CustomPetConfig = {
  id: 'test-pet',
  name: '测试精灵',
  emoji: {
    idle: '🐱',
    reminding: '😾',
    snoozing: '😴',
  },
  colors: {
    idle: ['#ff0000', '#00ff00'],
    reminding: ['#0000ff', '#ffff00'],
    snoozing: ['#ff00ff', '#00ffff'],
  },
  createdAt: Date.now(),
}

describe('convertCustomPetToResolvedConfig', () => {
  it('should convert custom pet to resolved config', () => {
    const result = convertCustomPetToResolvedConfig(sampleCustomPet)

    expect(result.id).toBe('test-pet')
    expect(result.label).toBe('测试精灵')
    expect(result.isCustom).toBe(true)
    expect(result.isCodex).toBe(false)
    expect(result.emoji.idle).toBe('🐱')
    expect(result.emoji.reminding).toBe('😾')
    expect(result.emoji.snoozing).toBe('😴')
    expect(result.gradients.idle.style).toBe('linear-gradient(135deg, #ff0000, #00ff00)')
    expect(result.gradients.idle.class).toBeNull()
  })
})

describe('convertPresetToResolvedConfig', () => {
  it('should convert preset theme to resolved config', () => {
    const result = convertPresetToResolvedConfig(PET_THEMES.drop, 'drop')

    expect(result.id).toBe('drop')
    expect(result.label).toBe('小水滴')
    expect(result.isCustom).toBe(false)
    expect(result.isCodex).toBe(false)
    expect(result.emoji.idle).toBe('💧')
    expect(result.gradients.idle.class).toBe('from-blue-200 to-blue-300')
    expect(result.gradients.idle.style).toBeNull()
  })

  it('should mark yuexinmiao1 as codex with spritesheetUrl', () => {
    const result = convertPresetToResolvedConfig(PET_THEMES.yuexinmiao1, 'yuexinmiao1')

    expect(result.isCodex).toBe(true)
    expect(result.spritesheetUrl).toBe('/pets/yuexinmiao1/spritesheet.webp')
  })

  it('should not mark non-codex pets as codex', () => {
    const result = convertPresetToResolvedConfig(PET_THEMES.cat, 'cat')

    expect(result.isCodex).toBe(false)
    expect(result.spritesheetUrl).toBeUndefined()
  })
})

describe('resolvePetConfig', () => {
  it('should resolve preset pet by type', () => {
    const result = resolvePetConfig('cat', undefined, [])

    expect(result.id).toBe('cat')
    expect(result.label).toBe('小猫咪')
    expect(result.isCustom).toBe(false)
  })

  it('should resolve custom pet when customPetId matches', () => {
    const result = resolvePetConfig('custom', 'test-pet', [sampleCustomPet])

    expect(result.id).toBe('test-pet')
    expect(result.isCustom).toBe(true)
    expect(result.label).toBe('测试精灵')
  })

  it('should fallback to default when custom pet not found', () => {
    const result = resolvePetConfig('custom', 'nonexistent', [])

    expect(result.id).toBe('drop')
    expect(result.isCustom).toBe(false)
  })

  it('should fallback to custom fallback type when provided', () => {
    const result = resolvePetConfig('custom', 'nonexistent', [], 'cat')

    expect(result.id).toBe('cat')
    expect(result.isCustom).toBe(false)
  })

  it('should fallback to drop when custom without customPetId', () => {
    const result = resolvePetConfig('custom', undefined, [])

    expect(result.id).toBe('drop')
  })
})

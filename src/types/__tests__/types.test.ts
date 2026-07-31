import { describe, it, expect } from 'vitest'
import {
  resolvePetConfig,
  convertCustomPetToResolvedConfig,
  convertPresetToResolvedConfig,
  convertPetPackageToResolvedConfig,
  PET_THEMES,
} from '../index'
import type { CustomPetConfig, PetType, PetPackage } from '../index'

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

describe('convertPetPackageToResolvedConfig', () => {
  const emojiPackage: PetPackage = {
    id: 'drop',
    displayName: '小水滴',
    description: '可爱的小水滴',
    version: '1.0',
    fallbackEmoji: '💧',
    stateMap: {
      idle: { row: 0, frames: 1 },
      reminding: { row: 0, frames: 1 },
      snoozing: { row: 0, frames: 1 },
    },
  }

  const spritesheetPackage: PetPackage = {
    id: 'yuexinmiao1',
    displayName: '月薪喵',
    description: 'A cartoon kitten',
    version: '1.0',
    spritesheetPath: 'spritesheet.webp',
    fallbackEmoji: '🐱',
    frameWidth: 192,
    frameHeight: 234,
    stateMap: {
      idle: { row: 0, frames: 6, fps: 6, loop: true },
      reminding: { row: 1, frames: 8, fps: 10, loop: true },
      snoozing: { row: 3, frames: 5, fps: 4, loop: true },
    },
  }

  it('should convert emoji package to resolved config', () => {
    const result = convertPetPackageToResolvedConfig(emojiPackage)

    expect(result.id).toBe('drop')
    expect(result.label).toBe('小水滴')
    expect(result.isCustom).toBe(false)
    expect(result.isCodex).toBe(false)
    expect(result.spritesheetUrl).toBeUndefined()
    expect(result.emoji.idle).toBe('💧')
    expect(result.packageStateMap).toBeDefined()
    expect(result.packageFrameWidth).toBeUndefined()
  })

  it('should convert spritesheet package to resolved config', () => {
    const result = convertPetPackageToResolvedConfig(spritesheetPackage, '/pets/builtin/yuexinmiao1/spritesheet.webp')

    expect(result.id).toBe('yuexinmiao1')
    expect(result.label).toBe('月薪喵')
    expect(result.isCodex).toBe(true)
    expect(result.spritesheetUrl).toBe('/pets/builtin/yuexinmiao1/spritesheet.webp')
    expect(result.emoji.idle).toBe('🐱')
    expect(result.packageStateMap).toBeDefined()
    expect(result.packageFrameWidth).toBe(192)
    expect(result.packageFrameHeight).toBe(234)
    expect(result.packageStateMap?.idle.fps).toBe(6)
    expect(result.packageStateMap?.reminding.frames).toBe(8)
  })

  it('should use provided spritesheetUrl', () => {
    const result = convertPetPackageToResolvedConfig(spritesheetPackage, 'asset://localhost/path/sprite.webp')

    expect(result.spritesheetUrl).toBe('asset://localhost/path/sprite.webp')
  })

  it('should not set spritesheetUrl when not provided', () => {
    const result = convertPetPackageToResolvedConfig(emojiPackage)

    expect(result.spritesheetUrl).toBeUndefined()
    expect(result.isCodex).toBe(false)
  })
})

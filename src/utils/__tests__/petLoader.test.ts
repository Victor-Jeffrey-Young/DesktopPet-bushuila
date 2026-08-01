import { describe, it, expect } from 'vitest'
import { validatePetPackage } from '../petLoader'

describe('validatePetPackage', () => {
  it('should validate a minimal valid pet package', () => {
    const data = {
      id: 'test-pet',
      displayName: 'Test Pet',
      fallbackEmoji: '🐱',
      stateMap: {
        idle: { row: 0, frames: 1 },
        reminding: { row: 1, frames: 1 },
        snoozing: { row: 2, frames: 1 },
      },
    }

    const result = validatePetPackage(data)

    expect(result.id).toBe('test-pet')
    expect(result.displayName).toBe('Test Pet')
    expect(result.fallbackEmoji).toBe('🐱')
    expect(result.version).toBe('1.0')
    expect(result.stateMap.idle.row).toBe(0)
    expect(result.stateMap.idle.fps).toBe(8)
    expect(result.stateMap.idle.loop).toBe(true)
  })

  it('should validate a full spritesheet pet package', () => {
    const data = {
      id: 'yuexinmiao1',
      displayName: '月薪喵',
      description: 'A cartoon kitten',
      author: 'Codex Pets',
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

    const result = validatePetPackage(data)

    expect(result.spritesheetPath).toBe('spritesheet.webp')
    expect(result.frameWidth).toBe(192)
    expect(result.frameHeight).toBe(234)
    expect(result.stateMap.idle.fps).toBe(6)
    expect(result.stateMap.reminding.frames).toBe(8)
  })

  it('should accept Codex Pets format without fallbackEmoji/stateMap and fill defaults', () => {
    const data = {
      id: 'ikkun',
      displayName: 'ikkun',
      description: '灰色刘海、圆眼红腮的团雀风数字宠物',
      spritesheetPath: 'spritesheet.webp',
      kind: 'object',
    }

    const result = validatePetPackage(data)

    expect(result.id).toBe('ikkun')
    expect(result.displayName).toBe('ikkun')
    expect(result.spritesheetPath).toBe('spritesheet.webp')
    expect(result.fallbackEmoji).toBe('🐾')
    expect(result.frameWidth).toBe(192)
    expect(result.frameHeight).toBe(208)
    expect(result.stateMap.idle.row).toBe(0)
    expect(result.stateMap.idle.frames).toBe(6)
    expect(result.stateMap.reminding.row).toBe(3)
    expect(result.stateMap.snoozing.row).toBe(6)
  })

  it('should fill default for partially missing stateMap', () => {
    const data = {
      id: 'test',
      displayName: 'Test',
      stateMap: {
        idle: { row: 0, frames: 2 },
      },
    }

    const result = validatePetPackage(data)

    expect(result.stateMap.idle.frames).toBe(2)
    expect(result.stateMap.reminding.row).toBe(3)
    expect(result.stateMap.snoozing.row).toBe(6)
  })

  it('should fallback invalid animation config to default', () => {
    const data = {
      id: 'test',
      displayName: 'Test',
      stateMap: {
        idle: { row: 0 },
        reminding: { row: 1, frames: 1 },
        snoozing: { row: 2, frames: 1 },
      },
    }

    const result = validatePetPackage(data)

    expect(result.stateMap.idle.row).toBe(0)
    expect(result.stateMap.idle.frames).toBe(6)
    expect(result.stateMap.reminding.frames).toBe(1)
  })

  it('should throw on missing id', () => {
    expect(() => validatePetPackage({ displayName: 'Test' })).toThrow('missing id')
  })

  it('should throw on missing displayName', () => {
    expect(() => validatePetPackage({ id: 'test' })).toThrow('missing displayName')
  })

  it('should parse explicit actions', () => {
    const data = {
      id: 'test',
      displayName: 'Test',
      spritesheetPath: 'spritesheet.webp',
      actions: {
        running: { row: 2, frames: 8, fps: 8 },
        waving: { row: 4, frames: 6 },
        bad: { frames: 3 },
      },
    }

    const result = validatePetPackage(data)

    expect(result.actions?.running).toEqual({ row: 2, frames: 8, fps: 8, loop: false, sourceY: undefined, sourceH: undefined })
    expect(result.actions?.waving).toMatchObject({ row: 4, frames: 6, loop: false })
    expect(result.actions?.bad).toBeUndefined()
  })

  it('should throw on non-object input', () => {
    expect(() => validatePetPackage(null)).toThrow('not an object')
    expect(() => validatePetPackage('string')).toThrow('not an object')
    expect(() => validatePetPackage(42)).toThrow('not an object')
  })
})

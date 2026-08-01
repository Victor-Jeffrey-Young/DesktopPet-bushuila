import { describe, it, expect } from 'vitest'
import { clampWanderBounds, clampButtonPos, LAYOUT } from '../layout'

describe('layout constants', () => {
  it('exposes all layout constants', () => {
    expect(LAYOUT.petVerticalPct).toBe(40)
    expect(LAYOUT.petHalf).toBe(56)
    expect(LAYOUT.buttonW).toBe(28)
    expect(LAYOUT.buttonGroupH).toBe(64)
  })
})

describe('clampWanderBounds', () => {
  it('pet window 160×200', () => {
    const b = clampWanderBounds(160, 200)
    // maxX = 80 - 56 - 8 = 16
    expect(b.maxX).toBe(16)
    // maxUp = 80 - 56 - 8 = 16
    expect(b.maxUp).toBeCloseTo(16, 5)
    // maxDown = 200 - 80 - 56 - 36 - 8 = 20
    expect(b.maxDown).toBeCloseTo(20, 5)
  })

  it('settings window 420×560', () => {
    const b = clampWanderBounds(420, 560)
    expect(b.maxX).toBe(146)
    expect(b.maxUp).toBeCloseTo(160, 5)
    // maxDown = 560 - 224 - 56 - 36 - 8 = 236
    expect(b.maxDown).toBeCloseTo(236, 5)
  })

  it('never returns negative bounds', () => {
    const b = clampWanderBounds(100, 100)
    expect(b.maxX).toBeGreaterThan(0)
    expect(b.maxUp).toBeGreaterThanOrEqual(0)
    expect(b.maxDown).toBeGreaterThan(0)
  })
})

describe('clampButtonPos', () => {
  it('pet centered (200×280): button on the right of pet', () => {
    const pos = clampButtonPos(100, 89.6, 200, 280)
    // left = 100 + 56 + 8 = 164, fits (164+28=192 <= 196)
    expect(pos.left).toBe(164)
    // top = 89.6 - 32 = 57.6
    expect(pos.top).toBeCloseTo(57.6, 5)
  })

  it('pet far right: button flips to the left side', () => {
    const pos = clampButtonPos(160, 89.6, 200, 280)
    // right side: 160+56+8=224, 224+28 > 196 → flip: 160-56-8-28 = 68
    expect(pos.left).toBe(68)
  })

  it('pet at left edge: button stays on the right, clamped inside window', () => {
    const pos = clampButtonPos(40, 89.6, 200, 280)
    // right side: 40+56+8 = 104, fits
    expect(pos.left).toBe(104)
  })

  it('pet near top: top clamped inside window (edge = 8)', () => {
    const pos = clampButtonPos(100, 10, 200, 280)
    expect(pos.top).toBe(8)
  })

  it('pet near bottom: top clamped inside window', () => {
    const pos = clampButtonPos(100, 260, 200, 280)
    expect(pos.top).toBe(208)
  })
})

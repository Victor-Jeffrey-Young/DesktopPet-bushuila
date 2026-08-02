import { describe, it, expect } from 'vitest'
import { clampWanderBounds, clampButtonPos, LAYOUT, WINDOW_LOGICAL_SIZE, scaledLayout } from '../layout'

describe('layout constants', () => {
  it('exposes all layout constants', () => {
    expect(LAYOUT.petVerticalPct).toBe(40)
    expect(LAYOUT.petHalf).toBe(56)
    expect(LAYOUT.buttonW).toBe(28)
    expect(LAYOUT.buttonGroupH).toBe(64)
  })

  it('exposes window logical size', () => {
    expect(WINDOW_LOGICAL_SIZE).toEqual({ width: 160, height: 200 })
  })
})

describe('scaledLayout', () => {
  it('scale 1 keeps base values', () => {
    const l = scaledLayout(1)
    expect(l.petHalf).toBe(LAYOUT.petHalf)
    expect(l.buttonW).toBe(LAYOUT.buttonW)
  })

  it('scale 1.5 scales all sizes proportionally', () => {
    const l = scaledLayout(1.5)
    expect(l.petHalf).toBeCloseTo(84, 5)
    expect(l.buttonW).toBeCloseTo(42, 5)
    expect(l.buttonGroupH).toBeCloseTo(96, 5)
    expect(l.countdownH).toBeCloseTo(54, 5)
    // 百分比/边距等非尺寸项不变
    expect(l.petVerticalPct).toBe(40)
    expect(l.edge).toBe(8)
  })

  it('scaled layout drives wander bounds (window scales with pet)', () => {
    const b = clampWanderBounds(160 * 1.5, 200 * 1.5, scaledLayout(1.5))
    // maxX = 120 - 84 - 8 = 28
    expect(b.maxX).toBe(28)
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

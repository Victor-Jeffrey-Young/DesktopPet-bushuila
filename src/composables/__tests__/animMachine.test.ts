import { describe, it, expect } from 'vitest'
import { canTransition, defaultAnimForState, ANIM_MACHINE_STATES } from '../animMachine'
import type { AnimMachineState } from '../animMachine'

describe('animMachine state machine', () => {
  it('should expose all states', () => {
    expect(ANIM_MACHINE_STATES).toEqual([
      'loading', 'idle', 'reminding', 'snoozing', 'moving', 'action',
    ])
  })

  it('loading → idle (image loaded)', () => {
    expect(canTransition('loading', 'idle')).toBe(true)
  })

  it('idle → moving (wander start)', () => {
    expect(canTransition('idle', 'moving')).toBe(true)
  })

  it('moving → idle (wander end)', () => {
    expect(canTransition('moving', 'idle')).toBe(true)
  })

  it('idle → action (click / random action)', () => {
    expect(canTransition('idle', 'action')).toBe(true)
  })

  it('action → idle (animation finished)', () => {
    expect(canTransition('action', 'idle')).toBe(true)
  })

  it('moving → action is allowed (click interrupts walking)', () => {
    expect(canTransition('moving', 'action')).toBe(true)
  })

  it('action → moving is rejected', () => {
    expect(canTransition('action', 'moving')).toBe(false)
  })

  it('any → reminding with business priority', () => {
    for (const from of ANIM_MACHINE_STATES) {
      expect(canTransition(from, 'reminding', 'business')).toBe(true)
    }
  })

  it('any → snoozing with business priority', () => {
    for (const from of ANIM_MACHINE_STATES) {
      expect(canTransition(from, 'snoozing', 'business')).toBe(true)
    }
  })

  it('reminding → idle with business priority (dismiss)', () => {
    expect(canTransition('reminding', 'idle', 'business')).toBe(true)
  })

  it('idle → reminding without business priority is rejected', () => {
    expect(canTransition('idle', 'reminding')).toBe(false)
  })

  it('any → loading (pet switch)', () => {
    for (const from of ANIM_MACHINE_STATES) {
      expect(canTransition(from, 'loading')).toBe(true)
    }
  })

  it('loading → action is rejected', () => {
    expect(canTransition('loading', 'action')).toBe(false)
  })

  it('same-state transition is allowed', () => {
    for (const s of ANIM_MACHINE_STATES) {
      expect(canTransition(s, s)).toBe(true)
    }
  })

  it('defaultAnimForState maps states to animation keys', () => {
    expect(defaultAnimForState('idle')).toBe('idle')
    expect(defaultAnimForState('reminding')).toBe('reminding')
    expect(defaultAnimForState('snoozing')).toBe('snoozing')
    expect(defaultAnimForState('loading')).toBe('')
  })
})

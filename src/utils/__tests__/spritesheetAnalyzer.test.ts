import { describe, it, expect } from 'vitest'
import {
  computeFramesFromCounts,
  computeIsAnimation,
  isStandardCodexGrid,
  buildActionMap,
} from '../spritesheetAnalyzer'
import type { RowAnalysis } from '../spritesheetAnalyzer'
import ikkunFixture from './fixtures/ikkun-rows.json'
import yuexinFixture from './fixtures/yuexinmiao1-rows.json'

interface RowFixture { row: number; counts: number[]; diffs: number[]; frames: number }

function toAnalyses(rows: RowFixture[]): RowAnalysis[] {
  const out: RowAnalysis[] = []
  for (const r of rows) {
    out[r.row] = {
      row: r.row,
      counts: r.counts,
      diffs: r.diffs,
      frames: r.frames,
      isAnimation: computeIsAnimation(r.diffs),
    }
  }
  return out
}

describe('spritesheetAnalyzer (fixture: ikkun 标准网格)', () => {
  const rows = ikkunFixture.rows as RowFixture[]
  const analyses = toAnalyses(rows)

  it('frame counts match expected per-row values', () => {
    const expected = [6, 8, 8, 4, 5, 8, 6, 6, 6]
    rows.forEach((r, i) => {
      expect(computeFramesFromCounts(r.counts)).toBe(expected[i])
    })
  })

  it('rows 0 and 6 are static (idle micro-motion / direction row), others are animations', () => {
    rows.forEach((r) => {
      const isAnim = computeIsAnimation(r.diffs)
      if (r.row === 0 || r.row === 6) {
        expect(isAnim).toBe(false)
      } else {
        expect(isAnim).toBe(true)
      }
    })
  })

  it('detects standard grid', () => {
    expect(isStandardCodexGrid(192, 208, 9)).toBe(true)
    expect(isStandardCodexGrid(192, 208, 11)).toBe(true)
    expect(isStandardCodexGrid(192, 234, 8)).toBe(false)
    expect(isStandardCodexGrid(64, 64, 8)).toBe(false)
  })

  it('builds action map with standard names (usedRows: idle/reminding/snoozing rows 0/1/2)', () => {
    const used = new Set([0, 1, 2])
    const { names, extras } = buildActionMap(9, used, analyses, true)
    // waiting(row3) review(row4) extra1(row5) extra3(row7) extra4(row8)；row6 静态被排除
    expect(names).toEqual(['waiting', 'review', 'extra1', 'extra3', 'extra4'])
    expect(extras.waiting).toEqual({ row: 3, frames: 4 })
    expect(extras.review).toEqual({ row: 4, frames: 5 })
    expect(extras.extra1).toEqual({ row: 5, frames: 8 })
    expect(extras.extra3).toEqual({ row: 7, frames: 6 })
    expect(extras.extra4).toEqual({ row: 8, frames: 6 })
    expect(extras.extra2).toBeUndefined()
  })
})

describe('spritesheetAnalyzer (fixture: 月薪喵 Codex 标准网格 192×208)', () => {
  const rows = yuexinFixture.rows as RowFixture[]
  const analyses = toAnalyses(rows)

  it('frame counts match expected per-row values', () => {
    const expected = [6, 8, 8, 4, 5, 8, 6, 6, 6]
    rows.forEach((r, i) => {
      expect(computeFramesFromCounts(r.counts)).toBe(expected[i])
    })
  })

  it('rows 6/7/8 are static (direction rows)', () => {
    for (const r of [6, 7, 8]) {
      expect(computeIsAnimation(rows[r].diffs)).toBe(false)
    }
    for (const r of [0, 1, 2, 3, 4, 5]) {
      expect(computeIsAnimation(rows[r].diffs)).toBe(true)
    }
  })

  it('builds standard actions and skips static rows when state rows are used', () => {
    const used = new Set([0, 1, 3])
    const { names, extras } = buildActionMap(9, used, analyses, true)
    expect(names).toEqual(['running', 'review', 'extra1'])
    expect(extras.running).toEqual({ row: 2, frames: 8 })
    expect(extras.review).toEqual({ row: 4, frames: 5 })
    expect(extras.extra1).toEqual({ row: 5, frames: 8 })
    expect(extras.extra2).toBeUndefined()
  })

})

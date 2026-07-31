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

describe('spritesheetAnalyzer (fixture: 月薪喵 非标准网格 192×234)', () => {
  const rows = yuexinFixture.rows as RowFixture[]
  const analyses = toAnalyses(rows)

  it('frame counts match expected per-row values', () => {
    const expected = [6, 8, 8, 5, 8, 6, 6, 6]
    rows.forEach((r, i) => {
      expect(computeFramesFromCounts(r.counts)).toBe(expected[i])
    })
  })

  it('rows 5/6/7 are static (direction rows)', () => {
    for (const r of [5, 6, 7]) {
      expect(computeIsAnimation(rows[r].diffs)).toBe(false)
    }
    for (const r of [2, 4]) {
      expect(computeIsAnimation(rows[r].diffs)).toBe(true)
    }
  })

  it('builds action map with generic names (state rows 0/1/3 + explicit actions rows 2/4)', () => {
    const used = new Set([0, 1, 3, 2, 4])
    const { names, extras } = buildActionMap(8, used, analyses, false)
    expect(names).toEqual([])
    expect(Object.keys(extras)).toEqual([])
  })

  it('builds action map with generic names when only state rows used', () => {
    const used = new Set([0, 1, 3])
    const { names, extras } = buildActionMap(8, used, analyses, false)
    // row2/row4 是动画（通用名），row5/6/7 静态排除
    expect(names).toEqual(['action1', 'action2'])
    expect(extras.action1).toEqual({ row: 2, frames: 8 })
    expect(extras.action2).toEqual({ row: 4, frames: 8 })
  })
})

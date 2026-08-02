import { describe, it, expect, beforeEach } from 'vitest'
import {
  getCachedAnalysis,
  setCachedAnalysis,
  clearAnalysisCache,
  ANALYSIS_CACHE_MAX,
} from '../analysisCache'
import type { RowAnalysis } from '../spritesheetAnalyzer'

const sample: RowAnalysis[] = [
  { row: 0, counts: [120, 118], diffs: [0.3], frames: 2, isAnimation: true },
]

describe('analysisCache', () => {
  beforeEach(() => {
    clearAnalysisCache()
  })

  it('returns null on miss', () => {
    expect(getCachedAnalysis('/a.webp', 192, 208)).toBeNull()
  })

  it('returns cached analysis on hit', () => {
    setCachedAnalysis('/a.webp', 192, 208, sample)
    expect(getCachedAnalysis('/a.webp', 192, 208)).toEqual(sample)
  })

  it('cache key includes url', () => {
    setCachedAnalysis('/a.webp', 192, 208, sample)
    expect(getCachedAnalysis('/b.webp', 192, 208)).toBeNull()
  })

  it('cache key includes frame dimensions', () => {
    setCachedAnalysis('/a.webp', 192, 208, sample)
    expect(getCachedAnalysis('/a.webp', 192, 234)).toBeNull()
    expect(getCachedAnalysis('/a.webp', 64, 208)).toBeNull()
  })

  it('evicts oldest entry beyond capacity', () => {
    for (let i = 0; i < ANALYSIS_CACHE_MAX + 5; i++) {
      setCachedAnalysis(`/pet-${i}.webp`, 192, 208, sample)
    }
    // 最先插入的 5 条被淘汰
    expect(getCachedAnalysis('/pet-0.webp', 192, 208)).toBeNull()
    expect(getCachedAnalysis('/pet-4.webp', 192, 208)).toBeNull()
    // 边界与最新条目仍保留
    expect(getCachedAnalysis(`/pet-${ANALYSIS_CACHE_MAX - 1}.webp`, 192, 208)).toEqual(sample)
    expect(getCachedAnalysis(`/pet-${ANALYSIS_CACHE_MAX + 4}.webp`, 192, 208)).toEqual(sample)
  })

  it('clearAnalysisCache empties cache', () => {
    setCachedAnalysis('/a.webp', 192, 208, sample)
    clearAnalysisCache()
    expect(getCachedAnalysis('/a.webp', 192, 208)).toBeNull()
  })
})

/** spritesheet 行分析结果缓存（避免切换宠物时重复执行同步像素分析） */
import type { RowAnalysis } from './spritesheetAnalyzer'

export const ANALYSIS_CACHE_MAX = 20

const cache = new Map<string, RowAnalysis[]>()

function cacheKey(url: string, frameWidth: number, frameHeight: number): string {
  return `${url}|${frameWidth}|${frameHeight}`
}

/** 命中返回缓存的行分析结果，未命中返回 null */
export function getCachedAnalysis(url: string, frameWidth: number, frameHeight: number): RowAnalysis[] | null {
  return cache.get(cacheKey(url, frameWidth, frameHeight)) ?? null
}

/** 写入缓存，超过容量时淘汰最旧条目（FIFO） */
export function setCachedAnalysis(url: string, frameWidth: number, frameHeight: number, analyses: RowAnalysis[]) {
  if (cache.size >= ANALYSIS_CACHE_MAX) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(cacheKey(url, frameWidth, frameHeight), analyses)
}

export function clearAnalysisCache() {
  cache.clear()
}

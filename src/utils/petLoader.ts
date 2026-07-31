import { convertFileSrc } from '@tauri-apps/api/core'
import type { PetPackage } from '../types'

const BUILTIN_PETS_BASE = '/pets/builtin'
const BUILTIN_PET_IDS = ['drop', 'cat', 'dog', 'fox', 'star', 'cherry', 'clover', 'yuexinmiao1']

/** 解析宠物包 spritesheet 的加载 URL（内置走静态资源，导入走 asset 协议） */
export function resolveSpritesheetUrl(pkg: PetPackage): string | undefined {
  if (!pkg.spritesheetPath) return undefined
  if (pkg.source === 'imported' && pkg.localPath) {
    return convertFileSrc(pkg.localPath)
  }
  return `${BUILTIN_PETS_BASE}/${pkg.id}/${pkg.spritesheetPath}`
}

export async function loadPetPackage(baseUrl: string): Promise<PetPackage> {
  const resp = await fetch(`${baseUrl}/pet.json`)
  if (!resp.ok) {
    throw new Error(`Failed to load pet.json from ${baseUrl}`)
  }
  const data = await resp.json()
  return validatePetPackage(data)
}

export async function loadAllBuiltinPets(): Promise<PetPackage[]> {
  const pets: PetPackage[] = []

  for (const id of BUILTIN_PET_IDS) {
    try {
      const pkg = await loadPetPackage(`${BUILTIN_PETS_BASE}/${id}`)
      pkg.source = 'builtin'
      pets.push(pkg)
    } catch (e) {
      console.error(`Failed to load builtin pet: ${id}`, e)
    }
  }

  return pets
}

/** Codex 标准网格默认值（1536×1872，8列，单元格 192×208） */
const DEFAULT_FRAME_WIDTH = 192
const DEFAULT_FRAME_HEIGHT = 208
/** 缺少 stateMap 时的默认行映射（row 0/1/2） */
const DEFAULT_STATE_MAP: PetPackage['stateMap'] = {
  idle: { row: 0, frames: 6, fps: 8, loop: true },
  reminding: { row: 1, frames: 8, fps: 8, loop: true },
  snoozing: { row: 2, frames: 5, fps: 4, loop: true },
}

export function validatePetPackage(data: unknown): PetPackage {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid pet package: not an object')
  }

  const raw = data as Record<string, unknown>

  if (typeof raw.id !== 'string' || !raw.id) {
    throw new Error('Invalid pet package: missing id')
  }
  if (typeof raw.displayName !== 'string' || !raw.displayName) {
    throw new Error('Invalid pet package: missing displayName')
  }

  const stateMap = normalizeStateMap(raw.stateMap)

  return {
    id: raw.id,
    displayName: raw.displayName,
    description: typeof raw.description === 'string' ? raw.description : '',
    author: typeof raw.author === 'string' ? raw.author : undefined,
    version: typeof raw.version === 'string' ? raw.version : '1.0',
    spritesheetPath: typeof raw.spritesheetPath === 'string' ? raw.spritesheetPath : undefined,
    fallbackEmoji: typeof raw.fallbackEmoji === 'string' && raw.fallbackEmoji ? raw.fallbackEmoji : '🐾',
    frameWidth: typeof raw.frameWidth === 'number' ? raw.frameWidth : DEFAULT_FRAME_WIDTH,
    frameHeight: typeof raw.frameHeight === 'number' ? raw.frameHeight : DEFAULT_FRAME_HEIGHT,
    stateMap,
    microActions: Array.isArray(raw.microActions) ? raw.microActions : undefined,
  }
}

/** 规范化 stateMap：缺少时使用 Codex 标准默认，部分缺失时逐个回退 */
function normalizeStateMap(stateMapRaw: unknown): PetPackage['stateMap'] {
  if (!stateMapRaw || typeof stateMapRaw !== 'object') {
    return DEFAULT_STATE_MAP
  }
  const map = stateMapRaw as Record<string, unknown>
  return {
    idle: normalizeAnimationConfig(map.idle, DEFAULT_STATE_MAP.idle),
    reminding: normalizeAnimationConfig(map.reminding, DEFAULT_STATE_MAP.reminding),
    snoozing: normalizeAnimationConfig(map.snoozing, DEFAULT_STATE_MAP.snoozing),
  }
}

function normalizeAnimationConfig(raw: unknown, fallback: PetPackage['stateMap']['idle']): PetPackage['stateMap']['idle'] {
  if (!raw || typeof raw !== 'object') return fallback
  const cfg = raw as Record<string, unknown>
  if (typeof cfg.row !== 'number' || typeof cfg.frames !== 'number') return fallback
  return {
    row: cfg.row,
    frames: cfg.frames,
    fps: typeof cfg.fps === 'number' ? cfg.fps : fallback.fps,
    loop: typeof cfg.loop === 'boolean' ? cfg.loop : fallback.loop,
    sourceY: typeof cfg.sourceY === 'number' ? cfg.sourceY : undefined,
    sourceH: typeof cfg.sourceH === 'number' ? cfg.sourceH : undefined,
  }
}

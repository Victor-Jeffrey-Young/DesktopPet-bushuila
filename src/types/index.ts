export type PetType = 'drop' | 'cat' | 'dog' | 'fox' | 'star' | 'cherry' | 'clover' | 'yuexinmiao1'

export interface PetTheme {
  pet: PetType | 'custom'
  customPetId?: string
}

export interface ReminderSettings {
  intervalMinutes: number
  snoozeMinutes: number
  autoStart: boolean
  systemTray: boolean
  voiceSource: 'builtin' | 'ai' | 'custom'
  theme: 'system' | 'light' | 'dark'
  petTheme: PetTheme
  debugPanel: boolean
  /** 宠物/UI 缩放倍率（0.6–2.0），跨 DPI 与屏幕大小自适应 */
  petScale: number
}

export interface DrinkRecord {
  id: string
  timestamp: number
  amount?: number
}

export interface CustomVoice {
  id: string
  name: string
  filePath: string
  /** @deprecated old field, kept for migration only */
  dataUrl?: string
}

export type SpriteState = 'idle' | 'reminding' | 'snoozing'

// --- 宠物包规范 v1.0 ---

export interface AnimationConfig {
  row: number
  frames: number
  fps?: number
  loop?: boolean
  sourceY?: number
  sourceH?: number
}

export interface PetPackage {
  id: string
  displayName: string
  description: string
  author?: string
  version: string
  spritesheetPath?: string
  fallbackEmoji: string
  frameWidth?: number
  frameHeight?: number
  stateMap: {
    idle: AnimationConfig
    reminding: AnimationConfig
    snoozing: AnimationConfig
  }
  /** 可选：显式命名的动作行（如 running/waving），未定义时自动检测并按网格推断 */
  actions?: Record<string, AnimationConfig>
  microActions?: string[]
  /** 宠物包来源：builtin | imported */
  source?: 'builtin' | 'imported'
  /** 导入宠物的本地存储路径 */
  localPath?: string
}

// --- 自定义精灵系统 ---

/** 待机时的微动作 */
export type MicroAction =
  | 'idle'
  | 'look'
  | 'blink'
  | 'happy'
  | 'thinking'
  | 'working'
  | 'dancing'
  | 'sleeping'
  | 'stretching'

/** 用户创建的自定义精灵定义 */
export interface CustomPetConfig {
  id: string
  name: string
  emoji: {
    idle: string
    reminding: string
    snoozing: string
    thinking?: string
    happy?: string
    sleeping?: string
    dancing?: string
  }
  colors: {
    idle: [string, string]
    reminding: [string, string]
    snoozing: [string, string]
  }
  createdAt: number
}

/** 解析后的统一配置（预设、自定义、宠物包 共用） */
export interface ResolvedPetConfig {
  id: string
  label: string
  isCustom: boolean
  isCodex: boolean
  spritesheetUrl?: string
  emoji: {
    idle: string
    reminding: string
    snoozing: string
  }
  gradients: {
    idle: { class: string | null; style: string | null }
    reminding: { class: string | null; style: string | null }
    snoozing: { class: string | null; style: string | null }
  }
  /** 来自宠物包的精灵表动画配置 */
  packageStateMap?: PetPackage['stateMap']
  packageFrameWidth?: number
  packageFrameHeight?: number
  /** 来自宠物包显式命名的动作（如 running/waving） */
  packageActions?: PetPackage['actions']
}

export interface PetThemeConfig {
  label: string
  emoji: { idle: string; reminding: string; snoozing: string }
  colors: {
    idle: string
    reminding: string
    snoozing: string
  }
  codex?: {
    spritesheetUrl: string
  }
}

/** codex 宠物的精灵表配置 */
export interface CodexSpriteConfig {
  /** spritesheet URL（相对于 public/） */
  spritesheetUrl: string
  /** 每帧宽度 px */
  frameWidth: number
  /** 每帧高度 px */
  frameHeight: number
  /** 动画定义（行号 → 动画名） */
  animations: Record<string, {
    /** 所在行号 */
    row: number
    /** 帧数 */
    frames: number
    /** 帧率（fps） */
    fps?: number
    /** 是否循环 */
    loop?: boolean
    /** 在 spritesheet 中的裁剪起始 Y（默认 0） */
    sourceY?: number
    /** 裁剪高度（默认 frameHeight） */
    sourceH?: number
  }>
}

/** 将自定义精灵转换为统一配置 */
export function convertCustomPetToResolvedConfig(custom: CustomPetConfig): ResolvedPetConfig {
  return {
    id: custom.id,
    label: custom.name,
    isCustom: true,
    isCodex: false,
    emoji: {
      idle: custom.emoji.idle,
      reminding: custom.emoji.reminding,
      snoozing: custom.emoji.snoozing,
    },
    gradients: {
      idle: { class: null, style: `linear-gradient(135deg, ${custom.colors.idle[0]}, ${custom.colors.idle[1]})` },
      reminding: { class: null, style: `linear-gradient(135deg, ${custom.colors.reminding[0]}, ${custom.colors.reminding[1]})` },
      snoozing: { class: null, style: `linear-gradient(135deg, ${custom.colors.snoozing[0]}, ${custom.colors.snoozing[1]})` },
    },
  }
}

/** 将宠物包转换为统一配置（spritesheetUrl 由调用方解析，以区分内置/导入来源） */
export function convertPetPackageToResolvedConfig(pkg: PetPackage, spritesheetUrl?: string): ResolvedPetConfig {
  const isSpritesheet = !!pkg.spritesheetPath

  return {
    id: pkg.id,
    label: pkg.displayName,
    isCustom: false,
    isCodex: isSpritesheet,
    spritesheetUrl,
    emoji: {
      idle: pkg.fallbackEmoji,
      reminding: pkg.fallbackEmoji,
      snoozing: pkg.fallbackEmoji,
    },
    gradients: {
      idle: { class: 'from-gray-200 to-gray-300', style: null },
      reminding: { class: 'from-red-200 to-orange-300', style: null },
      snoozing: { class: 'from-purple-200 to-purple-300', style: null },
    },
    packageStateMap: pkg.stateMap,
    packageFrameWidth: pkg.frameWidth,
    packageFrameHeight: pkg.frameHeight,
    packageActions: pkg.actions,
  }
}

/** 将预设转换为统一配置 */
export function convertPresetToResolvedConfig(
  config: PetThemeConfig,
  key: PetType,
): ResolvedPetConfig {
  return {
    id: key,
    label: config.label,
    isCustom: false,
    isCodex: !!config.codex,
    spritesheetUrl: config.codex?.spritesheetUrl,
    emoji: config.emoji,
    gradients: {
      idle: { class: config.colors.idle, style: null },
      reminding: { class: config.colors.reminding, style: null },
      snoozing: { class: config.colors.snoozing, style: null },
    },
  }
}

/** 解析当前选中的精灵（预设或自定义） */
export function resolvePetConfig(
  petType: PetType | 'custom',
  customPetId: string | undefined,
  customPets: CustomPetConfig[],
  fallback?: PetType,
): ResolvedPetConfig {
  if (petType === 'custom' && customPetId) {
    const custom = customPets.find(p => p.id === customPetId)
    if (custom) return convertCustomPetToResolvedConfig(custom)
  }
  const type = petType !== 'custom' ? petType : (fallback ?? 'drop')
  return convertPresetToResolvedConfig(PET_THEMES[type], type)
}

export const PET_THEMES: Record<PetType, PetThemeConfig> = {
  drop: {
    label: '小水滴',
    emoji: { idle: '💧', reminding: '🫗', snoozing: '😴' },
    colors: { idle: 'from-blue-200 to-blue-300', reminding: 'from-red-200 to-orange-300', snoozing: 'from-purple-200 to-purple-300' },
  },
  cat: {
    label: '小猫咪',
    emoji: { idle: '🐱', reminding: '😾', snoozing: '😿' },
    colors: { idle: 'from-orange-200 to-amber-300', reminding: 'from-red-300 to-rose-400', snoozing: 'from-slate-200 to-gray-300' },
  },
  dog: {
    label: '小狗狗',
    emoji: { idle: '🐶', reminding: '🐕‍🦺', snoozing: '🥱' },
    colors: { idle: 'from-yellow-200 to-amber-300', reminding: 'from-red-200 to-orange-300', snoozing: 'from-gray-200 to-slate-300' },
  },
  fox: {
    label: '小狐狸',
    emoji: { idle: '🦊', reminding: '😡', snoozing: '😌' },
    colors: { idle: 'from-orange-200 to-red-300', reminding: 'from-red-300 to-rose-400', snoozing: 'from-stone-200 to-neutral-300' },
  },
  star: {
    label: '小星星',
    emoji: { idle: '🌟', reminding: '⭐', snoozing: '🌙' },
    colors: { idle: 'from-yellow-200 to-amber-300', reminding: 'from-yellow-300 to-orange-400', snoozing: 'from-indigo-200 to-blue-300' },
  },
  cherry: {
    label: '小樱花',
    emoji: { idle: '🌸', reminding: '🌺', snoozing: '🌷' },
    colors: { idle: 'from-pink-200 to-rose-300', reminding: 'from-pink-300 to-red-400', snoozing: 'from-purple-200 to-pink-300' },
  },
  clover: {
    label: '小幸运',
    emoji: { idle: '🍀', reminding: '🌿', snoozing: '🌱' },
    colors: { idle: 'from-green-200 to-emerald-300', reminding: 'from-lime-300 to-green-400', snoozing: 'from-teal-200 to-cyan-300' },
  },
  yuexinmiao1: {
    label: '月薪喵',
    emoji: { idle: '🐱', reminding: '😾', snoozing: '😴' },
    colors: { idle: 'from-amber-200 to-orange-300', reminding: 'from-red-300 to-rose-400', snoozing: 'from-slate-200 to-gray-300' },
    codex: { spritesheetUrl: '/pets/yuexinmiao1/spritesheet.webp' },
  },
}
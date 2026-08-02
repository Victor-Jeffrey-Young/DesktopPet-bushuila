<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useAppStore } from '../stores/app'
import type { PetType } from '../types'
import { validatePetPackage } from '../utils/petLoader'
import SettingsCard from './SettingsCard.vue'
import ToggleSwitch from './ToggleSwitch.vue'
import { enable as enableAutostart, disable as disableAutostart } from '@tauri-apps/plugin-autostart'
import JSZip from 'jszip'

const emit = defineEmits<{ close: [] }>()
const store = useAppStore()

const tabs = [
  { id: 'general' as const, icon: '◎', label: '常规', detail: '提醒与启动' },
  { id: 'voice' as const, icon: '◉', label: '语音', detail: '声音来源' },
  { id: 'appearance' as const, icon: '✦', label: '宠物', detail: '外观与动作' },
  { id: 'history' as const, icon: '◷', label: '历史', detail: '今日记录' },
]
const activeTab = ref<'general' | 'voice' | 'appearance' | 'history'>('general')
const activeTabMeta = computed(() => tabs.find(tab => tab.id === activeTab.value) ?? tabs[0])

const intervalInput = ref(store.settings.intervalMinutes)
const snoozeInput = ref(store.settings.snoozeMinutes)
const voiceSourceInput = ref(store.settings.voiceSource)
const autoStartInput = ref(store.settings.autoStart)
const systemTrayInput = ref(store.settings.systemTray)
const debugPanelInput = ref(store.settings.debugPanel)
const themeInput = ref(store.settings.theme)
const petScaleInput = ref(store.settings.petScale ?? 1)
const petTypeInput = ref<PetType | 'custom'>(store.settings.petTheme.pet)
const selectedCustomPetId = ref<string | undefined>(store.settings.petTheme.customPetId)
const selectedPetId = ref<string>(
  store.settings.petTheme.pet === 'custom'
    ? (store.settings.petTheme.customPetId ?? 'drop')
    : store.settings.petTheme.pet,
)

// 调试面板开关即时生效（无需点击"应用更改"，主窗口通过 storage 事件实时响应）
watch(debugPanelInput, (v) => {
  store.updateSettings({ debugPanel: v })
})

// 宠物大小松手即生效（range change 事件，主窗口通过 storage 事件实时缩放）
function applyPetScale() {
  store.updateSettings({ petScale: petScaleInput.value })
}
const fileInputRef = ref<HTMLInputElement | null>(null)
const petPackageInputRef = ref<HTMLInputElement | null>(null)

const todayDate = computed(() => {
  const d = new Date()
  return `${d.getMonth() + 1}月${d.getDate()}日`
})

/** 面板内容整体缩放（窗口逻辑尺寸已按 petScale 放大，内容按基准 420×560 scale 填满） */
const panelScale = computed(() => store.settings.petScale ?? 1)
const panelScaleStyle = computed(() => ({
  transform: `scale(${panelScale.value})`,
  transformOrigin: 'top left',
}))

const previewStyle = computed(() => {
  if (petTypeInput.value === 'custom' && selectedCustomPetId.value) {
    const pet = store.customPets.find(p => p.id === selectedCustomPetId.value)
    if (pet) return { background: `linear-gradient(135deg, ${pet.colors.idle[0]}, ${pet.colors.idle[1]})` }
  }
  return { class: 'bg-gradient-to-br from-blue-200 to-blue-300' }
})

const previewEmoji = computed(() => {
  if (petTypeInput.value === 'custom' && selectedCustomPetId.value) {
    const pet = store.customPets.find(p => p.id === selectedCustomPetId.value)
    if (pet) return { idle: pet.emoji.idle, reminding: pet.emoji.reminding, snoozing: pet.emoji.snoozing }
  }
  const pkg = store.allPets.find(p => p.id === selectedPetId.value)
  if (pkg) return { idle: pkg.fallbackEmoji, reminding: pkg.fallbackEmoji, snoozing: pkg.fallbackEmoji }
  return { idle: '💧', reminding: '💧', snoozing: '💧' }
})

const selectedPet = computed(() => store.allPets.find(pet => pet.id === selectedPetId.value))

function saveSettings() {
  const isCustom = petTypeInput.value === 'custom'
  store.updateSettings({
    intervalMinutes: intervalInput.value,
    snoozeMinutes: snoozeInput.value,
    voiceSource: voiceSourceInput.value,
    autoStart: autoStartInput.value,
    systemTray: systemTrayInput.value,
    debugPanel: debugPanelInput.value,
    petScale: petScaleInput.value,
    theme: themeInput.value,
    petTheme: {
      pet: isCustom ? 'custom' : (selectedPetId.value as any),
      customPetId: isCustom ? selectedCustomPetId.value : undefined,
    },
  })

  emit('close')

  // 开机自启异步应用，不阻塞面板关闭（部分平台 invoke 可能挂起/慢）
  const applyAutostart = autoStartInput.value ? enableAutostart() : disableAutostart()
  void applyAutostart.catch((e) => {
    console.error('Autostart toggle failed:', e)
  })
}

function selectPetPackage(id: string) {
  petTypeInput.value = id as PetType
  selectedCustomPetId.value = undefined
  selectedPetId.value = id
}

function isPetSelected(id: string): boolean {
  return selectedPetId.value === id
}

async function handleFileImport(e: Event) {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return
  for (const file of files) {
    try {
      await store.addCustomVoice(file.name, new Uint8Array(await file.arrayBuffer()))
    } catch (err) {
      console.error('导入语音失败:', file.name, err)
    }
  }
  input.value = ''
}

async function handlePetPackageImport(e: Event) {
  const input = e.target as HTMLInputElement
  const files = input.files
  if (!files || files.length === 0) return

  for (const file of files) {
    try {
      const zip = await JSZip.loadAsync(file)
      // 递归查找 pet.json：兼容包内多一层目录的结构（如 daodun/pet.json），忽略 __MACOSX 系统文件
      const petJsonFile = Object.keys(zip.files)
        .filter(name => !name.startsWith('__MACOSX') && (name === 'pet.json' || name.endsWith('/pet.json')))
        .sort((a, b) => a.length - b.length)
        .map(name => zip.files[name])[0]
      if (!petJsonFile) {
        alert(`导入失败：${file.name} 中缺少 pet.json`)
        continue
      }
      // pet.json 所在目录（如 'daodun/'），spritesheet 路径相对它解析
      const baseDir = petJsonFile.name.slice(0, -'pet.json'.length)
      const pkg = validatePetPackage(JSON.parse(await petJsonFile.async('text')))
      let spritesheetData: Uint8Array | undefined
      if (pkg.spritesheetPath) {
        const spriteFile = zip.file(baseDir + pkg.spritesheetPath) ?? zip.file(pkg.spritesheetPath)
        if (!spriteFile) {
          alert(`导入失败：宠物包缺少 ${pkg.spritesheetPath}`)
          continue
        }
        spritesheetData = new Uint8Array(await spriteFile.async('arraybuffer'))
      }
      await store.importPetPackage(pkg, spritesheetData)
      selectPetPackage(pkg.id)
      alert(`✅ 已导入宠物「${pkg.displayName}」`)
    } catch (err) {
      console.error('导入宠物包失败:', file.name, err)
      alert(`导入失败：${file.name} 不是有效的宠物包`)
    }
  }
  input.value = ''
}
</script>

<template>
  <div class="settings-shell" :style="panelScaleStyle">
    <aside class="settings-sidebar">
      <div class="brand-lockup">
        <span class="brand-mark">💧</span>
        <span class="brand-text"><small>补水啦</small><strong>设置</strong></span>
      </div>

      <nav class="settings-nav" aria-label="设置分类">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          :class="['nav-item', activeTab === tab.id && 'nav-item-active']"
          :aria-current="activeTab === tab.id ? 'page' : undefined"
          @click="activeTab = tab.id"
        >
          <span class="nav-icon" aria-hidden="true">{{ tab.icon }}</span>
          <span class="nav-label"><strong>{{ tab.label }}</strong><small>{{ tab.detail }}</small></span>
        </button>
      </nav>

      <div class="sidebar-status"><span></span> 本地保存</div>
    </aside>

    <section class="settings-main">
      <header class="settings-header">
        <span class="eyebrow">补水啦 / {{ activeTabMeta.label }}</span>
        <h1>{{ activeTabMeta.label }}</h1>
        <p>{{ activeTabMeta.detail }}</p>
      </header>

      <main class="settings-content apple-scroll">
        <template v-if="activeTab === 'general'">
          <div class="section-lead"><span>⌁</span><div><strong>保持节奏</strong><small>让每次提醒都刚刚好。</small></div></div>

          <SettingsCard title="提醒">
            <div class="setting-line"><span>提醒间隔</span><strong class="accent-value">{{ intervalInput }} 分钟</strong></div>
            <input v-model.number="intervalInput" type="range" min="1" max="120" step="1" class="settings-slider" aria-label="提醒间隔" />
            <div class="range-labels"><span>1 分钟</span><span>120 分钟</span></div>
          </SettingsCard>

          <SettingsCard title="稍后提醒">
            <div class="setting-line"><span>延后时长</span><strong class="accent-value">{{ snoozeInput }} 分钟</strong></div>
            <input v-model.number="snoozeInput" type="range" min="1" max="60" step="1" class="settings-slider" aria-label="稍后提醒时长" />
            <div class="segmented-options">
              <button v-for="m in [5, 10, 15, 30]" :key="m" type="button" :class="['segment', snoozeInput === m && 'segment-active']" @click="snoozeInput = m">{{ m }} 分钟</button>
            </div>
            <div class="range-labels"><span>1 分钟</span><span>60 分钟</span></div>
          </SettingsCard>

          <SettingsCard title="应用行为">
            <ToggleSwitch v-model="autoStartInput" label="开机自启动" />
            <div class="list-divider"><ToggleSwitch v-model="systemTrayInput" label="系统托盘常驻" /></div>
            <div class="list-divider"><ToggleSwitch v-model="debugPanelInput" label="调试面板" /></div>
          </SettingsCard>

          <SettingsCard title="外观">
            <div class="choice-list">
              <label v-for="opt in [
                { value: 'system', emoji: '◐', label: '跟随系统', note: '随系统外观自动切换' },
                { value: 'light', emoji: '☀', label: '浅色', note: '始终使用浅色外观' },
                { value: 'dark', emoji: '☾', label: '深色', note: '始终使用深色外观' },
              ]" :key="opt.value" :class="['choice-row', themeInput === opt.value && 'choice-active']">
                <input v-model="themeInput" type="radio" name="theme" :value="opt.value" class="sr-only" />
                <span class="choice-emoji">{{ opt.emoji }}</span>
                <span class="choice-copy"><strong>{{ opt.label }}</strong><small>{{ opt.note }}</small></span>
                <span :class="['radio', themeInput === opt.value && 'radio-active']"><span v-if="themeInput === opt.value"></span></span>
              </label>
            </div>
          </SettingsCard>
        </template>

        <template v-if="activeTab === 'voice'">
          <div class="section-lead"><span>◉</span><div><strong>声音是提醒的一部分</strong><small>选择你想听到的声音。</small></div></div>

          <SettingsCard title="语音来源">
            <div class="choice-list">
              <label v-for="opt in [
                { value: 'builtin', emoji: '🎭', label: '魔性语音（内置）', note: '无需额外文件' },
                { value: 'ai', emoji: '🤖', label: 'AI 语音合成', note: '即将支持' },
                { value: 'custom', emoji: '🎵', label: '自定义语音包', note: '从本机选择' },
              ]" :key="opt.value" :class="['choice-row', voiceSourceInput === opt.value && 'choice-active']">
                <input v-model="voiceSourceInput" type="radio" name="voice" :value="opt.value" class="sr-only" />
                <span class="choice-emoji">{{ opt.emoji }}</span>
                <span class="choice-copy"><strong>{{ opt.label }}</strong><small>{{ opt.note }}</small></span>
                <span :class="['radio', voiceSourceInput === opt.value && 'radio-active']"><span v-if="voiceSourceInput === opt.value"></span></span>
              </label>
            </div>
          </SettingsCard>

          <button type="button" class="import-button" @click="fileInputRef?.click()"><span>＋</span><strong>导入语音文件</strong><small>从本机选择</small><b>›</b></button>
          <input ref="fileInputRef" type="file" accept="audio/*" multiple class="hidden" @change="handleFileImport" />

          <SettingsCard v-if="store.customVoices.length > 0" title="已导入语音">
            <div class="voice-list">
              <div v-for="voice in store.customVoices" :key="voice.id" class="voice-row">
                <span class="voice-icon">♫</span><span class="voice-name">{{ voice.name }}</span>
                <button type="button" class="delete-button" aria-label="删除语音" @click="store.removeCustomVoice(voice.id)">×</button>
              </div>
            </div>
          </SettingsCard>
          <p class="helper-copy">支持 MP3、WAV、OGG、M4A。自定义语音会在提醒时随机播放。</p>
        </template>

        <template v-if="activeTab === 'appearance'">
          <div class="section-lead"><span>✦</span><div><strong>你的桌面伙伴</strong><small>宠物包决定它的形象与动作。</small></div></div>

          <SettingsCard title="已安装宠物">
            <div v-if="store.allPets.length === 0" class="empty-state">正在读取宠物包…</div>
            <div v-else class="pet-grid">
              <button v-for="pet in store.allPets" :key="pet.id" type="button" :class="['pet-tile', isPetSelected(pet.id) && 'pet-active']" @click="selectPetPackage(pet.id)">
                <span class="pet-emoji">{{ pet.fallbackEmoji }}</span>
                <span class="pet-name">{{ pet.displayName }}</span>
                <span v-if="isPetSelected(pet.id)" class="pet-check">✓</span>
                <span v-if="pet.source === 'imported'" class="pet-source">导入</span>
              </button>
            </div>
          </SettingsCard>

          <button type="button" class="import-button" @click="petPackageInputRef?.click()"><span>＋</span><strong>导入宠物包</strong><small>.zip / .bushuila-pet</small><b>›</b></button>
          <input ref="petPackageInputRef" type="file" accept=".bushuila-pet,.zip" class="hidden" @change="handlePetPackageImport" />

          <SettingsCard title="宠物大小">
            <div class="setting-line"><span>尺寸</span><strong class="accent-value">{{ petScaleInput }}x</strong></div>
            <input v-model.number="petScaleInput" type="range" min="0.6" max="2" step="0.1" class="settings-slider" aria-label="宠物大小" @change="applyPetScale" />
            <div class="range-labels"><span>0.6x</span><span>2.0x</span></div>
          </SettingsCard>

          <SettingsCard title="当前选择">
            <div class="selected-pet">
              <div class="preview-orb" :class="previewStyle.class ?? undefined" :style="previewStyle.class ? undefined : previewStyle"><span>{{ previewEmoji.idle }}</span></div>
              <div><strong>{{ selectedPet?.displayName ?? '小水滴' }}</strong><small>待机 {{ previewEmoji.idle }} · 提醒 {{ previewEmoji.reminding }} · 小憩 {{ previewEmoji.snoozing }}</small></div>
            </div>
          </SettingsCard>
        </template>

        <template v-if="activeTab === 'history'">
          <div class="history-summary"><span class="history-icon">💧</span><div><strong>{{ store.todayCount }}</strong><small>杯 · {{ todayDate }}</small></div></div>
          <SettingsCard title="今日进度">
            <div class="progress-line"><span>每日目标</span><strong>{{ Math.min(100, Math.round((store.todayCount / 8) * 100)) }}%</strong></div>
            <div class="progress-track"><div class="progress-fill" :style="{ width: `${Math.min(100, (store.todayCount / 8) * 100)}%` }"></div></div>
            <div class="progress-labels"><span>已完成 {{ store.todayCount }} 杯</span><span>目标 8 杯</span></div>
          </SettingsCard>
          <div class="history-note">⌁ 每次喝水，都是给身体的一次小小回应。</div>
        </template>
      </main>

      <footer class="settings-footer"><span>修改会同步到桌面精灵</span><button type="button" @click="saveSettings">应用更改</button></footer>
    </section>
  </div>
</template>

<style scoped>
.settings-shell {
  --blue: var(--accent);
  display: grid;
  grid-template-columns: 116px minmax(0, 1fr);
  /* 基准设计尺寸（窗口逻辑尺寸随 petScale 放大，内容用 transform scale 等比缩放填满） */
  width: 420px;
  height: 560px;
  overflow: hidden;
  color: var(--ink);
  background: var(--app-bg);
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", sans-serif;
}

.settings-sidebar {
  display: flex;
  min-width: 0;
  flex-direction: column;
  padding: 18px 9px 12px;
  border-right: 1px solid var(--line);
  background: var(--sidebar-bg);
  backdrop-filter: blur(20px);
}

.brand-lockup { display: flex; align-items: center; gap: 8px; padding: 0 6px 22px; }
.brand-mark { display: grid; place-items: center; width: 27px; height: 27px; border-radius: 8px; background: linear-gradient(145deg, #82c8ff, #1677d2); box-shadow: 0 2px 5px rgba(0,122,255,.25); font-size: 15px; }
.brand-text small, .nav-label small { display: block; color: var(--muted); font-size: 9px; line-height: 1.2; }
.brand-text strong { display: block; margin-top: 2px; font-size: 13px; line-height: 1.1; }
.settings-nav { display: grid; gap: 4px; }
.nav-item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 8px 7px; border: 0; border-radius: 8px; background: transparent; color: var(--ink-secondary); text-align: left; transition: background .14s ease, color .14s ease, transform .14s ease; }
.nav-item:hover { background: var(--hover); color: var(--ink); }
.nav-item:active { transform: scale(.98); }
.nav-item-active { background: var(--accent-soft); color: var(--accent); }
.nav-icon { display: grid; place-items: center; width: 21px; height: 21px; border-radius: 6px; background: var(--track); font-size: 13px; line-height: 1; }
.nav-item-active .nav-icon { background: var(--accent-soft-strong); }
.nav-label { min-width: 0; font-size: 11px; line-height: 1.1; }
.nav-label strong, .nav-label small { display: block; }
.nav-label small { margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sidebar-status { display: flex; align-items: center; gap: 5px; margin-top: auto; padding: 8px 6px 0; color: var(--muted); font-size: 10px; }
.sidebar-status span { width: 6px; height: 6px; border-radius: 50%; background: var(--success); box-shadow: 0 0 0 2px rgba(52,199,89,.12); }

.settings-main { display: flex; min-width: 0; min-height: 0; flex-direction: column; background: var(--main-bg); }
.settings-header { padding: 22px 18px 13px; }
.eyebrow { color: var(--blue); font-size: 10px; font-weight: 600; letter-spacing: .02em; }
.settings-header h1 { margin-top: 4px; font-size: 23px; font-weight: 700; letter-spacing: -.04em; line-height: 1.08; }
.settings-header p { margin-top: 3px; color: var(--muted); font-size: 11px; }
.settings-content { flex: 1; min-height: 0; overflow-y: auto; padding: 0 18px 16px; }
.settings-content > * + * { margin-top: 12px; }
.section-lead { display: flex; align-items: center; gap: 9px; min-height: 34px; padding: 2px 1px 4px; }
.section-lead > span { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 7px; background: var(--accent-soft); color: var(--blue); font-size: 14px; }
.section-lead strong, .section-lead small { display: block; }
.section-lead strong { font-size: 12px; }
.section-lead small { margin-top: 2px; color: var(--muted); font-size: 10px; }
.setting-line, .progress-line, .progress-labels { display: flex; align-items: center; justify-content: space-between; }
.setting-line { font-size: 13px; }
.accent-value { padding: 4px 8px; border-radius: 6px; background: var(--accent-soft); color: var(--blue); font-size: 11px; font-variant-numeric: tabular-nums; }
.range-labels { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; width: 100%; color: var(--muted); font-size: 10px; }
.range-labels span:last-child { justify-self: end; text-align: right; }
.progress-labels { display: flex; align-items: center; justify-content: space-between; color: var(--muted); font-size: 10px; }
.segmented-options { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; padding: 3px; border-radius: 8px; background: var(--segmented-track); }
.segment { padding: 6px 3px; border: 0; border-radius: 6px; background: transparent; color: var(--ink-secondary); font-size: 11px; transition: background .14s ease, color .14s ease, box-shadow .14s ease; }
.segment:hover { color: var(--ink); }
.segment-active { background: var(--segmented-active); box-shadow: 0 1px 2px rgba(0,0,0,.12); color: var(--ink); font-weight: 600; }
.list-divider { padding-top: 14px; border-top: 1px solid var(--line); }
.choice-list, .voice-list { display: grid; gap: 6px; }
.choice-row { display: flex; align-items: center; gap: 9px; padding: 10px 2px; border: 0; border-radius: 0; background: transparent; cursor: pointer; transition: color .14s ease, background .14s ease; }
.choice-row + .choice-row { border-top: 1px solid var(--line); }
.choice-row:hover { color: var(--blue); }
.choice-active { color: var(--blue); }
.choice-emoji, .voice-icon { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 7px; background: var(--track); font-size: 13px; }
.choice-copy { min-width: 0; flex: 1; }
.choice-copy strong, .choice-copy small { display: block; }
.choice-copy strong { font-size: 12px; font-weight: 500; }
.choice-copy small { margin-top: 2px; color: var(--muted); font-size: 10px; }
.radio { display: grid; place-items: center; width: 16px; height: 16px; border: 1.5px solid var(--line-strong); border-radius: 50%; }
.radio-active { border-color: var(--blue); }
.radio-active span { width: 8px; height: 8px; border-radius: 50%; background: var(--blue); }
.import-button { display: grid; grid-template-columns: 24px 1fr auto 12px; align-items: center; gap: 8px; width: 100%; min-height: 42px; padding: 0 10px; border: 1px solid var(--line); border-radius: 9px; background: var(--import-bg); color: var(--ink); text-align: left; transition: border .14s ease, background .14s ease, transform .14s ease; }
.import-button:hover { border-color: var(--accent-soft-border); background: var(--surface-raised); }
.import-button:active { transform: scale(.99); }
.import-button > span { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 7px; background: var(--accent-soft); color: var(--blue); font-size: 16px; line-height: 1; }
.import-button strong { font-size: 12px; font-weight: 500; }
.import-button small { color: var(--muted); font-size: 10px; }
.import-button b { color: var(--faint); font-size: 18px; font-weight: 400; line-height: 1; }
.voice-row { display: flex; align-items: center; gap: 8px; min-height: 37px; padding: 5px 8px; border: 1px solid var(--line); border-radius: 8px; background: var(--tile-bg); }
.voice-name { min-width: 0; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 12px; }
.delete-button { width: 22px; height: 22px; border: 0; border-radius: 50%; background: transparent; color: var(--faint); font-size: 17px; line-height: 1; }
.delete-button:hover { background: var(--danger-soft); color: var(--danger); }
.helper-copy, .history-note { padding: 0 2px; color: var(--muted); font-size: 10px; line-height: 1.45; }
.pet-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; }
.pet-tile { position: relative; display: flex; min-width: 0; flex-direction: column; align-items: center; gap: 3px; padding: 8px 4px 7px; border: 1px solid var(--line); border-radius: 9px; background: var(--tile-bg); transition: border .14s ease, background .14s ease, transform .14s ease; }
.pet-tile:hover { border-color: var(--accent-soft-border); background: var(--tile-hover); }
.pet-tile:active { transform: scale(.97); }
.pet-active { border-color: var(--accent-soft-border); background: var(--accent-soft); box-shadow: inset 0 0 0 1px var(--accent-soft); }
.pet-emoji { font-size: 24px; line-height: 1.15; }
.pet-name { max-width: 100%; overflow: hidden; color: var(--ink-secondary); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.pet-check, .pet-source { position: absolute; top: 4px; right: 4px; display: grid; place-items: center; min-width: 14px; height: 14px; border-radius: 50%; background: var(--blue); color: white; font-size: 9px; font-weight: 700; }
.pet-source { min-width: 0; height: 14px; padding: 0 4px; border-radius: 5px; font-size: 8px; font-weight: 500; }
.selected-pet { display: flex; align-items: center; gap: 11px; min-height: 62px; }
.preview-orb { display: grid; place-items: center; flex: 0 0 auto; width: 58px; height: 58px; border-radius: 50%; box-shadow: 0 5px 12px rgba(0,0,0,.12); font-size: 27px; }
.selected-pet strong, .selected-pet small { display: block; }
.selected-pet strong { font-size: 13px; }
.selected-pet small { margin-top: 4px; color: var(--muted); font-size: 10px; line-height: 1.4; }
.history-summary { display: flex; align-items: center; gap: 11px; min-height: 66px; padding: 0 2px; }
.history-icon { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 12px; background: var(--accent-soft); color: var(--blue); font-size: 20px; }
.history-summary strong, .history-summary small { display: block; }
.history-summary strong { color: var(--ink); font-size: 29px; line-height: 1; font-variant-numeric: tabular-nums; }
.history-summary small { margin-top: 4px; color: var(--muted); font-size: 11px; }
.progress-line { color: var(--muted); font-size: 11px; }
.progress-line strong { color: var(--blue); font-size: 12px; font-variant-numeric: tabular-nums; }
.progress-track { height: 6px; margin-top: 9px; overflow: hidden; border-radius: 999px; background: var(--track); }
.progress-fill { height: 100%; border-radius: inherit; background: var(--blue); transition: width .4s ease; }
.history-note { padding: 2px; }
.empty-state { padding: 16px 0; color: var(--muted); font-size: 12px; text-align: center; }
.settings-footer { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 10px 18px; border-top: 1px solid var(--line); background: var(--main-bg); }
.settings-footer span { color: var(--muted); font-size: 9px; }
.settings-footer button { flex: 0 0 auto; min-width: 92px; padding: 7px 12px; border: 0; border-radius: 7px; background: var(--blue); color: white; font-size: 12px; font-weight: 600; box-shadow: 0 1px 2px rgba(0,122,255,.24); transition: background .14s ease, transform .14s ease; }
.settings-footer button:hover { background: var(--accent-hover); }
.settings-footer button:active { transform: scale(.98); }
.settings-slider { width: 100%; height: 5px; appearance: none; border-radius: 999px; background: var(--track-strong); cursor: pointer; }
.settings-slider::-webkit-slider-thumb { width: 18px; height: 18px; appearance: none; border: .5px solid var(--thumb-border); border-radius: 50%; background: var(--thumb); box-shadow: 0 1px 4px var(--thumb-shadow); }
.settings-slider::-moz-range-thumb { width: 18px; height: 18px; border: .5px solid var(--thumb-border); border-radius: 50%; background: var(--thumb); box-shadow: 0 1px 4px var(--thumb-shadow); }
.apple-scroll::-webkit-scrollbar { width: 7px; }
.apple-scroll::-webkit-scrollbar-thumb { border: 2px solid transparent; border-radius: 999px; background: var(--scroller); background-clip: content-box; }

@media (max-width: 360px) {
  .settings-shell { grid-template-columns: 94px minmax(0, 1fr); }
  .settings-sidebar { padding-inline: 6px; }
  .nav-label small { display: none; }
  .settings-header, .settings-content, .settings-footer { padding-left: 13px; padding-right: 13px; }
}
</style>

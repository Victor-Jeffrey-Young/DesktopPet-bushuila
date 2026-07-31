# 📋 补水啦（bushuila）项目开发计划

## 一、项目愿景

打造一款轻量、可玩性强、支持社区宠物生态的桌面喝水提醒精灵，让用户主动关心身体健康，同时拥有像 Codex Pets 一样的丰富自定义和社区分享能力。

---

## 二、参考思路：Codex Pets 生态借鉴

| Codex Pets 特性 | 补水啦改造计划 |
|-----------------|---------------|
| `pet.json` 元数据规范 | 引入外部宠物包格式，支持导入/导出 `.zip` 宠物包 |
| 社区画廊 + 一键安装 (`npx ... install`) | Phase 2：内置示例宠物集市，Phase 3：支持从在线库一键安装 |
| 多状态动画映射（9种状态） | 增加 `drunk/celebrated` 喝水庆祝状态，形成完整闭环 |
| 宠物创作工具 (hatch-pet) | Phase 2：加入"拍照生成精灵"功能（类似 CodexSkin） |

---

## 三、开发阶段规划

### 🔴 Phase 1：核心体验增强（预计 1-2 周）

**目标**：让现有水滴精灵更生动，增加分享和导出能力

| # | 任务 | 优先级 | 负责人 | 完成标志 |
|---|------|--------|--------|----------|
| 1.1 | 新增 `drunk` / `celebrated` 状态：喝水后精灵做庆祝动画（类似Codex的jumping） | P0 | - | SpritePet.vue 增加新状态逻辑 + 庆祝动画CSS |
| 1.2 | 增加庆祝音效：喝水时播放欢快音效（短鸣声+渐变音高） | P0 | - | useAudio.ts 添加 `playCelebration()` 方法 |
| 1.3 | CustomPetEditor 增加"导出宠物包"按钮：生成 `pet.json` + spritesheet.zip | P1 | - | 点击下载 `.bushuila-pet` 文件，内含 pet.json 和资源 |
| 1.4 | pet.json 类型定义：在 `src/types/index.ts` 增加 `PetPackage` interface | P1 | - | TypeScript 类型完整定义，包含 id, displayName, stateMap 等字段 |
| 1.5 | SpritePet 读取外部 pet.json 配置动画帧数：支持通过 stateMap 覆盖默认动画 | P2 | - | 使用 useSpriteAnimation.ts 动态配置帧率 |
| 1.6 | 微动作系统扩展：让庆祝状态下 micro-actions 也显示鼓励气泡（如"真棒！"💪） | P2 | - | randomAction() 增加 celebratory 分支 |

**交付物**：
- 支持庆祝状态的饮水闭环体验
- 可导出的宠物包文件（.bushuila-pet）
- pet.json 类型规范文档

---

### 🟡 Phase 2：宠物社区与导入（预计 2-3 周）

**目标**：让用户能方便地获取和使用更多宠物，建立初步社区生态

| # | 任务 | 优先级 | 负责人 | 完成标志 |
|---|------|--------|--------|----------|
| 2.1 | 解析宠物包格式：支持拖放 `.bushuila-pet` 或 `.zip` 导入到本地存储 | P0 | - | stores/app.ts 增加 `importPetPackage(zipFile)` |
| 2.2 | 示例宠物集市：在 SettingsPanel 新增"示例宠物"标签页，预置 5 个示例宠物包（含spritesheet） | P0 | - | `public/pets/` 目录存放示例宠物，设置面板可选 |
| 2.3 | 宠物包预览器：导入后可预览 pet.json 中的描述和精灵效果 | P1 | - | CustomPetEditor 复用，展示预览效果 |
| 2.4 | 宠物详情页：点击宠物可查看 description、author、状态映射等信息 | P1 | - | Modal 展示 pet.json 详细信息 |
| 2.5 | 分享宠物链接：生成带参数的短链接（如 bushuila.pet/share?token=xxx），别人点击即可安装 | P2 | - | Base64编码 pet.json + sprite 数据嵌入 URL |
| 2.6 | "拍照生成精灵"简易版：上传自拍照片 → AI（或简单阈值处理）转成emoji风格的精灵 | P2 | - | Canvas 简化处理，生成基本色块和emoji |

**交付物**：
- 宠物导入/导出完整工作流
- 示例宠物集市（内置5+宠物）
- 宠物分享链接功能

---

### 🟢 Phase 3：生态扩展（长期，视需求迭代）

| # | 任务 | 优先级 | 预期价值 |
|---|------|--------|----------|
| 3.1 | 自建宠物集市网站（GitHub Pages + API） | P3 | 积累社区内容，用户可分享宠物 |
| 3.2 | CLI 工具 `bushuila pets install/import/export` | P3 | 命令行爱好者友好，自动化脚本 |
| 3.3 | 支持 Codex Pets 格式兼容（读取别人的 pet.json） | P3 | 扩大宠物素材来源，互通生态 |
| 3.4 | 付费宠物商店概念（高级皮肤/特殊动画） | P4 | 可能的商业化路径 |
| 3.5 | 多屏支持：宠物跟随鼠标所在屏幕 | P4 | 多显示器用户体验优化 |
| 3.6 | 健康数据联动：对接可穿戴设备，根据实际饮水量调整提醒策略 | P5 | 差异化核心价值 |

---

## 四、技术规格补充规范

### 4.1 宠物包格式标准 (`bushuila-pet v1.0`)

```
my-water-buddy.bushuila-pet  (.zip 格式压缩包)
├── pet.json                 // 元数据清单（必需）
├── spritesheet.webp         // 精灵图集（必需）[或 emoji: "💧"]
├── celebration.mp3          // [可选] 庆祝音效
├── README.md                // [可选] 宠物说明
└── thumbnail.png            // [可选] 预览图（128x128）
```

**pet.json 字段：**
```json
{
  "id": "unique-slug",              // 必需，小写字母+连字符
  "displayName": "显示名称",        // 必需
  "description": "宠物描述",        // 必需
  "author": "作者名",               // 可选
  "version": "1.0",                 // 必需
  "spriteVersionNumber": 1,         // 1=Emoji替代, 2=Spritesheet
  "spritesheetPath": "spritesheet.webp",  // 仅当 spriteVersionNumber=2 时必需
  "fallbackEmoji": "💧",             // 精灵表加载失败时的回退emoji
  "stateMap": {                     // 必需：状态映射到动画配置
    "idle":      { row: 0, frames: 6, fps: 8 },
    "reminding": { row: 1, frames: 8, fps: 10 },
    "snoozing":  { row: 2, frames: 5, fps: 4 },
    "drunk":     { row: 3, frames: 6, fps: 6 }   // 新增状态
  },
  "microActions": ["look","blink","happy"]  // 可选：待机微动作列表
}
```

### 4.2 精灵图集约定

- V1（spriteVersionNumber=1）：不使用 spritesheet，直接用 fallbackEmoji 和 CSS 动画
- V2（spriteVersionNumber=2）：需符合 Codex Pets 网格规范：
  - **V1**: 1536×1872 px, 8列×9行, 单元格 192×208 px
  - **V2**: 1536×2288 px, 8列×11行, 单元格 192×208 px（含转向行）
  - 透明背景，RGBA WebP/PNG 格式
  - 未使用行必须完全透明

---

## 五、依赖与风险

| 风险点 | 影响程度 | 缓解措施 |
|--------|----------|----------|
| localStorage 容量不足（语音/图片base64） | 中 | 大文件改用 Tauri 文件系统API或 IndexedDB |
| Mac App Store 私有API合规性 | 低 | 仅用于直接分发，上架前重构为公共API |
| 社区宠物格式兼容性（未来要支持多个规范） | 中 | 抽象宠物格式解析层，支持 v1/v2 转换 |
| 自定义精灵编辑器制作成本高 | 低 | Phase 1 先做导出功能，编辑功能延后 |

---

## 六、版本计划（SemVer）

| 版本号 | 阶段 | 发布日期 | 主要变更 |
|--------|------|----------|----------|
| v0.1.0 | MVP（当前） | 已发布 | 基础喝水提醒 + 精灵 + 设置 |
| v0.2.0 | Phase 1 | TBD | 庆祝状态 + 宠物包导出 + pet.json 规范 |
| v0.3.0 | Phase 2 | TBD | 导入功能 + 示例集市 + 分享链接 |
| v1.0.0 | Phase 3（部分） | TBD | 稳定版1.0，支持社区宠物生态 |

---

## 七、如何参与开发

### 环境准备

```bash
# 克隆项目
git clone <your-repo-url>
cd bushuila

# 安装依赖
npm install

# 检查环境
node --version   # ≥ 18
rustc --version  # ≥ 1.77
npm --version
```

### 启动命令

```bash
# 前端调试模式（无Tauri窗口）
npm run dev

# Tauri 桌面应用（推荐）
npm run tauri:dev

# 构建生产版本
npm run build
npm run tauri:build
```

### 开发流程

1. Fork 项目 → 创建 feature 分支 → 本地开发 → PR → Code Review → 合并
2. 每次提交附带有意义的 commit message（遵循 Conventional Commits）
3. 新增功能需在 `DEVELOPMENT.md` 中登记（本文件）

### 测试建议

- 手动测试：启动 Tauri 应用，反复切换提醒状态、拖拽精灵、打开设置
- 类型检查：`npm run build` 编译时 TS 错误必须为零
- 存储持久化：重启应用后确认 settings/customPets/drinkRecords 仍保留

---

*最后更新：2026-07-31*  
*维护者：项目负责人*  
*协议：MIT*

# 补水啦 💧

桌面喝水提醒精灵 — 一个小巧的桌面宠物，定时用魔性语音提醒你该喝水了。

灵感来自姆巴佩经典台词"补水啦！"

## ✨ 功能

- **桌面精灵** — 透明窗口上的可爱水滴精灵，支持拖拽移动
- **定时提醒** — 自定义提醒间隔（5-120分钟）
- **稍后提醒** — 点击"稍后提醒"延后 5/10/15 分钟
- **魔性语音** — 内置语音包 + 支持自定义语音导入
- **系统托盘** — 最小化到托盘，双击恢复
- **开机自启** — 可选开机自动启动
- **喝水统计** — 记录今日喝水次数和进度

## 🛠 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 3 + TypeScript + Vite |
| 框架 | Tauri 2.x (Rust) |
| 样式 | Tailwind CSS 4 |
| 状态 | Pinia |
| 跨平台 | macOS + Windows |

## 🚀 开始使用

### 前置要求

- [Node.js](https://nodejs.org/) >= 18
- [Rust](https://rustup.rs/) >= 1.77
- 系统依赖：
  - macOS: `xcode-select --install`
  - Windows: [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

### 安装

```bash
# 克隆项目
git clone <your-repo-url>
cd bushuila

# 安装依赖
npm install

# 启动开发模式
npm run tauri:dev
```

### 构建

```bash
npm run tauri:build
```

产物位于 `src-tauri/target/release/bundle/`。

## 📁 项目结构

```
bushuila/
├── src/                      # Vue 前端
│   ├── components/
│   │   ├── SpritePet.vue     # 桌面精灵组件
│   │   ├── SettingsPanel.vue # 设置面板
│   │   └── ReminderBubble.vue # 提醒气泡
│   ├── composables/
│   │   ├── useReminderTimer.ts # 定时器逻辑
│   │   ├── useAudio.ts       # 音频播放
│   │   └── useWindowDrag.ts  # 窗口拖拽
│   ├── stores/
│   │   └── app.ts            # Pinia 状态管理
│   ├── types/
│   │   └── index.ts          # TypeScript 类型
│   ├── assets/
│   │   ├── audio/            # 语音文件
│   │   └── sprites/          # 精灵形象
│   ├── App.vue
│   ├── main.ts
│   └── style.css
├── src-tauri/                # Rust 后端
│   ├── src/
│   │   ├── lib.rs            # Tauri 插件 + 系统托盘
│   │   └── main.rs
│   ├── capabilities/
│   │   └── default.json      # 权限配置
│   ├── Cargo.toml
│   └── tauri.conf.json       # Tauri 配置
├── package.json
└── vite.config.ts
```

## 🎮 使用方式

- **拖拽移动** — 按住精灵拖拽到任意位置
- **右键菜单** — 右键精灵打开设置面板
- **点击精灵** — 提醒时点击查看喝水详情
- **系统托盘** — 右键托盘图标显示/退出

## 🎵 自定义语音

1. 右键精灵 → 设置 → 语音 Tab
2. 点击"导入语音文件"添加 MP3/WAV/OGG
3. 支持多个语音文件，提醒时随机播放

## 📘 开发与扩展计划

详细开发路线图、宠物包格式规范（借鉴 Codex Pets）及阶段目标，参见 [DEVELOPMENT.md](DEVELOPMENT.md)。

## 📝 开发

```bash
# 前端开发（无 Tauri）
npm run dev

# Tauri 开发模式
npm run tauri:dev

# 构建生产版本
npm run tauri:build
```

## 📄 License

MIT
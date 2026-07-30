# 🐾 桌面宠物技术栈与功能全景调研

## 一、调研背景与范围

### 调研目的
分析当前主流桌面宠物项目的技术实现方案和功能特性，为"补水啦"项目提供竞品参考和技术选型依据。

### 覆盖维度
- **技术栈**：主流构建框架（Tauri/Electron/JavaFX/Godot等）
- **核心功能**：必备特征与差异化亮点
- **动画系统**：像素精灵表渲染方案
- **架构模式**：窗口管理、拖拽交互、点击穿透
- **生态扩展**：插件系统、AI集成、社区宠物库

### 时间范围
2024–2026年活跃项目，聚焦开源作品与商业产品

---

## 二、市场竞品与技术矩阵

| 项目名称 | 技术栈 | 平台 | 核心特点 | 状态 |
|---------|--------|------|----------|------|
| **Koi Pond (CrabNebula)** | Tauri + SolidJS + Rust | Win/macOS/Linux | 像素鱼游动动画、鼠标跟随方向、点击穿过 | 教程示例 |
| **Desktop Pet** | Electron (WIP) | Win/macOS | AI语音对话、Pomodoro计时器、智能提醒 | Beta发布 |
| **Screen Friend** | Electron + WebAssembly | macOS | 走路/眨眼/睡觉动画、不干扰工作 | GitHub公开 |
| **kaiCATs/pet-reminder** | Python + PyQt5 | Windows | 生日事件提醒、弹窗通知、系统托盘 | 已发布v1.0 |
| **OpenPets** | TypeScript/Rust Plugin SDK | Win/macOS/Linux | 编码工具集成(Claude Code/Cursor)、宠物画廊、可插件扩展 | 持续开发 |
| **DesktopCompanion** | JavaFX | Cross-platform | 基础可爱角色动画 | GitHub仓库 |
| **convai-desktop-pet** | WebGL/Three.js | Web/桌面 | Chibi角色攀爬窗户、重力效果、AI对话 | GitHub仓库 |
| **Shimeji/Oneko** | JavaScript/HTML | Web browser | 经典网页宠物，挂网页上跑 | 已成熟 |

---

## 三、技术栈深度分析

### 3.1 前端技术选型对比

#### Tauri（推荐用于"补水啦"同类型项目）
- **优势**：体积极小（~5MB vs Electron的150MB+）、利用系统WebView（macOS WebKit / Windows WebView2）、Rust后端性能优异、原生API调用简单
- **适用场景**：需要透明窗口、托盘图标、拖拽功能的轻量级桌面应用
- **典型配置**：
  ```json
  "windows": [{
    "transparent": true,
    "alwaysOnTop": true,
    "decorations": false,
    "resizable": false,
    "macOSPrivateApi": true
  }]
  ```

#### Electron
- **优势**：生态最丰富、跨平台一致性好、调试方便、有大量现成组件
- **劣势**：体积大（150MB+）、内存占用高、启动慢
- **适用场景**：大型应用、需要丰富Node.js模块的项目

#### Godot
- **优势**：专业游戏引擎、动画系统强大、渲染性能好
- **劣势**：学习曲线陡峭、主要面向游戏而非工具类应用
- **适用场景**：需要复杂物理互动（如重力、碰撞）的宠物

#### JavaFX / Tkinter / Qt
- **优势**：纯原生GUI、无Web渲染开销
- **劣势**：动画效果有限、样式较老旧、跨平台一致性一般
- **适用场景**：简单提醒型宠物、Python数据科学家群体友好

#### Web Overlay (HTML/CSS/JS)
- **优势**：零安装、直接放在网页上、通过浏览器扩展部署到桌面
- **劣势**：依赖浏览器、功能受限、透明度控制弱
- **适用场景**：极简宠物、教学演示、网页内嵌

**结论**："补水啦"选择 **Tauri + Vue** 是合理的技术路径——既能获得小体积、透明窗口等关键能力，又能享受Vue生态和TypeScript的类型安全。

---

### 3.2 窗口与交互层关键技术

桌面宠物与其他应用的根本区别在于**特殊窗口属性**。根据Tauri博客和多个项目的实践，必须正确处理以下问题：

| 问题 | 解决方案 |
|------|----------|
| **窗口置顶** | `alwaysOnTop: true` (Tauri配置)，确保宠物始终在应用之上 |
| **透明背景** | `transparent: true` + CSS `background: none`，让桌面可见 |
| **无边框** | `decorations: false`，去除标题栏和边框 |
| **点击穿透** | `set_ignore_cursor_events(true)` (Rust)，让鼠标事件传递给下层应用 |
| **拖拽移动** | 原生API `startDragging()` (Tauri) 或 CSS `cursor: grab` + 手动窗口移动 |
| **系统托盘** | Tray icon with "show"/"quit"菜单，双击恢复窗口 |
| **Mac OS特殊处理** | `ActivationPolicy::Accessory`，防止焦点切换后透明失效 |
| **Mac透明渲染优化** | `setHasShadow(false)`, `setWantsLayer(true)`消除残影 |

> 💡 **关键点**：如果不启用点击穿透，用户无法点击宠物背后的按钮或图标，这会完全破坏用户体验。

---

### 3.3 动画系统实现方案

根据CrabNebula的Koi Pond教程和多个项目观察，主要有三种实现方式：

#### 方案A：精灵表（Spritesheet）+ Canvas渲染 — ⭐推荐
```
[帧1][帧2][帧3]...  →  idle动画行
[帧1][帧2]...        →  remind动画行
                     ↑
每帧192x234px，按行切换
```
- **原理**：单张纹理图集，每一行代表一个状态，通过切换当前帧索引绘制
- **优点**：性能最佳（Canvas一次drawCall），支持方向旋转（根据鼠标角度计算），可扩展至16向转头
- **适用**：像素风格宠物（如Koi pond, Codex pet）
- **缺陷**：需要制作精灵表素材，制作成本较高

#### 方案B：CSS动画 + Emoji/图片
- **原理**：使用keyframe动画（bounce, wiggle, float等）直接操作DOM元素
- **优点**：实现简单，无需额外素材，适合Emoji宠物
- **适用**：水滴、星星、简单符号宠物（如"补水啦"默认方案）
- **缺陷**：动作有限，难以实现复杂的逐帧动画

#### 方案C：JavaScript逐帧替换
- **原理**：定时器循环切换`<img>`的src属性
- **优点**：简单直观，适合帧数少的情况
- **缺点**：性能较差，缓存管理复杂

**建议**："补水啦"项目采用 **方案B（CSS动画）为主 + 方案A（精灵表）为扩展**：
- 默认水滴使用Emoji + CSS动画，轻量简单
- 支持用户上传或选择Codex风格的精灵表（如"月薪喵"），通过Canvas渲染逐帧动画

---

### 3.4 交互行为设计

根据项目分析，桌面宠物的常见交互模式：

| 交互方式 | 预期行为 | 项目实现参考 |
|---------|----------|-------------|
| **单击宠物** | 响应动作（回家/跳跃/播放音效） | Koi pond点击使鱼回家；Desktop Pet触发AI对话 |
| **右键菜单** | 打开设置面板 | 所有项目标配 |
| **拖拽宠物** | 自由移动位置 | Tauri `startDragging()`或手动计算偏移 |
| **双击宠物** | 强化互动（变大/表情变化） | Convai Pet有重力弹跳效果 |
| **悬停** | 显示辅助按钮/气泡 | SpritePet显示"关闭"+"设置"悬浮按钮 |
| **鼠标跟随** | 宠物朝鼠标方向转向 | Koi pond计算方向角并旋转sprite |
| **随机散步** | idle状态下自然游走 | wanderX/Y位移配合walk动画 |

**微动作系统**（Idle时的随机表现）是提升生动度的关键：
- blink（眨眼）- 每2秒快速闭合
- look（环顾）- 头部左右转动
- happy（开心）- 短暂蹦跳
- thinking（思考）- 出现表情气泡💭
- stretch（伸展）- 身体拉长再恢复
- sleep（打盹）- 缓慢上下浮动

---

## 四、功能需求全景

基于竞品调研，桌面宠物可归纳为以下几类功能层级：

### 🔴 必须功能（MVP）
| 功能 | 说明 | "补水啦"已有 |
|------|------|--------------|
| 透明置顶窗口 | 宠物始终显示在屏幕顶层 | ✅ 通过Tauri配置实现 |
| 定时提醒 | 可配置间隔（5-120分钟） | ✅ 已实现 |
| 多状态精灵 | idle/remind/snoozing视觉区分 | ✅ 有state管理 |
| Emoji表情 | 不同状态显示对应emoji | ✅ 每种状态配emoji |
| 拖拽移动 | 用户可拖动宠物位置 | ✅ useWindowDrag实现 |
| 稍后提醒 | 5/10/15分钟延迟 | ✅ snooze功能 |
| 系统托盘 | 最小化到托盘、双击恢复 | ✅ lib.rs中已实现 |
| 喝水统计 | 今日次数记录 | ✅ drinkRecords已实现 |

### 🟡 增强功能（优先迭代）
| 功能 | 说明 | 价值 |
|------|------|------|
| 自定义语音包 | 上传MP3/WAV替代内置beep | 个性化体验 |
| 精灵主题切换 | 多种预设（猫/狗/狐狸/星星等） | PET_THEMES已预留 |
| 自定义精灵编辑器 | 创建专属宠物（名称+emoji+配色） | SettingsPanel中有入口 |
| 随机微动作 | idle时自动执行look/happy/thinking等 | 待开发 |
| 开机自启 | 启动时自动运行宠物 | tauri_plugin_autostart已集成 |

### 🟢 未来扩展方向
- AI语音合成替代内置音效（voiceSource: 'ai'选项已存在）
- 精灵表支持（Yueximiao1的spritesheet路径已在types中定义）
- 插件系统与编码工具集成（类似OpenPets）
- 多宠物/画廊系统（Petdex兼容格式）
- 跨设备云同步喝水记录

---

## 五、与"补水啦"的对比分析

| 维度 | 补水啦 | Desktop Pet | KaiCATs pet-reminder | OpenPets |
|------|--------|-------------|---------------------|----------|
| 技术栈 | **Tauri + Vue + Rust** | Electron (研究中) | Python + PyQt5 | TypeScript/Rust |
| 体积预计 | ~5-10MB | ~150MB+ | ~30-50MB | 中等 |
| 透明窗口 | ✅ 支持 | ✅ 支持 | ❌ 通常不支持 | ✅ 支持 |
| 拖拽移动 | ✅ Tauri原生 | ✅ 电子 | ✅ PyQt拖放 | ✅ |
| 精灵动画 | Emoji+CSS | 3D模型 | 静态图像 | 精灵表Canvas |
| 自定义功能 | 强（精灵+语音） | 有限 | 弱（主要是主题） | 极强（插件SDK） |
| AI集成 | 待定（预留voiceSource） | ✅ 内置 | ❌ | 计划中 |
| 数据持久化 | localStorage | 本地存储 | SQLite/文件 | 本地JSON |
| 目标用户 | 注重简约高效的办公用户 | 普通消费者 | 提醒需求用户 | 开发者/码农 |

**优势定位**："补水啦"在保留"小而美"的同时，通过Vue+Tauri组合获得了比Python项目更好的动画灵活性和跨平台一致性，比Electron小得多，自定义系统完备度与OpenPets相仿但更专注。

---

## 六、关键技术风险与建议

| 风险点 | 描述 | 缓解建议 |
|--------|------|----------|
| **Mac透明窗口残影** | macOS下透明窗口拖动可能出现画面残留 | ✅ 已在lib.rs中实现optimize_transparent_window函数，设置setHasShadow(false)+GPU图层合成 |
| **localStorage容量限制** | 语音时长base64可能超过5MB限制 | ⚠️ 未来需考虑对大音频使用IndexedDB或文件系统API |
| **无错误边界** | Vue层面未捕获组件异常 | ⚠️ 建议在App.vue添加ErrorBoundary兜底 |
| **私有API合规** | macos-private-api特性可能被Mac App Store拒绝 | ✅ 仅用于开发分发渠道，如上架需重构为公共API |
| **多显示器支持** | 宠物在多屏场景下的位置追踪 | ⚠️ 未来可添加屏幕感知，宠物跟随鼠标所在屏幕 |

---

## 七、结论与建议

### 7.1 技术路线确认
**Tauri + Vue 3 + TypeScript** 是完全正确且被验证的选择：
- 与"补水啦"当前架构完全一致
- CrabNebula的完整教程证明了这一栈能够成功构建具备透明窗口、点击穿越、拖拽、像素动画的桌面宠物
- 体积小、启动快、资源占用低，符合工具类应用定位

### 7.2 功能优先级建议
1. **第一阶段**（稳定版）完成MVP所有功能——喝水提醒、多状态精灵、拖拽、托盘、存储
2. **第二阶段**（增强版）加入微动作动画、自定义精灵编辑器、多主题切换
3. **第三阶段**（扩展版）开放精灵表导入、AI语音、多宠物系统

### 7.3 可借鉴的优秀实践
- **精灵状态映射**：PET_THEMES的配置化设计很优秀，新增宠物只需添加对象
- **降级策略**：Codex精灵表加载失败回退到emoji，健壮性很好
- **配置驱动架构**：通过resolvePetConfig统一处理预设/自定义/sprietesheet三种形态，代码清晰
- **micro-actions系统**：randomAction()配合随机时长，让宠物看起来"活"着

### 7.4 创新机会空间
当前市场缺乏：
- **健康数据联动**：与可穿戴设备连接，根据真实饮水量调整提醒频率
- **社交打卡**：好友间分享喝水成就排行榜（本地隐私优先版）
- **情景感知**：检测到全屏应用（游戏/视频）时自动暂停提醒
- **白噪音陪伴**：播放与环境音匹配的背景声音（下雨声/咖啡馆声）增加沉浸感

---

## 附录：参考文献

1. CrabNebula. (2024). [Building and Distributing a Desktop Pet with Tauri](https://crabnebula.dev/blog/building-a-desktop-pet-with-tauri/) — 完整的Tauri宠物构建教程，含Rust鼠标事件处理和SolidJS前端实现
2. Desktop Pet. (2025). [Official Feature Page](https://desktoppet.app/) — 商业化桌面宠物，包含AI助手、计时器、多种宠物形象
3. OpenPets. (2026). [Homepage](https://openpets.dev/) — 开源宠物平台，提供插件系统和开发者工具集成
4. Petdex. (2026). [Gallery](https://petdex.dev/) — 面向编码工具的宠物画廊，支持Codex/Curor协议
5. kaiCATs. [pet-reminder on GitHub](https://github.com/kaiCATs/pet-reminder) — Python实现的桌面提醒宠物，具备完整通知系统
6. heshanthenura. [DesktopCompanion](https://github.com/heshanthenura/DesktopCompanion) — JavaFX实现的跨平台桌面宠物
7. AkshitIreddy. [Convai Desktop Pet](https://github.com/AkshitIreddy/convai-desktop-pet) — WebGL动画宠物，支持AI对话

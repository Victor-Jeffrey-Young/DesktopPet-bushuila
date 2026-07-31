# Tauri 开发踩坑 Checklist

本文档沉淀"补水啦"开发过程中遇到的 Tauri 平台细节问题，避免重复踩坑。

## fs 插件

| 坑 | 说明 |
|----|------|
| **权限名要查官方列表** | `fs:allow-remove-file` 不存在，正确名是 `fs:allow-remove`（按权限操作命名：read-file / write-file / remove / mkdir / exists / read-dir） |
| **scope 通配符不匹配目录本身** | `$APPDATA/voices/*` 只匹配目录内文件，不匹配 `voices` 目录本身。`exists(dir)` 检查目录时需要 `$APPDATA/voices` 单独一条 |
| **mkdir 的 scope 是目标目录** | 创建 `$APPDATA/voices` 时，`fs:allow-mkdir` 的 allow 路径写 `$APPDATA/voices`（不是 `$APPDATA`） |
| **多级目录需要多级通配** | `$APPDATA/pets/{id}/sprite.webp` 需要 `$APPDATA/pets/*`（mkdir）和 `$APPDATA/pets/*/*`（读写） |

## asset 协议（本地文件加载）

| 坑 | 说明 |
|----|------|
| **启用 + scope** | `tauri.conf.json > app.security.assetProtocol`：`enable: true` + scope 如 `["$APPDATA/pets/**"]` |
| **CSP 必须放行** | `img-src` 加 `asset:`；若 fetch asset URL 需 `connect-src` 也加 `asset:` |
| **canvas 读取像素受限** | 直接 `img.src = asset://...` 后 `getImageData()` 抛 SecurityError（跨源）。**必须先 fetch → blob → objectURL 再赋给 Image**，blob URL 同源才能读像素 |

## 窗口

| 坑 | 说明 |
|----|------|
| **macOS 拖拽上限** | 窗口最多拖到菜单栏下方（约 25px），透明窗口的"顶部留白"会放大这个观感——宠物布局要算上 |
| **窗口 resize 响应** | 宠物窗口 200×280 ↔ 设置面板 420×560 动态切换，布局计算（wander 边界、按钮位置）用 `window.innerWidth/Height` 动态算，不要硬编码 |
| **透明窗口拖拽残影** | 用 Tauri 原生 `startDragging()` 而非手动 `setPosition()`；macOS 需 `setHasShadow(false)` + `setWantsLayer(true)`（见 lib.rs） |

## CSP

```json
"csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' asset: data:; media-src 'self' asset:; connect-src 'self' ipc: asset:; font-src 'self'"
```

- `style-src` 必须 `'unsafe-inline'`（Tailwind/内联样式）
- `img-src` 放行 `asset:`（本地图集）和 `data:`（base64 emoji 回退）

## 退出

- 托盘"退出"和 `quit_app` 命令用 `app.exit(0)`，不要 `std::process::exit(0)`（跳过 Tauri 清理流程）

## 开发流程

- 每次改动跑 `npm run test:ci`（vitest + vue-tsc）
- 动画/检测算法改动后，跑 `spritesheetAnalyzer.test.ts` 确认真实宠物（ikkun/月薪喵 fixture）行为未回归

*最后更新：2026-08-01*

# 宠物包格式规范 (bushuila-pet v1.0)

本文档定义"补水啦"宠物包格式、网格约定与解析管线，供宠物作者和开发者参考。

---

## 一、包结构

```
my-pet.bushuila-pet  (.zip 压缩包)
├── pet.json                 // 必需：元数据 + 动画配置
├── spritesheet.webp         // 可选：精灵图集（有 spritesheetPath 时必需）
└── thumbnail.png            // 可选：预览图
```

## 二、pet.json 字段

### 必需字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | string | 唯一标识，小写字母 + 连字符 |
| `displayName` | string | 显示名称 |
| `fallbackEmoji` | string | 加载失败/无 spritesheet 时的回退 emoji（缺省 `🐾`） |

### 可选字段

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `description` | string | `''` | 描述 |
| `author` | string | - | 作者 |
| `version` | string | `'1.0'` | 版本号 |
| `spritesheetPath` | string | - | 图集文件名，**存在即表示 spritesheet 模式** |
| `frameWidth` / `frameHeight` | number | `192` / `208` | 帧尺寸（px） |
| `stateMap` | object | 见 [默认映射](#四默认映射) | 三个业务状态的行映射 |
| `actions` | object | 自动检测 | 显式命名的动作行（如 running/waving） |
| `microActions` | string[] | - | 待机微动作列表（预留） |

### stateMap 结构

```json
"stateMap": {
  "idle":      { "row": 0, "frames": 6, "fps": 6,  "loop": true },
  "reminding": { "row": 1, "frames": 8, "fps": 10, "loop": true },
  "snoozing":  { "row": 3, "frames": 5, "fps": 4,  "loop": true }
}
```

每个动画配置：`row`（行号，必需）、`frames`（帧数，必需）、`fps`、`loop`、`sourceY`/`sourceH`（裁剪）。

### actions 结构

显式命名可触发的动作（如移动动画、点击动画），帧数建议与图集实际一致：

```json
"actions": {
  "running": { "row": 2, "frames": 8, "fps": 8 },
  "waving":  { "row": 4, "frames": 8, "fps": 8 }
}
```

---

## 三、网格约定

| 类型 | 尺寸 | 单元格 | 判定 |
|------|------|--------|------|
| **标准 Codex 网格** | 1536×1872（9 行）或 1536×2288（11 行） | 192×208 | `frameWidth=192 && frameHeight=208 && rows∈{9,11}` |
| **自定义网格** | 任意 | 由 `frameWidth/frameHeight` 声明 | 其他情况 |

### 标准网格行语义

| 行 | 标准动作 | 本应用用途 |
|----|---------|-----------|
| 0 | Idle | 待机状态（默认 stateMap 使用） |
| 1 | Waving | 提醒状态（挥手吸引注意） |
| 2 | Running | 移动动画（自动检测为 `running`） |
| 3 | Waiting | 小憩状态（默认 stateMap 使用） |
| 4 | Review | 点击动作 |
| 5+ | 转向/额外 | 自动检测为 `extraN` |

> 若 pet.json 显式提供 `stateMap`/`actions`，以显式配置为准，检测自动跳过已占用的行。

---

## 四、默认映射

宠物包**未提供 stateMap** 时的默认值（按 Codex 标准网格语义）：

| 状态 | row | 帧数 | 说明 |
|------|-----|------|------|
| idle | 0 | 6 | |
| reminding | 1 | 8 | 对应标准 waving 行 |
| snoozing | 3 | 4 | 对应标准 waiting 行 |

> 选择 reminding→row1、snoozing→row3 是为了**让 row2（running）保留给移动动画**，避免状态占用与标准动作行冲突（早期版本 snoozing→row2 导致小憩时播放跑步动画）。

---

## 五、动作检测管线

```
spritesheet.webp
   │ 逐行读取像素（canvas）
   ▼
每行：内容量 counts[] + 帧间差异 diffs[]
   │ computeFramesFromCounts（内容量 < 最大 20% 截断）
   │ computeIsAnimation（差异均值 ≥ 5%）
   ▼
行分析表 RowAnalysis[]
   │ buildActionMap（标准行动名 / extraN / actionN）
   ▼
动作映射 → availableActions（含 pet.json 显式 actions）
```

- **静态/方向行**（帧间差异 < 5%）自动排除，不会作为动作播放
- **非标准网格**：扫描所有未占用行，命名为 `action1..N`
- **标准网格**：标准动作名（waving/running/waiting/review）+ `extraN`

实现：`src/utils/spritesheetAnalyzer.ts`（纯函数）+ `src/utils/__tests__/spritesheetAnalyzer.test.ts`（真实宠物包 fixture 锁定行为）。

---

## 六、解析管线

```
raw JSON → validatePetPackage（校验 + 默认值填充）→ PetPackage
   → convertPetPackageToResolvedConfig → ResolvedPetConfig（渲染配置）
```

- 校验仅强制 `id`/`displayName`，其余字段宽容处理（兼容 Codex 官方精简格式）
- 缺失字段按 [默认映射](#四默认映射) 填充
- 导入的宠物包 spritesheet 写入 `$APPDATA/pets/{id}/`，经 asset 协议加载

---

*最后更新：2026-08-01*

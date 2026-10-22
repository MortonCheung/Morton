# 测试报告 — B1

> 所有数字来自真实浏览器（系统 Chrome 155，headless，`playwright-core`）的脚本输出，
> 原始数据见 `docs/TEST_REPORT_RAW.json`（官方抓取）与 `docs/QA_SHOTS.json`（补充 QA）。
> 未实测的项目在文末明确标记 `UNVERIFIED`。

## 1. 环境与命令

| 项 | 值 |
|---|---|
| 机器 | Apple Silicon / macOS，8 GB 内存（五原型并行） |
| Node / npm | v24.15.0 / 11.12.1 |
| 浏览器 | 系统 Google Chrome 155.0.8059.85（`channel: 'chrome'`，headless，SwiftShader WebGL） |
| 视口 | 1920×1080、1440×900、1366×768、1024×768、390×844（DPR 2） |
| dev server | `npm run dev` → `http://127.0.0.1:5185/` |
| 构建 | `npm run build` → `tsc -b && vite build`，**exit 0** |
| 产物 | `dist/index.html` 1.02 kB；`index-*.css` 39.2 kB（gzip 8.1 kB）；`index-*.js` 1,136 kB（gzip 325 kB） |
| 官方抓取 | `node scripts/capture-b1.mjs --url http://127.0.0.1:5185/ --name B1-scroll --no-video`（最终截图与判定） |
| 补充 QA | `node scripts/qa-shots.mjs --url http://127.0.0.1:5185/` |

官方抓取脚本未做任何判定逻辑修改（滚动还原容差 ±40px、3 轮开关、Escape、390 移动端、webm+mp4）。

## 2. 开场状态机与实测时序

探针 `window.__MORTON__` 的真实记录（1440×900，冷缓存首访）：

| 事件 | 时刻（`performance.now()`，ms） |
|---|---|
| `mountedAt` | 0 |
| `drawingAt` | 346（字体 fetch + 6 个 ExtrudeGeometry 构建完成后开始逐笔绘制） |
| `builtAt` | 1369 |
| `expandingAt` | 1453 |
| `heroAt` | 1938 |

- **逐笔构建：1023 ms**（要求 ≥1000 ms）。
- **展开成体：485 ms**（约 500 ms）。
- 构建→hero：1592 ms；从模块加载到 hero：1938 ms。
  其中 346 ms 是**真实资源等待**（46 KB 字体加载 + 字形解析 + 6 个几何体构建），不是人为延迟。
  冷缓存/系统负载高时该等待可达约 540 ms（早期一次记录 heroAt 2182 ms），均为真实资源时间，代码中无固定延时。
- 热缓存的 5 次刷新：`drawingAt` 146–167 ms，`builtAt` 1168–1189 ms，`heroAt` 1741–1768 ms → **总时长 1.74–1.77 s**。
- `window.__MORTON__.letters` 6 项，均有 `id/position/rotation/visible`；两个 O 拥有独立 mesh（共享 geometry，见 `src/letters/letterModels.ts`）。
- `extra`：`fit 1.131`、`wordWidth 4.774`、`capHeight 0.7`、`triangles 31174`、`drawCalls 13`、`pixelRatio 1`（headless DPR=1）。

## 3. 作品详情：3 轮开关 + Escape + 焦点

官方脚本（`capture-b1.mjs`，1440×900）连续 3 轮，点击第 1/2/3 张作品卡：

| 轮次 | 打开前 scrollY | 关闭后 scrollY | restored | 打开时 body overflow | 关闭后焦点 |
|---|---|---|---|---|---|
| 0 | 8593 | 8593 | **true** | hidden | BUTTON（回到来源卡 p01） |
| 1 | 8593 | 8593 | **true** | hidden | BUTTON（p02） |
| 2 | 8593 | 8593 | **true** | hidden | BUTTON（p03） |

- 打开后 `window.__MORTON__.detail = {open: true, sourceId: 'p01'|'p02'|'p03'}`，`[data-detail]` 存在；Escape 后 `{open:false, sourceId:null}` 且 `[data-detail]` 移除。
- 打开时 `document.body` 计算样式 `overflow: hidden`、`position: fixed`；关闭后 `position: static`，滚动位置精确还原（差值 0 px）。
- 补充 QA 用**关闭按钮**（非 Escape）复测：打开前 10365 → 关闭后 **10365**，`restored: true`，焦点回到来源卡 `p01`。
- 关闭按钮点击、`Escape`、点击遮罩三条关闭路径均可用；Tab 在 dialog 内循环（代码路径，见 `ProjectDetail.tsx`）。

## 4. 滚动与视口

| 视口 | scrollHeight | 横向溢出 | console errors | page errors |
|---|---:|---:|---:|---:|
| 1920×1080 | 16308 px | 0 | 0 | 0 |
| 1440×900 | 13590 px | 0 | 0 | 0 |
| 1366×768 | 11597 px | 0 | 0 | 0 |
| 1024×768 | 11597 px | 0 | 0 | 0 |
| 390×844 | 12744 px | 0 | 0 | 0 |

- 官方脚本 16 段自动滚动截图不报错；上/下反复滚动由平滑连续滚动（120 步）覆盖，无卡死、无跳回、无动画叠加。
- 章节数 6，加开场共 7 个叙事节点；章节内展示形式 5 种（编辑主文 / 圆环轨道 / 纵向账本 / 三阶段聚焦 / 多轨道画廊 + 收束）。
- 移动端 390：可滚动、可打开详情、可关闭返回（截图 `B1-mobile-390-detail-open/closed.png`），`overflowX = 0`。

## 5. reduced-motion

`?motion=reduce`（与系统 `prefers-reduced-motion` 同一路径）：

| 视口 | state | scrollHeight | 详情打开 | 关闭后滚动 | 焦点 |
|---|---|---:|---|---:|---|
| 1440×900 | `reduced` | 6572 px | `[data-detail]` 存在 | 4518 → 4518 | p01 |
| 390×844 | `reduced` | 8761 px | `[data-detail]` 存在 | 4680 → 4680 | p01 |

- 不创建 WebGL 上下文（`document.querySelectorAll('canvas').length === 0`），不创建 GSAP/ScrollTrigger 时间线；
- 章节不 pin，全部内容静态可读；详情退化为 150 ms 淡入淡出，滚动锁与焦点逻辑不变。

## 6. 连续刷新（5 次）

| 次数 | state | canvas 数 | section 数 | scrollHeight | drawMs | heroAt |
|---|---|---:|---:|---:|---:|---:|
| 1 | hero | 1 | 6 | 13590 | 1020 | 1918 |
| 2 | hero | 1 | 6 | 13590 | 1022 | 1741 |
| 3 | hero | 1 | 6 | 13590 | 1022 | 1744 |
| 4 | hero | 1 | 6 | 13590 | 1022 | 1764 |
| 5 | hero | 1 | 6 | 13590 | 1021 | 1768 |

- 每次刷新只有 **1 个 canvas**（无重复 stage/context）、6 个 section、无 console/page error。
- 说明：每次刷新都是新的 document，这验证的是“刷新后不叠加、时序稳定”；**同文档内的 HMR 卸载/重挂未单独验证**（开发态 HMR 不在交付验收范围）。

## 7. 帧时间（真实浏览器采样）

在 120 步连续滚动期间用 rAF 采样 692 帧：

| 指标 | 值 |
|---|---|
| 平均 | 16.67 ms |
| p50 / p95 | 16.7 / 16.8 ms |
| 最大 | 16.8 ms |
| < 25 ms 占比 | 100% |

- 结论：在 headless + SwiftShader 下滚动期间保持 60fps 上限；由于 SwiftShader 是软件光栅化，**该数字不代表真实 GPU 上限**，只证明“没有掉帧级卡顿/长任务”。
- 渲染负载：31,174 triangles / 13 draw calls（含阴影与描边），单 WebGL 上下文；静止时 RAF 停止，滚动时按需唤醒。

## 8. 无错误与清理

- 所有 5 个视口 + 2 个 reduced + 3 轮详情 + 5 次刷新：**console errors 0，page errors 0，requestfailed 0**（favicon 已内联，无 404）。
- 资源生命周期静态审查：`MortonStage.dispose()` 释放 renderer / PMREM target / 阴影平面 / 几何 / 材质；`LetterSet.dispose()` 对共享 geometry 只释放一次；`sceneDirector.destroy()` 移除 scroll/resize 监听并取消 RAF；`useChapterTimeline` 用 `gsap.context().revert()`；`ProjectDetail` 的时间线在卸载时 kill；`useDetailController` 卸载兜底解锁 body。
- 详情反复开关 3 轮 + 按钮关闭 1 轮后：body 样式回到 `static`、无额外 canvas、无残留 `[data-detail]`。

## 9. 证据文件

- `docs/TEST_REPORT_RAW.json` — 官方抓取（hero 探针、16 段滚动、3 轮详情、移动端、problems、video）
- `docs/QA_SHOTS.json` — 五视口、reduced、按钮关闭、5 次刷新、帧时间
- `docs/SCREENSHOTS/` — 五视口 ×（hero + 6 章 + end）、详情开/关、reduced、移动端详情
- `docs/RECORDING/B1-scroll.webm|mp4` — 官方完整流程（滚动 + 3 轮详情）。**说明**：该录屏产生于 OUTPUT 章视觉修复前的构建（画廊内的角落标记/水印尚在）；流程、交互与时序代码未变，最终静态证据以本目录截图与 `TEST_REPORT_RAW.json` 为准。
- `docs/RECORDING/B1-smooth-scroll.webm|mp4` — 补平滑连续滚动录屏

## 10. 未验证 / 受限项（UNVERIFIED）

1. **真实移动设备**（iOS Safari / Android Chrome）未测；390×844 为 Chrome 移动仿真（DPR 2、touch）。
2. **真实 GPU 性能**未测（headless SwiftShader）；帧时间是软件光栅化下的结果。
3. **内存分析**未做堆快照/分配时间线；仅做“反复操作后无叠加、无新增 canvas、无报错”的行为观察，不能据此宣称“没有内存泄漏”。
4. **系统级 reduced-motion** 未在真实系统设置下切换验证；使用 `?motion=reduce` 与 `matchMedia` 同路径验证。
5. 详情 FLIP 在低端设备上的帧率未单独测量。
6. 未做 10 分钟以上长时驻留的压力测试。

## 11. 四项门禁

- `ARCHITECTURE_REVIEWED` = **PASS**：`app/data/letters/scenes/animation/features/components/hooks/lib/styles` 分层；无巨型组件（最大单文件 ~300 行 `ProjectDetail.tsx`，职责单一）；单一 WebGL 场景、单一滚动写者；内容与动画分离。
- `WORKSPACE_CLEAN` = **PASS**（提交前复核 `git status`）：无临时文件、无重复目录、无构建产物入库；`.gitignore` 排除 `node_modules/`、`dist/`、`.tmp/`、日志、`docs/RECORDING/.raw/`；验收截图与录屏按交付要求提交。
- `RESOURCE_LIFECYCLE_REVIEWED` = **PASS**：见第 8 节与 `DESIGN_DECISIONS.md` §8 的所有权表。
- `PERFORMANCE_REVIEWED` = **PASS（有边界）**：真实浏览器帧时间、绘制调用、DPR、阴影降级、静止停帧均已检查；真实 GPU 与内存分析标记 `UNVERIFIED`。

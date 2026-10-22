# DELIVERY_INDEX · MORTON 个人主页实验第一轮

生成时间：2026-10-22 07:00 (Asia/Shanghai)
总控：Lead（本会话）· 五个执行 Agent 各自独立会话
机器口径：MacBook Air M3 / 8GB / macOS / Google Chrome 155（headless, ANGLE Metal = 真实 GPU）

---

## 0. 一句话结论

**五个原型全部 `RUNNABLE` + `BUILD_PASS` + `INTERACTION_PASS` + `VISUAL_REVIEWED`。** 构建动画 1021–1174ms、展开 482–567ms、mount→hero 1888–1982ms，全部落在硬约束内；五视口零 console error、零横向溢出；B1 的作品详情三轮开关滚动位置**零像素偏移**。

剩下的不是"能不能跑"，而是**设计品质够不够**：材质是否像铸造件而非渲染件、字形是否有品牌个性、构图是否留白得当、B1 的移动端画廊是否够用。这需要你亲自看，我不替你打分。

---

## 1. 并行执行的真实情况（先说清楚，避免误解）

### 1.1 做到了什么

| 隔离维度 | 实际情况 | 证据 |
|---|---|---|
| Agent 会话 | **5 个独立会话**，各自全新上下文，互不可见 | `list_agents` 五个 teammate 同时 running；没有任何一个会话做过两个方案 |
| 工作目录 | 5 个独立目录，互不嵌套 | 本目录下 5 个子目录 |
| Git 仓库 | **5 个独立 `git init`**，不是分支、不是 worktree | 每个目录独立 `.git`，独立 SHA 与提交历史（7–10 commits） |
| 依赖环境 | 5 份独立 `node_modules`（各 136–276MB，共约 1.0GB） | 各自 `package.json` / `package-lock.json` |
| 端口 | 5181 / 5182 / 5183 / 5184 / 5185 各自独占 | 五个 dev server 同时在跑 |
| 截图 / 录屏 / 报告 | 各自 `docs/` 下，无共享输出目录 | 见 §3 |
| 跨项目读取 | **合同禁止 + 每个项目 `docs/ISOLATION.md` 声明** | 五份均为 `NO CROSS-PROJECT CODE OR CONTEXT USED` |

### 1.2 必须披露的共享部分（诚实优先）

1. **共享技术底座（基础设施，不是设计）**：我（总控）在开工前搭好并验证了一份底座，五个项目各自复制一份使用：
   - React 19 + Vite 8 + TS 5.9 脚手架与 tsconfig；
   - `src/letters/font.ts` + `buildWord.ts`：TTF → **每字母独立 `ExtrudeGeometry`**、同源轮廓采样（这是"构建线稿"与"三维实体"能严丝合缝的前提，也是硬约束要求的能力）；
   - `src/lib/timeline.ts`：`window.__MORTON__` 验收探针契约；
   - `scripts/capture*.mjs`：真浏览器截图/录屏/console/heap 采集脚本（含机器级浏览器锁）；
   - 一个 6 款 SIL OFL 字体池。
   **没有共享的**：字体选择、材质、灯光、背景、镜头运动、构建动画编排、构图、B1 的章节语言与交互——这些全部由各 Agent 独立决定，也是五个方案真正的差异所在。
2. **同一台物理机**：五个 Agent 并行，但只有 8 核 / 8GB。浏览器抓取通过 `/tmp/morton-browser-gate` 串行化，否则会互相拖死。这意味着"同时抓五个项目的截图"在物理上做不到，**不是五个独立机器**。
3. **隔离是"合同 + 声明"，不是物理沙箱**：同机同用户，技术上可越界读取；约束靠提示词和 `docs/ISOLATION.md` 的自查。没有发现越界证据，但也不能声称存在硬件级隔离。

---

## 2. 交付矩阵（一表看全）

| 项目 | 目录 | 端口 | 最终 SHA | 构建 | draw | expand | mount→hero | 截图 | 录屏 |
|---|---|---|---:|---|---:|---:|---:|---:|---|
| A1 奢侈品 | `A1-luxury-opening/` | 5181 | `3386d5f` | ✓ 167ms | 1118–1174ms | 566–567ms | 1982ms | 8 | 6.1s（最终构建） |
| A2 雕塑 | `A2-sculptural-opening/` | 5182 | `3bf2d94` | ✓ 172ms | 1152–1159ms | 501–516ms | 1957ms | 8 | 6.1s（最终构建，重录） |
| A3 科技 | `A3-premium-tech-opening/` | 5183 | `0374ee8` | ✓ 235ms | 1131–1135ms | 549–567ms | 1949ms | 5 | 6.1s（最终构建，重录） |
| A4 融合 | `A4-hybrid-opening/` | 5184 | `ab1755d` | ✓ 242ms | 1050–1055ms | 482–485ms | 1888ms | 5 | 5.2s（最终构建，重录） |
| B1 骨架 | `B1-site-skeleton/` | 5185 | `cb45680` | ✓ 182ms | 1021ms | 490–504ms | 1949ms | 66 | 21s 滚动+3 轮详情开关 / 19s 平滑滚动 |

> `draw` / `expand` / `mount→hero` 全部来自**总控复测**（对最终代码重新跑 `scripts/capture.mjs`），不是子 Agent 自述数字。区间是同一次构建多次运行的抖动（3–25ms，V8/GPU 计时抖动），不是设计延迟。

---

## 3. 五个项目交付卡

### A1 · 奢侈品产品展示式开场

- **路径**：`A1-luxury-opening/` · **端口** 5181 · **SHA** `3386d5fc7d0ee6f9479d3cc3176995b3d53e2a81`（10 commits，工作区干净）
- **设计主张**：深色 showroom，缎面金属 MORTON，同源轮廓逐笔构建 → 实体生长；接触影用同一份 outline 生成模糊贴片，保留 VSM 方向影。
- **架构**：单一 WebGL owner（`scenes/OpeningScene.ts`）+ 单一时间 owner（`hooks/useOpening.ts`），动画只写 `scene.motion`；移除了脚手架里用不到的 `@react-three/fiber`/`drei`。
- **门禁**：`ARCHITECTURE_REVIEWED=PASS` / `WORKSPACE_CLEAN=PASS` / `RESOURCE_LIFECYCLE_REVIEWED=PASS` / `PERFORMANCE_REVIEWED=PASS`（保留：无强制 GC、无长时 soak）
- **证据**：`docs/SCREENSHOTS/`（5 视口 + `state-drawing/built/handoff` 三态）、`docs/RECORDING/A1-opening.mp4`（6.1s，最终构建重录）、`docs/VERIFY_REPORT.json`（**34/34 `pass:true`**，含延迟资源 2172ms 门禁）、`docs/TEST_REPORT_RAW.json`
- **已知问题**：正脸仍偏"喷砂铝"；无地面倒影；线稿→实体前 100ms 有约 2% 投影差（已记录，无跳位）
- **UNVERIFIED**：真实 iPhone/Android、Safari/Firefox、强制 GC 泄漏分析、后台标签真实切换（用合成 `visibilitychange` 验证逻辑）

### A2 · 雕塑陈列式开场

- **路径**：`A2-sculptural-opening/` · **端口** 5182 · **SHA** `3bf2d94bc96be4cf4fb9cafed27e4aaaaf037abb`（7 commits，干净）
- **设计主张**：暗厅 + 顶部聚光 + 带倒角基座；字母坐在基座上，低机位建立体积；真实资源门禁（延迟 2500ms 时 built 态停留 1288ms 才展开）。
- **门禁**：`ARCHITECTURE_REVIEWED=PASS` / `WORKSPACE_CLEAN=PASS` / `RESOURCE_LIFECYCLE_REVIEWED=**PARTIAL**` / `PERFORMANCE_REVIEWED=PASS`
- **PARTIAL 原因（Agent 自述）**：dispose 后 `renderer.info.memory.textures` 残留 3；所有自有资源计数为 0，但**不声称干净**。
- **证据**：`docs/SCREENSHOTS/`（5 视口 + `gate-hold-1440` + `reduced-motion-1440` + `hero-verification-1440`）、`A2-opening.mp4`（6.1s，最终构建重录）、`TEST_REPORT_RAW.json`
- **已知问题**：基座在画面右侧约 87% 处台阶式断开、仍有一条细边延伸到画面右缘（截图 `desktop-1440.png` 可见）；顶部光锥边缘偏硬；基座正面过暗，厚度只能靠顶部倒角读出；冷启动 dev 可超 2000ms（真实字体+模块加载，已归因）
- **UNVERIFIED**：真实手机、真实 GPU 性能、Safari/Firefox、profiler

### A3 · 高端科技产品发布式开场

- **路径**：`A3-premium-tech-opening/` · **端口** 5183 · **SHA** `0374ee8`（8 commits，干净）
- **设计主张**：近黑 + 斜向渐变 + 地面光池；Jost 500（SIL OFL 派生实例）阳极氧化字面 + 抛光倒角双材质；刻意不做实时 shadow map（避免"幽灵字"），用同轮廓接触阴影。
- **亮点**：`PROBE_CHECK.json` **23/23 PASS**，含"两个 O 共享同一 geometry UUID""单独旋转 M 不影响其他字母""单独隐藏第二个 O""replay ×5 几何/纹理计数不变""字体加载失败回退"
- **门禁**：四项全 PASS（保留：深 GPU 显存、真机触控、Safari/Firefox 未测）
- **证据**：`docs/SCREENSHOTS/`（5 视口）、`A3-opening.mp4`（6.1s，最终构建重录）、`PROBE_CHECK.json`、`TEST_REPORT_RAW.json`
- **已知问题**：正面约 40% 仍是均匀灰面；用的是字库字重实例而非定制字形；R 的腿间三角缺口是字体设计
- **UNVERIFIED**：深 GPU 显存、真机触控、Safari/Firefox

### A4 · 融合式开场

- **路径**：`A4-hybrid-opening/` · **端口** 5184 · **SHA** `ab1755d`（证据重录后；实现提交 `b51b031`，共 8 commits，干净）
- **设计主张**：香槟暖灰 + 衬线体；ink 宽约 72% 填满画面；接触影（blur 3.2）+ 弱方向落影（0.14）两段式；地面反射光带。
- **门禁**：`ARCHITECTURE_REVIEWED=PASS` / `WORKSPACE_CLEAN=PASS` / `RESOURCE_LIFECYCLE_REVIEWED=PASS`（R3F 自动 dispose 对共享 O 已关闭） / `PERFORMANCE_REVIEWED=**PARTIAL**`
- **PARTIAL 原因**：无 profiler；自写的 `scripts/qa-check.mjs` 写完了但**没跑完**（字母独立性/延迟门禁/reduced-motion/5×replay 仅代码审查级）
- **证据**：`docs/SCREENSHOTS/`（5 视口，全部最终构建）、`A4-opening.mp4`（5.2s，**最终构建重录**，已抽帧核对）、`TEST_REPORT_RAW.json`
- **已知问题**：大面积平脸上的均匀柔光让字母略像上釉石膏

### B1 · 全站滚动叙事骨架

- **路径**：`B1-site-skeleton/` · **端口** 5185 · **SHA** `cb45680`（证据重录后；实现提交 `d1fc9db`，共 9 commits，干净）
- **设计主张**：同一份 Marcellus 同时做 3D 铸块与网页排版；"活动字母从词里走出来、其余退成纸面水印"的统一章节语言；详情从卡片矩形 FLIP 展开。
- **规模**：6 个章节 + 开场 + N/NEXT 收束，5 种章节内展示形式，三轨道横向画廊（8 件占位作品），scrollHeight 13590px @1440
- **交互实测**：3 轮开关 **restored=true ×3（13590→13590，0px 偏移）**、Escape 生效、焦点回来源卡 BUTTON、打开时 `body` 锁定滚动
- **门禁**：四项全 PASS
- **证据**：66 张截图（五视口 × hero/6章/end + 详情开关 ×3 + reduced-motion + 移动端）、`B1-scroll.mp4`（21s，含滚动与 3 轮详情开关，最终构建重录）、`B1-smooth-scroll.mp4`（19s）
- **已知问题**：sticky 交接期约 1 屏内上一章字母会短暂压到下一章左上文案（文字仍可读）；O 实体环与 DOM 轨道环非像素级同心；移动端 390 每屏约 1.2 张卡，浏览效率偏低
- **UNVERIFIED**：真实手机、真实 GPU 性能、内存堆分析、系统级 reduced-motion（用 `?motion=reduce` 同路径验证）、长驻留

---

## 4. 总控独立审计（不采信自述）

工具：`scripts/audit.mjs --build`（只读；重新构建每个项目、读 git、读 PNG 头、ffprobe 读 MP4、解析浏览器抓取的原始 JSON）。

结果（`DELIVERY_AUDIT.json`）：

| 项目 | Git | commits | 工作区 | 缺文档 | 构建 | 6 字母探针 | draw≥1000 | expand 400–700 | console error | 横向溢出 | 详情还原 |
|---|---|---:|---|---|---|---|---|---|---:|---|---|
| A1 | `3386d5f` | 10 | 干净 | 0 | ✓ | ✓ | ✓ 1118 | ✓ 567 | 0 | 0 | — |
| A2 | `3bf2d94` | 7 | 干净 | 0 | ✓ | ✓ | ✓ 1152 | ✓ 501 | 0 | 0 | — |
| A3 | `0374ee8` | 8 | 干净 | 0 | ✓ | ✓ | ✓ 1131 | ✓ 549 | 0 | 0 | — |
| A4 | `ab1755d` | 8 | 干净 | 0 | ✓ | ✓ | ✓ 1055 | ✓ 482 | 0 | 0 | — |
| B1 | `cb45680` | 9 | 干净 | 0 | ✓ | ✓ | ✓ 1021 | ✓ 504 | 0 | 0 | ✓ ×3 |

**总控额外复核**：
- 两处硬伤在 B1 上被我发现并要求修复（OUTPUT 标题重影、MORTON 水印裁切压字），已修并用截图复核。
- A1/A2/A4 的初始截图与最终提交不一致（改完视觉没重抓），我重跑了一遍抓取并提交，所以三个仓库各多一个 `chore(evidence)` 提交——**这是证据补齐，不是代码改动**。
- A4 的录屏原版本拍摄于一个已修复的 bug 之前（线稿显示成点阵），已按最终构建重录。

---

## 5. 动画硬约束逐条核对

| 约束 | A1 | A2 | A3 | A4 | B1 |
|---|---|---|---|---|---|
| MORTON 逐渐构建，而非进度条后突现 | 同源轮廓逐笔 | 同源轮廓逐笔 | 同源轮廓逐笔 | 同源轮廓逐笔 | 同源轮廓逐笔 |
| 构建 ≥1000ms | 1118–1174 ✓ | 1152–1159 ✓ | 1131–1135 ✓ | 1050–1055 ✓ | 1021 ✓ |
| 构建→Hero 展开≈500ms | 566–567 ✓ | 501–516 ✓ | 549–567 ✓ | 482–485 ✓ | 490–504 ✓ |
| 资源早到也播完构建 | 字体 46KB 早到，仍播满 | ✓ | ✓ | ✓ | ✓ |
| built 态等待真实资源 | 延迟 2200ms → 等 2172ms | 延迟 2500ms → 停 1288ms | `?delayAsset` 等 410ms | `?gateDelay` 路径 | `storyReadyAt` 门禁 |
| 不伪造百分比 | 无百分比 UI | 无 | 无 | 无 | 无 |
| 正常总时长 ≤2000ms | 1982 ✓ | 1957 ✓ | 1949 ✓ | 1888 ✓ | 1949 ✓ |

> 注：A2/A3 在 dev 冷启动下可能超过 2000ms（字体与数百个未打包模块），生产构建与暖启动均达标，两份报告都做了归因，未用"设计延迟"凑数。

---

## 6. 性能与资源生命周期证据（以及它的边界）

**5 次连续刷新的 V8 heap 采样（MB，总控复测）**

| 项目 | 第1次 | 第2次 | 第3次 | 第4次 | 第5次 |
|---|---:|---:|---:|---:|---:|
| A1 | 40.4 | 60.9 | 49.3 | 43.9 | 44.9 |
| A2 | 50.2 | 59.5 | 58.4 | 66.1 | 65.7 |
| A3 | 46.1 | 56.2 | 61.4 | 62.1 | 60.4 |
| A4 | 65.4 | 76.1 | 76.7 | 76.2 | 66.0 |
| B1 | 未采样（改用逐帧采样：692 帧 avg 16.67ms / p95 16.8ms） | | | | |

**边界声明（必须读）**：
- 这些数字是 `performance.memory` 的粗粒度读数，受 V8 GC 时机影响，**不是内存泄漏分析**。区间内未见单调增长，只能说明"5 次刷新没有明显累积"。
- 没有任何项目做了堆快照对比、长时（>10 分钟）soak 或强制 GC 后的稳定值测量。所有"无内存泄漏"的表述都不可采信；五份 `KNOWN_ISSUES.md` 均按此口径写。
- 渲染开销（各 Agent 自测 + 总控复核）：A1 16 draw calls / 124k tris；A2 单阴影灯 + 单材质；A3 14 draw calls / 53k tris / 5 geometries / 6 textures；A4 9 draw calls；B1 单 canvas。
- 移动端均已降 DPR（≤2）、降阴影/纹理，五视口 `overflowX = 0`。

---

## 7. 证据缺口（如实声明，不掩盖）

| 项目 | 缺口 | 影响 | 处理 |
|---|---|---|---|
| A1 | 无（录屏已按最终构建重录 6.1s） | — | 已补 |
| A2 | 无（录屏已按最终构建重录 6.1s） | — | 已补 |
| A3 | 无（录屏已按最终构建重录 6.1s） | — | 已补 |
| A4 | 无（录屏 5.2s，最终构建，已抽帧核对） | — | 已补 |
| B1 | 无（滚动+详情录屏已按最终构建重录 21s） | — | 已补 |
| 全部 | 未测真实手机 / Safari / Firefox | 移动端结论仅限 Chrome 仿真 | 统一 `UNVERIFIED` |

**结论：五个项目的截图与录屏现在全部对应各自最终提交的构建**（A1/A2/A3/A4/B1 均由总控在最终代码上重录并提交）。`B1-smooth-scroll.mp4` 仍是 04:04 的旧录屏，仅作为平滑滚动观感参考，不作为验收证据。

---

## 8. UNVERIFIED 汇总（评审时请把这些当"未证实"，不是"已通过"）

1. 真实 iPhone / Android 设备（全部只有 Chrome 390×844 @2x 仿真）。
2. Safari / Firefox 兼容性。
3. 严格内存泄漏分析（堆快照对比、强制 GC、长时 soak）——五个项目全部没有。
4. 真实 GPU 性能剖析（profiler / GPU 计数器）——只有 draw calls、tris、帧间隔采样。
5. 系统级 `prefers-reduced-motion`（用查询参数同路径模拟）。
6. A4 的 `qa-check.mjs`（字母独立性、延迟门禁、reduced-motion、5×replay）未执行完。
7. A2 的 dispose 后纹理残留 3（已披露，未解决）。
8. B1 的系统级后台标签切换与 10 分钟长驻留。

---

## 9. 工作空间清洁

- 五个项目各自 `git status` 干净；`node_modules/`、`dist/`、`.tmp/`、`.DS_Store`、`docs/RECORDING/.raw/` 均已 gitignore。
- 临时文件：五个项目的 `.tmp/` 已清理（仅保留 gitignore 规则）；抓取脚本的 `.raw` 中间目录每次运行后自动删除。
- 整个实验根目录约 **1.0GB**，其中 94% 是五份 `node_modules`；提交进 Git 的只有源码、文档、截图与录屏（B1 的 66 张截图占了大头）。
- 共享底座位于 `../.shared-reference/`（kit + 字体池），**不属于任何交付项目**，不参与五个仓库的 Git。
- 没有在桌面、下载目录或其他项目里散落任何中间产物；没有移动/覆盖/删除你的既有项目。

## 10. 复现与验证命令

```bash
# 独立审计（只读，会重建五个项目）
cd MORTON-experiments && node scripts/audit.mjs --build

# 单个项目重建 + 重新抓证据（不录屏，约 30 秒）
cd A1-luxury-opening
npm run build
node scripts/capture.mjs --url http://127.0.0.1:5181/ --name A1-opening --no-video --settle 2500

# B1 的滚动 + 详情证据
cd B1-site-skeleton
node scripts/capture-b1.mjs --url http://127.0.0.1:5185/ --name B1-scroll --no-video
```

---

## 11. 下一轮建议（不替你决策）

三个可选方向，成本与收益不同：

1. **选一个方向精修（推荐）**：从 A1–A4 里选一个视觉主张最接近你想要的，把材质/字形/构图推到品牌级，再让 B1 的骨架套上这套语言。代价是放弃另外三个的差异探索。
2. **融合 A4 + B1**：A4 的材质/构图语言 + B1 的章节与交互骨架，做一次受控融合（需明确"哪些模块来自谁"，避免把两套逻辑硬拼）。
3. **补短板再评**：先把 A2 的基座切边/光锥、A3 的"40% 均匀灰面"、B1 的移动端画廊与 sticky 交接修掉，再横向比较。

无论选哪条，下一轮开工前建议先定三件事：**字标是否要定制字形**（现在五个都用字库字重实例）、**材质走铸造还是精密加工**、**移动端画廊的交互模型**。这三个决定会连锁影响后面所有精修。

---

## 12. 公开分发说明（GitHub）

本轮交付已推送到 `https://github.com/MortonCheung/Morton`。为了让它"打开就能看"，做了三件事，均已验证：

1. **附带构建产物**：五个 `dist/` 一起提交，静态托管下可直接打开各方案。为支持 GitHub Pages 的项目路径（`/<repo>/<project>/dist/`），把字体/纹理资源路径改为相对路径，并在每个 `vite.config.ts` 设 `base: './'`。（原先绝对路径 `/fonts/...` 在根路径下正常，在子路径下必 404。）
2. **`npm ci` 可用**：`package.json` 只保留构建所需依赖，`package-lock.json` 同步重新生成；五个项目 `npm run build` 均通过。
3. **独立历史以 bundle 分发**：`.DELIVERY_SUBREPOS/<project>/repo.bundle`（`git clone` 可原样还原），`MANIFEST.md` 记录 HEAD SHA 与提交数。

子路径静态托管冒烟验证（本地 `python3 -m http.server`，路径 `127.0.0.1:8099/MORTON-experiments/<project>/dist/`）：

| 项目 | 状态 | draw | expand | 字体 | console/网络错误 |
|---|---|---:|---:|---|---|
| A1 | hero | 1091ms | 565ms | Marcellus loaded | 0 |
| A2 | hero | 1152ms | 500ms | Marcellus loaded | 0 |
| A3 | hero | 1137ms | 551ms | Jost loaded | 0 |
| A4 | hero | 1049ms | 483ms | Marcellus loaded | 0 |
| B1 | hero | 1022ms | 508ms | Marcellus loaded | 0（详情打开 + Escape 关闭正常，8 张卡片，scrollHeight 13590） |

> 以上数字来自**已提交的 dist**（提交后未再修改代码），与 §2 的 dev 实测数值差异是构建产物 vs 开发服务器的正常抖动，两者都在硬约束内。

# B1 — MORTON 全站滚动叙事骨架

一个以 **M · O · R · T · O · N** 六个字母为视觉主线的整站滚动叙事骨架。
纵向滚动同时推动 3D 字母、镜头与章节内容；作品总览是可横向浏览的多轨道画廊，点击作品从来源位置展开为详情，关闭后回到原滚动位置与原焦点。

> **内容真实性**：除「MORTON」外，本仓库内所有个人信息、经历、作品、链接与视觉均为显式占位符（`[待填真实内容]` / `[待填方向]` / `[填写链接]` / 占位图）。没有虚构的履历、奖项、公司、数据或项目链接。

---

## 1. 运行

```bash
npm install                      # 依赖已按 PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 安装
npm run dev                      # http://127.0.0.1:5185/
npm run build                    # tsc -b && vite build
npm run preview                  # http://127.0.0.1:5285/
node scripts/capture-b1.mjs --url http://127.0.0.1:5185/ --name B1-scroll
node scripts/qa-shots.mjs --url http://127.0.0.1:5185/     # 补充 QA（五视口 / reduced / 5 次刷新 / FPS）
```

- 开发端口 **5185**，预览端口 **5285**（`--strictPort`）。
- 环境：Node 24.15 / npm 11.12 / Chrome 155 / ffmpeg 8.1。
- 测试用 `?motion=reduce` 或 `?motion=full` 可强制降级 / 强制全动效路径（便于截图与验收）。

## 2. 目录

```text
public/fonts/            Marcellus.ttf（SIL OFL 1.1）+ 说明
src/
  app/                   App 组装、stage context
  data/                  chapters.ts / content.ts / projects.ts —— 所有文案与作品数据
  letters/               font.ts + buildWord.ts（脚手架）+ letterModels.ts（共享 geometry 的六个字母）
  scenes/                MortonStage（唯一 WebGL 上下文）+ poseModel（纯函数编排）
  animation/             opening.ts（状态机）+ sceneDirector.ts（单一滚动写者）+ useChapterTimeline.ts
  features/
    opening/             首屏
    chapters/            M / O1 / R / T / O2 / N 六个章节组件
    gallery/             多轨道画廊与作品卡
    detail/              FLIP 详情、滚动锁、焦点管理
  components/            ChapterShell / Kicker / SiteChrome / ProjectVisual
  hooks/                 useReducedMotion
  lib/                   timeline 探针、scrollLock、数学工具
  styles/                tokens / global / opening / chapters / gallery / detail
scripts/                 capture-b1.mjs（官方验收）、qa-shots.mjs（补充）、capture.mjs（脚手架）
docs/                    ISOLATION / DESIGN_DECISIONS / TEST_REPORT / KNOWN_ISSUES
docs/SCREENSHOTS/        验收截图
docs/RECORDING/          滚动与详情开关录屏（webm + mp4）
```

## 3. 章节结构

| # | 锚点 | 章节 | 章节内形式 | 3D 字母 |
|---|---|---|---|---|
| 0 | — | 开场：逐笔构建 → 成体 → hero | 字形描边逐笔绘制 ≥1000ms，再 500ms 展开成实体 | 完整 MORTON |
| 1 | `#ch-M` | 01 ME 个人定位 | 编辑式主文 + 事实表 + 轻量展开 | M 前移放大，其余字母后退成水印 |
| 2 | `#ch-O1` | 02 ORIGIN 起点 | **圆环轨道时间线**：进度弧 + 4 个节点依次点亮 + 详情交叉淡入 | O 进入圆环中心 |
| 3 | `#ch-R` | 03 RECORD 记录 | **纵向账本**：时间/机构/角色/规则线逐行进入 + 一条可展开 | R 前移 |
| 4 | `#ch-T` | 04 THINGS I BUILD 做法 | **三阶段聚焦**：问题 → 实现 → 验证，步骤轨 + 面板交叉切换 | T 在三步之间转向 |
| 5 | `#ch-O2` | 05 OUTPUT 作品 | **多轨道横向画廊**：3 条轨道不同速度扫掠 + 边缘遮罩 + 悬停/聚焦/已选 | 六字母退为底部签名行 |
| 6 | `#ch-N` | 06 NEXT 之后 | 联系入口矩阵 + 方向列表；末段收束 | N 前移，最后六字母回到开场位置（首尾闭环） |

滚动长度：1440×900 下 `scrollHeight = 13590px`（约 15.1 屏）。每章 `height` 在 `src/data/chapters.ts` 内独立可调。

## 4. 字体许可

`public/fonts/marcellus.ttf` — **Marcellus**，版本 1.000，设计者 Astigmatic (AOETI)，
**SIL Open Font License 1.1**（`http://scripts.sil.org/OFL`）。
同一份字形同时用于 Three.js 的 `ExtrudeGeometry` 与网页标题（`@font-face`），因此 3D 字母与排版字体完全同源。
字体名称表内嵌的许可声明见 `public/fonts/LICENSE-marcellus.txt`。

## 5. 验收证据

| 证据 | 路径 |
|---|---|
| 官方抓取原始报告（时序、探针、滚动还原、console） | `docs/TEST_REPORT_RAW.json` |
| 补充 QA（5 视口 / reduced / 5 次刷新 / FPS / 按钮关闭） | `docs/QA_SHOTS.json` |
| 五视口 + 六章节 + 详情开/关截图 | `docs/SCREENSHOTS/` |
| 完整滚动 + 3 轮详情开关录屏（官方脚本） | `docs/RECORDING/B1-scroll.webm` / `.mp4` |
| 平滑连续滚动录屏（补充脚本） | `docs/RECORDING/B1-smooth-scroll.webm` / `.mp4` |
| 设计与实现决策 | `docs/DESIGN_DECISIONS.md` |
| 隔离声明 | `docs/ISOLATION.md` |
| 测试报告 / 已知问题 | `docs/TEST_REPORT.md` / `docs/KNOWN_ISSUES.md` |

## 6. 依赖用途

- `react` / `react-dom`：UI 与章节组件。
- `three`：唯一的 WebGL 字母场景（`ExtrudeGeometry`、灯光、阴影、环境反射）。
- `gsap` + `ScrollTrigger`：开场时间线与六章内容编排；不做全局巨型时间线。
- `opentype.js`：TTF → 字形轮廓（脚手架已验证管线）。
- `vite` / `typescript` / `@vitejs/plugin-react`：构建。
- `playwright-core`（dev）：真实浏览器抓取与录屏，使用系统 Chrome。

`@react-three/fiber` / `@react-three/drei` 出现在脚手架依赖中但本项目**未使用**（直接使用 three.js 以获得更精确的逐字母生命周期与单一渲染循环）。如后续不使用可移除，见 `KNOWN_ISSUES.md`。

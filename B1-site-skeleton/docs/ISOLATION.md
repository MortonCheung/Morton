# ISOLATION — B1

**结论：`NO CROSS-PROJECT CODE OR CONTEXT USED`**

本项目（B1 全站滚动叙事骨架）在独立目录、独立 Git 仓库、独立 Agent 上下文中完成。
未读取、未复制、未参考 A1 / A2 / A3 / A4 四个开场项目的任何代码、截图、设计记录、README、录屏或 Agent 输出。

## 允许并实际读取的材料

| 材料 | 用途 |
|---|---|
| `MORTON_个人主页_独立Agent施工包_v1.1/05_B1_全站滚动叙事骨架/00_本类总施工手册.md` | B1 目标、结构原则、验收要求 |
| 同目录 `01_分阶段施工步骤.md` | 施工顺序 |
| 同目录 `03_Agent专属提示词.txt` | 职责与硬约束 |
| 同目录 `04_验收清单.md` | 验收项 |
| 同目录 `05_设计记录模板.md` | 设计记录格式 |
| 同目录 `02_代码示例/`（README、scroll-scene-map.ts、LetterChapter.tsx、ProjectDetailTransition.tsx、scroll.css） | 仅作为实现模式参考；未逐行复制，且示例明确要求修复来源矩形重算、滚动锁定、焦点、reduced-motion、时间线清理等问题（本仓库已重写） |
| 全局 `00_总施工手册.md`、`01_独立执行与隔离规范.md`、`02_明日审稿与验收矩阵.md`、`04_全局工程约束_架构与性能.md` | 全局约束与验收口径 |
| `/Users/morton_cheung/Desktop/AI/Morton/.shared-reference/kit/HARNESS.md` | 技术底座说明、探针契约、抓取脚本 DOM 契约 |
| `/Users/morton_cheung/Desktop/AI/Morton/.shared-reference/fonts/marcellus.ttf` | 复制到 `public/fonts/`，SIL OFL 1.1 |

`scaffold`（React19 + Vite8 + TS5.9 + `src/letters/font.ts` + `buildWord.ts` + `src/lib/timeline.ts` + 抓取脚本）是 Lead 预先铺好的共享底座，**不属于 A1–A4 的成果**；本项目在其上继续开发，保留探针契约与抓取脚本判定逻辑未改。

## 明确未做的事

- 未打开、未 `ls`、未读取 `MORTON-experiments/` 下 A1 / A2 / A3 / A4 任何目录（包括截图与录屏）。
- 未从兄弟目录复制代码、资产、截图、字体或设计决定。
- 未共享 `node_modules`、构建缓存或输出目录。
- 未使用任何外部品牌资产、参考站源码、HDRI 或图片素材；所有视觉元素由 CSS / SVG / Three.js 在本仓库内生成。
- 未修改 `scripts/capture-b1.mjs` 的任何判定逻辑（滚动还原 ±40px、3 轮开关、Escape、移动端 390、录屏）。
- 未编造任何个人信息、经历、奖项、数据或链接；全部为显式占位符。

## 仓库与目录隔离证据

```text
$ git log --oneline
0c1b3cd feat(b1): full scroll narrative skeleton — six letter chapters, multi-track gallery, source-to-detail FLIP
f3804b9 chore: import verified React19 + Vite8 + TS5.9 scaffold with MORTON letter pipeline
```

- 仓库根：`/Users/morton_cheung/Desktop/AI/Morton/MORTON-experiments/B1-site-skeleton`
- 所有提交路径均在本目录内（可用 `git log --name-only` 复核）。
- 端口独占：dev 5185 / preview 5285（`--strictPort`）。
- 浏览器抓取使用机器级锁 `/tmp/morton-browser-gate`，未并行开第二个 Chrome。

## 如实说明

- 本项目使用了 Lead 提供的字体池文件（Marcellus），这是全体原型共享的公共素材，不构成跨项目借鉴。
- `@react-three/fiber` / `@react-three/drei` 来自脚手架依赖，本项目未使用，已在最终提交前移除（`npm uninstall`），避免“无用途依赖”。
- 施工期间曾用 `ls` 查看 `B1-site-skeleton/` 自身与施工包目录；**没有**任何命令触及 A1–A4 目录。

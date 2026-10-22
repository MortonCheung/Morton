# MORTON V2｜Phase 0 + Phase 1 交接

- **阶段**：Phase 0（基线审计）+ Phase 1（美术系统与五张高保真视觉稿）
- **完成 Agent**：Lead（Phase 0 审计、工程脚手架、证据链与验收）· `art-director`（美术系统与视觉稿）· `material-artist`（原创占位材质板）
- **接手 Agent**：待用户视觉批准后指派（Phase 2 开场）。**当前没有 Agent 在写正式源码。**
- **Git 仓库与分支**：`MortonCheung/Morton` · `feat/morton-v2-art-direction`
- **Phase 1 交付提交**：`90818e5038485d1a127211f9eaef3cc8a39c4b8f`
- **用户美术批准状态**：**PENDING_VISUAL_APPROVAL**（未获批准前不得进入 Phase 2/3）

---

## 1. 实际执行的测试命令与实际结果

| 命令 | 结果 |
|---|---|
| `npm install`（`PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`） | 27 packages，无浏览器下载 |
| `npm run build`（`tsc -b && vite build`） | **exit 0**，`dist/assets/index-*.js 238.75 kB (gzip 73.47 kB)`、CSS 17.22 kB |
| `npm run typecheck` | **exit 0** |
| `node scripts/shot.mjs` | **15 张截图 / 0 problems / 0 横向溢出**；高度精确 900 / 700 / 844 |
| `node scripts/check-phase1.mjs` | **28/28 present**（10 份文档 + 15 张截图 + 5 个画面实现 + 无 three.js 依赖） |
| `node scripts/review-page.mjs` | 生成 `docs/art-direction/REVIEW.html`（0 missing） |
| 浏览器控制台 | 五个画面 **0 pageerror / 0 console error / 0 HTTP ≥400**（favicon 已内联） |

截图：`docs/art-direction/styleframes/`（15 张）+ `SHOT_REPORT.json`（机器可读）。
对比页：`docs/art-direction/REVIEW.html`（可直接双击打开）+ dev server `http://127.0.0.1:5290/#/`。

## 2. 施工改动（相对 `7ed4d84`）

新增 `morton-v2/`（唯一正式 V2 工作区），旧 A1–A5/B1 目录**零改动**。

| 路径 | 内容 |
|---|---|
| `docs/BASELINE_AUDIT.md` | Phase 0 仓库/工作区审计，可复用机制与禁用视觉清单 |
| `docs/art-direction/*.md` | ART_DIRECTION / REFERENCE_MATRIX / TYPOGRAPHY / IMAGE_MATERIAL_GUIDE / COLOR_SPACING_TOKENS / ASSET_REGISTER / ART_REVIEW / frame-notes / WORDMARK |
| `docs/art-direction/decisions.json` | 关键决策（含证据截图路径） |
| `docs/art-direction/wordmark/` | 字标生成器（唯一真源）+ A/B/C 对比图 + 独立 study 页 |
| `src/design/{tokens,base,styleframes}.css` | 设计 token 与五屏样式 |
| `src/styleframes/` | 五张画面 + `wordmark.ts`（路径几何）+ `parts.tsx` |
| `public/assets/plates/` | 9 张原创占位材质板 + contact sheet + PLATES.json |
| `scripts/plates/generate.py` | 材质板生成器（可复现） |
| `scripts/{shot,review-page,check-phase1}.mjs` | 截图证据链、对比页生成、交付自检 |

## 3. 保留的视觉决策（Phase 2 **不得擅自更改**）

1. **画布语法**：整块纯色（纸白 `#F2EFE8` / 展厅 `#181816`）、0 圆角、1px 分隔线、桌面 12 列 / 移动 4 列。
2. **字标**：`wordmark.ts` 里的自绘路径（cap 1000u、竖干 124u、细横 36u、ink-gap 表），**不是字库字形**。Hero 用「A 衬线 + C 材质窗口」组合。
3. **Hero 构图**：字标 101.9vw、材质板 x=67.3vw / y=96、基线 y=580；字母从材质板镂空。
4. **00 与 01 严格对位**：Phase 2 的线稿只能从 `wordmark.ts` 主轮廓 + `structure` 字段 + 材质板矩形 + 基线提取。
5. **字体**：Bodoni Moda（display）/ Archivo（UI）/ Cormorant（长文），许可证见 ASSET_REGISTER。
6. **颜色由图像决定**：UI 只有纸白/墨/一条线；不得引入蓝紫、玻璃拟态、彩色渐变。

## 4. 关键接口（Phase 2 直接使用）

```ts
// src/styleframes/wordmark.ts
export const WORDMARK_VIEWBOX           // 6184 × 1012 ink box
export const MORTON_PATHS               // 六字母主轮廓 path（fill rule）
export const MORTON_STRUCTURE           // secondary：M 斜带 / O counter / R 碗+腿 / T 交界 / N counter
export const WORDMARK_METRICS           // cap 1000, stem 124, thin 36, serif 36×58, gaps
```
坐标与 01-hero-final 完全一致；Phase 2 的 cover 层只要复用同一 `viewBox` 与 `layout` 即可保证揭幕零跳位。

## 5. 素材与许可

- 9 张材质板：**100% 程序化原创**（numpy + Pillow，`scripts/plates/generate.py`），**不是真实作品摄影**，已在 `ASSET_REGISTER.md` 与 `PLATES.json` 标注为占位、待真实素材替换。
- 字体：Bodoni Moda / Archivo / Cormorant Garamond / Jost，均 SIL OFL 1.1。
- 未使用任何参考站（Lujo / Cartier / Hollywood / Getty / Heron）的图片、logo、源码或文案。参考研究截图仅存于 `.tmp-ref/`（已 gitignore，不入库）。

## 6. 已知问题

1. `p06 lacquer` 同时出现在 01 与 04，并排能看出同一张材质；真实素材到位后应替换其一。
2. 03 的 A/B 两件展项同为 4:5，比例种类 3 种而非 4 种。
3. 00 单看偏「制图」，其完成度依赖 Phase 2 的显影动作（静态底线已过：对位、分层、错峰、无数字）。
4. 01 的裁切是「衬线出血、竖干齐边」，不是切进竖干；更狠的裁切会让 390 宽变成猜字。
5. 材质板总重 **27MB PNG**（900–1920px 长边）。Phase 1 只在本地看，无影响；**Phase 2 前必须转 JPEG/WebP 并做尺寸分级**，否则首屏资源门禁过不了。
6. 05 素材板（sand/ink/linen/grain）尚未被任何画面使用，`ASSET_REGISTER` 已登记但未验收。

## 7. 未验证项 `UNVERIFIED`

- 真实手机（iOS/Android）与 Safari/Firefox：只做了 Chrome 1440×900 / 1440×700 / 390×844@2x。
- 字体子集化与中文 fallback 的极端混排（当前中文占位符在 Chrome 下正常）。
- 真实作品素材替换后的构图稳定性（版式未依赖具体图像内容，但 `object-position` 需微调）。
- 动效、首屏资源 readiness、帧耗时：**属于 Phase 2，本轮未做**。

## 8. 下一阶段必须阅读的文件（越少越好）

1. `docs/art-direction/ART_DIRECTION.md`（构图规则 + 五层结构）
2. `docs/art-direction/WORDMARK.md`（字标构造与裁切规则）
3. `docs/art-direction/COLOR_SPACING_TOKENS.md`（token 与栅格）
4. `src/styleframes/wordmark.ts`（路径真源）
5. `morton-v2/docs/BASELINE_AUDIT.md`（什么不能沿袭）

## 9. 提交记录

| SHA | 内容 |
|---|---|
| `e719852` | Phase 0 审计 + V2 工程脚手架 |
| `50547de` | 9 张原创材质板 + 生成器 + 登记 |
| `90818e5` | Phase 1 美术系统 + 五张视觉稿 + 证据链（**代码交付点**） |
| `HEAD` | 本文件的 SHA 钉定提交（docs-only） |

> 说明：本文件在提交后由 Lead 以 `git log -1 --format=%H` 校对；SHA 以仓库实际值为准。

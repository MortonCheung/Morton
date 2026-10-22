# ASSET REGISTER — 图像位 · 字体 · 文案

> 所有图像均为**本项目原创占位材质板**（程序化生成，非第三方素材、非真实项目摄影）。画面内以 `P.0x — … STUDY` 标注，避免被误读为真实作品。
> 生成方：本项目材质板 Agent（Phase 1 并行任务）。登记日期 2026-10-22。

## 1. 图像版（plate）登记

| id | 文件 | 像素 | 语义 | 许可 / 权属 | 状态 | 使用位置 |
|---|---|---|---|---|---|---|
| p01 | `public/assets/plates/p01-paper-4x5.jpg` | 1200×1500 | 纸纤维 + 竖向折痕 | 本项目原创（程序化），无第三方内容 | ✅ 已验收 | 02 主图；03 次级 B；04 细节 inset |
| p02 | `public/assets/plates/p02-plaster-3x2.jpg` | 1800×1200 | 灰泥墙 + 斜阴影 | 同上 | ✅ 已验收 | 03 主展品 |
| p03 | `public/assets/plates/p03-ink-1x1.jpg` | 1200×1200 | 墨面研究 | 同上 | ✅ 已验收（Phase 4 由 Lead 复核 contact sheet 后启用） | — |
| p04 | `public/assets/plates/p04-linen-4x5.jpg` | 1200×1500 | 亚麻织纹 | 同上 | ✅ 已验收（Phase 4 由 Lead 复核 contact sheet 后启用） | — |
| p05 | `public/assets/plates/p05-sand-16x9.jpg` | 1920×1080 | 沙面 | 同上 | ✅ 已验收（Phase 4 由 Lead 复核 contact sheet 后启用） | — |
| p06 | `public/assets/plates/p06-lacquer-3x2.jpg` | 1800×1200 | 哑光黑漆 + 高光带 | 同上 | ✅ 已验收 | 01 材质窗口；04 主图 |
| p07 | `public/assets/plates/p07-fold-2x3.jpg` | 1200×1800 | 折纸屏风 + 投影 | 同上 | ✅ 已验收 | 03 次级 A |
| p07b | `public/assets/plates/p07b-fold-deep-2x3.jpg` | 1200×1800 | 折纸深折版 | 同上 | ✅ 已验收 | 03 次级 C（3:2 特写） |
| p08 | `public/assets/plates/p08-grain-4x5.jpg` | 1200×1500 | 颗粒面 | 同上 | ✅ 已验收（Phase 4 由 Lead 复核 contact sheet 后启用） | — |

**复用说明**：p01 同时用于 02 与 03-B（裁切完全不同：近景折痕 vs 4:5 局部）；p06 同时用于 01（镂空）与 04（整幅展品）。这是"同一材质库、不同版面"的演示，不是重复作品；正式内容到位后由真实作品替换。

## 2. 未验收图位的占位方式

`src/styleframes/parts.tsx` 的 `PLATE_AVAILABLE` 控制：未验收的 plate 只显示**平色 + 1px 内边**（`--plate-*` token），不伪造纹理。当前五屏已无此类占位（全部使用已验收 plate）。

## 3. 字体

| 字体 | 文件 | 许可 | 用途 |
|---|---|---|---|
| Bodoni Moda（可变 400–900 / opsz 6–96） | `public/fonts/bodoni-moda.ttf` | SIL OFL 1.1 | display（D2/D3） |
| Archivo（可变） | `public/fonts/archivo.ttf` | SIL OFL 1.1 | label/caption/body |
| Cormorant Garamond | `public/fonts/cormorant-garamond.ttf` | SIL OFL 1.1 | 02 长读段 |
| Jost | `public/fonts/jost.ttf` | SIL OFL 1.1 | 已安装、未使用 |

**字标**：MORTON 是自绘几何（`src/styleframes/wordmark.ts`，由 `docs/art-direction/wordmark/build-wordmark.py` 生成），权属本项目；仅以 Bodoni Moda 的 display 光学尺寸作为比例参考，不嵌入字体轮廓作为 logo。O 为椭圆构造、M/T/R 的细节见 WORDMARK.md。

## 4. 文案

- 事实性内容全部是**明确占位**：`[待补副标题]`、`[作品 01]`、`[年份]`、`[角色]`、`[项目类型]`、`[状态]`、`[档案条目 01]`、`[地点]`。
- 中性叙述（非事实主张）：`About` 的 `A practice organised around material, measure and the printed page…`、`Focus` 的 `A study in surface and edge…`、Hero 的 `Art direction, editorial and exhibition design.` —— 这些是可替换的版面文案，不构成履历/获奖/客户声明。
- 页码 `01 — 05` 是真实的五屏索引；`P.06 — LACQUER STUDY` 等是材质板编号，与 ASSET_REGISTER 一致。
- **没有任何伪造的百分比、奖项、客户名、项目链接。**

## 5. 授权与再分发

- 图像板为本项目原创生成资产，可在本项目内自由使用；如需对外发布，请保留"原创占位/材质研究"的说明或替换为真实作品。
- 字体按 SIL OFL 1.1 再分发允许，需保留许可文本（字体文件自带）。
- 参考站（Lujo / Cartier / Hollywood / Getty / Heron）**没有任何素材**进入本目录或页面；仅 `.tmp-ref/` 下有四张内部评论用首屏截图，已 gitignore，不随交付。

> **Phase 4 asset pass（Lead, 2026-10-22）**：九张板材已由 PNG 转为 **quality-88 progressive JPEG**
> （22.65 MB → 2.37 MB，像素尺寸不变，`scripts/plates/to-jpeg.py` 可复现）。
> 原因是 PNG 对摄影类材质是无谓的体积；首屏揭幕需要这些图在 cover 下解码完成。
> 如果后续替换成真实作品照片，请沿用同一规则（长边 ≤ 1920、progressive JPEG/WebP、单张 ≤ 600 KB）。

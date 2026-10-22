# TYPOGRAPHY — 字体层级表与组件排版规范

> 字体：**Bodoni Moda**（display，SIL OFL 1.1，可变 400–900 / opsz 6–96）· **Archivo**（UI/caption，OFL）· **Cormorant Garamond**（长文，OFL，仅第三级）。
> **字标不是字体**：`MORTON` 是自绘几何（`src/styleframes/wordmark.ts`），见 WORDMARK.md。

## 1. 层级表（桌面 → 移动覆盖）

| # | token / 角色 | family | 字号（1440 实测） | 行高 | 字距 | 用途 | 移动覆盖 |
|---|---|---|---|---|---|---|---|
| D1 | 字标 | 自绘路径 | cap 237px / 墨宽 1467px | — | ink-gap 表 | 仅 01 Hero | 92vw，cap≈58px，不裁 |
| D2 | display | Bodoni Moda 500 | **112px** | 0.94 | −0.032em | 02 标题（3 行）、04 标题（2 行） | 40–46px |
| D3 | section | Bodoni Moda 500 | 44px | 1.0 | −0.02em | 预留：章节页 | 32px |
| L1 | label | Archivo 500 | **11px** | 1.25 | **0.145em** | index / plate label / 表格头 / 按钮 | 11px（不缩） |
| C1 | caption | Archivo 400 | 12.5px | 1.55 | 0.01em | 两行说明、图注、register | 11.5–12px |
| B1 | body | Archivo 400 | 15.5px | 1.62 | 0.005em | 04 说明段（33ch） | 13px |
| R1 | read | Cormorant Garamond 400 | 23px | 1.55 | 0.002em | 02 正文（34ch） | 18px / 1.5（42ch） |
| M1 | meta value | Archivo 400 | 15px | 1.4 | 0.005em | 04 的 2×2 meta 值 | 14px |

**级差**：D2 : L1 = **10.2 : 1**；字标 cap : L1 = **21.6 : 1**。中间尺寸（28–52px 的"中标题"）在五屏里只出现一次（Cover 无、Hero 无、Works 无、Focus/About 用 D2）——这是刻意的：不让"60–80px 万能标题"回来。

## 2. 硬规则

1. **最小字号 = 11px**（label）。任何文字不得低于 11px；不允许用 8–9px 制造"精致"。
2. 次要信息靠 **11–12px + `--muted`** 降级，**不用 opacity** 把字压成灰雾（深场上同理用 `--muted-inverse`）。
3. display 字距为负（−0.032em），但不得低于 −0.04em；不得使用负行高或字号压缩变形。
4. 中英混排：`[待补副标题]` 这类中文占位使用系统 fallback（PingFang SC），字号/行高与英文 label 一致；不做中文标题的字体替换。
5. 数字：UI 里只出现真实的序号/年份/页码（`01 — 05`、`2026`、`P.06`），**禁止假百分比**。
6. 大写（uppercase）只用于 11px label；正文/说明保持句首大写。

## 3. 组件排版规范（与实现一致）

| 组件 | 规格 |
|---|---|
| Back to works 按钮（04） | 直角，`border: 1px solid --divider-strong`，高 **38px**，左右 padding **16px**，label 11px / 0.1em / uppercase，箭头与文字间距 18px；hover 边框转 `--ink`；焦点环 `1px solid --ink` offset 3px |
| 图版（Plate） | 0 圆角，`object-fit: cover`，1px 内边（`rgba(27,26,24,.16)`；About 主图加强到 `.30`） |
| 表格行（About Archive / Works Index） | 1px 上边线，行内 baseline 对齐；label 11px muted，值 12–15px ink；垂直间距 8/11/14px 取台阶 |
| 图注（caption） | 12.5px，行高 1.55，最长 28ch；图版 label 用 11px / 0.145em |
| 章节序号 | 11px，`01 — 05` 形式，位于版心边缘，不抢焦点 |

## 4. 行宽

- 说明段 **33–34ch**（Archivo 15px）或 **34ch / 42ch**（Cormorant 23/18px）——超过 42ch 即换栏。
- 标题不需要控制 ch，但每一行必须落在 D2 的 112px 网格上（02 的 3 行 / 04 的 2 行）。

## 5. 字体许可

Bodoni Moda / Archivo / Cormorant Garamond 均为 SIL Open Font License 1.1，允许嵌入与商用；文件在 `public/fonts/`。字标路径由 `docs/art-direction/wordmark/build-wordmark.py` 从这些字体**重建**，不直接嵌入字体轮廓作为 logo。

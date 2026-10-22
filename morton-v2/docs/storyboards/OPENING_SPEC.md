# OPENING_SPEC · Phase 2

状态：**已实现并通过本机真浏览器验收**（证据见 `docs/qa/QA_REPORT.md`）。
母版：Phase 1 的 `01-hero-final` 与 `00-opening-cover`；本文件只描述机制，不改美术。

## 1. 层级（从下往上）

```text
z 0   Final hero（真实站点首屏，t=0 即挂载并完成布局）
z 50  Cover：上/下两张纸（同一套全画布线稿，各自裁掉一半）+ 顶部小标签
z 51  Seam：中央 1px 进度轨 + 已绘制段（scaleX 0→1）
```

- Hero 从第一帧就渲染在 cover 下方，**不是** `display:none`；揭幕只做 transform，不换路由、不重新挂载、不新建场景。
- Cover 揭幕结束后 `hidden` 并从流程中移除；`data-phase="hero"` 之后不残留 will-change / 合成层。

## 2. 线稿的来源（与 Hero 同源）

`src/features/hero/heroGeometry.ts` 是唯一几何源，数值与 `styleframes.css` 的 `.sf-hero` 完全对应：

| 元素 | Hero（CSS） | 线稿（1440×900 空间） |
|---|---|---|
| 字标 | `left:-0.951vw; width:101.9vw; top:calc(64.444vh - 16.674vw)` | `x=-13.69, w=1467.4, inkTop=339.9` |
| 材质板 | `left:67.3vw; top:10.667vh`（右/下出血） | `x=969.1, y=96` |
| 基线 | `top:64.444vh` | `y=580` |
| 刊头线 | `left:gutter; width:25vw; top:10.667vh` | `x=67.7, w=360, y=96` |

线稿路径直接取 `src/styleframes/wordmark.ts` 的 `letters[].d`（外轮廓）与 `letters[].structure`（内部构造线），**不是描摹一张图**。

三族线宽/透明度：`silhouette 1.4px / 100%`、`detail 0.8px / 66%`、`shading 0.55px / 40%`。
移动端使用独立变体（`data-variant="mobile"`），对应 Hero 在 720px 以下的重新构图（材质场 18–80vh、字标 92vw）。

## 3. 状态机与时间

```text
boot → drawing → built → reveal → hero
                 ↘ fallback（资源超时）→ reveal → hero
reduced-motion：boot →（真实 ready）→ reduced → hero
```

| 参数 | 值 | 说明 |
|---|---|---|
| 绘制时长 | **1180ms** 配置（实测 1065–1115ms 的 `drawing→built`） | 与中央进度线同一 GSAP 时钟 |
| 错峰 | silhouette 0–0.62s / detail 0.22–0.80s / shading 0.38–0.88s | 每组内按路径再 stagger |
| 完成→揭幕 | **60ms** 设计换气 | 不是用来掩盖加载 |
| 揭幕 | **620ms** `power3.inOut`，上纸 −101%、下纸 +101% | transform only |
| 真实就绪门禁 | 字体 ready + Hero 图片 `decode()` + 两帧 rAF | 不是 sleep |
| 超时兜底 | 12s | 揭幕后仍有纯色板材底，不会白屏 |

实测（1440×900，Chrome 155，本机）：`drawing 289 → built 1370 → reveal 1433 → hero 2053`，即绘制 1081ms、换气 63ms、揭幕 620ms，mount→hero 约 1.77s。

## 4. 真实资源门禁

```ts
await Promise.all([
  document.fonts.ready,
  ...heroImages.map(img => img.complete ? img.decode() : waitLoad(img).then(() => img.decode())),
  new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))),
])
```
只对 **Hero 自己的图片**（`#index img`）设门禁；下方章节的图片是 `loading="lazy"`，不参与开场，否则会永远等不到（这是实现中真实踩到并修掉的 bug）。

## 5. 失败与边界

| 情况 | 行为 |
|---|---|
| `prefers-reduced-motion: reduce` | 不画线稿；真实 ready 后直接显示 Hero（实测 112ms 完成） |
| 资源慢（`?gateDelay=2200` 测试钩子） | 停在 `built` 完整线稿，真实 ready 后才揭幕（实测 hold 1751ms） |
| 图片 404 / decode 失败 | `decode()` 的失败被吞掉，门禁继续；Hero 下方有板材纯色底，不白屏 |
| 页面切到后台 | 时间线 pause，返回后 resume（`visibilitychange`） |
| 开场期间滚动 | `html.is-opening` 锁滚动，结束后解除，不产生 scroll jump |

## 6. 明确没有做的事

- 没有 WebGL / 没有第二个渲染器；线稿是 SVG，Hero 是 DOM + 图片。
- 没有伪造百分比；cover 上只有 `MORTON — [待补副标题]` 一行小字。
- 没有在揭幕当帧创建任何对象：材质板图片在 cover 期间就完成 decode 与首帧。

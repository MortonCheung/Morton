# RESOURCE_LIFECYCLE · Phase 4

本文件回答一个问题：**什么东西被创建、被谁拥有、什么时候消失。**
本项目没有 WebGL，因此没有 geometry / material / texture / render target；资源类型是 DOM、图片、字体、GSAP 时间线、observer、rAF 与事件监听器。

## 1. 生命周期表

| 资源 | 创建位置 | 拥有者 | 释放/结束时机 | 证据 |
|---|---|---|---|---|
| 开场时间线（GSAP timeline） | `useOpeningSequence.ts` `run()` | 该 hook 的 `timeline` ref | `onComplete` 后不再使用；组件卸载/effect 清理时 `kill()`；页面隐藏时 `pause()`，恢复 `resume()` | 5 次刷新 draw 稳定 1146–1184ms，无叠加计时 |
| `visibilitychange` 监听器 | 同一 hook | 同一 hook | effect cleanup `removeEventListener` | 代码审查 + 切后台复测 |
| `is-opening` / `is-focus-open` 类 | hook / Site | `<html>` | hook 清理与关闭详情时移除 | 关闭后 `classList.contains` = false |
| 封面两张纸 + SVG 线稿 | `OpeningShell` | React 树 | `reveal` 结束→`hidden`；不重新创建 | 揭幕后 `[data-cover][hidden]` |
| 线稿 path 的 dash 状态 | GSAP 写在 `SVGPathElement.style` | 元素自身 | 随 cover 一起隐藏，不需要还原（只播一次） | — |
| Hero 图片（9 张板材中的 2 张首屏） | `Plate` → `<img loading=lazy>` | 浏览器 + DOM | 页面生命周期内复用；无重复 append | 5 次刷新后 `document.images.length` 不变 |
| 章节图片（其余板材） | 同上 | 同上 | `loading="lazy"`，滚动到附近才加载 | 冷启动网络面板 |
| 字体 | `@font-face`（4 个 TTF） | 浏览器 font cache | 不释放（页面级，正确） | `document.fonts` 6 条记录稳定 |
| 章节 reveal observer | `useSectionReveal` | hook | 首次进入即 `unobserve`，卸载 `disconnect()` | 代码审查 |
| 导航可见性 observer | `Site.tsx` | 组件 | 卸载 `disconnect()` | 代码审查 |
| 详情 FLIP 时间线 | `ProjectFocus` | 组件 | 打开时 `tl.kill()` + `clearProps`（unmount 清理），关闭后 timeline `onComplete` | 5 轮开关 DOM 恒 304 节点 |
| 键盘监听（Escape） | `ProjectFocus` | 组件 | 卸载时 `removeEventListener` | 关闭后按 Esc 无副作用 |
| 详情背景滚动锁 | `Site` | `<html>` | 关闭时移除 | `scrollY` 5352 还原 |

## 2. 明确的所有权规则

1. **开场时间线只有一个所有者**：`useOpeningSequence`。任何地方都不得再创建第二条驱动同一 cover 的时间线。
2. **封面只播一次**，不提供"重播"按钮；要复看就刷新（避免重播逻辑引入资源累积）。这是有意取舍，已写进 OPENING_SPEC。
3. **详情层不换路由**：`ProjectFocus` 是覆盖层，关闭即 `unmount`，不保留隐藏节点。
4. **没有常驻 RAF**：项目里唯一的 `requestAnimationFrame` 是开场门禁里的两帧等待和 QA 采样，不在页面常驻。
5. **没有 ScrollTrigger / Lenis**：章节揭示用 IntersectionObserver，避免和开场时间线抢同一批元素。

## 3. 测量与边界

| 指标 | 实测 | 说明 |
|---|---|---|
| DOM 节点数（详情开关 5 轮） | 304 → 304 → 304 → 304 → 304 | 无节点累积 |
| 覆盖层数量（同上） | 1 → 1 → 1 → 1 → 1 | 无残留层 |
| 刷新 5 次开场时序 | draw 1146–1184ms，reveal 621–622ms | 无逐渐变慢 |
| 图片数量 | 页面稳定后恒定 | 无重复插入 |

**`UNVERIFIED`**：
- 没有做 Chrome DevTools 堆快照对比、没有强制 GC 后基线、没有 10 分钟以上长驻留。
- 没有真机内存数据。
- 因此本文件只声称"生命周期有明确路径且未观察到累积"，**不声称"没有内存泄漏"**。

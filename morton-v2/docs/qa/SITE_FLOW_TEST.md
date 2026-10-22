# SITE_FLOW_TEST · Phase 3

被测 commit：见 `docs/PHASE23_HANDOFF.md`。数据来源：`docs/qa/qa-raw.json` 的 `flows.focus`，截图 `docs/qa/screenshots/1440x900-focus.png`。

## 1. 作品总览 → 详情 → 返回

| 检查项 | 期望 | 实测（1440×900, Chrome 155） |
|---|---|---|
| 点击作品卡 | 从卡片矩形 FLIP 展开到前景 | 展开成功，`[data-detail]` 出现 |
| 来源连续性 | 首帧几何 = 卡片矩形 | 用 `getBoundingClientRect()` 的第一帧做 FLIP 起点，无跳位 |
| 打开时滚动位置 | 保持 | `scrollY 5352 → 5352` |
| 打开时背景滚动 | 锁定 | `html.is-focus-open` + `overflow:hidden` |
| 打开后焦点 | 进入层内 | `document.activeElement` = `[data-detail-close]`（`BACK TO WORKS`） |
| `Escape` 关闭 | 关闭层 | `[data-detail]` 消失 |
| 关闭后滚动 | 回到原位 | `5352 → 5352`（0px 差） |
| 关闭后焦点 | 回到来源卡 | `document.activeElement[data-work] = "w01"` |
| 连通性 | 可反复开关不堆叠 | 连续 5 轮：`[data-detail]` 数量恒为 1，DOM 节点数恒为 **304** |

DOM 节点数五轮完全一致（304 → 304 → 304 → 304 → 304），说明没有残留的覆盖层节点；GSAP 时间线在关闭时 `kill()`，`clearProps` 清掉 transform。

## 2. 章节浏览

| 章节 | 1440×900 | 390×844 |
|---|---|---|
| Hero（开场结束态） | ✓ 截图 `-hero.png` | ✓ 截图 `-hero.png` |
| About / Record | ✓ `-section-about.png` | ✓ |
| Record | ✓ `-section-record.png` | ✓ |
| Making | ✓ `-section-making.png` | ✓ |
| Works | ✓ `-section-works.png` | ✓ |
| Next | ✓ `-section-next.png` | ✓ |

- 五个视口 `scrollWidth - clientWidth = 0`（无横向溢出）。
- 章节出现用 IntersectionObserver 一次性 `.is-in`（观察后立即 `unobserve`），没有滚动回调，也没有第二个 GSAP 时钟。
- `prefers-reduced-motion` 时所有 `[data-reveal]` 直接可见（CSS 分支），不依赖 JS。

## 3. 导航

- 固定索引（`INDEX / ABOUT / RECORD / MAKING / WORKS / NEXT`）只在 Hero 离开视口后出现（IntersectionObserver），因此**不会压在开场构图上**。
- 使用 `mix-blend-mode: difference`，纸白与深色展厅两段都可读，且不需要额外底板。
- 锚点跳转不触发额外的滚动动画（`behavior` 交给浏览器），不会与开场时间线冲突（开场结束后才解锁滚动）。

## 4. 已知问题

1. 聚焦层的焦点圈只做了「进入 / 返回」两点，没有实现完整的 focus trap（Tab 可以在层内循环到浏览器 UI）。对键盘用户是可用的，但不是最严格的模态实现。
2. 关闭时如果用户在动画 620ms 内再次点击同一张卡，会重新打开（幂等），不会堆叠；但快速连点会看到轻微的位置闪动。
3. 移动端详情是「上图下文」的单列，`Back to works` 固定在信息列顶部，滚动信息列时按钮会滚出视口——下一步可以做成 sticky。

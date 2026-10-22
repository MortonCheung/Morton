# 设计与实现决策 — B1

## 1. 设计前提

B1 是**整站骨架**，不是开场精修，也不是静态 sitemap。评判标准是：MORTON 主线是否贯通、滚动是否真的推动字母/镜头/内容、作品总览是否易浏览、详情是否从来源位置展开并正确返回、内容是否始终可读。

因此视觉方向定为**编辑设计（editorial）**：纸感底色 + 石墨色实体字母 + 单一氧化红强调色；衬线大字与等宽小标签形成层级；大量留白与细规则线；不使用卡片化 SaaS 版式、不使用头像简介、不使用宇宙/蓝紫/粒子。

## 2. 字体与材质：一份字形，两种介质

- 选择 **Marcellus**（SIL OFL 1.1，46 KB）。它是古典碑铭衬线，字腔小巧、结构窄，作为 3D 实体时轮廓辨识度高，作为网页大标题时克制而不时尚化。
- **同一份 TTF 同时用于 Three.js `ExtrudeGeometry` 与 `@font-face`**，所以 3D 字母与排版字体同源，不会出现“网页字体与 3D 字体不是一套”的割裂。
- 3D 参数：`depth 0.24` / `bevel 0.009` / `bevelSegments 3` / `curveSegments 10`。深压扁的厚度 + 极窄倒角，让字母读起来像**印刷铸块**而不是发光的 3D 字体。
- 材质：`MeshStandardMaterial`，roughness 0.62、metalness 0.06、低强度 `RoomEnvironment` 环境反射（`environmentIntensity 0.35`）。三盏灯：暖色主光（投影）、冷色轮廓光、半球环境光。桌面开 1024 PCFSoft 软阴影，移动端关闭阴影。
- 字色不是黑白二值：每个字母有 `tone`（0 = 纸面幽灵，1 = 全墨），在 `GHOST #e6dfd1` 与 `INK #1b1813` 之间插值。章节中非活动字母退为 5–10% 的“水印”，活动字母保持全墨 —— 这是“字母从词里走出来”的核心语言。

## 3. 章节地图与“字母—内容”因果

| # | 章节 | 字母姿态 | 内容形式 | 因果 |
|---|---|---|---|---|
| 0 | 开场 | 六字母逐笔描边 → 成体 → 正面排列 | 只有标题与说明，字母是唯一主角 | 构建动画 ≥1000ms 后 500ms 展开，`window.__MORTON__` 状态齐全 |
| 1 | 01 ME | M 前移放大、轻微右转；其余退到纸面 | 编辑式主文 + 事实表 + 可展开说明 | 字母放大到左侧内容区，右侧文字才有位置 |
| 2 | 02 ORIGIN | O 移到左侧圆环中心 | 圆环轨道：进度弧 + 4 节点 + 详情淡入 | 弧长 = 章节进度；节点 = 人生节点 |
| 3 | 03 RECORD | R 前移，其他后退 | 纵向账本：时间/机构/角色/规则线逐行进入 | 行进入的次序 = 字母前移后的阅读次序 |
| 4 | 04 THINGS I BUILD | T 在三步之间改变朝向与景深 | 三阶段聚焦面板 + 步骤轨 | 字母转向与“问题→实现→验证”同步 |
| 5 | 05 OUTPUT | 六字母整体退场（缩放至 0.22、移出视口、tone 0.05） | 三轨横向画廊 | “让作品占据整屏”是本章的叙事动作；N 章再把字母带回 |
| 6 | 06 NEXT | N 前移 → 全词重组 | 方向列表 + 联系入口矩阵 → 收束 | 最后 34% 滚动把所有字母送回开场位置，首尾闭环 |

> 作品总览章让字母退场是刻意选择：画廊需要整屏，任何水印都会压住卡片文字或视口裁切。字母在下一章从画面外重新进入，形成“离场—归来”的节奏。

## 4. 滚动编排

### 4.1 用 sticky 代替 ScrollTrigger pin

每章 = `height: N×100svh` 的 section + `position: sticky; top: 0; height: 100svh` 的面板。

- 视觉上是标准的 pin，但**没有 ScrollTrigger 的 pin spacer**，因此不会出现 pin 撕裂、pin 结束跳动、spacer 与内容高度不一致的问题；上下反复滚动、直接跳转 scrollY、刷新都稳定。
- 每章内容用**自己的** ScrollTrigger：`start: 'top top'`、`end: 'bottom bottom'`、`scrub: 0.5`。六章六个触发器，没有全局巨型时间线。
- 时间线构建完成后执行 `tl.set({}, {}, 1)`，把时长归一到 1，这样编排里的 0..1 位置严格等于章节滚动进度（这个坑真实踩过：不归一时，最后一个 tween 决定时间线时长，结尾元素永远不会出现）。
- 章节长度在 `src/data/chapters.ts` 独立配置（190–300vh），修改一章不影响其他章。

### 4.2 单一场景写者（sceneDirector）

3D 字母只由**一个** rAF 合并的 scroll 监听器写：

1. 挂载/resize 时测量六个 section 的 `top/height`，缓存每章可滚动距离 `range = height - viewportHeight`；
2. 滚动时用 rAF 合并，找到包含 `scrollY` 的章节，`p = clamp((y - top) / range)`；
3. `resolvePose(chapterIndex, p)` 纯函数算出六字母 + 相机姿态；
4. 写入 stage 的目标姿态，stage 在自己的渲染循环里做指数平滑（约 0.5s 收敛），收敛后**停止 RAF**。

**为什么不用每章一个 ScrollTrigger 直接写姿态：** 这是实现中真实出现并修复的 bug。远处章节的触发器在 `onRefresh` 时也会以 progress 0/1 回调，六个触发器同时写同一组字母，最后创建的那个赢——结果滚动到顶部时页面显示的是 OUTPUT 章的“签名行”姿态（字母变小、变灰、掉到屏幕底部）。改为单写者 + 缓存区间后，任意跳转/回滚都确定。

### 4.3 字母与版面的对齐（DOM anchor projection）

不同视口下“左侧空白区”的宽度不同，硬编码字母 x 会导致字母压住文字或离内容太远。做法：

- 每个章节放一个 1px 的 `[data-letter-anchor]`（M 是左侧空列、O 是圆环、R/T/N 是预留的字母区）。
- director 测量该锚点在视口中的水平比例，投影到活动字母所在深度：
  `worldX = (ratio - 0.5) * 2 * tan(fov/2) * (cameraZ - letterZ) * aspect + cameraX`
- 再除以 root 的 fit 缩放，得到姿态坐标。

于是 1920 / 1440 / 1366 / 1024 下字母都停在版面的留白里，而不是靠魔法数字。移动端（≤820px）关闭锚点，改为屏幕中上部的统一放大姿态。

### 4.4 章节之间的过渡

sticky 面板在 pin 结束后会向上滑出，下一章面板同时从下方进入，这是 sticky 的固有几何。为避免“两章都不显示”的空白屏：

- 章节正文（标题/导语/主结构）**不做透明度门控**，从进入视口起就可读；
- 只有次级元素（事实表、节点、账本行、步骤面板、入口矩阵）做进度驱动的进入；
- 面板滑出时正文跟着上移，下一章正文随着面板进入而出现，屏幕始终有内容。
- 平滑切换由 `scrub: 0.5` 提供，反向滚动同样可逆。

## 5. 作品总览：多轨道

- 3 条轨道，分别 3 / 3 / 2 件占位作品 + 一块“轨道结束/更多作品”占位板。
- 纵向滚动 → 每条轨道按自身系数横向位移（`x: 0 → -(scrollWidth - viewport + 140)`，系数 1 / 0.72 / 0.86）。所有轨道**首帧从 0 开始**，第一张卡完整可见；之后才进入横移。
- 视口两侧 18px 的 `mask-image` 渐隐，让中段被裁切的卡片看起来是“画廊的延续”而不是布局错误。
- 视差：三条轨道横向速度不同 + 轻微 y 漂移（-10 / +8 / -6 px），不改变阅读顺序。
- 卡片：暗色底 + 生成的占位构图（SVG 圆/弧/网格/堆叠等，每种形状由项目数据指定）+ 底部渐变信息层；hover/focus 抬升 + 视觉轻微放大 + 强调色规则线展开；点击后保留 `data-selected` 与 aria 状态。
- 所有“图像”均为占位构图，**没有伪造项目截图**。

## 6. 作品详情：从来源位置展开

1. 点击卡片时记录 `getBoundingClientRect()`、`scrollY`、触发元素。
2. 详情渲染到 `document.body` 的 portal，先按终态布局测量自身矩形；然后 FLIP：位移 + 缩放到来源矩形，再动画回恒等。
3. 文字与媒体在几何动画进行到约 1/3 后才淡入，**保证可读内容不会被缩放变形**。
4. 打开期间 `body { position: fixed; top: -scrollY }` 锁定背景（比 `overflow:hidden` 更可靠，滚动位置不丢失），同时 `overflow: hidden`。
5. 关闭：先解锁并 `scrollTo(savedY, 'instant')`，下一帧重新测量来源卡片矩形（应对视口/布局变化），再动画回去；结束后卸载 overlay，把焦点还给来源卡片并保留选中态。
6. `Escape`、关闭按钮、点击遮罩都可关闭；Tab 在卡片内循环；`role="dialog" aria-modal`；`window.__MORTON__.detail = {open, sourceId}` 同步。
7. 反复开关不累积：每次打开创建的时间线在关闭/卸载时 kill；keydown 监听在 effect 清理；滚动锁在卸载兜底解锁。

## 7. 移动端与 reduced-motion

### 移动端（≤820px）

- DPR 上限 1.75，关闭阴影，`antialias: false`；3D 字母降为中部大号水印（tone 0.5），文字块加纸色 wash 保证可读。
- 章节改为单列，事实表/账本/步骤/入口全部纵向堆叠；画廊保留 3 条轨道但每屏约 1.2 张卡，保证仍可浏览 8 件占位作品。
- 详情为全屏并可内部滚动，关闭按钮常驻顶部。
- 隐藏侧边章节导航与角落章节标记，避免与页头/正文重叠。

### reduced-motion

- 不创建 WebGL 上下文、不创建任何 ScrollTrigger/GSAP 时间线；页面退化为静态长文。
- 开场用 DOM 排版的 MORTON 字标替代 3D；`window.__MORTON__.state = 'reduced'`。
- 章节不 pin（`position: static`），所有步骤/节点/行一次性展示。
- 详情不使用 FLIP，只做 150ms 淡入淡出；滚动锁/焦点/返回逻辑不变。
- 通过 `?motion=reduce` 可强制该路径（用于截图与验收），`?motion=full` 可反向覆盖系统设置。

## 8. 资源与性能所有权

| 资源 | 所有者 | 释放 |
|---|---|---|
| WebGLRenderer | `MortonStage` | `dispose()` → `renderer.dispose()` + 移除 canvas |
| 字形 geometry | `createLetterSet` 的 `ownGeometries` | `dispose()` 中逐个 `dispose()`；**两个 O 共享同一个实例，只释放一次** |
| 每字母 material / 描边 geometry / 描边 material | 每个 `LetterModel` | `LetterSet.dispose()` |
| RoomEnvironment PMREM render target | `MortonStage.envRT` | `dispose()` |
| 阴影承接平面 | `MortonStage.shadowPlane` | `dispose()` |
| GSAP timeline / ScrollTrigger | 每章的 `useChapterTimeline` | `gsap.context().revert()`（卸载时） |
| 开场时间线 | `runOpening` | 完成后自然结束；stage dispose 兜底 |
| scroll 监听 / resize / visibility / pointer | `MortonStage` / `sceneDirector` | `dispose()` / `destroy()` 移除 |
| ResizeObserver | `MortonStage` | `disconnect()` |
| RAF | `MortonStage` | 收敛后自动停；`dispose()` cancel |
| 详情时间线 / keydown / 滚动锁 | `ProjectDetail` / `useDetailController` | effect 清理 + onComplete |

渲染策略：单 canvas、单上下文；姿态使用指数平滑；场景静置后 RAF 停止（不是常驻 60fps）；每帧不 new 对象（姿态写入复用的对象）；DPR ≤2（移动 ≤1.75）；阴影只对 tone > 0.6 的字母开启；移动端完全关闭阴影与抗锯齿。

## 9. 可扩展性

- **新增作品**：只改 `src/data/projects.ts` —— 增加一条数据并指定 `track`。轨道宽度、溢出距离、横移范围、详情内容全部自动（`scrollWidth` 实时计算）；不需要改主线、动画或组件。
- **新增章节**：`chapters.ts` 加一条 meta → `poseModel.ts` 加一个 Visual → 新建一个章节组件（内容 + 章节内时间线）→ 在 App 里挂载。`ChapterShell` 负责注册 section 与 sticky 几何，director 自动测量新章节。
- **换美术**：内容数据、章节组件、3D 姿态、材质参数分层；换字体/材质/色板不需要动滚动逻辑，换滚动编排不需要动内容。
- **换作品详情实现**：`useDetailController`（状态/锁/焦点）与 `ProjectDetail`（动画/布局）分开，可独立替换。

## 10. 走查中发现并修掉的问题

1. 六触发器同时写姿态（见 4.2）。
2. 共享 O geometry 的包围盒在去重分支里用了已平移坐标，导致第二个 O 的基准位置偏左（已按原始笔位修正）。
3. 章节时间线未归一时长，末尾元素（如 N 的收束行）在章节结束前不出现。
4. 开场构建实测 975ms，低于 1000ms 下限；加入真实时间下限（1020ms）后实测 1020–1022ms。
5. 作品总览左上角“05 / OUTPUT”与章节 kicker 重复；已隐藏该章的角落标记。
6. 画廊底部水印被卡片遮挡并触及视口边缘；改为在本章让字母整体退场，N 章再进入。
7. 轨道初始偏移导致首帧第一张卡被裁；所有轨道改为从 0 开始。
8. 移动端原本隐藏第三条轨道，导致 2 件作品不可达；改为 3 轨全展示。

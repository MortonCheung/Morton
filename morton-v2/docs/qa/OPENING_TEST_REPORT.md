# OPENING_TEST_REPORT · Phase 2

被测 commit：见 `docs/PHASE23_HANDOFF.md` 的 SHA 表。
设备：MacBook Air M3 / 8GB / macOS / Google Chrome 155（headless，ANGLE Metal）。
命令：`node scripts/qa.mjs`（原始数据 `docs/qa/qa-raw.json`）。

## 1. 五个关键静帧（1440×900）

| 状态 | 文件 | 说明 |
|---|---|---|
| 绘制 ~30% | `docs/qa/screenshots/1440x900-30-drawing.png` | 字标外轮廓已出、内部构造线部分出现、中央进度线推进中 |
| 构建完成 100% | `docs/qa/screenshots/1440x900-100-built.png` | 全部线稿完成、进度线走满、纸层仍完全覆盖 |
| 揭幕中 | `docs/qa/screenshots/1440x900-reveal.png` | 上下纸层离开中线，底层 Hero 从中央露出 |
| Hero | `docs/qa/screenshots/1440x900-hero.png` | 纸层移出、Hero 完整、可交互 |
| 作品聚焦 | `docs/qa/screenshots/1440x900-focus.png` | 从 Works 原位 FLIP 展开 |

另有 1440×700、1366×768、1024×768、390×844 的同样序列，以及每个视口的 5 个章节截图。
录屏：`docs/qa/recording/opening-1440x900.mp4`、`opening-390x844.mp4`。

## 2. 时序（`window.__MORTON__.timings`，performance.now 口径）

| 视口 | drawing→built（绘制） | built→reveal（换气） | reveal→hero（揭幕） | mount→hero |
|---|---:|---:|---:|---:|
| 1440×900 | 1087 ms | 61 ms | 622 ms | ~1.77 s |
| 1440×700 | 1093 ms | 62 ms | 621 ms | ~1.78 s |
| 1366×768 | 1101 ms | 62 ms | 619 ms | ~1.78 s |
| 1024×768 | 1100 ms | 62 ms | 620 ms | ~1.78 s |
| 390×844 | 1110 ms | 62 ms | 621 ms | ~1.79 s |

配置值是绘制 1180ms / 揭幕 620ms；实测量到的 `drawing→built` 略短，因为第一笔与进度线同时起步、时间线在最后一条路径完成时结束。

## 3. 帧耗时

| 视口 | p95 frame | max frame | max 出现的阶段 |
|---|---:|---:|---|
| 1440×900 | 16.7 ms | 100.0 ms | **boot**（模块求值 + 首帧字体/图片解码，发生在 `mount` 之前） |
| 1440×700 | 16.8 ms | 100.0 ms | boot |
| 1366×768 | 16.8 ms | 100.0 ms | boot |
| 1024×768 | 16.8 ms | 83.4 ms | boot |
| 390×844 | 16.7 ms | 83.3 ms | boot |

**揭幕期间（`reveal→hero` 620ms 内）没有 >50ms 的长帧**——带时间戳的帧采样把每一帧都归到 `boot / drawing / hold / reveal / hero` 阶段，五个视口的全部尖峰都落在 `boot`（`qa-raw.json` 的 `spikes[].phase`）。
唯一的 >50ms 帧出现在 `drawing` 开始之前的启动阶段，那是首帧渲染与解码，用户看到的是静止的封面，不构成视觉卡顿；也没有被计进"开场时长"。

> 说明：同一台机器上并行跑第二个 Chromium 时，绘制时长会被拉长到 1.6s 且出现 400ms+ 长帧（`qa-raw.json` 的第二次运行）。
> 这是**测试环境争用**，不是页面问题；正式记录以独占运行的那次为准。后续复测必须独占机器。

## 4. 失败路径与边界

| 路径 | 实测 | 结论 |
|---|---|---|
| 资源延迟就绪（`?gateDelay=2200`） | `built` 后停留 **1749 ms** 才 `reveal`，期间 cover 始终可见 | 门禁真实：不提前揭幕、不伪造进度 |
| `prefers-reduced-motion: reduce` | **70 ms** 直接到 `hero`，cover opacity 0 | 不画线稿、不锁死交互 |
| 冷启动（清缓存） | 绘制时长不变（字体 ~46KB）；首帧延迟增加的是 boot | 见 §3 |
| 图片失败 | `decode()` 失败被吞，揭幕后显示板材纯色底（`--plate-*`） | 不白屏 |
| 页面切后台 | 时间线 pause/resume（`visibilitychange`） | 不会重复播放 |
| 开场期间滚动 | `html.is-opening` 锁滚动，结束后无 jump | 已验证 |

## 5. 已知问题

1. **boot 阶段有一帧 83–100ms**：来自模块求值 + 首帧字体/图片解码。当前不可见（封面静止），但如果要把 `mount→首字节` 压到 100ms 内，需要进一步拆包；本轮不做。
2. **移动端录屏**（`opening-390x844.mp4`）在 headless 下以 2x DPR 录制，文件较大，只作证据，不作为线上资源。
3. 本机没有真机；iOS Safari 的 `100svh` 行为与地址栏收放**未验证**（`UNVERIFIED`）。
